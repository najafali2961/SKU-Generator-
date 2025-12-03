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
} from "@shopify/polaris";
import { ArrowRightIcon, PrintIcon } from "@shopify/polaris-icons";

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
}) {
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [showPreview, setShowPreview] = useState(true);

    const tabs = [
        { id: "all", content: `All Variants (${total})` },
        { id: "with_barcode", content: `With Barcode (${stats.with_barcode})` },
        { id: "missing", content: `Missing Barcode (${stats.missing})` },
    ];

    const handleTabChange = (selectedTabIndex) => {
        const newTab = tabs[selectedTabIndex].id;
        setActiveTab(newTab);
        setPage(1);
        setSelected(new Set());
    };

    const handleClearAll = () => {
        setQueryValue("");
        setSelectedCollectionIds([]);
        setSelectedVendors([]);
        setSelectedTypes([]);
    };

    const appliedFilters = [];
    if (selectedCollectionIds.length > 0) {
        const names = selectedCollectionIds
            .map(
                (id) => initialCollections.find((c) => c.id === id)?.title || id
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
    ];

    const toggleRowSelection = (itemId) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(itemId) ? next.delete(itemId) : next.add(itemId);
            return next;
        });
    };

    const totalLabels = selected.size * config.quantity_per_variant;

    // Realistic QR Code Preview Component (used in both live preview and table)
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
                        )
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
                        )
                )}
            </svg>
        );
    };

    // Generate barcode preview for table rows and modal
    const generateBarcodePreview = (variant) => {
        const barcode = variant.barcode || variant.sku || "000000000000";
        const isQRType =
            config.barcode_type === "qr" ||
            config.barcode_type === "datamatrix";
        const qrSize =
            Math.min(config.barcode_width, config.barcode_height) * 3.78;

        return (
            <div
                style={{
                    width: `${config.label_width}mm`,
                    height: `${config.label_height}mm`,
                    border: "1px solid #e1e3e5",
                    padding: "8px",
                    fontSize: `${config.font_size}px`,
                    fontFamily: config.font_family,
                    color: config.font_color,
                    background: "white",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    transform: "scale(0.7)",
                    transformOrigin: "left center",
                }}
            >
                <div>
                    {config.show_title && (
                        <div
                            style={{
                                fontWeight: config.title_bold
                                    ? "bold"
                                    : "normal",
                                fontSize: `${config.title_font_size}px`,
                                marginBottom: "2px",
                                lineHeight: "1.2",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {variant.product_title}
                        </div>
                    )}

                    {config.show_variant &&
                        variant.title !== "Default Title" && (
                            <div
                                style={{
                                    fontSize: `${config.font_size - 1}px`,
                                    opacity: 0.8,
                                }}
                            >
                                {variant.title}
                            </div>
                        )}

                    {config.show_vendor && variant.vendor && (
                        <div
                            style={{
                                fontSize: `${config.font_size - 1}px`,
                                opacity: 0.7,
                            }}
                        >
                            {variant.vendor}
                        </div>
                    )}

                    {config.show_sku && variant.sku && (
                        <div
                            style={{
                                fontSize: `${config.font_size - 1}px`,
                                fontFamily: "monospace",
                            }}
                        >
                            SKU: {variant.sku}
                        </div>
                    )}

                    {config.show_price && (
                        <div
                            style={{
                                fontWeight: "bold",
                                fontSize: `${config.title_font_size}px`,
                            }}
                        >
                            ${variant.price}
                        </div>
                    )}
                </div>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        marginTop: "4px",
                    }}
                >
                    {isQRType ? (
                        <>
                            <QRCodePreview size={qrSize} value={barcode} />
                            {config.show_barcode_value && (
                                <div
                                    style={{
                                        fontFamily: "monospace",
                                        fontSize: `${config.font_size - 2}px`,
                                        marginTop: "2px",
                                        letterSpacing: "0.5px",
                                        textAlign: "center",
                                    }}
                                >
                                    {barcode.substring(0, 20)}
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
                                        "repeating-linear-gradient(90deg, #000 0, #000 1px, white 1px, white 2px)",
                                    borderRadius: "1px",
                                }}
                            ></div>
                            {config.show_barcode_value && (
                                <div
                                    style={{
                                        fontFamily: "monospace",
                                        fontSize: `${config.font_size - 2}px`,
                                        marginTop: "2px",
                                        letterSpacing: "0.5px",
                                    }}
                                >
                                    {barcode.substring(0, 13)}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

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
            variants.map((variant) => (
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

                    <IndexTable.Cell>
                        {generateBarcodePreview(variant)}
                    </IndexTable.Cell>
                </IndexTable.Row>
            ))
        );

    const totalPages = Math.ceil(total / 8);

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

                                <Box
                                    padding="600"
                                    background="bg-surface-secondary"
                                    borderRadius="300"
                                >
                                    <div
                                        style={{
                                            width: `${config.label_width}mm`,
                                            height: `${config.label_height}mm`,
                                            border: "2px dashed #8c9196",
                                            padding: "8px",
                                            fontSize: `${config.font_size}px`,
                                            fontFamily: config.font_family,
                                            color: config.font_color,
                                            background: "white",
                                            margin: "0 auto",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between",
                                            boxShadow:
                                                "0 2px 8px rgba(0,0,0,0.1)",
                                        }}
                                    >
                                        <div>
                                            {config.show_title && (
                                                <div
                                                    style={{
                                                        fontWeight:
                                                            config.title_bold
                                                                ? "bold"
                                                                : "normal",
                                                        fontSize: `${config.title_font_size}px`,
                                                        marginBottom: "4px",
                                                        lineHeight: "1.2",
                                                    }}
                                                >
                                                    Sample Product Name
                                                </div>
                                            )}

                                            {config.show_variant && (
                                                <div
                                                    style={{
                                                        fontSize: `${
                                                            config.font_size - 1
                                                        }px`,
                                                        opacity: 0.8,
                                                        marginBottom: "2px",
                                                    }}
                                                >
                                                    Size: M / Color: Blue
                                                </div>
                                            )}

                                            {config.show_vendor && (
                                                <div
                                                    style={{
                                                        fontSize: `${
                                                            config.font_size - 1
                                                        }px`,
                                                        opacity: 0.7,
                                                        marginBottom: "2px",
                                                    }}
                                                >
                                                    Vendor: Brand Co.
                                                </div>
                                            )}

                                            {config.show_sku && (
                                                <div
                                                    style={{
                                                        fontSize: `${
                                                            config.font_size - 1
                                                        }px`,
                                                        opacity: 0.7,
                                                        marginBottom: "2px",
                                                        fontFamily: "monospace",
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

                                        {/* NEW BARCODE PREVIEW LOGIC - YOUR REQUEST */}
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                            }}
                                        >
                                            {config.barcode_type === "qr" ||
                                            config.barcode_type ===
                                                "datamatrix" ? (
                                                <>
                                                    <QRCodePreview
                                                        size={
                                                            Math.min(
                                                                config.barcode_width,
                                                                config.barcode_height
                                                            ) * 3.78
                                                        }
                                                        value="SAMPLE-QR-CODE"
                                                    />
                                                    {config.show_barcode_value && (
                                                        <div
                                                            style={{
                                                                fontFamily:
                                                                    "monospace",
                                                                fontSize: `${
                                                                    config.font_size -
                                                                    2
                                                                }px`,
                                                                marginTop:
                                                                    "3px",
                                                                letterSpacing:
                                                                    "1px",
                                                            }}
                                                        >
                                                            {config.barcode_type ===
                                                            "qr"
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
                                                                fontFamily:
                                                                    "monospace",
                                                                fontSize: `${
                                                                    config.font_size -
                                                                    2
                                                                }px`,
                                                                marginTop:
                                                                    "3px",
                                                                letterSpacing:
                                                                    "1px",
                                                            }}
                                                        >
                                                            {config.barcode_type ===
                                                            "ean13"
                                                                ? "1234567890123"
                                                                : config.barcode_type ===
                                                                  "upca"
                                                                ? "123456789012"
                                                                : "ABC123XYZ"}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </Box>

                                <Text
                                    variant="bodySm"
                                    tone="subdued"
                                    alignment="center"
                                >
                                    This is how your labels will look. Each row
                                    below shows a live preview for that specific
                                    variant.
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
                            queryPlaceholder="Search products, SKU, barcode..."
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
                        onSelectionChange={(selectionType, toggle) => {
                            if (selectionType === "all") {
                                const ids = variants.map((v) => v.id);
                                setSelected(toggle ? new Set(ids) : new Set());
                            }
                        }}
                        hasZebraStriping
                        headings={[
                            { title: "" },
                            { title: "Product" },
                            { title: "SKU" },
                            { title: "Barcode" },
                            { title: "Label Preview" },
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
                            <Box padding="400" background="bg-surface-brand">
                                <InlineStack
                                    align="space-between"
                                    blockAlign="center"
                                >
                                    <InlineStack gap="300">
                                        <Text
                                            tone="text-inverse"
                                            fontWeight="semibold"
                                        >
                                            Total: {totalLabels} labels
                                        </Text>
                                        <Text
                                            tone="text-inverse"
                                            variant="bodySm"
                                        >
                                            ({selected.size} variants ×{" "}
                                            {config.quantity_per_variant})
                                        </Text>
                                    </InlineStack>

                                    <InlineStack gap="200">
                                        {!showPreview && (
                                            <Button
                                                onClick={() =>
                                                    setShowPreview(true)
                                                }
                                            >
                                                Show Preview
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() => generatePDF("all")}
                                            disabled={printing}
                                        >
                                            Print All ({total})
                                        </Button>
                                        <Button
                                            variant="primary"
                                            icon={PrintIcon}
                                            onClick={() =>
                                                generatePDF("selected")
                                            }
                                            loading={printing}
                                            disabled={selected.size === 0}
                                        >
                                            Print Selected ({selected.size})
                                        </Button>
                                    </InlineStack>
                                </InlineStack>
                            </Box>
                        </>
                    )}
                </Card>
            </BlockStack>

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

                        <Box padding="500">
                            <BlockStack gap="400">
                                <Box
                                    background="bg-surface-secondary"
                                    padding="400"
                                    borderRadius="300"
                                >
                                    <Text variant="headingMd" fontWeight="bold">
                                        Label Preview
                                    </Text>
                                    <Box paddingBlockStart="400">
                                        {generateBarcodePreview(
                                            selectedVariant
                                        )}
                                    </Box>
                                </Box>
                            </BlockStack>
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
