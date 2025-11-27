// components/SkuSidebar.jsx
import React from "react";
import {
    Card,
    FormLayout,
    TextField,
    Select,
    Checkbox,
    Text,
    InlineStack,
    BlockStack,
    Divider,
} from "@shopify/polaris";

export default function SkuSidebar({ form, setForm }) {
    const handleChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <BlockStack gap="600">
            {/* Pattern Builder */}
            <Card title="Pattern Builder" sectioned>
                <BlockStack gap="500">
                    <Text variant="headingLg" as="h2">
                        Pattern Builder
                    </Text>

                    <FormLayout>
                        <FormLayout.Group>
                            <TextField
                                label="Prefix"
                                value={form.prefix}
                                onChange={(v) =>
                                    handleChange("prefix", v.toUpperCase())
                                }
                                placeholder="PROD"
                                helpText="Automatically converted to uppercase"
                                autoComplete="off"
                            />
                            <TextField
                                label="Start Number"
                                value={form.auto_start}
                                onChange={(v) => handleChange("auto_start", v)}
                                placeholder="0001"
                                helpText="Leading zeros are preserved"
                                autoComplete="off"
                            />
                        </FormLayout.Group>

                        <FormLayout.Group>
                            <Select
                                label="Delimiter"
                                value={form.delimiter}
                                onChange={(v) => handleChange("delimiter", v)}
                                options={[
                                    { label: "Hyphen (-)", value: "-" },
                                    { label: "Underscore (_)", value: "_" },
                                    { label: "None", value: "" },
                                ]}
                            />
                            <TextField
                                label="Suffix"
                                value={form.suffix}
                                onChange={(v) =>
                                    handleChange("suffix", v.toUpperCase())
                                }
                                placeholder="V2"
                                helpText="Automatically converted to uppercase"
                                autoComplete="off"
                            />
                        </FormLayout.Group>

                        <Divider />

                        <Text variant="headingMd" as="h3">
                            Dynamic Source
                        </Text>

                        <Select
                            label="Add letters from"
                            value={form.source_field}
                            onChange={(v) => handleChange("source_field", v)}
                            options={[
                                { label: "No Source", value: "none" },
                                { label: "Product Title", value: "title" },
                                { label: "Vendor Name", value: "vendor" },
                            ]}
                        />

                        {form.source_field !== "none" && (
                            <>
                                <FormLayout.Group>
                                    <Select
                                        label="Take letters from"
                                        value={form.source_pos}
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
                                        value={String(form.source_len)}
                                        onChange={(v) =>
                                            handleChange(
                                                "source_len",
                                                Math.max(
                                                    1,
                                                    Math.min(10, Number(v) || 1)
                                                )
                                            )
                                        }
                                        helpText="Between 1 and 10"
                                    />
                                </FormLayout.Group>

                                <Select
                                    label="Placement"
                                    value={form.source_placement}
                                    onChange={(v) =>
                                        handleChange("source_placement", v)
                                    }
                                    options={[
                                        {
                                            label: "Before Number (AB-PROD-0001)",
                                            value: "before",
                                        },
                                        {
                                            label: "After Number (PROD-0001-AB)",
                                            value: "after",
                                        },
                                    ]}
                                />
                            </>
                        )}
                    </FormLayout>
                </BlockStack>
            </Card>

            {/* Generation Rules */}
            <Card title="Generation Rules" sectioned>
                <BlockStack gap="500">
                    <Text variant="headingLg" as="h2">
                        Generation Rules
                    </Text>

                    <BlockStack gap="400">
                        <Checkbox
                            label="Remove spaces from final SKU"
                            checked={form.remove_spaces}
                            onChange={(v) => handleChange("remove_spaces", v)}
                            helpText="Replaces multiple spaces with single or removes entirely"
                        />
                        <Checkbox
                            label="Alphanumeric only"
                            checked={form.alphanumeric}
                            onChange={(v) => handleChange("alphanumeric", v)}
                            helpText="Removes special characters like !@#$%^&*"
                        />
                        <Checkbox
                            label="Restart numbering per product"
                            checked={form.restart_per_product}
                            onChange={(v) =>
                                handleChange("restart_per_product", v)
                            }
                            helpText="Each product starts counting from the start number"
                        />
                    </BlockStack>
                </BlockStack>
            </Card>
        </BlockStack>
    );
}
