// resources/js/Pages/components/SkuHeader.jsx
import React, { useState } from "react";
import {
    InlineStack,
    Text,
    Button,
    Icon,
    Tooltip,
    Box,
} from "@shopify/polaris";
import {
    ArrowLeftIcon,
    MagicIcon,
    ExportIcon,
    RefreshIcon,
} from "@shopify/polaris-icons";
import { Link } from "@inertiajs/react";
import { triggerProductSync } from "../../Components/SyncProducts";
import { useFeature, PlanBadge, UpgradeModal } from "./FeatureGate";

const SMART_PRESETS = [
    {
        prefix: "PROD",
        auto_start: "0001",
        delimiter: "-",
        source_field: "none",
    },
    { prefix: "SKU", auto_start: "001", delimiter: "-", source_field: "none" },
    {
        prefix: "ITEM",
        auto_start: "1000",
        delimiter: "_",
        source_field: "none",
    },
    {
        prefix: "",
        auto_start: "0001",
        source_field: "title",
        source_pos: "first",
        source_len: 3,
        source_placement: "before",
    },
    {
        prefix: "VEND",
        auto_start: "001",
        source_field: "vendor",
        source_pos: "first",
        source_len: 2,
        source_placement: "before",
    },
    {
        prefix: "BRAND",
        auto_start: "01",
        delimiter: "_",
        source_field: "vendor",
        source_pos: "first",
        source_len: 4,
        source_placement: "before",
    },
    {
        prefix: "",
        auto_start: "1",
        source_field: "title",
        source_pos: "last",
        source_len: 2,
        source_placement: "after",
    },
];

export default function SkuHeader({ onPreset, onExport }) {
    const csvExport = useFeature("csv-export");
    const [showUpgrade, setShowUpgrade] = useState(false);

    const applyRandomPreset = () => {
        const random =
            SMART_PRESETS[Math.floor(Math.random() * SMART_PRESETS.length)];
        onPreset(random);
    };

    return (
        <Box paddingBlockStart="100" paddingBlockEnd="10">
            <InlineStack align="space-between" blockAlign="center" gap="400">
                <InlineStack gap="400" align="center">
                    <Link href={route("home")}>
                        <Icon source={ArrowLeftIcon} color="base" />
                    </Link>

                    <div>
                        <Text variant="headingXl" as="h1">
                            SKU Generator Pro
                        </Text>
                        <Text variant="bodyMd" tone="subdued">
                            Smart • Compact • Lightning Fast
                        </Text>
                    </div>
                </InlineStack>

                <InlineStack gap="200">
                    <Tooltip
                        content="Apply a smart random pattern"
                        preferredPosition="below"
                    >
                        <Button
                            size="large"
                            onClick={applyRandomPreset}
                            icon={<Icon source={MagicIcon} />}
                        >
                            Smart Preset
                        </Button>
                    </Tooltip>

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
                        content="Export the generated SKUs as a CSV file"
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
