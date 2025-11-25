// resources/js/Pages/components/barcode/BarcodeSidebar.jsx
import React from "react";
import {
    Card,
    FormLayout,
    TextField,
    Select,
    Checkbox,
    Text,
    BlockStack,
    InlineStack,
    Icon,
} from "@shopify/polaris";

import { BarcodeIcon, SettingsIcon } from "@shopify/polaris-icons";

export default function BarcodeSidebar({ form, handleChange }) {
    return (
        <aside>
            <BlockStack gap="400">
                {/* BARCODE FORMAT RULES */}
                <Card padding="500">
                    <BlockStack gap="400">
                        <InlineStack gap="200" align="start">
                            <Icon source={BarcodeIcon} />
                            <Text variant="headingMd">Barcode Format</Text>
                        </InlineStack>

                        <FormLayout>
                            {/* FORMAT */}
                            <Select
                                label="Format Type"
                                value={form.format}
                                options={[
                                    {
                                        label: "UPC-A (12 digits)",
                                        value: "UPC",
                                    },
                                    {
                                        label: "EAN-13 (13 digits)",
                                        value: "EAN13",
                                    },
                                    { label: "ISBN-13", value: "ISBN" },
                                    { label: "Code 128", value: "CODE128" },
                                    { label: "QR Code", value: "QR" },
                                ]}
                                onChange={(v) => handleChange("format", v)}
                            />

                            {/* PREFIX */}
                            <TextField
                                label="Prefix (optional)"
                                value={form.prefix}
                                placeholder="e.g. 978, 12345"
                                onChange={(v) => handleChange("prefix", v)}
                            />

                            {/* LENGTH */}
                            <TextField
                                label="Length"
                                type="number"
                                min={8}
                                max={20}
                                value={form.length}
                                onChange={(v) =>
                                    handleChange("length", Number(v))
                                }
                            />

                            {/* CHECKSUM */}
                            <Checkbox
                                label="Auto checksum (UPC/EAN/ISBN)"
                                checked={form.checksum}
                                onChange={(v) => handleChange("checksum", v)}
                            />

                            <Checkbox
                                label="Enforce length"
                                checked={form.enforce_length}
                                onChange={(v) =>
                                    handleChange("enforce_length", v)
                                }
                            />

                            <Checkbox
                                label="Numeric only"
                                checked={form.numeric_only}
                                onChange={(v) =>
                                    handleChange("numeric_only", v)
                                }
                            />

                            <Checkbox
                                label="Auto fill missing digits"
                                checked={form.auto_fill}
                                onChange={(v) => handleChange("auto_fill", v)}
                            />

                            <Checkbox
                                label="Validate standard (EAN/UPC)"
                                checked={form.validate_standard}
                                onChange={(v) =>
                                    handleChange("validate_standard", v)
                                }
                            />
                        </FormLayout>
                    </BlockStack>
                </Card>

                {/* GENERATION RULES */}
                <Card padding="500">
                    <BlockStack gap="400">
                        <InlineStack gap="200" align="start">
                            <Icon source={SettingsIcon} />
                            <Text variant="headingMd">Generation Rules</Text>
                        </InlineStack>

                        <BlockStack gap="300">
                            <Checkbox
                                label="QR: allow custom text"
                                checked={form.allow_qr_text}
                                onChange={(v) =>
                                    handleChange("allow_qr_text", v)
                                }
                            />

                            <Text variant="headingSm">ISBN Settings</Text>

                            <TextField
                                label="ISBN Group Prefix"
                                value={form.isbn_group}
                                onChange={(v) => handleChange("isbn_group", v)}
                            />

                            <Text variant="headingSm">EAN Settings</Text>

                            <TextField
                                label="EAN Country Code"
                                value={form.ean_country}
                                onChange={(v) => handleChange("ean_country", v)}
                            />
                        </BlockStack>
                    </BlockStack>
                </Card>
            </BlockStack>
        </aside>
    );
}
