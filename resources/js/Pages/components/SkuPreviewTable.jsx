import React from "react";
import {
    Card,
    IndexTable,
    Text,
    Badge,
    TextField,
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
    Popover,
    ButtonGroup,
    ActionList,
} from "@shopify/polaris";
import {
    SearchIcon,
    HashtagIcon,
    CheckCircleIcon,
} from "@shopify/polaris-icons";

export default function SkuPreviewTable({
    preview,
    total,
    stats,
    page,
    setPage,
    activeTab,
    setActiveTab,
    selected,
    setSelected,
    loading,
    duplicates,
    duplicateGroups,
    applySKUs,
    applying,
    mediaUrl,
    form,
    handleChange,
    initialCollections = [],
    toggleCollection,
}) {
    const [collectionPopoverActive, setCollectionPopoverActive] =
        React.useState(false);

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
                    <Badge status="critical">
                        {stats.duplicates ?? duplicates.length}
                    </Badge>
                </>
            ),
        },
        {
            id: "missing",
            content: (
                <>
                    Missing SKUs{" "}
                    <Badge status="warning">{stats.missing ?? 0}</Badge>
                </>
            ),
        },
    ];

    // THIS WAS THE BUG → fixed
    const handleTabChange = (selectedTabIndex) => {
        const newTabId = tabs[selectedTabIndex].id;
        setActiveTab(newTabId);
        setPage(1);
    };

    const handleSelectionChange = (selectionType, toggle, id) => {
        if (selectionType === "all") {
            setSelected(toggle ? new Set(preview.map((p) => p.id)) : new Set());
        } else if (id !== undefined) {
            setSelected((prev) => {
                const next = new Set(prev);
                toggle ? next.add(id) : next.delete(id);
                return next;
            });
        }
    };

    const renderRow = (p) => (
        <IndexTable.Row
            key={p.id}
            id={p.id}
            selected={selected.has(p.id)}
            position={preview.indexOf(p)}
        >
            <IndexTable.Cell>
                <Thumbnail
                    source={mediaUrl(p) || ""}
                    alt={p.title}
                    size="small"
                />
            </IndexTable.Cell>
            <IndexTable.Cell>
                <Text fontWeight="semibold">{p.title}</Text>
                <Text variant="bodySm" tone="subdued">
                    {p.vendor} • {p.option || "Default"}
                </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
                <Text variant="bodySm" tone="subdued">
                    {p.old_sku || "—"}
                </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
                <Text
                    fontWeight="bold"
                    tone={!p.new_sku ? "critical" : "success"}
                >
                    {p.new_sku || "—"}
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

    const renderDuplicateGroup = (sku, items) => (
        <IndexTable.Row key={sku} id={`group-${sku}`} disabled>
            <IndexTable.Cell colSpan={5}>
                <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="200">
                            <Icon source={HashtagIcon} tone="critical" />
                            <Text fontWeight="bold" tone="critical">
                                {sku === "(Blank)" ? "Blank SKU" : sku}
                            </Text>
                            <Badge tone="critical">
                                {items.length} conflicts
                            </Badge>
                        </InlineStack>
                        <ButtonGroup>
                            <Button
                                size="slim"
                                onClick={() =>
                                    setSelected(new Set(items.map((i) => i.id)))
                                }
                            >
                                Select Group
                            </Button>
                            <Button
                                primary
                                size="slim"
                                onClick={() => {
                                    setSelected(
                                        new Set(items.map((i) => i.id))
                                    );
                                    applySKUs("selected");
                                }}
                            >
                                Fix Group
                            </Button>
                        </ButtonGroup>
                    </InlineStack>
                    <BlockStack gap="200">
                        {items.map((p) => {
                            const isSelected = selected.has(p.id);
                            return (
                                <Box
                                    key={p.id}
                                    padding="300"
                                    background={
                                        isSelected
                                            ? "bg-surface-selected"
                                            : "bg-surface"
                                    }
                                    borderRadius="200"
                                >
                                    <InlineStack gap="400">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() =>
                                                handleSelectionChange(
                                                    "single",
                                                    !isSelected,
                                                    p.id
                                                )
                                            }
                                            style={{ marginTop: "4px" }}
                                        />
                                        <Thumbnail
                                            source={mediaUrl(p) || ""}
                                            size="small"
                                        />
                                        <BlockStack>
                                            <Text fontWeight="medium">
                                                {p.title}
                                            </Text>
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                {p.vendor}
                                            </Text>
                                        </BlockStack>
                                        <Text fontWeight="bold" tone="critical">
                                            {p.new_sku}
                                        </Text>
                                    </InlineStack>
                                </Box>
                            );
                        })}
                    </BlockStack>
                </BlockStack>
            </IndexTable.Cell>
        </IndexTable.Row>
    );

    const rowMarkup =
        activeTab === "all" || activeTab === "missing"
            ? preview.map(renderRow)
            : Object.entries(duplicateGroups).map(([sku, items]) =>
                  renderDuplicateGroup(sku, items)
              );

    return (
        <Card>
            <Tabs
                tabs={tabs}
                selected={tabs.findIndex((t) => t.id === activeTab)}
                onSelect={handleTabChange}
            >
                <BlockStack gap="400">
                    {/* Search & Filters */}
                    <Box padding="400" background="bg-surface-active">
                        <InlineStack gap="300" align="start" wrap={false}>
                            <Box minWidth="320">
                                <TextField
                                    placeholder="Search products, vendors, SKUs..."
                                    value={form.search}
                                    onChange={(v) => handleChange("search", v)}
                                    prefix={<Icon source={SearchIcon} />}
                                    clearButton
                                    onClearButtonClick={() =>
                                        handleChange("search", "")
                                    }
                                />
                            </Box>
                            <Box minWidth="160">
                                <TextField
                                    labelHidden
                                    placeholder="Vendor"
                                    value={form.vendor}
                                    onChange={(v) => handleChange("vendor", v)}
                                />
                            </Box>
                            <Box minWidth="160">
                                <TextField
                                    labelHidden
                                    placeholder="Product type"
                                    value={form.type}
                                    onChange={(v) => handleChange("type", v)}
                                />
                            </Box>
                            {initialCollections.length > 0 && (
                                <Popover
                                    active={collectionPopoverActive}
                                    onClose={() =>
                                        setCollectionPopoverActive(false)
                                    }
                                    activator={
                                        <Button
                                            disclosure
                                            onClick={() =>
                                                setCollectionPopoverActive(
                                                    !collectionPopoverActive
                                                )
                                            }
                                        >
                                            Collections{" "}
                                            {form.collections.length > 0 &&
                                                `(${form.collections.length})`}
                                        </Button>
                                    }
                                >
                                    <ActionList
                                        items={initialCollections.map((c) => ({
                                            content: c.title,
                                            active: form.collections.includes(
                                                c.id
                                            ),
                                            onAction: () =>
                                                toggleCollection(c.id),
                                        }))}
                                    />
                                </Popover>
                            )}
                            <Box paddingInlineStart="400">
                                <Text variant="bodySm" tone="subdued">
                                    {selected.size} selected
                                </Text>
                            </Box>
                        </InlineStack>
                    </Box>

                    <IndexTable
                        resourceName={{
                            singular: "variant",
                            plural: "variants",
                        }}
                        itemCount={total}
                        selectedItemsCount={selected.size || 0}
                        onSelectionChange={handleSelectionChange}
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
                            <Box padding="1600">
                                <InlineStack align="center" gap="200">
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
                                    Page <strong>{page}</strong> of {totalPages}
                                </Text>
                                <Pagination
                                    hasPrevious={page > 1}
                                    onPrevious={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    hasNext={page < totalPages}
                                    onNext={() =>
                                        setPage((p) =>
                                            Math.min(totalPages, p + 1)
                                        )
                                    }
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
                            <InlineStack gap="200">
                                <Button onClick={() => setSelected(new Set())}>
                                    Clear Selection
                                </Button>
                                <Button
                                    onClick={() =>
                                        setSelected(
                                            new Set(preview.map((p) => p.id))
                                        )
                                    }
                                >
                                    Select All Visible
                                </Button>
                            </InlineStack>
                            <InlineStack gap="400" align="end">
                                <Button
                                    primary
                                    loading={applying}
                                    disabled={selected.size === 0 || applying}
                                    onClick={() => applySKUs("selected")}
                                >
                                    Apply Selected
                                </Button>
                                <Button
                                    tone="critical"
                                    loading={applying}
                                    disabled={applying}
                                    onClick={() => applySKUs("all_matching")}
                                >
                                    Apply All Matching
                                </Button>
                            </InlineStack>
                        </InlineStack>
                    </Box>
                </BlockStack>
            </Tabs>
        </Card>
    );
}
