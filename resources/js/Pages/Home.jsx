import React from "react";
import {
    Page,
    Layout,
    Card,
    Text,
    BlockStack,
    InlineGrid,
    InlineStack,
    Box,
    Icon,
    Button,
} from "@shopify/polaris";
import { router } from "@inertiajs/react";

import {
    HashtagIcon,
    BarcodeIcon,
    PrintIcon,
    ClockIcon,
    StoreIcon,
    MagicIcon,
    CheckCircleIcon,
} from "@shopify/polaris-icons";

export default function Home({ stats = {} }) {
    const defaultStats = {
        total_skus_generated: 12480,
        barcodes_created: 8920,
        labels_printed: 5670,
        products_processed: 3120,
        time_saved: "2.4k hours",
        active_stores: 428,
    };

    const data = { ...defaultStats, ...stats };

    return (
        <Page>
            <Layout>
                {/* Header */}
                <Layout.Section>
                    <Card>
                        <Box padding="500">
                            <BlockStack gap="100" align="center">
                                <InlineStack
                                    gap="75"
                                    align="center"
                                    blockAlign="center"
                                >
                                    <Text
                                        variant="heading2xl"
                                        fontWeight="bold"
                                        alignment="center"
                                    >
                                        SKU & Barcode Generator Pro
                                    </Text>
                                </InlineStack>

                                <Text tone="subdued" alignment="center">
                                    Fast, accurate tools for SKUs, barcodes, and
                                    label printing.
                                </Text>
                            </BlockStack>
                        </Box>
                    </Card>
                </Layout.Section>

                {/* Stats */}
                <Layout.Section>
                    <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
                        {[
                            {
                                icon: HashtagIcon,
                                value: data.total_skus_generated,
                                label: "SKUs generated",
                            },
                            {
                                icon: BarcodeIcon,
                                value: data.barcodes_created,
                                label: "Barcodes created",
                            },
                            {
                                icon: PrintIcon,
                                value: data.labels_printed,
                                label: "Labels printed",
                            },
                        ].map((item, index) => (
                            <Card key={index}>
                                <Box padding="400" width="100%">
                                    <InlineStack
                                        gap="150"
                                        align="start"
                                        blockAlign="center"
                                        fullWidth
                                    >
                                        <Icon
                                            source={item.icon}
                                            tone={item.tone || "base"}
                                        />
                                        <BlockStack gap="50">
                                            <Text
                                                variant="headingLg"
                                                fontWeight="bold"
                                            >
                                                {typeof item.value === "number"
                                                    ? item.value.toLocaleString()
                                                    : item.value}
                                            </Text>
                                            <Text tone="subdued">
                                                {item.label}
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                </Box>
                            </Card>
                        ))}
                    </InlineGrid>
                </Layout.Section>

                {/* Tools Section */}
                <Layout.Section>
                    <BlockStack gap="600">
                        <Card>
                            <Box padding="600">
                                <InlineStack
                                    align="space-between"
                                    blockAlign="center"
                                >
                                    <BlockStack gap="200">
                                        <Text
                                            variant="headingXl"
                                            fontWeight="bold"
                                        >
                                            SKU Generator
                                        </Text>
                                        <Text tone="subdued">
                                            Create structured, consistent SKU
                                            patterns.
                                        </Text>
                                    </BlockStack>

                                    <Button
                                        size="large"
                                        onClick={() =>
                                            router.visit("/sku-generator")
                                        }
                                        primary
                                    >
                                        Open
                                    </Button>
                                </InlineStack>
                            </Box>
                        </Card>

                        <Card>
                            <Box padding="600">
                                <InlineStack
                                    align="space-between"
                                    blockAlign="center"
                                >
                                    <BlockStack gap="200">
                                        <Text
                                            variant="headingXl"
                                            fontWeight="bold"
                                        >
                                            Barcode Generator
                                        </Text>
                                        <Text tone="subdued">
                                            Generate EAN-13, UPC-A, Code128
                                            instantly.
                                        </Text>
                                    </BlockStack>

                                    <Button
                                        size="large"
                                        onClick={() =>
                                            router.visit("/barcode-generator")
                                        }
                                    >
                                        Open
                                    </Button>
                                </InlineStack>
                            </Box>
                        </Card>

                        <Card>
                            <Box padding="600">
                                <InlineStack
                                    align="space-between"
                                    blockAlign="center"
                                >
                                    <BlockStack gap="200">
                                        <Text
                                            variant="headingXl"
                                            fontWeight="bold"
                                        >
                                            Label Printer
                                        </Text>
                                        <Text tone="subdued">
                                            Print-ready labels for Zebra, DYMO,
                                            and more.
                                        </Text>
                                    </BlockStack>

                                    <Button
                                        size="large"
                                        onClick={() =>
                                            router.visit("/barcode-printer")
                                        }
                                    >
                                        Open
                                    </Button>
                                </InlineStack>
                            </Box>
                        </Card>
                    </BlockStack>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
