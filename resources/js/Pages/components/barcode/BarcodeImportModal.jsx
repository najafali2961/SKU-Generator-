import React, { useState, useRef } from "react";
import {
    Modal,
    Button,
    Card,
    Text,
    Banner,
    Box,
    Divider,
    InlineStack,
    BlockStack,
    Icon,
    ProgressBar,
    Tabs,
    Badge,
    Checkbox,
    Select,
    TextField,
    EmptyState,
} from "@shopify/polaris";
import {
    UploadIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    FolderDownIcon,
} from "@shopify/polaris-icons";
import Papa from "papaparse";

export default function BarcodeImportModal({ isOpen, onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [validation, setValidation] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewPage, setPreviewPage] = useState(1);
    const [fieldMapping, setFieldMapping] = useState({
        variant_id: "variant_id",
        barcode: "barcode",
        format: "format",
        ean: "ean",
        upc: "upc",
        isbn: "isbn",
    });
    const [availableColumns, setAvailableColumns] = useState([]);
    const fileInputRef = useRef(null);

    const REQUIRED_COLUMNS = ["variant_id", "barcode"];
    const OPTIONAL_COLUMNS = ["ean", "upc", "isbn", "format"];
    const PREVIEW_PER_PAGE = 5;

    // Validation Rules
    const validateBarcode = (barcode, format = "AUTO") => {
        if (!barcode || barcode.trim() === "")
            return { valid: false, error: "Empty barcode" };

        const cleaned = barcode.trim();

        if (format === "UPC" || format === "AUTO") {
            if (/^\d{12}$/.test(cleaned)) return { valid: true, format: "UPC" };
        }

        if (format === "EAN" || format === "AUTO") {
            if (/^\d{13}$/.test(cleaned)) return { valid: true, format: "EAN" };
        }

        if (format === "ISBN" || format === "AUTO") {
            if (/^\d{10}$|^\d{13}$|^97[89]\d{10}$/.test(cleaned)) {
                return { valid: true, format: "ISBN" };
            }
        }

        if (format === "CODE128" || format === "AUTO") {
            if (/^[A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=]{1,}$/.test(cleaned)) {
                return { valid: true, format: "CODE128" };
            }
        }

        return { valid: false, error: `Invalid format: ${cleaned}` };
    };

    const validateRow = (row, index, context) => {
        const errors = [];

        const variantId = row[fieldMapping.variant_id];
        const barcodeValue = row[fieldMapping.barcode];

        if (!variantId || variantId.trim() === "") {
            errors.push(`Row ${index + 1}: Missing variant ID`);
        }

        if (!barcodeValue || barcodeValue.trim() === "") {
            errors.push(`Row ${index + 1}: Missing barcode`);
        } else {
            const validation = validateBarcode(
                barcodeValue,
                row[fieldMapping.format] || "AUTO"
            );
            if (!validation.valid) {
                errors.push(`Row ${index + 1}: ${validation.error}`);
            }
        }

        if (variantId) {
            context.variantCount[variantId] =
                (context.variantCount[variantId] || 0) + 1;
        }

        return errors;
    };

    const parseCSV = (file) => {
        setParsing(true);
        setValidation(null);
        setPreviewPage(1);
        setFieldMapping({
            variant_id: "variant_id",
            barcode: "barcode",
            format: "format",
            ean: "ean",
            upc: "upc",
            isbn: "isbn",
        });

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.toLowerCase().trim(),
            complete: (results) => {
                const rows = results.data || [];
                const headers = Object.keys(rows[0] || {});

                setAvailableColumns(headers);

                const errors = [];
                const warnings = [];
                const processed = [];
                const variantCount = {};

                // Auto-detect available columns and set mapping
                const autoMapping = {
                    variant_id:
                        headers.find((h) =>
                            ["variant_id", "variant id", "variantid"].includes(
                                h
                            )
                        ) || headers[0],
                    barcode:
                        headers.find((h) =>
                            [
                                "barcode",
                                "sku",
                                "code",
                                "upc",
                                "ean",
                                "isbn",
                            ].includes(h)
                        ) || headers[1],
                    format:
                        headers.find((h) =>
                            ["format", "type", "code_format"].includes(h)
                        ) || "format",
                    ean: headers.find((h) => h === "ean") || "ean",
                    upc: headers.find((h) => h === "upc") || "upc",
                    isbn: headers.find((h) => h === "isbn") || "isbn",
                };

                setFieldMapping(autoMapping);

                // Validate rows
                rows.forEach((row, index) => {
                    const rowErrors = validateRow(row, index, { variantCount });
                    if (rowErrors.length > 0) {
                        errors.push(...rowErrors);
                    } else {
                        const variantId = row[autoMapping.variant_id];
                        const barcodeValue = row[autoMapping.barcode];

                        processed.push({
                            variant_id: variantId.trim(),
                            barcode: barcodeValue.trim(),
                            format: row[autoMapping.format]?.trim() || "AUTO",
                            ean: row[autoMapping.ean]?.trim() || null,
                            upc: row[autoMapping.upc]?.trim() || null,
                            isbn: row[autoMapping.isbn]?.trim() || null,
                        });
                    }
                });

                // Check for duplicates
                Object.entries(variantCount).forEach(([variantId, count]) => {
                    if (count > 1) {
                        warnings.push(
                            `Variant ID ${variantId} appears ${count} times in file`
                        );
                    }
                });

                const validRows = processed.length;
                const status = errors.length === 0 ? "success" : "warning";

                setValidation({
                    status,
                    message:
                        status === "success"
                            ? `Ready to import ${validRows} barcode(s)`
                            : `${validRows} valid row(s), ${errors.length} error(s)`,
                    totalRows: rows.length,
                    validRows,
                    errors,
                    warnings,
                    processed,
                    rawRows: rows,
                });

                setParsing(false);
            },
            error: (err) => {
                setValidation({
                    status: "error",
                    message: `Parse error: ${err.message}`,
                    totalRows: 0,
                    validRows: 0,
                    errors: [err.message],
                    warnings: [],
                    processed: [],
                    rawRows: [],
                });
                setParsing(false);
            },
        });
    };

    const handleFileSelect = (e) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        if (!selected.name.endsWith(".csv")) {
            setValidation({
                status: "error",
                message: "Please select a CSV file",
                totalRows: 0,
                validRows: 0,
                errors: ["Only .csv files are supported"],
                warnings: [],
                processed: [],
                rawRows: [],
            });
            return;
        }

        setFile(selected);
        parseCSV(selected);
    };

    const handleImport = async () => {
        if (!validation?.processed || validation.processed.length === 0) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            const response = await fetch("/barcode/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    barcodes: validation.processed,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Import failed");
            }

            setUploadProgress(100);
            const result = await response.json();

            onSuccess?.(result);

            setTimeout(() => {
                resetModal();
                onClose?.();
            }, 1000);
        } catch (err) {
            setValidation((prev) => ({
                ...prev,
                status: "error",
                message: `Import failed: ${err.message}`,
                errors: [...(prev?.errors || []), err.message],
            }));
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const downloadSampleFile = () => {
        const sampleData = [
            ["variant_id", "barcode", "format", "ean", "upc", "isbn"],
            [
                "12345",
                "012345678901",
                "UPC",
                "1234567890123",
                "012345678901",
                "",
            ],
            ["12346", "1234567890128", "EAN", "1234567890128", "", ""],
            ["12347", "9780545010221", "ISBN", "", "", "9780545010221"],
        ];

        const csv = sampleData
            .map((row) => row.map((cell) => `"${cell}"`).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "barcode-import-sample.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

    const resetModal = () => {
        setFile(null);
        setValidation(null);
        setUploadProgress(0);
        setPreviewPage(1);
        setFieldMapping({
            variant_id: "variant_id",
            barcode: "barcode",
            format: "format",
            ean: "ean",
            upc: "upc",
            isbn: "isbn",
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleClose = () => {
        resetModal();
        onClose?.();
    };

    const handleFieldMappingChange = (field, value) => {
        setFieldMapping((prev) => ({ ...prev, [field]: value }));

        if (validation?.rawRows) {
            const processed = [];
            const errors = [];
            const variantCount = {};

            validation.rawRows.forEach((row, index) => {
                const rowErrors = validateRow(
                    row,
                    index,
                    { variantCount },
                    {
                        ...fieldMapping,
                        [field]: value,
                    }
                );

                if (rowErrors.length > 0) {
                    errors.push(...rowErrors);
                } else {
                    const mappedRow = {
                        ...fieldMapping,
                        [field]: value,
                    };

                    const variantId = row[mappedRow.variant_id];
                    const barcodeValue = row[mappedRow.barcode];

                    processed.push({
                        variant_id: variantId.trim(),
                        barcode: barcodeValue.trim(),
                        format: row[mappedRow.format]?.trim() || "AUTO",
                        ean: row[mappedRow.ean]?.trim() || null,
                        upc: row[mappedRow.upc]?.trim() || null,
                        isbn: row[mappedRow.isbn]?.trim() || null,
                    });
                }
            });

            const validRows = processed.length;
            const status = errors.length === 0 ? "success" : "warning";

            setValidation((prev) => ({
                ...prev,
                status,
                message:
                    status === "success"
                        ? `Ready to import ${validRows} barcode(s)`
                        : `${validRows} valid row(s), ${errors.length} error(s)`,
                validRows,
                errors,
                processed,
            }));
        }
    };

    const paginatedData =
        validation?.processed?.slice(
            (previewPage - 1) * PREVIEW_PER_PAGE,
            previewPage * PREVIEW_PER_PAGE
        ) || [];
    const totalPages = Math.ceil(
        (validation?.validRows || 0) / PREVIEW_PER_PAGE
    );

    return (
        <Modal
            open={isOpen}
            onClose={handleClose}
            title="Import Barcodes"
            primaryAction={{
                content: "Import",
                loading: uploading || parsing,
                disabled:
                    !validation ||
                    validation.status === "error" ||
                    validation.validRows === 0,
                onAction: handleImport,
            }}
            secondaryActions={[
                {
                    content: "Cancel",
                    onAction: handleClose,
                },
            ]}
            large
        >
            <Modal.Section>
                <BlockStack gap="400">
                    {/* File Upload Section */}
                    <Card>
                        <BlockStack gap="300">
                            <Box
                                as="label"
                                padding="400"
                                borderRadius="200"
                                borderStyle="dashed"
                                borderColor="border"
                                borderWidth="1"
                                background="bg-fill-secondary"
                                style={{
                                    cursor: "pointer",
                                    textAlign: "center",
                                }}
                            >
                                <BlockStack gap="200">
                                    <Icon source={UploadIcon} tone="base" />
                                    <BlockStack gap="100">
                                        <Text
                                            variant="bodyMd"
                                            fontWeight="semibold"
                                        >
                                            {file?.name ||
                                                "Click to upload CSV"}
                                        </Text>
                                        <Text variant="bodySm" tone="subdued">
                                            or drag and drop
                                        </Text>
                                    </BlockStack>
                                </BlockStack>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileSelect}
                                    style={{ display: "none" }}
                                />
                            </Box>

                            <InlineStack gap="200">
                                <Text variant="bodySm" tone="subdued">
                                    Required:{" "}
                                    <strong>variant_id, barcode</strong>
                                </Text>
                                <Text variant="bodySm" tone="subdued">
                                    Optional: format, ean, upc, isbn
                                </Text>
                            </InlineStack>

                            <Button
                                icon={FolderDownIcon}
                                onClick={downloadSampleFile}
                                tone="info"
                            >
                                Download Sample File
                            </Button>
                        </BlockStack>
                    </Card>

                    {/* Status Messages */}
                    {validation && (
                        <>
                            {validation.status === "error" && (
                                <Banner tone="critical" icon={AlertCircleIcon}>
                                    {validation.message}
                                </Banner>
                            )}

                            {validation.status === "success" && (
                                <Banner tone="success" icon={CheckCircleIcon}>
                                    {validation.message}
                                </Banner>
                            )}

                            {validation.status === "warning" && (
                                <Banner tone="warning" icon={AlertCircleIcon}>
                                    {validation.message}
                                </Banner>
                            )}
                        </>
                    )}

                    {/* Field Mapping Section */}
                    {validation && availableColumns.length > 0 && (
                        <Card>
                            <BlockStack gap="300">
                                <Text variant="bodyMd" fontWeight="semibold">
                                    Map CSV Columns
                                </Text>
                                <Text variant="bodySm" tone="subdued">
                                    Select which columns contain your data
                                </Text>

                                <Divider />

                                <BlockStack gap="200">
                                    <Select
                                        label="Variant ID Column"
                                        options={[
                                            {
                                                label: "-- Select --",
                                                value: "",
                                            },
                                            ...availableColumns.map((col) => ({
                                                label: col,
                                                value: col,
                                            })),
                                        ]}
                                        value={fieldMapping.variant_id}
                                        onChange={(value) =>
                                            handleFieldMappingChange(
                                                "variant_id",
                                                value
                                            )
                                        }
                                    />

                                    <Select
                                        label="Barcode Column"
                                        options={[
                                            {
                                                label: "-- Select --",
                                                value: "",
                                            },
                                            ...availableColumns.map((col) => ({
                                                label: col,
                                                value: col,
                                            })),
                                        ]}
                                        value={fieldMapping.barcode}
                                        onChange={(value) =>
                                            handleFieldMappingChange(
                                                "barcode",
                                                value
                                            )
                                        }
                                    />

                                    <Select
                                        label="Format Column (Optional)"
                                        options={[
                                            { label: "-- None --", value: "" },
                                            ...availableColumns.map((col) => ({
                                                label: col,
                                                value: col,
                                            })),
                                        ]}
                                        value={fieldMapping.format}
                                        onChange={(value) =>
                                            handleFieldMappingChange(
                                                "format",
                                                value
                                            )
                                        }
                                    />

                                    <Select
                                        label="EAN Column (Optional)"
                                        options={[
                                            { label: "-- None --", value: "" },
                                            ...availableColumns.map((col) => ({
                                                label: col,
                                                value: col,
                                            })),
                                        ]}
                                        value={fieldMapping.ean}
                                        onChange={(value) =>
                                            handleFieldMappingChange(
                                                "ean",
                                                value
                                            )
                                        }
                                    />

                                    <Select
                                        label="UPC Column (Optional)"
                                        options={[
                                            { label: "-- None --", value: "" },
                                            ...availableColumns.map((col) => ({
                                                label: col,
                                                value: col,
                                            })),
                                        ]}
                                        value={fieldMapping.upc}
                                        onChange={(value) =>
                                            handleFieldMappingChange(
                                                "upc",
                                                value
                                            )
                                        }
                                    />

                                    <Select
                                        label="ISBN Column (Optional)"
                                        options={[
                                            { label: "-- None --", value: "" },
                                            ...availableColumns.map((col) => ({
                                                label: col,
                                                value: col,
                                            })),
                                        ]}
                                        value={fieldMapping.isbn}
                                        onChange={(value) =>
                                            handleFieldMappingChange(
                                                "isbn",
                                                value
                                            )
                                        }
                                    />
                                </BlockStack>
                            </BlockStack>
                        </Card>
                    )}

                    {/* Validation Summary */}
                    {validation && (
                        <Card>
                            <BlockStack gap="300">
                                <Text variant="bodyMd" fontWeight="semibold">
                                    Validation Results
                                </Text>

                                <Divider />

                                <InlineStack distribute="fillEvenly">
                                    <BlockStack gap="100">
                                        <Text variant="bodySm" tone="subdued">
                                            Total Rows
                                        </Text>
                                        <Text variant="headingMd">
                                            {validation.totalRows}
                                        </Text>
                                    </BlockStack>

                                    <BlockStack gap="100">
                                        <Text variant="bodySm" tone="subdued">
                                            Valid
                                        </Text>
                                        <Text
                                            variant="headingMd"
                                            tone="success"
                                        >
                                            {validation.validRows}
                                        </Text>
                                    </BlockStack>

                                    <BlockStack gap="100">
                                        <Text variant="bodySm" tone="subdued">
                                            Errors
                                        </Text>
                                        <Text
                                            variant="headingMd"
                                            tone={
                                                validation.errors.length > 0
                                                    ? "critical"
                                                    : "success"
                                            }
                                        >
                                            {validation.errors.length}
                                        </Text>
                                    </BlockStack>
                                </InlineStack>
                            </BlockStack>
                        </Card>
                    )}

                    {/* Live Preview */}
                    {validation && validation.validRows > 0 && (
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack
                                    align="space-between"
                                    blockAlign="center"
                                >
                                    <Text
                                        variant="bodyMd"
                                        fontWeight="semibold"
                                    >
                                        Live Preview (Page {previewPage} of{" "}
                                        {totalPages})
                                    </Text>
                                    <InlineStack gap="200">
                                        <Button
                                            disabled={previewPage === 1}
                                            onClick={() =>
                                                setPreviewPage((p) => p - 1)
                                            }
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            disabled={
                                                previewPage === totalPages
                                            }
                                            onClick={() =>
                                                setPreviewPage((p) => p + 1)
                                            }
                                        >
                                            Next
                                        </Button>
                                    </InlineStack>
                                </InlineStack>

                                <Divider />

                                {paginatedData.length > 0 ? (
                                    <div style={{ overflowX: "auto" }}>
                                        <table
                                            style={{
                                                width: "100%",
                                                borderCollapse: "collapse",
                                                fontSize: "12px",
                                            }}
                                        >
                                            <thead>
                                                <tr
                                                    style={{
                                                        backgroundColor:
                                                            "#f3f3f3",
                                                        borderBottom:
                                                            "1px solid #ddd",
                                                    }}
                                                >
                                                    <th
                                                        style={{
                                                            padding: "8px",
                                                            textAlign: "left",
                                                            fontWeight: "600",
                                                        }}
                                                    >
                                                        Variant ID
                                                    </th>
                                                    <th
                                                        style={{
                                                            padding: "8px",
                                                            textAlign: "left",
                                                            fontWeight: "600",
                                                        }}
                                                    >
                                                        Barcode
                                                    </th>
                                                    <th
                                                        style={{
                                                            padding: "8px",
                                                            textAlign: "left",
                                                            fontWeight: "600",
                                                        }}
                                                    >
                                                        Format
                                                    </th>
                                                    <th
                                                        style={{
                                                            padding: "8px",
                                                            textAlign: "left",
                                                            fontWeight: "600",
                                                        }}
                                                    >
                                                        EAN
                                                    </th>
                                                    <th
                                                        style={{
                                                            padding: "8px",
                                                            textAlign: "left",
                                                            fontWeight: "600",
                                                        }}
                                                    >
                                                        UPC
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedData.map(
                                                    (row, idx) => (
                                                        <tr
                                                            key={idx}
                                                            style={{
                                                                borderBottom:
                                                                    "1px solid #eee",
                                                                backgroundColor:
                                                                    idx % 2 ===
                                                                    0
                                                                        ? "#fafafa"
                                                                        : "",
                                                            }}
                                                        >
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        "8px",
                                                                }}
                                                            >
                                                                <Badge tone="info">
                                                                    {
                                                                        row.variant_id
                                                                    }
                                                                </Badge>
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        "8px",
                                                                }}
                                                            >
                                                                <Badge tone="success">
                                                                    {
                                                                        row.barcode
                                                                    }
                                                                </Badge>
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        "8px",
                                                                }}
                                                            >
                                                                <Text variant="bodySm">
                                                                    {row.format}
                                                                </Text>
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        "8px",
                                                                }}
                                                            >
                                                                <Text
                                                                    variant="bodySm"
                                                                    tone="subdued"
                                                                >
                                                                    {row.ean ||
                                                                        "—"}
                                                                </Text>
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        "8px",
                                                                }}
                                                            >
                                                                <Text
                                                                    variant="bodySm"
                                                                    tone="subdued"
                                                                >
                                                                    {row.upc ||
                                                                        "—"}
                                                                </Text>
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <EmptyState heading="No valid rows to preview" />
                                )}
                            </BlockStack>
                        </Card>
                    )}

                    {/* Error List */}
                    {validation?.errors && validation.errors.length > 0 && (
                        <Card>
                            <BlockStack gap="200">
                                <Text variant="bodyMd" fontWeight="semibold">
                                    Issues Found ({validation.errors.length})
                                </Text>
                                <Box maxHeight="250px" overflowY="auto">
                                    <BlockStack gap="100">
                                        {validation.errors
                                            .slice(0, 15)
                                            .map((error, idx) => (
                                                <InlineStack
                                                    gap="200"
                                                    key={idx}
                                                    blockAlign="start"
                                                >
                                                    <Text
                                                        variant="bodySm"
                                                        tone="critical"
                                                    >
                                                        •
                                                    </Text>
                                                    <Text
                                                        variant="bodySm"
                                                        tone="critical"
                                                    >
                                                        {error}
                                                    </Text>
                                                </InlineStack>
                                            ))}
                                        {validation.errors.length > 15 && (
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                ... and{" "}
                                                {validation.errors.length - 15}{" "}
                                                more errors
                                            </Text>
                                        )}
                                    </BlockStack>
                                </Box>
                            </BlockStack>
                        </Card>
                    )}

                    {/* Warning List */}
                    {validation?.warnings && validation.warnings.length > 0 && (
                        <Card>
                            <BlockStack gap="200">
                                <Text variant="bodyMd" fontWeight="semibold">
                                    Warnings
                                </Text>
                                <BlockStack gap="100">
                                    {validation.warnings.map((warning, idx) => (
                                        <InlineStack gap="200" key={idx}>
                                            <Text
                                                variant="bodySm"
                                                tone="warning"
                                            >
                                                ⚠
                                            </Text>
                                            <Text
                                                variant="bodySm"
                                                tone="warning"
                                            >
                                                {warning}
                                            </Text>
                                        </InlineStack>
                                    ))}
                                </BlockStack>
                            </BlockStack>
                        </Card>
                    )}

                    {/* Upload Progress */}
                    {uploading && (
                        <BlockStack gap="200">
                            <Text variant="bodySm">Uploading...</Text>
                            <ProgressBar progress={uploadProgress} />
                        </BlockStack>
                    )}
                </BlockStack>
            </Modal.Section>
        </Modal>
    );
}
