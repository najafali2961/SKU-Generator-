import React from "react";
import { router, usePage } from "@inertiajs/react";
import {
    Page,
    Layout,
    Card,
    Text,
    BlockStack,
    Button,
    Icon,
    InlineStack,
    Box,
    Banner,
    Grid,
    ProgressBar,
} from "@shopify/polaris";
import {
    AlertCircleIcon,
    CreditCardIcon,
    ArrowRightIcon,
    HomeIcon,
} from "@shopify/polaris-icons";

export default function NoCreditPage({
    feature = "This Feature",
    required_credits = 1,
    available_credits = 0,
}) {
    const { url } = usePage();

    const creditInfo = [
        {
            icon: "📊",
            title: "SKU Generation",
            cost: "1 Credit",
        },
        {
            icon: "📦",
            title: "Barcode Generation",
            cost: "1 Credit",
        },
        {
            icon: "🏷️",
            title: "Label Printing",
            cost: "2 Credits",
        },
    ];

    const handleNavigateHome = () => {
        router.visit("/");
    };

    const handleNavigatePricing = () => {
        router.visit("/pricing");
    };

    return (
        <Page title="Credits Depleted">
            <Layout>
                <Layout.Section>
                    <BlockStack gap="600">
                        {/* Main Alert Card */}
                        <Card>
                            <BlockStack gap="600" align="center">
                                {/* Icon Box */}
                                <Box
                                    background="bg-surface-critical-subdued"
                                    padding="600"
                                    borderRadius="400"
                                    textAlign="center"
                                >
                                    <Icon
                                        source={AlertCircleIcon}
                                        tone="critical"
                                        scale="xl"
                                    />
                                </Box>

                                {/* Heading & Description */}
                                <BlockStack gap="300" align="center">
                                    <Text
                                        variant="heading2xl"
                                        alignment="center"
                                        as="h1"
                                    >
                                        You've run out of credits
                                    </Text>

                                    {available_credits === 0 ? (
                                        <Text
                                            tone="subdued"
                                            alignment="center"
                                            variant="bodyLg"
                                        >
                                            You need credits to access{" "}
                                            <strong>{feature}</strong>. Upgrade
                                            your plan to continue.
                                        </Text>
                                    ) : (
                                        <BlockStack gap="200" align="center">
                                            <Text
                                                tone="subdued"
                                                alignment="center"
                                                variant="bodyLg"
                                            >
                                                You have{" "}
                                                <strong>
                                                    {available_credits} credit
                                                    {available_credits !== 1
                                                        ? "s"
                                                        : ""}
                                                </strong>{" "}
                                                remaining.
                                            </Text>
                                            <Text
                                                tone="warning"
                                                alignment="center"
                                                variant="bodyMd"
                                            >
                                                <strong>{feature}</strong>{" "}
                                                requires{" "}
                                                <strong>
                                                    {required_credits} credit
                                                    {required_credits !== 1
                                                        ? "s"
                                                        : ""}
                                                </strong>{" "}
                                                to proceed.
                                            </Text>
                                        </BlockStack>
                                    )}
                                </BlockStack>

                                {/* Credit Usage Info */}
                                <Box
                                    background="bg-surface-secondary-subdued"
                                    padding="400"
                                    borderRadius="300"
                                    width="100%"
                                >
                                    <BlockStack gap="300">
                                        <Text variant="headingSm" as="h3">
                                            📈 Your Credit Balance
                                        </Text>
                                        <ProgressBar
                                            progress={
                                                available_credits > 0 ? 75 : 0
                                            }
                                            tone={
                                                available_credits > 0
                                                    ? "warning"
                                                    : "critical"
                                            }
                                            size="small"
                                        />
                                        <InlineStack>
                                            <Text
                                                tone="subdued"
                                                variant="bodySm"
                                            >
                                                {available_credits}{" "}
                                                {available_credits !== 1
                                                    ? "credits"
                                                    : "credit"}{" "}
                                                remaining
                                            </Text>
                                        </InlineStack>
                                    </BlockStack>
                                </Box>

                                {/* Action Buttons */}
                                <InlineStack gap="300">
                                    <Button
                                        variant="primary"
                                        size="large"
                                        icon={CreditCardIcon}
                                        onClick={handleNavigatePricing}
                                    >
                                        Upgrade Plan
                                    </Button>

                                    <Button
                                        size="large"
                                        icon={HomeIcon}
                                        onClick={handleNavigateHome}
                                    >
                                        Back to Dashboard
                                    </Button>
                                </InlineStack>
                            </BlockStack>
                        </Card>

                        {/* Credit Info Grid */}
                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">
                                    💡 How Credits Work
                                </Text>

                                <Grid columns={{ xs: 1, sm: 3, md: 3, lg: 3 }}>
                                    {creditInfo.map((item, index) => (
                                        <Card
                                            key={index}
                                            background="bg-surface-secondary-subdued"
                                        >
                                            <BlockStack gap="300">
                                                <Box textAlign="center">
                                                    <Text variant="heading2xl">
                                                        {item.icon}
                                                    </Text>
                                                </Box>
                                                <BlockStack
                                                    gap="200"
                                                    align="center"
                                                >
                                                    <Text
                                                        variant="headingSm"
                                                        alignment="center"
                                                    >
                                                        {item.title}
                                                    </Text>
                                                    <Text
                                                        tone="success"
                                                        variant="bodyMd"
                                                        alignment="center"
                                                        as="strong"
                                                    >
                                                        {item.cost}
                                                    </Text>
                                                </BlockStack>
                                            </BlockStack>
                                        </Card>
                                    ))}
                                </Grid>

                                <Text tone="subdued" variant="bodySm">
                                    ✓ Credits reset monthly based on your plan
                                    <br />
                                    ✓ Upgrade anytime for more credits
                                    <br />✓ No hidden fees or cancellation costs
                                </Text>
                            </BlockStack>
                        </Card>

                        {/* FAQ Banner */}
                        <Banner tone="info" title="Need Help?">
                            <Text variant="bodySm">
                                Visit our{" "}
                                <a href="/pricing" style={{ fontWeight: 600 }}>
                                    pricing page
                                </a>{" "}
                                to see all available plans and features.
                            </Text>
                        </Banner>
                    </BlockStack>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
