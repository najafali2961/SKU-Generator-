// resources/js/Pages/components/SkuHeader.jsx
import React from "react";
import {
    InlineStack,
    Text,
    Button,
    Icon,
    Tooltip,
    Box,
} from "@shopify/polaris";
import { ArrowLeftIcon, MagicIcon, ExportIcon } from "@shopify/polaris-icons";
import { Link, usePage } from "@inertiajs/react"; // ← Inertia instead of Remix

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
    { prefix: "PROD", auto_start: "0001", delimiter: "", suffix: "-V2" },
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
    const applyRandomPreset = () => {
        const random =
            SMART_PRESETS[Math.floor(Math.random() * SMART_PRESETS.length)];
        onPreset(random);
    };

    return (
        <Box paddingBlockStart="100" paddingBlockEnd="10">
            <InlineStack align="space-between" blockAlign="center" gap="400">
                {/* ← Back button + Title (Shopify style) */}
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

                {/* Right-side action buttons – clean & equal */}
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

                    <Button
                        size="large"
                        tone="critical"
                        icon={<Icon source={ExportIcon} />}
                        onClick={onExport}
                    >
                        Export CSV
                    </Button>
                </InlineStack>
            </InlineStack>
        </Box>
    );
}
