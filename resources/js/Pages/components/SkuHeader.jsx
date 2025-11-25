// resources/js/Pages/components/SkuHeader.jsx
import React, { useState } from "react";
import {
    ActionList,
    Button,
    ButtonGroup,
    Card,
    Icon,
    InlineStack, // ← This is the correct new component
    Popover,
    Text,
} from "@shopify/polaris";
import { ExportIcon, MagicIcon, ArrowDownIcon } from "@shopify/polaris-icons";

// Presets
const presets = [
    {
        label: "PROD-0001",
        changes: { prefix: "PROD", auto_start: "0001", source_field: "none" },
    },
    {
        label: "SKU-001",
        changes: { prefix: "SKU", auto_start: "001", source_field: "none" },
    },
    {
        label: "Title2-PROD-0001",
        changes: {
            source_field: "title",
            source_pos: "first",
            source_len: 2,
            source_placement: "before",
            prefix: "PROD",
        },
    },
    {
        label: "PROD-0001-Vendor2",
        changes: {
            source_field: "vendor",
            source_pos: "first",
            source_len: 2,
            source_placement: "after",
            prefix: "PROD",
        },
    },
    {
        label: "Last2-PROD",
        changes: {
            source_field: "title",
            source_pos: "last",
            source_len: 2,
            source_placement: "before",
            prefix: "PROD",
        },
    },
];

export default function SkuHeader({ onPreset, onQuick, onExport }) {
    const [popoverActive, setPopoverActive] = useState(false);

    const togglePopover = () => setPopoverActive((active) => !active);

    const presetItems = presets.map((p) => ({
        content: <Text fontWeight="medium">{p.label}</Text>,
        onAction: () => {
            onPreset(p.changes);
            togglePopover();
        },
    }));

    return (
        <Card padding="500">
            <InlineStack align="space-between" gap="400" wrap={false}>
                {/* Title */}
                <div>
                    <Text variant="headingXl" as="h1">
                        SKU Generator Pro
                    </Text>
                    <Text variant="bodyMd" tone="subdued">
                        Smart • Compact • Lightning Fast
                    </Text>
                </div>

                {/* Action Buttons */}
                <InlineStack gap="200">
                    <Button onClick={() => onQuick("SKU", "001")}>SKU</Button>
                    <Button onClick={() => onQuick("P", "01")}>Short</Button>
                    <Button
                        onClick={() =>
                            onQuick(null, null, {
                                source_field: "title",
                                source_pos: "first",
                                source_len: 2,
                                source_placement: "before",
                            })
                        }
                    >
                        T2 Before
                    </Button>
                    <Button
                        onClick={() =>
                            onQuick("V2", null, {
                                source_field: "vendor",
                                source_pos: "first",
                                source_len: 2,
                                source_placement: "before",
                            })
                        }
                    >
                        V2 Before
                    </Button>

                    {/* Presets */}
                    <Popover
                        active={popoverActive}
                        activator={
                            <Button
                                onClick={togglePopover}
                                icon={<Icon source={MagicIcon} />}
                                disclosure
                            >
                                Presets
                            </Button>
                        }
                        onClose={togglePopover}
                    >
                        <ActionList items={presetItems} />
                    </Popover>

                    {/* Export */}
                    <Button
                        primary
                        icon={<Icon source={ExportIcon} />}
                        onClick={onExport}
                    >
                        Export CSV
                    </Button>
                </InlineStack>
            </InlineStack>
        </Card>
    );
}
