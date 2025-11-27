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
} from "@shopify/polaris-icons";

export default function Home({ stats = {} }) {
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

    const heroGradient =
        "linear-gradient(135deg,  #1e90ff 0%, #87cefa 50%, #ffffff 100%)";
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
            <span
                style={{
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                }}
            >
                <Icon source={icon} />
            </span>
        </Box>
    );

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
                            boxShadow: "0 8px 25px rgba(56, 178, 239, 0.1)",
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
                    <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="500">
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
                                badge: "Action Needed",
                                percentage: 100 - skuCoverage,
                            },
                            {
                                title: "Missing Barcodes",
                                value: data.variants_missing_barcode,
                                icon: BarcodeIcon,
                                percentage: 100 - barcodeCoverage,
                            },
                        ].map((stat, idx) => (
                            <Card
                                key={idx}
                                padding="600"
                                style={{
                                    borderRadius: "16px",
                                    background: "#ffffff",
                                    border: `1px solid ${borderBlue}`,
                                    position: "relative",
                                    overflow: "hidden",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
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

                                <InlineStack gap="400" align="center">
                                    <IconBox icon={stat.icon} />

                                    <BlockStack gap="200">
                                        <InlineStack gap="200" align="center">
                                            <Text
                                                variant="headingLg"
                                                fontWeight="semibold"
                                            >
                                                {stat.value.toLocaleString()}
                                            </Text>

                                            {stat.badge && (
                                                <Badge tone="info">
                                                    {stat.badge}
                                                </Badge>
                                            )}
                                        </InlineStack>

                                        <Text variant="bodyMd" tone="subdued">
                                            {stat.title}{" "}
                                            {stat.percentage
                                                ? `(${stat.percentage}%)`
                                                : ""}
                                        </Text>
                                    </BlockStack>
                                </InlineStack>
                            </Card>
                        ))}
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
                                    title: "Printing Labels",
                                    desc: "Print Labels for your products",
                                    icon: MagicIcon,
                                    route: "/bulk-process",
                                    cta: "Print Now",
                                },
                            ].map((action) => (
                                <Link
                                    href={action.route}
                                    key={action.title}
                                    style={{ textDecoration: "none" }}
                                >
                                    <Card
                                        padding="600"
                                        background="bg-surface"
                                        roundedAbove="lg"
                                        className="quick-action-card"
                                        style={{
                                            border: `1px solid ${borderBlue}`,
                                            cursor: "pointer",
                                            transition:
                                                "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                            position: "relative",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <Box
                                            position="absolute"
                                            top="0"
                                            left="0"
                                            width="full"
                                            height="4px"
                                            background="primary"
                                        />

                                        <BlockStack gap="400">
                                            <InlineStack
                                                gap="400"
                                                align="center"
                                                style={{
                                                    alignItems: "flex-start",
                                                }}
                                            >
                                                <IconBox icon={action.icon} />

                                                <BlockStack gap="100">
                                                    <Text
                                                        variant="headingLg"
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
                                                gap="100"
                                                align="center"
                                            >
                                                <Text
                                                    fontWeight="medium"
                                                    color="primary"
                                                >
                                                    {action.cta.replace(
                                                        " →",
                                                        ""
                                                    )}
                                                </Text>

                                                <Icon
                                                    source={ArrowRightIcon}
                                                    color="primary"
                                                    style={{
                                                        opacity: 0,
                                                        transform:
                                                            "translateX(-10px)",
                                                        transition:
                                                            "all 0.3s ease",
                                                    }}
                                                    className="hover-arrow"
                                                />
                                            </InlineStack>
                                        </BlockStack>

                                        <style>{`
                                            .quick-action-card:hover {
                                                transform: translateY(-6px);
                                                box-shadow: 0 20px 40px rgba(14, 165, 233, 0.18);
                                            }
                                            .quick-action-card:hover .hover-arrow {
                                                opacity: 1 !important;
                                                transform: translateX(4px) !important;
                                            }
                                        `}</style>
                                    </Card>
                                </Link>
                            ))}
                        </InlineGrid>
                    </BlockStack>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
