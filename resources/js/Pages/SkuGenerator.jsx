import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import {
    Database,
    Search,
    Download,
    Box,
    ChevronDown,
    Copy,
    Zap,
    Check,
    Loader2,
    AlertCircle,
    ChevronsLeft,
    ChevronsRight,
    ChevronLeft,
    ChevronRight,
    Hash,
    Image as ImageIcon,
} from "lucide-react";

const PAGE_SIZE = 25;
const DEBOUNCE_MS = 400;

export default function SkuGenerator({ initialCollections = [] }) {
    const [form, setForm] = useState({
        prefix: "PROD",
        auto_start: "0001",
        suffix: "",
        delimiter: "-",
        only_missing: true,
        remove_spaces: true,
        alphanumeric: false,
        auto_number_per_product: true,
        vendor: "",
        type: "",
        collections: [],
        source_field: "none",
        source_pos: "first",
        source_len: 2,
        source_placement: "before",
        search: "",
    });

    const [preview, setPreview] = useState([]);
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState(new Set());
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState("all");
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [progress, setProgress] = useState(0);

    const scrollerRef = useRef(null);
    const debounceRef = useRef(null); // Fixed!

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const duplicates = preview.filter((p) => p.is_duplicate);

    const duplicateGroups = useMemo(() => {
        const groups = {};
        duplicates.forEach((p) => {
            const key = p.old_sku || "(Blank)";
            groups[key] = (groups[key] || []).concat(p);
        });
        return groups;
    }, [duplicates]);

    const presets = [
        {
            label: "PROD-0001",
            changes: {
                prefix: "PROD",
                auto_start: "0001",
                source_field: "none",
            },
        },
        {
            label: "SKU-001",
            changes: { prefix: "SKU", auto_start: "001", source_field: "none" },
        },
        {
            label: "Title2-PROD-0001",
            changes: {
                source_field: "title",
                source_pos: "first",
                source_len: 2,
                source_placement: "before",
                prefix: "PROD",
            },
        },
        {
            label: "PROD-0001-Vendor2",
            changes: {
                source_field: "vendor",
                source_pos: "first",
                source_len: 2,
                source_placement: "after",
                prefix: "PROD",
            },
        },
        {
            label: "Last2-PROD",
            changes: {
                source_field: "title",
                source_pos: "last",
                source_len: 2,
                source_placement: "before",
                prefix: "PROD",
            },
        },
    ];

    const handleChange = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }));
        setPage(1);
    };

    const toggleCollection = (id) => {
        setForm((f) => ({
            ...f,
            collections: f.collections.includes(id)
                ? f.collections.filter((c) => c !== id)
                : [...f.collections, id],
        }));
    };

    const fetchPreview = async (keepSelected = false) => {
        if (!keepSelected) setSelected(new Set());
        setLoading(true);
        try {
            const res = await axios.post("/sku-generator/preview", {
                ...form,
                page,
                per_page: PAGE_SIZE,
                tab: activeTab,
            });
            setPreview(res.data.preview || []);
            setTotal(res.data.total || 0);
            if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Debounced auto-fetch
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchPreview();
        }, DEBOUNCE_MS);
        return () => clearTimeout(debounceRef.current);
    }, [form, activeTab]);

    // Page change
    useEffect(() => {
        fetchPreview(true);
    }, [page]);

    // Progress polling
    useEffect(() => {
        if (!applying) return;
        const i = setInterval(async () => {
            try {
                const { data } = await axios.get("/sku-generator/progress");
                setProgress(data.progress || 0);
                if (data.progress >= total) setApplying(false);
            } catch {}
        }, 1000);
        return () => clearInterval(i);
    }, [applying, total]);

    const applySKUs = (scope = "selected") => {
        const ids = scope === "selected" ? Array.from(selected) : [];
        setApplying(true);
        setProgress(0);
        router.post(
            "/sku-generator/apply",
            {
                ...form,
                apply_scope: scope,
                selected_variant_ids: ids,
            },
            {
                onFinish: () => {
                    setApplying(false);
                    fetchPreview();
                },
            }
        );
    };

    const exportCSV = () => {
        const data = activeTab === "duplicates" ? duplicates : preview;
        const rows = data.map((p) => [
            p.title,
            p.vendor || "",
            p.old_sku || "",
            p.new_sku,
            p.is_duplicate ? "DUP" : "OK",
        ]);
        const csv = [
            ["Title", "Vendor", "Old SKU", "New SKU", "Status"],
            ...rows,
        ]
            .map((r) =>
                r.map((c) => `"${(c + "").replace(/"/g, '""')}"`).join(",")
            )
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sku-${activeTab}-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;
        a.click();
    };

    const mediaUrl = (p) => p.image || null;

    return (
        <div className="min-h-screen text-sm bg-gray-50">
            <div className="p-4 mx-auto max-w-7xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 mb-4 bg-white border rounded-lg shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-black rounded">
                            <Database className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">
                                SKU Generator Pro
                            </h1>
                            <p className="text-xs text-gray-500">
                                Smart • Compact • Full Power
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() =>
                                handleChange("prefix", "SKU") ||
                                handleChange("auto_start", "001")
                            }
                            className="px-3 py-1.5 border rounded text-xs"
                        >
                            SKU
                        </button>
                        <button
                            onClick={() =>
                                handleChange("prefix", "P") ||
                                handleChange("auto_start", "01")
                            }
                            className="px-3 py-1.5 border rounded text-xs"
                        >
                            Short
                        </button>
                        <button
                            onClick={() =>
                                handleChange({
                                    source_field: "title",
                                    source_pos: "first",
                                    source_len: 2,
                                    source_placement: "before",
                                })
                            }
                            className="px-3 py-1.5 border rounded text-xs"
                        >
                            T2 Before
                        </button>
                        <button
                            onClick={() =>
                                handleChange({
                                    source_field: "vendor",
                                    source_pos: "first",
                                    source_len: 2,
                                    source_placement: "before",
                                })
                            }
                            className="px-3 py-1.5 border rounded text-xs"
                        >
                            V2 Before
                        </button>
                        <div className="relative group">
                            <button className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded text-xs">
                                <Zap className="w-4 h-4" /> Presets{" "}
                                <ChevronDown className="w-4 h-4" />
                            </button>
                            <div className="absolute right-0 z-50 hidden w-64 mt-1 bg-white border rounded-lg shadow-xl group-hover:block">
                                {presets.map((p, i) => (
                                    <button
                                        key={i}
                                        onClick={() =>
                                            setForm((f) => ({
                                                ...f,
                                                ...p.changes,
                                            }))
                                        }
                                        className="block w-full px-4 py-2 text-xs text-left hover:bg-amber-50"
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={exportCSV}
                            className="px-3 py-1.5 border rounded flex items-center gap-1 text-xs"
                        >
                            <Download className="w-4 h-4" /> Export
                        </button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-12">
                    {/* Sidebar */}
                    <aside className="space-y-4 lg:col-span-4">
                        {/* Pattern */}
                        <div className="p-4 bg-white border rounded-lg">
                            <h3 className="mb-3 text-sm font-bold">
                                Pattern Builder
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    placeholder="Prefix"
                                    value={form.prefix}
                                    onChange={(e) =>
                                        handleChange(
                                            "prefix",
                                            e.target.value.toUpperCase()
                                        )
                                    }
                                    className="px-3 py-2 text-sm border rounded"
                                />
                                <input
                                    placeholder="Start"
                                    value={form.auto_start}
                                    onChange={(e) =>
                                        handleChange(
                                            "auto_start",
                                            e.target.value
                                        )
                                    }
                                    className="px-3 py-2 text-sm border rounded"
                                />
                                <select
                                    value={form.delimiter}
                                    onChange={(e) =>
                                        handleChange(
                                            "delimiter",
                                            e.target.value
                                        )
                                    }
                                    className="px-3 py-2 text-sm border rounded"
                                >
                                    <option value="-">-</option>
                                    <option value="_">_</option>
                                    <option value="">None</option>
                                </select>
                                <input
                                    placeholder="Suffix"
                                    value={form.suffix}
                                    onChange={(e) =>
                                        handleChange(
                                            "suffix",
                                            e.target.value.toUpperCase()
                                        )
                                    }
                                    className="px-3 py-2 text-sm border rounded"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-4">
                                <select
                                    value={form.source_field}
                                    onChange={(e) =>
                                        handleChange(
                                            "source_field",
                                            e.target.value
                                        )
                                    }
                                    className="px-3 py-2 text-xs border rounded"
                                >
                                    <option value="none">No source</option>
                                    <option value="title">Title</option>
                                    <option value="vendor">Vendor</option>
                                </select>
                                <select
                                    value={form.source_pos}
                                    onChange={(e) =>
                                        handleChange(
                                            "source_pos",
                                            e.target.value
                                        )
                                    }
                                    className="px-3 py-2 text-xs border rounded"
                                >
                                    <option value="first">First</option>
                                    <option value="last">Last</option>
                                </select>
                                <input
                                    type="number"
                                    min="1"
                                    max="6"
                                    value={form.source_len}
                                    onChange={(e) =>
                                        handleChange(
                                            "source_len",
                                            Number(e.target.value)
                                        )
                                    }
                                    className="px-3 py-2 text-xs border rounded"
                                />
                            </div>
                            <select
                                value={form.source_placement}
                                onChange={(e) =>
                                    handleChange(
                                        "source_placement",
                                        e.target.value
                                    )
                                }
                                className="w-full px-3 py-2 mt-2 text-xs border rounded"
                            >
                                <option value="before">
                                    Source Before Number
                                </option>
                                <option value="after">
                                    Source After Number
                                </option>
                            </select>
                        </div>

                        {/* Rules */}
                        <div className="p-4 space-y-2 text-xs bg-white border rounded-lg">
                            <h3 className="font-bold">Rules</h3>
                            {[
                                ["only_missing", "Only missing SKUs"],
                                ["remove_spaces", "Remove spaces"],
                                ["alphanumeric", "Alphanumeric only"],
                                [
                                    "auto_number_per_product",
                                    "Restart per product",
                                ],
                            ].map(([k, l]) => (
                                <label
                                    key={k}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        type="checkbox"
                                        checked={form[k]}
                                        onChange={(e) =>
                                            handleChange(k, e.target.checked)
                                        }
                                        className="rounded"
                                    />
                                    <span>{l}</span>
                                </label>
                            ))}
                        </div>

                        {/* Filters */}
                        <div className="p-4 text-xs bg-white border rounded-lg">
                            <h3 className="mb-2 font-bold">Filters</h3>
                            <input
                                placeholder="Vendor"
                                value={form.vendor}
                                onChange={(e) =>
                                    handleChange("vendor", e.target.value)
                                }
                                className="w-full px-3 py-2 mb-2 border rounded"
                            />
                            <input
                                placeholder="Product Type"
                                value={form.type}
                                onChange={(e) =>
                                    handleChange("type", e.target.value)
                                }
                                className="w-full px-3 py-2 mb-2 border rounded"
                            />
                            {initialCollections.length > 0 && (
                                <div>
                                    <p className="mb-1 font-medium">
                                        Collections
                                    </p>
                                    <div className="p-2 space-y-1 overflow-auto border rounded max-h-40">
                                        {initialCollections.map((c) => (
                                            <label
                                                key={c.id}
                                                className="flex items-center gap-2"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={form.collections.includes(
                                                        c.id
                                                    )}
                                                    onChange={() =>
                                                        toggleCollection(c.id)
                                                    }
                                                />
                                                <span className="truncate">
                                                    {c.title}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Main */}
                    <main className="lg:col-span-8">
                        <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
                            {/* Tabs */}
                            <div className="flex text-sm font-medium border-b">
                                <button
                                    onClick={() => {
                                        setActiveTab("all");
                                        setPage(1);
                                    }}
                                    className={`flex-1 py-3 ${
                                        activeTab === "all"
                                            ? "text-black border-b-2 border-black"
                                            : "text-gray-500"
                                    }`}
                                >
                                    All ({total})
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveTab("duplicates");
                                        setPage(1);
                                    }}
                                    className={`flex-1 py-3 flex items-center justify-center gap-1 ${
                                        activeTab === "duplicates"
                                            ? "text-red-600 border-b-2 border-red-600"
                                            : "text-gray-500"
                                    }`}
                                >
                                    <AlertCircle className="w-4 h-4" />{" "}
                                    Duplicates ({duplicates.length})
                                </button>
                            </div>

                            {/* Search */}
                            <div className="p-4 border-b">
                                <div className="relative">
                                    <Search className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                                    <input
                                        placeholder="Search products, vendors, SKUs..."
                                        value={form.search}
                                        onChange={(e) =>
                                            handleChange(
                                                "search",
                                                e.target.value
                                            )
                                        }
                                        className="w-full py-2 pl-10 pr-4 border rounded"
                                    />
                                </div>
                            </div>

                            {/* List */}
                            <div
                                className="overflow-y-auto max-h-96"
                                ref={scrollerRef}
                            >
                                {loading ? (
                                    <div className="p-12 text-center">
                                        <Loader2 className="w-10 h-10 mx-auto text-gray-400 animate-spin" />
                                    </div>
                                ) : activeTab === "duplicates" &&
                                  duplicates.length === 0 ? (
                                    <div className="p-12 font-bold text-center text-green-600">
                                        No duplicates found!
                                    </div>
                                ) : activeTab === "duplicates" ? (
                                    <div className="p-4 space-y-4">
                                        {Object.entries(duplicateGroups).map(
                                            ([sku, items]) => (
                                                <div
                                                    key={sku}
                                                    className="border rounded-lg bg-red-50"
                                                >
                                                    <div className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600">
                                                        <Hash className="w-5 h-5" />{" "}
                                                        {sku} ({items.length})
                                                    </div>
                                                    <div className="p-3 space-y-2">
                                                        {items.map((p) => (
                                                            <div
                                                                key={p.id}
                                                                className="flex items-center gap-3 p-3 bg-white rounded"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selected.has(
                                                                        p.id
                                                                    )}
                                                                    onChange={() =>
                                                                        setSelected(
                                                                            (
                                                                                s
                                                                            ) => {
                                                                                const n =
                                                                                    new Set(
                                                                                        s
                                                                                    );
                                                                                n.has(
                                                                                    p.id
                                                                                )
                                                                                    ? n.delete(
                                                                                          p.id
                                                                                      )
                                                                                    : n.add(
                                                                                          p.id
                                                                                      );
                                                                                return n;
                                                                            }
                                                                        )
                                                                    }
                                                                />
                                                                {mediaUrl(p) ? (
                                                                    <img
                                                                        src={mediaUrl(
                                                                            p
                                                                        )}
                                                                        className="object-cover w-12 h-12 rounded"
                                                                        alt=""
                                                                    />
                                                                ) : (
                                                                    <Box className="w-12 h-12 text-gray-300" />
                                                                )}
                                                                <div className="flex-1">
                                                                    <p className="font-medium">
                                                                        {
                                                                            p.title
                                                                        }
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {
                                                                            p.vendor
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <code className="font-mono font-bold">
                                                                    {p.new_sku}
                                                                </code>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-2 p-3 bg-red-100">
                                                        <button
                                                            onClick={() =>
                                                                setSelected(
                                                                    new Set(
                                                                        items.map(
                                                                            (
                                                                                i
                                                                            ) =>
                                                                                i.id
                                                                        )
                                                                    )
                                                                )
                                                            }
                                                            className="flex-1 py-2 text-sm font-medium bg-white rounded"
                                                        >
                                                            Select Group
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelected(
                                                                    new Set(
                                                                        items.map(
                                                                            (
                                                                                i
                                                                            ) =>
                                                                                i.id
                                                                        )
                                                                    )
                                                                );
                                                                applySKUs(
                                                                    "selected"
                                                                );
                                                            }}
                                                            className="flex-1 py-2 text-sm font-medium text-white bg-green-600 rounded"
                                                        >
                                                            Fix Group
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {preview.map((p) => {
                                            const isSel = selected.has(p.id);
                                            return (
                                                <div
                                                    key={p.id}
                                                    className={`p-4 flex items-center gap-4 ${
                                                        isSel
                                                            ? "bg-blue-50"
                                                            : "hover:bg-gray-50"
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSel}
                                                        onChange={() =>
                                                            setSelected((s) => {
                                                                const n =
                                                                    new Set(s);
                                                                n.has(p.id)
                                                                    ? n.delete(
                                                                          p.id
                                                                      )
                                                                    : n.add(
                                                                          p.id
                                                                      );
                                                                return n;
                                                            })
                                                        }
                                                    />
                                                    {mediaUrl(p) ? (
                                                        <img
                                                            src={mediaUrl(p)}
                                                            className="object-cover rounded w-14 h-14"
                                                            alt=""
                                                        />
                                                    ) : (
                                                        <Box className="text-gray-300 w-14 h-14" />
                                                    )}
                                                    <div className="flex-1">
                                                        <p className="font-medium">
                                                            {p.title}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {p.vendor} •{" "}
                                                            {p.option ||
                                                                "Default"}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-500">
                                                            Old
                                                        </p>
                                                        <code className="text-sm">
                                                            {p.old_sku || "—"}
                                                        </code>
                                                    </div>
                                                    <div className="font-mono text-lg font-bold text-right">
                                                        {p.new_sku}
                                                    </div>
                                                    {p.is_duplicate && (
                                                        <span className="px-3 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">
                                                            DUP
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() =>
                                                            navigator.clipboard.writeText(
                                                                p.new_sku
                                                            )
                                                        }
                                                    >
                                                        <Copy className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {activeTab === "all" && totalPages > 1 && (
                                <div className="flex items-center justify-between p-4 text-sm border-t">
                                    <span>
                                        Page {page} / {totalPages}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPage(1)}
                                            disabled={page === 1}
                                            className="p-2 border rounded disabled:opacity-50"
                                        >
                                            <ChevronsLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                setPage((p) =>
                                                    Math.max(1, p - 1)
                                                )
                                            }
                                            disabled={page === 1}
                                            className="p-2 border rounded disabled:opacity-50"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <span className="px-4 py-2 text-white bg-black rounded">
                                            {page}
                                        </span>
                                        <button
                                            onClick={() =>
                                                setPage((p) =>
                                                    Math.min(totalPages, p + 1)
                                                )
                                            }
                                            disabled={page === totalPages}
                                            className="p-2 border rounded disabled:opacity-50"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setPage(totalPages)}
                                            disabled={page === totalPages}
                                            className="p-2 border rounded disabled:opacity-50"
                                        >
                                            <ChevronsRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Action Bar */}
                            <div className="flex items-center justify-between p-4 text-white bg-gradient-to-r from-black to-gray-900">
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSelected(new Set())}
                                        className="px-4 py-2 font-medium rounded bg-white/20"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={() =>
                                            setSelected(
                                                new Set(
                                                    preview.map((p) => p.id)
                                                )
                                            )
                                        }
                                        className="px-4 py-2 font-medium rounded bg-white/20"
                                    >
                                        All Visible
                                    </button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-lg font-bold">
                                        {selected.size} selected
                                    </span>
                                    <button
                                        onClick={() => applySKUs("selected")}
                                        disabled={
                                            selected.size === 0 || applying
                                        }
                                        className="flex items-center gap-2 px-6 py-2 font-bold bg-green-600 rounded"
                                    >
                                        {applying ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Check className="w-5 h-5" />
                                        )}{" "}
                                        Apply Selected
                                    </button>
                                    <button
                                        onClick={() =>
                                            applySKUs("all_matching")
                                        }
                                        disabled={applying}
                                        className="px-6 py-2 font-bold rounded bg-gradient-to-r from-purple-600 to-pink-600"
                                    >
                                        Apply All
                                    </button>
                                </div>
                            </div>

                            {/* Progress */}
                            {applying && (
                                <div className="p-4 text-white bg-black/90">
                                    <div className="flex justify-between mb-2">
                                        <span>Applying SKUs...</span>
                                        <span>
                                            {Math.round(
                                                (progress / total) * 100
                                            )}
                                            %
                                        </span>
                                    </div>
                                    <div className="w-full h-4 overflow-hidden rounded-full bg-white/20">
                                        <div
                                            className="h-full transition-all bg-gradient-to-r from-green-400 to-emerald-500"
                                            style={{
                                                width: `${
                                                    (progress / total) * 100
                                                }%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
