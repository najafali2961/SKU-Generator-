// resources/js/Pages/BarcodePrinter/components/printer/PrinterHeader.jsx
import React from "react";
import {
    InlineStack,
    Text,
    Button,
    Icon,
    Tooltip,
    Box,
} from "@shopify/polaris";
import { ArrowLeftIcon, PrintIcon } from "@shopify/polaris-icons";
import { Link } from "@inertiajs/react";

export default function PrinterHeader({ selectedCount, totalVariants }) {
    return (
        <Box paddingBlockStart="100" paddingBlockEnd="100">
            <InlineStack align="space-between" blockAlign="center" gap="400">
                {/* Left side – Back arrow + Title */}
                <InlineStack gap="400" align="center">
                    <Link href={route("home")}>
                        <Icon source={ArrowLeftIcon} color="base" />
                    </Link>

                    <div>
                        <Text variant="headingXl" as="h1">
                            Barcode & Label Printer
                        </Text>
                        <Text variant="bodyMd" tone="subdued">
                            Professional Label Designer • Multi-format Support
                        </Text>
                    </div>
                </InlineStack>

                {/* Right side – Stats */}
                <InlineStack gap="300">
                    <Box
                        background="bg-surface-secondary"
                        padding="300"
                        borderRadius="200"
                    >
                        <InlineStack gap="200" blockAlign="center">
                            <Icon source={PrintIcon} tone="base" />
                            <Text variant="bodyMd" fontWeight="semibold">
                                {selectedCount} of {totalVariants} selected
                            </Text>
                        </InlineStack>
                    </Box>
                </InlineStack>
            </InlineStack>
        </Box>
    );
}
