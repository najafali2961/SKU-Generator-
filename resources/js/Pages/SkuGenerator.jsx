import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import SkuHeader from "./components/SkuHeader";
import SkuSidebar from "./components/SkuSidebar";
import SkuPreviewTable from "./components/SkuPreviewTable";
import SkuProgressBar from "./components/SkuProgressBar";

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
    const [stats, setStats] = useState({ missing: 0, duplicates: 0 });
    const [selected, setSelected] = useState(new Set());
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState("all");
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [progress, setProgress] = useState(0);

    const debounceRef = useRef(null);

    const duplicates = preview.filter((p) => p.is_duplicate);

    const duplicateGroups = useMemo(() => {
        const groups = {};
        duplicates.forEach((p) => {
            const key = p.old_sku || "(Blank)";
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });
        return groups;
    }, [duplicates]);

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
        setPage(1);
    };

    const fetchPreview = async (keepSelected = false) => {
        if (!keepSelected) setSelected(new Set());
        setLoading(true);

        try {
            const res = await axios.post("/sku-generator/preview", {
                ...form,
                page,
                per_page: 25,
                tab: activeTab,
                only_missing: activeTab === "missing",
            });

            setPreview(res.data.preview || []);
            setTotal(res.data.total || 0);
            if (res.data.stats) {
                setStats(res.data.stats);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Debounce form changes
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1); // always reset page on filter change
            fetchPreview();
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [form]);

    // Immediate refresh on tab change
    useEffect(() => {
        setPage(1);
        fetchPreview();
    }, [activeTab]);

    // Page change only
    useEffect(() => {
        if (page > 1) {
            fetchPreview(true); // keep selection
        }
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

    // Fixed: removed the stray }; that caused the TS error

    const exportCSV = () => {
        const data = activeTab === "duplicates" ? duplicates : preview;
        const rows = data.map((p) => [
            p.title,
            p.vendor || "",
            p.old_sku || "",
            p.new_sku || "",
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
        <div className="min-h-screen">
            <div className="p-4 mx-auto max-w-7xl">
                <SkuHeader
                    onQuick={(p, s, e) =>
                        setForm((f) => ({
                            ...f,
                            prefix: p,
                            auto_start: s,
                            ...e,
                        }))
                    }
                    onPreset={(c) => setForm((f) => ({ ...f, ...c }))}
                    onExport={exportCSV}
                />
                <div className="grid gap-6 mt-6 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <SkuSidebar form={form} handleChange={handleChange} />
                    </div>
                    <div className="space-y-6 lg:col-span-8">
                        <SkuPreviewTable
                            preview={preview}
                            total={total}
                            stats={stats}
                            page={page}
                            setPage={setPage}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            selected={selected}
                            setSelected={setSelected}
                            loading={loading}
                            duplicates={duplicates}
                            duplicateGroups={duplicateGroups}
                            applySKUs={applySKUs}
                            applying={applying}
                            mediaUrl={mediaUrl}
                            form={form}
                            handleChange={handleChange}
                            initialCollections={initialCollections}
                            toggleCollection={toggleCollection}
                        />
                        <SkuProgressBar
                            applying={applying}
                            progress={progress}
                            total={total}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
