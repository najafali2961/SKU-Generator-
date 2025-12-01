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
    Checkbox,
} from "@shopify/polaris";
import {
    SearchIcon,
    AlertCircleIcon,
    HashtagIcon,
    ArrowRightIcon,
    XCircleIcon,
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
    selectedCollectionIds,
    setSelectedCollectionIds,
    selectedVendors,
    setSelectedVendors,
    selectedTypes,
    setSelectedTypes,
}) {
    const [selectedVariant, setSelectedVariant] = React.useState(null);

    const DUPLICATES_PER_PAGE = 10;
    const PRODUCTS_PER_PAGE = 25;

    // Calculate pagination for duplicates
    const totalDuplicatePages = Math.ceil(
        duplicateGroups.length / DUPLICATES_PER_PAGE
    );
    const paginatedGroups = duplicateGroups.slice(
        (duplicatePage - 1) * DUPLICATES_PER_PAGE,
        duplicatePage * DUPLICATES_PER_PAGE
    );

    // Tab configuration - use correct counts from stats
    const tabs = [
        { id: "all", content: `All Products (${total})` },
        { id: "duplicates", content: `Duplicates (${stats.duplicates})` },
        { id: "missing", content: `Missing SKUs (${stats.missing})` },
    ];

    const handleTabChange = (selectedTabIndex) => {
        const newTab = tabs[selectedTabIndex].id;
        setActiveTab(newTab);
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

    // Build applied filters list
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

    const toggleRowSelection = (itemId) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    const renderRow = (item) => (
        <IndexTable.Row
            key={item.id}
            id={item.id}
            selected={selected.has(item.id)}
            onClick={() => toggleRowSelection(item.id)}
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
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVariant(item);
                        }}
                        style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            margin: 0,
                            textAlign: "left",
                            cursor: "pointer",
                            font: "inherit",
                            color: "var(--p-color-text-brand)",
                            fontWeight: 600,
                        }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.textDecoration = "underline")
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.textDecoration = "none")
                        }
                    >
                        <div
                            style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "340px",
                            }}
                            title={item.title}
                        >
                            {item.title}
                        </div>
                    </button>

                    <Text variant="bodySm" tone="subdued">
                        {item.vendor} {item.option1 && `• ${item.option1}`}
                    </Text>
                </BlockStack>
            </IndexTable.Cell>

            <IndexTable.Cell>
                {item.old_sku ? (
                    <Badge tone="info">{item.old_sku}</Badge>
                ) : (
                    <InlineStack gap="200">
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
                                <div
                                    key={v.id}
                                    style={{
                                        padding: "12px",
                                        backgroundColor: selected.has(v.id)
                                            ? "var(--p-color-bg-selected)"
                                            : "var(--p-color-bg-hover)",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                    }}
                                    onClick={() => {
                                        setSelected((prev) => {
                                            const next = new Set(prev);
                                            next.has(v.id)
                                                ? next.delete(v.id)
                                                : next.add(v.id);
                                            return next;
                                        });
                                    }}
                                >
                                    <InlineStack
                                        gap="400"
                                        align="space-between"
                                    >
                                        <InlineStack gap="300">
                                            <Checkbox
                                                checked={selected.has(v.id)}
                                                onChange={() => {
                                                    toggleRowSelection(v.id);
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
                                </div>
                            ))}
                        </BlockStack>
                    </BlockStack>
                </Box>
            </IndexTable.Cell>
        </IndexTable.Row>
    );

    // Determine what to show in the table
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

    // Calculate total pages for current tab
    const totalPages =
        activeTab === "duplicates"
            ? totalDuplicatePages
            : Math.ceil(total / PRODUCTS_PER_PAGE);
    const currentPage = activeTab === "duplicates" ? duplicatePage : page;
    const itemCount =
        activeTab === "duplicates" ? duplicateGroups.length : total;

    return (
        <>
            <Card>
                <Box padding="400">
                    <Tabs
                        tabs={tabs}
                        selected={tabs.findIndex((t) => t.id === activeTab)}
                        onSelect={handleTabChange}
                        fitted
                    />
                </Box>

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

                <IndexTable
                    resourceName={{ singular: "variant", plural: "variants" }}
                    itemCount={itemCount}
                    selectedItemsCount={
                        selected.size === itemCount ? "All" : selected.size
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

                {!loading && (
                    <>
                        {totalPages > 1 && (
                            <>
                                <Divider />
                                <Box padding="400">
                                    <Pagination
                                        hasPrevious={currentPage > 1}
                                        onPrevious={() => {
                                            if (activeTab === "duplicates") {
                                                setDuplicatePage((p) => p - 1);
                                            } else {
                                                setPage((p) => p - 1);
                                            }
                                        }}
                                        hasNext={currentPage < totalPages}
                                        onNext={() => {
                                            if (activeTab === "duplicates") {
                                                setDuplicatePage((p) => p + 1);
                                            } else {
                                                setPage((p) => p + 1);
                                            }
                                        }}
                                        label={`${currentPage} of ${totalPages}`}
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

            {selectedVariant && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        padding: "16px",
                    }}
                    onClick={() => setSelectedVariant(null)}
                >
                    <Card
                        sectioned
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: "650px",
                            width: "100%",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            borderRadius: "12px",
                        }}
                    >
                        <Box
                            padding="400"
                            background="bg-surface-brand"
                            borderBlockEndWidth="1"
                            borderColor="border-brand"
                            borderRadius="300"
                        >
                            <InlineStack
                                align="space-between"
                                blockAlign="center"
                            >
                                <InlineStack gap="400" blockAlign="center">
                                    <Thumbnail
                                        source={
                                            selectedVariant.image ||
                                            selectedVariant.image_src
                                        }
                                        size="large"
                                        alt={selectedVariant.title}
                                    />
                                    <BlockStack gap="100">
                                        <Text
                                            variant="headingLg"
                                            fontWeight="bold"
                                            color="text-inverse"
                                        >
                                            {selectedVariant.title}
                                        </Text>
                                        <Text
                                            variant="bodyMd"
                                            tone="subdued"
                                            color="text-inverse"
                                        >
                                            {selectedVariant.vendor ||
                                                "No vendor"}
                                        </Text>
                                    </BlockStack>
                                </InlineStack>
                            </InlineStack>
                        </Box>

                        <Box padding="500">
                            <BlockStack gap="500">
                                <InlineStack gap="400">
                                    <Box
                                        background="bg-surface-success-subdued"
                                        padding="400"
                                        borderRadius="200"
                                        flex="1"
                                    >
                                        <Text variant="bodySm" tone="subdued">
                                            Price
                                        </Text>
                                        <Text
                                            variant="headingLg"
                                            fontWeight="bold"
                                        >
                                            Rs.{" "}
                                            {(
                                                Number(selectedVariant.price) ||
                                                0
                                            ).toFixed(2)}
                                        </Text>
                                    </Box>
                                    <Box
                                        background={
                                            selectedVariant.inventory_quantity >
                                            0
                                                ? "bg-surface-warning-subdued"
                                                : "bg-surface-critical-subdued"
                                        }
                                        padding="400"
                                        borderRadius="200"
                                        flex="1"
                                    >
                                        <Text variant="bodySm" tone="subdued">
                                            Stock
                                        </Text>
                                        <Text
                                            variant="headingLg"
                                            fontWeight="bold"
                                        >
                                            {+selectedVariant.inventory_quantity ||
                                                0}
                                        </Text>
                                    </Box>
                                </InlineStack>

                                <Box
                                    background="bg-surface-secondary"
                                    padding="400"
                                    borderRadius="300"
                                >
                                    <Text variant="headingMd" fontWeight="bold">
                                        SKU Migration
                                    </Text>
                                    <InlineStack
                                        gap="400"
                                        blockAlign="center"
                                        paddingBlockStart="300"
                                    >
                                        <BlockStack gap="200" align="center">
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                Current
                                            </Text>
                                            <Badge
                                                tone={
                                                    selectedVariant.old_sku
                                                        ? "info"
                                                        : "critical"
                                                }
                                                size="large"
                                            >
                                                {selectedVariant.old_sku ||
                                                    "Missing"}
                                            </Badge>
                                        </BlockStack>
                                        <Icon
                                            source={ArrowRightIcon}
                                            tone="subdued"
                                        />
                                        <BlockStack gap="200" align="center">
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                New
                                            </Text>
                                            <Badge tone="success" size="large">
                                                {selectedVariant.new_sku}
                                            </Badge>
                                        </BlockStack>
                                    </InlineStack>
                                </Box>

                                {(selectedVariant.option1 ||
                                    selectedVariant.option2 ||
                                    selectedVariant.option3) && (
                                    <Box>
                                        <Text
                                            variant="headingMd"
                                            fontWeight="semibold"
                                        >
                                            Options
                                        </Text>
                                        <InlineStack
                                            gap="300"
                                            paddingBlockStart="200"
                                        >
                                            {selectedVariant.option1 && (
                                                <Badge tone="attention">
                                                    {selectedVariant.option1}
                                                </Badge>
                                            )}
                                            {selectedVariant.option2 && (
                                                <Badge tone="attention">
                                                    {selectedVariant.option2}
                                                </Badge>
                                            )}
                                            {selectedVariant.option3 && (
                                                <Badge tone="attention">
                                                    {selectedVariant.option3}
                                                </Badge>
                                            )}
                                        </InlineStack>
                                    </Box>
                                )}

                                <Box>
                                    <Text
                                        variant="headingMd"
                                        fontWeight="semibold"
                                    >
                                        Identifiers
                                    </Text>
                                    <InlineStack
                                        gap="400"
                                        paddingBlockStart="200"
                                    >
                                        <BlockStack gap="050">
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                Barcode
                                            </Text>
                                            <Text>
                                                {selectedVariant.barcode || "—"}
                                            </Text>
                                        </BlockStack>
                                        <BlockStack gap="050">
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                Shopify ID
                                            </Text>
                                            <Text>
                                                {selectedVariant.shopify_variant_id ||
                                                    "—"}
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                </Box>
                            </BlockStack>
                        </Box>

                        <Box
                            padding="400"
                            background="bg-surface-secondary"
                            borderBlockStartWidth="1"
                            borderColor="border"
                            borderRadius="300"
                        >
                            <InlineStack align="end" gap="300">
                                <Button
                                    onClick={() => setSelectedVariant(null)}
                                >
                                    Close
                                </Button>
                            </InlineStack>
                        </Box>
                    </Card>
                </div>
            )}
        </>
    );
}
