// resources/js/Pages/components/SkuHeader.jsx
import React from "react";
import {
    Card,
    InlineStack,
    Text,
    Button,
    Icon,
    Tooltip,
    Box,
} from "@shopify/polaris";
import { MagicIcon, ExportIcon } from "@shopify/polaris-icons";

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
        <Card padding="500">
            <InlineStack align="space-between" blockAlign="center">
                {/* Title */}
                <div>
                    <Text variant="headingXl" as="h1">
                        SKU Generator Pro
                    </Text>
                    <Text variant="bodyMd" tone="subdued">
                        Smart • Compact • Lightning Fast
                    </Text>
                </div>

                {/* Fixed-Width Button Group */}
                <Box maxWidth="200px" width="100%">
                    <InlineStack gap="300">
                        {/* Smart Preset Button */}
                        <Box width="240px">
                            <Tooltip
                                content="Click for a smart random pattern!"
                                preferredPosition="above"
                            >
                                <Button
                                    size="large"
                                    fullWidth
                                    icon={<Icon source={MagicIcon} />}
                                    onClick={applyRandomPreset}
                                    tone="success"
                                >
                                    Smart Preset
                                </Button>
                            </Tooltip>
                        </Box>

                        {/* Export CSV Button */}
                        <Box width="240px">
                            <Button
                                primary
                                size="large"
                                fullWidth
                                icon={<Icon source={ExportIcon} />}
                                onClick={onExport}
                            >
                                Export CSV
                            </Button>
                        </Box>
                    </InlineStack>
                </Box>
            </InlineStack>
        </Card>
    );
}
