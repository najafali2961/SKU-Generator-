import React from "react";
import { Banner, Text, InlineStack, Button } from "@shopify/polaris";
import { router } from "@inertiajs/react";

export default function CreditWarning({
    selectedCount,
    totalCount,
    availableCredits,
    costPerItem,
    hasUnlimited,
    scope = "selected",
    maxAllowed = 0,
}) {
    // Don't show anything for unlimited users
    if (hasUnlimited) {
        return null;
    }

    const itemsToProcess = scope === "selected" ? selectedCount : totalCount;
    const requiredCredits = itemsToProcess * costPerItem;
    const hasEnough = availableCredits >= requiredCredits;

    // Don't show warning if user has enough credits
    if (hasEnough) {
        return null;
    }

    // Don't show if no items selected
    if (itemsToProcess === 0) {
        return null;
    }

    return (
        <Banner tone="info">
            <InlineStack gap="300" wrap={false}>
                <div style={{ flex: 1 }}>
                    <Text>
                        <strong>Insufficient Credits:</strong> You need{" "}
                        <strong>{requiredCredits} credits</strong> to process{" "}
                        <strong>{itemsToProcess} item(s)</strong>, but only have{" "}
                        <strong>{availableCredits} credits</strong> available.
                    </Text>
                    <div style={{ marginTop: "8px" }}>
                        <Text tone="subdued">
                            Maximum items you can process with current credits:{" "}
                            <strong>{maxAllowed}</strong>
                        </Text>
                    </div>
                    <div style={{ marginTop: "12px" }}>
                        <Button
                            size="micro"
                            onClick={() => router.visit("/pricing")}
                        >
                            Upgrade Plan
                        </Button>
                    </div>
                </div>
            </InlineStack>
        </Banner>
    );
}
