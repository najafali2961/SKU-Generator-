import React from "react";
import {
    Page,
    Layout,
    Card,
    Text,
    BlockStack,
    Button,
    Icon,
} from "@shopify/polaris";
import { AlertCircleIcon } from "@shopify/polaris-icons";

export default function NoCreditPage() {
    return (
        <Page title="No Credits Available">
            <Layout>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="500" align="center">
                            <Icon
                                source={AlertCircleIcon}
                                tone="critical"
                                backdrop
                                large
                            />
                            <Text variant="headingLg" alignment="center">
                                You've run out of credits
                            </Text>
                            <Text tone="subdued" alignment="center">
                                To access this page and continue using premium
                                features, please upgrade your plan for more
                                credits.
                            </Text>
                            <Button
                                variant="primary"
                                size="large"
                                url="/billing" // Adjust to your actual billing/upgrade route
                            >
                                Upgrade Plan Now
                            </Button>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
