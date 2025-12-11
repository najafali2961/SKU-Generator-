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
} from "@shopify/polaris";
import {
    CheckIcon,
    StarFilledIcon,
    CreditCardIcon,
} from "@shopify/polaris-icons";
import { router } from "@inertiajs/react";
import axios from "axios";

export default function Pricing({ plans = [], currentPlan = {}, user = {} }) {
    const [loading, setLoading] = useState(null);

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
        if (plan.name === "Pro Annual") {
            return <Badge tone="success">Save 17%</Badge>;
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

    return (
        <Page
            title="Choose Your Plan"
            subtitle="Select the perfect plan for your business needs"
        >
            <Layout>
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

                {/* Pricing Cards */}
                <Layout.Section>
                    <InlineGrid columns={{ xs: 1, sm: 2, lg: 3 }} gap="400">
                        {plans.map((plan) => {
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

                                                {plan.trial_days > 0 &&
                                                    !isCurrent && (
                                                        <Badge tone="info">
                                                            {plan.trial_days}{" "}
                                                            day free trial
                                                        </Badge>
                                                    )}

                                                {plan.capped_amount && (
                                                    <Text
                                                        tone="subdued"
                                                        variant="bodySm"
                                                    >
                                                        {plan.terms}
                                                    </Text>
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

                {/* Current Status Banner */}
                <Layout.Section>
                    {isFreemium ? (
                        <Banner title="You're on the Free Plan" tone="info">
                            <p>
                                Upgrade to unlock unlimited SKU & barcode
                                generation, advanced features, and priority
                                support.
                            </p>
                        </Banner>
                    ) : (
                        <Banner
                            title={`Active Plan: ${currentPlan.name}`}
                            tone="success"
                        >
                            <p>
                                You're currently on the {currentPlan.name} plan.
                                You can upgrade or change your plan anytime.
                            </p>
                        </Banner>
                    )}
                </Layout.Section>
            </Layout>
        </Page>
    );
}
