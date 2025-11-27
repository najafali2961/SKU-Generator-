import React from "react";
import {
    Card,
    IndexTable,
    Text,
    Badge,
    EmptyState,
    Spinner,
    Icon,
    InlineStack,
    BlockStack,
    Box,
    Tabs,
    Pagination,
    Button,
    Thumbnail,
    ButtonGroup,
} from "@shopify/polaris";
import { HashtagIcon, CheckCircleIcon } from "@shopify/polaris-icons";

export default function SkuPreviewTable({
    preview,
    duplicateGroups,
    total,
    stats,
    page,
    setPage,
    activeTab,
    setActiveTab,
    selected,
    setSelected,
    loading,
    applySKUs,
    applying,
    mediaUrl,
}) {
    const totalPages = Math.ceil(total / 25);

    const tabs = [
        {
            id: "all",
            content: (
                <>
                    All Products <Badge status="info">{total}</Badge>
                </>
            ),
        },
        {
            id: "duplicates",
            content: (
                <>
                    Duplicates{" "}
                    <Badge status="critical">{stats.duplicates} items</Badge>
                </>
            ),
        },
        {
            id: "missing",
            content: (
                <>
                    Missing SKUs <Badge status="warning">{stats.missing}</Badge>
                </>
            ),
        },
    ];

    const handleSelectionChange = (toggle, id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            toggle ? next.add(id) : next.delete(id);
            return next;
        });
    };

    const renderRow = (p) => (
        <IndexTable.Row key={p.id} id={p.id} selected={selected.has(p.id)}>
            <IndexTable.Cell>
                <Thumbnail source={mediaUrl(p) || ""} size="small" alt="" />
            </IndexTable.Cell>
            <IndexTable.Cell>
                <Text fontWeight="semibold">{p.title}</Text>
                <Text variant="bodySm" tone="subdued">
                    {p.vendor} • {p.option || "Default Title"}
                </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
                <Text tone={p.old_sku ? "subdued" : "critical"}>
                    {p.old_sku || "—"}
                </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
                <Text fontWeight="bold" tone="success">
                    {p.new_sku}
                </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
                {p.is_duplicate ? (
                    <Badge tone="critical" icon={HashtagIcon}>
                        Duplicate
                    </Badge>
                ) : (
                    <Badge tone="success" icon={CheckCircleIcon}>
                        Unique
                    </Badge>
                )}
            </IndexTable.Cell>
        </IndexTable.Row>
    );

    const renderDuplicateGroup = (group) => {
        const { sku, count, variants } = group; // variants is FULL array now

        return (
            <IndexTable.Row key={sku}>
                <IndexTable.Cell colSpan={5}>
                    <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="300">
                                <Icon source={HashtagIcon} tone="critical" />
                                <Text fontWeight="bold" tone="critical">
                                    Conflicting SKU:{" "}
                                    <code
                                        style={{
                                            background: "#ffebeb",
                                            padding: "6px 12px",
                                            borderRadius: "8px",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {sku || "(Blank)"}
                                    </code>
                                </Text>
                                <Badge tone="critical">{count} variants</Badge>
                            </InlineStack>
                            <ButtonGroup>
                                <Button
                                    onClick={() =>
                                        setSelected(
                                            new Set(variants.map((v) => v.id))
                                        )
                                    }
                                >
                                    Select All {count}
                                </Button>
                                <Button
                                    primary
                                    disabled={applying}
                                    onClick={() => {
                                        setSelected(
                                            new Set(variants.map((v) => v.id))
                                        );
                                        applySKUs("selected");
                                    }}
                                >
                                    Fix This Group
                                </Button>
                            </ButtonGroup>
                        </InlineStack>

                        <BlockStack gap="200">
                            {variants.map((v) => (
                                <Box
                                    key={v.id}
                                    padding="400"
                                    background={
                                        selected.has(v.id)
                                            ? "bg-surface-selected"
                                            : "bg-surface"
                                    }
                                    borderRadius="200"
                                >
                                    <InlineStack gap="400" align="start">
                                        <input
                                            type="checkbox"
                                            checked={selected.has(v.id)}
                                            onChange={() =>
                                                handleSelectionChange(
                                                    !selected.has(v.id),
                                                    v.id
                                                )
                                            }
                                        />
                                        <Thumbnail
                                            source={mediaUrl(v) || ""}
                                            size="small"
                                        />
                                        <BlockStack>
                                            <Text fontWeight="medium">
                                                {v.title}
                                            </Text>
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                {v.vendor}
                                            </Text>
                                        </BlockStack>
                                        <Text tone="critical" fontWeight="bold">
                                            {v.old_sku}
                                        </Text>
                                        <Text tone="success" fontWeight="bold">
                                            → {v.new_sku}
                                        </Text>
                                    </InlineStack>
                                </Box>
                            ))}
                        </BlockStack>
                    </BlockStack>
                </IndexTable.Cell>
            </IndexTable.Row>
        );
    };

    const rowMarkup =
        activeTab === "duplicates" ? (
            duplicateGroups.length === 0 ? (
                <IndexTable.Row>
                    <IndexTable.Cell colSpan={5}>
                        <EmptyState heading="No duplicates!" />
                    </IndexTable.Cell>
                </IndexTable.Row>
            ) : (
                duplicateGroups.map(renderDuplicateGroup)
            )
        ) : (
            preview.map(renderRow)
        );

    return (
        <Card>
            <Tabs
                tabs={tabs}
                selected={tabs.findIndex((t) => t.id === activeTab)}
                onSelect={(i) => setActiveTab(tabs[i].id)}
            >
                <BlockStack gap="400">
                    <IndexTable
                        resourceName={{
                            singular: "variant",
                            plural: "variants",
                        }}
                        itemCount={total}
                        selectedItemsCount={selected.size}
                        onSelectionChange={(type, toggle, id) => {
                            if (type === "all") {
                                setSelected(
                                    toggle
                                        ? new Set(preview.map((p) => p.id))
                                        : new Set()
                                );
                            } else {
                                handleSelectionChange(toggle, id);
                            }
                        }}
                        headings={
                            activeTab === "duplicates"
                                ? [{ title: "Duplicate Groups" }]
                                : [
                                      { title: "Image" },
                                      { title: "Product" },
                                      { title: "Old SKU" },
                                      { title: "New SKU" },
                                      { title: "Status" },
                                  ]
                        }
                        loading={loading}
                    >
                        {loading ? (
                            <Box padding="800">
                                <InlineStack align="center" gap="400">
                                    <Spinner size="large" />
                                    <Text>Generating preview...</Text>
                                </InlineStack>
                            </Box>
                        ) : (
                            rowMarkup
                        )}
                    </IndexTable>

                    {totalPages > 1 && activeTab !== "duplicates" && (
                        <Box padding="400">
                            <InlineStack align="space-between">
                                <Text variant="bodySm">
                                    Page {page} of {totalPages}
                                </Text>
                                <Pagination
                                    hasPrevious={page > 1}
                                    onPrevious={() => setPage((p) => p - 1)}
                                    hasNext={page < totalPages}
                                    onNext={() => setPage((p) => p + 1)}
                                />
                            </InlineStack>
                        </Box>
                    )}

                    <Box
                        padding="400"
                        background="bg-surface-secondary"
                        borderBlockStartWidth="1"
                    >
                        <InlineStack align="space-between">
                            <ButtonGroup>
                                <Button onClick={() => setSelected(new Set())}>
                                    Clear
                                </Button>
                                <Button
                                    onClick={() =>
                                        setSelected(
                                            new Set(preview.map((p) => p.id))
                                        )
                                    }
                                >
                                    Select All
                                </Button>
                            </ButtonGroup>
                            <Button
                                primary
                                size="large"
                                loading={applying}
                                disabled={selected.size === 0}
                                onClick={() => applySKUs("selected")}
                            >
                                Apply to Selected ({selected.size})
                            </Button>
                        </InlineStack>
                    </Box>
                </BlockStack>
            </Tabs>
        </Card>
    );
}
