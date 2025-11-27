import React, { useEffect, useRef, useState } from "react";
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
        remove_spaces: true,
        alphanumeric: false,
        vendor: "",
        type: "",
        collections: [],
        source_field: "none",
        source_pos: "first",
        source_len: 2,
        source_placement: "before",
        search: "",
        restart_per_product: false,
    });

    const [preview, setPreview] = useState([]);
    const [duplicateGroups, setDuplicateGroups] = useState([]); // ← NEW
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState({ missing: 0, duplicates: 0 });
    const [selected, setSelected] = useState(new Set());
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState("all");
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [progress, setProgress] = useState(0);

    const debounceRef = useRef(null);

    const fetchPreview = async (keepPage = false) => {
        if (!keepPage) setPage(1);
        setSelected(new Set());
        setLoading(true);

        try {
            const res = await axios.post("/sku-generator/preview", {
                ...form,
                page: keepPage ? page : 1,
                tab: activeTab,
            });

            setPreview(res.data.preview || []);
            setDuplicateGroups(res.data.duplicateGroups || []);
            setTotal(res.data.total || 0);
            setStats(res.data.stats || { missing: 0, duplicates: 0 });
        } catch (e) {
            console.error("Preview error:", e);
        } finally {
            setLoading(false);
        }
    };

    // Debounce form changes
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchPreview();
        }, DEBOUNCE_MS);

        return () => clearTimeout(debounceRef.current);
    }, [form, activeTab]);

    // Page change
    useEffect(() => {
        if (page > 1) fetchPreview(true);
    }, [page]);

    // Progress polling
    useEffect(() => {
        if (!applying) return;
        const i = setInterval(async () => {
            try {
                const { data } = await axios.get("/sku-generator/progress");
                setProgress(data.progress || 0);
                if (data.progress >= 100) {
                    setApplying(false);
                    setProgress(0);
                    fetchPreview();
                }
            } catch {}
        }, 1000);
        return () => clearInterval(i);
    }, [applying]);

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
                    setSelected(new Set());
                    fetchPreview();
                },
            }
        );
    };

    const mediaUrl = (p) => p.image || null;

    const handleChange = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }));
    };

    const toggleCollection = (id) => {
        setForm((f) => ({
            ...f,
            collections: f.collections.includes(id)
                ? f.collections.filter((c) => c !== id)
                : [...f.collections, id],
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-6 mx-auto max-w-7xl">
                <SkuHeader
                    onExport={() => {
                        /* your export */
                    }}
                />

                <div className="grid gap-8 mt-8 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <SkuSidebar
                            form={form}
                            handleChange={handleChange}
                            initialCollections={initialCollections}
                            toggleCollection={toggleCollection}
                        />
                    </div>

                    <div className="space-y-6 lg:col-span-8">
                        <SkuPreviewTable
                            preview={preview}
                            duplicateGroups={duplicateGroups}
                            total={total}
                            stats={stats}
                            page={page}
                            setPage={setPage}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            selected={selected}
                            setSelected={setSelected}
                            loading={loading}
                            applySKUs={applySKUs}
                            applying={applying}
                            mediaUrl={mediaUrl}
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
