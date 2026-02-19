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
} from "@shopify/polaris";

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

    // CONDITIONAL LOGIC
    const isNumericFormat = [
        "UPC",
        "UPCA",
        "UPCE",
        "EAN13",
        "EAN8",
        "ISBN",
        "ISBN10",
        "ITF14",
        "GS1_128",
    ].includes(form.format);
    const isCodeFormat = [
        "CODE128",
        "CODE128A",
        "CODE128B",
        "CODE128C",
        "CODE39",
    ].includes(form.format);
    const isQRFormat = ["QR", "DATAMATRIX", "PDF417"].includes(form.format);
    const isISBN = ["ISBN", "ISBN10"].includes(form.format);
    const isEAN = ["EAN13", "EAN8", "ITF14"].includes(form.format);

    return (
        <BlockStack gap="600">
            {/* FORMAT SELECTION */}
            <Card sectioned>
                <BlockStack gap="500">
                    <Text variant="headingLg" as="h2">
                        Pattern Builder
                    </Text>

                    <Select
                        label="Barcode Format"
                        value={form.format}
                        onChange={(v) => handleChange("format", v)}
                        options={formatOptions}
                        helpText="Choose the standard you need"
                    />

                    {/* SHOW FIELDS BASED ON FORMAT */}
                    <FormLayout>
                        {/* UPC / EAN / ISBN */}
                        {isNumericFormat && (
                            <>
                                <FormLayout.Group>
                                    <TextField
                                        label="Prefix"
                                        value={form.prefix}
                                        onChange={(v) =>
                                            handleChange("prefix", v)
                                        }
                                        placeholder="e.g. 03600029"
                                        helpText="Fixed digits at start"
                                        autoComplete="off"
                                    />
                                    <TextField
                                        label="Start Number"
                                        value={form.start_number}
                                        onChange={(v) => {
                                            handleChange("start_number", v);
                                            // Track that user manually touched this field
                                            // handleChange handles form state update, but we need to set the flag.
                                            // We can pass a special key or handle it in parent.
                                            // Actually handleChange in parent just does: setForm((prev) => ({ ...prev, [key]: value }));
                                            // So we should update `manual_start_touched` explicitly if we can't access setForm here.
                                            // Wait, `handleChange` is a simple wrapper.
                                            // We can call it for the flag too!
                                            handleChange(
                                                "manual_start_touched",
                                                true,
                                            );
                                        }}
                                        placeholder="000000000001"
                                        helpText="Sequential counter"
                                        autoComplete="off"
                                    />
                                </FormLayout.Group>

                                <TextField
                                    label="Suffix (optional)"
                                    value={form.suffix || ""}
                                    onChange={(v) => handleChange("suffix", v)}
                                    placeholder="Additional digits"
                                    autoComplete="off"
                                />
                            </>
                        )}

                        {/* CODE128 / CODE39 */}
                        {isCodeFormat && (
                            <>
                                <TextField
                                    label="Prefix"
                                    value={form.prefix}
                                    onChange={(v) => handleChange("prefix", v)}
                                    placeholder="e.g. SHOP"
                                    helpText="Alphanumeric allowed"
                                    autoComplete="off"
                                />
                                <TextField
                                    label="Suffix"
                                    value={form.suffix || ""}
                                    onChange={(v) => handleChange("suffix", v)}
                                    placeholder="e.g. V1"
                                    autoComplete="off"
                                />
                            </>
                        )}

                        {/* QR / DATAMATRIX / PDF417 */}
                        {isQRFormat && (
                            <>
                                <Checkbox
                                    label="Allow custom text in QR codes"
                                    checked={form.allow_qr_text}
                                    onChange={(v) =>
                                        handleChange("allow_qr_text", v)
                                    }
                                    helpText="Use product info or custom URL"
                                />

                                {form.allow_qr_text && (
                                    <TextField
                                        label="Custom QR Text"
                                        value={form.qr_text || ""}
                                        onChange={(v) =>
                                            handleChange("qr_text", v)
                                        }
                                        placeholder="https://shop.com/products/{{ handle }}"
                                        helpText="Use {{ title }}, {{ handle }}, {{ id }}, {{ sku }}"
                                        multiline={3}
                                        autoComplete="off"
                                    />
                                )}
                            </>
                        )}
                    </FormLayout>
                </BlockStack>
            </Card>

            {/* GENERATION RULES */}
            <Card sectioned>
                <BlockStack gap="500">
                    <Text variant="headingLg" as="h2">
                        Generation Rules
                    </Text>

                    <BlockStack gap="400">
                        {/* NUMERIC FORMATS ONLY */}
                        {isNumericFormat && (
                            <>
                                <Checkbox
                                    label="Auto calculate checksum"
                                    checked={form.checksum}
                                    onChange={(v) =>
                                        handleChange("checksum", v)
                                    }
                                    helpText="Required for scannable barcodes"
                                />

                                <Checkbox
                                    label="Enforce exact length"
                                    checked={form.enforce_length}
                                    onChange={(v) =>
                                        handleChange("enforce_length", v)
                                    }
                                    helpText="Truncate or pad to match format"
                                />

                                <Checkbox
                                    label="Auto-fill missing digits with zeros"
                                    checked={form.auto_fill}
                                    onChange={(v) =>
                                        handleChange("auto_fill", v)
                                    }
                                />

                                <Checkbox
                                    label="Numeric only (remove letters)"
                                    checked={form.numeric_only}
                                    onChange={(v) =>
                                        handleChange("numeric_only", v)
                                    }
                                />
                            </>
                        )}

                        {/* CODE FORMATS */}
                        {isCodeFormat && (
                            <Checkbox
                                label="Numeric only"
                                checked={form.numeric_only}
                                onChange={(v) =>
                                    handleChange("numeric_only", v)
                                }
                                helpText="Remove all non-numeric characters"
                            />
                        )}

                        {/* ISBN SPECIFIC */}
                        {isISBN && (
                            <>
                                <Divider />
                                <Text variant="headingMd">ISBN Settings</Text>
                                <TextField
                                    label="ISBN Group (978/979)"
                                    value={form.isbn_group || "978"}
                                    onChange={(v) =>
                                        handleChange("isbn_group", v)
                                    }
                                    helpText="Usually 978 or 979"
                                    autoComplete="off"
                                />
                                {form.format === "ISBN10" && (
                                    <Checkbox
                                        label="Convert ISBN-10 to ISBN-13"
                                        checked={form.convert_isbn10}
                                        onChange={(v) =>
                                            handleChange("convert_isbn10", v)
                                        }
                                    />
                                )}
                            </>
                        )}

                        {/* EAN SPECIFIC */}
                        {isEAN && (
                            <>
                                <Divider />
                                <Text variant="headingMd">EAN Settings</Text>
                                <TextField
                                    label="Country / Company Prefix"
                                    value={form.ean_country || ""}
                                    onChange={(v) =>
                                        handleChange("ean_country", v)
                                    }
                                    placeholder="e.g. 123 (EAN-8), 12345 (EAN-13)"
                                    helpText="Optional GS1 company prefix"
                                    autoComplete="off"
                                />
                            </>
                        )}
                    </BlockStack>
                </BlockStack>
            </Card>
        </BlockStack>
    );
}
