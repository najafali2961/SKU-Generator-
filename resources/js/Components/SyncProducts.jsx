import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Card,
    BlockStack,
    InlineStack,
    Text,
    Button,
    ProgressBar,
    Badge,
    Box,
} from "@shopify/polaris";
import { router } from "@inertiajs/react";
import axios from "axios";

/**
 * Manual "Sync from Shopify" control + live progress.
 *
 * Lets a merchant re-pull the latest products/variants from Shopify when a
 * webhook was missed (data drift, items stuck in "Missing"). The work runs in a
 * background job chain; this widget just kicks it off and polls /sync/status.
 */
export default function SyncProducts() {
    const [status, setStatus] = useState(null);
    const [starting, setStarting] = useState(false);
    const pollRef = useRef(null);
    const wasRunningRef = useRef(false);

    const fetchStatus = useCallback(async () => {
        try {
            const { data } = await axios.get("/sync/status");
            setStatus(data);
            return data;
        } catch (e) {
            return null;
        }
    }, []);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const startPolling = useCallback(() => {
        stopPolling();
        pollRef.current = setInterval(async () => {
            const data = await fetchStatus();
            if (data && !data.running) {
                stopPolling();
                // Sync just finished — refresh dashboard counts.
                if (wasRunningRef.current) {
                    router.reload({ only: ["stats", "recentJobs"] });
                }
                wasRunningRef.current = false;
            } else if (data && data.running) {
                wasRunningRef.current = true;
            }
        }, 2000);
    }, [fetchStatus, stopPolling]);

    // On mount: resume the progress display if a sync is already running.
    useEffect(() => {
        let mounted = true;
        (async () => {
            const data = await fetchStatus();
            if (mounted && data && data.running) {
                wasRunningRef.current = true;
                startPolling();
            }
        })();
        return () => {
            mounted = false;
            stopPolling();
        };
    }, [fetchStatus, startPolling, stopPolling]);

    const handleSync = useCallback(async () => {
        setStarting(true);
        try {
            const { data } = await axios.post("/sync/products");
            setStatus(data);
            wasRunningRef.current = true;
            startPolling();
        } catch (e) {
            // Leave previous status visible on failure.
        } finally {
            setStarting(false);
        }
    }, [startPolling]);

    const running = !!status?.running;
    const processed = status?.processed ?? 0;
    const total = status?.total ?? 0;
    const percent = status?.percent ?? 0;

    return (
        <Card>
            <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center" wrap={false}>
                    <BlockStack gap="050">
                        <Text as="h2" variant="headingMd">
                            Product data sync
                        </Text>
                        <Text as="p" tone="subdued" variant="bodySm">
                            Re-pull the latest products & variants from Shopify.
                            Use this if data looks out of date, or items stay in
                            "Missing" after a webhook was missed.
                        </Text>
                    </BlockStack>
                    <Button
                        variant="primary"
                        onClick={handleSync}
                        loading={starting || running}
                        disabled={running}
                    >
                        {running ? "Syncing…" : "Sync from Shopify"}
                    </Button>
                </InlineStack>

                {running && (
                    <Box
                        background="bg-surface-secondary"
                        padding="300"
                        borderRadius="200"
                    >
                        <BlockStack gap="150">
                            <InlineStack align="space-between" blockAlign="center">
                                <Text as="span" variant="bodySm" tone="subdued">
                                    {total > 0
                                        ? `${processed} of ${total} products synced`
                                        : `${processed} products synced`}
                                </Text>
                                <Badge tone="info">{`${percent}%`}</Badge>
                            </InlineStack>
                            <ProgressBar
                                progress={total > 0 ? percent : 0}
                                size="small"
                            />
                            <Text as="span" variant="bodySm" tone="subdued">
                                You can leave this page — sync continues in the
                                background.
                            </Text>
                        </BlockStack>
                    </Box>
                )}

                {!running && status?.status === "completed" && status?.finished_at && (
                    <InlineStack>
                        <Badge tone="success" progress="complete">
                            Up to date
                        </Badge>
                    </InlineStack>
                )}
                {!running && status?.status === "failed" && (
                    <InlineStack>
                        <Badge tone="critical">Sync failed — please try again</Badge>
                    </InlineStack>
                )}
            </BlockStack>
        </Card>
    );
}
