// resources/js/Pages/components/BarcodeHeader.jsx
import React from "react";
import {
    InlineStack,
    Text,
    Button,
    Icon,
    Tooltip,
    Box,
} from "@shopify/polaris";
import {
    ArrowLeftIcon,
    ImportIcon,
    ExportIcon,
    FolderDownIcon,
} from "@shopify/polaris-icons";
import { Link } from "@inertiajs/react";

export default function BarcodeHeader({ onImport, onExport }) {
    const downloadTemplate = () => {
        const csv = `shopify_variant_id,barcode\n="47718466191611",="0123456789012"\n="47718466191612",="0123456789013"`;
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "barcode-import-template.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Box paddingBlockStart="100" paddingBlockEnd="10">
            <InlineStack align="space-between" blockAlign="center" gap="400">
                {/* Left side – Back arrow + Title */}
                <InlineStack gap="400" align="center">
                    <Link href={route("home")}>
                        <Icon source={ArrowLeftIcon} color="base" />
                    </Link>

                    <div>
                        <Text variant="headingXl" as="h1">
                            Barcode Generator Pro
                        </Text>
                        <Text variant="bodyMd" tone="subdued">
                            EAN • UPC • ISBN • Bulk Ready
                        </Text>
                    </div>
                </InlineStack>

                {/* Right side – Import & Export buttons */}
                <InlineStack gap="200">
                    <Tooltip
                        content="Download a sample CSV template"
                        preferredPosition="below"
                    >
                        <Button
                            size="large"
                            icon={FolderDownIcon}
                            onClick={downloadTemplate}
                        >
                            Download Template
                        </Button>
                    </Tooltip>

                    <Tooltip
                        content="Import barcodes from a CSV file"
                        preferredPosition="below"
                    >
                        <Button
                            size="large"
                            variant="primary"
                            icon={ImportIcon}
                            onClick={onImport}
                        >
                            Import CSV
                        </Button>
                    </Tooltip>

                    {/* Export Button — hidden temporarily */}
                    {/* <Tooltip
                        content="Export generated/imported barcodes as CSV"
                        preferredPosition="below"
                    >
                        <Button
                            size="large"
                            tone="critical"
                            icon={<Icon source={ExportIcon} />}
                            onClick={onExport}
                        >
                            Export CSV
                        </Button>
                    </Tooltip> */}
                </InlineStack>
            </InlineStack>
        </Box>
    );
}
