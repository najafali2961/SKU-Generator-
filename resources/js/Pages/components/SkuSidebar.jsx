// resources/js/Pages/components/SkuSidebar.jsx
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
    Icon,
} from "@shopify/polaris";
import { HashtagIcon, SettingsIcon } from "@shopify/polaris-icons";

export default function SkuSidebar({ form, handleChange }) {
    return (
        <aside className="lg:col-span-4">
            <BlockStack gap="300">
                {/* Pattern Builder */}
                <Card sectioned>
                    <BlockStack gap="200">
                        <InlineStack gap="150" align="center">
                            <Icon source={HashtagIcon} />
                            <Text variant="headingSm" as="h2">
                                Pattern Builder
                            </Text>
                        </InlineStack>

                        <FormLayout>
                            <FormLayout.Group condensed>
                                <TextField
                                    label="Prefix"
                                    value={form.prefix}
                                    onChange={(v) =>
                                        handleChange("prefix", v.toUpperCase())
                                    }
                                    placeholder="PROD"
                                />
                                <TextField
                                    label="Start Number"
                                    value={form.auto_start}
                                    onChange={(v) =>
                                        handleChange("auto_start", v)
                                    }
                                    placeholder="0001"
                                />
                            </FormLayout.Group>

                            <FormLayout.Group condensed>
                                <Select
                                    label="Delimiter"
                                    value={form.delimiter}
                                    onChange={(v) =>
                                        handleChange("delimiter", v)
                                    }
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
                                />
                            </FormLayout.Group>

                            <FormLayout.Group condensed>
                                <Select
                                    label="Add from"
                                    value={form.source_field}
                                    onChange={(v) =>
                                        handleChange("source_field", v)
                                    }
                                    options={[
                                        { label: "No Source", value: "none" },
                                        { label: "From Title", value: "title" },
                                        {
                                            label: "From Vendor",
                                            value: "vendor",
                                        },
                                    ]}
                                />
                                <Select
                                    label="Position"
                                    value={form.source_pos}
                                    onChange={(v) =>
                                        handleChange("source_pos", v)
                                    }
                                    options={[
                                        {
                                            label: "First Letters",
                                            value: "first",
                                        },
                                        {
                                            label: "Last Letters",
                                            value: "last",
                                        },
                                    ]}
                                />
                                <TextField
                                    label="Length"
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={form.source_len}
                                    onChange={(v) =>
                                        handleChange("source_len", Number(v))
                                    }
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
                        </FormLayout>
                    </BlockStack>
                </Card>

                {/* Generation Rules */}
                <Card sectioned>
                    <BlockStack gap="200">
                        <InlineStack gap="150" align="center">
                            <Icon source={SettingsIcon} />
                            <Text variant="headingSm" as="h2">
                                Generation Rules
                            </Text>
                        </InlineStack>

                        <BlockStack gap="150">
                            <Checkbox
                                label="Remove spaces from final SKU"
                                checked={form.remove_spaces}
                                onChange={(v) =>
                                    handleChange("remove_spaces", v)
                                }
                            />
                            <Checkbox
                                label="Alphanumeric only (no special chars)"
                                checked={form.alphanumeric}
                                onChange={(v) =>
                                    handleChange("alphanumeric", v)
                                }
                            />
                            <Checkbox
                                label="Restart numbering per product"
                                checked={form.auto_number_per_product}
                                onChange={(v) =>
                                    handleChange("auto_number_per_product", v)
                                }
                            />
                        </BlockStack>
                    </BlockStack>
                </Card>
            </BlockStack>
        </aside>
    );
}
