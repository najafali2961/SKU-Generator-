// resources/js/Pages/SkuGenerator.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import SkuHeader from "./components/SkuHeader";
import SkuSidebar from "./components/SkuSidebar";
import SkuPreviewTable from "./components/SkuPreviewTable";

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

    // Filters
    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);

    const debounceRef = useRef(null);

    const applySmartPreset = useCallback((preset) => {
        setForm((prev) => ({
            ...prev,
            ...preset,
            remove_spaces: prev.remove_spaces,
            alphanumeric: prev.alphanumeric,
            restart_per_product: prev.restart_per_product,
        }));
    }, []);

    const fetchPreview = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.post("/sku-generator/preview", {
                ...form,
                search: queryValue.trim(),
                page: activeTab === "duplicates" ? duplicatePage : page,
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
        duplicatePage,
        activeTab,
        selectedCollectionIds,
        selectedVendors,
        selectedTypes,
    ]);

    // Debounced preview update for form changes, search, filters
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            // Reset to page 1 when filters/search change
            if (activeTab === "duplicates") {
                setDuplicatePage(1);
            } else {
                setPage(1);
            }
        }, DEBOUNCE_DELAY);

        return () => clearTimeout(debounceRef.current);
    }, [
        form,
        queryValue,
        activeTab,
        selectedCollectionIds,
        selectedVendors,
        selectedTypes,
    ]);

    // Fetch when page changes or when debounce completes
    useEffect(() => {
        fetchPreview();
    }, [page, duplicatePage, fetchPreview]);

    const applySKUs = async (scope = "selected") => {
        let ids = [];

        if (scope === "selected") {
            ids = Array.from(selected);
        } else if (scope === "visible") {
            ids = visibleIds;
        } else if (scope === "all") {
            setApplying(true);
            setProgress(0);

            try {
                const res = await axios.post("/sku-generator/preview", {
                    ...form,
                    search: queryValue.trim(),
                    page: 1,
                    tab: activeTab,
                    collections: selectedCollectionIds,
                    vendor: selectedVendors[0] || null,
                    type: selectedTypes[0] || null,
                    get_all_ids: true,
                });

                ids = res.data.all_variant_ids || [];
            } catch (err) {
                console.error("Failed to get all IDs:", err);
                return;
            }
        }

        router.post("/sku-generator/apply", {
            ...form,
            search: queryValue.trim(),
            collections: selectedCollectionIds,
            vendor: selectedVendors[0] || null,
            type: selectedTypes[0] || null,
            apply_scope: scope,
            selected_variant_ids: ids,
        });

        setApplying(true);
        setProgress(0);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setPage(1);
        setDuplicatePage(1);
        setSelected(new Set());
    };
    const handleExport = () => {
        if (preview.length === 0) {
            alert("No SKUs to export yet!");
            return;
        }

        const headers = [
            "Variant ID",
            "Product Title",
            "Variant Title",
            "Current SKU",
            "New SKU",
            "Vendor",
            "Product Type",
            "Collections",
        ];

        const rows = preview.map((item) => [
            item.id || "",
            `"${(item.title || "").replace(/"/g, '""')}"`,
            `"${(item.variant_title || "").replace(/"/g, '""')}"`,
            item.current_sku || "",
            item.new_sku || "",
            `"${(item.vendor || "").replace(/"/g, '""')}"`,
            `"${(item.type || "").replace(/"/g, '""')}"`,
            `"${(item.collections || []).join(", ")}"`,
        ]);

        const csvContent = [headers, ...rows]
            .map((row) => row.join(","))
            .join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `skus-export-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    const mediaUrl = (item) => item.image || null;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-6 mx-auto max-w-7xl">
                <SkuHeader
                    onPreset={applySmartPreset}
                    onExport={handleExport}
                />

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
                            selectedCollectionIds={selectedCollectionIds}
                            setSelectedCollectionIds={setSelectedCollectionIds}
                            selectedVendors={selectedVendors}
                            setSelectedVendors={setSelectedVendors}
                            selectedTypes={selectedTypes}
                            setSelectedTypes={setSelectedTypes}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
