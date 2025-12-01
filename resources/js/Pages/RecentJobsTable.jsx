import React, { useState } from "react";
import {
    Card,
    Text,
    InlineStack,
    BlockStack,
    Badge,
    Icon,
    Button,
} from "@shopify/polaris";
import {
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    PlayIcon,
    ArrowRightIcon,
} from "@shopify/polaris-icons";

export default function RecentJobsTable({ jobs = [] }) {
    const [sortBy, setSortBy] = useState("recent");

    const formatRelativeTime = (dateString) => {
        if (!dateString) return "—";
        const date = new Date(dateString);
        const now = new Date();
        const secondsAgo = Math.floor((now - date) / 1000);

        if (secondsAgo < 60) return `${secondsAgo}s ago`;
        if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
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
            pending: "subdued",
        };
        return (
            <Badge tone={toneMap[status] || "subdued"}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const sortedJobs = [...jobs].sort((a, b) => {
        if (sortBy === "recent") {
            return new Date(b.created_at) - new Date(a.created_at);
        }
        return 0;
    });

    return (
        <Card padding="0" roundedAbove="lg">
            <div
                style={{
                    borderBottom: "1px solid #e3e8f3",
                    padding: "20px 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <BlockStack gap="100">
                    <Text variant="headingMd" fontWeight="semibold">
                        Recent Jobs
                    </Text>
                    <Text tone="subdued" size="small">
                        {sortedJobs.length} total job
                        {sortedJobs.length !== 1 ? "s" : ""}
                    </Text>
                </BlockStack>
            </div>

            {sortedJobs.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                    <Text tone="subdued">
                        No jobs yet. Start processing to see history here.
                    </Text>
                </div>
            ) : (
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
                                    borderBottom: "1px solid #e3e8f3",
                                    backgroundColor: "#f9fafb",
                                }}
                            >
                                <th
                                    style={{
                                        padding: "12px 24px",
                                        textAlign: "left",
                                        fontWeight: 600,
                                        color: "#637588",
                                        fontSize: "12px",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Job Type
                                </th>
                                <th
                                    style={{
                                        padding: "12px 24px",
                                        textAlign: "left",
                                        fontWeight: 600,
                                        color: "#637588",
                                        fontSize: "12px",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Progress
                                </th>
                                <th
                                    style={{
                                        padding: "12px 24px",
                                        textAlign: "left",
                                        fontWeight: 600,
                                        color: "#637588",
                                        fontSize: "12px",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Status
                                </th>
                                <th
                                    style={{
                                        padding: "12px 24px",
                                        textAlign: "left",
                                        fontWeight: 600,
                                        color: "#637588",
                                        fontSize: "12px",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Duration
                                </th>
                                <th
                                    style={{
                                        padding: "12px 24px",
                                        textAlign: "left",
                                        fontWeight: 600,
                                        color: "#637588",
                                        fontSize: "12px",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Started
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedJobs.map((job, idx) => {
                                const processed = job.processed_items || 0;
                                const total = job.total_items || 0;
                                const progress =
                                    total > 0
                                        ? Math.round((processed / total) * 100)
                                        : 0;
                                return (
                                    <tr
                                        key={job.id}
                                        style={{
                                            borderBottom: "1px solid #e3e8f3",
                                            backgroundColor:
                                                idx % 2 === 0
                                                    ? "#ffffff"
                                                    : "#f9fafb",
                                            transition:
                                                "background-color 0.2s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                "#f0f5ff";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                idx % 2 === 0
                                                    ? "#ffffff"
                                                    : "#f9fafb";
                                        }}
                                    >
                                        <td
                                            style={{
                                                padding: "16px 24px",
                                                verticalAlign: "middle",
                                            }}
                                        >
                                            <BlockStack gap="100">
                                                <Text fontWeight="semibold">
                                                    {job.type
                                                        ?.replace(/_/g, " ")
                                                        .split(" ")
                                                        .map(
                                                            (w) =>
                                                                w
                                                                    .charAt(0)
                                                                    .toUpperCase() +
                                                                w.slice(1)
                                                        )
                                                        .join(" ") || "Job"}
                                                </Text>
                                                {job.title && (
                                                    <Text
                                                        tone="subdued"
                                                        size="small"
                                                    >
                                                        {job.title}
                                                    </Text>
                                                )}
                                            </BlockStack>
                                        </td>

                                        <td
                                            style={{
                                                padding: "16px 24px",
                                                verticalAlign: "middle",
                                            }}
                                        >
                                            <BlockStack gap="200">
                                                <InlineStack
                                                    gap="200"
                                                    align="start"
                                                >
                                                    <div
                                                        style={{
                                                            width: "120px",
                                                            height: "4px",
                                                            backgroundColor:
                                                                "#e3e8f3",
                                                            borderRadius: "2px",
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: `${progress}%`,
                                                                height: "100%",
                                                                backgroundColor:
                                                                    "#1e90ff",
                                                                transition:
                                                                    "width 0.3s ease",
                                                            }}
                                                        />
                                                    </div>
                                                    <Text
                                                        size="small"
                                                        fontWeight="medium"
                                                        style={{
                                                            minWidth: "35px",
                                                        }}
                                                    >
                                                        {progress}%
                                                    </Text>
                                                </InlineStack>
                                                <Text
                                                    tone="subdued"
                                                    size="small"
                                                >
                                                    {processed}/{total}
                                                </Text>
                                            </BlockStack>
                                        </td>

                                        <td
                                            style={{
                                                padding: "16px 24px",
                                                verticalAlign: "middle",
                                            }}
                                        >
                                            <InlineStack gap="200" align="left">
                                                {getStatusBadge(job.status)}
                                            </InlineStack>
                                        </td>

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

                                        <td
                                            style={{
                                                padding: "16px 24px",
                                                verticalAlign: "middle",
                                            }}
                                        >
                                            <Text tone="subdued" size="small">
                                                {formatRelativeTime(
                                                    job.created_at
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

            <style>{`
                tr {
                    cursor: pointer;
                }
                tr:hover {
                    background-color: #f0f5ff !important;
                }
            `}</style>
        </Card>
    );
}
