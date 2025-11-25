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
    ButtonGroup,
} from "@shopify/polaris";
import {
    SearchIcon,
    HashtagIcon,
    CheckCircleIcon,
    AlertCircleIcon,
} from "@shopify/polaris-icons";

const PAGE_SIZE = 25;

export default function VariantBarcodeTable({
    barcodes = [],
    total = 0,
    page = 1,
    setPage,
    selected = new Set(),
    setSelected,
    loading = false,
    duplicateGroups = {},
    applyBarcodes = () => {},
    applying = false,
    activeTab: controlledTab,
    setActiveTab: setControlledTab,
    form = { search: "", vendor: "", type: "" },
    handleChange = () => {},
}) {
    const activeTab = controlledTab || "all";
    const setActiveTab = setControlledTab || (() => {});

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const tabs = [
        {
            id: "all",
            content: (
                <>
                    All <Badge status="info">{total}</Badge>
                </>
            ),
        },
        {
            id: "duplicates",
            content: (
                <>
                    Duplicates{" "}
                    <Badge status="critical">
                        {Object.keys(duplicateGroups).length}
                    </Badge>
                </>
            ),
        },
    ];

    const handleTabChange = (selectedTabIndex) => {
        const tabId = tabs[selectedTabIndex].id;
        setActiveTab(tabId);
        setSelected(new Set());
        setPage(1);
    };

    const handleSelectionChange = (selectionType, shouldSelect, id) => {
        if (selectionType === "all") {
            const allIds = barcodes.map((b) => b.id);
            setSelected(shouldSelect ? new Set(allIds) : new Set());
        } else if (selectionType === "page") {
            const pageIds = barcodes
                .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                .map((b) => b.id);
            setSelected((prev) => {
                const next = new Set(prev);
                pageIds.forEach((pid) =>
                    shouldSelect ? next.add(pid) : next.delete(pid)
                );
                return next;
            });
        } else if (id !== undefined) {
            setSelected((prev) => {
                const next = new Set(prev);
                shouldSelect ? next.add(id) : next.delete(id);
                return next;
            });
        }
    };

    const displayedBarcodes =
        activeTab === "all"
            ? barcodes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
            : barcodes;

    const rowMarkup =
        activeTab === "all"
            ? displayedBarcodes.map((v) => (
                  <IndexTable.Row
                      key={v.id}
                      id={v.id}
                      selected={selected.has(v.id)}
                  >
                      <IndexTable.Cell>
                          <Thumbnail
                              source={v.image_url || ""}
                              size="small"
                              alt={v.variant_title}
                          />
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                          <Text fontWeight="medium">
                              {v.variant_title || "—"}
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                              {v.sku || "—"}
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                              {v.vendor || "—"}
                          </Text>
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                          <Text fontWeight="medium">
                              {v.barcode_value || "—"}
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                              {v.old_barcode
                                  ? `Old: ${v.old_barcode}`
                                  : "Old: —"}
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                              {v.format || "UPC"}
                          </Text>
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                          {v.status === "empty" && (
                              <Badge tone="warning">Empty</Badge>
                          )}
                          {v.status === "duplicate" && (
                              <Badge tone="critical" icon={AlertCircleIcon}>
                                  Duplicate
                              </Badge>
                          )}
                          {v.status === "unique" && (
                              <Badge tone="success" icon={CheckCircleIcon}>
                                  Unique
                              </Badge>
                          )}
                      </IndexTable.Cell>
                  </IndexTable.Row>
              ))
            : Object.entries(duplicateGroups).map(([code, items]) => (
                  <IndexTable.Row key={code} id={`dup-${code}`} disabled>
                      <IndexTable.Cell colSpan={4}>
                          <BlockStack gap="400">
                              <InlineStack
                                  align="space-between"
                                  blockAlign="center"
                              >
                                  <InlineStack gap="200">
                                      <Icon
                                          source={HashtagIcon}
                                          tone="critical"
                                      />
                                      <Text fontWeight="bold" tone="critical">
                                          {code}
                                      </Text>
                                      <Badge tone="critical">
                                          {items.length} conflicts
                                      </Badge>
                                  </InlineStack>

                                  <ButtonGroup>
                                      <Button
                                          size="slim"
                                          onClick={() =>
                                              setSelected(
                                                  new Set(
                                                      items.map((i) => i.id)
                                                  )
                                              )
                                          }
                                      >
                                          Select Group
                                      </Button>
                                      <Button
                                          primary
                                          size="slim"
                                          onClick={() => {
                                              setSelected(
                                                  new Set(
                                                      items.map((i) => i.id)
                                                  )
                                              );
                                              applyBarcodes("selected");
                                          }}
                                      >
                                          Fix Group
                                      </Button>
                                  </ButtonGroup>
                              </InlineStack>

                              <BlockStack gap="200">
                                  {items.map((v) => {
                                      const isSelected = selected.has(v.id);
                                      return (
                                          <Box
                                              key={v.id}
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
                                                              v.id
                                                          )
                                                      }
                                                  />
                                                  <Thumbnail
                                                      source={v.image_url || ""}
                                                      size="small"
                                                  />
                                                  <BlockStack>
                                                      <Text fontWeight="medium">
                                                          {v.variant_title ||
                                                              "—"}
                                                      </Text>
                                                      <Text
                                                          variant="bodySm"
                                                          tone="subdued"
                                                      >
                                                          {v.sku || "—"}
                                                      </Text>
                                                  </BlockStack>
                                                  <Text
                                                      fontWeight="bold"
                                                      tone="critical"
                                                  >
                                                      {v.barcode_value}
                                                  </Text>
                                              </InlineStack>
                                          </Box>
                                      );
                                  })}
                              </BlockStack>
                          </BlockStack>
                      </IndexTable.Cell>
                  </IndexTable.Row>
              ));

    return (
        <Card>
            <Tabs
                tabs={tabs}
                selected={tabs.findIndex((t) => t.id === activeTab)}
                onSelect={handleTabChange}
            >
                <BlockStack gap="400">
                    {/* Search Bar */}
                    <Box padding="400" background="bg-surface-active">
                        <InlineStack gap="300" align="start" wrap={false}>
                            <Box minWidth="320">
                                <TextField
                                    placeholder="Search variants, SKU or barcode..."
                                    prefix={<Icon source={SearchIcon} />}
                                    value={form.search || ""}
                                    onChange={(v) => handleChange("search", v)}
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
                                    value={form.vendor || ""}
                                    onChange={(v) => handleChange("vendor", v)}
                                />
                            </Box>
                            <Box minWidth="160">
                                <TextField
                                    labelHidden
                                    placeholder="Type"
                                    value={form.type || ""}
                                    onChange={(v) => handleChange("type", v)}
                                />
                            </Box>
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
                        itemCount={
                            activeTab === "all"
                                ? total
                                : Object.keys(duplicateGroups).length
                        }
                        selectedItemsCount={selected.size}
                        onSelectionChange={handleSelectionChange}
                        headings={
                            activeTab === "all"
                                ? [
                                      { title: "Image" },
                                      { title: "Variant / SKU / Vendor" },
                                      { title: "New / Old / Format" },
                                      { title: "Status" },
                                  ]
                                : [{ title: "Duplicate Groups" }]
                        }
                        loading={loading}
                        emptyState={
                            activeTab === "duplicates" &&
                            Object.keys(duplicateGroups).length === 0 && (
                                <EmptyState heading="No duplicates found">
                                    <Text tone="success">
                                        All barcodes are unique!
                                    </Text>
                                </EmptyState>
                            )
                        }
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

                    {/* Pagination */}
                    {activeTab === "all" && totalPages > 1 && (
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

                    {/* Action Bar */}
                    <Box
                        padding="400"
                        background="bg-surface-secondary"
                        borderBlockStartWidth="1"
                    >
                        <InlineStack align="space-between">
                            <InlineStack gap="200">
                                <Button onClick={() => setSelected(new Set())}>
                                    Clear
                                </Button>
                                <Button
                                    onClick={() =>
                                        handleSelectionChange("page", true)
                                    }
                                >
                                    Select Page
                                </Button>
                            </InlineStack>

                            <InlineStack gap="400" align="end">
                                <Button
                                    primary
                                    loading={applying}
                                    disabled={selected.size === 0 || applying}
                                    onClick={() => applyBarcodes("selected")}
                                >
                                    Apply Selected ({selected.size})
                                </Button>
                                <Button
                                    tone="critical"
                                    loading={applying}
                                    disabled={applying}
                                    onClick={() =>
                                        applyBarcodes("all_matching")
                                    }
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
