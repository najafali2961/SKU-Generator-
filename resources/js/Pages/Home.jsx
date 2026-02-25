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
    CreditCardIcon,
    MagicIcon,
    ProductIcon,
    StoreIcon,
    BarcodeIcon,
    ArrowRightIcon,
    LabelPrinterIcon,
    StarIcon,
    StarFilledIcon,
    XIcon,
} from "@shopify/polaris-icons";
import { Link, useForm } from "@inertiajs/react";
import { useState, useCallback } from "react";
import { Modal, TextField, FormLayout } from "@shopify/polaris";
import RecentJobsTable from "./RecentJobsTable";
import CreditsSpeedometerCard from "./CreditsSpeedometerCard";

export default function Home({
    stats = {},
    credits = {},
    recentJobs = [],
    has_claimed_giveaway = false,
}) {
    const data = {
        total_variants: stats.total_variants || 0,
        variants_missing_sku: stats.variants_missing_sku || 0,
        variants_missing_barcode: stats.variants_missing_barcode || 0,
        active_stores: stats.active_stores || 1,
    };

    const missingSkuPercent =
        data.total_variants > 0
            ? Math.round(
                  (data.variants_missing_sku / data.total_variants) * 100,
              )
            : 0;

    const missingBarcodePercent =
        data.total_variants > 0
            ? Math.round(
                  (data.variants_missing_barcode / data.total_variants) * 100,
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

    // Giveaway Banner State
    const [isGiveawayDismissed, setIsGiveawayDismissed] = useState(false);

    // Feedback States
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

    const {
        data: feedbackData,
        setData: setFeedbackData,
        post: postFeedback,
        processing: feedbackProcessing,
        reset: resetFeedback,
    } = useForm({
        rating: 0,
        message: "",
    });

    const handleBadFeedback = useCallback(() => {
        setFeedbackModalOpen(true);
    }, []);

    const submitBadFeedback = useCallback(() => {
        postFeedback("/feedback", {
            onSuccess: () => {
                setFeedbackModalOpen(false);
                resetFeedback();
                shopify.toast.show("Thank you for your feedback!");
            },
            onError: () => {
                shopify.toast.show("Failed to send feedback", {
                    isError: true,
                });
            },
        });
    }, [postFeedback, resetFeedback]);

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
                                    {data.active_stores.toLocaleString()}00+
                                    stores
                                </Text>
                            </BlockStack>

                            <InlineStack gap="300">
                                <BlockStack gap="200">
                                    <Text variant="headingMd" as="h2">
                                        Share your feedback
                                    </Text>
                                </BlockStack>
                                <Button
                                    onClick={() =>
                                        window.open(
                                            "https://apps.shopify.com/airo-sku-barcode-generator#modal-show=ReviewListingModal",
                                            "_blank",
                                        )
                                    }
                                >
                                    😄 Good
                                </Button>
                                <Button onClick={handleBadFeedback}>
                                    😥 Bad
                                </Button>
                            </InlineStack>
                        </InlineStack>
                    </Box>
                </Layout.Section>

                {/* Bad Feedback Modal */}
                <Modal
                    open={feedbackModalOpen}
                    onClose={() => setFeedbackModalOpen(false)}
                    title="Review this app"
                    primaryAction={{
                        content: "Submit",
                        onAction: submitBadFeedback,
                        loading: feedbackProcessing,
                    }}
                    secondaryAction={{
                        content: "Cancel",
                        onAction: () => setFeedbackModalOpen(false),
                    }}
                >
                    <Modal.Section>
                        <BlockStack gap="400">
                            <InlineStack gap="100">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <div
                                        key={star}
                                        onClick={() =>
                                            setFeedbackData("rating", star)
                                        }
                                        className="cursor-pointer"
                                        style={{
                                            width: "32px",
                                            height: "32px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                transform: "scale(1.5)",
                                                transformOrigin: "top left",
                                            }}
                                        >
                                            <Icon
                                                source={
                                                    star <= feedbackData.rating
                                                        ? StarFilledIcon
                                                        : StarIcon
                                                }
                                                tone="base"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </InlineStack>

                            <FormLayout>
                                <TextField
                                    label="Describe your experience (optional)"
                                    value={feedbackData.message}
                                    onChange={(value) =>
                                        setFeedbackData("message", value)
                                    }
                                    multiline={4}
                                    autoComplete="off"
                                    placeholder="What should other merchants know about this app?"
                                />
                            </FormLayout>

                            <Text as="p" tone="base">
                                If your review is published, we'll include some
                                details about your store.{" "}
                                <a
                                    href="https://help.shopify.com/en/manual/apps/choosing-apps#app-reviews"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        textDecoration: "underline",
                                        color: "inherit",
                                    }}
                                >
                                    Learn more
                                </a>
                            </Text>
                        </BlockStack>
                    </Modal.Section>
                </Modal>

                <Layout.Section>
                    <CreditsSpeedometerCard credits={credits} />
                </Layout.Section>

                {!isGiveawayDismissed && !has_claimed_giveaway && (
                    <Layout.Section>
                        <style>
                            {`
                                :root {
                                    --banner-gradient: linear-gradient(135deg, #FF6B9E 0%, #6BA4FF 100%);
                                    --shimmer: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                                    --banner-glow: 0 4px 20px rgba(255, 107, 158, 0.4);
                                }
                                @keyframes shimmer {
                                    0% { transform: translateX(-100%); }
                                    100% { transform: translateX(100%); }
                                }
                                @keyframes floatObj {
                                    0%, 100% { transform: translateY(0); }
                                    50% { transform: translateY(-5px); }
                                }
                                @keyframes pulseGlow {
                                    0%, 100% { box-shadow: 0 0 15px rgba(255,107,158,0.5); }
                                    50% { box-shadow: 0 0 25px rgba(255,107,158,0.8); }
                                }
                                .animate-shimmer {
                                    animation: shimmer 2.5s infinite;
                                }
                                .animate-float {
                                    animation: floatObj 3s ease-in-out infinite;
                                }
                                .animate-pulse-glow {
                                    animation: pulseGlow 2s infinite;
                                }
                            `}
                        </style>
                        <div className="flex w-full items-center justify-center py-2">
                            <div className="w-full">
                                <div className="w-full">
                                    <div
                                        className="relative overflow-hidden rounded-xl p-[1px]"
                                        style={{
                                            background:
                                                "var(--banner-gradient)",
                                        }}
                                    >
                                        <div
                                            className="relative rounded-xl bg-white backdrop-blur-sm px-4 py-3 sm:px-6 sm:py-4"
                                            style={{
                                                backgroundColor:
                                                    "rgba(255, 255, 255, 0.96)",
                                            }}
                                        >
                                            {/* Shimmer */}
                                            <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                                                <div
                                                    className="absolute inset-0 animate-shimmer"
                                                    style={{
                                                        background:
                                                            "var(--shimmer)",
                                                    }}
                                                />
                                            </div>

                                            {/* Floating dots */}
                                            <div
                                                className="absolute top-2 left-6 w-2 h-2 rounded-full animate-float"
                                                style={{
                                                    backgroundColor:
                                                        "rgba(255, 107, 158, 0.5)",
                                                }}
                                            />
                                            <div
                                                className="absolute top-6 right-20 w-1.5 h-1.5 rounded-full animate-float"
                                                style={{
                                                    backgroundColor:
                                                        "rgba(107, 164, 255, 0.5)",
                                                    animationDelay: "0.5s",
                                                }}
                                            />
                                            <div
                                                className="absolute bottom-2 left-1/3 w-1 h-1 rounded-full animate-float"
                                                style={{
                                                    backgroundColor:
                                                        "rgba(255, 107, 158, 0.7)",
                                                    animationDelay: "1s",
                                                }}
                                            />

                                            {/* Close */}
                                            <button
                                                onClick={() =>
                                                    setIsGiveawayDismissed(true)
                                                }
                                                className="absolute top-2 right-2 z-10 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center"
                                                style={{ border: "none" }}
                                            >
                                                <div
                                                    style={{
                                                        width: "14px",
                                                        height: "14px",
                                                        color: "#6b7280",
                                                    }}
                                                >
                                                    <Icon source={XIcon} />
                                                </div>
                                            </button>

                                            {/* Content */}
                                            <div className="relative z-[1] flex flex-col sm:flex-row items-center sm:items-center gap-3">
                                                <div
                                                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center animate-pulse-glow"
                                                    style={{
                                                        background:
                                                            "var(--banner-gradient)",
                                                        boxShadow:
                                                            "var(--banner-glow)",
                                                        fontSize: "20px",
                                                    }}
                                                >
                                                    🎁
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span
                                                            className="text-pink-500"
                                                            style={{
                                                                fontSize:
                                                                    "12px",
                                                            }}
                                                        >
                                                            ✨
                                                        </span>
                                                        <h3 className="text-xs font-bold tracking-wide uppercase text-gray-800 m-0">
                                                            Special Giveaway
                                                        </h3>
                                                    </div>
                                                    <p className="text-sm font-semibold text-gray-900 m-0">
                                                        Claim your{" "}
                                                        <span
                                                            className="text-transparent bg-clip-text"
                                                            style={{
                                                                backgroundImage:
                                                                    "var(--banner-gradient)",
                                                                WebkitBackgroundClip:
                                                                    "text",
                                                                WebkitTextFillColor:
                                                                    "transparent",
                                                            }}
                                                        >
                                                            Free Credits!
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5 leading-snug w-full m-0">
                                                        Chat with our support
                                                        team to claim yours
                                                        instantly.
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        if (window.$crisp) {
                                                            // Open the Crisp chat box
                                                            window.$crisp.push([
                                                                "do",
                                                                "chat:open",
                                                            ]);
                                                            // Optional: Pre-fill a message for the user to send
                                                            window.$crisp.push([
                                                                "do",
                                                                "message:send",
                                                                [
                                                                    "text",
                                                                    "Hello! I am here to claim my free giveaway credits for my store! 🎁",
                                                                ],
                                                            ]);
                                                        } else {
                                                            // Fallback if Crisp failed to load
                                                            window.open(
                                                                "mailto:support@airoapps.com?subject=Giveaway Credits Claim",
                                                                "_blank",
                                                            );
                                                        }
                                                    }}
                                                    className="flex-shrink-0 group flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer border-none"
                                                    style={{
                                                        background:
                                                            "var(--banner-gradient)",
                                                        boxShadow:
                                                            "var(--banner-glow)",
                                                    }}
                                                >
                                                    Chat to Claim
                                                    <div className="ml-0.5 w-3 h-3 transition-transform group-hover:translate-x-0.5 flex items-center justify-center text-white">
                                                        <Icon
                                                            source={
                                                                ArrowRightIcon
                                                            }
                                                        />
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Layout.Section>
                )}

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
                                                    missingSkuPercent,
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
                                                    missingBarcodePercent,
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
