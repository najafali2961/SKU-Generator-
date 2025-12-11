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
    Badge,
    Icon,
    Divider,
    Banner,
    ProgressBar,
} from "@shopify/polaris";
import {
    CheckIcon,
    StarFilledIcon,
    CreditCardIcon,
} from "@shopify/polaris-icons";
import { router } from "@inertiajs/react";
import axios from "axios";

export default function Pricing({
    plans = [],
    currentPlan = {},
    user = {},
    creditStats = {},
    creditCosts = {},
}) {
    const [loading, setLoading] = useState(null);
    const [billingInterval, setBillingInterval] = useState("monthly");

    const handleSelectPlan = async (planId) => {
        setLoading(planId);

        try {
            const response = await axios.post(`/pricing/select/${planId}`, {
                plan_id: planId,
            });

            if (response.data.success && response.data.redirectUrl) {
                window.open(response.data.redirectUrl, "_blank");
            } else {
                console.error("No redirect URL received");
                setLoading(null);
            }
        } catch (error) {
            console.error("Error selecting plan:", error);
            setLoading(null);
        }
    };

    const isCurrentPlan = (planId) => {
        return currentPlan.id === planId;
    };

    const isFreemium = user.shopify_freemium === 1;

    const getPlanBadge = (plan) => {
        if (plan.name === "Pro Annual" || plan.interval === "ANNUAL") {
            return <Badge tone="success">Save 17%</Badge>;
        }
        if (plan.unlimited_credits) {
            return <Badge tone="magic">Best Value</Badge>;
        }
        return null;
    };

    const getButtonText = (plan) => {
        if (isCurrentPlan(plan.id)) {
            return "Current Plan";
        }
        if (plan.trial_days > 0) {
            return `Start ${plan.trial_days}-Day Free Trial`;
        }
        return "Select Plan";
    };

    const getCreditProgress = () => {
        if (creditStats.unlimited) {
            return 100;
        }
        const total = currentPlan.monthly_credits || 10;
        const used = creditStats.used || 0;
        return Math.min((used / total) * 100, 100);
    };

    // Filter plans based on billing interval
    const filteredPlans = plans.filter((plan) => {
        if (billingInterval === "monthly") {
            return plan.interval === "EVERY_30_DAYS";
        } else {
            return plan.interval === "ANNUAL";
        }
    });

    // Custom toggle button component
    const BillingToggle = () => (
        <Box padding="100" background="bg-surface-secondary" borderRadius="400">
            <InlineStack gap="0">
                <button
                    onClick={() => setBillingInterval("monthly")}
                    style={{
                        padding: "12px 32px",
                        border: "none",
                        borderRadius: "12px",
                        background:
                            billingInterval === "monthly"
                                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                                : "transparent",
                        color:
                            billingInterval === "monthly"
                                ? "white"
                                : "var(--p-color-text)",
                        fontWeight:
                            billingInterval === "monthly" ? "600" : "500",
                        fontSize: "15px",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        boxShadow:
                            billingInterval === "monthly"
                                ? "0 4px 12px rgba(102, 126, 234, 0.4)"
                                : "none",
                    }}
                >
                    Monthly
                </button>
                <button
                    onClick={() => setBillingInterval("annual")}
                    style={{
                        padding: "12px 32px",
                        border: "none",
                        borderRadius: "12px",
                        background:
                            billingInterval === "annual"
                                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                                : "transparent",
                        color:
                            billingInterval === "annual"
                                ? "white"
                                : "var(--p-color-text)",
                        fontWeight:
                            billingInterval === "annual" ? "600" : "500",
                        fontSize: "15px",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        boxShadow:
                            billingInterval === "annual"
                                ? "0 4px 12px rgba(102, 126, 234, 0.4)"
                                : "none",
                    }}
                >
                    <InlineStack gap="200" blockAlign="center">
                        <span>Annual</span>
                        <Badge tone="success" size="small">
                            Save 17%
                        </Badge>
                    </InlineStack>
                </button>
            </InlineStack>
        </Box>
    );

    return (
        <Page>
            <Layout>
                {/* Billing Toggle */}
                <Layout.Section>
                    <Box paddingBlockStart="400" paddingBlockEnd="400">
                        <InlineStack align="center" blockAlign="center">
                            <BillingToggle />
                        </InlineStack>
                    </Box>
                </Layout.Section>

                {/* Pricing Cards */}
                <Layout.Section>
                    <InlineGrid
                        columns={{ xs: 1, sm: 2, lg: filteredPlans.length }}
                        gap="400"
                    >
                        {filteredPlans.map((plan) => {
                            const isPopular = plan.name === "Pro";
                            const isCurrent = isCurrentPlan(plan.id);

                            return (
                                <Box key={plan.id} position="relative">
                                    {isPopular && (
                                        <Box
                                            position="absolute"
                                            insetBlockStart="0"
                                            insetInlineStart="50%"
                                            style={{
                                                transform:
                                                    "translate(-50%, -50%)",
                                                zIndex: 10,
                                            }}
                                        >
                                            <Badge
                                                tone="attention"
                                                size="large"
                                            >
                                                Most Popular
                                            </Badge>
                                        </Box>
                                    )}

                                    <Card>
                                        <BlockStack gap="400">
                                            {/* Plan Header */}
                                            <BlockStack gap="300">
                                                <InlineStack
                                                    align="space-between"
                                                    blockAlign="start"
                                                >
                                                    <Text
                                                        variant="headingLg"
                                                        fontWeight="bold"
                                                    >
                                                        {plan.name}
                                                    </Text>
                                                    {isCurrent && (
                                                        <Badge tone="success">
                                                            Active
                                                        </Badge>
                                                    )}
                                                    {!isCurrent &&
                                                        getPlanBadge(plan)}
                                                </InlineStack>

                                                <InlineStack
                                                    blockAlign="baseline"
                                                    gap="100"
                                                >
                                                    <Text
                                                        variant="heading2xl"
                                                        fontWeight="bold"
                                                    >
                                                        ${plan.price}
                                                    </Text>
                                                    <Text tone="subdued">
                                                        /
                                                        {plan.interval ===
                                                        "EVERY_30_DAYS"
                                                            ? "month"
                                                            : "year"}
                                                    </Text>
                                                </InlineStack>

                                                {/* Credits Display */}
                                                <Box
                                                    background="bg-surface-secondary"
                                                    padding="300"
                                                    borderRadius="200"
                                                >
                                                    <InlineStack
                                                        gap="200"
                                                        blockAlign="center"
                                                    >
                                                        {plan.unlimited_credits ? (
                                                            <>
                                                                <Text
                                                                    variant="headingMd"
                                                                    fontWeight="bold"
                                                                >
                                                                    ∞
                                                                </Text>
                                                                <Text>
                                                                    Unlimited
                                                                    Credits
                                                                </Text>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Text
                                                                    variant="headingMd"
                                                                    fontWeight="bold"
                                                                >
                                                                    {
                                                                        plan.monthly_credits
                                                                    }
                                                                </Text>
                                                                <Text>
                                                                    credits/
                                                                    {plan.interval ===
                                                                    "EVERY_30_DAYS"
                                                                        ? "month"
                                                                        : "year"}
                                                                </Text>
                                                            </>
                                                        )}
                                                    </InlineStack>
                                                </Box>

                                                {plan.trial_days > 0 &&
                                                    !isCurrent && (
                                                        <Badge tone="info">
                                                            {plan.trial_days}{" "}
                                                            day free trial
                                                        </Badge>
                                                    )}
                                            </BlockStack>

                                            <Divider />

                                            {/* Features List */}
                                            <BlockStack gap="300">
                                                {plan.features.map(
                                                    (feature, idx) => (
                                                        <InlineStack
                                                            key={idx}
                                                            gap="300"
                                                            blockAlign="start"
                                                        >
                                                            <Box
                                                                background="bg-surface-success"
                                                                padding="100"
                                                                borderRadius="full"
                                                                minWidth="20px"
                                                            >
                                                                <Icon
                                                                    source={
                                                                        CheckIcon
                                                                    }
                                                                    tone="success"
                                                                />
                                                            </Box>
                                                            <Text>
                                                                {feature}
                                                            </Text>
                                                        </InlineStack>
                                                    )
                                                )}
                                            </BlockStack>

                                            <Divider />

                                            {/* Action Button */}
                                            <Button
                                                variant={
                                                    isCurrent
                                                        ? "plain"
                                                        : "primary"
                                                }
                                                size="large"
                                                fullWidth
                                                disabled={isCurrent}
                                                loading={loading === plan.id}
                                                onClick={() =>
                                                    handleSelectPlan(plan.id)
                                                }
                                                icon={
                                                    !isCurrent && (
                                                        <Icon
                                                            source={
                                                                CreditCardIcon
                                                            }
                                                        />
                                                    )
                                                }
                                            >
                                                {getButtonText(plan)}
                                            </Button>
                                        </BlockStack>
                                    </Card>
                                </Box>
                            );
                        })}
                    </InlineGrid>
                </Layout.Section>

                {/* Support CTA */}
                <Layout.Section>
                    <Box
                        background="bg-surface-secondary"
                        padding="400"
                        borderRadius="300"
                    >
                        <InlineStack
                            align="space-between"
                            blockAlign="center"
                            gap="400"
                            wrap={false}
                        >
                            <BlockStack gap="200">
                                <Text variant="headingMd" fontWeight="semibold">
                                    Need help choosing?
                                </Text>
                                <Text tone="subdued">
                                    Our support team is here to help you find
                                    the perfect plan for your business
                                </Text>
                            </BlockStack>
                            <Button
                                url="/support"
                                icon={<Icon source={StarFilledIcon} />}
                            >
                                Contact Support
                            </Button>
                        </InlineStack>
                    </Box>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
