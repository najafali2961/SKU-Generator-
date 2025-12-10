import React, { useState, useEffect } from "react";
import {
    Page,
    Layout,
    Card,
    Text,
    BlockStack,
    InlineStack,
    Button,
    Badge,
    Icon,
    Divider,
    Banner,
    Spinner,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import { router } from "@inertiajs/react";

export default function Billing({ plan, shop }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleConfirmPlan = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/billing/${plan.id}/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": document
                        .querySelector('meta[name="csrf-token"]')
                        .getAttribute("content"),
                },
            });

            const data = await response.json();

            if (data.success && data.confirmationUrl) {
                // Redirect to Shopify's billing confirmation page
                window.top.location.href = data.confirmationUrl;
            } else {
                setError(data.message || "Failed to create charge");
                setLoading(false);
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.visit("/pricing");
    };

    return (
        <Page
            title="Confirm Your Plan"
            subtitle="Review your plan details before confirming"
            backAction={{ content: "Back to Pricing", onAction: handleCancel }}
        >
            <Layout>
                {error && (
                    <Layout.Section>
                        <Banner
                            tone="critical"
                            onDismiss={() => setError(null)}
                        >
                            {error}
                        </Banner>
                    </Layout.Section>
                )}

                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            {/* Plan Header */}
                            <BlockStack gap="300">
                                <InlineStack
                                    align="space-between"
                                    blockAlign="center"
                                >
                                    <Text variant="headingLg" fontWeight="bold">
                                        {plan.name}
                                    </Text>
                                    {plan.name === "Pro Annual" && (
                                        <Badge tone="success">Save 17%</Badge>
                                    )}
                                </InlineStack>

                                <InlineStack blockAlign="baseline" gap="100">
                                    <Text
                                        variant="heading2xl"
                                        fontWeight="bold"
                                    >
                                        ${plan.price}
                                    </Text>
                                    <Text tone="subdued">
                                        /
                                        {plan.interval === "EVERY_30_DAYS"
                                            ? "month"
                                            : "year"}
                                    </Text>
                                </InlineStack>

                                {plan.trial_days > 0 && (
                                    <Banner tone="info">
                                        <p>
                                            You'll get a {plan.trial_days} day
                                            free trial. Your card won't be
                                            charged until the trial ends.
                                        </p>
                                    </Banner>
                                )}

                                {plan.capped_amount && (
                                    <Text tone="subdued" variant="bodySm">
                                        {plan.terms}
                                    </Text>
                                )}
                            </BlockStack>

                            <Divider />

                            {/* Features */}
                            <BlockStack gap="300">
                                <Text variant="headingMd" fontWeight="semibold">
                                    What's included:
                                </Text>

                                {plan.features.map((feature, idx) => (
                                    <InlineStack
                                        key={idx}
                                        gap="300"
                                        blockAlign="start"
                                    >
                                        <Icon
                                            source={CheckIcon}
                                            tone="success"
                                        />
                                        <Text>{feature}</Text>
                                    </InlineStack>
                                ))}
                            </BlockStack>

                            <Divider />

                            {/* Billing Info */}
                            <BlockStack gap="200">
                                <Text variant="headingMd" fontWeight="semibold">
                                    Billing Information
                                </Text>
                                <Text tone="subdued">
                                    • Charges will appear on your Shopify
                                    invoice
                                </Text>
                                <Text tone="subdued">
                                    • You can cancel or change your plan anytime
                                </Text>
                                <Text tone="subdued">
                                    • No hidden fees or setup costs
                                </Text>
                            </BlockStack>

                            <Divider />

                            {/* Action Buttons */}
                            <InlineStack gap="300" align="end">
                                <Button
                                    onClick={handleCancel}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleConfirmPlan}
                                    loading={loading}
                                >
                                    {loading
                                        ? "Creating charge..."
                                        : plan.trial_days > 0
                                        ? `Start ${plan.trial_days}-Day Free Trial`
                                        : "Confirm & Subscribe"}
                                </Button>
                            </InlineStack>
                        </BlockStack>
                    </Card>
                </Layout.Section>

                {/* Terms Notice */}
                <Layout.Section>
                    <Card>
                        <BlockStack gap="200">
                            <Text variant="headingMd" fontWeight="semibold">
                                Terms & Conditions
                            </Text>
                            <Text tone="subdued">
                                By confirming this plan, you agree to be charged
                                the amount shown above. The charge will be
                                billed through Shopify and will appear on your
                                Shopify invoice. You can cancel or modify your
                                subscription at any time from the Pricing page.
                            </Text>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
