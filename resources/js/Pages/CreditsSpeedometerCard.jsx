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
    const isUnlimited =
        credits.unlimited ||
        (credits.plan_name &&
            credits.plan_name.toLowerCase().includes("unlimited"));

    const creditsData = {
        plan_name: credits.plan_name || "Free Plan",
        available: credits.available || 0,
        used: credits.used || 0,
        total: credits.total || 0,
        unlimited: isUnlimited,
    };

    const remainingPercent = creditsData.unlimited
        ? 100
        : creditsData.total === 0
          ? 0
          : Math.round((creditsData.available / creditsData.total) * 100);

    const size = 90;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const fillOffset = circumference - (remainingPercent / 100) * circumference;

    return (
        <Card background="bg-surface" borderRadius="300" padding="600">
            <InlineStack align="space-between" blockAlign="center" wrap={false}>
                {/* Left: Plan details */}

                <InlineStack gap="200" blockAlign="center">
                    <div
                        style={{
                            background: "rgba(149, 191, 71, 0.12)",
                            borderRadius: "10px",
                            padding: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Icon source={CreditCardIcon} tone="success" />
                    </div>
                    <BlockStack gap="050">
                        <Text variant="headingLg" fontWeight="bold" as="h2">
                            {creditsData.plan_name} Plan
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                            Credit Usage Overview
                        </Text>
                    </BlockStack>
                </InlineStack>

                <InlineStack gap="400" blockAlign="center">
                    <BlockStack gap="200">
                        <Text variant="headingLg" fontWeight="bold">
                            {creditsData.used.toLocaleString()}
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                            Used
                        </Text>
                    </BlockStack>
                    <div
                        style={{
                            width: "1px",
                            height: "32px",
                            background: "rgba(0,0,0,0.1)",
                        }}
                    />
                    <BlockStack gap="200">
                        <Text variant="headingLg" fontWeight="bold">
                            {creditsData.unlimited
                                ? "Infinity"
                                : creditsData.available.toLocaleString()}
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                            Remaining
                        </Text>
                    </BlockStack>
                    <div
                        style={{
                            width: "1px",
                            height: "32px",
                            background: "rgba(0,0,0,0.1)",
                        }}
                    />
                    <BlockStack gap="200">
                        <Text variant="headingLg" fontWeight="bold">
                            {creditsData.unlimited
                                ? "Infinity"
                                : creditsData.total.toLocaleString()}
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                            Total
                        </Text>
                    </BlockStack>
                </InlineStack>
                {/* Right: Circular Progress */}
                <div
                    style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {/* Subtle glow behind */}
                    <div
                        style={{
                            position: "absolute",
                            width: size - 10,
                            height: size - 10,
                            borderRadius: "50%",
                            background: "rgba(149, 191, 71, 0.08)",
                            filter: "blur(8px)",
                        }}
                    />
                    <svg
                        width={size}
                        height={size}
                        style={{ transform: "rotate(-90deg)" }}
                    >
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke="rgba(0,0,0,0.06)"
                            strokeWidth={strokeWidth}
                        />
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke="#95BF47"
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={fillOffset}
                            style={{
                                transition: "stroke-dashoffset 0.8s ease-out",
                                filter: "drop-shadow(0 0 4px rgba(149, 191, 71, 0.4))",
                            }}
                        />
                    </svg>
                    <div
                        style={{
                            position: "absolute",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "18px",
                                fontWeight: 700,
                                color: "#202223",
                                lineHeight: 1,
                            }}
                        >
                            {remainingPercent}%
                        </span>
                        <span
                            style={{
                                fontSize: "10px",
                                color: "#6d7175",
                                marginTop: "2px",
                            }}
                        >
                            left
                        </span>
                    </div>
                </div>
            </InlineStack>
        </Card>
    );
}
