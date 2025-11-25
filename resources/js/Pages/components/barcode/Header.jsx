import React from "react";
import {
    Card,
    InlineStack,
    Text,
    Button,
    Icon,
    Tooltip,
    Box,
} from "@shopify/polaris";
import { BarcodeIcon, ExportIcon } from "@shopify/polaris-icons";

export default function BarcodeHeader({ onScan, onExport, onGenerate }) {
    return (
        <Card padding="500">
            <InlineStack align="space-between" blockAlign="center">
                {/* Title */}
                <div>
                    <Text variant="headingXl" as="h1">
                        Barcode Generator Pro
                    </Text>
                    <Text variant="bodyMd" tone="subdued">
                        Fast • Accurate • Inventory-Ready
                    </Text>
                </div>

                {/* Right-side buttons */}
                <Box maxWidth="420px" width="100%">
                    <InlineStack gap="300">
                        {/* Generate Button */}
                        <Box width="200px">
                            <Tooltip content="Generate new barcodes based on your settings">
                                <Button
                                    primary
                                    size="large"
                                    fullWidth
                                    icon={<Icon source={BarcodeIcon} />}
                                    onClick={onGenerate}
                                >
                                    Generate
                                </Button>
                            </Tooltip>
                        </Box>

                        {/* Scan Button */}
                        <Box width="200px">
                            <Tooltip content="Open camera and scan barcodes">
                                <Button
                                    size="large"
                                    fullWidth
                                    icon={<Icon source={BarcodeIcon} />}
                                    onClick={onScan}
                                >
                                    Scan
                                </Button>
                            </Tooltip>
                        </Box>

                        {/* Export PDF Button */}
                        <Box width="200px">
                            <Button
                                size="large"
                                fullWidth
                                icon={<Icon source={ExportIcon} />}
                                onClick={onExport}
                            >
                                Export PDF
                            </Button>
                        </Box>
                    </InlineStack>
                </Box>
            </InlineStack>
        </Card>
    );
}
