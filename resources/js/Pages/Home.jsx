import React, { useState } from "react";
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
    Icon,
    Badge,
} from "@shopify/polaris";
import { Link, router } from "@inertiajs/react";
import {
    BarcodeIcon,
    MagicIcon,
    StarFilledIcon,
    ArrowRightIcon,
    AlertTriangleIcon,
    XIcon,
} from "@shopify/polaris-icons";
import RecentJobsTable from "./RecentJobsTable";

export default function Home({ stats = {}, recentJobs = [] }) {
    const data = {
        total_variants: stats.total_variants || 0,
        variants_with_sku: stats.variants_with_sku || 0,
        variants_missing_sku: stats.variants_missing_sku || 0,
        variants_with_barcode: stats.variants_with_barcode || 0,
        variants_missing_barcode: stats.variants_missing_barcode || 0,
        total_products: stats.total_products || 0,
        active_stores: stats.active_stores || 1,
    };

    const skuCoverage =
        data.total_variants > 0
            ? Math.round((data.variants_with_sku / data.total_variants) * 100)
            : 0;

    const barcodeCoverage =
        data.total_variants > 0
            ? Math.round(
                  (data.variants_with_barcode / data.total_variants) * 100
              )
            : 0;

    const missingSkuPercent = 100 - skuCoverage;
    const missingBarcodePercent = 100 - barcodeCoverage;

    const heroGradient =
        "linear-gradient(195deg, #1e90ff 1%, #87cefa 45%, #ffffff 100%)";
    const cardGradient = "linear-gradient(135deg, #1e90ff, #87cefa)";
    const borderBlue = "#bae6fd";

    const IconBox = ({ icon }) => (
        <Box
            style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: cardGradient,
            }}
        >
            <span style={{ color: "white" }}>
                <Icon source={icon} />
            </span>
        </Box>
    );

    // Helper to get badge tone and text
    const getBadgeProps = (missingPercent) => {
        if (missingPercent === 0) {
            return { tone: "success", text: "All Good", progress: "complete" };
        }
        if (missingPercent <= 10) {
            return {
                tone: "success",
                text: "Almost Perfect",
                progress: "partiallyComplete",
            };
        }
        if (missingPercent <= 30) {
            return {
                tone: "warning",
                text: "Action Needed",
                progress: "partiallyComplete",
            };
        }
        return {
            tone: "critical",
            text: "Fix Required",
            progress: "partiallyComplete",
        };
    };

    return (
        <Page>
            <Layout>
                {/* Hero Header */}
                <Layout.Section>
                    <div
                        style={{
                            borderRadius: "20px",
                            padding: "48px 40px",
                            background: heroGradient,
                            border: `1px solid ${borderBlue}`,
                            boxShadow: "0 8px 25px rgba(56, 178,239,0.1)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ maxWidth: "65%" }}>
                            <Text
                                as="h1"
                                variant="heading2xl"
                                fontWeight="bold"
                            >
                                SKU & Barcode Generator Pro
                            </Text>
                            <Text
                                variant="bodyLg"
                                tone="subdued"
                                style={{ marginTop: "8px" }}
                            >
                                Fix missing SKUs & barcodes in seconds • Trusted
                                by{" "}
                                <strong>
                                    {data.active_stores.toLocaleString()}+
                                    stores
                                </strong>
                            </Text>
                        </div>

                        <InlineStack gap="300">
                            <Button
                                size="large"
                                variant="primary"
                                icon={<Icon source={StarFilledIcon} />}
                                onClick={() =>
                                    window.open(
                                        "https://apps.shopify.com/your-app/reviews",
                                        "_blank"
                                    )
                                }
                            >
                                Leave a Review
                            </Button>
                            <Button
                                size="large"
                                onClick={() => router.visit("/support")}
                            >
                                Support
                            </Button>
                        </InlineStack>
                    </div>
                </Layout.Section>

                {/* Stats Grid */}
                <Layout.Section>
                    <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="200">
                        {[
                            {
                                title: "Total Variants",
                                value: data.total_variants,
                                icon: MagicIcon,
                            },
                            {
                                title: "Missing SKUs",
                                value: data.variants_missing_sku,
                                icon: AlertTriangleIcon,
                                missingPercent: missingSkuPercent,
                            },
                            {
                                title: "Missing Barcodes",
                                value: data.variants_missing_barcode,
                                icon: BarcodeIcon,
                                missingPercent: missingBarcodePercent,
                            },
                        ].map((stat, idx) => {
                            const badge =
                                stat.missingPercent !== undefined
                                    ? getBadgeProps(stat.missingPercent)
                                    : null;

                            return (
                                <Card
                                    key={idx}
                                    padding="600"
                                    style={{
                                        borderRadius: "16px",
                                        background: "#ffffff",
                                        border: `1px solid ${borderBlue}`,
                                        position: "relative",
                                        overflow: "hidden",
                                        boxShadow:
                                            "0 4px 12px rgba(0,0,0,0.04)",
                                    }}
                                >
                                    <div
                                        style={{
                                            position: "absolute",
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: "6px",
                                            background: cardGradient,
                                        }}
                                    />

                                    <InlineStack gap="200" align="start">
                                        <div
                                            style={{
                                                width: 40,
                                                height: 40,
                                                display: "flex",
                                                alignItems: "start",
                                                justifyContent: "start",
                                            }}
                                        >
                                            <IconBox icon={stat.icon} />
                                        </div>

                                        <BlockStack gap="100">
                                            <InlineStack
                                                gap="200"
                                                align="start"
                                            >
                                                <Text
                                                    variant="headingLg"
                                                    fontWeight="semibold"
                                                >
                                                    {stat.value.toLocaleString()}
                                                </Text>

                                                {badge && (
                                                    <Badge
                                                        tone={badge.tone}
                                                        progress={
                                                            badge.progress
                                                        }
                                                        size="medium"
                                                    >
                                                        {badge.text}
                                                    </Badge>
                                                )}
                                            </InlineStack>

                                            <Text
                                                variant="bodyMd"
                                                tone="subdued"
                                            >
                                                {stat.title}{" "}
                                                {stat.missingPercent !==
                                                undefined
                                                    ? `(${stat.missingPercent}% missing)`
                                                    : ""}
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                </Card>
                            );
                        })}
                    </InlineGrid>
                </Layout.Section>

                {/* Quick Actions */}
                <Layout.Section>
                    <BlockStack gap="600">
                        <InlineGrid columns={{ xs: 1, md: 3 }} gap="500">
                            {[
                                {
                                    title: "Generate SKUs",
                                    desc: "Smart auto-fill for all variants",
                                    icon: AlertTriangleIcon,
                                    route: "/sku-generator?auto=missing",
                                    cta: `Fix ${data.variants_missing_sku} Missing SKUs`,
                                },
                                {
                                    title: "Generate Barcodes",
                                    desc: "Instantly generated",
                                    icon: BarcodeIcon,
                                    route: "/barcode-generator?auto=missing",
                                    cta: `Fix ${data.variants_missing_barcode} Barcodes`,
                                },
                                {
                                    title: "Print / QR Codes",
                                    desc: "Generate labels",
                                    icon: MagicIcon,
                                    route: "/print-generator",
                                    cta: "Start Printing",
                                },
                            ].map((action) => (
                                <Link
                                    href={action.route}
                                    key={action.title}
                                    style={{ textDecoration: "none" }}
                                >
                                    <div className="quick-action-wrapper">
                                        <Card
                                            padding="600"
                                            background="bg-surface"
                                            roundedAbove="lg"
                                        >
                                            <BlockStack gap="400">
                                                <InlineStack
                                                    gap="300"
                                                    blockAlign="center"
                                                >
                                                    <IconBox
                                                        icon={action.icon}
                                                    />
                                                    <BlockStack gap="050">
                                                        <Text
                                                            variant="headingMd"
                                                            fontWeight="semibold"
                                                        >
                                                            {action.title}
                                                        </Text>
                                                        <Text tone="subdued">
                                                            {action.desc}
                                                        </Text>
                                                    </BlockStack>
                                                </InlineStack>

                                                <InlineStack
                                                    gap="10"
                                                    blockAlign="center"
                                                >
                                                    <Text
                                                        fontWeight="medium"
                                                        color="primary"
                                                    >
                                                        {action.cta}
                                                    </Text>
                                                    <Icon
                                                        source={ArrowRightIcon}
                                                        color="primary"
                                                        className="hover-arrow"
                                                        style={{
                                                            opacity: 0,
                                                            transform:
                                                                "translateX(-10px)",
                                                            transition:
                                                                "all 0.3s ease",
                                                        }}
                                                    />
                                                </InlineStack>
                                            </BlockStack>
                                        </Card>
                                    </div>
                                </Link>
                            ))}
                        </InlineGrid>
                    </BlockStack>

                    <style>{`
                        .quick-action-wrapper {
                            position: relative;
                            border-radius: 16px;
                            transition: all 0.3s ease;
                        }
                        .quick-action-wrapper::after {
                            content: "";
                            position: absolute;
                            inset: 0;
                            border-radius: 16px;
                            padding: 3px;
                            background: linear-gradient(135deg, #1e90ff, #87cefa);
                            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                            -webkit-mask-composite: xor;
                            mask-composite: exclude;
                            opacity: 0;
                            transition: opacity 0.3s ease;
                            pointer-events: none;
                        }
                        .quick-action-wrapper:hover::after { opacity: 1; }
                        .quick-action-wrapper:hover {
                            transform: translateY(-6px);
                            box-shadow: 0 20px 40px rgba(14,165,233,0.18);
                        }
                        .quick-action-wrapper:hover .hover-arrow {
                            opacity: 1 !important;
                            transform: translateX(6px) !important;
                        }
                    `}</style>
                </Layout.Section>

                <Layout.Section>
                    <RecentJobsTable jobs={recentJobs} />
                </Layout.Section>
            </Layout>
        </Page>
    );
}
