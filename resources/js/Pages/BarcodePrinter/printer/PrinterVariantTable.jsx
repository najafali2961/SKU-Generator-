// resources/js/Pages/BarcodePrinter/components/printer/PrinterVariantTable.jsx
import React, { useState } from "react";
import {
    Card,
    IndexTable,
    Tabs,
    Filters,
    ChoiceList,
    Text,
    Badge,
    EmptyState,
    Icon,
    InlineStack,
    BlockStack,
    Box,
    Pagination,
    Button,
    Thumbnail,
    ButtonGroup,
    Divider,
    TextField,
    Tag,
} from "@shopify/polaris";
import { ArrowRightIcon, PrintIcon } from "@shopify/polaris-icons";
import ConfirmModal from "../../components/ConfirmModal";
import { analyzeLayout } from "./utils/LayoutOptimizer";

// New Feedback Component
// New Feedback Component - Compact Badge Version
const OptimizationBadge = ({ result }) => {
    const { status, issues } = result;

    if (status === "PERFECT") {
        return (
            <Badge tone="success" progress="complete">
                Layout Optimized
            </Badge>
        );
    }

    if (status === "GOOD") {
        return <Badge tone="info">Valid Layout</Badge>;
    }

    // WARNING or ERROR
    const isError = status === "ERROR";
    const tone = isError ? "critical" : "warning";
    const label = isError ? "Layout Error" : "Optimization Tip";
    const message = issues.length > 0 ? issues[0].message : "";

    return (
        <InlineStack gap="200" blockAlign="center">
            <Badge tone={tone}>{label}</Badge>
            {message && (
                <Text tone={tone} variant="bodySm">
                    {message}
                </Text>
            )}
        </InlineStack>
    );
};

export default function PrinterVariantTable({
    variants,
    total,
    stats,
    loading,
    page,
    setPage,
    activeTab,
    setActiveTab,
    queryValue,
    setQueryValue,
    selected,
    setSelected,
    printing,
    generatePDF,
    config,
    handleChange,
    initialCollections = [],
    selectedCollectionIds,
    setSelectedCollectionIds,
    selectedVendors,
    setSelectedVendors,
    selectedTypes,
    setSelectedTypes,
    selectedTags,
    setSelectedTags,
    disablePrint = false,
}) {
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [showPreview, setShowPreview] = useState(true);
    const [tagsInput, setTagsInput] = useState("");
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmScope, setConfirmScope] = useState(null);
    const [previewTab, setPreviewTab] = useState(0);

    // Run analysis
    const analysis = analyzeLayout(config);

    const LabelRenderer = ({ config, QRCodePreview, isPageItem = false }) => (
        <div
            style={{
                width: `${config.label_width}mm`,
                height: `${config.label_height}mm`,
                border: isPageItem ? "0.5pt solid #ddd" : "2px dashed #8c9196",
                padding: "8px",
                fontSize: `${config.font_size}px`,
                fontFamily: config.font_family,
                color: config.font_color,
                background: "white",
                margin: isPageItem ? 0 : "0 auto",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: isPageItem ? "none" : "0 2px 8px rgba(0,0,0,0.1)",
                overflow: "hidden",
                boxSizing: "border-box", // Ensure padding doesn't affect width
            }}
        >
            <div>
                {config.show_product_title && (
                    <div
                        style={{
                            fontWeight: config.title_bold ? "bold" : "normal",
                            fontSize: `${config.title_font_size}px`,
                            marginBottom: "4px",
                            lineHeight: "1.2",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        Sample Product Name
                    </div>
                )}

                {config.show_variant && (
                    <div
                        style={{
                            fontSize: `${config.font_size - 1}px`,
                            opacity: 0.8,
                            marginBottom: "2px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        Size: M / Color: Blue
                    </div>
                )}

                {config.show_sku && (
                    <div
                        style={{
                            fontSize: `${config.font_size - 1}px`,
                            opacity: 0.7,
                            marginBottom: "2px",
                            fontFamily: "monospace",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        SKU: ABC-123-XYZ
                    </div>
                )}

                {config.show_price && (
                    <div
                        style={{
                            fontWeight: "bold",
                            fontSize: `${config.title_font_size}px`,
                            marginTop: "4px",
                        }}
                    >
                        $99.99
                    </div>
                )}
            </div>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                {config.barcode_type === "qr" ||
                config.barcode_type === "datamatrix" ? (
                    <>
                        <QRCodePreview
                            size={
                                Math.min(
                                    config.barcode_width,
                                    config.barcode_height,
                                ) * 3.78
                            }
                            value="SAMPLE-QR-CODE"
                        />
                        {config.show_barcode_value && (
                            <div
                                style={{
                                    fontFamily: "monospace",
                                    fontSize: `${config.font_size - 2}px`,
                                    marginTop: "3px",
                                    letterSpacing: "1px",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxWidth: "100%",
                                }}
                            >
                                {config.barcode_type === "qr"
                                    ? "QR CODE"
                                    : "DATA MATRIX"}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div
                            style={{
                                width: `${config.barcode_width}mm`,
                                height: `${config.barcode_height}mm`,
                                background:
                                    "repeating-linear-gradient(90deg, #000 0, #000 1.5px, white 1.5px, white 3px)",
                                borderRadius: "1px",
                            }}
                        ></div>
                        {config.show_barcode_value && (
                            <div
                                style={{
                                    fontFamily: "monospace",
                                    fontSize: `${config.font_size - 2}px`,
                                    marginTop: "3px",
                                    letterSpacing: "1px",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxWidth: "100%",
                                }}
                            >
                                {config.barcode_type === "ean13"
                                    ? "1234567890123"
                                    : config.barcode_type === "upca"
                                      ? "123456789012"
                                      : "ABC123XYZ"}
                            </div>
                        )}
                    </>
                )}
            </div>
            {/* FOOTER - Vendor/Type */}
            <div style={{ marginTop: "2px" }}>
                {config.show_vendor && (
                    <div
                        style={{
                            fontSize: `${config.font_size - 1}px`,
                            opacity: 0.7,
                            marginBottom: "1px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        Vendor: Brand Co.
                    </div>
                )}
                {config.show_product_type && (
                    <div
                        style={{
                            fontSize: `${config.font_size - 1}px`,
                            opacity: 0.7,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        Type: T-Shirt
                    </div>
                )}
            </div>
        </div>
    );

    const tabs = [
        { id: "all", content: `All Variants (${stats.all})` },
        { id: "with_barcode", content: `With Barcode (${stats.with_barcode})` },
        { id: "missing", content: `Missing Barcode (${stats.missing})` },
    ];

    const handleTabChange = (selectedTabIndex) => {
        const newTab = tabs[selectedTabIndex].id;
        setActiveTab(newTab);
        setPage(1);
        setSelected(new Set());
    };

    const handleAddTag = () => {
        if (!tagsInput.trim()) return;

        const newTags = tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
            .filter((t) => !selectedTags.includes(t));

        if (newTags.length > 0) {
            setSelectedTags([...selectedTags, ...newTags]);
            setTagsInput("");
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setSelectedTags(selectedTags.filter((tag) => tag !== tagToRemove));
    };

    const handleClearAll = () => {
        setQueryValue("");
        setSelectedCollectionIds([]);
        setSelectedVendors([]);
        setSelectedTypes([]);
        setSelectedTags([]);
    };

    const appliedFilters = [];
    if (selectedCollectionIds.length > 0) {
        const names = selectedCollectionIds
            .map(
                (id) =>
                    initialCollections.find((c) => c.id === id)?.title || id,
            )
            .join(", ");
        appliedFilters.push({
            key: "collections",
            label: `Collection: ${names}`,
            onRemove: () => setSelectedCollectionIds([]),
        });
    }
    if (selectedVendors.length > 0) {
        appliedFilters.push({
            key: "vendor",
            label: `Vendor: ${selectedVendors.join(", ")}`,
            onRemove: () => setSelectedVendors([]),
        });
    }
    if (selectedTypes.length > 0) {
        appliedFilters.push({
            key: "type",
            label: `Product type: ${selectedTypes.join(", ")}`,
            onRemove: () => setSelectedTypes([]),
        });
    }
    if (selectedTags.length > 0) {
        appliedFilters.push({
            key: "tags",
            label: `Tags: ${selectedTags.join(", ")}`,
            onRemove: () => setSelectedTags([]),
        });
    }

    const filters = [
        {
            key: "collections",
            label: "Collection",
            filter: (
                <ChoiceList
                    title="Collections"
                    titleHidden
                    allowMultiple
                    choices={initialCollections.map((c) => ({
                        label: c.title,
                        value: c.id.toString(),
                    }))}
                    selected={selectedCollectionIds.map(String)}
                    onChange={(value) =>
                        setSelectedCollectionIds(value.map(Number))
                    }
                />
            ),
            shortcut: true,
        },
        {
            key: "vendor",
            label: "Vendor",
            filter: (
                <TextField
                    label="Vendor"
                    labelHidden
                    placeholder="Filter by vendor"
                    value={selectedVendors[0] || ""}
                    onChange={(v) =>
                        setSelectedVendors(v.trim() ? [v.trim()] : [])
                    }
                    autoComplete="off"
                />
            ),
        },
        {
            key: "type",
            label: "Product type",
            filter: (
                <TextField
                    label="Product type"
                    labelHidden
                    placeholder="Filter by product type"
                    value={selectedTypes[0] || ""}
                    onChange={(v) =>
                        setSelectedTypes(v.trim() ? [v.trim()] : [])
                    }
                    autoComplete="off"
                />
            ),
        },
        {
            key: "tags",
            label: "Tags",
            filter: (
                <BlockStack gap="300">
                    <TextField
                        labelHidden
                        placeholder="e.g. Summer, Premium, Sale"
                        value={tagsInput}
                        onChange={setTagsInput}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddTag();
                            }
                        }}
                        autoComplete="off"
                        helpText="Separate multiple tags with commas"
                    />
                    <Button
                        onClick={handleAddTag}
                        size="slim"
                        variant="primary"
                    >
                        Add Tag(s)
                    </Button>
                    {selectedTags.length > 0 && (
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "8px",
                                marginTop: "8px",
                            }}
                        >
                            {selectedTags.map((tag) => (
                                <Tag
                                    key={tag}
                                    onRemove={() => handleRemoveTag(tag)}
                                >
                                    {tag}
                                </Tag>
                            ))}
                        </div>
                    )}
                </BlockStack>
            ),
        },
    ];

    const toggleRowSelection = (itemId) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(itemId) ? next.delete(itemId) : next.add(itemId);
            return next;
        });
    };

    const handleSelectVisible = () => {
        const visibleIds = variants.map((v) => v.id);
        setSelected(new Set(visibleIds));
    };

    const handleClearSelection = () => {
        setSelected(new Set());
    };

    const totalLabels = selected.size * config.quantity_per_variant;

    const QRCodePreview = ({ size, value = "SAMPLE-QR-CODE" }) => {
        const moduleSize = 3;
        const modules = Math.floor(size / moduleSize);

        return (
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${modules} ${modules}`}
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    imageRendering: "pixelated",
                }}
            >
                <rect width={modules} height={modules} fill="white" />

                {/* Top-left finder */}
                <rect x="0" y="0" width="7" height="7" fill="black" />
                <rect x="1" y="1" width="5" height="5" fill="white" />
                <rect x="2" y="2" width="3" height="3" fill="black" />

                {/* Top-right finder */}
                <rect x={modules - 7} y="0" width="7" height="7" fill="black" />
                <rect x={modules - 6} y="1" width="5" height="5" fill="white" />
                <rect x={modules - 5} y="2" width="3" height="3" fill="black" />

                {/* Bottom-left finder */}
                <rect x="0" y={modules - 7} width="7" height="7" fill="black" />
                <rect x="1" y={modules - 6} width="5" height="5" fill="white" />
                <rect x="2" y={modules - 5} width="3" height="3" fill="black" />

                {/* Random data bits */}
                {Array.from({
                    length: Math.floor(modules * modules * 0.4),
                }).map((_, i) => {
                    const x = 8 + Math.floor(Math.random() * (modules - 16));
                    const y = 8 + Math.floor(Math.random() * (modules - 16));
                    return (
                        <rect
                            key={i}
                            x={x}
                            y={y}
                            width="1"
                            height="1"
                            fill="black"
                        />
                    );
                })}

                {Array.from({ length: modules - 16 }).map(
                    (_, i) =>
                        i % 2 === 0 && (
                            <rect
                                key={`h-${i}`}
                                x={8 + i}
                                y="6"
                                width="1"
                                height="1"
                                fill="black"
                            />
                        ),
                )}
                {Array.from({ length: modules - 16 }).map(
                    (_, i) =>
                        i % 2 === 0 && (
                            <rect
                                key={`v-${i}`}
                                x="6"
                                y={8 + i}
                                width="1"
                                height="1"
                                fill="black"
                            />
                        ),
                )}
            </svg>
        );
    };

    const ITEMS_PER_PAGE = 8; // Should match server request if possible, or use total/per_page from response
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    // Server side pagination
    const visibleVariants = variants;

    const rowMarkup =
        variants.length === 0 ? (
            <IndexTable.Row key="empty">
                <IndexTable.Cell colSpan={5}>
                    <EmptyState heading="No variants found">
                        <Text tone="subdued">
                            Try adjusting your search or filters
                        </Text>
                    </EmptyState>
                </IndexTable.Cell>
            </IndexTable.Row>
        ) : (
            visibleVariants.map((variant) => (
                <IndexTable.Row
                    key={variant.id}
                    id={variant.id}
                    selected={selected.has(variant.id)}
                    onClick={() => toggleRowSelection(variant.id)}
                >
                    <IndexTable.Cell>
                        <Thumbnail
                            source={variant.image || ""}
                            size="small"
                            alt={variant.title}
                        />
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                        <BlockStack gap="100">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVariant(variant);
                                }}
                                style={{
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    textAlign: "left",
                                    cursor: "pointer",
                                    font: "inherit",
                                    color: "var(--p-color-text-brand)",
                                    fontWeight: 600,
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.textDecoration =
                                        "underline")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.textDecoration =
                                        "none")
                                }
                            >
                                <div
                                    style={{
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        maxWidth: "250px",
                                    }}
                                    title={variant.product_title}
                                >
                                    {variant.product_title}
                                </div>
                            </button>

                            <Text variant="bodySm" tone="subdued">
                                {variant.vendor}{" "}
                                {variant.title !== "Default Title" &&
                                    `• ${variant.title}`}
                            </Text>
                        </BlockStack>
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                        {variant.sku ? (
                            <Badge tone="info">{variant.sku}</Badge>
                        ) : (
                            <Text tone="subdued">—</Text>
                        )}
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                        {variant.barcode ? (
                            <Badge tone="success">{variant.barcode}</Badge>
                        ) : (
                            <Badge tone="warning">Missing</Badge>
                        )}
                    </IndexTable.Cell>
                </IndexTable.Row>
            ))
        );

    // --- TRUST HEADER (Compact) ---
    const PreviewTrustBadge = ({ config }) => {
        const mode =
            config.currentPrinterType ||
            (config.labels_per_row === 1 && config.labels_per_column === 1
                ? "thermal"
                : "sheet");

        // Infer mode from config if not explicit, for better accuracy
        const isThermal =
            config.labels_per_row === 1 && config.labels_per_column === 1;

        if (isThermal) {
            return (
                <Badge tone="info" icon={PrintIcon}>
                    Thermal Label (1/page)
                </Badge>
            );
        } else {
            return (
                <Badge tone="new" icon={PrintIcon}>
                    Sheet Mode (A4/Letter)
                </Badge>
            );
        }
    };

    return (
        <>
            <BlockStack gap="400">
                {showPreview && (
                    <Card>
                        <Box padding="400">
                            <BlockStack gap="400">
                                <InlineStack
                                    align="space-between"
                                    blockAlign="center"
                                >
                                    <Text variant="headingMd" as="h2">
                                        Live Preview
                                    </Text>
                                    <Button
                                        size="slim"
                                        onClick={() => setShowPreview(false)}
                                    >
                                        Hide Preview
                                    </Button>
                                </InlineStack>

                                <InlineStack align="start" gap="200">
                                    <PreviewTrustBadge config={config} />
                                    <OptimizationBadge result={analysis} />
                                </InlineStack>
                                <Tabs
                                    tabs={[
                                        {
                                            id: "single",
                                            content: "Single Label",
                                        },
                                        { id: "page", content: "Page View" },
                                    ]}
                                    selected={previewTab}
                                    onSelect={setPreviewTab}
                                    fitted
                                />

                                <Box
                                    padding="600"
                                    background="bg-surface-secondary"
                                    borderRadius="300"
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "center",
                                            overflow: "auto",
                                            maxHeight: "600px",
                                        }}
                                    >
                                        {previewTab === 0 ? (
                                            // SINGLE LABEL VIEW
                                            <LabelRenderer
                                                config={config}
                                                QRCodePreview={QRCodePreview}
                                            />
                                        ) : (
                                            // PAGE VIEW
                                            <div
                                                style={{
                                                    width: "100%",
                                                    display: "flex",
                                                    justifyContent: "center",
                                                    padding: "20px 0",
                                                }}
                                            >
                                                {(() => {
                                                    const pixelsPerMm = 3.78;
                                                    const paperWidthPx =
                                                        config.paper_width *
                                                        pixelsPerMm;
                                                    // Max width available in the card (approx 700px)
                                                    const maxWidth = 700;
                                                    // Calculate scale to fit, maxing out at 1 (don't scale up small labels)
                                                    const scale =
                                                        paperWidthPx > maxWidth
                                                            ? maxWidth /
                                                              paperWidthPx
                                                            : 1;

                                                    return (
                                                        <div
                                                            style={{
                                                                transform: `scale(${scale})`,
                                                                transformOrigin:
                                                                    "top center",
                                                                // Use a negative margin only if we are significantly scaling down large pages
                                                                // to reduce empty whitespace, but be careful with small pages.
                                                                marginBottom:
                                                                    scale < 0.8
                                                                        ? `-${
                                                                              (1 -
                                                                                  scale) *
                                                                              50
                                                                          }%`
                                                                        : "0px",
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    width: `${config.paper_width}mm`,
                                                                    height: `${config.paper_height}mm`,
                                                                    backgroundColor:
                                                                        "white",
                                                                    paddingTop: `${config.margin_top}mm`,
                                                                    paddingRight: `${config.margin_right}mm`,
                                                                    paddingBottom: `${config.margin_bottom}mm`,
                                                                    paddingLeft: `${config.margin_left}mm`,
                                                                    boxShadow:
                                                                        "0 4px 12px rgba(0,0,0,0.15)",
                                                                    boxSizing:
                                                                        "border-box",
                                                                    display:
                                                                        "flex",
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "grid",
                                                                        gridTemplateColumns: `repeat(${config.labels_per_row}, ${config.label_width}mm)`,
                                                                        gridTemplateRows: `repeat(${config.labels_per_column}, ${config.label_height}mm)`,
                                                                        gap: `${config.label_spacing_vertical}mm ${config.label_spacing_horizontal}mm`,
                                                                        alignContent:
                                                                            "start",
                                                                        justifyContent:
                                                                            "start",
                                                                    }}
                                                                >
                                                                    {Array.from(
                                                                        {
                                                                            length:
                                                                                config.labels_per_row *
                                                                                config.labels_per_column,
                                                                        },
                                                                    ).map(
                                                                        (
                                                                            _,
                                                                            i,
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    i
                                                                                }
                                                                                style={{
                                                                                    width: "100%",
                                                                                    height: "100%",
                                                                                    overflow:
                                                                                        "hidden",
                                                                                }}
                                                                            >
                                                                                <LabelRenderer
                                                                                    config={
                                                                                        config
                                                                                    }
                                                                                    QRCodePreview={
                                                                                        QRCodePreview
                                                                                    }
                                                                                    isPageItem={
                                                                                        true
                                                                                    }
                                                                                />
                                                                            </div>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </Box>

                                <Text
                                    variant="bodySm"
                                    tone="subdued"
                                    alignment="center"
                                >
                                    {previewTab === 0
                                        ? "This is how a single label will look."
                                        : "This is how your full page will print. Ensure margins and gaps are correct."}
                                </Text>

                                <Box
                                    padding="300"
                                    background="bg-surface-info-subdued"
                                    borderRadius="200"
                                >
                                    <BlockStack gap="200">
                                        <Text
                                            variant="bodySm"
                                            fontWeight="semibold"
                                        >
                                            Label Specifications:
                                        </Text>
                                        <InlineStack gap="400" wrap>
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                Size: {config.label_width}×
                                                {config.label_height}mm
                                            </Text>
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                Barcode:{" "}
                                                {config.barcode_type.toUpperCase()}
                                            </Text>
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                Labels/Page:{" "}
                                                {config.labels_per_row}×
                                                {config.labels_per_column}
                                            </Text>
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                Paper: {config.paper_width}×
                                                {config.paper_height}mm
                                            </Text>
                                        </InlineStack>
                                    </BlockStack>
                                </Box>
                            </BlockStack>
                        </Box>
                    </Card>
                )}

                {/* VARIANTS TABLE */}
                <Card>
                    <Box padding="400">
                        <Tabs
                            tabs={tabs}
                            selected={tabs.findIndex((t) => t.id === activeTab)}
                            onSelect={handleTabChange}
                            fitted
                        />
                    </Box>

                    <Box
                        paddingInlineStart="400"
                        paddingInlineEnd="400"
                        paddingBlockEnd="400"
                    >
                        <Filters
                            queryValue={queryValue}
                            onQueryChange={setQueryValue}
                            onQueryClear={() => setQueryValue("")}
                            filters={filters}
                            appliedFilters={appliedFilters}
                            onClearAll={handleClearAll}
                            queryPlaceholder="Search by ID, SKU, barcode, product, vendor, type, tags..."
                        />
                    </Box>

                    <IndexTable
                        resourceName={{
                            singular: "variant",
                            plural: "variants",
                        }}
                        itemCount={total}
                        selectedItemsCount={
                            selected.size === total ? "All" : selected.size
                        }
                        onSelectionChange={(
                            selectionType,
                            toggle,
                            selection,
                        ) => {
                            if (selectionType === "all") {
                                const ids = variants.map((v) => v.id);
                                setSelected(toggle ? new Set(ids) : new Set());
                            } else if (selectionType === "single") {
                                setSelected((prev) => {
                                    const next = new Set(prev);
                                    if (toggle) {
                                        next.add(selection);
                                    } else {
                                        next.delete(selection);
                                    }
                                    return next;
                                });
                            } else if (selectionType === "page") {
                                // Select visible items on current page
                                // Note: variants prop is now the paginated list from server
                                const visibleIds = variants.map((v) => v.id);

                                setSelected((prev) => {
                                    const next = new Set(prev);
                                    const allSelected = visibleIds.every((id) =>
                                        next.has(id),
                                    );
                                    visibleIds.forEach((id) =>
                                        allSelected
                                            ? next.delete(id)
                                            : next.add(id),
                                    );
                                    return next;
                                });
                            }
                        }}
                        hasZebraStriping
                        headings={[
                            { title: "" },
                            { title: "Product" },
                            { title: "SKU" },
                            { title: "Barcode" },
                        ]}
                        bulkActions={[
                            {
                                content: "Select Visible",
                                onAction: handleSelectVisible,
                            },
                            {
                                content: "Clear Selection",
                                onAction: handleClearSelection,
                            },
                        ]}
                        promotedBulkActions={[
                            {
                                content: "Select Visible",
                                onAction: handleSelectVisible,
                            },
                            {
                                content: "Clear Selection",
                                onAction: handleClearSelection,
                            },
                        ]}
                        loading={loading}
                    >
                        {rowMarkup}
                    </IndexTable>

                    {!loading && totalPages > 1 && (
                        <>
                            <Divider />
                            <Box padding="400">
                                <Pagination
                                    hasPrevious={page > 1}
                                    onPrevious={() => setPage((p) => p - 1)}
                                    hasNext={page < totalPages}
                                    onNext={() => setPage((p) => p + 1)}
                                    label={`${page} of ${totalPages}`}
                                />
                            </Box>
                        </>
                    )}

                    {!loading && variants.length > 0 && (
                        <>
                            <Divider />
                            <Box
                                padding="400"
                                background="bg-surface-secondary"
                            >
                                <BlockStack gap="400">
                                    <Button
                                        fullWidth
                                        variant="primary"
                                        size="large"
                                        loading={printing}
                                        icon={PrintIcon}
                                        onClick={() => {
                                            const scope =
                                                selected.size > 0
                                                    ? "selected"
                                                    : "all";
                                            setConfirmScope(scope);
                                            setIsConfirmOpen(true);
                                        }}
                                        disabled={
                                            (selected.size === 0 &&
                                                variants.length === 0) ||
                                            printing ||
                                            disablePrint
                                        }
                                    >
                                        {selected.size > 0
                                            ? `Print Labels for ${selected.size} Selected Items`
                                            : `Print Labels for All ${total} Variants`}
                                    </Button>
                                </BlockStack>
                            </Box>
                        </>
                    )}
                </Card>
            </BlockStack>

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={() => {
                    setIsConfirmOpen(false);
                    if (confirmScope) {
                        generatePDF(confirmScope);
                    }
                }}
                title="Confirm Print Job"
                message={`Are you sure you want to print labels for ${confirmScope === "selected" ? selected.size : total} variants?`}
                confirmText="Print Labels"
            />

            {/* VARIANT DETAILS MODAL */}
            {selectedVariant && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        padding: "16px",
                    }}
                    onClick={() => setSelectedVariant(null)}
                >
                    <Card
                        sectioned
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: "650px",
                            width: "100%",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            borderRadius: "12px",
                        }}
                    >
                        <Box padding="400">
                            <InlineStack
                                align="space-between"
                                blockAlign="center"
                            >
                                <InlineStack gap="400" blockAlign="center">
                                    <Thumbnail
                                        source={selectedVariant.image || ""}
                                        size="large"
                                        alt={selectedVariant.title}
                                    />

                                    <BlockStack gap="200">
                                        <Text
                                            variant="headingLg"
                                            fontWeight="bold"
                                        >
                                            {selectedVariant.product_title}
                                        </Text>
                                        <Text variant="bodyMd" tone="subdued">
                                            {selectedVariant.vendor ||
                                                "No vendor"}
                                        </Text>
                                        <Text
                                            variant="headingLg"
                                            fontWeight="bold"
                                        >
                                            $
                                            {(
                                                Number(selectedVariant.price) ||
                                                0
                                            ).toFixed(2)}
                                        </Text>

                                        <InlineStack
                                            gap="300"
                                            paddingBlockStart="200"
                                        >
                                            {selectedVariant.sku && (
                                                <Badge tone="info">
                                                    SKU: {selectedVariant.sku}
                                                </Badge>
                                            )}
                                            {selectedVariant.barcode ? (
                                                <Badge tone="success">
                                                    {selectedVariant.barcode}
                                                </Badge>
                                            ) : (
                                                <Badge tone="warning">
                                                    No Barcode
                                                </Badge>
                                            )}
                                        </InlineStack>

                                        {selectedVariant.title !==
                                            "Default Title" && (
                                            <InlineStack
                                                gap="200"
                                                paddingBlockStart="200"
                                            >
                                                {selectedVariant.option1 && (
                                                    <Badge tone="attention">
                                                        {
                                                            selectedVariant.option1
                                                        }
                                                    </Badge>
                                                )}
                                                {selectedVariant.option2 && (
                                                    <Badge tone="attention">
                                                        {
                                                            selectedVariant.option2
                                                        }
                                                    </Badge>
                                                )}
                                                {selectedVariant.option3 && (
                                                    <Badge tone="attention">
                                                        {
                                                            selectedVariant.option3
                                                        }
                                                    </Badge>
                                                )}
                                            </InlineStack>
                                        )}
                                    </BlockStack>
                                </InlineStack>
                            </InlineStack>
                        </Box>

                        <Box
                            padding="400"
                            background="bg-surface-secondary"
                            borderBlockStartWidth="1"
                            borderColor="border"
                        >
                            <InlineStack align="end">
                                <Button
                                    onClick={() => setSelectedVariant(null)}
                                >
                                    Close
                                </Button>
                            </InlineStack>
                        </Box>
                    </Card>
                </div>
            )}
        </>
    );
}
