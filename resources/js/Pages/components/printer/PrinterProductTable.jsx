// resources/js/Pages/BarcodePrinter/components/printer/PrinterProductTable.jsx
import React, { useState } from "react";
import {
    Card,
    Text,
    BlockStack,
    InlineStack,
    Box,
    Button,
    Badge,
    EmptyState,
    Spinner,
    Divider,
    Checkbox,
    Thumbnail,
    ButtonGroup,
    Filters,
} from "@shopify/polaris";
import { PrintIcon } from "@shopify/polaris-icons";

export default function PrinterProductTable({
    products,
    loading,
    selectedVariants,
    setSelectedVariants,
    printing,
    generatePDF,
    config,
    handleChange,
}) {
    const [showPreview, setShowPreview] = useState(true);

    const toggleVariant = (id) => {
        setSelectedVariants((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        const allIds = products.flatMap(
            (p) => p.variants?.map((v) => v.id) || []
        );
        setSelectedVariants(new Set(allIds));
    };

    const clearAll = () => {
        setSelectedVariants(new Set());
    };

    const totalLabels = selectedVariants.size * config.quantity_per_variant;

    return (
        <BlockStack gap="400">
            {/* LIVE PREVIEW CARD */}
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
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                    }}
                                >
                                    {/* Top Section - Product Info */}
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

                                        {config.show_product_type && (
                                            <div
                                                style={{
                                                    fontSize: `${
                                                        config.font_size - 1
                                                    }px`,
                                                    opacity: 0.7,
                                                    marginBottom: "2px",
                                                }}
                                            >
                                                Type: T-Shirt
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

                                    {/* Middle/Bottom Section - Barcode */}
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent:
                                                config.barcode_position ===
                                                "top"
                                                    ? "flex-start"
                                                    : config.barcode_position ===
                                                      "bottom"
                                                    ? "flex-end"
                                                    : "center",
                                            marginTop:
                                                config.barcode_position ===
                                                "top"
                                                    ? "8px"
                                                    : "0",
                                            marginBottom:
                                                config.barcode_position ===
                                                "bottom"
                                                    ? "8px"
                                                    : "0",
                                        }}
                                    >
                                        {config.barcode_type !== "qr" &&
                                        config.barcode_type !== "datamatrix" ? (
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
                                                            marginTop: "3px",
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
                                        ) : (
                                            <div
                                                style={{
                                                    width: `${Math.min(
                                                        config.barcode_width,
                                                        config.barcode_height
                                                    )}mm`,
                                                    height: `${Math.min(
                                                        config.barcode_width,
                                                        config.barcode_height
                                                    )}mm`,
                                                    background:
                                                        config.barcode_type ===
                                                        "qr"
                                                            ? "linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%)"
                                                            : "#000",
                                                    backgroundSize:
                                                        config.barcode_type ===
                                                        "qr"
                                                            ? "4px 4px"
                                                            : "auto",
                                                    backgroundPosition:
                                                        config.barcode_type ===
                                                        "qr"
                                                            ? "0 0, 2px 2px"
                                                            : "center",
                                                    borderRadius: "2px",
                                                    border: "1px solid #000",
                                                }}
                                            ></div>
                                        )}
                                    </div>
                                </div>
                            </Box>

                            <Text
                                variant="bodySm"
                                tone="subdued"
                                alignment="center"
                            >
                                This is how your labels will look. Actual labels
                                will include real product data and scannable
                                barcodes.
                            </Text>

                            {/* Preview Info */}
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
                                        <Text variant="bodySm" tone="subdued">
                                            Size: {config.label_width}×
                                            {config.label_height}mm
                                        </Text>
                                        <Text variant="bodySm" tone="subdued">
                                            Barcode:{" "}
                                            {config.barcode_type.toUpperCase()}
                                        </Text>
                                        <Text variant="bodySm" tone="subdued">
                                            Labels/Page: {config.labels_per_row}
                                            ×{config.labels_per_column}
                                        </Text>
                                    </InlineStack>
                                </BlockStack>
                            </Box>
                        </BlockStack>
                    </Box>
                </Card>
            )}

            {/* PRODUCTS TABLE */}
            <Card>
                <Box padding="400">
                    <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="center">
                            <BlockStack gap="100">
                                <Text variant="headingMd" as="h2">
                                    Select Products & Variants
                                </Text>
                                <Text variant="bodySm" tone="subdued">
                                    {selectedVariants.size} variant
                                    {selectedVariants.size !== 1
                                        ? "s"
                                        : ""}{" "}
                                    selected • {totalLabels} total label
                                    {totalLabels !== 1 ? "s" : ""}
                                </Text>
                            </BlockStack>

                            <InlineStack gap="200">
                                <ButtonGroup>
                                    {!showPreview && (
                                        <Button
                                            onClick={() => setShowPreview(true)}
                                            size="slim"
                                        >
                                            Show Preview
                                        </Button>
                                    )}
                                    <Button onClick={selectAll} size="slim">
                                        Select All
                                    </Button>
                                    <Button
                                        onClick={clearAll}
                                        size="slim"
                                        disabled={selectedVariants.size === 0}
                                    >
                                        Clear
                                    </Button>
                                </ButtonGroup>
                            </InlineStack>
                        </InlineStack>

                        <Divider />

                        {/* FILTERS */}
                        <Filters
                            queryValue={config.search}
                            onQueryChange={(v) => handleChange("search", v)}
                            onQueryClear={() => handleChange("search", "")}
                            queryPlaceholder="Search products, SKU, barcode..."
                            filters={[]}
                            appliedFilters={[]}
                            onClearAll={() => {
                                handleChange("search", "");
                                handleChange("vendor", "");
                                handleChange("type", "");
                            }}
                        />
                    </BlockStack>
                </Box>

                {loading ? (
                    <Box padding="800">
                        <InlineStack align="center" gap="300">
                            <Spinner size="large" />
                            <Text variant="bodyMd" tone="subdued">
                                Loading products...
                            </Text>
                        </InlineStack>
                    </Box>
                ) : products.length === 0 ? (
                    <Box padding="800">
                        <EmptyState
                            heading="No products found"
                            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        >
                            <Text tone="subdued">
                                {config.search
                                    ? "Try adjusting your search filters"
                                    : "Add products to your store to generate labels"}
                            </Text>
                        </EmptyState>
                    </Box>
                ) : (
                    <Box>
                        {products.map((product) => (
                            <Box
                                key={product.id}
                                borderBlockStartWidth="025"
                                borderColor="border"
                                padding="400"
                            >
                                <BlockStack gap="300">
                                    <Text
                                        variant="headingSm"
                                        as="h3"
                                        fontWeight="semibold"
                                    >
                                        {product.title}
                                    </Text>

                                    <BlockStack gap="200">
                                        {product.variants &&
                                        product.variants.length > 0 ? (
                                            product.variants.map((variant) => (
                                                <Box
                                                    key={variant.id}
                                                    padding="300"
                                                    background={
                                                        selectedVariants.has(
                                                            variant.id
                                                        )
                                                            ? "bg-surface-selected"
                                                            : "bg-surface"
                                                    }
                                                    borderRadius="200"
                                                    borderWidth="025"
                                                    borderColor={
                                                        selectedVariants.has(
                                                            variant.id
                                                        )
                                                            ? "border-brand"
                                                            : "border"
                                                    }
                                                >
                                                    <label
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: "12px",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        <Checkbox
                                                            checked={selectedVariants.has(
                                                                variant.id
                                                            )}
                                                            onChange={() =>
                                                                toggleVariant(
                                                                    variant.id
                                                                )
                                                            }
                                                        />

                                                        <Thumbnail
                                                            source={
                                                                variant.image ||
                                                                ""
                                                            }
                                                            size="small"
                                                            alt={
                                                                variant.title ||
                                                                "Product"
                                                            }
                                                        />

                                                        <InlineStack
                                                            gap="300"
                                                            blockAlign="center"
                                                            align="space-between"
                                                            style={{ flex: 1 }}
                                                        >
                                                            <BlockStack gap="100">
                                                                <Text variant="bodyMd">
                                                                    {variant.title ||
                                                                        "Default Variant"}
                                                                </Text>
                                                                {variant.sku && (
                                                                    <Text
                                                                        variant="bodySm"
                                                                        tone="subdued"
                                                                    >
                                                                        SKU:{" "}
                                                                        {
                                                                            variant.sku
                                                                        }
                                                                    </Text>
                                                                )}
                                                            </BlockStack>

                                                            <InlineStack gap="200">
                                                                {variant.price && (
                                                                    <Badge>
                                                                        $
                                                                        {
                                                                            variant.price
                                                                        }
                                                                    </Badge>
                                                                )}
                                                                {variant.barcode ? (
                                                                    <Badge tone="success">
                                                                        {
                                                                            variant.barcode
                                                                        }
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge tone="warning">
                                                                        No
                                                                        Barcode
                                                                    </Badge>
                                                                )}
                                                            </InlineStack>
                                                        </InlineStack>
                                                    </label>
                                                </Box>
                                            ))
                                        ) : (
                                            <Box padding="300">
                                                <Text
                                                    tone="subdued"
                                                    variant="bodySm"
                                                >
                                                    No variants available for
                                                    this product
                                                </Text>
                                            </Box>
                                        )}
                                    </BlockStack>
                                </BlockStack>
                            </Box>
                        ))}
                    </Box>
                )}

                {/* PRINT BUTTONS */}
                {!loading && products.length > 0 && (
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
                                    <Text tone="text-inverse" variant="bodySm">
                                        ({selectedVariants.size} variants ×{" "}
                                        {config.quantity_per_variant})
                                    </Text>
                                </InlineStack>

                                <InlineStack gap="200">
                                    <Button
                                        onClick={() => generatePDF("all")}
                                        disabled={printing}
                                    >
                                        Print All (
                                        {
                                            products.flatMap(
                                                (p) => p.variants || []
                                            ).length
                                        }
                                        )
                                    </Button>
                                    <Button
                                        variant="primary"
                                        icon={PrintIcon}
                                        onClick={() => generatePDF("selected")}
                                        loading={printing}
                                        disabled={selectedVariants.size === 0}
                                    >
                                        Print Selected ({selectedVariants.size})
                                    </Button>
                                </InlineStack>
                            </InlineStack>
                        </Box>
                    </>
                )}
            </Card>
        </BlockStack>
    );
}
