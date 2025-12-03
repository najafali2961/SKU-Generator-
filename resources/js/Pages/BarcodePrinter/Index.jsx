import React, { useState, useEffect } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";

import PrinterHeader from "../components/printer/PrinterHeader";
import PrinterSidebar from "../components/printer/PrinterSidebar";
import PrinterProductTable from "../components/printer/PrinterProductTable";

export default function BarcodePrinterIndex({ setting }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVariants, setSelectedVariants] = useState(new Set());
    const [printing, setPrinting] = useState(false);

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

        // Filters
        search: "",
        vendor: "",
        type: "",
    });

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const res = await axios.get("/barcode-printer/products");
            console.log("Products loaded:", res.data);

            // Ensure we have an array
            const productsData = Array.isArray(res.data) ? res.data : [];

            // Validate each product has variants array
            const validatedProducts = productsData.map((product) => ({
                ...product,
                variants: Array.isArray(product.variants)
                    ? product.variants
                    : [],
            }));

            setProducts(validatedProducts);

            console.log(
                `✅ Successfully loaded ${
                    validatedProducts.length
                } products with ${validatedProducts.reduce(
                    (sum, p) => sum + p.variants.length,
                    0
                )} variants`
            );
        } catch (error) {
            console.error("❌ Failed to load products:", error);
            console.error("Error details:", error.response?.data);

            setProducts([]); // Set empty array on error

            alert(
                `Failed to load products:\n${
                    error.response?.data?.message || error.message
                }\n\nPlease check:\n- Are you authenticated?\n- Do you have products in your store?\n- Check browser console for details.`
            );
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key, value) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };

    const generatePDF = async (scope = "selected") => {
        const variantIds =
            scope === "selected"
                ? Array.from(selectedVariants)
                : products.flatMap((p) => p.variants?.map((v) => v.id) || []);

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

    // Filter products based on search/filters
    const filteredProducts = products.filter((product) => {
        const searchLower = config.search.toLowerCase();
        const matchesSearch =
            !config.search ||
            product.title?.toLowerCase().includes(searchLower) ||
            product.variants?.some(
                (v) =>
                    v.sku?.toLowerCase().includes(searchLower) ||
                    v.barcode?.toLowerCase().includes(searchLower)
            );

        const matchesVendor =
            !config.vendor ||
            product.vendor?.toLowerCase().includes(config.vendor.toLowerCase());

        const matchesType =
            !config.type ||
            product.type?.toLowerCase().includes(config.type.toLowerCase());

        return matchesSearch && matchesVendor && matchesType;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-6 mx-auto max-w-7xl">
                <PrinterHeader
                    selectedCount={selectedVariants.length}
                    totalVariants={
                        products.flatMap((p) => p.variants || []).length
                    }
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

                    {/* RIGHT SECTION - Products */}
                    <div className="lg:col-span-8">
                        <PrinterProductTable
                            products={filteredProducts}
                            loading={loading}
                            selectedVariants={selectedVariants}
                            setSelectedVariants={setSelectedVariants}
                            printing={printing}
                            generatePDF={generatePDF}
                            config={config}
                            handleChange={handleChange}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
