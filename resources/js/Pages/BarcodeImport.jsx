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
    TextField,
    Spinner,
} from "@shopify/polaris";
import {
    UploadIcon,
    FolderDownIcon,
    AlertCircleIcon,
} from "@shopify/polaris-icons";
import Papa from "papaparse";
import { router } from "@inertiajs/react";
import CreditWarning from "./components/CreditWarning";
import { useFeature, UpgradeModal } from "./components/FeatureGate";

const ITEMS_PER_PAGE = 25;

export default function BarcodeImport({
    availableCredits = 0,
    hasUnlimitedCredits = false,
    creditCostPerBarcode = 1,
}) {
    const csvImport = useFeature("barcode-csv-import");
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [file, setFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [uploading, setUploading] = useState(false);

    // validation.preview now contains:
    // {
    //   id: string (local unique id for list),
    //   shopify_variant_id: string (editable),
    //   new_barcode: string,
    //   original_row_idx: number,
    //   status: 'pending' | 'success' | 'error',
    //   error_message?: string,
    //   product_data?: { ... }
    // }
    const [validation, setValidation] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const downloadSample = () => {
        const csv = `shopify_variant_id,barcode\n="47718466191611",="0123456789012"\n="47718466191612",="0123456789013"`;
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
        let str = String(val).trim();

        if (str.startsWith('="') && str.endsWith('"')) {
            str = str.slice(2, -1);
        }

        if (str.startsWith("'")) {
            str = str.slice(1);
        }

        str = str.replace(/^"+|"+$/g, "");

        return /^[0-9.]+E\+[0-9]+$/i.test(str) ? Number(str).toFixed(0) : str;
    };

    const fetchVariantDetails = async (id) => {
        try {
            const res = await fetch("/barcode/import-preview", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN":
                        document.querySelector('meta[name="csrf-token"]')
                            ?.content || "",
                },
                body: JSON.stringify({ variant_ids: [id] }),
            });

            if (!res.ok) throw new Error("Server error");
            const { variants } = await res.json();
            return variants[0] || null;
        } catch (e) {
            console.error(e);
            return null;
        }
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

                // 1. Extract all IDs to fetch initially
                const validIds = new Set();
                const initialRows = rows.map((row, idx) => {
                    const headers = Object.keys(row).map((h) =>
                        h.toLowerCase().trim()
                    );

                    // improved header matching
                    const idKey =
                        headers.find((h) =>
                            [
                                "shopify_variant_id",
                                "shopify variant id",
                                "variant id",
                                "variant_id",
                                "variantid",
                                "id",
                            ].includes(h)
                        ) ||
                        headers.find(
                            (h) => h.includes("variant") && h.includes("id")
                        );

                    const barcodeKey = headers.find((h) =>
                        ["barcode", "code", "ean", "upc"].includes(h)
                    );

                    const cleanId = fixBigNumber(row[idKey] || row["id"] || "");
                    const cleanBarcode = fixBigNumber(row[barcodeKey] || "");

                    if (cleanId && /^\d+$/.test(cleanId)) validIds.add(cleanId);

                    return {
                        local_id: `row-${idx}`,
                        shopify_variant_id: cleanId,
                        new_barcode: cleanBarcode,
                        original_row_idx: idx + 2,
                        status: "pending",
                        error_message: null,
                        product_data: null,
                    };
                });

                // 2. Batch fetch known valid IDs
                let variantMap = {};
                if (validIds.size > 0) {
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
                            body: JSON.stringify({
                                variant_ids: Array.from(validIds),
                            }),
                        });
                        if (res.ok) {
                            const { variants } = await res.json();
                            variantMap = Object.fromEntries(
                                variants.map((v) => [
                                    String(v.shopify_variant_id),
                                    v,
                                ])
                            );
                        }
                    } catch (err) {
                        console.error("Batch fetch failed", err);
                    }
                }

                // 3. Reconcile rows
                let validCount = 0;
                let errorCount = 0;

                const processedPreview = initialRows.map((row) => {
                    if (!row.shopify_variant_id) {
                        return {
                            ...row,
                            status: "error",
                            error_message: "Missing Variant ID",
                        };
                    }

                    if (!row.new_barcode) {
                        return {
                            ...row,
                            status: "error",
                            error_message: "Missing Barcode",
                        };
                    }

                    const productData = variantMap[row.shopify_variant_id];
                    if (productData) {
                        validCount++;
                        return {
                            ...row,
                            status: "success",
                            product_data: productData,
                        };
                    } else {
                        // Check if it looks like scientific notation that got mangled
                        // e.g. "4.74E+13" -> "474000..." (handled by fixBigNumber, but if it came in as "4.74E+13" string literal)
                        const isScientific =
                            row.shopify_variant_id.includes("0000000"); // simplistic heuristic if fixBigNumber lost precision

                        return {
                            ...row,
                            status: "error",
                            error_message: isScientific
                                ? "Variant not found (Check format)"
                                : "Variant not found",
                        };
                    }
                });

                errorCount = processedPreview.length - validCount;

                setValidation({
                    status: errorCount === 0 ? "success" : "warning",
                    message:
                        errorCount === 0
                            ? `Ready to import ${validCount} variant(s)`
                            : `${validCount} valid • ${errorCount} errors`,
                    preview: processedPreview,
                    importData: [], // We calculate this dynamically based on valid rows
                });

                setParsing(false);
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

    const handleIdChange = (newValue, localId) => {
        setValidation((prev) => {
            const newPreview = prev.preview.map((item) => {
                if (item.local_id === localId) {
                    return {
                        ...item,
                        shopify_variant_id: newValue,
                        status: "pending",
                        error_message: null,
                    };
                }
                return item;
            });
            return { ...prev, preview: newPreview };
        });
    };

    const handleIdBlur = async (localId, value) => {
        // If empty, mark error immediately
        if (!value) {
            setValidation((prev) => ({
                ...prev,
                preview: prev.preview.map((item) =>
                    item.local_id === localId
                        ? {
                              ...item,
                              status: "error",
                              error_message: "Missing ID",
                          }
                        : item
                ),
            }));
            return;
        }

        // Fetch details
        // Optimistically set to loading state if valid format? For now just keep distinct Pending?
        const productData = await fetchVariantDetails(value);

        setValidation((prev) => {
            const newPreview = prev.preview.map((item) => {
                if (item.local_id === localId) {
                    if (productData) {
                        return {
                            ...item,
                            status: "success",
                            product_data: productData,
                            error_message: null,
                        };
                    } else {
                        return {
                            ...item,
                            status: "error",
                            error_message: "Variant not found",
                        };
                    }
                }
                return item;
            });

            // Update summary
            const validCount = newPreview.filter(
                (i) => i.status === "success"
            ).length;
            const errorCount = newPreview.length - validCount;

            return {
                ...prev,
                preview: newPreview,
                status: errorCount === 0 ? "success" : "warning",
                message:
                    errorCount === 0
                        ? `Ready to import ${validCount} variant(s)`
                        : `${validCount} valid • ${errorCount} errors`,
            };
        });
    };

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
        if (!csvImport.enabled) {
            setShowUpgrade(true);
            return;
        }

        const validItems =
            validation?.preview?.filter((i) => i.status === "success") || [];
        if (validItems.length === 0) return;

        // Prepare import data
        const importData = validItems.map((item) => ({
            shopify_variant_id: item.shopify_variant_id,
            barcode: item.new_barcode,
        }));

        const requiredCredits = importData.length * creditCostPerBarcode;
        if (!hasUnlimitedCredits && availableCredits < requiredCredits) {
            alert(
                `Insufficient credits!\n\n` +
                    `Items to import: ${importData.length}\n` +
                    `Credits required: ${requiredCredits}\n` +
                    `Credits available: ${availableCredits}\n\n` +
                    `Maximum items you can import: ${Math.floor(
                        availableCredits / creditCostPerBarcode
                    )}`
            );
            return;
        }

        setUploading(true);
        router.post(
            "/barcode/import-apply",
            { custom_barcodes: importData },
            {
                preserveState: false,
                preserveScroll: false,
                onFinish: () => setUploading(false),
                onError: (errors) => {
                    setUploading(false);
                    if (errors.credits)
                        alert(`Credit Error: ${errors.credits}`);
                    setValidation((prev) => ({
                        ...prev,
                        status: "error",
                        message: errors.credits || "Failed to start import job",
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

    const validCount =
        validation?.preview?.filter((i) => i.status === "success").length || 0;
    const errorCount = (validation?.preview?.length || 0) - validCount;
    const hasErrors = errorCount > 0;

    const canStartImport = () => {
        if (!validation || hasErrors || validCount === 0) return false;
        if (hasUnlimitedCredits) return true;
        const requiredCredits = validCount * creditCostPerBarcode;
        return availableCredits >= requiredCredits;
    };

    const shouldShowCreditWarning = () => {
        if (hasUnlimitedCredits) return false;
        if (validCount === 0) return false;
        const requiredCredits = validCount * creditCostPerBarcode;
        return availableCredits < requiredCredits;
    };

    return (
        <Page
            title="Import Barcodes"
            subtitle="Upload a CSV file to bulk update barcodes"
            backAction={{
                content: "Barcode Generator",
                onAction: () => router.visit("/barcode-generator"),
            }}
            primaryAction={{
                content: uploading
                    ? "Processing..."
                    : csvImport.enabled
                      ? "Start Import"
                      : `Start Import (${csvImport.requiredPlan || "PRO"})`,
                loading: uploading,
                disabled: csvImport.enabled ? !canStartImport() : false,
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
            <UpgradeModal
                open={showUpgrade}
                onClose={() => setShowUpgrade(false)}
                feature={csvImport}
            />

            <Layout>
                {!csvImport.enabled && (
                    <Layout.Section>
                        <Banner
                            title={`CSV Barcode Import is included in the ${
                                csvImport.requiredPlan || "higher"
                            } plan`}
                            tone="info"
                            action={{
                                content: "View plans",
                                onAction: () => router.visit("/pricing"),
                            }}
                        >
                            <Text as="p">
                                You can preview your CSV here — upgrade to
                                apply the barcodes to your products.
                            </Text>
                        </Banner>
                    </Layout.Section>
                )}
                {shouldShowCreditWarning() && (
                    <Layout.Section>
                        <CreditWarning
                            selectedCount={0}
                            totalCount={validCount}
                            availableCredits={availableCredits}
                            costPerItem={creditCostPerBarcode}
                            hasUnlimited={hasUnlimitedCredits}
                            scope="all"
                            maxAllowed={Math.floor(
                                availableCredits / creditCostPerBarcode
                            )}
                        />
                    </Layout.Section>
                )}

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

                {validation && (
                    <Layout.Section>
                        <Banner
                            tone={hasErrors ? "critical" : "success"}
                            title={
                                hasErrors
                                    ? "Review Errors"
                                    : "Validation Successful"
                            }
                        >
                            <p>{validation.message}</p>
                            {hasErrors && (
                                <p>
                                    You must fix all{" "}
                                    <strong>{errorCount}</strong> errors before
                                    importing.
                                </p>
                            )}
                        </Banner>
                    </Layout.Section>
                )}

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

                {validation?.preview?.length > 0 && (
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="400">
                                <InlineStack align="space-between">
                                    <Text variant="headingMd">
                                        Step 2: Review & Edit (
                                        {validation.preview.length} rows)
                                    </Text>
                                    {hasErrors && (
                                        <Badge tone="critical">
                                            {errorCount} Errors
                                        </Badge>
                                    )}
                                </InlineStack>

                                <IndexTable
                                    itemCount={validation.preview.length}
                                    headings={[
                                        { title: "Status" },
                                        { title: "Variant ID (Editable)" },
                                        { title: "Product" },
                                        { title: "New Barcode" },
                                    ]}
                                    selectable={false}
                                >
                                    {paginated.map((item) => (
                                        <IndexTable.Row key={item.local_id}>
                                            <IndexTable.Cell>
                                                {item.status === "success" ? (
                                                    <Badge tone="success">
                                                        ✓
                                                    </Badge>
                                                ) : item.status ===
                                                  "pending" ? (
                                                    <Spinner size="small" />
                                                ) : (
                                                    <Icon
                                                        source={AlertCircleIcon}
                                                        tone="critical"
                                                    />
                                                )}
                                            </IndexTable.Cell>
                                            <IndexTable.Cell>
                                                <div
                                                    style={{
                                                        maxWidth: "200px",
                                                    }}
                                                >
                                                    <TextField
                                                        value={
                                                            item.shopify_variant_id
                                                        }
                                                        onChange={(v) =>
                                                            handleIdChange(
                                                                v,
                                                                item.local_id
                                                            )
                                                        }
                                                        onBlur={() =>
                                                            handleIdBlur(
                                                                item.local_id,
                                                                item.shopify_variant_id
                                                            )
                                                        }
                                                        autoComplete="off"
                                                        error={
                                                            item.error_message
                                                        }
                                                        size="slim"
                                                    />
                                                </div>
                                            </IndexTable.Cell>
                                            <IndexTable.Cell>
                                                {item.product_data ? (
                                                    <InlineStack gap="300">
                                                        <Thumbnail
                                                            source={
                                                                item
                                                                    .product_data
                                                                    .image_url ||
                                                                ""
                                                            }
                                                            size="small"
                                                            alt=""
                                                        />
                                                        <BlockStack gap="050">
                                                            <Text fontWeight="semibold">
                                                                {
                                                                    item
                                                                        .product_data
                                                                        .variant_title
                                                                }
                                                            </Text>
                                                            <Text
                                                                variant="bodySm"
                                                                tone="subdued"
                                                            >
                                                                {
                                                                    item
                                                                        .product_data
                                                                        .product_title
                                                                }
                                                            </Text>
                                                            <Text
                                                                variant="bodySm"
                                                                tone="subdued"
                                                            >
                                                                SKU:{" "}
                                                                {item
                                                                    .product_data
                                                                    .sku || "—"}
                                                            </Text>
                                                        </BlockStack>
                                                    </InlineStack>
                                                ) : (
                                                    <Text
                                                        tone="subdued"
                                                        as="span"
                                                    >
                                                        --
                                                    </Text>
                                                )}
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
