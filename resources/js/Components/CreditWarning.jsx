///js/coomponents/CreditWarning.jsx
import React from "react";
import { Banner, Text, InlineStack } from "@shopify/polaris";

export default function CreditWarning({
    selectedCount,
    totalCount,
    availableCredits,
    costPerItem,
    hasUnlimited,
    scope = "selected",
    maxAllowed = 0,
}) {
    if (hasUnlimited) {
        return (
            <Banner tone="success">
                <InlineStack gap="200" blockAlign="center">
                    <Text fontWeight="bold">Unlimited Credits</Text>
                    <Text tone="subdued">—</Text>
                    <Text>No restrictions on operations</Text>
                </InlineStack>
            </Banner>
        );
    }

    const itemsToProcess = scope === "selected" ? selectedCount : totalCount;
    const requiredCredits = itemsToProcess * costPerItem;
    const hasEnough = availableCredits >= requiredCredits;

    if (itemsToProcess === 0) {
        return (
            <Banner tone="info">
                <Text>Select variants to see credit usage calculation</Text>
            </Banner>
        );
    }

    if (!hasEnough) {
        return (
            <Banner tone="critical">
                <InlineStack gap="300" wrap={false}>
                    <div style={{ flex: 1 }}>
                        <Text>
                            <strong>Insufficient Credits:</strong> You need{" "}
                            <strong>{requiredCredits} credits</strong> to
                            process <strong>{itemsToProcess} item(s)</strong>,
                            but only have{" "}
                            <strong>{availableCredits} credits</strong>{" "}
                            available.
                        </Text>
                        <div style={{ marginTop: "8px" }}>
                            <Text tone="subdued">
                                Maximum items you can process:{" "}
                                <strong>{maxAllowed}</strong>
                            </Text>
                        </div>
                    </div>
                </InlineStack>
            </Banner>
        );
    }

    const remainingAfter = availableCredits - requiredCredits;
    const percentageUsed = Math.round(
        (requiredCredits / availableCredits) * 100
    );

    return (
        <Banner tone={percentageUsed >= 80 ? "warning" : "success"}>
            <InlineStack gap="200" blockAlign="center" wrap>
                <Text>
                    Processing <strong>{itemsToProcess} item(s)</strong> will
                    use <strong>{requiredCredits} credit(s)</strong>
                </Text>
                <Text tone="subdued">•</Text>
                <Text tone="subdued">
                    {remainingAfter} credits remaining after ({percentageUsed}%
                    used)
                </Text>
            </InlineStack>
        </Banner>
    );
}
