// SkuGenerator.jsx
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

    // 1. Debounced effect — ONLY for filters/search/tab (resets page to 1)
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            if (page !== 1) {
                setPage(1);
            } else {
                fetchPreview();
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

    // 2. Pagination effect — ONLY runs when page changes (does NOT reset)
    useEffect(() => {
        if (page > 1 || page === 1) {
            fetchPreview();
        }
    }, [page]);

    const applySKUs = async (scope = "selected") => {
        let ids = [];

        if (scope === "selected") {
            ids = Array.from(selected);
        } else if (scope === "visible") {
            ids = visibleIds;
        } else if (scope === "all") {
            setApplying(true);
            setProgress(0);

            // FETCH ALL VARIANT IDS FROM SERVER (the only reliable way)
            try {
                const res = await axios.post("/sku-generator/preview", {
                    ...form,
                    search: queryValue.trim(),
                    page: 1,
                    tab: activeTab,
                    collections: selectedCollectionIds,
                    vendor: selectedVendors[0] || null,
                    type: selectedTypes[0] || null,
                    get_all_ids: true, // ← NEW FLAG
                });

                ids = res.data.all_variant_ids || [];
            } catch (err) {
                console.error("Failed to get all IDs:", err);
                return;
            }
        }

        // Now send the real full list
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
                    </div>
                </div>
            </div>
        </div>
    );
}
