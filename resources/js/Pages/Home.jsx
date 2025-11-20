import {
    Page,
    Card,
    Text,
    BlockStack,
    Box,
    InlineStack,
    Button,
    Divider,
    Badge,
} from "@shopify/polaris";
import { router } from "@inertiajs/react"; // ✅ use react bindings

export default function Home({ stats }) {
    return (
        <Page title="BulkApp Dashboard">
            <BlockStack gap="600">
                {/* HERO CARD */}
                <Card>
                    <Box padding="600">
                        <BlockStack gap="400">
                            <Text as="h1" variant="headingLg">
                                Welcome to BulkApp
                            </Text>

                            <Text as="p" variant="bodyMd" tone="subdued">
                                A powerful tool to manage and bulk update
                                Shopify products with ease.
                            </Text>

                            <InlineStack gap="300">
                                <Button
                                    variant="primary"
                                    onClick={() => router.get("/bulk-edit")}
                                >
                                    Start Bulk Editing
                                </Button>
                                <Button onClick={() => router.get("/products")}>
                                    View Products
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => router.get("/sku-generator")}
                                >
                                    Generate SKU
                                </Button>
                            </InlineStack>
                        </BlockStack>
                    </Box>
                </Card>

                {/* STATS OVERVIEW */}
                <Card>
                    <Box padding="600">
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd">
                                Store Overview
                            </Text>

                            <InlineStack gap="500" align="space-between">
                                <BlockStack gap="200">
                                    <Text variant="headingLg">
                                        {stats.total_products}
                                    </Text>
                                    <Text tone="subdued">Total Products</Text>
                                </BlockStack>

                                <BlockStack gap="200">
                                    <Text variant="headingLg">
                                        {stats.updated_products}
                                    </Text>
                                    <Text tone="subdued">Products Updated</Text>
                                </BlockStack>

                                <BlockStack gap="200">
                                    <Text variant="headingLg">
                                        {stats.draft_items}
                                    </Text>
                                    <Text tone="subdued">Draft Items</Text>
                                </BlockStack>
                            </InlineStack>
                        </BlockStack>
                    </Box>
                </Card>

                {/* FEATURES CARD */}
                <Card>
                    <Box padding="600">
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd">
                                Key Features
                            </Text>
                            <Divider />
                            <BlockStack gap="300">
                                <InlineStack gap="200" blockAlign="center">
                                    <Badge tone="success">Bulk Editing</Badge>
                                    <Text>
                                        Update titles, descriptions & prices in
                                        one go.
                                    </Text>
                                </InlineStack>
                                <InlineStack gap="200" blockAlign="center">
                                    <Badge tone="info">Media Manager</Badge>
                                    <Text>
                                        Upload, replace, or remove product
                                        images easily.
                                    </Text>
                                </InlineStack>
                                <InlineStack gap="200" blockAlign="center">
                                    <Badge tone="attention">Variants</Badge>
                                    <Text>
                                        Manage SKUs, inventory & options
                                        efficiently.
                                    </Text>
                                </InlineStack>
                            </BlockStack>
                        </BlockStack>
                    </Box>
                </Card>

                {/* ABOUT */}
                <Card>
                    <Box padding="600">
                        <BlockStack gap="300">
                            <Text as="h2" variant="headingMd">
                                Why choose BulkApp?
                            </Text>
                            <Text tone="subdued">
                                Save hours of manual work by editing hundreds of
                                products at once. Built with modern Shopify
                                standards using Polaris.
                            </Text>
                        </BlockStack>
                    </Box>
                </Card>
            </BlockStack>
        </Page>
    );
}
