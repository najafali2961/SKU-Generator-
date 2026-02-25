// resources/js/Pages/BarcodePrinter/Index.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";

import {
    Card,
    Page,
    Layout,
    SkeletonPage,
    SkeletonBodyText,
    Toast,
    Frame,
    Text,
    BlockStack,
    ProgressBar,
} from "@shopify/polaris";
import { router } from "@inertiajs/react";

import PrinterHeader from "./printer/PrinterHeader";
import PrinterSidebar from "./printer/PrinterSidebar";
import PrinterVariantTable from "./printer/PrinterVariantTable";
import CreditWarning from "../components/CreditWarning";

export default function BarcodePrinterIndex({
    setting,
    templates: initialTemplates = [],
    printerPresets: initialPresets = [],
    initialCollections = [],
    availableCredits = 0,
    hasUnlimitedCredits = false,
    creditCostPerLabel = 1,
}) {
    // Toast State
    const [toastActive, setToastActive] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastError, setToastError] = useState(false);

    const toggleToast = () => setToastActive((active) => !active);
    const showToast = (message, isError = false) => {
        setToastMessage(message);
        setToastError(isError);
        setToastActive(true);
    };

    const toastMarkup = toastActive ? (
        <Toast
            content={toastMessage}
            onDismiss={toggleToast}
            error={toastError}
        />
    ) : null;

    const [variants, setVariants] = useState([]);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState({ missing: 0, with_barcode: 0, all: 0 });
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(new Set());
    const [printing, setPrinting] = useState(false);
    const [templates, setTemplates] = useState(initialTemplates);
    const [printerPresets] = useState(initialPresets);

    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState("all");
    const [queryValue, setQueryValue] = useState("");
    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);

    const [creditInfo] = useState({
        available: availableCredits,
        cost_per_item: creditCostPerLabel,
        has_unlimited: hasUnlimitedCredits,
        max_allowed: hasUnlimitedCredits
            ? Number.MAX_SAFE_INTEGER
            : Math.floor(availableCredits / creditCostPerLabel),
    });

    const [config, setConfig] = useState({
        // Label Design
        label_name: setting?.label_name || "Default Label",
        barcode_type: setting?.barcode_type || "code128",

        // QR Data Source (NEW)
        qr_data_source: setting?.qr_data_source || "barcode",
        qr_custom_format: setting?.qr_custom_format || "",

        // Paper Setup
        paper_size: setting?.paper_size || "a4",
        paper_orientation: setting?.paper_orientation || "portrait",
        paper_width: Number(setting?.paper_width) || 210,
        paper_height: Number(setting?.paper_height) || 297,

        // Page Margins (mm)
        margin_top: Number(setting?.page_margin_top) || 10,
        margin_bottom: Number(setting?.page_margin_bottom) || 10,
        margin_left: Number(setting?.page_margin_left) || 10,
        margin_right: Number(setting?.page_margin_right) || 10,

        // Label Dimensions (mm)
        label_width: Number(setting?.label_width) || 80,
        label_height: Number(setting?.label_height) || 40,

        // Layout
        labels_per_row: Number(setting?.labels_per_row) || 2,
        labels_per_column: Number(setting?.labels_per_column) || 5,
        label_spacing_horizontal:
            Number(setting?.label_spacing_horizontal) || 5,
        label_spacing_vertical: Number(setting?.label_spacing_vertical) || 5,

        // Barcode Settings
        barcode_width: Number(setting?.barcode_width) || 60,
        barcode_height: Number(setting?.barcode_height) || 20,
        barcode_position: setting?.barcode_position || "center",
        show_barcode_value: setting?.show_barcode_value !== false,

        // Attributes to Show
        show_product_title: setting?.show_product_title !== false,
        show_sku: setting?.show_sku !== false,
        show_price: setting?.show_price === true,
        show_variant: setting?.show_variant !== false,
        show_vendor: setting?.show_vendor === true,
        show_product_type: setting?.show_product_type === true,

        // Typography
        font_family: setting?.font_family || "Arial",
        font_size: Number(setting?.font_size) || 10,
        font_color: setting?.font_color || "#000000",
        title_font_size: Number(setting?.title_font_size) || 12,
        title_bold: setting?.title_bold !== false,

        // Text Layout (NEW)
        text_layout: setting?.text_layout || null,

        // Quantity
        quantity_per_variant: 1,
    });

    useEffect(() => {
        loadVariants();
    }, [
        page,
        activeTab,
        queryValue,
        selectedCollectionIds,
        selectedVendors,
        selectedTypes,
        selectedTags,
    ]);

    const loadVariants = async () => {
        try {
            setLoading(true);
            const res = await axios.get("/barcode-printer/variants", {
                params: {
                    page,
                    tab: activeTab,
                    search: queryValue,
                    collections: selectedCollectionIds,
                    vendor: selectedVendors[0] || "",
                    type: selectedTypes[0] || "",
                    tags: selectedTags,
                },
            });
            setVariants(res.data.variants || []);
            setTotal(res.data.total || 0);
            setStats(res.data.stats || { missing: 0, with_barcode: 0, all: 0 });
        } catch (error) {
            console.error("❌ Failed to load variants:", error);
            showToast(
                `Failed to load variants: ${
                    error.response?.data?.message || error.message
                }`,
                true,
            );
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key, value) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };

    const handleTemplatesUpdate = () => {
        // Reload the page to get fresh templates
        window.location.reload();
    };

    // Calculate credit requirements
    const getCreditRequirements = (scope) => {
        let itemCount = 0;
        const qtyPerVariant = parseInt(config.quantity_per_variant) || 1;

        if (scope === "selected") {
            itemCount = selected.size * qtyPerVariant;
        } else if (scope === "all") {
            // Need total from stats (assuming stats.all is total variants)
            // But we might be filtered.
            // Best to use 'total' state which tracks filtered count
            itemCount = total * qtyPerVariant;
        }

        const requiredCredits = itemCount * creditInfo.cost_per_item;
        const available = creditInfo.available;
        const hasEnough =
            creditInfo.has_unlimited || available >= requiredCredits;

        return {
            itemCount,
            requiredCredits,
            hasEnough,
            available,
            maxAllowed: creditInfo.max_allowed,
        };
    };

    const activeScope = selected.size > 0 ? "selected" : "all";
    const currentRequirements = getCreditRequirements(activeScope);

    const shouldShowCreditWarning = () => {
        if (creditInfo.has_unlimited) return false;
        return !currentRequirements.hasEnough;
    };

    // Batch Job Logic
    const generatePDF = async (scope = "selected") => {
        const requirements = getCreditRequirements(scope);

        if (!creditInfo.has_unlimited && !requirements.hasEnough) {
            showToast("Insufficient credits to perform this action.", true);
            return;
        }

        let variantIds = [];

        if (scope === "selected") {
            variantIds = Array.from(selected);
        } else if (scope === "all") {
            // Get all variant IDs
            try {
                const res = await axios.get("/barcode-printer/variants", {
                    params: {
                        tab: activeTab,
                        search: queryValue,
                        collections: selectedCollectionIds,
                        vendor: selectedVendors[0] || "",
                        type: selectedTypes[0] || "",
                        tags: selectedTags,
                        get_all_ids: true,
                    },
                });
                variantIds = res.data.all_variant_ids || [];
            } catch (error) {
                console.error("Failed to get all variant IDs:", error);
                showToast("Failed to get variant IDs", true);
                return;
            }
        }

        if (variantIds.length === 0) {
            showToast("No variants selected!", true);
            return;
        }

        // ALWAYS DISPATCH AS JOB
        try {
            setPrinting(true);

            // Save config first
            await axios.post(
                `/barcode-printer/update-setting/${setting.id}`,
                config,
            );

            const res = await axios.post("/barcode-printer/generate-pdf-job", {
                setting_id: setting.id,
                variant_ids: variantIds,
                quantity_per_variant: parseInt(config.quantity_per_variant),
            });

            if (res.data.success) {
                showToast("Job started! Redirecting...");
                // Redirect to the Job Details page
                router.visit(`/jobs/${res.data.job_id}`);
            }
        } catch (error) {
            console.error("Job start failed:", error);
            showToast(
                error.response?.data?.message || "Failed to start job",
                true,
            );
            setPrinting(false);
        }
        return;

        // Dead code removed: Standard direct download is no longer used.
    };

    return (
        <Frame>
            <div className="min-h-screen bg-gray-50">
                <div className="p-6 mx-auto max-w-7xl">
                    <PrinterHeader
                        selectedCount={selected.size}
                        totalVariants={total}
                    />

                    <div className="grid gap-6 mt-6 lg:grid-cols-12">
                        {/* LEFT SIDEBAR - Configuration */}
                        <div className="lg:col-span-4">
                            <PrinterSidebar
                                config={config}
                                handleChange={handleChange}
                                settingId={setting.id}
                                templates={templates}
                                printerPresets={printerPresets}
                                onTemplatesUpdate={handleTemplatesUpdate}
                            />
                        </div>

                        {/* RIGHT SECTION - Variants */}
                        <div className="lg:col-span-8">
                            {shouldShowCreditWarning() && (
                                <div className="mb-6">
                                    <CreditWarning
                                        selectedCount={
                                            currentRequirements.itemCount
                                        }
                                        totalCount={total}
                                        availableCredits={creditInfo.available}
                                        costPerItem={creditInfo.cost_per_item}
                                        hasUnlimited={creditInfo.has_unlimited}
                                        scope={activeScope}
                                        maxAllowed={
                                            currentRequirements.maxAllowed
                                        }
                                        customMessage={(req, avail) =>
                                            `Printing these labels requires ${req} credits, but you only have ${avail}.`
                                        }
                                    />
                                </div>
                            )}
                            <PrinterVariantTable
                                variants={variants}
                                total={total}
                                stats={stats}
                                loading={loading}
                                page={page}
                                setPage={setPage}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                queryValue={queryValue}
                                setQueryValue={setQueryValue}
                                selected={selected}
                                setSelected={setSelected}
                                printing={printing}
                                generatePDF={generatePDF}
                                config={config}
                                handleChange={handleChange}
                                initialCollections={initialCollections}
                                selectedCollectionIds={selectedCollectionIds}
                                setSelectedCollectionIds={
                                    setSelectedCollectionIds
                                }
                                selectedVendors={selectedVendors}
                                setSelectedVendors={setSelectedVendors}
                                selectedTypes={selectedTypes}
                                setSelectedTypes={setSelectedTypes}
                                selectedTags={selectedTags}
                                setSelectedTags={setSelectedTags}
                                disablePrint={
                                    !creditInfo.has_unlimited &&
                                    !currentRequirements.hasEnough
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>
            {toastMarkup}
        </Frame>
    );
}
