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
    Tag,
    Scrollable,
} from "@shopify/polaris";
import {
    HashtagIcon,
    SettingsIcon,
    FilterIcon,
    PackageIcon,
} from "@shopify/polaris-icons";

export default function SkuSidebar({
    form,
    handleChange,
    toggleCollection,
    initialCollections,
}) {
    return (
        <aside className="lg:col-span-4">
            <BlockStack gap="400">
                {/* Pattern Builder */}
                <Card>
                    <BlockStack gap="400">
                        <InlineStack gap="200" align="start">
                            <Icon source={HashtagIcon} tone="base" />
                            <Text variant="headingMd" as="h2">
                                Pattern Builder
                            </Text>
                        </InlineStack>

                        <FormLayout>
                            <FormLayout.Group>
                                <TextField
                                    label="Prefix"
                                    value={form.prefix}
                                    onChange={(v) =>
                                        handleChange("prefix", v.toUpperCase())
                                    }
                                    placeholder="PROD"
                                    autoComplete="off"
                                />
                                <TextField
                                    label="Start Number"
                                    value={form.auto_start}
                                    onChange={(v) =>
                                        handleChange("auto_start", v)
                                    }
                                    placeholder="0001"
                                    autoComplete="off"
                                />
                            </FormLayout.Group>

                            <FormLayout.Group>
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
                                    autoComplete="off"
                                />
                            </FormLayout.Group>

                            <FormLayout.Group>
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
                                    autoComplete="off"
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
                                        label: "Source Before Number (e.g. AB-PROD-0001)",
                                        value: "before",
                                    },
                                    {
                                        label: "Source After Number (e.g. PROD-0001-AB)",
                                        value: "after",
                                    },
                                ]}
                            />
                        </FormLayout>
                    </BlockStack>
                </Card>

                {/* Generation Rules */}
                <Card>
                    <BlockStack gap="400">
                        <InlineStack gap="200" align="start">
                            <Icon source={SettingsIcon} tone="base" />
                            <Text variant="headingMd" as="h2">
                                Generation Rules
                            </Text>
                        </InlineStack>

                        <BlockStack gap="300">
                            <Checkbox
                                label="Only missing SKUs"
                                checked={form.only_missing}
                                onChange={(v) =>
                                    handleChange("only_missing", v)
                                }
                            />
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

                {/* Filters */}
                <Card>
                    <BlockStack gap="400">
                        <InlineStack gap="200" align="start">
                            <Icon source={FilterIcon} tone="base" />
                            <Text variant="headingMd" as="h2">
                                Filters
                            </Text>
                        </InlineStack>

                        <TextField
                            label="Vendor"
                            placeholder="e.g. Nike"
                            value={form.vendor}
                            onChange={(v) => handleChange("vendor", v)}
                            autoComplete="off"
                        />

                        <TextField
                            label="Product Type"
                            placeholder="e.g. T-Shirt"
                            value={form.type}
                            onChange={(v) => handleChange("type", v)}
                            autoComplete="off"
                        />

                        {initialCollections.length > 0 && (
                            <>
                                <InlineStack
                                    align="space-between"
                                    blockAlign="center"
                                >
                                    <InlineStack gap="200">
                                        <Icon
                                            source={PackageIcon}
                                            tone="subdued"
                                        />
                                        <Text fontWeight="semibold">
                                            Collections
                                        </Text>
                                    </InlineStack>
                                    <Tag>
                                        {form.collections.length} selected
                                    </Tag>
                                </InlineStack>

                                <Scrollable
                                    shadow
                                    style={{ height: "280px" }}
                                    focusable
                                >
                                    <BlockStack gap="100">
                                        {initialCollections.map((c) => (
                                            <Checkbox
                                                key={c.id}
                                                label={c.title}
                                                checked={form.collections.includes(
                                                    c.id
                                                )}
                                                onChange={() =>
                                                    toggleCollection(c.id)
                                                }
                                            />
                                        ))}
                                    </BlockStack>
                                </Scrollable>
                            </>
                        )}
                    </BlockStack>
                </Card>
            </BlockStack>
        </aside>
    );
}
