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
    Pagination,
    Button,
    Thumbnail,
    ButtonGroup,
    TextField,
    Tabs,
    Divider,
} from "@shopify/polaris";
import {
    SearchIcon,
    AlertCircleIcon,
    HashtagIcon,
    CheckCircleIcon,
} from "@shopify/polaris-icons";

export default function SkuPreviewTable({
    preview,
    duplicateGroups,
    total,
    stats,
    page,
    setPage,
    duplicatePage,
    setDuplicatePage,
    activeTab,
    setActiveTab,
    queryValue,
    setQueryValue,
    selected,
    setSelected,
    loading,
    applying,
    applySKUs,
    mediaUrl,
}) {
    const DUPLICATES_PER_PAGE = 10;
    const totalDuplicatePages = Math.ceil(
        duplicateGroups.length / DUPLICATES_PER_PAGE
    );
    const paginatedGroups = duplicateGroups.slice(
        (duplicatePage - 1) * DUPLICATES_PER_PAGE,
        duplicatePage * DUPLICATES_PER_PAGE
    );

    const tabs = [
        {
            id: "all",
            content: (
                <InlineStack gap="200" align="start" blockAlign="center">
                    <Text as="span" fontWeight="medium">
                        All Products
                    </Text>
                    <Badge tone="info">{total}</Badge>
                </InlineStack>
            ),
        },
        {
            id: "duplicates",
            content: (
                <InlineStack gap="200" align="start" blockAlign="center">
                    <Text as="span" fontWeight="medium">
                        Duplicates
                    </Text>
                    <Badge status="critical">{stats.duplicates}</Badge>
                </InlineStack>
            ),
        },
        {
            id: "missing",
            content: (
                <InlineStack gap="200" align="start" blockAlign="center">
                    <Text as="span" fontWeight="medium">
                        Missing SKUs
                    </Text>
                    <Badge status="warning">{stats.missing}</Badge>
                </InlineStack>
            ),
        },
    ];

    const renderRow = (item) => (
        <IndexTable.Row
            id={item.id}
            selected={selected.has(item.id)}
            onClick={() =>
                setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                })
            }
        >
            <IndexTable.Cell>
                <Thumbnail
                    source={mediaUrl(item) || ""}
                    size="small"
                    alt={item.title}
                />
            </IndexTable.Cell>

            <IndexTable.Cell>
                <BlockStack gap="100">
                    <Text fontWeight="semibold" as="span">
                        {item.title}
                    </Text>
                    <Text variant="bodySm" tone="subdued" as="span">
                        {item.vendor} {item.option && `• ${item.option}`}
                    </Text>
                </BlockStack>
            </IndexTable.Cell>

            <IndexTable.Cell>
                {item.old_sku ? (
                    <Badge tone="info">{item.old_sku}</Badge>
                ) : (
                    <InlineStack gap="200">
                        <Icon source={AlertCircleIcon} tone="critical" />
                        <Text tone="critical">No SKU</Text>
                    </InlineStack>
                )}
            </IndexTable.Cell>

            <IndexTable.Cell>
                <Badge tone="success" status="success">
                    {item.new_sku}
                </Badge>
            </IndexTable.Cell>
        </IndexTable.Row>
    );

    const renderDuplicateGroup = (group) => {
        const { sku, count, variants } = group;

        return (
            <IndexTable.Row key={sku}>
                <IndexTable.Cell colSpan={4}>
                    <Box padding="400">
                        <BlockStack gap="400">
                            <InlineStack
                                align="space-between"
                                blockAlign="center"
                            >
                                <InlineStack gap="300" blockAlign="center">
                                    <Icon
                                        source={HashtagIcon}
                                        tone="critical"
                                    />
                                    <BlockStack gap="100">
                                        <Text fontWeight="bold" tone="critical">
                                            Conflicting SKU
                                        </Text>
                                        <InlineStack gap="200">
                                            <Badge
                                                status="critical"
                                                size="large"
                                            >
                                                {sku || "(Blank)"}
                                            </Badge>
                                            <Badge status="critical">
                                                {count} variants
                                            </Badge>
                                        </InlineStack>
                                    </BlockStack>
                                </InlineStack>

                                <ButtonGroup>
                                    <Button
                                        onClick={() =>
                                            setSelected(
                                                new Set(
                                                    variants.map((v) => v.id)
                                                )
                                            )
                                        }
                                    >
                                        Select All
                                    </Button>
                                    <Button
                                        variant="primary"
                                        tone="critical"
                                        loading={applying}
                                        onClick={() => {
                                            setSelected(
                                                new Set(
                                                    variants.map((v) => v.id)
                                                )
                                            );
                                            applySKUs("selected");
                                        }}
                                    >
                                        Fix This Group
                                    </Button>
                                </ButtonGroup>
                            </InlineStack>

                            <Divider />

                            <BlockStack gap="200">
                                {variants.map((v) => (
                                    <Box
                                        key={v.id}
                                        padding="300"
                                        background={
                                            selected.has(v.id)
                                                ? "bg-surface-selected"
                                                : "bg-surface-hover"
                                        }
                                        borderRadius="200"
                                        borderWidth="025"
                                        borderColor={
                                            selected.has(v.id)
                                                ? "border-brand"
                                                : "border"
                                        }
                                        onClick={() =>
                                            setSelected((prev) => {
                                                const next = new Set(prev);
                                                if (next.has(v.id))
                                                    next.delete(v.id);
                                                else next.add(v.id);
                                                return next;
                                            })
                                        }
                                        style={{ cursor: "pointer" }}
                                    >
                                        <InlineStack
                                            gap="400"
                                            align="space-between"
                                        >
                                            <InlineStack gap="300">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(v.id)}
                                                    onChange={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelected((prev) => {
                                                            const next =
                                                                new Set(prev);
                                                            if (next.has(v.id))
                                                                next.delete(
                                                                    v.id
                                                                );
                                                            else next.add(v.id);
                                                            return next;
                                                        });
                                                    }}
                                                />
                                                <Thumbnail
                                                    source={mediaUrl(v) || ""}
                                                    size="small"
                                                    alt={v.title}
                                                />
                                                <BlockStack gap="050">
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
                                            </InlineStack>

                                            <InlineStack gap="300">
                                                <Badge tone="info">
                                                    {v.old_sku || "—"}
                                                </Badge>
                                                <Text tone="subdued">→</Text>
                                                <Badge status="success">
                                                    {v.new_sku}
                                                </Badge>
                                            </InlineStack>
                                        </InlineStack>
                                    </Box>
                                ))}
                            </BlockStack>
                        </BlockStack>
                    </Box>
                </IndexTable.Cell>
            </IndexTable.Row>
        );
    };

    const rowMarkup =
        activeTab === "duplicates" ? (
            duplicateGroups.length === 0 ? (
                <IndexTable.Row>
                    <IndexTable.Cell colSpan={4}>
                        <EmptyState
                            heading="No duplicate SKUs found"
                            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        >
                            <Text tone="subdued">
                                All your SKUs are unique. Great job!
                            </Text>
                        </EmptyState>
                    </IndexTable.Cell>
                </IndexTable.Row>
            ) : (
                paginatedGroups.map(renderDuplicateGroup)
            )
        ) : preview.length === 0 ? (
            <IndexTable.Row>
                <IndexTable.Cell colSpan={4}>
                    <EmptyState
                        heading="No products found"
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                        <Text tone="subdued">
                            Try adjusting your search or filter criteria
                        </Text>
                    </EmptyState>
                </IndexTable.Cell>
            </IndexTable.Row>
        ) : (
            preview.map(renderRow)
        );

    return (
        <Card>
            <Box padding="400">
                <BlockStack gap="400">
                    <Tabs
                        tabs={tabs}
                        selected={tabs.findIndex((t) => t.id === activeTab)}
                        onSelect={(i) => {
                            setActiveTab(tabs[i].id);
                            setPage(1);
                            setDuplicatePage(1);
                            setSelected(new Set());
                        }}
                        fitted
                    />
                    <TextField
                        value={queryValue}
                        onChange={setQueryValue}
                        placeholder="Search products, SKUs..."
                        prefix={<Icon source={SearchIcon} />}
                        clearButton
                        onClearButtonClick={() => setQueryValue("")}
                        autoComplete="off"
                    />
                </BlockStack>
            </Box>

            <IndexTable
                resourceName={{ singular: "variant", plural: "variants" }}
                itemCount={
                    activeTab === "duplicates" ? duplicateGroups.length : total
                }
                selectedItemsCount={
                    selected.size === total ? "All" : selected.size
                }
                onSelectionChange={(selectionType, toggle) => {
                    if (selectionType === "all") {
                        const ids =
                            activeTab === "duplicates"
                                ? duplicateGroups.flatMap((g) =>
                                      g.variants.map((v) => v.id)
                                  )
                                : preview.map((p) => p.id);
                        setSelected(toggle ? new Set(ids) : new Set());
                    }
                }}
                hasZebraStriping
                headings={
                    activeTab === "duplicates"
                        ? [{ title: "Duplicate Groups" }]
                        : [
                              { title: "" },
                              { title: "Product" },
                              { title: "Current SKU" },
                              { title: "New SKU" },
                          ]
                }
                bulkActions={[
                    {
                        content: `Apply to Selected (${selected.size})`,
                        onAction: () => applySKUs("selected"),
                        disabled: selected.size === 0,
                    },
                ]}
                promotedBulkActions={[
                    {
                        content: "Apply to Visible",
                        onAction: () => applySKUs("visible"),
                    },
                ]}
                loading={loading}
            >
                {loading ? (
                    <Box padding="1600" width="100%">
                        <InlineStack align="center" gap="400">
                            <Spinner size="large" />
                            <Text variant="headingLg">
                                Generating preview...
                            </Text>
                        </InlineStack>
                    </Box>
                ) : (
                    rowMarkup
                )}
            </IndexTable>

            {!loading && (
                <>
                    {activeTab === "duplicates" && totalDuplicatePages > 1 && (
                        <>
                            <Divider />
                            <Box padding="400">
                                <Pagination
                                    hasPrevious={duplicatePage > 1}
                                    onPrevious={() =>
                                        setDuplicatePage((p) => p - 1)
                                    }
                                    hasNext={
                                        duplicatePage < totalDuplicatePages
                                    }
                                    onNext={() =>
                                        setDuplicatePage((p) => p + 1)
                                    }
                                    label={`${duplicatePage} of ${totalDuplicatePages}`}
                                />
                            </Box>
                        </>
                    )}

                    {activeTab !== "duplicates" &&
                        Math.ceil(total / 25) > 1 && (
                            <>
                                <Divider />
                                <Box padding="400">
                                    <Pagination
                                        hasPrevious={page > 1}
                                        onPrevious={() => setPage((p) => p - 1)}
                                        hasNext={page < Math.ceil(total / 25)}
                                        onNext={() => setPage((p) => p + 1)}
                                        label={`${page} of ${Math.ceil(
                                            total / 25
                                        )}`}
                                    />
                                </Box>
                            </>
                        )}

                    <Box padding="400" background="bg-surface-secondary">
                        <InlineStack align="space-between">
                            <ButtonGroup>
                                <Button
                                    onClick={() => setSelected(new Set())}
                                    disabled={selected.size === 0}
                                >
                                    Clear Selection
                                </Button>
                                <Button
                                    onClick={() => applySKUs("visible")}
                                    disabled={preview.length === 0}
                                >
                                    Apply to Visible ({preview.length})
                                </Button>
                            </ButtonGroup>

                            <ButtonGroup>
                                <Button onClick={() => applySKUs("all")}>
                                    {activeTab === "duplicates"
                                        ? `Fix All Duplicates (${stats.duplicates})`
                                        : activeTab === "missing"
                                        ? `Fix All Missing (${stats.missing})`
                                        : `Apply to All (${total})`}
                                </Button>
                                <Button
                                    variant="primary"
                                    loading={applying}
                                    disabled={selected.size === 0}
                                    onClick={() => applySKUs("selected")}
                                >
                                    Apply to Selected ({selected.size})
                                </Button>
                            </ButtonGroup>
                        </InlineStack>
                    </Box>
                </>
            )}
        </Card>
    );
}
