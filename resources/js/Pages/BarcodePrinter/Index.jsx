// resources/js/Pages/BarcodePrinter/Index.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

import PrinterHeader from "./printer/PrinterHeader";
import PrinterSidebar from "./printer/PrinterSidebar";
import PrinterVariantTable from "./printer/PrinterVariantTable";

export default function BarcodePrinterIndex({
    setting,
    initialCollections = [],
}) {
    const [variants, setVariants] = useState([]);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState({ missing: 0, with_barcode: 0, all: 0 });
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(new Set());
    const [printing, setPrinting] = useState(false);

    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState("all");
    const [queryValue, setQueryValue] = useState("");
    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);

    const [config, setConfig] = useState({
        // Label Design
        label_name: setting?.label_name || "Default Label",
        barcode_type: setting?.barcode_type || "code128",

        // Paper Setup
        paper_size: setting?.paper_size || "a4",
        paper_orientation: setting?.paper_orientation || "portrait",
        paper_width: Number(setting?.paper_width) || 210,
        paper_height: Number(setting?.paper_height) || 297,

        // Page Margins (mm)
        margin_top: Number(setting?.margin_top) || 10,
        margin_bottom: Number(setting?.margin_bottom) || 10,
        margin_left: Number(setting?.margin_left) || 10,
        margin_right: Number(setting?.margin_right) || 10,

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
        show_title: setting?.show_product_title !== false,
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
                },
            });
            setVariants(res.data.variants || []);
            setTotal(res.data.total || 0);
            setStats(res.data.stats || { missing: 0, with_barcode: 0, all: 0 });
        } catch (error) {
            console.error("❌ Failed to load variants:", error);
            alert(
                `Failed to load variants: ${
                    error.response?.data?.message || error.message
                }`
            );
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key, value) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };

    const generatePDF = async (scope = "selected") => {
        let variantIds = [];

        if (scope === "selected") {
            variantIds = Array.from(selected);
        } else if (scope === "all") {
            // Get all variant IDs with current filters
            try {
                const res = await axios.get("/barcode-printer/variants", {
                    params: {
                        tab: activeTab,
                        search: queryValue,
                        collections: selectedCollectionIds,
                        vendor: selectedVendors[0] || "",
                        type: selectedTypes[0] || "",
                        get_all_ids: true,
                    },
                });
                variantIds = res.data.all_variant_ids || [];
            } catch (error) {
                console.error("Failed to get all variant IDs:", error);
                alert("Failed to get variant IDs");
                return;
            }
        }

        if (variantIds.length === 0) {
            alert("No variants selected!");
            return;
        }

        try {
            setPrinting(true);

            // Save config first
            await axios.post(
                `/barcode-printer/update-setting/${setting.id}`,
                config
            );

            // Generate PDF
            const res = await axios.post(
                "/barcode-printer/generate-pdf",
                {
                    setting_id: setting.id,
                    variant_ids: variantIds,
                    quantity_per_variant: parseInt(config.quantity_per_variant),
                },
                { responseType: "blob" }
            );

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = `labels-${new Date().toISOString().slice(0, 10)}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("PDF generation failed:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setPrinting(false);
        }
    };

    return (
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
                        />
                    </div>

                    {/* RIGHT SECTION - Variants */}
                    <div className="lg:col-span-8">
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
