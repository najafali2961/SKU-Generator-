import React, { useState, useCallback } from "react";
import {
    Page,
    Layout,
    Card,
    Button,
    Text,
    Banner,
    Box,
    InlineStack,
    BlockStack,
    Icon,
    IndexTable,
    Pagination,
    Badge,
    Thumbnail,
    SkeletonBodyText,
    EmptyState,
    Link,
} from "@shopify/polaris";
import {
    UploadIcon,
    FolderDownIcon,
    ArrowLeftIcon,
} from "@shopify/polaris-icons";
import Papa from "papaparse";
import { router } from "@inertiajs/react";

const ITEMS_PER_PAGE = 25;

export default function BarcodeImport() {
    const [file, setFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [validation, setValidation] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const downloadSample = () => {
        const csv = `shopify_variant_id,barcode\n47718466191611,"0123456789012"\n47718466191612,"0123456789013"`;
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "barcode-import-sample.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const fixBigNumber = (val) => {
        if (!val) return "";
        const str = String(val)
            .trim()
            .replace(/^"+|"+$/g, "");
        return /^[0-9.]+E\+[0-9]+$/i.test(str) ? Number(str).toFixed(0) : str;
    };

    const parseCSV = useCallback(async (file) => {
        setParsing(true);
        setValidation(null);
        setCurrentPage(1);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            transformHeader: (h) => h.toLowerCase().trim(),
            transform: (v) => fixBigNumber(v),
            complete: async (results) => {
                const rows = results.data;
                if (rows.length === 0) {
                    setValidation({
                        status: "error",
                        message: "CSV is empty",
                        preview: [],
                    });
                    setParsing(false);
                    return;
                }

                const shopifyIds = rows
                    .map((row) => {
                        const headers = Object.keys(row).map((h) =>
                            h.toLowerCase().trim()
                        );
                        const possibleId =
                            row["shopify_variant_id"] ||
                            row["shopify variant id"] ||
                            row["variant id"] ||
                            row["variant_id"] ||
                            row["variantid"] ||
                            row["id"] ||
                            row["Id"] ||
                            row["ID"] ||
                            row[
                                headers.find(
                                    (h) =>
                                        h.includes("variant") &&
                                        h.includes("id")
                                )
                            ] ||
                            row[headers.find((h) => h === "id")];
                        return fixBigNumber(possibleId);
                    })
                    .filter((id) => id && id.length >= 10);

                if (shopifyIds.length === 0) {
                    setValidation({
                        status: "error",
                        message:
                            "No valid Shopify Variant IDs found. Column must contain 'variant', 'id', or 'shopify' in name.",
                        preview: [],
                    });
                    setParsing(false);
                    return;
                }

                try {
                    const res = await fetch("/barcode/import-preview", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRF-TOKEN":
                                document.querySelector(
                                    'meta[name="csrf-token"]'
                                )?.content || "",
                        },
                        body: JSON.stringify({ variant_ids: shopifyIds }),
                    });

                    if (!res.ok) throw new Error("Server error");
                    const { variants } = await res.json();
                    const variantMap = Object.fromEntries(
                        variants.map((v) => [v.shopify_variant_id, v])
                    );

                    const preview = [];
                    const importData = [];
                    const errors = [];

                    rows.forEach((row, idx) => {
                        const rawId =
                            row["shopify_variant_id"] ||
                            row["shopify variant id"] ||
                            row["variant id"] ||
                            row["variant_id"] ||
                            row["id"] ||
                            Object.values(row).find((v) =>
                                String(v).match(/^\d{10,20}$/)
                            );

                        const shopifyId = fixBigNumber(rawId);
                        const barcode = fixBigNumber(
                            row["barcode"] ||
                                row["code"] ||
                                row["ean"] ||
                                row["upc"] ||
                                ""
                        );

                        if (!shopifyId || !barcode) {
                            errors.push(
                                `Row ${idx + 2}: Missing ID or barcode`
                            );
                            return;
                        }

                        const dbVariant = variantMap[shopifyId];
                        if (!dbVariant) {
                            errors.push(
                                `Row ${
                                    idx + 2
                                }: Variant not found → ${shopifyId}`
                            );
                            return;
                        }

                        preview.push({
                            ...dbVariant,
                            new_barcode: barcode,
                            row: idx + 2,
                        });
                        importData.push({
                            shopify_variant_id: shopifyId,
                            barcode,
                        });
                    });

                    setValidation({
                        status: errors.length === 0 ? "success" : "warning",
                        message:
                            errors.length === 0
                                ? `Ready to import ${preview.length} variant(s)`
                                : `${preview.length} valid • ${errors.length} errors`,
                        preview,
                        importData,
                        errors,
                    });
                } catch (err) {
                    setValidation({
                        status: "error",
                        message: "Server connection failed",
                    });
                } finally {
                    setParsing(false);
                }
            },
            error: () => {
                setValidation({
                    status: "error",
                    message: "Failed to read CSV file",
                });
                setParsing(false);
            },
        });
    }, []);

    const handleFile = (f) => {
        if (!f || !f.name.endsWith(".csv")) {
            setValidation({
                status: "error",
                message: "Please upload a CSV file",
            });
            return;
        }
        setFile(f);
        parseCSV(f);
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    }, []);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(e.type === "dragover" || e.type === "dragenter");
    }, []);

    const handleImport = () => {
        if (!validation?.importData?.length) return;

        setUploading(true);

        router.post(
            "/barcode/import-apply",
            { custom_barcodes: validation.importData },
            {
                preserveState: false,
                preserveScroll: false,
                onFinish: () => {
                    setUploading(false);
                },
                onError: () => {
                    setUploading(false);
                    setValidation((prev) => ({
                        ...prev,
                        status: "error",
                        message: "Failed to start import job",
                    }));
                },
            }
        );
    };

    const handleReset = () => {
        setFile(null);
        setValidation(null);
        setCurrentPage(1);
    };

    const paginated =
        validation?.preview?.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        ) || [];
    const totalPages = Math.ceil(
        (validation?.preview?.length || 0) / ITEMS_PER_PAGE
    );

    return (
        <Page
            title="Import Barcodes"
            subtitle="Upload a CSV file to bulk update barcodes"
            backAction={{
                content: "Barcode Generator",
                onAction: () => router.visit("/barcode-generator"),
            }}
            primaryAction={{
                content: uploading ? "Processing..." : "Start Import",
                loading: uploading,
                disabled:
                    !validation ||
                    validation.status === "error" ||
                    !validation?.preview?.length,
                onAction: handleImport,
            }}
            secondaryActions={[
                {
                    content: "Download Sample CSV",
                    icon: FolderDownIcon,
                    onAction: downloadSample,
                },
            ]}
        >
            <Layout>
                {/* Upload Section */}
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text variant="headingMd">
                                Step 1: Upload CSV File
                            </Text>
                            <Text variant="bodyMd" tone="subdued">
                                Your CSV must include columns for{" "}
                                <strong>shopify_variant_id</strong> and{" "}
                                <strong>barcode</strong>
                            </Text>

                            <Box
                                padding="800"
                                borderRadius="200"
                                background={
                                    dragActive
                                        ? "bg-fill-info-hover"
                                        : "bg-fill"
                                }
                                borderWidth="025"
                                borderStyle="dashed"
                                borderColor={
                                    dragActive ? "border-info" : "border"
                                }
                                onDrop={handleDrop}
                                onDragOver={handleDrag}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                            >
                                <label
                                    style={{
                                        cursor: "pointer",
                                        display: "block",
                                    }}
                                >
                                    <BlockStack align="center" gap="400">
                                        <Icon
                                            source={UploadIcon}
                                            tone={dragActive ? "info" : "base"}
                                        />
                                        <Text
                                            variant="headingLg"
                                            alignment="center"
                                        >
                                            {file
                                                ? file.name
                                                : "Drop CSV here or click to upload"}
                                        </Text>
                                        <Text
                                            variant="bodyMd"
                                            tone="subdued"
                                            alignment="center"
                                        >
                                            Accepts .csv files only
                                        </Text>
                                        {file && (
                                            <Button onClick={handleReset}>
                                                Remove File
                                            </Button>
                                        )}
                                    </BlockStack>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) =>
                                            handleFile(e.target.files?.[0])
                                        }
                                        style={{ display: "none" }}
                                    />
                                </label>
                            </Box>
                        </BlockStack>
                    </Card>
                </Layout.Section>

                {/* Validation Banner */}
                {validation && (
                    <Layout.Section>
                        <Banner
                            tone={
                                validation.status === "success"
                                    ? "success"
                                    : validation.status === "warning"
                                    ? "warning"
                                    : "critical"
                            }
                            title={
                                validation.status === "success"
                                    ? "Validation Successful"
                                    : validation.status === "warning"
                                    ? "Validation Completed with Warnings"
                                    : "Validation Failed"
                            }
                        >
                            <p>{validation.message}</p>
                            {validation.errors &&
                                validation.errors.length > 0 && (
                                    <Box paddingBlockStart="200">
                                        <Text
                                            variant="bodyMd"
                                            fontWeight="semibold"
                                        >
                                            Errors:
                                        </Text>
                                        <ul
                                            style={{
                                                paddingLeft: "20px",
                                                marginTop: "8px",
                                            }}
                                        >
                                            {validation.errors
                                                .slice(0, 5)
                                                .map((err, i) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                            {validation.errors.length > 5 && (
                                                <li>
                                                    ... and{" "}
                                                    {validation.errors.length -
                                                        5}{" "}
                                                    more
                                                </li>
                                            )}
                                        </ul>
                                    </Box>
                                )}
                        </Banner>
                    </Layout.Section>
                )}

                {/* Loading State */}
                {parsing && (
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd">
                                    Validating CSV...
                                </Text>
                                <SkeletonBodyText lines={3} />
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                )}

                {/* Preview Table */}
                {validation?.preview?.length > 0 && (
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="400">
                                <InlineStack align="space-between">
                                    <Text variant="headingMd">
                                        Step 2: Review Changes (
                                        {validation.preview.length} variants)
                                    </Text>
                                    <Badge tone="info">
                                        {validation.preview.length} items
                                    </Badge>
                                </InlineStack>

                                <IndexTable
                                    itemCount={validation.preview.length}
                                    headings={[
                                        { title: "Product" },
                                        { title: "Current Barcode" },
                                        { title: "" },
                                        { title: "New Barcode" },
                                    ]}
                                    selectable={false}
                                >
                                    {paginated.map((item) => (
                                        <IndexTable.Row
                                            key={item.shopify_variant_id}
                                        >
                                            <IndexTable.Cell>
                                                <InlineStack gap="300">
                                                    <Thumbnail
                                                        source={
                                                            item.image_url || ""
                                                        }
                                                        size="small"
                                                        alt=""
                                                    />
                                                    <BlockStack gap="050">
                                                        <Text fontWeight="semibold">
                                                            {item.variant_title}
                                                        </Text>
                                                        <Text
                                                            variant="bodySm"
                                                            tone="subdued"
                                                        >
                                                            {item.product_title}
                                                        </Text>
                                                        <Text
                                                            variant="bodySm"
                                                            tone="subdued"
                                                        >
                                                            SKU:{" "}
                                                            {item.sku || "—"}
                                                        </Text>
                                                    </BlockStack>
                                                </InlineStack>
                                            </IndexTable.Cell>
                                            <IndexTable.Cell>
                                                <Badge
                                                    tone={
                                                        item.old_barcode
                                                            ? "info"
                                                            : "attention"
                                                    }
                                                >
                                                    {item.old_barcode ||
                                                        "Empty"}
                                                </Badge>
                                            </IndexTable.Cell>
                                            <IndexTable.Cell>
                                                <Text variant="bodyMd">→</Text>
                                            </IndexTable.Cell>
                                            <IndexTable.Cell>
                                                <Badge tone="success">
                                                    {item.new_barcode}
                                                </Badge>
                                            </IndexTable.Cell>
                                        </IndexTable.Row>
                                    ))}
                                </IndexTable>

                                {totalPages > 1 && (
                                    <Box paddingBlockStart="400">
                                        <InlineStack align="center">
                                            <Pagination
                                                hasPrevious={currentPage > 1}
                                                onPrevious={() =>
                                                    setCurrentPage((p) => p - 1)
                                                }
                                                hasNext={
                                                    currentPage < totalPages
                                                }
                                                onNext={() =>
                                                    setCurrentPage((p) => p + 1)
                                                }
                                                label={`Page ${currentPage} of ${totalPages}`}
                                            />
                                        </InlineStack>
                                    </Box>
                                )}
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                )}

                {/* Empty State */}
                {!file && !parsing && !validation && (
                    <Layout.Section>
                        <Card>
                            <EmptyState
                                heading="No file uploaded yet"
                                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                            >
                                <p>
                                    Upload a CSV file to get started with bulk
                                    barcode import
                                </p>
                            </EmptyState>
                        </Card>
                    </Layout.Section>
                )}
            </Layout>
        </Page>
    );
}
