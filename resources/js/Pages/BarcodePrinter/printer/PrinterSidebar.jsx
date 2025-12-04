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

    // Load Printer Preset
    const loadPrinterPreset = async (presetId) => {
        if (!presetId || presetId === "custom") return;

        try {
            const preset = printerPresets.find(
                (p) => p.id === parseInt(presetId)
            );
            if (!preset) return;

            // Apply all settings from preset
            Object.entries(preset.settings).forEach(([key, value]) => {
                handleChange(key, value);
            });
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

    // Grid Calculator Component
    const LabelGridCalculator = ({ config }) => {
        const calculateFit = () => {
            const availableWidth =
                config.paper_width - config.margin_left - config.margin_right;
            const availableHeight =
                config.paper_height - config.margin_top - config.margin_bottom;

            const labelPlusGapWidth =
                config.label_width + config.label_spacing_horizontal;
            const labelPlusGapHeight =
                config.label_height + config.label_spacing_vertical;

            const maxCols = Math.floor(
                (availableWidth + config.label_spacing_horizontal) /
                    labelPlusGapWidth
            );
            const maxRows = Math.floor(
                (availableHeight + config.label_spacing_vertical) /
                    labelPlusGapHeight
            );

            const totalLabelsPerPage =
                config.labels_per_row * config.labels_per_column;
            const willFit =
                config.labels_per_row <= maxCols &&
                config.labels_per_column <= maxRows;

            return { maxCols, maxRows, totalLabelsPerPage, willFit };
        };

        const { maxCols, maxRows, totalLabelsPerPage, willFit } =
            calculateFit();

        return (
            <Box
                padding="300"
                background={
                    willFit
                        ? "bg-surface-success-subdued"
                        : "bg-surface-critical-subdued"
                }
                borderRadius="200"
            >
                <BlockStack gap="200">
                    <InlineStack align="space-between">
                        <Text variant="bodySm" fontWeight="semibold">
                            Grid Layout
                        </Text>
                        {willFit ? (
                            <Badge tone="success">✓ Will Fit</Badge>
                        ) : (
                            <Badge tone="critical">⚠ Too Large</Badge>
                        )}
                    </InlineStack>

                    <Text variant="bodySm" tone="subdued">
                        {config.labels_per_row} × {config.labels_per_column} ={" "}
                        {totalLabelsPerPage} labels/page
                    </Text>

                    {!willFit && (
                        <Text variant="bodySm" tone="critical">
                            Maximum that will fit: {maxCols} × {maxRows}
                        </Text>
                    )}

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: `repeat(${Math.min(
                                config.labels_per_row,
                                6
                            )}, 1fr)`,
                            gap: "2px",
                            marginTop: "8px",
                        }}
                    >
                        {Array.from({
                            length: Math.min(totalLabelsPerPage, 24),
                        }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    aspectRatio: `${config.label_width}/${config.label_height}`,
                                    border: "1px solid currentColor",
                                    borderRadius: "2px",
                                    opacity: willFit ? 1 : 0.5,
                                    minHeight: "8px",
                                }}
                            />
                        ))}
                    </div>
                </BlockStack>
            </Box>
        );
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
                }
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
                `/barcode-printer/load-template/${template.id}`
            );

            if (response.data.success) {
                Object.entries(response.data.settings).forEach(
                    ([key, value]) => {
                        handleChange(key, value);
                    }
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
                }
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
                `/barcode-printer/delete-template/${selectedTemplate.id}`
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
                `/barcode-printer/set-default-template/${templateId}`
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

                        <Select
                            label="Select Your Printer Model"
                            placeholder="Choose a printer..."
                            value=""
                            onChange={(presetId) => loadPrinterPreset(presetId)}
                            options={[
                                {
                                    label: "--- Thermal Printers ---",
                                    value: "",
                                    disabled: true,
                                },
                                ...printerPresets
                                    .filter((p) => p.type === "thermal")
                                    .map((p) => ({
                                        label: `  ${p.name}`,
                                        value: p.id.toString(),
                                    })),
                                {
                                    label: "--- Sheet Label Printers ---",
                                    value: "",
                                    disabled: true,
                                },
                                ...printerPresets
                                    .filter((p) => p.type === "laser")
                                    .map((p) => ({
                                        label: `  ${p.name}`,
                                        value: p.id.toString(),
                                    })),
                                {
                                    label: "--- Custom ---",
                                    value: "",
                                    disabled: true,
                                },
                                { label: "  Custom Setup", value: "custom" },
                            ]}
                        />
                    </BlockStack>
                </Box>
            </Card>

            {/* TEMPLATE MANAGEMENT */}
            <Card>
                <Box padding="300">
                    <BlockStack gap="300">
                        <InlineStack align="space-between" blockAlign="center">
                            <SectionHeader
                                title="📋 Templates"
                                section="templates"
                            />
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
                                                                            template.id
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
                                                                        template
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
                                                                        template
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
                                                            template
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

            {/* PAPER SETUP */}
            <Card>
                <Box padding="400">
                    <BlockStack gap="400">
                        <SectionHeader title="📄 Paper Setup" section="paper" />

                        <Collapsible
                            open={expandedSections.paper}
                            id="paper-section"
                        >
                            <BlockStack gap="400">
                                <FormLayout>
                                    <Select
                                        label="Paper Size"
                                        value={config.paper_size}
                                        onChange={(v) => {
                                            handleChange("paper_size", v);
                                            const sizes = {
                                                a4: { width: 210, height: 297 },
                                                letter: {
                                                    width: 215.9,
                                                    height: 279.4,
                                                },
                                                "4x6": {
                                                    width: 101.6,
                                                    height: 152.4,
                                                },
                                                "3x5": {
                                                    width: 76.2,
                                                    height: 127,
                                                },
                                                "2x3": {
                                                    width: 50.8,
                                                    height: 76.2,
                                                },
                                            };
                                            if (sizes[v]) {
                                                handleChange(
                                                    "paper_width",
                                                    sizes[v].width
                                                );
                                                handleChange(
                                                    "paper_height",
                                                    sizes[v].height
                                                );
                                            }
                                        }}
                                        options={[
                                            {
                                                label: "A4 (210 × 297mm)",
                                                value: "a4",
                                            },
                                            {
                                                label: 'Letter (8.5 × 11")',
                                                value: "letter",
                                            },
                                            {
                                                label: "4×6 Shipping Label",
                                                value: "4x6",
                                            },
                                            {
                                                label: "3×5 Index Card",
                                                value: "3x5",
                                            },
                                            {
                                                label: "2×3 Label",
                                                value: "2x3",
                                            },
                                            {
                                                label: "Custom",
                                                value: "custom",
                                            },
                                        ]}
                                    />

                                    <FormLayout.Group>
                                        <TextField
                                            label="Width (mm)"
                                            type="number"
                                            value={String(config.paper_width)}
                                            onChange={(v) =>
                                                handleChange("paper_width", +v)
                                            }
                                            autoComplete="off"
                                        />
                                        <TextField
                                            label="Height (mm)"
                                            type="number"
                                            value={String(config.paper_height)}
                                            onChange={(v) =>
                                                handleChange("paper_height", +v)
                                            }
                                            autoComplete="off"
                                        />
                                    </FormLayout.Group>

                                    <Select
                                        label="Orientation"
                                        value={config.paper_orientation}
                                        onChange={(v) =>
                                            handleChange("paper_orientation", v)
                                        }
                                        options={[
                                            {
                                                label: "Portrait ⬍",
                                                value: "portrait",
                                            },
                                            {
                                                label: "Landscape ⬌",
                                                value: "landscape",
                                            },
                                        ]}
                                    />

                                    <Divider />

                                    <Text variant="headingSm">
                                        Page Margins (mm)
                                    </Text>
                                    <FormLayout.Group condensed>
                                        <TextField
                                            label="Top"
                                            type="number"
                                            value={String(config.margin_top)}
                                            onChange={(v) =>
                                                handleChange("margin_top", +v)
                                            }
                                            autoComplete="off"
                                        />
                                        <TextField
                                            label="Bottom"
                                            type="number"
                                            value={String(config.margin_bottom)}
                                            onChange={(v) =>
                                                handleChange(
                                                    "margin_bottom",
                                                    +v
                                                )
                                            }
                                            autoComplete="off"
                                        />
                                    </FormLayout.Group>
                                    <FormLayout.Group condensed>
                                        <TextField
                                            label="Left"
                                            type="number"
                                            value={String(config.margin_left)}
                                            onChange={(v) =>
                                                handleChange("margin_left", +v)
                                            }
                                            autoComplete="off"
                                        />
                                        <TextField
                                            label="Right"
                                            type="number"
                                            value={String(config.margin_right)}
                                            onChange={(v) =>
                                                handleChange("margin_right", +v)
                                            }
                                            autoComplete="off"
                                        />
                                    </FormLayout.Group>
                                </FormLayout>
                            </BlockStack>
                        </Collapsible>
                    </BlockStack>
                </Box>
            </Card>

            {/* LABEL LAYOUT */}
            <Card>
                <Box padding="400">
                    <BlockStack gap="400">
                        <SectionHeader
                            title="📐 Label Layout"
                            section="label"
                        />

                        <Collapsible
                            open={expandedSections.label}
                            id="label-section"
                        >
                            <BlockStack gap="400">
                                <FormLayout>
                                    <TextField
                                        label="Label Name"
                                        value={config.label_name}
                                        onChange={(v) =>
                                            handleChange("label_name", v)
                                        }
                                        autoComplete="off"
                                        helpText="For your reference"
                                    />

                                    <FormLayout.Group>
                                        <TextField
                                            label="Label Width (mm)"
                                            type="number"
                                            value={String(config.label_width)}
                                            onChange={(v) =>
                                                handleChange("label_width", +v)
                                            }
                                            autoComplete="off"
                                        />
                                        <TextField
                                            label="Label Height (mm)"
                                            type="number"
                                            value={String(config.label_height)}
                                            onChange={(v) =>
                                                handleChange("label_height", +v)
                                            }
                                            autoComplete="off"
                                        />
                                    </FormLayout.Group>

                                    <FormLayout.Group>
                                        <TextField
                                            label="Labels per Row"
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={String(
                                                config.labels_per_row
                                            )}
                                            onChange={(v) =>
                                                handleChange(
                                                    "labels_per_row",
                                                    +v
                                                )
                                            }
                                            autoComplete="off"
                                        />
                                        <TextField
                                            label="Labels per Column"
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={String(
                                                config.labels_per_column
                                            )}
                                            onChange={(v) =>
                                                handleChange(
                                                    "labels_per_column",
                                                    +v
                                                )
                                            }
                                            autoComplete="off"
                                        />
                                    </FormLayout.Group>

                                    <FormLayout.Group>
                                        <TextField
                                            label="Horizontal Gap (mm)"
                                            type="number"
                                            value={String(
                                                config.label_spacing_horizontal
                                            )}
                                            onChange={(v) =>
                                                handleChange(
                                                    "label_spacing_horizontal",
                                                    +v
                                                )
                                            }
                                            autoComplete="off"
                                        />
                                        <TextField
                                            label="Vertical Gap (mm)"
                                            type="number"
                                            value={String(
                                                config.label_spacing_vertical
                                            )}
                                            onChange={(v) =>
                                                handleChange(
                                                    "label_spacing_vertical",
                                                    +v
                                                )
                                            }
                                            autoComplete="off"
                                        />
                                    </FormLayout.Group>

                                    <LabelGridCalculator config={config} />

                                    <Button
                                        fullWidth
                                        size="slim"
                                        onClick={autoSizeLabelContent}
                                    >
                                        🎯 Auto-Size Content
                                    </Button>
                                </FormLayout>
                            </BlockStack>
                        </Collapsible>
                    </BlockStack>
                </Box>
            </Card>

            {/* BARCODE SETTINGS */}
            <Card>
                <Box padding="400">
                    <BlockStack gap="400">
                        <SectionHeader
                            title="📊 Barcode Settings"
                            section="barcode"
                        />

                        <Collapsible
                            open={expandedSections.barcode}
                            id="barcode-section"
                        >
                            <BlockStack gap="400">
                                <FormLayout>
                                    <Select
                                        label="Barcode Format"
                                        value={config.barcode_type}
                                        onChange={(v) =>
                                            handleChange("barcode_type", v)
                                        }
                                        options={[
                                            {
                                                label: "CODE 128 (Recommended)",
                                                value: "code128",
                                            },
                                            { label: "EAN-13", value: "ean13" },
                                            { label: "EAN-8", value: "ean8" },
                                            { label: "UPC-A", value: "upca" },
                                            {
                                                label: "CODE 39",
                                                value: "code39",
                                            },
                                            { label: "QR Code", value: "qr" },
                                            {
                                                label: "Data Matrix",
                                                value: "datamatrix",
                                            },
                                        ]}
                                    />

                                    {/* QR DATA SOURCE - NEW FEATURE */}
                                    {(config.barcode_type === "qr" ||
                                        config.barcode_type ===
                                            "datamatrix") && (
                                        <>
                                            <Select
                                                label="QR Code Data Source"
                                                value={
                                                    config.qr_data_source ||
                                                    "barcode"
                                                }
                                                onChange={(v) =>
                                                    handleChange(
                                                        "qr_data_source",
                                                        v
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
                                                        label: "Variant ID",
                                                        value: "variant_id",
                                                    },
                                                    {
                                                        label: "Product Shopify URL",
                                                        value: "product_url",
                                                    },
                                                    {
                                                        label: "Custom Format",
                                                        value: "custom",
                                                    },
                                                ]}
                                                helpText="Choose what data the QR code should contain"
                                            />

                                            {config.qr_data_source ===
                                                "custom" && (
                                                <TextField
                                                    label="Custom QR Format"
                                                    value={
                                                        config.qr_custom_format ||
                                                        ""
                                                    }
                                                    onChange={(v) =>
                                                        handleChange(
                                                            "qr_custom_format",
                                                            v
                                                        )
                                                    }
                                                    multiline={2}
                                                    placeholder="e.g., SKU:{sku}|PRICE:{price}"
                                                    helpText="Use {sku}, {barcode}, {price}, {title}, {variant_id}"
                                                    autoComplete="off"
                                                />
                                            )}
                                        </>
                                    )}

                                    <FormLayout.Group>
                                        <TextField
                                            label="Barcode Width (mm)"
                                            type="number"
                                            value={String(config.barcode_width)}
                                            onChange={(v) =>
                                                handleChange(
                                                    "barcode_width",
                                                    +v
                                                )
                                            }
                                            autoComplete="off"
                                        />
                                        <TextField
                                            label="Barcode Height (mm)"
                                            type="number"
                                            value={String(
                                                config.barcode_height
                                            )}
                                            onChange={(v) =>
                                                handleChange(
                                                    "barcode_height",
                                                    +v
                                                )
                                            }
                                            autoComplete="off"
                                        />
                                    </FormLayout.Group>

                                    <Select
                                        label="Barcode Position"
                                        value={config.barcode_position}
                                        onChange={(v) =>
                                            handleChange("barcode_position", v)
                                        }
                                        options={[
                                            { label: "Top", value: "top" },
                                            {
                                                label: "Center",
                                                value: "center",
                                            },
                                            {
                                                label: "Bottom",
                                                value: "bottom",
                                            },
                                        ]}
                                    />

                                    <Checkbox
                                        label="Show barcode value below"
                                        checked={config.show_barcode_value}
                                        onChange={(v) =>
                                            handleChange(
                                                "show_barcode_value",
                                                v
                                            )
                                        }
                                    />
                                </FormLayout>
                            </BlockStack>
                        </Collapsible>
                    </BlockStack>
                </Box>
            </Card>

            {/* ATTRIBUTES TO SHOW */}
            <Card>
                <Box padding="400">
                    <BlockStack gap="400">
                        <SectionHeader
                            title="✓ Attributes to Show"
                            section="attributes"
                        />

                        <Collapsible
                            open={expandedSections.attributes}
                            id="attributes-section"
                        >
                            <BlockStack gap="300">
                                <Checkbox
                                    label="Product Title"
                                    checked={config.show_title}
                                    onChange={(v) =>
                                        handleChange("show_title", v)
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
                                        handleChange("show_price", v)
                                    }
                                />
                                <Checkbox
                                    label="Variant Options"
                                    checked={config.show_variant}
                                    onChange={(v) =>
                                        handleChange("show_variant", v)
                                    }
                                />
                                <Checkbox
                                    label="Vendor"
                                    checked={config.show_vendor}
                                    onChange={(v) =>
                                        handleChange("show_vendor", v)
                                    }
                                />
                                <Checkbox
                                    label="Product Type"
                                    checked={config.show_product_type}
                                    onChange={(v) =>
                                        handleChange("show_product_type", v)
                                    }
                                />
                            </BlockStack>
                        </Collapsible>
                    </BlockStack>
                </Box>
            </Card>

            {/* TYPOGRAPHY */}
            <Card>
                <Box padding="400">
                    <BlockStack gap="400">
                        <SectionHeader
                            title="Aa Typography"
                            section="typography"
                        />

                        <Collapsible
                            open={expandedSections.typography}
                            id="typography-section"
                        >
                            <BlockStack gap="400">
                                <FormLayout>
                                    <Select
                                        label="Font Family"
                                        value={config.font_family}
                                        onChange={(v) =>
                                            handleChange("font_family", v)
                                        }
                                        options={[
                                            { label: "Arial", value: "Arial" },
                                            {
                                                label: "Helvetica",
                                                value: "Helvetica",
                                            },
                                            {
                                                label: "Times New Roman",
                                                value: "Times",
                                            },
                                            {
                                                label: "Courier",
                                                value: "Courier",
                                            },
                                        ]}
                                    />

                                    <FormLayout.Group>
                                        <TextField
                                            label="Base Font Size (pt)"
                                            type="number"
                                            value={String(config.font_size)}
                                            onChange={(v) =>
                                                handleChange("font_size", +v)
                                            }
                                            autoComplete="off"
                                        />
                                        <TextField
                                            label="Title Size (pt)"
                                            type="number"
                                            value={String(
                                                config.title_font_size
                                            )}
                                            onChange={(v) =>
                                                handleChange(
                                                    "title_font_size",
                                                    +v
                                                )
                                            }
                                            autoComplete="off"
                                        />
                                    </FormLayout.Group>

                                    <TextField
                                        label="Text Color"
                                        type="color"
                                        value={config.font_color}
                                        onChange={(v) =>
                                            handleChange("font_color", v)
                                        }
                                    />

                                    <Checkbox
                                        label="Bold product title"
                                        checked={config.title_bold}
                                        onChange={(v) =>
                                            handleChange("title_bold", v)
                                        }
                                    />
                                </FormLayout>
                            </BlockStack>
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
                                    Math.max(1, +v)
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
