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
    Button,
    Badge,
    Icon,
} from "@shopify/polaris";
import {
    BarcodeIcon,
    LabelPrinterIcon,
    StarFilledIcon,
    ArrowRightIcon,
    ProductIcon,
    MagicIcon,
    PhoneIcon,
    CreditCardIcon,
} from "@shopify/polaris-icons";
import { Link } from "@inertiajs/react";
import RecentJobsTable from "./RecentJobsTable";
import CreditsSpeedometerCard from "./CreditsSpeedometerCard";

export default function Home({ stats = {}, credits = {}, recentJobs = [] }) {
    const data = {
        total_variants: stats.total_variants || 0,
        variants_missing_sku: stats.variants_missing_sku || 0,
        variants_missing_barcode: stats.variants_missing_barcode || 0,
        active_stores: stats.active_stores || 1,
    };

    const missingSkuPercent =
        data.total_variants > 0
            ? Math.round(
                  (data.variants_missing_sku / data.total_variants) * 100
              )
            : 0;

    const missingBarcodePercent =
        data.total_variants > 0
            ? Math.round(
                  (data.variants_missing_barcode / data.total_variants) * 100
              )
            : 0;

    const getBadgeProps = (count, percent) => {
        if (count === 0)
            return {
                tone: "success",
                progress: "complete",
                children: "All good",
            };
        if (percent <= 30)
            return {
                tone: "warning",
                progress: "partiallyComplete",
                children: "Action needed",
            };
        return {
            tone: "critical",
            progress: "partiallyComplete",
            children: "Fix required",
        };
    };

    return (
        <Page>
            <Layout>
                {/* HERO */}
                <Layout.Section>
                    <Box
                        background="bg-surface-active"
                        padding="100"
                        borderRadius="300"
                    >
                        <InlineStack
                            align="space-between"
                            blockAlign="center"
                            gap="600"
                            wrap={false}
                        >
                            <BlockStack gap="200">
                                <Text
                                    variant="headingXl"
                                    fontWeight="bold"
                                    tone="invert"
                                >
                                    Airo SKU & Barcode Generator
                                </Text>
                                <Text variant="bodyLg" tone="invert-subdued">
                                    Fix missing SKUs & barcodes in seconds •
                                    Trusted by{" "}
                                    {data.active_stores.toLocaleString()}+
                                    stores
                                </Text>
                            </BlockStack>

                            <InlineStack gap="300">
                                <Button
                                    size="large"
                                    icon={<Icon source={PhoneIcon} />}
                                    tone="invert"
                                    url="/support"
                                >
                                    Support
                                </Button>
                                <Button
                                    size="large"
                                    variant="primary"
                                    icon={<Icon source={StarFilledIcon} />}
                                    onClick={() =>
                                        window.open(
                                            "https://apps.shopify.com/airo-sku-barcode-generator",
                                            "_blank"
                                        )
                                    }
                                >
                                    Leave a Review
                                </Button>
                            </InlineStack>
                        </InlineStack>
                    </Box>
                </Layout.Section>

                <Layout.Section>
                    <CreditsSpeedometerCard credits={credits} />
                </Layout.Section>

                {/* Stats Grid - All with light green background */}
                <Layout.Section>
                    <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
                        {/* Total Variants */}
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="300">
                                    <div
                                        style={{
                                            background:
                                                "rgba(149, 191, 71, 0.12)",
                                            borderRadius: "10px",
                                            padding: "10px",
                                            width: "48px",
                                            height: "48px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Icon
                                            source={MagicIcon}
                                            tone="success"
                                        />
                                    </div>
                                    <BlockStack gap="100">
                                        <Text
                                            variant="headingXl"
                                            fontWeight="bold"
                                        >
                                            {data.total_variants.toLocaleString()}
                                        </Text>
                                        <Text tone="subdued">
                                            Total Variants
                                        </Text>
                                    </BlockStack>
                                </InlineStack>
                            </BlockStack>
                        </Card>

                        {/* Missing SKUs */}
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="300">
                                    <div
                                        style={{
                                            background:
                                                "rgba(149, 191, 71, 0.12)",
                                            borderRadius: "10px",
                                            padding: "10px",
                                            width: "48px",
                                            height: "48px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Icon
                                            source={ProductIcon}
                                            tone="success"
                                        />
                                    </div>
                                    <BlockStack gap="100">
                                        <InlineStack
                                            blockAlign="center"
                                            gap="200"
                                        >
                                            <Text
                                                variant="headingXl"
                                                fontWeight="bold"
                                            >
                                                {data.variants_missing_sku.toLocaleString()}
                                            </Text>
                                            <Badge
                                                {...getBadgeProps(
                                                    data.variants_missing_sku,
                                                    missingSkuPercent
                                                )}
                                            />
                                        </InlineStack>
                                        <Text tone="subdued">Missing SKUs</Text>
                                    </BlockStack>
                                </InlineStack>
                            </BlockStack>
                        </Card>

                        {/* Missing Barcodes */}
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="300">
                                    <div
                                        style={{
                                            background:
                                                "rgba(149, 191, 71, 0.12)",
                                            borderRadius: "10px",
                                            padding: "10px",
                                            width: "48px",
                                            height: "48px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Icon
                                            source={BarcodeIcon}
                                            tone="success"
                                        />
                                    </div>
                                    <BlockStack gap="100">
                                        <InlineStack
                                            blockAlign="center"
                                            gap="200"
                                        >
                                            <Text
                                                variant="headingXl"
                                                fontWeight="bold"
                                            >
                                                {data.variants_missing_barcode.toLocaleString()}
                                            </Text>
                                            <Badge
                                                {...getBadgeProps(
                                                    data.variants_missing_barcode,
                                                    missingBarcodePercent
                                                )}
                                            />
                                        </InlineStack>
                                        <Text tone="subdued">
                                            Missing Barcodes
                                        </Text>
                                    </BlockStack>
                                </InlineStack>
                            </BlockStack>
                        </Card>
                    </InlineGrid>
                </Layout.Section>

                {/* Quick Actions - Now ALL with the same light green background */}
                <Layout.Section>
                    <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
                        {/* Generate SKUs */}
                        <Link
                            href="/sku-generator?auto=missing"
                            style={{ textDecoration: "none" }}
                        >
                            <Card>
                                <BlockStack gap="400">
                                    <InlineStack gap="300">
                                        <div
                                            style={{
                                                background:
                                                    "rgba(149, 191, 71, 0.12)",
                                                borderRadius: "10px",
                                                padding: "10px",
                                                width: "48px",
                                                height: "48px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Icon
                                                source={ProductIcon}
                                                tone="success"
                                            />
                                        </div>
                                        <BlockStack gap="100">
                                            <Text
                                                variant="headingMd"
                                                fontWeight="semibold"
                                            >
                                                Generate SKUs
                                            </Text>
                                            <Text
                                                tone="subdued"
                                                variant="bodySm"
                                            >
                                                Auto-fill missing SKUs instantly
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                    <InlineStack blockAlign="center" gap="200">
                                        <Text
                                            tone="interactive"
                                            fontWeight="medium"
                                        >
                                            Fix{" "}
                                            {data.variants_missing_sku.toLocaleString()}{" "}
                                            SKUs
                                        </Text>
                                        <Icon
                                            source={ArrowRightIcon}
                                            tone="interactive"
                                        />
                                    </InlineStack>
                                </BlockStack>
                            </Card>
                        </Link>

                        {/* Generate Barcodes */}
                        <Link
                            href="/barcode-generator?auto=missing"
                            style={{ textDecoration: "none" }}
                        >
                            <Card>
                                <BlockStack gap="400">
                                    <InlineStack gap="300">
                                        <div
                                            style={{
                                                background:
                                                    "rgba(149, 191, 71, 0.12)",
                                                borderRadius: "10px",
                                                padding: "10px",
                                                width: "48px",
                                                height: "48px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Icon
                                                source={BarcodeIcon}
                                                tone="success"
                                            />
                                        </div>
                                        <BlockStack gap="100">
                                            <Text
                                                variant="headingMd"
                                                fontWeight="semibold"
                                            >
                                                Generate Barcodes
                                            </Text>
                                            <Text
                                                tone="subdued"
                                                variant="bodySm"
                                            >
                                                Instant barcode creation
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                    <InlineStack blockAlign="center" gap="200">
                                        <Text
                                            tone="interactive"
                                            fontWeight="medium"
                                        >
                                            Fix{" "}
                                            {data.variants_missing_barcode.toLocaleString()}{" "}
                                            barcodes
                                        </Text>
                                        <Icon
                                            source={ArrowRightIcon}
                                            tone="interactive"
                                        />
                                    </InlineStack>
                                </BlockStack>
                            </Card>
                        </Link>

                        {/* Print Labels */}
                        <Link
                            href="/barcode-printer"
                            style={{ textDecoration: "none" }}
                        >
                            <Card>
                                <BlockStack gap="400">
                                    <InlineStack gap="300">
                                        <div
                                            style={{
                                                background:
                                                    "rgba(149, 191, 71, 0.12)",
                                                borderRadius: "10px",
                                                padding: "10px",
                                                width: "48px",
                                                height: "48px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Icon
                                                source={LabelPrinterIcon}
                                                tone="success"
                                            />
                                        </div>
                                        <BlockStack gap="100">
                                            <Text
                                                variant="headingMd"
                                                fontWeight="semibold"
                                            >
                                                Print Labels
                                            </Text>
                                            <Text
                                                tone="subdued"
                                                variant="bodySm"
                                            >
                                                QR codes & barcode labels
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                    <InlineStack blockAlign="center" gap="200">
                                        <Text
                                            tone="interactive"
                                            fontWeight="medium"
                                        >
                                            Start printing
                                        </Text>
                                        <Icon
                                            source={ArrowRightIcon}
                                            tone="interactive"
                                        />
                                    </InlineStack>
                                </BlockStack>
                            </Card>
                        </Link>
                    </InlineGrid>
                </Layout.Section>

                {/* Recent Jobs */}
                <Layout.Section>
                    <RecentJobsTable jobs={recentJobs} />
                </Layout.Section>
            </Layout>
        </Page>
    );
}
