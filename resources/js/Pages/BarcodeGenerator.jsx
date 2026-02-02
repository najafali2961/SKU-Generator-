import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";

import BarcodeHeader from "./components/barcode/Header";
import BarcodeSidebar from "./components/barcode/BarcodeSidebar";
import BarcodePreviewTable from "./components/barcode/BarcodePreviewTable";
import BarcodeImportModal from "./components/barcode/BarcodeImportModal";
import CreditWarning from "./components/CreditWarning";
import ConfirmModal from "./components/ConfirmModal";

const DEBOUNCE_MS = 500;

export default function BarcodeGenerator({
    initialCollections = [],
    availableCredits = 0,
    hasUnlimitedCredits = false,
    creditCostPerBarcode = 1,
}) {
    const [form, setForm] = useState({
        format: "UPC",
        prefix: "",
        suffix: "",
        length: 12,
        checksum: true,
        enforce_length: true,
        numeric_only: true,
        auto_fill: true,
        validate_standard: true,
        allow_qr_text: false,
        qr_text: "",
        isbn_group: "978",
        ean_country: "",
        search: "",
        vendor: "",
        type: "",
        start_number: "1",
    });

    const [barcodes, setBarcodes] = useState([]);
    const [total, setTotal] = useState(0);
    const [overallTotal, setOverallTotal] = useState(0);
    const [duplicateGroups, setDuplicateGroups] = useState({});
    const [stats, setStats] = useState({ missing: 0, duplicates: 0, total: 0 });
    const [selected, setSelected] = useState(new Set());
    const [page, setPage] = useState(1);
    const [duplicatePage, setDuplicatePage] = useState(1);
    const [activeTab, setActiveTab] = useState("all");
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        open: false,
        title: "",
        message: "",
        onConfirm: () => {},
    });

    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);

    const [creditInfo, setCreditInfo] = useState({
        available: availableCredits,
        cost_per_barcode: creditCostPerBarcode,
        has_unlimited: hasUnlimitedCredits,
        max_allowed: hasUnlimitedCredits
            ? Number.MAX_SAFE_INTEGER
            : Math.floor(availableCredits / creditCostPerBarcode),
    });

    const debounceRef = useRef(null);

    const handleChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const fetchPreview = async () => {
        setLoading(true);
        try {
            const res = await axios.post("/barcode-generator/preview", {
                ...form,
                page: activeTab === "duplicates" ? duplicatePage : page,
                tab: activeTab,
                collections: selectedCollectionIds,
                vendor: selectedVendors[0] || null,
                type: selectedTypes[0] || null,
                tags: selectedTags,
            });
            setBarcodes(res.data.data || []);
            setTotal(res.data.total || 0);
            setOverallTotal(res.data.overall_total || 0);
            setDuplicateGroups(res.data.duplicateGroups || {});
            setStats(res.data.stats || { missing: 0, duplicates: 0, total: 0 });

            if (res.data.credit_info) {
                setCreditInfo(res.data.credit_info);
            }
        } catch (err) {
            console.error("Preview error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            if (activeTab === "duplicates") {
                setDuplicatePage(1);
            } else {
                setPage(1);
            }
        }, DEBOUNCE_MS);

        return () => clearTimeout(debounceRef.current);
    }, [
        form,
        activeTab,
        selectedCollectionIds,
        selectedVendors,
        selectedTypes,
        selectedTags,
    ]);

    useEffect(() => {
        fetchPreview();
    }, [page, duplicatePage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPreview();
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [
        form,
        activeTab,
        selectedCollectionIds,
        selectedVendors,
        selectedTypes,
        selectedTags,
    ]);

    // Calculate credit requirements
    const getCreditRequirements = (scope) => {
        let itemCount = 0;

        if (scope === "selected") {
            itemCount = selected.size;
        } else if (scope === "visible") {
            itemCount = barcodes.length;
        } else if (scope === "all") {
            if (activeTab === "missing") {
                itemCount = stats.missing;
            } else if (activeTab === "duplicates") {
                itemCount = stats.duplicates;
            } else {
                itemCount = stats.total;
            }
        }

        const requiredCredits = itemCount * creditInfo.cost_per_barcode;
        const hasEnough =
            hasUnlimitedCredits || creditInfo.available >= requiredCredits;

        return {
            itemCount,
            requiredCredits,
            hasEnough,
            available: creditInfo.available,
            maxAllowed: creditInfo.max_allowed,
        };
    };

    // Check if apply should be disabled
    const isApplyDisabled = (scope) => {
        const requirements = getCreditRequirements(scope);

        if (requirements.itemCount === 0) return true;
        if (hasUnlimitedCredits) return false;

        return !requirements.hasEnough;
    };

    const applyBarcodes = (scope = "selected") => {
        const requirements = getCreditRequirements(scope);

        // Validate credits before proceeding
        if (!hasUnlimitedCredits && !requirements.hasEnough) {
            alert(
                `Insufficient credits!\n\n` +
                    `Items to process: ${requirements.itemCount}\n` +
                    `Credits required: ${requirements.requiredCredits}\n` +
                    `Credits available: ${requirements.available}\n\n` +
                    `Maximum items you can process: ${requirements.maxAllowed}`,
            );
            return;
        }

        const ids = scope === "selected" ? Array.from(selected) : [];
        const count = ids.length > 0 ? ids.length : requirements.itemCount;

        setConfirmModal({
            open: true,
            title: `Generate Barcodes?`,
            message: `You are about to generate barcodes for ${count} variant(s). This will deduct ${requirements.requiredCredits} credits.\n\nScope: ${scope === "all" ? (activeTab === "duplicates" ? "All Duplicates" : activeTab === "missing" ? "All Missing" : "All Variants") : "Selected Variants"}\n\nDo you want to proceed?`,
            onConfirm: () => {
                setConfirmModal((prev) => ({ ...prev, open: false }));
                setApplying(true);

                console.log("🚀 Applying barcodes with settings:", {
                    scope,
                    active_tab: activeTab,
                    format: form.format,
                    allow_qr_text: form.allow_qr_text,
                    qr_text: form.qr_text,
                    prefix: form.prefix,
                    start_number: form.start_number,
                    selected_count: ids.length,
                });

                router.post(
                    "/barcode-generator/apply",
                    {
                        ...form,
                        apply_scope: scope,
                        active_tab: activeTab,
                        selected_variant_ids: ids.length > 0 ? ids : undefined,
                        collections: selectedCollectionIds,
                        vendor: selectedVendors[0] || null,
                        type: selectedTypes[0] || null,
                        tags: selectedTags,
                    },
                    {
                        onFinish: () => {
                            setSelected(new Set());
                            setApplying(false);
                        },
                        onError: (err) => {
                            setApplying(false);
                            console.error("Apply failed:", err);
                            if (err.credits) {
                                alert(`Credit Error: ${err.credits}`);
                            } else {
                                alert("Apply failed: " + JSON.stringify(err));
                            }
                        },
                    },
                );
            },
        });
    };

    // Determine if we should show credit warning
    const shouldShowCreditWarning = () => {
        if (hasUnlimitedCredits) return false;

        const selectedReq = getCreditRequirements("selected");
        const allReq = getCreditRequirements("all");

        // Show warning if user has selected more than they can afford
        // OR if the total available is less than what they're trying to process
        return (
            (selected.size > 0 && !selectedReq.hasEnough) || !allReq.hasEnough
        );
    };

    const [importModalOpen, setImportModalOpen] = useState(false);

    const handleImport = () => {
        setImportModalOpen(true);
    };

    const handleExport = () => {
        if (stats.total === 0) return alert("No barcodes to export!");

        setLoading(true);

        const params = {
            ...form,
            tab: activeTab,
            collections: selectedCollectionIds,
            vendor: selectedVendors[0] || null,
            type: selectedTypes[0] || null,
            tags: selectedTags,
        };

        router.post("/barcode-generator/export", params, {
            onFinish: () => setLoading(false),
            onSuccess: (page) => {
                console.log("Export POST success", page);
                const downloadUrl = page.props.flash?.download_url;
                if (downloadUrl) {
                    console.log("Redirecting to download:", downloadUrl);
                    window.location.href = downloadUrl;
                } else {
                    console.error(
                        "No download_url found in flash props",
                        page.props,
                    );
                }
            },
            onError: (err) => console.error("Export POST failed", err),
        });
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setPage(1);
        setDuplicatePage(1);
        setSelected(new Set());
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-6 mx-auto max-w-7xl">
                <BarcodeHeader
                    onImport={handleImport}
                    onExport={handleExport}
                />

                <div className="grid gap-6 mt-6 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <BarcodeSidebar
                            form={form}
                            handleChange={handleChange}
                        />
                    </div>

                    <div className="space-y-6 lg:col-span-8">
                        {/* Only show credit warning when there's an issue */}
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
                                costPerItem={creditInfo.cost_per_barcode}
                                hasUnlimited={hasUnlimitedCredits}
                                scope={selected.size > 0 ? "selected" : "all"}
                                maxAllowed={creditInfo.max_allowed}
                            />
                        )}

                        <BarcodePreviewTable
                            barcodes={barcodes}
                            total={total}
                            overall_total={overallTotal}
                            duplicateGroups={duplicateGroups}
                            stats={stats}
                            page={page}
                            setPage={setPage}
                            duplicatePage={duplicatePage}
                            setDuplicatePage={setDuplicatePage}
                            activeTab={activeTab}
                            setActiveTab={handleTabChange}
                            selected={selected}
                            setSelected={setSelected}
                            loading={loading}
                            applying={applying}
                            applyBarcodes={applyBarcodes}
                            form={form}
                            handleChange={handleChange}
                            initialCollections={initialCollections}
                            selectedCollectionIds={selectedCollectionIds}
                            setSelectedCollectionIds={setSelectedCollectionIds}
                            selectedVendors={selectedVendors}
                            setSelectedVendors={setSelectedVendors}
                            selectedTypes={selectedTypes}
                            setSelectedTypes={setSelectedTypes}
                            selectedTags={selectedTags}
                            setSelectedTags={setSelectedTags}
                            isApplyDisabled={isApplyDisabled}
                            hasUnlimitedCredits={hasUnlimitedCredits}
                        />
                    </div>

                    {importModalOpen && (
                        <BarcodeImportModal
                            isOpen={importModalOpen}
                            onClose={() => setImportModalOpen(false)}
                        />
                    )}

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
