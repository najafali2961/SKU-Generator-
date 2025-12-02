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
import { UploadIcon, FolderDownIcon } from "@shopify/polaris-icons";
import Papa from "papaparse";
import { router } from "@inertiajs/react";

const ITEMS_PER_PAGE = 10;

export default function BarcodeImportModal({ isOpen, onClose }) {
    const [file, setFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [validation, setValidation] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const downloadSample = () => {
        const csv = `shopify_variant_id,barcode\n47718466191611,"0123456789012"`;
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

                // ULTRA-COMPATIBLE ID DETECTION — WORKS WITH ANY CSV
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
                            row["Shopify Variant ID"] ||
                            row["ShopifyVariantID"] ||
                            // Try by header name too
                            row[
                                headers.find(
                                    (h) =>
                                        h.includes("variant") &&
                                        h.includes("id")
                                )
                            ] ||
                            row[headers.find((h) => h === "id")] ||
                            row[headers.find((h) => h.includes("shopify"))];

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
                        // Same ultra-detection for individual rows
                        const rawId =
                            row["shopify_variant_id"] ||
                            row["shopify variant id"] ||
                            row["variant id"] ||
                            row["variant_id"] ||
                            row["variantid"] ||
                            row["id"] ||
                            row["Id"] ||
                            row["ID"] ||
                            row["Shopify Variant ID"] ||
                            Object.values(row).find((v) =>
                                String(v).match(/^\d{10,20}$/)
                            );

                        const shopifyId = fixBigNumber(rawId);
                        const barcode = fixBigNumber(
                            row["barcode"] ||
                                row["code"] ||
                                row["ean"] ||
                                row["upc"] ||
                                row["Barcode"] ||
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

    // THIS IS THE ONLY THING THAT MATTERS
    const handleImport = () => {
        if (!validation?.importData?.length) return;

        setUploading(true);

        router.post(
            "/barcode/import-apply",
            {
                custom_barcodes: validation.importData,
            },
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => {
                    setUploading(false);
                    onClose();
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

    const paginated =
        validation?.preview?.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        ) || [];
    const totalPages = Math.ceil(
        (validation?.preview?.length || 0) / ITEMS_PER_PAGE
    );

    return (
        <Modal
            large
            open={isOpen}
            onClose={onClose}
            title="Import Barcodes from CSV"
            primaryAction={{
                content: uploading
                    ? "Starting Job..."
                    : "Apply & Go to Progress",
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
                    <Card>
                        <BlockStack gap="400">
                            <InlineStack align="space-between">
                                <Text variant="headingLg">Import Barcodes</Text>
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
                                                : "Drop CSV or click to upload"}
                                        </Text>
                                        {file && (
                                            <Button
                                                size="slim"
                                                onClick={() => {
                                                    setFile(null);
                                                    setValidation(null);
                                                }}
                                            >
                                                Change
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

                    {validation?.preview?.length > 0 && (
                        <Card
                            title={`Preview – ${validation.preview.length} variants will be updated`}
                        >
                            <IndexTable
                                itemCount={validation.preview.length}
                                headings={[
                                    { title: "Product" },
                                    { title: "Current" },
                                    { title: "" },
                                    { title: "New" },
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
                </BlockStack>
            </Modal.Section>
        </Modal>
    );
}
