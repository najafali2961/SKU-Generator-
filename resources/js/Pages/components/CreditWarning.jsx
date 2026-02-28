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
        <Banner title="Insufficient Credits" tone="warning">
            <Text as="p">
                You need <strong>{requiredCredits} credits</strong> to process{" "}
                <strong>{itemsToProcess} item(s)</strong>, but only have{" "}
                <strong>{availableCredits} credits</strong> available. Maximum
                items you can process with current credits:{" "}
                <strong>{maxAllowed}</strong>
            </Text>

            <div style={{ marginTop: "2px" }}>
                <button
                    onClick={() => {
                        if (window.$crisp) {
                            window.$crisp.push(["do", "chat:open"]);
                            window.$crisp.push([
                                "do",
                                "message:send",
                                [
                                    "text",
                                    "Hi! I need more credits to process my items. Can you help?",
                                ],
                            ]);
                        } else {
                            window.open(
                                "mailto:support@airoapps.com?subject=Need More Credits",
                                "_blank",
                            );
                        }
                    }}
                    style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        color: "#005bd3",
                        fontWeight: "bold",
                        cursor: "pointer",
                        textDecoration: "underline",
                        fontSize: "13px",
                    }}
                >
                    Chat with Support
                </button>
            </div>
        </Banner>
    );
}
