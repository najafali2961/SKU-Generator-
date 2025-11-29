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
    Divider,
    InlineStack,
    Icon,
} from "@shopify/polaris";
import { BarcodeIcon, SettingsIcon } from "@shopify/polaris-icons";

export default function BarcodeSidebar({ form, handleChange }) {
    const formatOptions = [
        { label: "UPC-A (12 digits)", value: "UPC" },
        { label: "UPC-E (8 digits)", value: "UPCE" },
        { label: "EAN-13 (13 digits)", value: "EAN13" },
        { label: "EAN-8 (8 digits)", value: "EAN8" },
        { label: "ISBN-13 (with checksum)", value: "ISBN" },
        { label: "ISBN-10 (legacy)", value: "ISBN10" },
        { label: "Code 39 (alphanumeric)", value: "CODE39" },
        { label: "Code 128 (best for text)", value: "CODE128" },
        { label: "Code 128A", value: "CODE128A" },
        { label: "Code 128B", value: "CODE128B" },
        { label: "Code 128C", value: "CODE128C" },
        { label: "ITF-14 (carton)", value: "ITF14" },
        { label: "GS1-128", value: "GS1_128" },
        { label: "QR Code", value: "QR" },
        { label: "Data Matrix", value: "DATAMATRIX" },
        { label: "PDF417", value: "PDF417" },
    ];

    return (
        <BlockStack gap="600">
            {/* PATTERN BUILDER – Same as SKU */}
            <Card title="Pattern Builder" sectioned>
                <BlockStack gap="500">
                    <Text variant="headingLg" as="h2">
                        Pattern Builder
                    </Text>

                    <FormLayout>
                        <Select
                            label="Barcode Format"
                            value={form.format}
                            onChange={(v) => handleChange("format", v)}
                            options={formatOptions}
                            helpText="Choose the standard you need"
                        />

                        <FormLayout.Group>
                            <TextField
                                label="Prefix"
                                value={form.prefix}
                                onChange={(v) => handleChange("prefix", v)}
                                placeholder="e.g. 03600029 for UPC"
                                helpText="Fixed digits at the beginning"
                                autoComplete="off"
                            />
                            <TextField
                                label="Start Number"
                                value={form.start_number}
                                onChange={(v) =>
                                    handleChange("start_number", v)
                                }
                                placeholder="000000000001"
                                helpText="Sequential number (leading zeros preserved)"
                                autoComplete="off"
                            />
                        </FormLayout.Group>

                        <TextField
                            label="Suffix (optional)"
                            value={form.suffix || ""}
                            onChange={(v) => handleChange("suffix", v)}
                            placeholder="V1, PRO"
                            helpText="Added at the end"
                            autoComplete="off"
                        />

                        <Divider />

                        <Text variant="headingMd" as="h3">
                            Dynamic Source (Advanced)
                        </Text>

                        <Select
                            label="Add letters from"
                            value={form.source_field || "none"}
                            onChange={(v) =>
                                handleChange(
                                    "source_field",
                                    v === "none" ? "" : v
                                )
                            }
                            options={[
                                { label: "No Source", value: "none" },
                                { label: "Product Title", value: "title" },
                                { label: "Vendor Name", value: "vendor" },
                                { label: "Product Type", value: "type" },
                            ]}
                        />

                        {form.source_field && form.source_field !== "none" && (
                            <>
                                <FormLayout.Group>
                                    <Select
                                        label="Take letters from"
                                        value={form.source_pos || "first"}
                                        onChange={(v) =>
                                            handleChange("source_pos", v)
                                        }
                                        options={[
                                            {
                                                label: "First letters",
                                                value: "first",
                                            },
                                            {
                                                label: "Last letters",
                                                value: "last",
                                            },
                                        ]}
                                    />
                                    <TextField
                                        label="Number of letters"
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={String(form.source_len || 3)}
                                        onChange={(v) =>
                                            handleChange(
                                                "source_len",
                                                Math.max(
                                                    1,
                                                    Math.min(10, Number(v) || 1)
                                                )
                                            )
                                        }
                                        helpText="1–10 letters"
                                    />
                                </FormLayout.Group>

                                <Select
                                    label="Place letters"
                                    value={form.source_placement || "before"}
                                    onChange={(v) =>
                                        handleChange("source_placement", v)
                                    }
                                    options={[
                                        {
                                            label: "Before number (AB-0001)",
                                            value: "before",
                                        },
                                        {
                                            label: "After number (0001-AB)",
                                            value: "after",
                                        },
                                    ]}
                                />
                            </>
                        )}
                    </FormLayout>
                </BlockStack>
            </Card>

            {/* GENERATION RULES – Same style as SKU */}
            <Card title="Generation Rules" sectioned>
                <BlockStack gap="500">
                    <Text variant="headingLg" as="h2">
                        Generation Rules
                    </Text>

                    <BlockStack gap="400">
                        <Checkbox
                            label="Auto calculate checksum (UPC/EAN/ISBN)"
                            checked={form.checksum}
                            onChange={(v) => handleChange("checksum", v)}
                            helpText="Required for scannable barcodes"
                        />

                        <Checkbox
                            label="Enforce exact length"
                            checked={form.enforce_length}
                            onChange={(v) => handleChange("enforce_length", v)}
                            helpText="Truncate or pad to match format"
                        />

                        <Checkbox
                            label="Numeric only (remove letters/symbols)"
                            checked={form.numeric_only}
                            onChange={(v) => handleChange("numeric_only", v)}
                        />

                        <Checkbox
                            label="Auto-fill missing digits with zeros"
                            checked={form.auto_fill}
                            onChange={(v) => handleChange("auto_fill", v)}
                        />

                        <Checkbox
                            label="Strict standard validation"
                            checked={form.validate_standard}
                            onChange={(v) =>
                                handleChange("validate_standard", v)
                            }
                            helpText="Reject invalid UPC/EAN/ISBN"
                        />

                        <Checkbox
                            label="Allow custom text in QR codes"
                            checked={form.allow_qr_text}
                            onChange={(v) => handleChange("allow_qr_text", v)}
                            helpText="Use product title, URL, or custom text"
                        />

                        <Checkbox
                            label="Restart numbering per product"
                            checked={form.restart_per_product}
                            onChange={(v) =>
                                handleChange("restart_per_product", v)
                            }
                            helpText="Each product gets 0001, 0002..."
                        />
                    </BlockStack>

                    <Divider />

                    <BlockStack gap="400">
                        <Text variant="headingMd">
                            Format-Specific Settings
                        </Text>

                        {["EAN13", "EAN8", "ITF14"].includes(form.format) && (
                            <TextField
                                label="Country / Company Prefix"
                                value={form.ean_country || ""}
                                onChange={(v) => handleChange("ean_country", v)}
                                placeholder="e.g. 123 (for EAN-8), 12345 (EAN-13)"
                            />
                        )}

                        {form.format === "ISBN" && (
                            <>
                                <TextField
                                    label="ISBN Group (978/979)"
                                    value={form.isbn_group || "978"}
                                    onChange={(v) =>
                                        handleChange("isbn_group", v)
                                    }
                                    helpText="Usually 978 or 979"
                                />
                                <Checkbox
                                    label="Convert ISBN-10 to ISBN-13"
                                    checked={form.convert_isbn10}
                                    onChange={(v) =>
                                        handleChange("convert_isbn10", v)
                                    }
                                />
                            </>
                        )}

                        {form.format === "QR" && form.allow_qr_text && (
                            <TextField
                                label="Custom QR Text (fallback)"
                                value={form.qr_text || ""}
                                onChange={(v) => handleChange("qr_text", v)}
                                placeholder="e.g. https://shop.com/products/{{ handle }}"
                                helpText="Use {{ title }}, {{ handle }}, {{ id }} etc."
                            />
                        )}
                    </BlockStack>
                </BlockStack>
            </Card>
        </BlockStack>
    );
}
