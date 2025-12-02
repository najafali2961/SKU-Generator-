// import React from "react";
// import {
//     Page,
//     Layout,
//     Card,
//     Text,
//     BlockStack,
//     InlineGrid,
//     InlineStack,
//     Box,
//     Button,
//     Icon,
//     Badge,
// } from "@shopify/polaris";
// import { Link, router } from "@inertiajs/react";
// import {
//     BarcodeIcon,
//     MagicIcon,
//     StarFilledIcon,
//     ArrowRightIcon,
//     AlertTriangleIcon,
// } from "@shopify/polaris-icons";
// import RecentJobsTable from "./RecentJobsTable";

// export default function Home({ stats = {}, recentJobs = [] }) {
//     const data = {
//         total_variants: stats.total_variants || 0,
//         variants_missing_sku: stats.variants_missing_sku || 0,
//         variants_missing_barcode: stats.variants_missing_barcode || 0,
//         active_stores: stats.active_stores || 1,
//     };

//     const missingSkuPercent =
//         data.total_variants > 0
//             ? Math.round(
//                   (data.variants_missing_sku / data.total_variants) * 100
//               )
//             : 0;

//     const missingBarcodePercent =
//         data.total_variants > 0
//             ? Math.round(
//                   (data.variants_missing_barcode / data.total_variants) * 100
//               )
//             : 0;

//     const getBadgeProps = (missingCount, missingPercent) => {
//         if (missingCount === 0) {
//             return { tone: "success", text: "Complete", progress: "complete" };
//         }
//         if (missingPercent <= 30) {
//             return {
//                 tone: "warning",
//                 text: "Action Needed",
//                 progress: "partiallyComplete",
//             };
//         }
//         return {
//             tone: "critical",
//             text: "Needs Attention",
//             progress: "incomplete",
//         };
//     };

//     return (
//         <Page
//             title="SKU & Barcode Generator"
//             primaryAction={{
//                 content: "Leave Review",
//                 icon: StarFilledIcon,
//                 onAction: () =>
//                     window.open(
//                         "https://apps.shopify.com/your-app/reviews",
//                         "_blank"
//                     ),
//             }}
//             secondaryActions={[
//                 {
//                     content: "Support",
//                     onAction: () => router.visit("/support"),
//                 },
//             ]}
//         >
//             <BlockStack gap="500">
//                 {/* Key Metrics - Above the fold */}
//                 <Layout>
//                     <Layout.Section>
//                         <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
//                             <Card>
//                                 <BlockStack gap="200">
//                                     <InlineStack
//                                         gap="200"
//                                         align="space-between"
//                                     >
//                                         <Text
//                                             variant="headingSm"
//                                             as="h3"
//                                             tone="subdued"
//                                         >
//                                             Total Variants
//                                         </Text>
//                                         <Icon source={MagicIcon} tone="base" />
//                                     </InlineStack>
//                                     <Text
//                                         variant="heading2xl"
//                                         as="p"
//                                         fontWeight="bold"
//                                     >
//                                         {data.total_variants.toLocaleString()}
//                                     </Text>
//                                 </BlockStack>
//                             </Card>

//                             <Card>
//                                 <BlockStack gap="200">
//                                     <InlineStack
//                                         gap="200"
//                                         align="space-between"
//                                     >
//                                         <Text
//                                             variant="headingSm"
//                                             as="h3"
//                                             tone="subdued"
//                                         >
//                                             Missing SKUs
//                                         </Text>
//                                         <Icon
//                                             source={AlertTriangleIcon}
//                                             tone="base"
//                                         />
//                                     </InlineStack>
//                                     <InlineStack gap="200" blockAlign="center">
//                                         <Text
//                                             variant="heading2xl"
//                                             as="p"
//                                             fontWeight="bold"
//                                         >
//                                             {data.variants_missing_sku.toLocaleString()}
//                                         </Text>
//                                         {data.variants_missing_sku > 0 && (
//                                             <Badge
//                                                 tone={
//                                                     getBadgeProps(
//                                                         data.variants_missing_sku,
//                                                         missingSkuPercent
//                                                     ).tone
//                                                 }
//                                             >
//                                                 {missingSkuPercent}%
//                                             </Badge>
//                                         )}
//                                     </InlineStack>
//                                 </BlockStack>
//                             </Card>

//                             <Card>
//                                 <BlockStack gap="200">
//                                     <InlineStack
//                                         gap="200"
//                                         align="space-between"
//                                     >
//                                         <Text
//                                             variant="headingSm"
//                                             as="h3"
//                                             tone="subdued"
//                                         >
//                                             Missing Barcodes
//                                         </Text>
//                                         <Icon
//                                             source={BarcodeIcon}
//                                             tone="base"
//                                         />
//                                     </InlineStack>
//                                     <InlineStack gap="200" blockAlign="center">
//                                         <Text
//                                             variant="heading2xl"
//                                             as="p"
//                                             fontWeight="bold"
//                                         >
//                                             {data.variants_missing_barcode.toLocaleString()}
//                                         </Text>
//                                         {data.variants_missing_barcode > 0 && (
//                                             <Badge
//                                                 tone={
//                                                     getBadgeProps(
//                                                         data.variants_missing_barcode,
//                                                         missingBarcodePercent
//                                                     ).tone
//                                                 }
//                                             >
//                                                 {missingBarcodePercent}%
//                                             </Badge>
//                                         )}
//                                     </InlineStack>
//                                 </BlockStack>
//                             </Card>
//                         </InlineGrid>
//                     </Layout.Section>

//                     {/* Quick Actions */}
//                     <Layout.Section>
//                         <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
//                             <Card>
//                                 <BlockStack gap="400">
//                                     <BlockStack gap="200">
//                                         <InlineStack
//                                             gap="200"
//                                             blockAlign="center"
//                                         >
//                                             <Icon source={AlertTriangleIcon} />
//                                             <Text
//                                                 variant="headingMd"
//                                                 as="h3"
//                                                 fontWeight="semibold"
//                                             >
//                                                 Generate SKUs
//                                             </Text>
//                                         </InlineStack>
//                                         <Text tone="subdued">
//                                             Auto-fill missing SKUs instantly
//                                         </Text>
//                                     </BlockStack>
//                                     <Button
//                                         fullWidth
//                                         url="/sku-generator?auto=missing"
//                                         icon={ArrowRightIcon}
//                                     >
//                                         Fix {data.variants_missing_sku} SKUs
//                                     </Button>
//                                 </BlockStack>
//                             </Card>

//                             <Card>
//                                 <BlockStack gap="400">
//                                     <BlockStack gap="200" align="start">
//                                         <InlineStack
//                                             gap="200"
//                                             align="start"
//                                             blockAlign="start"
//                                         >
//                                             <Icon source={BarcodeIcon} />
//                                             <Text
//                                                 variant="headingMd"
//                                                 as="h3"
//                                                 fontWeight="semibold"
//                                             >
//                                                 Generate Barcodes
//                                             </Text>
//                                         </InlineStack>

//                                         <Text tone="subdued">
//                                             Instant barcode creation
//                                         </Text>
//                                     </BlockStack>

//                                     <Button
//                                         fullWidth
//                                         url="/barcode-generator?auto=missing"
//                                         icon={ArrowRightIcon}
//                                     >
//                                         Fix {data.variants_missing_barcode}{" "}
//                                         Barcodes
//                                     </Button>
//                                 </BlockStack>
//                             </Card>

//                             <Card>
//                                 <BlockStack gap="400">
//                                     <BlockStack gap="200">
//                                         <InlineStack
//                                             gap="200"
//                                             blockAlign="center"
//                                         >
//                                             <Icon source={MagicIcon} />
//                                             <Text
//                                                 variant="headingMd"
//                                                 as="h3"
//                                                 fontWeight="semibold"
//                                             >
//                                                 Print Labels
//                                             </Text>
//                                         </InlineStack>
//                                         <Text tone="subdued">
//                                             QR codes & barcode labels
//                                         </Text>
//                                     </BlockStack>
//                                     <Button
//                                         fullWidth
//                                         url="/print-generator"
//                                         icon={ArrowRightIcon}
//                                     >
//                                         Start Printing
//                                     </Button>
//                                 </BlockStack>
//                             </Card>
//                         </InlineGrid>
//                     </Layout.Section>

//                     {/* Recent Jobs */}
//                     <Layout.Section>
//                         {/* <Card> */}
//                         <RecentJobsTable jobs={recentJobs} />
//                         {/* </Card> */}
//                     </Layout.Section>
//                 </Layout>
//             </BlockStack>
//         </Page>
//     );
// }

import React from "react";
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
} from "@shopify/polaris";
import {
    BarcodeIcon,
    MagicIcon,
    StarFilledIcon,
    ArrowRightIcon,
    AlertTriangleIcon,
} from "@shopify/polaris-icons";
import { Link } from "@inertiajs/react";
import RecentJobsTable from "./RecentJobsTable";

export default function Home({ stats = {}, recentJobs = [] }) {
    const data = {
        total_variants: stats.total_variants || 0,
        variants_missing_sku: stats.variants_missing_sku || 0,
        variants_missing_barcode: stats.variants_missing_barcode || 0,
        active_stores: stats.active_stores || 1,
    };

    const missingSkuPercent =
        data.total_variants > 0
            ? Math.round(
                  (data.variants_missing_sku / data.total_variants) * 100
              )
            : 0;

    const missingBarcodePercent =
        data.total_variants > 0
            ? Math.round(
                  (data.variants_missing_barcode / data.total_variants) * 100
              )
            : 0;

    const getBadgeProps = (count, percent) => {
        if (count === 0)
            return {
                tone: "success",
                progress: "complete",
                children: "All good",
            };
        if (percent <= 30)
            return {
                tone: "warning",
                progress: "partiallyComplete",
                children: "Action needed",
            };
        return {
            tone: "critical",
            progress: "partiallyComplete",
            children: "Fix required",
        };
    };

    return (
        <Page>
            <Layout>
                {/* HERO — Shopify Admin Style (Dark) */}
                <Layout.Section>
                    <Box
                        background="bg-surface-active"
                        padding="100"
                        borderRadius="300"
                    >
                        <InlineStack
                            align="space-between"
                            blockAlign="center"
                            gap="600"
                            wrap={false}
                        >
                            <BlockStack gap="200">
                                <Text
                                    variant="headingXl"
                                    fontWeight="bold"
                                    tone="invert"
                                >
                                    SKU & Barcode Generator Pro
                                </Text>
                                <Text variant="bodyLg" tone="invert-subdued">
                                    Fix missing SKUs & barcodes in seconds •
                                    Trusted by{" "}
                                    {data.active_stores.toLocaleString()}+
                                    stores
                                </Text>
                            </BlockStack>

                            <InlineStack gap="300">
                                <Button
                                    size="large"
                                    tone="invert"
                                    url="/support"
                                >
                                    Support
                                </Button>
                                <Button
                                    size="large"
                                    variant="primary" // Polaris native solid button
                                    icon={<Icon source={StarFilledIcon} />}
                                    onClick={() =>
                                        window.open(
                                            "https://apps.shopify.com/your-app/reviews",
                                            "_blank"
                                        )
                                    }
                                >
                                    Leave a Review
                                </Button>
                            </InlineStack>
                        </InlineStack>
                    </Box>
                </Layout.Section>

                {/* Stats Grid */}
                <Layout.Section>
                    <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="300">
                                    <Box
                                        background="bg-surface-info-subdued"
                                        padding="300"
                                        borderRadius="200"
                                    >
                                        <Icon source={MagicIcon} tone="info" />
                                    </Box>
                                    <BlockStack gap="100">
                                        <Text
                                            variant="headingXl"
                                            fontWeight="bold"
                                        >
                                            {data.total_variants.toLocaleString()}
                                        </Text>
                                        <Text tone="subdued">
                                            Total Variants
                                        </Text>
                                    </BlockStack>
                                </InlineStack>
                            </BlockStack>
                        </Card>

                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="300">
                                    <Box
                                        background="bg-surface-warning-subdued"
                                        padding="300"
                                        borderRadius="200"
                                    >
                                        <Icon
                                            source={AlertTriangleIcon}
                                            tone="warning"
                                        />
                                    </Box>
                                    <BlockStack gap="100">
                                        <InlineStack
                                            blockAlign="center"
                                            gap="200"
                                        >
                                            <Text
                                                variant="headingXl"
                                                fontWeight="bold"
                                            >
                                                {data.variants_missing_sku.toLocaleString()}
                                            </Text>
                                            <Badge
                                                {...getBadgeProps(
                                                    data.variants_missing_sku,
                                                    missingSkuPercent
                                                )}
                                            />
                                        </InlineStack>
                                        <Text tone="subdued">Missing SKUs</Text>
                                    </BlockStack>
                                </InlineStack>
                            </BlockStack>
                        </Card>

                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="300">
                                    <Box
                                        background="bg-surface-critical-subdued"
                                        padding="300"
                                        borderRadius="200"
                                    >
                                        <Icon
                                            source={BarcodeIcon}
                                            tone="critical"
                                        />
                                    </Box>
                                    <BlockStack gap="100">
                                        <InlineStack
                                            blockAlign="center"
                                            gap="200"
                                        >
                                            <Text
                                                variant="headingXl"
                                                fontWeight="bold"
                                            >
                                                {data.variants_missing_barcode.toLocaleString()}
                                            </Text>
                                            <Badge
                                                {...getBadgeProps(
                                                    data.variants_missing_barcode,
                                                    missingBarcodePercent
                                                )}
                                            />
                                        </InlineStack>
                                        <Text tone="subdued">
                                            Missing Barcodes
                                        </Text>
                                    </BlockStack>
                                </InlineStack>
                            </BlockStack>
                        </Card>
                    </InlineGrid>
                </Layout.Section>

                {/* Quick Actions */}
                <Layout.Section>
                    <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
                        <Link
                            href="/sku-generator?auto=missing"
                            style={{ textDecoration: "none" }}
                        >
                            <Card>
                                <BlockStack gap="400">
                                    <InlineStack gap="300">
                                        <Box
                                            background="bg-surface-warning-subdued"
                                            padding="300"
                                            borderRadius="200"
                                        >
                                            <Icon
                                                source={AlertTriangleIcon}
                                                tone="warning"
                                            />
                                        </Box>
                                        <BlockStack gap="100">
                                            <Text
                                                variant="headingMd"
                                                fontWeight="semibold"
                                            >
                                                Generate SKUs
                                            </Text>
                                            <Text
                                                tone="subdued"
                                                variant="bodySm"
                                            >
                                                Auto-fill missing SKUs instantly
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                    <InlineStack blockAlign="center" gap="200">
                                        <Text
                                            tone="interactive"
                                            fontWeight="medium"
                                        >
                                            Fix{" "}
                                            {data.variants_missing_sku.toLocaleString()}{" "}
                                            SKUs
                                        </Text>
                                        <Icon
                                            source={ArrowRightIcon}
                                            tone="interactive"
                                        />
                                    </InlineStack>
                                </BlockStack>
                            </Card>
                        </Link>

                        <Link
                            href="/barcode-generator?auto=missing"
                            style={{ textDecoration: "none" }}
                        >
                            <Card>
                                <BlockStack gap="400">
                                    <InlineStack gap="300">
                                        <Box
                                            background="bg-surface-critical-subdued"
                                            padding="300"
                                            borderRadius="200"
                                        >
                                            <Icon
                                                source={BarcodeIcon}
                                                tone="critical"
                                            />
                                        </Box>
                                        <BlockStack gap="100">
                                            <Text
                                                variant="headingMd"
                                                fontWeight="semibold"
                                            >
                                                Generate Barcodes
                                            </Text>
                                            <Text
                                                tone="subdued"
                                                variant="bodySm"
                                            >
                                                Instant barcode creation
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                    <InlineStack blockAlign="center" gap="200">
                                        <Text
                                            tone="interactive"
                                            fontWeight="medium"
                                        >
                                            Fix{" "}
                                            {data.variants_missing_barcode.toLocaleString()}{" "}
                                            barcodes
                                        </Text>
                                        <Icon
                                            source={ArrowRightIcon}
                                            tone="interactive"
                                        />
                                    </InlineStack>
                                </BlockStack>
                            </Card>
                        </Link>

                        <Link
                            href="/print-generator"
                            style={{ textDecoration: "none" }}
                        >
                            <Card>
                                <BlockStack gap="400">
                                    <InlineStack gap="300">
                                        <Box
                                            // background="bg-surface-brand"
                                            padding="300"
                                            borderRadius="200"
                                        >
                                            <Icon
                                                source={MagicIcon}
                                                tone="base"
                                            />
                                        </Box>
                                        <BlockStack gap="100">
                                            <Text
                                                variant="headingMd"
                                                fontWeight="semibold"
                                            >
                                                Print Labels
                                            </Text>
                                            <Text
                                                tone="subdued"
                                                variant="bodySm"
                                            >
                                                QR codes & barcode labels
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                    <InlineStack blockAlign="center" gap="200">
                                        <Text
                                            tone="interactive"
                                            fontWeight="medium"
                                        >
                                            Start printing
                                        </Text>
                                        <Icon
                                            source={ArrowRightIcon}
                                            tone="interactive"
                                        />
                                    </InlineStack>
                                </BlockStack>
                            </Card>
                        </Link>
                    </InlineGrid>
                </Layout.Section>

                {/* Recent Jobs */}
                <Layout.Section>
                    <RecentJobsTable jobs={recentJobs} />
                </Layout.Section>
            </Layout>
        </Page>
    );
}
