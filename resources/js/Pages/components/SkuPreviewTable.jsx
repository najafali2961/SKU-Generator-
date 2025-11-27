// components/SkuPreviewTable.jsx
import React from "react";
import {
    Card,
    IndexTable,
    Tabs,
    TextField,
    Filters,
    ChoiceList,
    Text,
    Badge,
    EmptyState,
    Icon,
    InlineStack,
    BlockStack,
    Box,
    Pagination,
    Button,
    Thumbnail,
    ButtonGroup,
    Divider,
} from "@shopify/polaris";
import {
    SearchIcon,
    AlertCircleIcon,
    HashtagIcon,
    ArrowRightIcon,
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
    initialCollections = [],

    // Filter states
    selectedCollectionIds,
    setSelectedCollectionIds,
    selectedVendors,
    setSelectedVendors,
    selectedTypes,
    setSelectedTypes,
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
        { id: "all", content: `All Products (${total})` },
        { id: "duplicates", content: `Duplicates (${stats.duplicates})` },
        { id: "missing", content: `Missing SKUs (${stats.missing})` },
    ];

    const handleTabChange = (selectedTabIndex) => {
        setActiveTab(tabs[selectedTabIndex].id);
        setPage(1);
        setDuplicatePage(1);
        setSelected(new Set());
    };

    const handleClearAll = () => {
        setQueryValue("");
        setSelectedCollectionIds([]);
        setSelectedVendors([]);
        setSelectedTypes([]);
    };

    const appliedFilters = [];
    if (selectedCollectionIds.length > 0) {
        const names = selectedCollectionIds
            .map(
                (id) => initialCollections.find((c) => c.id === id)?.title || id
            )
            .join(", ");
        appliedFilters.push({
            key: "collections",
            label: `Collection: ${names}`,
            onRemove: () => setSelectedCollectionIds([]),
        });
    }
    if (selectedVendors.length > 0) {
        appliedFilters.push({
            key: "vendor",
            label: `Vendor: ${selectedVendors.join(", ")}`,
            onRemove: () => setSelectedVendors([]),
        });
    }
    if (selectedTypes.length > 0) {
        appliedFilters.push({
            key: "type",
            label: `Product type: ${selectedTypes.join(", ")}`,
            onRemove: () => setSelectedTypes([]),
        });
    }

    const filters = [
        {
            key: "collections",
            label: "Collection",
            filter: (
                <ChoiceList
                    title="Collections"
                    titleHidden
                    allowMultiple
                    choices={initialCollections.map((c) => ({
                        label: c.title,
                        value: c.id.toString(),
                    }))}
                    selected={selectedCollectionIds.map(String)}
                    onChange={(value) =>
                        setSelectedCollectionIds(value.map(Number))
                    }
                />
            ),
            shortcut: true,
        },
        {
            key: "vendor",
            label: "Vendor",
            filter: (
                <TextField
                    label="Vendor"
                    labelHidden
                    placeholder="Filter by vendor"
                    value={selectedVendors[0] || ""}
                    onChange={(v) =>
                        setSelectedVendors(v.trim() ? [v.trim()] : [])
                    }
                    autoComplete="off"
                />
            ),
        },
        {
            key: "type",
            label: "Product type",
            filter: (
                <TextField
                    label="Product type"
                    labelHidden
                    placeholder="Filter by product type"
                    value={selectedTypes[0] || ""}
                    onChange={(v) =>
                        setSelectedTypes(v.trim() ? [v.trim()] : [])
                    }
                    autoComplete="off"
                />
            ),
        },
    ];

    const renderRow = (item) => (
        <IndexTable.Row
            key={item.id}
            id={item.id}
            selected={selected.has(item.id)}
            onClick={() =>
                setSelected((prev) => {
                    const next = new Set(prev);
                    next.has(item.id)
                        ? next.delete(item.id)
                        : next.add(item.id);
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
                    <Text fontWeight="semibold">{item.title}</Text>
                    <Text variant="bodySm" tone="subdued">
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
                <Badge tone="success">{item.new_sku}</Badge>
            </IndexTable.Cell>
        </IndexTable.Row>
    );

    const renderDuplicateGroup = (group) => (
        <IndexTable.Row key={group.sku || `blank-${group.variants[0]?.id}`}>
            <IndexTable.Cell colSpan={4}>
                <Box padding="400">
                    <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="300" blockAlign="center">
                                <Icon source={HashtagIcon} tone="critical" />
                                <BlockStack gap="100">
                                    <Text fontWeight="bold" tone="critical">
                                        Conflicting SKU
                                    </Text>
                                    <InlineStack gap="200">
                                        <Badge status="critical" size="large">
                                            {group.sku || "(Blank)"}
                                        </Badge>
                                        <Badge status="critical">
                                            {group.count} variants
                                        </Badge>
                                    </InlineStack>
                                </BlockStack>
                            </InlineStack>
                            <ButtonGroup>
                                <Button
                                    onClick={() =>
                                        setSelected(
                                            new Set(
                                                group.variants.map((v) => v.id)
                                            )
                                        )
                                    }
                                >
                                    Select All
                                </Button>
                                <Button
                                    variant="primary"
                                    loading={applying}
                                    onClick={() => {
                                        setSelected(
                                            new Set(
                                                group.variants.map((v) => v.id)
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
                            {group.variants.map((v) => (
                                <Box
                                    key={v.id}
                                    padding="300"
                                    background={
                                        selected.has(v.id)
                                            ? "bg-surface-selected"
                                            : "bg-surface-hover"
                                    }
                                    borderRadius="200"
                                    onClick={() =>
                                        setSelected((prev) => {
                                            const next = new Set(prev);
                                            next.has(v.id)
                                                ? next.delete(v.id)
                                                : next.add(v.id);
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
                                                onChange={() => {}}
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
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
                                        <InlineStack gap="100">
                                            <Badge tone="subdued">
                                                {v.old_sku || "—"}
                                            </Badge>
                                            <Icon source={ArrowRightIcon} />
                                            <Badge tone="success">
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

    const rowMarkup =
        activeTab === "duplicates" ? (
            duplicateGroups.length === 0 ? (
                <IndexTable.Row key="empty-duplicates">
                    <IndexTable.Cell colSpan={4}>
                        <EmptyState heading="No duplicate SKUs found">
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
            <IndexTable.Row key="empty-preview">
                <IndexTable.Cell colSpan={4}>
                    <EmptyState heading="No products found">
                        <Text tone="subdued">
                            Try adjusting your search or filters
                        </Text>
                    </EmptyState>
                </IndexTable.Cell>
            </IndexTable.Row>
        ) : (
            preview.map(renderRow)
        );

    return (
        <Card>
            {/* TABS — Always visible */}
            <Box padding="400">
                <Tabs
                    tabs={tabs}
                    selected={tabs.findIndex((t) => t.id === activeTab)}
                    onSelect={handleTabChange}
                    fitted
                />
            </Box>

            {/* SEARCH + FILTERS — Below tabs, never hides them */}
            <Box
                paddingInlineStart="400"
                paddingInlineEnd="400"
                paddingBlockEnd="400"
            >
                <Filters
                    queryValue={queryValue}
                    onQueryChange={setQueryValue}
                    onQueryClear={() => setQueryValue("")}
                    filters={filters}
                    appliedFilters={appliedFilters}
                    onClearAll={handleClearAll}
                    queryPlaceholder="Search products, vendors, SKUs..."
                />
            </Box>

            {/* Table */}
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
                {rowMarkup}
            </IndexTable>

            {/* Pagination & Actions */}
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
