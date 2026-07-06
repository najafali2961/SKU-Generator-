// resources/js/Pages/components/BarcodeHeader.jsx
import React, { useState } from "react";
import {
    InlineStack,
    Text,
    Button,
    Icon,
    Tooltip,
    Box,
} from "@shopify/polaris";
import { ArrowLeftIcon, ExportIcon, RefreshIcon } from "@shopify/polaris-icons";
import { Link } from "@inertiajs/react";
import { triggerProductSync } from "../../../Components/SyncProducts";
import { useFeature, PlanBadge, UpgradeModal } from "../FeatureGate";

export default function BarcodeHeader({ onImport, onExport }) {
    const csvExport = useFeature("csv-export");
    const [showUpgrade, setShowUpgrade] = useState(false);

    return (
        <Box paddingBlockStart="100" paddingBlockEnd="10">
            <InlineStack align="space-between" blockAlign="center" gap="400">
                {/* Left side – Back arrow + Title */}
                <InlineStack gap="400" align="center">
                    <Link href={route("home")}>
                        <Icon source={ArrowLeftIcon} color="base" />
                    </Link>

                    <div>
                        <Text variant="headingXl" as="h1">
                            Barcode Generator Pro
                        </Text>
                        <Text variant="bodyMd" tone="subdued">
                            EAN • UPC • ISBN • Bulk Ready
                        </Text>
                    </div>
                </InlineStack>

                {/* Right side – Sync products */}
                <InlineStack gap="200">
                    <Tooltip
                        content="Re-pull the latest products & variants from Shopify"
                        preferredPosition="below"
                    >
                        <Button
                            size="large"
                            variant="primary"
                            icon={RefreshIcon}
                            onClick={triggerProductSync}
                        >
                            Sync products
                        </Button>
                    </Tooltip>

                    <Tooltip
                        content="Export generated/imported barcodes as CSV"
                        preferredPosition="below"
                    >
                        <Button
                            size="large"
                            icon={<Icon source={ExportIcon} />}
                            onClick={
                                csvExport.enabled
                                    ? onExport
                                    : () => setShowUpgrade(true)
                            }
                        >
                            <InlineStack gap="150" blockAlign="center">
                                <span>Export CSV</span>
                                <PlanBadge feature={csvExport} />
                            </InlineStack>
                        </Button>
                    </Tooltip>
                </InlineStack>
            </InlineStack>

            <UpgradeModal
                open={showUpgrade}
                onClose={() => setShowUpgrade(false)}
                feature={csvExport}
            />
        </Box>
    );
}
