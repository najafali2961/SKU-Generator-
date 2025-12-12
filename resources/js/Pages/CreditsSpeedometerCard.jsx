import React from "react";
import {
    Card,
    Text,
    BlockStack,
    InlineStack,
    Badge,
    Box,
    Icon,
} from "@shopify/polaris";
import { CreditCardIcon } from "@shopify/polaris-icons";

export default function CreditsSpeedometerCard({ credits = {} }) {
    const creditsData = {
        plan_name: credits.plan_name || "Freemium",
        available: credits.available || 0,
        used: credits.used || 0,
        total: credits.total || 100,
        unlimited: credits.unlimited || false,
    };

    const usagePercent = creditsData.unlimited
        ? 100
        : creditsData.total === 0
        ? 0
        : Math.round((creditsData.used / creditsData.total) * 100);

    return (
        <Card background="bg-surface" borderRadius="300" padding="500">
            <BlockStack gap="300">
                {/* Header: Plan + Badge */}
                <InlineStack gap="400" blockAlign="center">
                    <Box>
                        <Icon source={CreditCardIcon} tone="success" />
                    </Box>

                    <BlockStack gap="100">
                        <InlineStack gap="200" blockAlign="center">
                            <Text variant="headingLg" fontWeight="bold" as="h2">
                                {creditsData.plan_name} Plan
                            </Text>

                            {creditsData.unlimited ? (
                                <Badge tone="success" size="large">
                                    Unlimited
                                </Badge>
                            ) : (
                                <Badge tone="info">
                                    {creditsData.available.toLocaleString()}{" "}
                                    left
                                </Badge>
                            )}
                        </InlineStack>
                    </BlockStack>
                </InlineStack>

                {/* Main Animated Gradient Progress Bar */}
                <BlockStack gap="200">
                    <div style={{ padding: "0 8px" }}>
                        <div
                            style={{
                                height: "10px",
                                background: "rgba(0,0,0,0.05)",
                                borderRadius: "12px",
                                overflow: "hidden",
                                position: "relative",
                                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
                            }}
                        >
                            {/* Animated Gradient Fill */}
                            <div
                                style={{
                                    height: "100%",
                                    width: `${usagePercent}%`,
                                    background: creditsData.unlimited
                                        ? "linear-gradient(90deg, #10b981, #34d399)"
                                        : "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)",
                                    borderRadius: "12px",
                                    transition:
                                        "width 1.6s cubic-bezier(0.16, 1, 0.3, 1)",
                                    position: "relative",
                                    overflow: "hidden",
                                }}
                            >
                                {/* Shimmer Effect */}
                                <div
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: "-150%",
                                        width: "80%",
                                        height: "100%",
                                        background:
                                            "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                                        animation: "shimmer 3s infinite",
                                        transform: "skewX(-20deg)",
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Usage Text */}
                    <InlineStack align="space-between" blockAlign="center">
                        <Text variant="bodyMd" fontWeight="semibold">
                            {creditsData.used.toLocaleString()} used
                        </Text>
                        <Text
                            variant="bodyMd"
                            tone="subdued"
                            fontWeight="semibold"
                        >
                            {creditsData.total.toLocaleString()} total
                        </Text>
                    </InlineStack>
                </BlockStack>
            </BlockStack>

            {/* Shimmer Animation */}
            <style jsx>{`
                @keyframes shimmer {
                    0% {
                        transform: translateX(-100%) skewX(-20deg);
                    }
                    100% {
                        transform: translateX(200%) skewX(-20deg);
                    }
                }
            `}</style>
        </Card>
    );
}
