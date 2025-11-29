// resources/js/Pages/components/barcode/BarcodePreviewTable.jsx
import React from "react";
import {
    Card,
    IndexTable,
    Tabs,
    Filters,
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
    ChoiceList,
    TextField,
} from "@shopify/polaris";
import { HashtagIcon, ArrowRightIcon } from "@shopify/polaris-icons";

export default function BarcodePreviewTable({
    barcodes = [],
    total = 0,
    overall_total = 0, // ← real total from backend
    duplicateGroups = {},
    stats = { missing: 0, duplicates: 0 }, // ← comes from backend (NEVER CHANGES)
    page,
    setPage,
    duplicatePage,
    setDuplicatePage,
    activeTab,
    setActiveTab,
    selected,
    setSelected,
    loading,
    applying,
    applyBarcodes,
    form,
    handleChange,
    initialCollections = [],
    selectedCollectionIds = [],
    setSelectedCollectionIds,
    selectedVendors = [],
    setSelectedVendors,
    selectedTypes = [],
    setSelectedTypes,
}) {
    const [selectedVariant, setSelectedVariant] = React.useState(null);

    // Convert duplicateGroups to list ONLY for display (pagination on THIS page)
    const duplicateGroupList = React.useMemo(() => {
        if (!duplicateGroups || typeof duplicateGroups !== "object") return [];
        return Object.entries(duplicateGroups).map(([barcode, variants]) => ({
            barcode,
            count: variants.length,
            variants,
        }));
    }, [duplicateGroups]);

    const DUPLICATES_PER_PAGE = 10;
    const totalDuplicatePages = Math.ceil(
        duplicateGroupList.length / DUPLICATES_PER_PAGE
    );
    const paginatedGroups = duplicateGroupList.slice(
        (duplicatePage - 1) * DUPLICATES_PER_PAGE,
        duplicatePage * DUPLICATES_PER_PAGE
    );

    // ============================================================
    // PERFECT TAB COUNTS — USE STATS FROM BACKEND (NEVER CHANGES)
    // ============================================================
    const tabs = [
        { id: "all", content: `All Variants (${overall_total})` },
        {
            id: "duplicates",
            content: `Duplicates (${stats.duplicates})`, // ← USE stats.duplicates
        },
        { id: "missing", content: `Missing Barcodes (${stats.missing})` }, // ← USE stats.missing
    ];

    const handleTabChange = (selectedTabIndex) => {
        const tabId = tabs[selectedTabIndex].id;
        setActiveTab(tabId);
        setPage(1);
        setDuplicatePage(1);
        setSelected(new Set());
    };

    const handleClearAll = () => {
        handleChange("search", "");
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
            label: `Type: ${selectedTypes.join(", ")}`,
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
                    onChange={(v) => setSelectedCollectionIds(v.map(Number))}
                />
            ),
            shortcut: true,
        },
        {
            key: "vendor",
            label: "Vendor",
            filter: (
                <TextField
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

    const toggleRowSelection = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
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
                    source={item.image_url || ""}
                    size="small"
                    alt={item.variant_title}
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
                            textAlign: "left",
                            cursor: "pointer",
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
                                maxWidth: "340px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                            title={item.variant_title}
                        >
                            {item.variant_title || "Untitled Variant"}
                        </div>
                    </button>
                    <Text variant="bodySm" tone="subdued">
                        {item.vendor} {item.sku && `• SKU: ${item.sku}`}
                    </Text>
                </BlockStack>
            </IndexTable.Cell>

            <IndexTable.Cell>
                {item.old_barcode ? (
                    <Badge tone="info">{item.old_barcode}</Badge>
                ) : (
                    <InlineStack gap="200">
                        <Text tone="critical">No Barcode</Text>
                    </InlineStack>
                )}
            </IndexTable.Cell>

            <IndexTable.Cell>
                <InlineStack gap="300" blockAlign="center">
                    <Badge tone="success" size="large">
                        {item.new_barcode || "—"}
                    </Badge>
                    <Text variant="bodySm" tone="subdued">
                        {item.format || "UPC"}
                    </Text>
                </InlineStack>
            </IndexTable.Cell>
        </IndexTable.Row>
    );

    const renderDuplicateGroup = (group) => (
        <IndexTable.Row key={group.barcode}>
            <IndexTable.Cell colSpan={4}>
                <Box padding="400">
                    <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="300" blockAlign="center">
                                <Icon source={HashtagIcon} tone="critical" />
                                <BlockStack gap="100">
                                    <Text fontWeight="bold" tone="critical">
                                        Conflicting Barcode
                                    </Text>
                                    <InlineStack gap="200">
                                        <Badge status="critical" size="large">
                                            {group.barcode || "(Blank)"}
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
                                        applyBarcodes("selected");
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
                                    onClick={() => toggleRowSelection(v.id)}
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
                                                source={v.image_url || ""}
                                                size="small"
                                            />
                                            <BlockStack gap="050">
                                                <Text fontWeight="medium">
                                                    {v.variant_title}
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
                                                {v.old_barcode || "—"}
                                            </Badge>
                                            <Icon source={ArrowRightIcon} />
                                            <Badge tone="success">
                                                {v.new_barcode}
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

    const rowMarkup =
        activeTab === "duplicates" ? (
            duplicateGroupList.length === 0 ? (
                <IndexTable.Row>
                    <IndexTable.Cell colSpan={4}>
                        <EmptyState heading="No duplicate barcodes found">
                            <Text tone="subdued">All barcodes are unique!</Text>
                        </EmptyState>
                    </IndexTable.Cell>
                </IndexTable.Row>
            ) : (
                paginatedGroups.map(renderDuplicateGroup)
            )
        ) : barcodes.length === 0 ? (
            <IndexTable.Row>
                <IndexTable.Cell colSpan={4}>
                    <EmptyState heading="No variants found">
                        <Text tone="subdued">Try adjusting your filters</Text>
                    </EmptyState>
                </IndexTable.Cell>
            </IndexTable.Row>
        ) : (
            barcodes.map(renderRow)
        );

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
                        queryValue={form.search || ""}
                        onQueryChange={(v) => handleChange("search", v)}
                        onQueryClear={() => handleChange("search", "")}
                        filters={filters}
                        appliedFilters={appliedFilters}
                        onClearAll={handleClearAll}
                        queryPlaceholder="Search products, SKU, barcode..."
                    />
                </Box>

                <IndexTable
                    resourceName={{ singular: "variant", plural: "variants" }}
                    itemCount={
                        activeTab === "duplicates"
                            ? duplicateGroupList.length
                            : total
                    }
                    selectedItemsCount={
                        selected.size ===
                        (activeTab === "duplicates"
                            ? duplicateGroupList.flatMap((g) => g.variants)
                                  .length
                            : total)
                            ? "All"
                            : selected.size
                    }
                    onSelectionChange={(selectionType, toggle) => {
                        if (selectionType === "all") {
                            const ids =
                                activeTab === "duplicates"
                                    ? duplicateGroupList.flatMap((g) =>
                                          g.variants.map((v) => v.id)
                                      )
                                    : barcodes.map((b) => b.id);
                            setSelected(toggle ? new Set(ids) : new Set());
                        }
                    }}
                    hasZebraStriping
                    headings={[
                        { title: "" },
                        { title: "Product" },
                        { title: "Current Barcode" },
                        { title: "New Barcode" },
                    ]}
                    bulkActions={[
                        {
                            content: `Apply to Selected (${selected.size})`,
                            onAction: () => applyBarcodes("selected"),
                            disabled: selected.size === 0,
                        },
                    ]}
                    promotedBulkActions={[
                        {
                            content: "Apply to Visible",
                            onAction: () => applyBarcodes("visible"),
                        },
                    ]}
                    loading={loading}
                >
                    {rowMarkup}
                </IndexTable>

                {!loading && (
                    <>
                        {activeTab === "duplicates" &&
                            totalDuplicatePages > 1 && (
                                <>
                                    <Divider />
                                    <Box padding="400">
                                        <Pagination
                                            hasPrevious={duplicatePage > 1}
                                            onPrevious={() =>
                                                setDuplicatePage((p) => p - 1)
                                            }
                                            hasNext={
                                                duplicatePage <
                                                totalDuplicatePages
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
                                            onPrevious={() =>
                                                setPage((p) => p - 1)
                                            }
                                            hasNext={
                                                page < Math.ceil(total / 25)
                                            }
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
                                        onClick={() => applyBarcodes("visible")}
                                        disabled={barcodes.length === 0}
                                    >
                                        Apply to Visible ({barcodes.length})
                                    </Button>
                                </ButtonGroup>

                                <ButtonGroup>
                                    <Button
                                        onClick={() => applyBarcodes("all")}
                                    >
                                        {activeTab === "duplicates"
                                            ? `Fix All Duplicates (${stats.duplicates})`
                                            : activeTab === "missing"
                                            ? `Fix All Missing (${stats.missing})`
                                            : `Apply to All (${overall_total})`}
                                    </Button>
                                    <Button
                                        variant="primary"
                                        loading={applying}
                                        disabled={selected.size === 0}
                                        onClick={() =>
                                            applyBarcodes("selected")
                                        }
                                    >
                                        Apply to Selected ({selected.size})
                                    </Button>
                                </ButtonGroup>
                            </InlineStack>
                        </Box>
                    </>
                )}
            </Card>

            {/* Modal */}
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
                        }}
                    >
                        <Box padding="400" background="bg-surface-brand">
                            <InlineStack
                                align="space-between"
                                blockAlign="center"
                            >
                                <InlineStack gap="400">
                                    <Thumbnail
                                        source={selectedVariant.image_url || ""}
                                        size="large"
                                    />
                                    <BlockStack gap="100">
                                        <Text
                                            variant="headingLg"
                                            fontWeight="bold"
                                            color="text-inverse"
                                        >
                                            {selectedVariant.variant_title}
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
                                <Box
                                    background="bg-surface-secondary"
                                    padding="400"
                                    borderRadius="300"
                                >
                                    <Text variant="headingMd" fontWeight="bold">
                                        Barcode Migration
                                    </Text>
                                    <InlineStack
                                        gap="400"
                                        blockAlign="center"
                                        paddingBlockStart="300"
                                    >
                                        <BlockStack align="center">
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                Current
                                            </Text>
                                            <Badge
                                                tone={
                                                    selectedVariant.old_barcode
                                                        ? "info"
                                                        : "critical"
                                                }
                                                size="large"
                                            >
                                                {selectedVariant.old_barcode ||
                                                    "Missing"}
                                            </Badge>
                                        </BlockStack>
                                        <Icon
                                            source={ArrowRightIcon}
                                            tone="subdued"
                                        />
                                        <BlockStack align="center">
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                New
                                            </Text>
                                            <Badge tone="success" size="large">
                                                {selectedVariant.new_barcode}
                                            </Badge>
                                        </BlockStack>
                                    </InlineStack>
                                </Box>
                            </BlockStack>
                        </Box>

                        <Box
                            padding="400"
                            background="bg-surface-secondary"
                            borderBlockStartWidth="1"
                        >
                            <InlineStack align="end">
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
