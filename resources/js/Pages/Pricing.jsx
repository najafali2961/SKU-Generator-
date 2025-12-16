// resources/js/Pages/Pricing.jsx
import React, { useState, useMemo } from "react";
import { Head, usePage } from "@inertiajs/react";
import {
    Page,
    Layout,
    Card,
    Button,
    Text,
    Badge,
    Icon,
    Box,
    InlineStack,
    BlockStack,
    Divider,
    ButtonGroup,
} from "@shopify/polaris";
import { CheckIcon, XIcon } from "@shopify/polaris-icons";

export default function Pricing({
    plans = [],
    currentPlan = {},
    user = {},
    allFeatures = [],
}) {
    const { shop } = usePage().props || {};

    const [isLoading, setIsLoading] = useState(false);
    const [billingInterval, setBillingInterval] = useState("monthly");

    // Filter plans by billing interval
    const visiblePlans = useMemo(() => {
        return plans.filter((plan) => {
            if (billingInterval === "monthly") {
                return plan.interval === "EVERY_30_DAYS";
            }
            return plan.interval === "ANNUAL";
        });
    }, [plans, billingInterval]);

    // Get unique features from all visible plans
    const featuresInVisiblePlans = useMemo(() => {
        const featureIds = new Set();
        visiblePlans.forEach((plan) => {
            if (plan.feature_ids) {
                plan.feature_ids.forEach((id) => featureIds.add(id));
            }
        });
        return Array.from(featureIds);
    }, [visiblePlans]);

    // Map feature IDs to feature details
    const featureDetails = useMemo(() => {
        const map = {};
        allFeatures.forEach((feature) => {
            map[feature.id] = feature;
        });
        return map;
    }, [allFeatures]);

    // Group features by category
    const groupedFeatures = useMemo(() => {
        const grouped = {};
        featuresInVisiblePlans.forEach((featureId) => {
            const feature = featureDetails[featureId];
            if (feature) {
                const category = feature.category || "Other";
                if (!grouped[category]) {
                    grouped[category] = [];
                }
                grouped[category].push(feature);
            }
        });
        return grouped;
    }, [featuresInVisiblePlans, featureDetails]);

    const handleSubscribePlan = async (planId) => {
        setIsLoading(planId);

        try {
            const response = await axios.post(`/pricing/select/${planId}`);

            if (response.data.success && response.data.redirectUrl) {
                window.open(response.data.redirectUrl);
            } else {
                console.error("No redirect URL received");
                setIsLoading(null);
            }
        } catch (error) {
            console.error("Error selecting plan:", error);
            setIsLoading(null);
        }
    };

    const isCurrentPlan = (planId) => currentPlan.id === planId;

    const planHasFeature = (planId, featureId) => {
        const plan = plans.find((p) => p.id === planId);
        return plan?.feature_ids?.includes(featureId) || false;
    };

    const getCreditsDisplay = (plan) => {
        if (plan.unlimited_credits) {
            return { text: "Unlimited Credits", value: "∞" };
        }
        return {
            text: `Credits/${
                plan.interval === "EVERY_30_DAYS" ? "Month" : "Year"
            }`,
            value: plan.monthly_credits,
        };
    };

    const getIntervalLabel = (interval) => {
        return interval === "EVERY_30_DAYS" ? "month" : "year";
    };

    const getButtonText = (plan) => {
        if (isCurrentPlan(plan.id)) {
            return "Current Plan";
        }
        if (plan.trial_days > 0) {
            return `Start ${plan.trial_days}-Day Free Trial`;
        }
        return "Subscribe";
    };

    const getDiscountPercent = () => {
        if (billingInterval === "annual" && visiblePlans.length > 0) {
            const monthlyPlan = plans.find(
                (p) =>
                    p.interval === "EVERY_30_DAYS" &&
                    p.name === visiblePlans[0].name
            );
            const annualPlan = visiblePlans[0];

            if (monthlyPlan && annualPlan) {
                const monthlyYearlyCost = parseFloat(monthlyPlan.price) * 12;
                const annualCost = parseFloat(annualPlan.price) * 12;
                const discount =
                    ((monthlyYearlyCost - annualCost) / monthlyYearlyCost) *
                    100;
                return Math.round(discount);
            }
        }
        return 0;
    };

    const discountPercent = getDiscountPercent();

    return (
        <>
            <Head title="Pricing Plans" />

            <Page>
                <BlockStack gap="600">
                    {/* Billing Cycle Toggle */}
                    <InlineStack align="center" gap="200" blockAlign="center">
                        <ButtonGroup variant="segmented">
                            <Button
                                pressed={billingInterval === "monthly"}
                                onClick={() => setBillingInterval("monthly")}
                                variant={
                                    billingInterval === "monthly"
                                        ? "primary"
                                        : undefined
                                }
                            >
                                Monthly
                            </Button>
                            <Button
                                pressed={billingInterval === "annual"}
                                onClick={() => setBillingInterval("annual")}
                                variant={
                                    billingInterval === "annual"
                                        ? "primary"
                                        : undefined
                                }
                            >
                                Yearly
                                {discountPercent > 0 && (
                                    <>
                                        {" ("}
                                        <Badge tone="success">
                                            Save {discountPercent}%
                                        </Badge>
                                        {")"}
                                    </>
                                )}
                            </Button>
                        </ButtonGroup>
                    </InlineStack>

                    {/* Pricing Cards Section */}
                    <div className="relative my-5">
                        <div className="flex items-start justify-center gap-4">
                            {visiblePlans.map((plan, idx) => {
                                const isPopular =
                                    visiblePlans.length === 3 && idx === 1;
                                const isCurrent = isCurrentPlan(plan.id);
                                const credits = getCreditsDisplay(plan);

                                return (
                                    <div
                                        key={plan.id}
                                        className="relative"
                                        style={{
                                            width: "350px",
                                            maxWidth: "350px",
                                        }}
                                    >
                                        {isPopular && (
                                            <div
                                                className="absolute z-20 transform -translate-x-1/2 left-1/2"
                                                style={{ top: "-16px" }}
                                            >
                                                <Badge
                                                    tone="attention"
                                                    size="large"
                                                >
                                                    ⭐ Most Popular
                                                </Badge>
                                            </div>
                                        )}

                                        {isCurrent && (
                                            <div
                                                className="absolute z-20 transform -translate-x-1/2 left-1/2"
                                                style={{ top: "-16px" }}
                                            >
                                                <Badge
                                                    tone="success"
                                                    size="large"
                                                >
                                                    ⭐ Current Plan
                                                </Badge>
                                            </div>
                                        )}

                                        <div
                                            className={`${
                                                isPopular
                                                    ? "border-2 border-green-600 shadow-lg shadow-green-500/25 rounded-2xl"
                                                    : ""
                                            }`}
                                        >
                                            <Card>
                                                <Box padding="300">
                                                    <BlockStack gap="300">
                                                        {/* Plan Header */}
                                                        <BlockStack
                                                            gap="200"
                                                            inlineAlign="center"
                                                        >
                                                            <Text
                                                                variant="headingLg"
                                                                as="h3"
                                                                alignment="center"
                                                            >
                                                                {plan.name}
                                                            </Text>
                                                            {plan.description && (
                                                                <Text
                                                                    variant="bodySm"
                                                                    tone="subdued"
                                                                    alignment="center"
                                                                >
                                                                    {
                                                                        plan.description
                                                                    }
                                                                </Text>
                                                            )}
                                                        </BlockStack>

                                                        {/* Price and Credits */}
                                                        <BlockStack
                                                            gap="100"
                                                            inlineAlign="center"
                                                        >
                                                            <InlineStack
                                                                gap="100"
                                                                blockAlign="baseline"
                                                                align="center"
                                                            >
                                                                <Text
                                                                    variant="heading2xl"
                                                                    as="span"
                                                                >
                                                                    $
                                                                    {plan.price}
                                                                </Text>
                                                                <Text
                                                                    variant="bodyLg"
                                                                    tone="subdued"
                                                                >
                                                                    /
                                                                    {getIntervalLabel(
                                                                        plan.interval
                                                                    )}
                                                                </Text>
                                                            </InlineStack>

                                                            {billingInterval ===
                                                                "annual" && (
                                                                <Text
                                                                    variant="bodySm"
                                                                    tone="subdued"
                                                                >
                                                                    (Billed
                                                                    annually)
                                                                </Text>
                                                            )}

                                                            {/* Credits Badge */}
                                                            <Box
                                                                background="bg-surface-secondary"
                                                                padding="200"
                                                                borderRadius="100"
                                                            >
                                                                <InlineStack
                                                                    gap="200"
                                                                    blockAlign="center"
                                                                    align="center"
                                                                >
                                                                    <Text
                                                                        variant="headingSm"
                                                                        fontWeight="bold"
                                                                    >
                                                                        {
                                                                            credits.value
                                                                        }
                                                                    </Text>
                                                                    <Text variant="bodySm">
                                                                        {
                                                                            credits.text
                                                                        }
                                                                    </Text>
                                                                </InlineStack>
                                                            </Box>

                                                            {/* Trial Badge */}
                                                            {plan.trial_days >
                                                                0 &&
                                                                !isCurrent && (
                                                                    <Badge tone="info">
                                                                        {
                                                                            plan.trial_days
                                                                        }{" "}
                                                                        day free
                                                                        trial
                                                                    </Badge>
                                                                )}
                                                        </BlockStack>

                                                        {/* Subscribe Button */}
                                                        <Button
                                                            variant={
                                                                isCurrent
                                                                    ? "plain"
                                                                    : "primary"
                                                            }
                                                            size="large"
                                                            fullWidth
                                                            onClick={() =>
                                                                handleSubscribePlan(
                                                                    plan.id
                                                                )
                                                            }
                                                            loading={isLoading}
                                                            disabled={
                                                                isCurrent ||
                                                                isLoading
                                                            }
                                                        >
                                                            {getButtonText(
                                                                plan
                                                            )}
                                                        </Button>

                                                        {/* Features List */}
                                                        <BlockStack gap="200">
                                                            {plan.features &&
                                                            plan.features
                                                                .length > 0 ? (
                                                                plan.features.map(
                                                                    (
                                                                        feature,
                                                                        idx
                                                                    ) => (
                                                                        <InlineStack
                                                                            key={
                                                                                idx
                                                                            }
                                                                            gap="300"
                                                                            blockAlign="start"
                                                                        >
                                                                            <div className="flex-shrink-0 mt-1">
                                                                                <div className="flex items-center justify-center w-4 h-4 bg-green-100 rounded-full">
                                                                                    <Icon
                                                                                        source={
                                                                                            CheckIcon
                                                                                        }
                                                                                        tone="success"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <Text variant="bodySm">
                                                                                {
                                                                                    feature
                                                                                }
                                                                            </Text>
                                                                        </InlineStack>
                                                                    )
                                                                )
                                                            ) : (
                                                                <Text
                                                                    variant="bodySm"
                                                                    tone="subdued"
                                                                >
                                                                    No features
                                                                    listed
                                                                </Text>
                                                            )}
                                                        </BlockStack>
                                                    </BlockStack>
                                                </Box>
                                            </Card>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </BlockStack>
            </Page>
        </>
    );
}
