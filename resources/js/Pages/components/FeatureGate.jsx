import React from "react";
import { usePage, router } from "@inertiajs/react";
import { Modal, Text, Badge, BlockStack } from "@shopify/polaris";

/**
 * Plan-gated feature helpers.
 *
 * Backend shares `features` via Inertia: { slug: { enabled, label, required_plan } }.
 * Gated controls stay VISIBLE with a plan badge; clicking a locked control
 * opens an upgrade prompt that links to /pricing — never a hidden or
 * silently-disabled button.
 */
export function useFeature(slug) {
    const { features } = usePage().props;
    const gate = features?.[slug];

    return {
        enabled: gate ? Boolean(gate.enabled) : true,
        label: gate?.label || "This feature",
        requiredPlan: gate?.required_plan || null,
    };
}

/** Small badge to render next to a locked control's label. */
export function PlanBadge({ feature }) {
    if (feature.enabled) return null;

    return (
        <Badge tone="attention" size="small">
            {feature.requiredPlan || "PRO"}
        </Badge>
    );
}

/** Upgrade prompt shown when a locked control is clicked. */
export function UpgradeModal({ open, onClose, feature }) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Unlock ${feature.label}`}
            primaryAction={{
                content: "View plans",
                onAction: () => router.visit("/pricing"),
            }}
            secondaryActions={[{ content: "Not now", onAction: onClose }]}
        >
            <Modal.Section>
                <BlockStack gap="200">
                    <Text as="p">
                        <strong>{feature.label}</strong>{" "}
                        {feature.requiredPlan
                            ? `is included in the ${feature.requiredPlan} plan and above.`
                            : "is available on higher plans."}
                    </Text>
                    <Text as="p" tone="subdued">
                        Upgrade your plan to use it — your work here stays
                        exactly as it is.
                    </Text>
                </BlockStack>
            </Modal.Section>
        </Modal>
    );
}
