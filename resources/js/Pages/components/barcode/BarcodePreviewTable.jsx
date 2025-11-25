// resources/js/Pages/components/barcode/BarcodePreviewTable.jsx

import React, { useState } from "react";
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
} from "@shopify/polaris";

import {
    SearchIcon,
    HashtagIcon,
    AlertCircleIcon,
    CheckCircleIcon,
} from "@shopify/polaris-icons";

const PAGE_SIZE = 25;

export default function BarcodePreviewTable({
    barcodes = [],
    loading = false,

    // filtering
    form = {},
    handleChange,

    // paging
    page,
    setPage,

    // duplicates
    duplicates = [],
    duplicateGroups = {},

    // selection
    selected,
    setSelected,
}) {
    const [activeTab, setActiveTab] = useState("all");
    const totalPages = Math.ceil(barcodes.length / PAGE_SIZE);

    const tabs = [
        {
            id: "all",
            content: (
                <>
                    All <Badge status="info">{barcodes.length}</Badge>
                </>
            ),
        },
        {
            id: "duplicates",
            content: (
                <>
                    Duplicates{" "}
                    <Badge status="critical">{duplicates.length}</Badge>
                </>
            ),
        },
    ];

    const handleTabChange = (index) => {
        setActiveTab(tabs[index].id);
        setSelected(new Set());
        setPage(1);
    };

    const handleSelectionChange = (type, toggle, id) => {
        if (type === "all") {
            setSelected(
                toggle ? new Set(currentBarcodes().map((b) => b.id)) : new Set()
            );
        } else if (id !== undefined) {
            setSelected((prev) => {
                const next = new Set(prev);
                toggle ? next.add(id) : next.delete(id);
                return next;
            });
        }
    };

    // paginate
    const currentBarcodes = () => {
        const start = (page - 1) * PAGE_SIZE;
        return barcodes.slice(start, start + PAGE_SIZE);
    };

    const rows =
        activeTab === "all"
            ? currentBarcodes().map((b, index) => (
                  <IndexTable.Row
                      id={b.id}
                      key={b.id}
                      position={index}
                      selected={selected.has(b.id)}
                  >
                      <IndexTable.Cell>
                          <Thumbnail source={b.image_url} size="small" />
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                          <BlockStack gap="0">
                              <Text fontWeight="bold">{b.barcode_value}</Text>
                              <Text tone="subdued">{b.format}</Text>
                          </BlockStack>
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                          {b.product ? b.product.title : "—"}
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                          {!b.barcode_value ? (
                              <Badge tone="warning">Empty</Badge>
                          ) : b.is_duplicate ? (
                              <Badge tone="critical" icon={AlertCircleIcon}>
                                  Duplicate
                              </Badge>
                          ) : (
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
                          <BlockStack gap="300">
                              {/* Duplicate header */}
                              <InlineStack align="space-between">
                                  <InlineStack gap="200">
                                      <Icon
                                          source={HashtagIcon}
                                          tone="critical"
                                      />
                                      <Text fontWeight="bold" tone="critical">
                                          {code}
                                      </Text>
                                      <Badge tone="critical">
                                          {items.length} Conflicts
                                      </Badge>
                                  </InlineStack>

                                  <Button
                                      size="slim"
                                      onClick={() =>
                                          setSelected(
                                              new Set(items.map((i) => i.id))
                                          )
                                      }
                                  >
                                      Select All
                                  </Button>
                              </InlineStack>

                              {/* Items */}
                              <BlockStack gap="200">
                                  {items.map((b) => {
                                      const active = selected.has(b.id);
                                      return (
                                          <Box
                                              key={b.id}
                                              padding="300"
                                              background={
                                                  active
                                                      ? "bg-surface-selected"
                                                      : "bg-surface"
                                              }
                                              borderRadius="200"
                                          >
                                              <InlineStack gap="400">
                                                  <input
                                                      type="checkbox"
                                                      checked={active}
                                                      onChange={() =>
                                                          handleSelectionChange(
                                                              "single",
                                                              !active,
                                                              b.id
                                                          )
                                                      }
                                                  />

                                                  <Thumbnail
                                                      source={b.image_url}
                                                      size="small"
                                                  />

                                                  <BlockStack>
                                                      <Text fontWeight="bold">
                                                          {b.barcode_value}
                                                      </Text>
                                                      <Text
                                                          tone="subdued"
                                                          variant="bodySm"
                                                      >
                                                          {b.format}
                                                      </Text>
                                                  </BlockStack>

                                                  <Text tone="subdued">
                                                      {b.product
                                                          ? b.product.title
                                                          : "—"}
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
            {/* Tabs */}
            <Tabs
                tabs={tabs}
                selected={tabs.findIndex((t) => t.id === activeTab)}
                onSelect={handleTabChange}
            >
                <BlockStack gap="300">
                    {/* FILTER BAR */}
                    <Box padding="400" background="bg-surface-active">
                        <InlineStack gap="300" align="start">
                            <Box minWidth="420">
                                <TextField
                                    placeholder="Search barcodes or products..."
                                    prefix={<Icon source={SearchIcon} />}
                                    value={form.search}
                                    onChange={(v) => handleChange("search", v)}
                                    clearButton
                                    onClearButtonClick={() =>
                                        handleChange("search", "")
                                    }
                                />
                            </Box>

                            <Box minWidth="260">
                                <TextField
                                    label="Vendor"
                                    labelHidden
                                    value={form.vendor}
                                    placeholder="Vendor"
                                    onChange={(v) => handleChange("vendor", v)}
                                />
                            </Box>

                            <Box minWidth="260">
                                <TextField
                                    label="Type"
                                    labelHidden
                                    value={form.type}
                                    placeholder="Type"
                                    onChange={(v) => handleChange("type", v)}
                                />
                            </Box>

                            <Box paddingInlineStart="200">
                                <Text tone="subdued" variant="bodySm">
                                    {selected.size} selected
                                </Text>
                            </Box>
                        </InlineStack>
                    </Box>

                    {/* Table */}
                    <IndexTable
                        resourceName={{
                            singular: "barcode",
                            plural: "barcodes",
                        }}
                        itemCount={
                            activeTab === "all"
                                ? barcodes.length
                                : Object.keys(duplicateGroups).length
                        }
                        selectedItemsCount={selected.size}
                        onSelectionChange={handleSelectionChange}
                        headings={
                            activeTab === "all"
                                ? [
                                      { title: "Image" },
                                      { title: "Barcode" },
                                      { title: "Product" },
                                      { title: "Status" },
                                  ]
                                : [{ title: "Duplicate Groups" }]
                        }
                        loading={loading}
                        emptyState={
                            activeTab === "duplicates" &&
                            duplicates.length === 0 && (
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
                                    <Text>Loading barcodes...</Text>
                                </InlineStack>
                            </Box>
                        ) : (
                            rows
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

                    {/* Bottom Bar */}
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
                                        setSelected(
                                            new Set(
                                                currentBarcodes().map(
                                                    (b) => b.id
                                                )
                                            )
                                        )
                                    }
                                >
                                    Select Page
                                </Button>
                            </InlineStack>

                            <InlineStack gap="400">
                                <Button
                                    primary
                                    disabled={selected.size === 0}
                                    onClick={() =>
                                        console.log(
                                            "apply selected",
                                            Array.from(selected)
                                        )
                                    }
                                >
                                    Download Selected
                                </Button>

                                <Button
                                    tone="critical"
                                    disabled={selected.size === 0}
                                    onClick={() =>
                                        console.log(
                                            "delete selected",
                                            Array.from(selected)
                                        )
                                    }
                                >
                                    Delete Selected
                                </Button>
                            </InlineStack>
                        </InlineStack>
                    </Box>
                </BlockStack>
            </Tabs>
        </Card>
    );
}
