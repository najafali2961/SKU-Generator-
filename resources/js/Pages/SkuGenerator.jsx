import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import SkuHeader from "./components/SkuHeader";
import SkuSidebar from "./components/SkuSidebar";
import SkuPreviewTable from "./components/SkuPreviewTable";
import SkuProgressBar from "./components/SkuProgressBar";

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
    const [duplicateGroups, setDuplicateGroups] = useState([]);
    const [visibleIds, setVisibleIds] = useState([]);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState({ missing: 0, duplicates: 0 });
    const [selected, setSelected] = useState(new Set());
    const [page, setPage] = useState(1);
    const [duplicatePage, setDuplicatePage] = useState(1);
    const [activeTab, setActiveTab] = useState("all");
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [queryValue, setQueryValue] = useState(""); // ← Polaris search

    const debounceRef = useRef(null);

    const applyPreset = (preset) => {
        setForm((prev) => ({ ...prev, ...preset }));
    };

    const applySKUs = (scope = "selected") => {
        let ids = [];
        if (scope === "selected") ids = Array.from(selected);
        else if (scope === "visible") ids = visibleIds;
        else if (scope === "all") {
            if (activeTab === "duplicates")
                ids = duplicateGroups.flatMap((g) =>
                    g.variants.map((v) => v.id)
                );
            else if (activeTab === "missing")
                ids = preview.filter((p) => !p.old_sku).map((p) => p.id);
            else ids = preview.map((p) => p.id);
        }

        setApplying(true);
        setProgress(0);

        router.post(
            "/sku-generator/apply",
            {
                ...form,
                search: queryValue,
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

    const fetchPreview = async () => {
        setLoading(true);
        try {
            const res = await axios.post("/sku-generator/preview", {
                ...form,
                search: queryValue,
                page,
                tab: activeTab,
            });

            setPreview(res.data.preview || []);
            setDuplicateGroups(res.data.duplicateGroups || []);
            setVisibleIds(res.data.visibleIds || []);
            setTotal(res.data.total || 0);
            setStats(res.data.stats || { missing: 0, duplicates: 0 });
        } catch (e) {
            console.error("Preview error:", e);
        } finally {
            setLoading(false);
        }
    };

    // Debounced preview
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(fetchPreview, DEBOUNCE_MS);
        return () => clearTimeout(debounceRef.current);
    }, [form, queryValue, activeTab, page]);

    // Progress polling
    useEffect(() => {
        if (!applying) return;
        const interval = setInterval(async () => {
            try {
                const { data } = await axios.get("/sku-generator/progress");
                setProgress(data.progress || 0);
                if (data.progress >= 100) {
                    clearInterval(interval);
                    setApplying(false);
                    setProgress(0);
                    setSelected(new Set());
                    fetchPreview();
                }
            } catch {}
        }, 1000);
        return () => clearInterval(interval);
    }, [applying]);

    const mediaUrl = (p) => p.image || null;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-6 mx-auto max-w-7xl">
                <SkuHeader onPreset={applyPreset} />

                <div className="grid gap-4 mt-4 lg:grid-cols-12">
                    {/* Sidebar */}
                    <div className="lg:col-span-4">
                        <SkuSidebar
                            form={form}
                            setForm={setForm}
                            initialCollections={initialCollections}
                        />
                    </div>

                    {/* Main Table */}
                    <div className="space-y-6 lg:col-span-8">
                        <SkuPreviewTable
                            preview={preview}
                            duplicateGroups={duplicateGroups}
                            total={total}
                            stats={stats}
                            visibleIds={visibleIds}
                            page={page}
                            setPage={setPage}
                            duplicatePage={duplicatePage}
                            setDuplicatePage={setDuplicatePage}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            selected={selected}
                            setSelected={setSelected}
                            queryValue={queryValue}
                            setQueryValue={setQueryValue}
                            loading={loading}
                            applying={applying}
                            applySKUs={applySKUs}
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
