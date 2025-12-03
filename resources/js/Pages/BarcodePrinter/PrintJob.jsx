// resources/js/Pages/BarcodePrinter/PrintJob.jsx
import React, { useState } from "react";
import {
    Page,
    Layout,
    Card,
    Text,
    BlockStack,
    InlineStack,
    Box,
    Button,
    Badge,
    Icon,
    TextField,
    Select,
    DataTable,
    Modal,
    FormLayout,
    Spinner,
} from "@shopify/polaris";
import {
    BarcodeIcon,
    PrintIcon,
    SearchIcon,
    CheckmarkIcon,
    AlertIcon,
} from "@shopify/polaris-icons";
import { useForm } from "@inertiajs/react";
import axios from "axios";

export default function PrintJob({ products = [] }) {
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [selectedVariants, setSelectedVariants] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [quantityPerVariant, setQuantityPerVariant] = useState(1);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const { data, setData, post, processing } = useForm({
        barcode_printer_setting_id: "",
        selected_variants: [],
        quantity_per_variant: 1,
    });

    const filteredProducts = products.filter((p) =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectProduct = (productId) => {
        setSelectedProducts((prev) =>
            prev.includes(productId)
                ? prev.filter((id) => id !== productId)
                : [...prev, productId]
        );
    };

    const handleSelectVariant = (variantId) => {
        setSelectedVariants((prev) =>
            prev.includes(variantId)
                ? prev.filter((id) => id !== variantId)
                : [...prev, variantId]
        );
    };

    const handleCreatePrintJob = () => {
        if (selectedVariants.length === 0) return;

        setData({
            ...data,
            selected_variants: selectedVariants,
            quantity_per_variant: quantityPerVariant,
        });

        setShowConfirm(true);
    };

    const handleConfirmPrint = () => {
        post(route("barcode-printer.print"), {
            onSuccess: () => {
                setShowConfirm(false);
                setSelectedVariants([]);
            },
        });
    };

    const totalLabels = selectedVariants.length * quantityPerVariant;

    return (
        <Page title="Print Labels">
            <Layout>
                <Layout.Section variant="oneThird">
                    <Card>
                        <BlockStack gap="400">
                            <BlockStack gap="200">
                                <Text variant="headingMd" fontWeight="semibold">
                                    Print Selection
                                </Text>
                                <Text tone="subdued" variant="bodySm">
                                    Select variants to print
                                </Text>
                            </BlockStack>

                            <TextField
                                label="Search Products"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={setSearchTerm}
                                prefix={<Icon source={SearchIcon} />}
                            />

                            <Select
                                label="Quantity per Variant"
                                options={[
                                    { label: "1", value: "1" },
                                    { label: "2", value: "2" },
                                    { label: "5", value: "5" },
                                    { label: "10", value: "10" },
                                ]}
                                value={quantityPerVariant.toString()}
                                onChange={(value) =>
                                    setQuantityPerVariant(parseInt(value))
                                }
                            />

                            <Box
                                background="bg-surface-secondary"
                                padding="300"
                                borderRadius="200"
                            >
                                <BlockStack gap="200">
                                    <Text
                                        variant="bodySm"
                                        fontWeight="semibold"
                                    >
                                        Summary
                                    </Text>
                                    <InlineStack
                                        align="space-between"
                                        gap="200"
                                    >
                                        <Text tone="subdued">
                                            Selected Variants
                                        </Text>
                                        <Text fontWeight="semibold">
                                            {selectedVariants.length}
                                        </Text>
                                    </InlineStack>
                                    <InlineStack
                                        align="space-between"
                                        gap="200"
                                    >
                                        <Text tone="subdued">Total Labels</Text>
                                        <Badge tone="info">{totalLabels}</Badge>
                                    </InlineStack>
                                </BlockStack>
                            </Box>

                            <Button
                                variant="primary"
                                onClick={handleCreatePrintJob}
                                icon={PrintIcon}
                                fullWidth
                                disabled={selectedVariants.length === 0}
                            >
                                Print Labels
                            </Button>
                        </BlockStack>
                    </Card>
                </Layout.Section>

                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <BlockStack gap="200">
                                <Text variant="headingMd" fontWeight="semibold">
                                    Products & Variants
                                </Text>
                            </BlockStack>

                            <div style={{ overflowX: "auto" }}>
                                <table
                                    style={{
                                        width: "100%",
                                        borderCollapse: "collapse",
                                    }}
                                >
                                    <thead>
                                        <tr
                                            style={{
                                                background:
                                                    "var(--p-color-bg-surface-secondary)",
                                                borderBottom:
                                                    "1px solid var(--p-color-border-subdued)",
                                            }}
                                        >
                                            <th
                                                style={{
                                                    padding: "12px",
                                                    textAlign: "left",
                                                    fontWeight: "600",
                                                    fontSize: "12px",
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        selectedVariants.length >
                                                            0 &&
                                                        selectedVariants.length ===
                                                            products.reduce(
                                                                (sum, p) =>
                                                                    sum +
                                                                    (p.variants
                                                                        ?.length ||
                                                                        0),
                                                                0
                                                            )
                                                    }
                                                    onChange={() => {
                                                        if (
                                                            selectedVariants.length >
                                                            0
                                                        ) {
                                                            setSelectedVariants(
                                                                []
                                                            );
                                                        } else {
                                                            const allVariants =
                                                                products.flatMap(
                                                                    (p) =>
                                                                        p.variants?.map(
                                                                            (
                                                                                v
                                                                            ) =>
                                                                                v.id
                                                                        ) || []
                                                                );
                                                            setSelectedVariants(
                                                                allVariants
                                                            );
                                                        }
                                                    }}
                                                    style={{
                                                        cursor: "pointer",
                                                    }}
                                                />
                                            </th>
                                            <th
                                                style={{
                                                    padding: "12px",
                                                    textAlign: "left",
                                                    fontWeight: "600",
                                                    fontSize: "12px",
                                                }}
                                            >
                                                Product
                                            </th>
                                            <th
                                                style={{
                                                    padding: "12px",
                                                    textAlign: "left",
                                                    fontWeight: "600",
                                                    fontSize: "12px",
                                                }}
                                            >
                                                Variant
                                            </th>
                                            <th
                                                style={{
                                                    padding: "12px",
                                                    textAlign: "left",
                                                    fontWeight: "600",
                                                    fontSize: "12px",
                                                }}
                                            >
                                                SKU
                                            </th>
                                            <th
                                                style={{
                                                    padding: "12px",
                                                    textAlign: "left",
                                                    fontWeight: "600",
                                                    fontSize: "12px",
                                                }}
                                            >
                                                Barcode
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map((product) =>
                                            product.variants?.map(
                                                (variant, idx) => (
                                                    <tr
                                                        key={variant.id}
                                                        style={{
                                                            borderBottom:
                                                                "1px solid var(--p-color-border-subdued)",
                                                            background:
                                                                idx % 2 === 0
                                                                    ? "var(--p-color-bg-surface)"
                                                                    : "var(--p-color-bg-surface-secondary)",
                                                        }}
                                                    >
                                                        <td
                                                            style={{
                                                                padding: "12px",
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedVariants.includes(
                                                                    variant.id
                                                                )}
                                                                onChange={() =>
                                                                    handleSelectVariant(
                                                                        variant.id
                                                                    )
                                                                }
                                                                style={{
                                                                    cursor: "pointer",
                                                                }}
                                                            />
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding: "12px",
                                                            }}
                                                        >
                                                            <Text
                                                                variant="bodySm"
                                                                fontWeight="semibold"
                                                            >
                                                                {product.title}
                                                            </Text>
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding: "12px",
                                                            }}
                                                        >
                                                            <Text variant="bodySm">
                                                                {variant.title ||
                                                                    "Default"}
                                                            </Text>
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding: "12px",
                                                            }}
                                                        >
                                                            <Text
                                                                variant="bodySm"
                                                                fontFamily="monospace"
                                                            >
                                                                {variant.sku ||
                                                                    "—"}
                                                            </Text>
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding: "12px",
                                                            }}
                                                        >
                                                            <Badge
                                                                tone={
                                                                    variant.barcode
                                                                        ? "success"
                                                                        : "warning"
                                                                }
                                                            >
                                                                {variant.barcode
                                                                    ? "Present"
                                                                    : "Missing"}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                )
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>

            {/* Confirmation Modal */}
            <Modal
                open={showConfirm}
                onClose={() => setShowConfirm(false)}
                title="Confirm Print Job"
                primaryAction={{
                    content: "Create Print Job",
                    onAction: handleConfirmPrint,
                    loading: processing,
                }}
                secondaryActions={[
                    {
                        content: "Cancel",
                        onAction: () => setShowConfirm(false),
                    },
                ]}
            >
                <Modal.Section>
                    <BlockStack gap="400">
                        <Box
                            background="bg-surface-info-subdued"
                            padding="400"
                            borderRadius="200"
                        >
                            <BlockStack gap="200">
                                <InlineStack gap="200">
                                    <Icon source={PrintIcon} tone="info" />
                                    <Text fontWeight="semibold">
                                        Ready to Print
                                    </Text>
                                </InlineStack>
                                <Text variant="bodySm" tone="subdued">
                                    Your print job is queued and will be
                                    processed shortly.
                                </Text>
                            </BlockStack>
                        </Box>

                        <Box
                            background="bg-surface-secondary"
                            padding="300"
                            borderRadius="200"
                        >
                            <BlockStack gap="200">
                                <InlineStack align="space-between" gap="200">
                                    <Text tone="subdued">
                                        Selected Variants
                                    </Text>
                                    <Text fontWeight="semibold">
                                        {selectedVariants.length}
                                    </Text>
                                </InlineStack>
                                <InlineStack align="space-between" gap="200">
                                    <Text tone="subdued">
                                        Quantity per Variant
                                    </Text>
                                    <Text fontWeight="semibold">
                                        {quantityPerVariant}
                                    </Text>
                                </InlineStack>
                                <InlineStack align="space-between" gap="200">
                                    <Text fontWeight="semibold">
                                        Total Labels
                                    </Text>
                                    <Badge tone="info">{totalLabels}</Badge>
                                </InlineStack>
                            </BlockStack>
                        </Box>
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </Page>
    );
}
