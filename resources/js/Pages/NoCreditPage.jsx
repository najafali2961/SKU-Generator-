import React from "react";
import { router } from "@inertiajs/react";
import {
    Page,
    Layout,
    Card,
    Text,
    BlockStack,
    InlineStack,
    Button,
    Icon,
    Box,
    Badge,
} from "@shopify/polaris";
import { AlertCircleIcon, CreditCardIcon } from "@shopify/polaris-icons";

export default function NoCreditPage({
    feature = "This Feature",
    required_credits = 1,
    available_credits = 0,
}) {
    const handleNavigatePricing = () => router.visit("/pricing");
    const handleNavigateHome = () => router.visit("/");
    const isCompletelyOut = available_credits === 0;

    return (
        <Page>
            <Layout>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="600">
                            {/* Header with Icon */}
                            <InlineStack
                                align="center"
                                blockAlign="center"
                                gap="300"
                            >
                                <Box
                                    background="bg-surface-critical-subdued"
                                    padding="400"
                                    borderRadius="200"
                                >
                                    <Icon
                                        source={AlertCircleIcon}
                                        tone="critical"
                                    />
                                </Box>
                                <BlockStack gap="050">
                                    <Text variant="headingXl" fontWeight="bold">
                                        {isCompletelyOut
                                            ? "Out of Credits"
                                            : "Not Enough Credits"}
                                    </Text>
                                </BlockStack>
                            </InlineStack>

                            {/* Message */}
                            <Text tone="subdued" variant="bodyMd">
                                {isCompletelyOut ? (
                                    <>
                                        You need credits to use{" "}
                                        <strong>{feature}</strong>. Upgrade your
                                        plan to continue.
                                    </>
                                ) : (
                                    <>
                                        You have{" "}
                                        <strong>{available_credits}</strong>{" "}
                                        credit
                                        {available_credits !== 1
                                            ? "s"
                                            : ""} but <strong>{feature}</strong>{" "}
                                        requires{" "}
                                        <strong>{required_credits}</strong>{" "}
                                        credit
                                        {required_credits !== 1 ? "s" : ""}.
                                    </>
                                )}
                            </Text>

                            {/* Credit Progress – Now with Premium Gradient + Shimmer */}
                            <BlockStack gap="200">
                                <InlineStack
                                    align="space-between"
                                    blockAlign="center"
                                >
                                    <Text variant="bodySm" tone="subdued">
                                        Available Credits
                                    </Text>
                                    <InlineStack gap="200">
                                        <Text fontWeight="semibold">
                                            {available_credits}
                                        </Text>
                                        {isCompletelyOut && (
                                            <Badge tone="critical">
                                                Depleted
                                            </Badge>
                                        )}
                                    </InlineStack>
                                </InlineStack>

                                {/* Upgraded Progress Bar */}
                                <div
                                    style={{
                                        height: "6px",
                                        background: "#fee2e2",
                                        borderRadius: "3px",
                                        overflow: "hidden",
                                        position: "relative",
                                    }}
                                >
                                    <div
                                        style={{
                                            height: "100%",
                                            width: isCompletelyOut
                                                ? "0%"
                                                : `${
                                                      (available_credits /
                                                          (available_credits +
                                                              required_credits)) *
                                                      100
                                                  }%`,
                                            background:
                                                "linear-gradient(90deg, #f87171, #f43f5e, #ec4899)",
                                            borderRadius: "3px",
                                            transition:
                                                "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                                            position: "relative",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {/* Subtle shimmer */}
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                left: "-100%",
                                                width: "50%",
                                                height: "100%",
                                                background:
                                                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                                                animation:
                                                    "shimmer 2.5s infinite",
                                            }}
                                        />
                                    </div>
                                </div>
                            </BlockStack>

                            {/* Actions */}
                            <BlockStack gap="300">
                                <Button
                                    size="large"
                                    variant="primary"
                                    fullWidth
                                    icon={CreditCardIcon}
                                    onClick={handleNavigatePricing}
                                >
                                    Upgrade Plan
                                </Button>
                                <Button
                                    size="large"
                                    fullWidth
                                    onClick={handleNavigateHome}
                                >
                                    Back to Dashboard
                                </Button>
                            </BlockStack>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>

            {/* Shimmer Animation */}
            <style jsx>{`
                @keyframes shimmer {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(200%);
                    }
                }
            `}</style>
        </Page>
    );
}
