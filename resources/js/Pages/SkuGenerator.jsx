// resources/js/Pages/SkuGenerator.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import SkuHeader from "./components/SkuHeader";
import SkuSidebar from "./components/SkuSidebar";
import SkuPreviewTable from "./components/SkuPreviewTable";
import CreditWarning from "./components/CreditWarning";
import ConfirmModal from "./components/ConfirmModal";

const DEBOUNCE_DELAY = 500;

export default function SkuGenerator({
    initialCollections = [],
    availableCredits = 0,
    hasUnlimitedCredits = false,
    creditCostPerSku = 1,
}) {
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

    const [creditInfo, setCreditInfo] = useState({
        available: availableCredits,
        cost_per_sku: creditCostPerSku,
        has_unlimited: hasUnlimitedCredits,
        max_allowed: hasUnlimitedCredits
            ? Number.MAX_SAFE_INTEGER
            : Math.floor(availableCredits / creditCostPerSku),
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
    const [confirmModal, setConfirmModal] = useState({
        open: false,
        title: "",
        message: "",
        onConfirm: () => {},
    });
    const [queryValue, setQueryValue] = useState("");
    // Filters
    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);

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
                tags: selectedTags,
            });

            setPreview(res.data.preview || []);
            setDuplicateGroups(res.data.duplicateGroups || []);
            setVisibleIds(res.data.visibleIds || []);
            setTotal(res.data.total || 0);
            setTotal(res.data.total || 0);
            setStats(res.data.stats || { missing: 0, duplicates: 0, total: 0 });

            if (res.data.credit_info) {
                setCreditInfo(res.data.credit_info);
            }
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
        selectedTags, // ✅ FIXED: Added selectedTags to dependencies
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
        selectedTags,
    ]);

    // Fetch when page changes or when debounce completes
    useEffect(() => {
        fetchPreview();
    }, [page, duplicatePage, fetchPreview]);

    // Calculate credit requirements
    const getCreditRequirements = (scope) => {
        let itemCount = 0;
        console.log(`[Debug] getCreditRequirements: Scope=${scope}`, {
            stats,
            creditInfo,
        });

        if (scope === "selected") {
            itemCount = selected.size;
        } else if (scope === "visible") {
            itemCount = preview.length;
        } else if (scope === "all") {
            if (activeTab === "missing") {
                itemCount = stats.missing;
            } else if (activeTab === "duplicates") {
                itemCount = stats.duplicates;
            } else {
                itemCount = stats.total;
            }
        }

        const requiredCredits =
            Number(itemCount) * Number(creditInfo.cost_per_sku);
        const available = Number(creditInfo.available);
        const hasEnough =
            creditInfo.has_unlimited || available >= requiredCredits;

        const ret = {
            itemCount,
            requiredCredits,
            hasEnough,
            available: creditInfo.available,
            maxAllowed: creditInfo.max_allowed,
        };
        console.log(`[Debug] Req for ${scope}:`, ret);
        return ret;
    };

    // Determine if we should show credit warning
    const shouldShowCreditWarning = () => {
        if (creditInfo.has_unlimited) return false;

        const selectedReq = getCreditRequirements("selected");
        const allReq = getCreditRequirements("all");

        // Show warning if user has selected more than they can afford
        // OR if the total available is less than what they're trying to process
        const show =
            (selected.size > 0 && !selectedReq.hasEnough) || !allReq.hasEnough;
        console.log(
            "Should Show Warning?",
            show,
            "SelectedReq:",
            selectedReq,
            "AllReq:",
            allReq,
        );
        return show;
    };

    // Check if apply should be disabled
    const isApplyDisabled = (scope) => {
        const requirements = getCreditRequirements(scope);

        if (requirements.itemCount === 0) return true;
        if (creditInfo.has_unlimited) return false;

        return !requirements.hasEnough;
    };

    const applySKUs = async (scope = "selected") => {
        const requirements = getCreditRequirements(scope);

        // Validate credits before proceeding
        if (!creditInfo.has_unlimited && !requirements.hasEnough) {
            alert(
                `Insufficient credits!\n\n` +
                    `Items to process: ${requirements.itemCount}\n` +
                    `Credits required: ${requirements.requiredCredits}\n` +
                    `Credits available: ${requirements.available}\n\n` +
                    `Maximum items you can process: ${requirements.maxAllowed}`,
            );
            return;
        }

        // Logic to get IDs if needed
        let ids = [];
        let count = requirements.itemCount;

        if (scope === "selected") {
            ids = Array.from(selected);
            count = ids.length;
        } else if (scope === "visible") {
            ids = visibleIds;
            count = ids.length;
        }

        // Confirm Modal
        setConfirmModal({
            open: true,
            title: `Generate SKUs?`,
            message: `You are about to generate SKUs for ${count} variant(s). This will deduct ${requirements.requiredCredits} credits.\n\nScope: ${scope === "all" ? (activeTab === "duplicates" ? "All Duplicates" : activeTab === "missing" ? "All Missing" : "All Variants") : scope === "visible" ? "Visible Page" : "Selected Variants"}\n\nDo you want to proceed?`,
            onConfirm: async () => {
                setConfirmModal((prev) => ({ ...prev, open: false }));

                // Moved logic here
                if (scope === "all") {
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
                            tags: selectedTags,
                            get_all_ids: true,
                        });

                        ids = res.data.all_variant_ids || [];
                    } catch (err) {
                        console.error("Failed to get all IDs:", err);
                        setApplying(false);
                        return;
                    }
                }

                router.post("/sku-generator/apply", {
                    ...form,
                    search: queryValue.trim(),
                    collections: selectedCollectionIds,
                    vendor: selectedVendors[0] || null,
                    type: selectedTypes[0] || null,
                    tags: selectedTags,
                    apply_scope: scope,
                    active_tab: activeTab,
                    selected_variant_ids: ids,
                });

                setApplying(true);
                setProgress(0);
            },
        });
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
                        {/* Credit Warning moved here */}
                        {shouldShowCreditWarning() && (
                            <CreditWarning
                                selectedCount={selected.size}
                                totalCount={
                                    activeTab === "missing"
                                        ? stats.missing
                                        : activeTab === "duplicates"
                                          ? stats.duplicates
                                          : stats.total
                                }
                                availableCredits={creditInfo.available}
                                costPerItem={creditInfo.cost_per_sku}
                                hasUnlimited={creditInfo.has_unlimited}
                                scope={selected.size > 0 ? "selected" : "all"}
                                maxAllowed={creditInfo.max_allowed}
                            />
                        )}
                        <SkuPreviewTable
                            preview={preview}
                            duplicateGroups={duplicateGroups}
                            total={total}
                            stats={stats}
                            page={page}
                            setPage={setPage}
                            duplicatePage={duplicatePage}
                            setDuplicatePage={setDuplicatePage}
                            isApplyDisabled={isApplyDisabled}
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
                            selectedTags={selectedTags}
                            setSelectedTags={setSelectedTags}
                        />
                    </div>
                    <ConfirmModal
                        isOpen={confirmModal.open}
                        title={confirmModal.title}
                        message={confirmModal.message}
                        onClose={() =>
                            setConfirmModal((prev) => ({
                                ...prev,
                                open: false,
                            }))
                        }
                        onConfirm={confirmModal.onConfirm}
                    />
                </div>
            </div>
        </div>
    );
}
