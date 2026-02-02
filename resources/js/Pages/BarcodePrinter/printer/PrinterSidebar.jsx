// ==============================================================================
// FILE 9: resources/js/Pages/BarcodePrinter/printer/PrinterSidebar.jsx
// PART 1 OF 2 - IMPORTS AND COMPONENT START
// ==============================================================================

import React, { useState } from "react";
import {
    Card,
    FormLayout,
    TextField,
    Select,
    Checkbox,
    Text,
    BlockStack,
    Divider,
    InlineStack,
    Button,
    Box,
    Collapsible,
    Modal,
    TextContainer,
    Badge,
    Icon,
    Tooltip,
} from "@shopify/polaris";
import {
    ChevronDownIcon,
    ChevronUpIcon,
    SaveIcon,
    DeleteIcon,
    StarFilledIcon,
    StarIcon,
    EditIcon,
    DuplicateIcon,
} from "@shopify/polaris-icons";
import axios from "axios";

export default function PrinterSidebar({
    config,
    handleChange,
    settingId,
    templates = [],
    printerPresets = [],
    onTemplatesUpdate,
}) {
    const [expandedSections, setExpandedSections] = useState({
        printerSetup: true,
        templates: true,
        paper: true,
        label: true,
        barcode: true,
        attributes: true,
        typography: false,
    });

    // Template Management State
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templateName, setTemplateName] = useState("");
    const [templateDescription, setTemplateDescription] = useState("");
    const [setAsDefault, setSetAsDefault] = useState(false);
    const [saving, setSaving] = useState(false);

    const toggleSection = (section) => {
        setExpandedSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const SectionHeader = ({ title, section }) => (
        <button
            type="button"
            onClick={() => toggleSection(section)}
            style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
            }}
        >
            <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingMd" as="h3">
                    {title}
                </Text>
                <Box>
                    {expandedSections[section] ? (
                        <ChevronUpIcon />
                    ) : (
                        <ChevronDownIcon />
                    )}
                </Box>
            </InlineStack>
        </button>
    );

    // Printer Selection State
    const [printerStep, setPrinterStep] = useState("type"); // type, brand, model
    const [selectedType, setSelectedType] = useState("thermal"); // Default to thermal
    const currentPrinterType = selectedType; // Alias for legacy references
    const [selectedBrand, setSelectedBrand] = useState("");
    const [selectedPrinterId, setSelectedPrinterId] = useState("");

    // Reset selection when changing type
    const handleTypeChange = (type) => {
        setSelectedType(type);
        // Sync with prop-derived state removed, using alias
        setSelectedBrand("");
        setSelectedPrinterId("");

        // Enforce defaults immediately
        if (type === "thermal") {
            handleChange("labels_per_row", 1);
            handleChange("labels_per_column", 1);
            handleChange("paper_size", "custom");
            // AUTO-SYNC: Set PDF Paper Size to match Label Size
            handleChange("paper_width", config.label_width);
            handleChange("paper_height", config.label_height);

            // Also reset margins for thermal
            handleChange("page_margin_top", 0);
            handleChange("page_margin_right", 0);
            handleChange("page_margin_bottom", 0);
            handleChange("page_margin_left", 0);
        }
    };

    // Helper: Normalize 'laser' -> 'sheet' for UI consistency if needed
    const normalizeType = (t) => (t === "laser" ? "sheet" : t);

    // Get unique brands for the selected type
    const availableBrands = React.useMemo(() => {
        const typeToMatch = selectedType === "sheet" ? "sheet" : "thermal";
        // Note: Seeder uses 'sheet' (for generic) and 'thermal' (for rolls).
        // If old seeds exist they might be 'laser', map them to sheet.
        const brands = new Set(
            printerPresets
                .filter(
                    (p) =>
                        p.type === typeToMatch ||
                        (typeToMatch === "sheet" && p.type === "laser"),
                )
                .map((p) => p.brand),
        );
        return [...brands].sort();
    }, [printerPresets, selectedType]);

    // Get models for selected brand
    const availableModels = React.useMemo(() => {
        const typeToMatch = selectedType === "sheet" ? "sheet" : "thermal";
        return printerPresets.filter(
            (p) =>
                (p.type === typeToMatch ||
                    (typeToMatch === "sheet" && p.type === "laser")) &&
                p.brand === selectedBrand,
        );
    }, [printerPresets, selectedType, selectedBrand]);

    // Load Printer Preset
    const loadPrinterPreset = async (presetId) => {
        setSelectedPrinterId(presetId); // Update local state for UI

        if (!presetId || presetId === "custom") return;

        try {
            const preset = printerPresets.find(
                (p) => p.id === parseInt(presetId),
            );
            if (!preset) return;

            // Set Printer Type to control UI visibility
            setSelectedType(normalizeType(preset.type));

            // Apply all settings from preset
            Object.entries(preset.settings).forEach(([key, value]) => {
                if (key === "qr_data_source" && !value) return; // Don't overwrite with null
                handleChange(key, value);
            });

            // FORCE THERMAL DEFAULTS
            if (preset.type === "thermal") {
                handleChange("labels_per_row", 1);
                handleChange("labels_per_column", 1);
                handleChange("label_spacing_horizontal", 0);
                handleChange("label_spacing_vertical", 0);
                handleChange("margin_top", 0);
                handleChange("margin_right", 0);
                handleChange("margin_bottom", 0);
                handleChange("margin_left", 0);
                handleChange("paper_size", "custom");
            }
        } catch (error) {
            console.error("Failed to load preset:", error);
            alert("Failed to load printer preset");
        }
    };

    // Auto-size label content
    const autoSizeLabelContent = () => {
        const labelArea = config.label_width * config.label_height;

        // Smart font sizing based on label size
        let baseFontSize, titleFontSize, barcodeHeight;

        if (labelArea < 1500) {
            // Small labels (< 30x50mm)
            baseFontSize = 7;
            titleFontSize = 8;
            barcodeHeight = Math.min(12, config.label_height * 0.3);
        } else if (labelArea < 3500) {
            // Medium labels
            baseFontSize = 9;
            titleFontSize = 11;
            barcodeHeight = Math.min(18, config.label_height * 0.35);
        } else {
            // Large labels
            baseFontSize = 11;
            titleFontSize = 14;
            barcodeHeight = Math.min(25, config.label_height * 0.4);
        }

        // Barcode width should be 70-80% of label width
        const barcodeWidth = config.label_width * 0.75;

        handleChange("font_size", baseFontSize);
        handleChange("title_font_size", titleFontSize);
        handleChange("barcode_width", Math.round(barcodeWidth));
        handleChange("barcode_height", Math.round(barcodeHeight));
    };

    // Template Management Functions
    const handleSaveTemplate = async () => {
        if (!templateName.trim()) {
            alert("Please enter a template name");
            return;
        }

        setSaving(true);
        try {
            const response = await axios.post(
                "/barcode-printer/save-template",
                {
                    name: templateName,
                    description: templateDescription,
                    settings: config,
                    is_default: setAsDefault,
                },
            );

            if (response.data.success) {
                setShowSaveModal(false);
                setTemplateName("");
                setTemplateDescription("");
                setSetAsDefault(false);

                if (onTemplatesUpdate) {
                    onTemplatesUpdate();
                }
            }
        } catch (error) {
            console.error("Failed to save template:", error);
            alert("Failed to save template. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleLoadTemplate = async (template) => {
        try {
            const response = await axios.get(
                `/barcode-printer/load-template/${template.id}`,
            );

            if (response.data.success) {
                Object.entries(response.data.settings).forEach(
                    ([key, value]) => {
                        handleChange(key, value);
                    },
                );
            }
        } catch (error) {
            console.error("Failed to load template:", error);
            alert("Failed to load template. Please try again.");
        }
    };

    const handleUpdateTemplate = async () => {
        if (!selectedTemplate || !templateName.trim()) {
            alert("Please enter a template name");
            return;
        }

        setSaving(true);
        try {
            const response = await axios.post(
                `/barcode-printer/update-template/${selectedTemplate.id}`,
                {
                    name: templateName,
                    description: templateDescription,
                    settings: config,
                    is_default: setAsDefault,
                },
            );

            if (response.data.success) {
                setShowEditModal(false);
                setSelectedTemplate(null);
                setTemplateName("");
                setTemplateDescription("");
                setSetAsDefault(false);

                if (onTemplatesUpdate) {
                    onTemplatesUpdate();
                }

                alert("Template updated successfully!");
            }
        } catch (error) {
            console.error("Failed to update template:", error);
            alert("Failed to update template. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTemplate = async () => {
        if (!selectedTemplate) return;

        setSaving(true);
        try {
            const response = await axios.delete(
                `/barcode-printer/delete-template/${selectedTemplate.id}`,
            );

            if (response.data.success) {
                setShowDeleteModal(false);
                setSelectedTemplate(null);

                if (onTemplatesUpdate) {
                    onTemplatesUpdate();
                }
            }
        } catch (error) {
            console.error("Failed to delete template:", error);
            alert("Failed to delete template. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleSetDefaultTemplate = async (templateId) => {
        try {
            const response = await axios.post(
                `/barcode-printer/set-default-template/${templateId}`,
            );

            if (response.data.success) {
                if (onTemplatesUpdate) {
                    onTemplatesUpdate();
                }
            }
        } catch (error) {
            console.error("Failed to set default template:", error);
            alert("Failed to set default template. Please try again.");
        }
    };

    const openEditModal = (template) => {
        setSelectedTemplate(template);
        setTemplateName(template.name);
        setTemplateDescription(template.description || "");
        setSetAsDefault(template.is_default);
        setShowEditModal(true);
    };

    const openDeleteModal = (template) => {
        setSelectedTemplate(template);
        setShowDeleteModal(true);
    };

    return (
        <BlockStack gap="400">
            {/* PRINTER SETUP */}
            <Card>
                <Box padding="400">
                    <BlockStack gap="400">
                        <Text variant="headingMd" as="h3">
                            🖨️ Printer Setup
                        </Text>

                        {/* STEP 1: PRINTER TYPE */}
                        <BlockStack gap="200">
                            <Text variant="bodyMd" fontWeight="semibold">
                                1. How do you want to print labels?
                            </Text>
                            <BlockStack gap="300">
                                <div
                                    onClick={() => handleTypeChange("thermal")}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedType === "thermal" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-300 hover:border-gray-400"}`}
                                >
                                    <InlineStack gap="300" blockAlign="center">
                                        <div className="text-2xl">🏷️</div>
                                        <BlockStack gap="050">
                                            <Text fontWeight="semibold">
                                                Label Printer (Roll-based)
                                            </Text>
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                Zebra, Dymo, Rollo, Brother
                                                (Thermal)
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                </div>
                                <div
                                    onClick={() => handleTypeChange("sheet")}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedType === "sheet" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-300 hover:border-gray-400"}`}
                                >
                                    <InlineStack gap="300" blockAlign="center">
                                        <div className="text-2xl">📄</div>
                                        <BlockStack gap="050">
                                            <Text fontWeight="semibold">
                                                Sheet Printer (A4 / Letter)
                                            </Text>
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                Standard Laser/Inkjet (Avery
                                                Labels)
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                </div>
                            </BlockStack>
                        </BlockStack>

                        <Divider />

                        {/* STEP 2: BRAND SELECTION */}
                        <Select
                            label="2. Select Printer Brand"
                            placeholder="Choose brand..."
                            options={availableBrands.map((b) => ({
                                label: b,
                                value: b,
                            }))}
                            value={selectedBrand}
                            onChange={(v) => {
                                setSelectedBrand(v);
                                setSelectedPrinterId(""); // Reset model when brand changes
                            }}
                            disabled={!selectedType}
                        />

                        {/* STEP 3: MODEL SELECTION */}
                        <Select
                            label="3. Select Printer Model"
                            placeholder="Choose model..."
                            options={[
                                ...availableModels.map((p) => ({
                                    label: p.name,
                                    value: p.id.toString(),
                                })),
                                {
                                    label: "Custom / Other Model",
                                    value: "custom",
                                },
                            ]}
                            value={selectedPrinterId}
                            onChange={(v) => loadPrinterPreset(v)}
                            disabled={!selectedBrand}
                        />
                    </BlockStack>
                </Box>
            </Card>

            {/* TEMPLATE MANAGEMENT */}
            <Card>
                <Box padding="300">
                    <BlockStack gap="300">
                        <InlineStack
                            align="space-between"
                            blockAlign="center"
                            gap="none"
                            style={{ width: "100%", display: "flex" }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                }}
                            >
                                <SectionHeader
                                    title="📋 Templates"
                                    section="templates"
                                />
                            </div>

                            <Button
                                size="slim"
                                icon={SaveIcon}
                                onClick={() => setShowSaveModal(true)}
                            >
                                Save
                            </Button>
                        </InlineStack>

                        <Collapsible
                            open={expandedSections.templates}
                            id="templates-section"
                        >
                            <BlockStack gap="300">
                                {templates.length === 0 ? (
                                    <Box
                                        padding="400"
                                        background="bg-surface-secondary"
                                        borderRadius="200"
                                    >
                                        <Text tone="subdued" alignment="center">
                                            No templates saved yet. Save your
                                            current configuration to reuse it
                                            later.
                                        </Text>
                                    </Box>
                                ) : (
                                    templates.map((template) => (
                                        <Box
                                            key={template.id}
                                            padding="300"
                                            background="bg-surface-secondary"
                                            borderRadius="200"
                                        >
                                            <BlockStack gap="200">
                                                <InlineStack
                                                    align="space-between"
                                                    blockAlign="center"
                                                >
                                                    <InlineStack
                                                        gap="200"
                                                        blockAlign="center"
                                                    >
                                                        <Text fontWeight="semibold">
                                                            {template.name}
                                                        </Text>
                                                        {template.is_default && (
                                                            <Badge tone="success">
                                                                Default
                                                            </Badge>
                                                        )}
                                                    </InlineStack>

                                                    <InlineStack gap="100">
                                                        {!template.is_default && (
                                                            <Tooltip content="Set as default">
                                                                <Button
                                                                    size="micro"
                                                                    icon={
                                                                        StarIcon
                                                                    }
                                                                    onClick={() =>
                                                                        handleSetDefaultTemplate(
                                                                            template.id,
                                                                        )
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip content="Edit">
                                                            <Button
                                                                size="micro"
                                                                icon={EditIcon}
                                                                onClick={() =>
                                                                    openEditModal(
                                                                        template,
                                                                    )
                                                                }
                                                            />
                                                        </Tooltip>
                                                        <Tooltip content="Delete">
                                                            <Button
                                                                size="micro"
                                                                icon={
                                                                    DeleteIcon
                                                                }
                                                                tone="critical"
                                                                onClick={() =>
                                                                    openDeleteModal(
                                                                        template,
                                                                    )
                                                                }
                                                            />
                                                        </Tooltip>
                                                    </InlineStack>
                                                </InlineStack>

                                                {template.description && (
                                                    <Text
                                                        variant="bodySm"
                                                        tone="subdued"
                                                    >
                                                        {template.description}
                                                    </Text>
                                                )}

                                                <Button
                                                    fullWidth
                                                    size="slim"
                                                    onClick={() =>
                                                        handleLoadTemplate(
                                                            template,
                                                        )
                                                    }
                                                >
                                                    Load Template
                                                </Button>
                                            </BlockStack>
                                        </Box>
                                    ))
                                )}
                            </BlockStack>
                        </Collapsible>
                    </BlockStack>
                </Box>
            </Card>

            {/* 3. PHYSICAL LABEL DIMENSIONS */}
            {/* Kept visible because even thermal users need to know/check the size */}
            <Card>
                <Box padding="400">
                    <BlockStack gap="400">
                        <SectionHeader title="📏 Label Size" section="label" />
                        <Collapsible
                            open={expandedSections.label}
                            id="label-section"
                        >
                            <FormLayout>
                                <FormLayout.Group>
                                    <TextField
                                        label="Width (mm)"
                                        type="number"
                                        value={String(config.label_width)}
                                        onChange={(v) => {
                                            handleChange("label_width", +v);
                                            // SYNC: Update paper width if thermal
                                            if (selectedType === "thermal") {
                                                handleChange("paper_width", +v);
                                            }
                                        }}
                                        autoComplete="off"
                                        helpText={
                                            currentPrinterType === "thermal"
                                                ? "Width of your label roll"
                                                : null
                                        }
                                    />
                                    <TextField
                                        label="Height (mm)"
                                        type="number"
                                        value={String(config.label_height)}
                                        onChange={(v) => {
                                            handleChange("label_height", +v);
                                            // SYNC: Update paper height if thermal
                                            if (selectedType === "thermal") {
                                                handleChange(
                                                    "paper_height",
                                                    +v,
                                                );
                                            }
                                        }}
                                        autoComplete="off"
                                        helpText={
                                            currentPrinterType === "thermal"
                                                ? "Height of one label"
                                                : null
                                        }
                                    />
                                </FormLayout.Group>
                                <Button
                                    fullWidth
                                    size="slim"
                                    onClick={autoSizeLabelContent}
                                >
                                    🎯 Auto-Size Content
                                </Button>
                            </FormLayout>
                        </Collapsible>
                    </BlockStack>
                </Box>
            </Card>

            {/* 4. CONTENT & DESIGN (Promoted Up) */}
            <Card>
                <Box padding="400">
                    <BlockStack gap="400">
                        <SectionHeader
                            title="🎨 Content & Design"
                            section="barcode"
                        />
                        {/* Re-using barcode section toggle for the whole group for now, or could split */}

                        <Collapsible
                            open={expandedSections.barcode}
                            id="content-group"
                        >
                            <BlockStack gap="500">
                                {/* BARCODE */}
                                <BlockStack gap="200">
                                    <Text variant="headingSm" tone="subdued">
                                        Barcode
                                    </Text>
                                    <FormLayout>
                                        <Select
                                            label="Format"
                                            value={config.barcode_type}
                                            onChange={(v) =>
                                                handleChange("barcode_type", v)
                                            }
                                            options={[
                                                {
                                                    label: "CODE 128 (Standard)",
                                                    value: "code128",
                                                },
                                                {
                                                    label: "EAN-13 (Retail)",
                                                    value: "ean13",
                                                },
                                                {
                                                    label: "UPC-A",
                                                    value: "upca",
                                                },
                                                {
                                                    label: "QR Code",
                                                    value: "qr",
                                                },
                                                {
                                                    label: "Data Matrix",
                                                    value: "datamatrix",
                                                },
                                            ]}
                                        />

                                        {/* QR DATA SOURCE */}
                                        {(config.barcode_type === "qr" ||
                                            config.barcode_type ===
                                                "datamatrix") && (
                                            <Select
                                                label="QR Data"
                                                value={
                                                    config.qr_data_source ||
                                                    "barcode"
                                                }
                                                onChange={(v) =>
                                                    handleChange(
                                                        "qr_data_source",
                                                        v,
                                                    )
                                                }
                                                options={[
                                                    {
                                                        label: "Barcode (Primary)",
                                                        value: "barcode",
                                                    },
                                                    {
                                                        label: "SKU",
                                                        value: "sku",
                                                    },
                                                    {
                                                        label: "Product URL",
                                                        value: "product_url",
                                                    },
                                                    {
                                                        label: "Custom",
                                                        value: "custom",
                                                    },
                                                ]}
                                            />
                                        )}
                                        {config.qr_data_source === "custom" && (
                                            <BlockStack gap="200">
                                                <TextField
                                                    label="Custom Data Pattern"
                                                    value={
                                                        config.qr_custom_format ||
                                                        ""
                                                    }
                                                    onChange={(v) =>
                                                        handleChange(
                                                            "qr_custom_format",
                                                            v,
                                                        )
                                                    }
                                                    autoComplete="off"
                                                    placeholder="e.g. {{sku}} - {{price}}"
                                                    helpText="Combine text with variables."
                                                />
                                                <BlockStack gap="100">
                                                    <Text
                                                        variant="bodyXs"
                                                        tone="subdued"
                                                    >
                                                        Available Variables:
                                                    </Text>
                                                    <InlineStack gap="200" wrap>
                                                        {[
                                                            "{{title}}",
                                                            "{{sku}}",
                                                            "{{barcode}}",
                                                            "{{price}}",
                                                            "{{vendor}}",
                                                            "{{variant}}",
                                                        ].map((tag) => (
                                                            <div
                                                                key={tag}
                                                                className="px-2 py-1 bg-gray-100 rounded text-xs cursor-pointer hover:bg-gray-200 border border-gray-300"
                                                                onClick={() =>
                                                                    handleChange(
                                                                        "qr_custom_format",
                                                                        (config.qr_custom_format ||
                                                                            "") +
                                                                            " " +
                                                                            tag,
                                                                    )
                                                                }
                                                                title="Click to add"
                                                            >
                                                                {tag}
                                                            </div>
                                                        ))}
                                                    </InlineStack>
                                                </BlockStack>
                                            </BlockStack>
                                        )}

                                        <Checkbox
                                            label="Show value below barcode"
                                            checked={config.show_barcode_value}
                                            onChange={(v) =>
                                                handleChange(
                                                    "show_barcode_value",
                                                    v,
                                                )
                                            }
                                        />
                                    </FormLayout>
                                </BlockStack>

                                <Divider />

                                {/* ATTRIBUTES */}
                                <BlockStack gap="200">
                                    <Text variant="headingSm" tone="subdued">
                                        Text Attributes
                                    </Text>
                                    <BlockStack gap="200">
                                        <InlineStack gap="400" wrap={true}>
                                            <Checkbox
                                                label="Title"
                                                checked={
                                                    config.show_product_title
                                                }
                                                onChange={(v) =>
                                                    handleChange(
                                                        "show_product_title",
                                                        v,
                                                    )
                                                }
                                            />
                                            <Checkbox
                                                label="SKU"
                                                checked={config.show_sku}
                                                onChange={(v) =>
                                                    handleChange("show_sku", v)
                                                }
                                            />
                                            <Checkbox
                                                label="Price"
                                                checked={config.show_price}
                                                onChange={(v) =>
                                                    handleChange(
                                                        "show_price",
                                                        v,
                                                    )
                                                }
                                            />
                                        </InlineStack>
                                        <InlineStack gap="400" wrap={true}>
                                            <Checkbox
                                                label="Variant"
                                                checked={config.show_variant}
                                                onChange={(v) =>
                                                    handleChange(
                                                        "show_variant",
                                                        v,
                                                    )
                                                }
                                            />
                                            <Checkbox
                                                label="Vendor"
                                                checked={config.show_vendor}
                                                onChange={(v) =>
                                                    handleChange(
                                                        "show_vendor",
                                                        v,
                                                    )
                                                }
                                            />
                                        </InlineStack>
                                    </BlockStack>
                                </BlockStack>

                                <Divider />

                                {/* TYPOGRAPHY */}
                                <BlockStack gap="200">
                                    <Text variant="headingSm" tone="subdued">
                                        Typography
                                    </Text>
                                    <FormLayout>
                                        <FormLayout.Group>
                                            <Select
                                                label="Font"
                                                value={config.font_family}
                                                onChange={(v) =>
                                                    handleChange(
                                                        "font_family",
                                                        v,
                                                    )
                                                }
                                                options={[
                                                    {
                                                        label: "Arial",
                                                        value: "Arial",
                                                    },
                                                    {
                                                        label: "Courier",
                                                        value: "Courier",
                                                    },
                                                ]}
                                            />
                                            <TextField
                                                label="Size (pt)"
                                                type="number"
                                                value={String(config.font_size)}
                                                onChange={(v) =>
                                                    handleChange(
                                                        "font_size",
                                                        +v,
                                                    )
                                                }
                                                autoComplete="off"
                                            />
                                        </FormLayout.Group>
                                        <Checkbox
                                            label="Bold Title"
                                            checked={config.title_bold}
                                            onChange={(v) =>
                                                handleChange("title_bold", v)
                                            }
                                        />
                                    </FormLayout>
                                </BlockStack>
                            </BlockStack>
                        </Collapsible>
                    </BlockStack>
                </Box>
            </Card>

            {/* 5. ADVANCED / TECHNICAL SETTINGS (Collapsed) */}
            <Card>
                <Box padding="400">
                    <BlockStack gap="400">
                        <button
                            type="button"
                            onClick={() => toggleSection("paper")} // Re-using 'paper' key for advanced
                            style={{
                                width: "100%",
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                textAlign: "left",
                            }}
                        >
                            <InlineStack
                                align="space-between"
                                blockAlign="center"
                            >
                                <InlineStack gap="200">
                                    <Icon source={EditIcon} tone="subdued" />
                                    <Text variant="headingSm" tone="subdued">
                                        Advanced Layout Settings
                                    </Text>
                                </InlineStack>
                                <Box>
                                    {expandedSections.paper ? (
                                        <ChevronUpIcon />
                                    ) : (
                                        <ChevronDownIcon />
                                    )}
                                </Box>
                            </InlineStack>
                        </button>

                        <Collapsible
                            open={expandedSections.paper}
                            id="advanced-section"
                        >
                            <Box paddingBlockStart="400">
                                <BlockStack gap="500">
                                    <Text tone="caution" variant="bodySm">
                                        ⚠️ Changing these settings may break the
                                        layout. Only use for custom setups.
                                    </Text>

                                    {/* SHEET PRINTER ONLY: PAPER SIZE */}
                                    {currentPrinterType !== "thermal" && (
                                        <BlockStack gap="300">
                                            <Text variant="headingSm">
                                                📄 Sheet / Page Setup
                                            </Text>
                                            <FormLayout>
                                                <Select
                                                    label="Sheet Size"
                                                    value={config.paper_size}
                                                    onChange={(v) =>
                                                        handleChange(
                                                            "paper_size",
                                                            v,
                                                        )
                                                    }
                                                    options={[
                                                        {
                                                            label: "A4",
                                                            value: "a4",
                                                        },
                                                        {
                                                            label: "Letter",
                                                            value: "letter",
                                                        },
                                                        {
                                                            label: "Custom",
                                                            value: "custom",
                                                        },
                                                    ]}
                                                />
                                                <FormLayout.Group>
                                                    <TextField
                                                        label="Page W (mm)"
                                                        type="number"
                                                        value={String(
                                                            config.paper_width,
                                                        )}
                                                        onChange={(v) =>
                                                            handleChange(
                                                                "paper_width",
                                                                +v,
                                                            )
                                                        }
                                                        autoComplete="off"
                                                    />
                                                    <TextField
                                                        label="Page H (mm)"
                                                        type="number"
                                                        value={String(
                                                            config.paper_height,
                                                        )}
                                                        onChange={(v) =>
                                                            handleChange(
                                                                "paper_height",
                                                                +v,
                                                            )
                                                        }
                                                        autoComplete="off"
                                                    />
                                                </FormLayout.Group>
                                                <Text
                                                    variant="bodySm"
                                                    tone="subdued"
                                                >
                                                    Margins
                                                </Text>
                                                <FormLayout.Group condensed>
                                                    <TextField
                                                        label="Top"
                                                        type="number"
                                                        value={String(
                                                            config.page_margin_top,
                                                        )}
                                                        onChange={(v) =>
                                                            handleChange(
                                                                "page_margin_top",
                                                                +v,
                                                            )
                                                        }
                                                        autoComplete="off"
                                                    />
                                                    <TextField
                                                        label="Left"
                                                        type="number"
                                                        value={String(
                                                            config.page_margin_left,
                                                        )}
                                                        onChange={(v) =>
                                                            handleChange(
                                                                "page_margin_left",
                                                                +v,
                                                            )
                                                        }
                                                        autoComplete="off"
                                                    />
                                                </FormLayout.Group>
                                                <FormLayout.Group condensed>
                                                    <TextField
                                                        label="Right"
                                                        type="number"
                                                        value={String(
                                                            config.page_margin_right,
                                                        )}
                                                        onChange={(v) =>
                                                            handleChange(
                                                                "page_margin_right",
                                                                +v,
                                                            )
                                                        }
                                                        autoComplete="off"
                                                    />
                                                    <TextField
                                                        label="Bottom"
                                                        type="number"
                                                        value={String(
                                                            config.page_margin_bottom,
                                                        )}
                                                        onChange={(v) =>
                                                            handleChange(
                                                                "page_margin_bottom",
                                                                +v,
                                                            )
                                                        }
                                                        autoComplete="off"
                                                    />
                                                </FormLayout.Group>
                                            </FormLayout>
                                        </BlockStack>
                                    )}

                                    {/* SHEET PRINTER ONLY: GRID (Rows/Cols) */}
                                    {currentPrinterType !== "thermal" && (
                                        <BlockStack gap="300">
                                            <Divider />
                                            <Text variant="headingSm">
                                                ▦ Grid Layout
                                            </Text>
                                            <FormLayout>
                                                <FormLayout.Group>
                                                    <TextField
                                                        label="Rows"
                                                        type="number"
                                                        value={String(
                                                            config.labels_per_column,
                                                        )}
                                                        onChange={(v) =>
                                                            handleChange(
                                                                "labels_per_column",
                                                                +v,
                                                            )
                                                        }
                                                        autoComplete="off"
                                                    />
                                                    <TextField
                                                        label="Columns"
                                                        type="number"
                                                        value={String(
                                                            config.labels_per_row,
                                                        )}
                                                        onChange={(v) =>
                                                            handleChange(
                                                                "labels_per_row",
                                                                +v,
                                                            )
                                                        }
                                                        autoComplete="off"
                                                    />
                                                </FormLayout.Group>
                                                <FormLayout.Group>
                                                    <TextField
                                                        label="Gap H (mm)"
                                                        type="number"
                                                        value={String(
                                                            config.label_spacing_horizontal,
                                                        )}
                                                        onChange={(v) =>
                                                            handleChange(
                                                                "label_spacing_horizontal",
                                                                +v,
                                                            )
                                                        }
                                                        autoComplete="off"
                                                    />
                                                    <TextField
                                                        label="Gap V (mm)"
                                                        type="number"
                                                        value={String(
                                                            config.label_spacing_vertical,
                                                        )}
                                                        onChange={(v) =>
                                                            handleChange(
                                                                "label_spacing_vertical",
                                                                +v,
                                                            )
                                                        }
                                                        autoComplete="off"
                                                    />
                                                </FormLayout.Group>
                                            </FormLayout>
                                        </BlockStack>
                                    )}

                                    {/* THERMAL ONLY MESSAGE */}
                                    {currentPrinterType === "thermal" && (
                                        <Box
                                            background="bg-surface-secondary"
                                            padding="300"
                                            borderRadius="200"
                                        >
                                            <BlockStack gap="200">
                                                <Text fontWeight="semibold">
                                                    Thermal Printer Mode Active
                                                </Text>
                                                <Text variant="bodySm">
                                                    Page size, margins, and grid
                                                    settings are disabled
                                                    because thermal printers
                                                    print one label at a time.
                                                    Modify the "Label Size"
                                                    above if you need to change
                                                    dimensions.
                                                </Text>
                                            </BlockStack>
                                        </Box>
                                    )}
                                </BlockStack>
                            </Box>
                        </Collapsible>
                    </BlockStack>
                </Box>
            </Card>

            {/* QUANTITY */}
            <Card>
                <Box padding="400">
                    <FormLayout>
                        <TextField
                            label="Labels per Variant"
                            type="number"
                            min="1"
                            max="100"
                            value={String(config.quantity_per_variant)}
                            onChange={(v) =>
                                handleChange(
                                    "quantity_per_variant",
                                    Math.max(1, +v),
                                )
                            }
                            helpText="How many labels to print for each variant"
                            autoComplete="off"
                        />
                    </FormLayout>
                </Box>
            </Card>

            {/* MODALS */}
            <Modal
                open={showSaveModal}
                onClose={() => {
                    setShowSaveModal(false);
                    setTemplateName("");
                    setTemplateDescription("");
                    setSetAsDefault(false);
                }}
                title="Save Template"
                primaryAction={{
                    content: "Save Template",
                    onAction: handleSaveTemplate,
                    loading: saving,
                }}
                secondaryActions={[
                    {
                        content: "Cancel",
                        onAction: () => {
                            setShowSaveModal(false);
                            setTemplateName("");
                            setTemplateDescription("");
                            setSetAsDefault(false);
                        },
                    },
                ]}
            >
                <Modal.Section>
                    <FormLayout>
                        <TextField
                            label="Template Name"
                            value={templateName}
                            onChange={setTemplateName}
                            placeholder="e.g., Jewelry Labels, Shipping Labels"
                            autoComplete="off"
                        />
                        <TextField
                            label="Description (Optional)"
                            value={templateDescription}
                            onChange={setTemplateDescription}
                            placeholder="Brief description of this template"
                            multiline={3}
                            autoComplete="off"
                        />
                        <Checkbox
                            label="Set as default template"
                            checked={setAsDefault}
                            onChange={setSetAsDefault}
                        />
                    </FormLayout>
                </Modal.Section>
            </Modal>

            <Modal
                open={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedTemplate(null);
                    setTemplateName("");
                    setTemplateDescription("");
                    setSetAsDefault(false);
                }}
                title="Edit Template"
                primaryAction={{
                    content: "Update Template",
                    onAction: handleUpdateTemplate,
                    loading: saving,
                }}
                secondaryActions={[
                    {
                        content: "Cancel",
                        onAction: () => {
                            setShowEditModal(false);
                            setSelectedTemplate(null);
                            setTemplateName("");
                            setTemplateDescription("");
                            setSetAsDefault(false);
                        },
                    },
                ]}
            >
                <Modal.Section>
                    <FormLayout>
                        <TextField
                            label="Template Name"
                            value={templateName}
                            onChange={setTemplateName}
                            autoComplete="off"
                        />
                        <TextField
                            label="Description (Optional)"
                            value={templateDescription}
                            onChange={setTemplateDescription}
                            multiline={3}
                            autoComplete="off"
                        />
                        <Checkbox
                            label="Set as default template"
                            checked={setAsDefault}
                            onChange={setSetAsDefault}
                        />
                    </FormLayout>
                </Modal.Section>
            </Modal>

            <Modal
                open={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSelectedTemplate(null);
                }}
                title="Delete Template"
                primaryAction={{
                    content: "Delete",
                    onAction: handleDeleteTemplate,
                    destructive: true,
                    loading: saving,
                }}
                secondaryActions={[
                    {
                        content: "Cancel",
                        onAction: () => {
                            setShowDeleteModal(false);
                            setSelectedTemplate(null);
                        },
                    },
                ]}
            >
                <Modal.Section>
                    <TextContainer>
                        <Text>
                            Are you sure you want to delete the template "
                            {selectedTemplate?.name}"? This action cannot be
                            undone.
                        </Text>
                    </TextContainer>
                </Modal.Section>
            </Modal>
        </BlockStack>
    );
}
