import React from "react";
import {
    Card,
    Text,
    BlockStack,
    InlineStack,
    Badge,
    EmptyState,
    Button,
} from "@shopify/polaris";
import { PlayIcon } from "@shopify/polaris-icons";

export default function RecentJobsTable({ jobs = [] }) {
    const formatRelativeTime = (dateString) => {
        if (!dateString) return "—";
        const date = new Date(dateString);
        const now = new Date();
        const secondsAgo = Math.floor((now - date) / 1000);

        if (secondsAgo < 60) return `${secondsAgo}s ago`;
        if (secondsAgo < 60) return `${Math.floor(secondsAgo / 60)}m ago`;
        if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    const formatDuration = (startTime, endTime) => {
        if (!startTime) return "—";
        const start = new Date(startTime);
        const end = endTime ? new Date(endTime) : new Date();
        const seconds = Math.floor((end - start) / 1000);

        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h`;
    };

    const getStatusBadge = (status) => {
        const toneMap = {
            completed: "success",
            failed: "critical",
            running: "info",
            pending: "warning",
            queued: "attention",
        };
        const tone = toneMap[status] || "subdued";

        return (
            <Badge tone={tone}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    // Sort jobs: most recent first
    const sortedJobs = [...jobs].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    return (
        <Card padding="0" roundedAbove="lg">
            {/* Header */}
            <div
                style={{
                    padding: "20px 24px",
                    borderBottom: "1px solid var(--p-color-border-subdued)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <BlockStack gap="100">
                    <Text variant="headingMd" fontWeight="semibold">
                        Recent Jobs
                    </Text>
                    <Text tone="subdued" variant="bodySm">
                        {sortedJobs.length} job
                        {sortedJobs.length !== 1 ? "s" : ""}
                    </Text>
                </BlockStack>
            </div>

            {/* Empty State - Beautiful & Official */}
            {sortedJobs.length === 0 ? (
                <EmptyState
                    heading="No jobs yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                    <Text tone="subdued" alignment="center">
                        Once you run a job, it will appear here with progress,
                        status, and history.
                    </Text>
                </EmptyState>
            ) : (
                /* Table with Jobs */
                <div style={{ overflowX: "auto" }}>
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "14px",
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    backgroundColor:
                                        "var(--p-color-bg-surface-secondary)",
                                    borderBottom:
                                        "1px solid var(--p-color-border-subdued)",
                                }}
                            >
                                {[
                                    "Job Type",
                                    "Progress",
                                    "Status",
                                    "Duration",
                                    "Started",
                                ].map((header) => (
                                    <th
                                        key={header}
                                        style={{
                                            padding: "12px 24px",
                                            textAlign: "left",
                                            fontWeight: 600,
                                            fontSize: "12px",
                                            textTransform: "uppercase",
                                            color: "var(--p-color-text-subdued)",
                                        }}
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedJobs.map((job, idx) => {
                                const processed = job.processed_items || 0;
                                const total = job.total_items || 1;
                                const progress =
                                    total > 0
                                        ? Math.round((processed / total) * 100)
                                        : 0;

                                return (
                                    <tr
                                        key={job.id || idx}
                                        style={{
                                            backgroundColor:
                                                idx % 2 === 0
                                                    ? "var(--p-color-bg-surface)"
                                                    : "var(--p-color-bg-surface-secondary)",
                                            borderBottom:
                                                "1px solid var(--p-color-border-subdued)",
                                            cursor: "pointer",
                                            transition: "background-color 0.2s",
                                        }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.backgroundColor =
                                                "var(--p-color-bg-surface-hover)")
                                        }
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.backgroundColor =
                                                idx % 2 === 0
                                                    ? "var(--p-color-bg-surface)"
                                                    : "var(--p-color-bg-surface-secondary)")
                                        }
                                    >
                                        {/* Job Type */}
                                        <td
                                            style={{
                                                padding: "16px 24px",
                                                verticalAlign: "middle",
                                            }}
                                        >
                                            <BlockStack gap="100">
                                                <Text fontWeight="semibold">
                                                    {job.type
                                                        ? job.type
                                                              .replace(
                                                                  /_/g,
                                                                  " "
                                                              )
                                                              .split(" ")
                                                              .map(
                                                                  (word) =>
                                                                      word
                                                                          .charAt(
                                                                              0
                                                                          )
                                                                          .toUpperCase() +
                                                                      word.slice(
                                                                          1
                                                                      )
                                                              )
                                                              .join(" ")
                                                        : "Unknown Job"}
                                                </Text>
                                                {job.title && (
                                                    <Text
                                                        tone="subdued"
                                                        variant="bodySm"
                                                    >
                                                        {job.title}
                                                    </Text>
                                                )}
                                            </BlockStack>
                                        </td>

                                        {/* Progress */}
                                        <td
                                            style={{
                                                padding: "16px 24px",
                                                verticalAlign: "middle",
                                            }}
                                        >
                                            <BlockStack gap="200">
                                                <InlineStack
                                                    gap="300"
                                                    align="start"
                                                >
                                                    <div
                                                        style={{
                                                            width: "120px",
                                                            height: "6px",
                                                            backgroundColor:
                                                                "var(--p-color-border)",
                                                            borderRadius: "3px",
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: `${progress}%`,
                                                                height: "100%",
                                                                backgroundColor:
                                                                    "var(--p-color-border-interactive)",
                                                                transition:
                                                                    "width 0.4s ease",
                                                            }}
                                                        />
                                                    </div>
                                                    <Text
                                                        fontWeight="medium"
                                                        variant="bodySm"
                                                    >
                                                        {progress}%
                                                    </Text>
                                                </InlineStack>
                                                <Text
                                                    tone="subdued"
                                                    variant="bodySm"
                                                >
                                                    {processed.toLocaleString()}{" "}
                                                    / {total.toLocaleString()}
                                                </Text>
                                            </BlockStack>
                                        </td>

                                        {/* Status */}
                                        <td
                                            style={{
                                                padding: "16px 24px",
                                                verticalAlign: "middle",
                                            }}
                                        >
                                            {getStatusBadge(
                                                job.status || "pending"
                                            )}
                                        </td>

                                        {/* Duration */}
                                        <td
                                            style={{
                                                padding: "16px 24px",
                                                verticalAlign: "middle",
                                            }}
                                        >
                                            <Text fontWeight="medium">
                                                {formatDuration(
                                                    job.started_at,
                                                    job.finished_at
                                                )}
                                            </Text>
                                        </td>

                                        {/* Started */}
                                        <td
                                            style={{
                                                padding: "16px 24px",
                                                verticalAlign: "middle",
                                            }}
                                        >
                                            <Text
                                                tone="subdued"
                                                variant="bodySm"
                                            >
                                                {formatRelativeTime(
                                                    job.created_at ||
                                                        job.started_at
                                                )}
                                            </Text>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}
