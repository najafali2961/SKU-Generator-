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
} from "@shopify/polaris";
import {
    UploadIcon,
    CheckCircleIcon,
    AlertCircleIcon,
} from "@shopify/polaris-icons";
import Papa from "papaparse";

export default function BarcodeImportModal({ isOpen, onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [validation, setValidation] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    const REQUIRED_COLUMNS = ["variant_id", "barcode"];
    const OPTIONAL_COLUMNS = ["ean", "upc", "isbn", "format"];

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

        if (!row.variant_id || row.variant_id.trim() === "") {
            errors.push(`Row ${index + 1}: Missing variant_id`);
        }

        if (!row.barcode || row.barcode.trim() === "") {
            errors.push(`Row ${index + 1}: Missing barcode`);
        } else {
            const validation = validateBarcode(
                row.barcode,
                row.format || "AUTO"
            );
            if (!validation.valid) {
                errors.push(`Row ${index + 1}: ${validation.error}`);
            }
        }

        if (row.variant_id) {
            context.variantCount[row.variant_id] =
                (context.variantCount[row.variant_id] || 0) + 1;
        }

        return errors;
    };

    const parseCSV = (file) => {
        setParsing(true);
        setValidation(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.toLowerCase().trim(),
            complete: (results) => {
                const rows = results.data || [];
                const errors = [];
                const warnings = [];
                const processed = [];
                const variantCount = {};

                // Check headers
                const headers = Object.keys(rows[0] || {});
                const missingRequired = REQUIRED_COLUMNS.filter(
                    (col) => !headers.includes(col)
                );

                if (missingRequired.length > 0) {
                    setValidation({
                        status: "error",
                        message: `Missing required columns: ${missingRequired.join(
                            ", "
                        )}`,
                        totalRows: 0,
                        validRows: 0,
                        errors: [
                            `Headers must include: ${REQUIRED_COLUMNS.join(
                                ", "
                            )}`,
                        ],
                        warnings: [],
                        processed: [],
                    });
                    setParsing(false);
                    return;
                }

                // Validate rows
                rows.forEach((row, index) => {
                    const rowErrors = validateRow(row, index, { variantCount });
                    if (rowErrors.length > 0) {
                        errors.push(...rowErrors);
                    } else {
                        processed.push({
                            variant_id: row.variant_id.trim(),
                            barcode: row.barcode.trim(),
                            format: row.format?.trim() || "AUTO",
                            ean: row.ean?.trim() || null,
                            upc: row.upc?.trim() || null,
                            isbn: row.isbn?.trim() || null,
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
                errors: [(prev?.errors || []).concat(err.message)],
            }));
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const resetModal = () => {
        setFile(null);
        setValidation(null);
        setUploadProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleClose = () => {
        resetModal();
        onClose?.();
    };

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

                            <Text variant="bodySm" tone="subdued">
                                Required columns:{" "}
                                <strong>variant_id, barcode</strong>
                                <br />
                                Optional: format, ean, upc, isbn
                            </Text>
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

                    {/* Validation Summary */}
                    {validation && (
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="200">
                                    <Text
                                        variant="bodyMd"
                                        fontWeight="semibold"
                                    >
                                        Validation Results
                                    </Text>
                                </InlineStack>

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

                    {/* Error List */}
                    {validation?.errors && validation.errors.length > 0 && (
                        <Card>
                            <BlockStack gap="200">
                                <Text variant="bodyMd" fontWeight="semibold">
                                    Issues Found
                                </Text>
                                <Box maxHeight="200px" overflowY="auto">
                                    <BlockStack gap="100">
                                        {validation.errors
                                            .slice(0, 10)
                                            .map((error, idx) => (
                                                <Text
                                                    key={idx}
                                                    variant="bodySm"
                                                    tone="critical"
                                                >
                                                    • {error}
                                                </Text>
                                            ))}
                                        {validation.errors.length > 10 && (
                                            <Text
                                                variant="bodySm"
                                                tone="subdued"
                                            >
                                                ... and{" "}
                                                {validation.errors.length - 10}{" "}
                                                more
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
                                        <Text
                                            key={idx}
                                            variant="bodySm"
                                            tone="warning"
                                        >
                                            ⚠ {warning}
                                        </Text>
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
