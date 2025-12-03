// resources/js/Pages/BarcodePrinter/Jobs.jsx
import React, { useState } from "react";
import {
    Page,
    Layout,
    Card,
    Text,
    BlockStack,
    InlineStack,
    Box,
    Badge,
    Icon,
    Button,
    EmptyState,
} from "@shopify/polaris";
import {
    PrintIcon,
    CheckmarkIcon,
    AlertIcon,
    ClockIcon,
    CancelSmallIcon,
} from "@shopify/polaris-icons";
import { Link } from "@inertiajs/react";

export default function PrintJobsList({ jobs }) {
    const formatDate = (dateString) => {
        if (!dateString) return "—";
        return new Date(dateString).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusBadge = (status) => {
        const toneMap = {
            completed: "success",
            failed: "critical",
            processing: "info",
            pending: "warning",
        };
        return (
            <Badge tone={toneMap[status] || "subdued"}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const getStatusIcon = (status) => {
        const iconMap = {
            completed: CheckmarkIcon,
            failed: AlertIcon,
            processing: ClockIcon,
            pending: ClockIcon,
        };
        return iconMap[status] || ClockIcon;
    };

    return (
        <Page title="Print Jobs">
            <Layout>
                <Layout.Section>
                    <Card padding="0" roundedAbove="lg">
                        {/* Header */}
                        <div
                            style={{
                                padding: "20px 24px",
                                borderBottom:
                                    "1px solid var(--p-color-border-subdued)",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <BlockStack gap="100">
                                <Text variant="headingMd" fontWeight="semibold">
                                    Print Jobs History
                                </Text>
                                <Text tone="subdued" variant="bodySm">
                                    {jobs?.data?.length || 0} jobs
                                </Text>
                            </BlockStack>
                            <Link href={route("barcode-printer.index")}>
                                <Button icon={PrintIcon}>New Print Job</Button>
                            </Link>
                        </div>

                        {/* Table */}
                        {jobs?.data?.length === 0 ? (
                            <EmptyState
                                heading="No print jobs yet"
                                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                            >
                                <Text tone="subdued" alignment="center">
                                    Start by creating a new print job to
                                    generate labels.
                                </Text>
                            </EmptyState>
                        ) : (
                            <>
                                <div style={{ overflowX: "auto" }}>
                                    <table
                                        style={{
                                            width: "100%",
                                            borderCollapse: "collapse",
                                        }}
                                    >
                                        <thead>
                                            <tr
                                                style={{
                                                    background:
                                                        "var(--p-color-bg-surface-secondary)",
                                                    borderBottom:
                                                        "1px solid var(--p-color-border-subdued)",
                                                }}
                                            >
                                                {[
                                                    "Label Config",
                                                    "Total Labels",
                                                    "Status",
                                                    "Created",
                                                    "Action",
                                                ].map((header) => (
                                                    <th
                                                        key={header}
                                                        style={{
                                                            padding:
                                                                "12px 24px",
                                                            textAlign: "left",
                                                            fontWeight: 600,
                                                            fontSize: "12px",
                                                            textTransform:
                                                                "uppercase",
                                                            color: "var(--p-color-text-subdued)",
                                                        }}
                                                    >
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {jobs?.data?.map((job, idx) => (
                                                <tr
                                                    key={job.id}
                                                    style={{
                                                        background:
                                                            idx % 2 === 0
                                                                ? "var(--p-color-bg-surface)"
                                                                : "var(--p-color-bg-surface-secondary)",
                                                        borderBottom:
                                                            "1px solid var(--p-color-border-subdued)",
                                                    }}
                                                >
                                                    <td
                                                        style={{
                                                            padding:
                                                                "16px 24px",
                                                        }}
                                                    >
                                                        <BlockStack gap="100">
                                                            <Text fontWeight="semibold">
                                                                {
                                                                    job
                                                                        .barcodePrinterSetting
                                                                        ?.label_name
                                                                }
                                                            </Text>
                                                            <Text
                                                                tone="subdued"
                                                                variant="bodySm"
                                                            >
                                                                {
                                                                    job
                                                                        .barcodePrinterSetting
                                                                        ?.barcode_type
                                                                }
                                                            </Text>
                                                        </BlockStack>
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding:
                                                                "16px 24px",
                                                        }}
                                                    >
                                                        <Badge tone="info">
                                                            {job.total_labels}{" "}
                                                            labels
                                                        </Badge>
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding:
                                                                "16px 24px",
                                                        }}
                                                    >
                                                        {getStatusBadge(
                                                            job.status
                                                        )}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding:
                                                                "16px 24px",
                                                        }}
                                                    >
                                                        <Text
                                                            tone="subdued"
                                                            variant="bodySm"
                                                        >
                                                            {formatDate(
                                                                job.created_at
                                                            )}
                                                        </Text>
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding:
                                                                "16px 24px",
                                                        }}
                                                    >
                                                        <Link
                                                            href={route(
                                                                "barcode-printer.show-job",
                                                                job.id
                                                            )}
                                                        >
                                                            <Button
                                                                size="slim"
                                                                variant="plain"
                                                            >
                                                                View
                                                            </Button>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {jobs?.links && (
                                    <Box
                                        padding="400"
                                        borderTopWidth="1"
                                        borderColor="border"
                                    >
                                        <InlineStack align="center" gap="200">
                                            {jobs.links.prev && (
                                                <Link href={jobs.links.prev}>
                                                    <Button>Previous</Button>
                                                </Link>
                                            )}
                                            <Text tone="subdued">
                                                Page {jobs.meta.current_page} of{" "}
                                                {jobs.meta.last_page}
                                            </Text>
                                            {jobs.links.next && (
                                                <Link href={jobs.links.next}>
                                                    <Button>Next</Button>
                                                </Link>
                                            )}
                                        </InlineStack>
                                    </Box>
                                )}
                            </>
                        )}
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
