// SkuGenerator.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import SkuHeader from "./components/SkuHeader";
import SkuSidebar from "./components/SkuSidebar";
import SkuPreviewTable from "./components/SkuPreviewTable";
import SkuProgressBar from "./components/SkuProgressBar";

const DEBOUNCE_DELAY = 500;

export default function SkuGenerator({ initialCollections = [] }) {
    const [form, setForm] = useState({
        prefix: "PROD",
        auto_start: "0001",
        suffix: "",
        delimiter: "-",
        remove_spaces: true,
        alphanumeric: false,
        source_field: "none",
        source_pos: "first",
        source_len: 2,
        source_placement: "before",
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
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [queryValue, setQueryValue] = useState("");

    // Filter states
    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);

    const debounceRef = useRef(null);

    const fetchPreview = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.post("/sku-generator/preview", {
                ...form,
                search: queryValue.trim(),
                page,
                tab: activeTab,
                collections: selectedCollectionIds,
                vendor: selectedVendors[0] || null,
                type: selectedTypes[0] || null,
            });

            setPreview(res.data.preview || []);
            setDuplicateGroups(res.data.duplicateGroups || []);
            setVisibleIds(res.data.visibleIds || []);
            setTotal(res.data.total || 0);
            setStats(res.data.stats || { missing: 0, duplicates: 0 });
        } catch (error) {
            console.error("Failed to fetch preview:", error);
        } finally {
            setLoading(false);
        }
    }, [
        form,
        queryValue,
        page,
        activeTab,
        selectedCollectionIds,
        selectedVendors,
        selectedTypes,
    ]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            setPage(1); // Reset page on any filter change
            fetchPreview();
        }, DEBOUNCE_DELAY);

        return () => clearTimeout(debounceRef.current);
    }, [fetchPreview]);

    useEffect(() => {
        fetchPreview();
    }, []);

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
            } catch (err) {
                console.error("Progress poll error:", err);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [applying, fetchPreview]);

    const applySKUs = (scope = "selected") => {
        let ids = [];

        if (scope === "selected") {
            ids = Array.from(selected);
        } else if (scope === "visible") {
            ids = visibleIds;
        } else if (scope === "all") {
            if (activeTab === "duplicates") {
                ids = duplicateGroups.flatMap((g) =>
                    g.variants.map((v) => v.id)
                );
            } else if (activeTab === "missing") {
                ids = preview.filter((p) => !p.old_sku).map((p) => p.id);
            } else {
                ids = preview.map((p) => p.id);
            }
        }

        setApplying(true);
        setProgress(0);

        router.post("/sku-generator/apply", {
            ...form,
            search: queryValue.trim(),
            collections: selectedCollectionIds,
            vendor: selectedVendors[0] || null,
            type: selectedTypes[0] || null,
            apply_scope: scope,
            selected_variant_ids: ids,
        });
    };

    const mediaUrl = (item) => item.image || null;

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setPage(1);
        setDuplicatePage(1);
        setSelected(new Set());
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-6 mx-auto max-w-7xl">
                <SkuHeader />

                <div className="grid gap-6 mt-6 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <SkuSidebar form={form} setForm={setForm} />
                    </div>

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
                            setActiveTab={handleTabChange}
                            selected={selected}
                            setSelected={setSelected}
                            queryValue={queryValue}
                            setQueryValue={setQueryValue}
                            loading={loading}
                            applying={applying}
                            applySKUs={applySKUs}
                            mediaUrl={mediaUrl}
                            initialCollections={initialCollections}
                            // Filters
                            selectedCollectionIds={selectedCollectionIds}
                            setSelectedCollectionIds={setSelectedCollectionIds}
                            selectedVendors={selectedVendors}
                            setSelectedVendors={setSelectedVendors}
                            selectedTypes={selectedTypes}
                            setSelectedTypes={setSelectedTypes}
                        />

                        {applying && (
                            <SkuProgressBar
                                applying={applying}
                                progress={progress}
                                total={total}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
