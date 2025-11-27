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
} from "@shopify/polaris";
import {
    HashtagIcon,
    CheckCircleIcon,
    SearchIcon,
} from "@shopify/polaris-icons";

export default function SkuPreviewTable({
    preview,
    duplicateGroups,
    total,
    stats,
    visibleIds,
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
                    <Badge status="critical">{stats.duplicates}</Badge>
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

    const renderRow = (item) => (
        <IndexTable.Row
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
                <Thumbnail source={mediaUrl(item) || ""} size="small" alt="" />
            </IndexTable.Cell>
            <IndexTable.Cell>
                <Text fontWeight="semibold">{item.title}</Text>
                <Text variant="bodySm" tone="subdued">
                    {item.vendor} • {item.option || "Default Title"}
                </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
                <Text tone={item.old_sku ? "subdued" : "critical"}>
                    {item.old_sku || "—"}
                </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
                <Text fontWeight="bold" tone="success">
                    {item.new_sku}
                </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
                {item.is_duplicate ? (
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
        const { sku, count, variants } = group;
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
                                                setSelected((prev) => {
                                                    const next = new Set(prev);
                                                    next.has(v.id)
                                                        ? next.delete(v.id)
                                                        : next.add(v.id);
                                                    return next;
                                                })
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
                        <EmptyState heading="No duplicates found!" />
                    </IndexTable.Cell>
                </IndexTable.Row>
            ) : (
                paginatedGroups.map(renderDuplicateGroup)
            )
        ) : (
            preview.map(renderRow)
        );

    return (
        <Card>
            <Box padding="400">
                <InlineStack align="space-between" blockAlign="center">
                    <Tabs
                        tabs={tabs}
                        selected={tabs.findIndex((t) => t.id === activeTab)}
                        onSelect={(i) => {
                            setActiveTab(tabs[i].id);
                            setPage(1);
                            setDuplicatePage(1);
                            setSelected(new Set());
                        }}
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
                </InlineStack>
            </Box>

            <IndexTable
                resourceName={{ singular: "variant", plural: "variants" }}
                itemCount={
                    activeTab === "duplicates" ? duplicateGroups.length : total
                }
                selectedItemsCount={
                    selected.size || (selected.size === 0 ? 0 : "All")
                }
                onSelectionChange={(type, toggle) => {
                    if (type === "all") {
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
                              { title: "Image" },
                              { title: "Product" },
                              { title: "Old SKU" },
                              { title: "New SKU" },
                              { title: "Status" },
                          ]
                }
                bulkActions={[
                    {
                        content: "Apply to Selected",
                        onAction: () => applySKUs("selected"),
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

            {activeTab === "duplicates"
                ? totalDuplicatePages > 1 && (
                      <Box padding="400">
                          <InlineStack align="space-between">
                              <Text variant="bodySm">
                                  Page {duplicatePage} of {totalDuplicatePages}
                              </Text>
                              <Pagination
                                  hasPrevious={duplicatePage > 1}
                                  onPrevious={() =>
                                      setDuplicatePage((p) => p - 1)
                                  }
                                  hasNext={duplicatePage < totalDuplicatePages}
                                  onNext={() => setDuplicatePage((p) => p + 1)}
                              />
                          </InlineStack>
                      </Box>
                  )
                : Math.ceil(total / 25) > 1 && (
                      <Box padding="400">
                          <InlineStack align="space-between">
                              <Text variant="bodySm">
                                  Page {page} of {Math.ceil(total / 25)}
                              </Text>
                              <Pagination
                                  hasPrevious={page > 1}
                                  onPrevious={() => setPage((p) => p - 1)}
                                  hasNext={page < Math.ceil(total / 25)}
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
                        <Button onClick={() => applySKUs("visible")}>
                            Apply to Visible ({preview.length})
                        </Button>
                        <Button onClick={() => applySKUs("all")}>
                            {activeTab === "duplicates"
                                ? "Fix All Duplicates"
                                : activeTab === "missing"
                                ? "Fix All Missing"
                                : "Apply to All"}
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
        </Card>
    );
}
