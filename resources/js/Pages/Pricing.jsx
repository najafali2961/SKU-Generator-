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
    RangeSlider,
    TextField,
} from "@shopify/polaris";
import { CheckIcon, XIcon } from "@shopify/polaris-icons";

export default function Pricing({
    plans = [],
    currentPlan = {},
    user = {},
    allFeatures = [],
    settings = {},
}) {
    const { shop } = usePage().props || {};

    const [isLoading, setIsLoading] = useState(false);
    const [billingInterval, setBillingInterval] = useState("monthly");

    // Custom Calculator State
    const customCreditMin =
        parseInt(settings?.custom_credit_min_amount) || 1000;
    const customCreditPrice =
        parseFloat(settings?.custom_credit_price_per_unit) || 0.05;
    const [customCredits, setCustomCredits] = useState(customCreditMin);
    const calculatedPrice = (customCredits * customCreditPrice).toFixed(2);

    const handleCustomSliderChange = (value) => {
        setCustomCredits(parseInt(value, 10));
    };

    const handleCustomSubscribe = async () => {
        setIsLoading("custom");
        try {
            const response = await axios.post(route("pricing.select.custom"), {
                credits: customCredits,
                price: calculatedPrice,
            });
            if (response.data.success && response.data.redirectUrl) {
                window.top.location.href = response.data.redirectUrl;
            }
        } catch (error) {
            console.error("Custom plan error", error);
            alert("Could not process custom plan request.");
        } finally {
            setIsLoading(false);
        }
    };

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
                window.top.location.href = response.data.redirectUrl;
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
            const annualPlan = visiblePlans[0];
            const baseName = annualPlan.name.replace(
                /\s*(Annual|Yearly)\s*/i,
                "",
            );
            const monthlyPlan = plans.find(
                (p) =>
                    p.interval === "EVERY_30_DAYS" &&
                    (p.name === annualPlan.name || p.name === baseName),
            );

            if (monthlyPlan && annualPlan) {
                const monthlyYearlyCost = parseFloat(monthlyPlan.price) * 12;
                const annualCost = parseFloat(annualPlan.price) * 12;
                if (monthlyYearlyCost > 0) {
                    const discount =
                        ((monthlyYearlyCost - annualCost) / monthlyYearlyCost) *
                        100;
                    return Math.round(discount);
                }
            }
        }
        return 0;
    };

    const getPlanDiscountPercent = (annualPlan) => {
        if (annualPlan.interval === "ANNUAL") {
            const baseName = annualPlan.name.replace(
                /\s*(Annual|Yearly)\s*/i,
                "",
            );
            const monthlyPlan = plans.find(
                (p) =>
                    p.interval === "EVERY_30_DAYS" &&
                    (p.name === annualPlan.name || p.name === baseName),
            );
            if (monthlyPlan) {
                const monthlyYearlyCost = parseFloat(monthlyPlan.price) * 12;
                const annualCost = parseFloat(annualPlan.price) * 12;
                if (monthlyYearlyCost > 0) {
                    const discount =
                        ((monthlyYearlyCost - annualCost) / monthlyYearlyCost) *
                        100;
                    return Math.round(discount);
                }
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
                                <div className="flex items-center min-h-[24px]">
                                    Monthly
                                </div>
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
                                <div className="flex items-center min-h-[24px]">
                                    <InlineStack blockAlign="center" gap="100">
                                        <span>Yearly</span>
                                        {(settings?.yearly_discount_badge ||
                                            discountPercent > 0) && (
                                            <Badge tone="success" size="small">
                                                {settings?.yearly_discount_badge ||
                                                    `Save ${discountPercent}%`}
                                            </Badge>
                                        )}
                                    </InlineStack>
                                </div>
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
                                        {(isPopular || isCurrent) && (
                                            <div
                                                className="absolute z-20 flex gap-2 transform -translate-x-1/2 left-1/2"
                                                style={{
                                                    top: "-16px",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {isPopular && (
                                                    <Badge
                                                        tone="attention"
                                                        size="large"
                                                    >
                                                        ⭐ Most Popular
                                                    </Badge>
                                                )}
                                                {isCurrent && (
                                                    <Badge
                                                        tone="success"
                                                        size="large"
                                                    >
                                                        ⭐ Current Plan
                                                    </Badge>
                                                )}
                                            </div>
                                        )}

                                        <div
                                            className={`${
                                                isPopular
                                                    ? "border-2 border-purple-600 shadow-lg shadow-purple-500/25 rounded-2xl"
                                                    : isCurrent
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
                                                                        plan.interval,
                                                                    )}
                                                                </Text>
                                                            </InlineStack>

                                                            {billingInterval ===
                                                                "annual" && (
                                                                <BlockStack
                                                                    gap="100"
                                                                    inlineAlign="center"
                                                                >
                                                                    <Text
                                                                        variant="bodySm"
                                                                        tone="subdued"
                                                                    >
                                                                        (Billed
                                                                        annually)
                                                                    </Text>
                                                                    {getPlanDiscountPercent(
                                                                        plan,
                                                                    ) > 0 && (
                                                                        <Badge tone="success">
                                                                            Save{" "}
                                                                            {getPlanDiscountPercent(
                                                                                plan,
                                                                            )}
                                                                            %
                                                                            yearly
                                                                        </Badge>
                                                                    )}
                                                                </BlockStack>
                                                            )}

                                                            {/* Credits Display */}
                                                            <Text
                                                                variant="bodyLg"
                                                                as="p"
                                                                fontWeight="medium"
                                                            >
                                                                {credits.value}{" "}
                                                                {credits.text}
                                                            </Text>
                                                        </BlockStack>

                                                        {/* Features List */}
                                                        <BlockStack gap="400">
                                                            <div className="min-h-[200px]">
                                                                <BlockStack gap="200">
                                                                    {allFeatures &&
                                                                    allFeatures.length >
                                                                        0 ? (
                                                                        allFeatures
                                                                            .slice()
                                                                            .sort(
                                                                                (
                                                                                    a,
                                                                                    b,
                                                                                ) => {
                                                                                    const aHas =
                                                                                        plan.feature_ids?.includes(
                                                                                            a.id,
                                                                                        );
                                                                                    const bHas =
                                                                                        plan.feature_ids?.includes(
                                                                                            b.id,
                                                                                        );
                                                                                    // Included (true) comes first (-1), Excluded (false) comes last (1)
                                                                                    if (
                                                                                        aHas ===
                                                                                        bHas
                                                                                    )
                                                                                        return 0;
                                                                                    return aHas
                                                                                        ? -1
                                                                                        : 1;
                                                                                },
                                                                            )
                                                                            .map(
                                                                                (
                                                                                    feature,
                                                                                    idx,
                                                                                ) => {
                                                                                    const hasFeature =
                                                                                        plan.feature_ids?.includes(
                                                                                            feature.id,
                                                                                        );
                                                                                    return (
                                                                                        <InlineStack
                                                                                            key={
                                                                                                feature.id
                                                                                            }
                                                                                            gap="400"
                                                                                            blockAlign="start"
                                                                                        >
                                                                                            <div className="flex-shrink-0 mt-0.5">
                                                                                                <div
                                                                                                    className={`flex items-center justify-center w-4 h-4 rounded-full ${
                                                                                                        hasFeature
                                                                                                            ? "bg-green-100"
                                                                                                            : "bg-red-50"
                                                                                                    }`}
                                                                                                >
                                                                                                    <Icon
                                                                                                        source={
                                                                                                            hasFeature
                                                                                                                ? CheckIcon
                                                                                                                : XIcon
                                                                                                        }
                                                                                                        tone={
                                                                                                            hasFeature
                                                                                                                ? "success"
                                                                                                                : "critical"
                                                                                                        }
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                            <Text
                                                                                                variant="bodySm"
                                                                                                tone={
                                                                                                    hasFeature
                                                                                                        ? "base"
                                                                                                        : "subdued"
                                                                                                }
                                                                                            >
                                                                                                {feature.name ||
                                                                                                    feature}
                                                                                            </Text>
                                                                                        </InlineStack>
                                                                                    );
                                                                                },
                                                                            )
                                                                    ) : plan.features &&
                                                                      plan
                                                                          .features
                                                                          .length >
                                                                          0 ? (
                                                                        // Fallback to old string list if allFeatures not provided
                                                                        plan.features.map(
                                                                            (
                                                                                feature,
                                                                                idx,
                                                                            ) => (
                                                                                <InlineStack
                                                                                    key={
                                                                                        idx
                                                                                    }
                                                                                    gap="400"
                                                                                    blockAlign="start"
                                                                                >
                                                                                    <div className="flex-shrink-0 mt-0.5">
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
                                                                            ),
                                                                        )
                                                                    ) : (
                                                                        <Text
                                                                            variant="bodySm"
                                                                            tone="subdued"
                                                                        >
                                                                            No
                                                                            features
                                                                            listed
                                                                        </Text>
                                                                    )}
                                                                </BlockStack>
                                                            </div>
                                                        </BlockStack>

                                                        {/* Subscribe Button - Moved to Bottom */}
                                                        <Box paddingBlockStart="400">
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
                                                                        plan.id,
                                                                    )
                                                                }
                                                                loading={
                                                                    isLoading ===
                                                                    plan.id
                                                                }
                                                                disabled={
                                                                    isCurrent ||
                                                                    isLoading
                                                                }
                                                            >
                                                                {getButtonText(
                                                                    plan,
                                                                )}
                                                            </Button>
                                                        </Box>
                                                    </BlockStack>
                                                </Box>
                                            </Card>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Combined Bottom Section */}
                    <Box paddingBlockStart="800">
                        <Card>
                            <BlockStack gap="600">
                                {/* Free Plan Section (Only if applicable) */}
                                {user?.is_freemium && !currentPlan.id && (
                                    <>
                                        <InlineStack
                                            align="space-between"
                                            blockAlign="center"
                                            wrap={false}
                                        >
                                            <InlineStack
                                                gap="400"
                                                blockAlign="center"
                                            >
                                                <Badge
                                                    tone="success"
                                                    size="large"
                                                >
                                                    Free Plan Active
                                                </Badge>
                                                <Text
                                                    variant="bodyMd"
                                                    tone="subdued"
                                                >
                                                    Currently enjoying Free Tier
                                                    benefits (
                                                    {user.credits || 0} Credits
                                                    / Forever)
                                                </Text>
                                            </InlineStack>
                                            <div className="flex-shrink-0">
                                                <Button disabled>
                                                    Current Plan
                                                </Button>
                                            </div>
                                        </InlineStack>
                                        <Divider />
                                    </>
                                )}

                                {/* Custom Credits Calculator */}
                                <InlineStack
                                    align="start"
                                    blockAlign="center"
                                    wrap={false}
                                    gap="800"
                                >
                                    <div style={{ flex: "0 0 250px" }}>
                                        <Text variant="headingMd" as="h2">
                                            Need More Credits?
                                        </Text>
                                        <Box paddingBlockStart="100">
                                            <Text
                                                variant="bodyMd"
                                                tone="subdued"
                                            >
                                                Scale your store with a custom
                                                plan (${customCreditPrice}
                                                /credit/month).
                                            </Text>
                                        </Box>
                                    </div>

                                    <div
                                        style={{
                                            flex: "1 1 auto",
                                            background:
                                                "var(--p-color-bg-surface-secondary)",
                                            padding: "16px",
                                            borderRadius: "8px",
                                        }}
                                    >
                                        <InlineStack
                                            gap="400"
                                            blockAlign="center"
                                            wrap={false}
                                        >
                                            <div
                                                style={{ paddingRight: "8px" }}
                                            >
                                                <Text
                                                    variant="bodyXs"
                                                    tone="subdued"
                                                    fontWeight="bold"
                                                >
                                                    SELECT AMOUNT
                                                </Text>
                                            </div>

                                            <div
                                                style={{
                                                    flexGrow: 1,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "12px",
                                                }}
                                            >
                                                <div style={{ flexGrow: 1 }}>
                                                    <RangeSlider
                                                        label="Select precise credits needed"
                                                        labelHidden
                                                        min={customCreditMin}
                                                        max={
                                                            customCreditMin *
                                                            100
                                                        }
                                                        step={50}
                                                        value={customCredits}
                                                        onChange={
                                                            handleCustomSliderChange
                                                        }
                                                    />
                                                </div>
                                                <Text
                                                    variant="headingLg"
                                                    tone="subdued"
                                                >
                                                    ∞
                                                </Text>
                                            </div>

                                            <div style={{ width: "160px" }}>
                                                <TextField
                                                    type="number"
                                                    value={customCredits.toString()}
                                                    onChange={
                                                        handleCustomSliderChange
                                                    }
                                                    autoComplete="off"
                                                    suffix="Credits"
                                                    min={customCreditMin}
                                                />
                                            </div>

                                            <div className="flex-shrink-0 ml-2">
                                                <Button
                                                    variant="primary"
                                                    size="large"
                                                    onClick={
                                                        handleCustomSubscribe
                                                    }
                                                    loading={
                                                        isLoading === "custom"
                                                    }
                                                    disabled={
                                                        isLoading !== false &&
                                                        isLoading !== "custom"
                                                    }
                                                >
                                                    Subscribe for $
                                                    {calculatedPrice}
                                                </Button>
                                            </div>
                                        </InlineStack>
                                    </div>
                                </InlineStack>
                            </BlockStack>
                        </Card>
                    </Box>
                </BlockStack>
            </Page>
        </>
    );
}
