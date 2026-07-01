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
    Tag,
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
    isApplyDisabled = () => false,
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
    selectedTags,
    setSelectedTags,
}) {
    const [selectedVariant, setSelectedVariant] = React.useState(null);
    const [tagsInput, setTagsInput] = React.useState("");

    const DUPLICATES_PER_PAGE = 8;
    const PRODUCTS_PER_PAGE = 8;

    // Server paginates duplicate groups
    const paginatedGroups = duplicateGroups;

    // ✅ TAB CONFIGURATION - USE STATS FROM BACKEND FOR EXACT COUNTS
    const tabs = [
        { id: "all", content: `All Products (${stats.total})` },
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

    // ✅ HANDLE ADDING TAGS - SUPPORTS BOTH BUTTON AND COMMA-SEPARATED
    const handleAddTag = () => {
        if (!tagsInput.trim()) return;

        // Split by comma if multiple tags are provided
        const newTags = tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
            .filter((t) => !selectedTags.includes(t)); // Avoid duplicates

        if (newTags.length > 0) {
            setSelectedTags([...selectedTags, ...newTags]);
            setTagsInput("");
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setSelectedTags(selectedTags.filter((tag) => tag !== tagToRemove));
    };

    const handleClearAll = () => {
        setQueryValue("");
        setSelectedCollectionIds([]);
        setSelectedVendors([]);
        setSelectedTypes([]);
        setSelectedTags([]);
    };

    // Build applied filters list
    const appliedFilters = [];
    if (selectedCollectionIds.length > 0) {
        const names = selectedCollectionIds
            .map(
                (id) =>
                    initialCollections.find((c) => c.id === id)?.title || id,
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
    if (selectedTags.length > 0) {
        appliedFilters.push({
            key: "tags",
            label: `Tags: ${selectedTags.join(", ")}`,
            onRemove: () => setSelectedTags([]),
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
        {
            key: "tags",
            label: "Tags",
            filter: (
                <BlockStack gap="300">
                    <TextField
                        labelHidden
                        placeholder="e.g. Summer, Premium, Sale"
                        value={tagsInput}
                        onChange={setTagsInput}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddTag();
                            }
                        }}
                        autoComplete="off"
                        helpText="Separate multiple tags with commas"
                    />
                    <Button
                        onClick={handleAddTag}
                        size="slim"
                        variant="primary"
                    >
                        Add Tag(s)
                    </Button>
                    {selectedTags.length > 0 && (
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "8px",
                                marginTop: "8px",
                            }}
                        >
                            {selectedTags.map((tag) => (
                                <Tag
                                    key={tag}
                                    onRemove={() => handleRemoveTag(tag)}
                                >
                                    {tag}
                                </Tag>
                            ))}
                        </div>
                    )}
                </BlockStack>
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
        <IndexTable.Row
            key={group.sku || `blank-${group.variants[0]?.id}`}
            id={group.sku || `blank-${group.variants[0]?.id}`}
        >
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
                                                group.variants.map((v) => v.id),
                                            ),
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
                                                group.variants.map((v) => v.id),
                                            ),
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
                                            {/* stopPropagation so the checkbox's
                                                own click doesn't ALSO bubble to
                                                the row onClick (double toggle). */}
                                            <span
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <Checkbox
                                                    checked={selected.has(v.id)}
                                                    onChange={() => {
                                                        toggleRowSelection(v.id);
                                                    }}
                                                    ariaLabel={`Select ${v.title || "variant"}`}
                                                />
                                            </span>
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

    // Data is now paginated on the server
    const visiblePreview = preview;

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
            visiblePreview.map(renderRow)
        );

    // Calculate total pages for current tab
    const totalPages =
        activeTab === "duplicates"
            ? Math.ceil(total / DUPLICATES_PER_PAGE)
            : Math.ceil(total / PRODUCTS_PER_PAGE);

    const currentPage = activeTab === "duplicates" ? duplicatePage : page;
    const itemCount = total; // Total is now consistently passed from backend (Total Groups or Total Variants)

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

                {/* Duplicates use a custom per-variant layout, so IndexTable's
                    built-in selection is turned off there (its phantom group-row
                    checkbox polluted the selection set). This toolbar restores
                    Select Visible / Clear for that tab. */}
                {activeTab === "duplicates" && duplicateGroups.length > 0 && (
                    <Box paddingInline="400" paddingBlockEnd="300">
                        <InlineStack align="space-between" blockAlign="center">
                            <Text fontWeight="medium">
                                {selected.size} selected
                            </Text>
                            <ButtonGroup>
                                <Button
                                    onClick={() => {
                                        const ids = paginatedGroups.flatMap((g) =>
                                            g.variants.map((v) => v.id),
                                        );
                                        setSelected((prev) => {
                                            const next = new Set(prev);
                                            ids.forEach((id) => next.add(id));
                                            return next;
                                        });
                                    }}
                                >
                                    Select Visible
                                </Button>
                                <Button onClick={() => setSelected(new Set())}>
                                    Clear Selection
                                </Button>
                            </ButtonGroup>
                        </InlineStack>
                    </Box>
                )}

                <IndexTable
                    selectable={activeTab !== "duplicates"}
                    resourceName={{ singular: "variant", plural: "variants" }}
                    itemCount={itemCount}
                    selectedItemsCount={
                        selected.size === itemCount ? "All" : selected.size
                    }
                    onSelectionChange={(selectionType, toggle, selection) => {
                        if (selectionType === "all") {
                            const ids =
                                activeTab === "duplicates"
                                    ? duplicateGroups.flatMap((g) =>
                                          g.variants.map((v) => v.id),
                                      )
                                    : preview.map((p) => p.id);
                            setSelected(toggle ? new Set(ids) : new Set());
                        } else if (selectionType === "single") {
                            setSelected((prev) => {
                                const next = new Set(prev);
                                if (toggle) {
                                    next.add(selection);
                                } else {
                                    next.delete(selection);
                                }
                                return next;
                            });
                        } else if (selectionType === "page") {
                            // Select all visible on current page
                            const ids =
                                activeTab === "duplicates"
                                    ? paginatedGroups.flatMap((g) =>
                                          g.variants.map((v) => v.id),
                                      )
                                    : preview.map((p) => p.id); // Valid for current page in 'all'/'missing' tabs

                            setSelected((prev) => {
                                const next = new Set(prev);
                                // Check if all these IDs are already in set to decide intent
                                const allSelected = ids.every((id) =>
                                    next.has(id),
                                );

                                ids.forEach((id) =>
                                    allSelected
                                        ? next.delete(id)
                                        : next.add(id),
                                );
                                return next;
                            });
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
                            content: "Select Visible",
                            onAction: () => {
                                const ids =
                                    activeTab === "duplicates"
                                        ? paginatedGroups.flatMap((g) =>
                                              g.variants.map((v) => v.id),
                                          )
                                        : preview.map((p) => p.id);
                                setSelected((prev) => {
                                    const next = new Set(prev);
                                    ids.forEach((id) => next.add(id));
                                    return next;
                                });
                            },
                        },
                        {
                            content: "Clear Selection",
                            onAction: () => setSelected(new Set()),
                        },
                        activeTab === "duplicates" && {
                            content: `Select All Duplicates (${stats.duplicates})`,
                            onAction: () => {
                                const ids = duplicateGroups.flatMap((g) =>
                                    g.variants.map((v) => v.id),
                                );
                                setSelected(new Set(ids));
                            },
                        },
                    ].filter(Boolean)}
                    promotedBulkActions={[
                        {
                            content: "Select Visible",
                            onAction: () => {
                                const ids =
                                    activeTab === "duplicates"
                                        ? paginatedGroups.flatMap((g) =>
                                              g.variants.map((v) => v.id),
                                          )
                                        : preview.map((p) => p.id);
                                setSelected((prev) => {
                                    const next = new Set(prev);
                                    ids.forEach((id) => next.add(id));
                                    return next;
                                });
                            },
                        },
                        {
                            content: "Clear Selection",
                            onAction: () => setSelected(new Set()),
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
                            <BlockStack gap="400">
                                <Button
                                    fullWidth
                                    variant="primary"
                                    size="large"
                                    loading={applying}
                                    onClick={() => {
                                        if (selected.size > 0) {
                                            applySKUs("selected");
                                        } else {
                                            applySKUs("all");
                                        }
                                    }}
                                    disabled={
                                        (selected.size === 0 &&
                                            itemCount === 0) ||
                                        isApplyDisabled(
                                            selected.size > 0
                                                ? "selected"
                                                : "all",
                                        )
                                    }
                                >
                                    {selected.size > 0
                                        ? `Generate SKUs for ${selected.size} Selected Items`
                                        : activeTab === "duplicates"
                                          ? `Fix All ${stats.duplicates} Duplicate SKUs`
                                          : activeTab === "missing"
                                            ? `Fix All ${stats.missing} Missing SKUs`
                                            : `Generate SKUs for All ${stats.total} Variants`}
                                </Button>
                            </BlockStack>
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
                        {/* HEADER */}
                        <Box padding="400">
                            <InlineStack
                                align="space-between"
                                blockAlign="center"
                            >
                                <InlineStack gap="400" blockAlign="center">
                                    <Thumbnail
                                        source={
                                            selectedVariant.image ||
                                            selectedVariant.image_src ||
                                            selectedVariant.image_url
                                        }
                                        size="large"
                                        alt={selectedVariant.title}
                                    />

                                    <BlockStack gap="200">
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

                                        <Text
                                            variant="headingLg"
                                            fontWeight="bold"
                                            color="text-inverse"
                                        >
                                            Rs.{" "}
                                            {(
                                                Number(selectedVariant.price) ||
                                                0
                                            ).toFixed(2)}
                                        </Text>

                                        <InlineStack
                                            gap="300"
                                            paddingBlockStart="200"
                                        >
                                            <Badge tone="info">
                                                SKU:{" "}
                                                {selectedVariant.old_sku || "—"}
                                            </Badge>
                                        </InlineStack>

                                        {(selectedVariant.option1 ||
                                            selectedVariant.option2 ||
                                            selectedVariant.option3) && (
                                            <InlineStack
                                                gap="300"
                                                paddingBlockStart="200"
                                            >
                                                {selectedVariant.option1 && (
                                                    <Badge tone="attention">
                                                        {
                                                            selectedVariant.option1
                                                        }
                                                    </Badge>
                                                )}
                                                {selectedVariant.option2 && (
                                                    <Badge tone="attention">
                                                        {
                                                            selectedVariant.option2
                                                        }
                                                    </Badge>
                                                )}
                                                {selectedVariant.option3 && (
                                                    <Badge tone="attention">
                                                        {
                                                            selectedVariant.option3
                                                        }
                                                    </Badge>
                                                )}
                                            </InlineStack>
                                        )}

                                        <Text
                                            variant="bodySm"
                                            tone="subdued"
                                            color="text-inverse"
                                        >
                                            Variant ID:{" "}
                                            {selectedVariant.shopify_variant_id ||
                                                "—"}
                                        </Text>
                                    </BlockStack>
                                </InlineStack>
                            </InlineStack>
                        </Box>

                        {/* BODY */}
                        <Box padding="500">
                            <BlockStack gap="500">
                                {/* SKU Migration */}
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
                                        paddingBlockStart="300"
                                        blockAlign="center"
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
                                                {selectedVariant.new_sku ||
                                                    selectedVariant.sku ||
                                                    "—"}
                                            </Badge>
                                        </BlockStack>
                                    </InlineStack>
                                </Box>
                            </BlockStack>
                        </Box>

                        {/* FOOTER */}
                        <Box
                            padding="400"
                            background="bg-surface-secondary"
                            borderBlockStartWidth="1"
                            borderColor="border"
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
