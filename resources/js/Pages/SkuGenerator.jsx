// resources/js/Pages/SkuGenerator.jsx
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
    const [selected, setSelected] = useState(new Set());
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState("all");
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [progress, setProgress] = useState(0);

    const scrollerRef = useRef(null);
    const debounceRef = useRef(null);

    const duplicates = preview.filter((p) => p.is_duplicate);
    const duplicateGroups = useMemo(() => {
        const groups = {};
        duplicates.forEach((p) => {
            const key = p.old_sku || "(Blank)";
            groups[key] = (groups[key] || []).concat(p);
        });
        return groups;
    }, [duplicates]);

    const handleChange = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }));
        setPage(1);
    };

    const handleQuick = (prefix, start, extra = {}) => {
        setForm((f) => ({
            ...f,
            prefix: prefix ?? f.prefix,
            auto_start: start ?? f.auto_start,
            ...extra,
        }));
    };

    const handlePreset = (changes) => {
        setForm((f) => ({ ...f, ...changes }));
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

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(fetchPreview, DEBOUNCE_MS);
        return () => clearTimeout(debounceRef.current);
    }, [form, activeTab]);

    useEffect(() => {
        fetchPreview(true);
    }, [page]);

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
        <div className="min-h-screen text-sm bg-gradient-to-br from-slate-50 via-white to-gray-100">
            <div className="p-4 mx-auto max-w-7xl">
                <SkuHeader
                    onQuick={handleQuick}
                    onPreset={handlePreset}
                    onExport={exportCSV}
                />
                <div className="grid gap-4 mt-6 lg:grid-cols-12">
                    <SkuSidebar
                        form={form}
                        handleChange={handleChange}
                        toggleCollection={(id) => {
                            setForm((f) => ({
                                ...f,
                                collections: f.collections.includes(id)
                                    ? f.collections.filter((c) => c !== id)
                                    : [...f.collections, id],
                            }));
                        }}
                        initialCollections={initialCollections}
                    />
                    <div className="space-y-4 lg:col-span-8">
                        <SkuPreviewTable
                            preview={preview}
                            total={total}
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
                            scrollerRef={scrollerRef}
                            form={form}
                            handleChange={handleChange}
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
