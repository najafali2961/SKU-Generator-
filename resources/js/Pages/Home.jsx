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

export default function Home({ stats = {} }) {
    // State to control feedback card visibility
    const [showFeedback, setShowFeedback] = useState(true);

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
        "linear-gradient(195deg,  #1e90ff 1%, #87cefa 45%, #ffffff 100%)";
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

                {showFeedback && (
                    <Layout.Section>
                        <Card
                            padding="400"
                            style={{
                                borderRadius: "12px",
                                position: "relative",
                            }}
                        >
                            <InlineStack
                                gap="400"
                                align="space-between"
                                blockAlign="center"
                                wrap={false}
                                style={{ width: "100%" }}
                            >
                                {" "}
                                <Text
                                    variant="bodyMd"
                                    fontWeight="medium"
                                    alignment="start"
                                >
                                    How was your experience with the app?{" "}
                                </Text>
                                {/* Added a larger gap between Close button and feedback buttons */}
                                <InlineStack gap="200">
                                    <button
                                        style={{
                                            backgroundColor: "#ffffff",
                                            border: "1px solid #dbe2ef",
                                            borderRadius: "8px",
                                            padding: "8px 16px",
                                            fontSize: "12px",
                                            cursor: "pointer",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        😊 Good
                                    </button>
                                    <button
                                        style={{
                                            backgroundColor: "#ffffff",
                                            border: "1px solid #dbe2ef",
                                            borderRadius: "8px",
                                            padding: "8px 16px",
                                            fontSize: "12px",
                                            cursor: "pointer",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        😞 Bad
                                    </button>
                                </InlineStack>
                            </InlineStack>

                            {/* Close Button */}
                            <div
                                style={{
                                    position: "absolute",
                                    top: "8px",
                                    right: "8px",
                                    cursor: "pointer",
                                    padding: "3px",
                                    borderRadius: "2px",
                                    background: "rgba(255,255,255,0.95)",
                                    zIndex: 10,
                                }}
                                onClick={() => setShowFeedback(false)}
                            >
                                <Icon source={XIcon} color="base" />
                            </div>
                        </Card>
                    </Layout.Section>
                )}
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

                                <InlineStack gap="400" align="start">
                                    <div
                                        style={{
                                            width: 40,
                                            height: 40,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <IconBox icon={stat.icon} />
                                    </div>

                                    <BlockStack gap="100">
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
                                                        {action.cta.replace(
                                                            "→",
                                                            ""
                                                        )}
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
                            border-radius: 10px;
                            padding: 2px;
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
                            box-shadow: 0 20px 40px rgba(14, 165, 233, 0.18);
                            border-color: transparent;
                        }
                        .quick-action-wrapper:hover .hover-arrow {
                            opacity: 1 !important;
                            transform: translateX(4px) !important;
                        }
                    `}</style>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
