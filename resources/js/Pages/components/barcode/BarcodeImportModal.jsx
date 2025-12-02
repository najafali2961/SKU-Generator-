// resources/js/Pages/components/barcode/BarcodeImportModal.jsx
import React, { useState, useRef, useCallback } from "react";
import {
    Modal,
    Button,
    Card,
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
} from "@shopify/polaris";
import {
    UploadIcon,
    CheckCircleIcon,
    FolderDownIcon,
} from "@shopify/polaris-icons";
import Papa from "papaparse";

const ITEMS_PER_PAGE = 10;

export default function BarcodeImportModal({ isOpen, onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [validation, setValidation] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const fileInputRef = useRef(null);

    // ────── Sample CSV download ──────
    const downloadSample = () => {
        const csv = `shopify_variant_id,barcode
47718466191611,"0123456789012"
47718466158843,"1234567890123"
47718466191699,"9876543210987"`;

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "barcode-import-sample.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

    // Fix Excel scientific notation → full number
    const fixBigNumber = (val) => {
        if (!val) return "";
        let str = String(val)
            .trim()
            .replace(/^"+|"+$/g, "");
        if (/^[0-9.]+E\+[0-9]+$/i.test(str)) {
            return Number(str).toFixed(0);
        }
        return str;
    };

    // ────── CSV Parsing ──────
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

                // Collect Shopify Variant IDs
                const shopifyIds = rows
                    .map((row) => {
                        const id =
                            row["shopify_variant_id"] ||
                            row["variant id"] ||
                            row["shopify variant id"] ||
                            row["variant_id"] ||
                            row["variantid"] ||
                            row["id"];
                        return fixBigNumber(id);
                    })
                    .filter((id) => id && id.length >= 10);

                if (shopifyIds.length === 0) {
                    setValidation({
                        status: "error",
                        message: "No valid Shopify Variant IDs found",
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
                    const variantMap = {};
                    variants.forEach(
                        (v) => (variantMap[v.shopify_variant_id] = v)
                    );

                    const preview = [];
                    const importData = [];
                    const errors = [];

                    rows.forEach((row, idx) => {
                        const rawId =
                            row["shopify_variant_id"] ||
                            row["variant id"] ||
                            row["shopify variant id"] ||
                            row["variant_id"] ||
                            row["variantid"] ||
                            row["id"];
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

                    const status = errors.length === 0 ? "success" : "warning";
                    setValidation({
                        status,
                        message:
                            errors.length === 0
                                ? `Ready to update ${preview.length} variant(s)`
                                : `${preview.length} valid • ${errors.length} error(s)`,
                        preview,
                        importData,
                        errors,
                    });
                } catch (err) {
                    setValidation({
                        status: "error",
                        message: "Failed to connect to server",
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

    // ────── File handling ──────
    const handleFile = (f) => {
        if (!f) return;
        if (!f.name.toLowerCase().endsWith(".csv")) {
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

    // ────── Import execution ──────
    const handleImport = async () => {
        if (!validation?.importData?.length) return;
        setUploading(true);

        try {
            const res = await fetch("/barcode/import", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN":
                        document.querySelector('meta[name="csrf-token"]')
                            ?.content || "",
                },
                body: JSON.stringify({ barcodes: validation.importData }),
            });

            const result = await res.json();

            if (!res.ok) throw new Error(result.message || "Import failed");

            onSuccess?.({
                message:
                    result.message ||
                    `Success! Updated ${result.imported || 0} variant(s)`,
                imported: result.imported || 0,
                failed: result.failed || 0,
                errors: result.errors || [],
            });

            setTimeout(() => onClose(), 1500);
        } catch (err) {
            setValidation((prev) => ({
                ...prev,
                status: "error",
                message: `Import failed: ${err.message}`,
            }));
        } finally {
            setUploading(false);
        }
    };

    // ────── Pagination ──────
    const paginated =
        validation?.preview?.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        ) || [];
    const totalPages = Math.ceil(
        (validation?.preview?.length || 0) / ITEMS_PER_PAGE
    );

    // ────── Render ──────
    return (
        <Modal
            large
            open={isOpen}
            onClose={onClose}
            title="Import Barcodes"
            primaryAction={{
                content: uploading ? "Applying..." : "Apply Barcodes",
                loading: uploading || parsing,
                disabled:
                    !validation ||
                    validation.status === "error" ||
                    !validation?.preview?.length,
                onAction: handleImport,
            }}
            secondaryActions={[{ content: "Cancel", onAction: onClose }]}
        >
            <Modal.Section>
                <BlockStack gap="500">
                    {/* Upload Card */}
                    <Card>
                        <BlockStack gap="400">
                            <InlineStack align="space-between">
                                <Text variant="headingLg">
                                    Import Barcodes from CSV
                                </Text>
                                <Button
                                    icon={FolderDownIcon}
                                    onClick={downloadSample}
                                >
                                    Sample CSV
                                </Button>
                            </InlineStack>

                            <Box
                                padding="400"
                                borderRadius="200"
                                background={
                                    dragActive
                                        ? "bg-fill-info-hover"
                                        : "bg-fill"
                                }
                                borderWidth="2"
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
                                    <BlockStack align="center" gap="300">
                                        <Icon
                                            source={UploadIcon}
                                            tone={dragActive ? "info" : "base"}
                                        />
                                        <Text variant="headingMd">
                                            {file
                                                ? file.name
                                                : "Drop CSV file here or click to upload"}
                                        </Text>
                                        {file && (
                                            <Button
                                                size="slim"
                                                onClick={() => {
                                                    setFile(null);
                                                    setValidation(null);
                                                }}
                                            >
                                                Change file
                                            </Button>
                                        )}
                                    </BlockStack>
                                    <input
                                        ref={fileInputRef}
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

                    {/* Status Banner */}
                    {validation && (
                        <Banner
                            tone={
                                validation.status === "success"
                                    ? "success"
                                    : validation.status === "warning"
                                    ? "warning"
                                    : "critical"
                            }
                        >
                            {validation.message}
                        </Banner>
                    )}

                    {/* Preview Table */}
                    {validation?.preview?.length > 0 && (
                        <Card
                            title={`Preview – ${validation.preview.length} variant(s) will be updated`}
                        >
                            <IndexTable
                                resourceName={{
                                    singular: "variant",
                                    plural: "variants",
                                }}
                                itemCount={validation.preview.length}
                                headings={[
                                    { title: "Product" },
                                    { title: "Current" },
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
                                                        SKU: {item.sku || "—"}
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
                                                {item.old_barcode || "Empty"}
                                            </Badge>
                                        </IndexTable.Cell>
                                        <IndexTable.Cell>→</IndexTable.Cell>
                                        <IndexTable.Cell>
                                            <Badge tone="success" size="large">
                                                {item.new_barcode}
                                            </Badge>
                                        </IndexTable.Cell>
                                    </IndexTable.Row>
                                ))}
                            </IndexTable>

                            {totalPages > 1 && (
                                <Box paddingBlockStart="400">
                                    <Pagination
                                        hasPrevious={currentPage > 1}
                                        onPrevious={() =>
                                            setCurrentPage((p) => p - 1)
                                        }
                                        hasNext={currentPage < totalPages}
                                        onNext={() =>
                                            setCurrentPage((p) => p + 1)
                                        }
                                        label={`Page ${currentPage} of ${totalPages}`}
                                    />
                                </Box>
                            )}
                        </Card>
                    )}

                    {/* Errors */}
                    {validation?.errors?.length > 0 && (
                        <Card title={`Errors (${validation.errors.length})`}>
                            <Box
                                padding="400"
                                maxHeight="200px"
                                overflowY="auto"
                            >
                                <BlockStack gap="200">
                                    {validation.errors.map((e, i) => (
                                        <Text key={i} tone="critical">
                                            • {e}
                                        </Text>
                                    ))}
                                </BlockStack>
                            </Box>
                        </Card>
                    )}

                    {/* Uploading indicator */}
                    {uploading && (
                        <Card>
                            <BlockStack align="center" gap="300">
                                <Text>Applying barcodes...</Text>
                            </BlockStack>
                        </Card>
                    )}
                </BlockStack>
            </Modal.Section>
        </Modal>
    );
}
