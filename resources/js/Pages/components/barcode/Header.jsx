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
import { ArrowLeftIcon, ImportIcon, ExportIcon } from "@shopify/polaris-icons";
import { Link } from "@inertiajs/react";

export default function BarcodeHeader({ onImport, onExport }) {
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
                    {/* Import Button */}
                    <Tooltip
                        content="Import purchased EAN/UPC/ISBN numbers (CSV)"
                        preferredPosition="below"
                    >
                        <Button
                            size="large"
                            icon={<Icon source={ImportIcon} />}
                            onClick={onImport}
                        >
                            Import Codes
                        </Button>
                    </Tooltip>

                    {/* Export Button */}
                    <Tooltip
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
                    </Tooltip>
                </InlineStack>
            </InlineStack>
        </Box>
    );
}
