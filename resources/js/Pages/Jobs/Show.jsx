import { useEffect, useState } from "react";
import {
    Page,
    Layout,
    Card,
    Text,
    Badge,
    ProgressBar,
    InlineStack,
    BlockStack,
    Box,
    Divider,
    Button,
    Icon,
    ResourceList,
    ResourceItem,
    Avatar,
    Spinner,
    Banner,
} from "@shopify/polaris";
import {
    CheckCircleIcon,
    ClockIcon,
    AlertCircleIcon,
    CheckIcon,
    PlayIcon,
    PackageIcon,
    ArrowRightIcon,
    PlusIcon,
    XCircleIcon,
    AlertDiamondIcon,
} from "@shopify/polaris-icons";

export default function JobShow({ job: initialJob }) {
    const [job, setJob] = useState(initialJob);
    const [logs, setLogs] = useState([]);
    const [filter, setFilter] = useState("all");
    const [elapsedTime, setElapsedTime] = useState(0);
    const [loading, setLoading] = useState(false);

    // Polling for progress updates
    useEffect(() => {
        if (!["completed", "failed"].includes(job.status)) {
            setLoading(true);
            const interval = setInterval(async () => {
                try {
                    const res = await fetch(`/jobs/${job.id}/progress`);
                    if (!res.ok) throw new Error("Network error");
                    const data = await res.json();
                    setJob((prev) => ({ ...prev, ...data }));

                    if (
                        data.status === "completed" ||
                        data.status === "failed"
                    ) {
                        clearInterval(interval);
                        setLoading(false);
                        fetchLogs();
                    }
                } catch (err) {
                    console.error("Progress poll failed:", err);
                }
            }, 1500);

            return () => clearInterval(interval);
        }
    }, [job.id, job.status]);

    // Track elapsed time
    useEffect(() => {
        if (job.started_at && !["completed", "failed"].includes(job.status)) {
            const interval = setInterval(() => {
                const start = new Date(job.started_at);
                const now = new Date();
                const diff = Math.floor((now - start) / 1000);
                setElapsedTime(diff);
            }, 1000);

            return () => clearInterval(interval);
        } else if (job.started_at && job.finished_at) {
            const start = new Date(job.started_at);
            const end = new Date(job.finished_at);
            setElapsedTime(Math.floor((end - start) / 1000));
        }
    }, [job.started_at, job.finished_at, job.status]);

    // Fetch logs
    const fetchLogs = () => {
        const logs = [
            {
                type: "success",
                title: "Job Started",
                message: "SKU generation job initialized",
                time: "Just now",
            },
            {
                type: "info",
                title: "Batch Prepared",
                message: `${job.total || 0} variants loaded for processing`,
                time: "3s ago",
            },
            {
                type: "success",
                title: "Processing",
                message: `${job.processed || 0} / ${
                    job.total || 0
                } variants processed`,
                time: "2s ago",
            },
            {
                type: job.status === "completed" ? "success" : "warning",
                title:
                    job.status === "completed" ? "Job Completed" : "Processing",
                message:
                    job.status === "completed"
                        ? "All changes synced to Shopify successfully"
                        : "Still processing variants...",
                time: "Just now",
            },
        ];
        setLogs(logs);
    };

    const isDone = ["completed", "failed"].includes(job.status);
    const progress = job.progress_percentage || 0;
    const processed = job.processed_items || 0;
    const total = job.total_items || 0;
    const failed = job.failed_items || 0;

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) return `${hrs}h ${mins}m`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    };

    const successRate = total > 0 ? ((processed - failed) / total) * 100 : 0;

    return (
        <Page
            title={`Job #${job.id} – SKU Generation`}
            backUrl="/sku-generator"
            primaryAction={{
                content: "← Back to Generator",
                onAction: () => (window.location.href = "/sku-generator"),
            }}
            secondaryActions={[
                {
                    content: isDone ? "New Job" : "Cancel",
                    destructive: !isDone,
                    onAction: () =>
                        isDone
                            ? (window.location.href = "/sku-generator")
                            : null,
                },
            ]}
        >
            <Layout>
                {/* Main Content */}
                <Layout.Section>
                    {/* Status Banner */}
                    {isDone && (
                        <Box paddingBlockEnd="600">
                            <Banner
                                title={
                                    job.status === "completed"
                                        ? "✓ Completed Successfully"
                                        : "✕ Job Failed"
                                }
                                tone={
                                    job.status === "completed"
                                        ? "success"
                                        : "critical"
                                }
                            >
                                <BlockStack gap="200">
                                    <Text>
                                        {job.status === "completed"
                                            ? `All ${total} variants were processed successfully and synced to Shopify.`
                                            : job.error_message ||
                                              "An error occurred during processing."}
                                    </Text>
                                    {job.status === "failed" && (
                                        <Text tone="subdued" size="sm">
                                            {processed} items were processed
                                            before the error occurred.
                                        </Text>
                                    )}
                                </BlockStack>
                            </Banner>
                        </Box>
                    )}

                    {/* Loading State */}
                    {!isDone && job.status === "running" && (
                        <Box paddingBlockEnd="600">
                            <Card
                                background="bg-surface-info-subdued"
                                roundedAbove="sm"
                            >
                                <InlineStack
                                    gap="300"
                                    blockAlign="center"
                                    wrap={false}
                                >
                                    <Spinner
                                        size="small"
                                        accessibilityLabel="Loading"
                                    />
                                    <BlockStack gap="100">
                                        <Text fontWeight="semibold">
                                            Processing in Progress
                                        </Text>
                                        <Text tone="subdued" size="sm">
                                            Updates every 1.5 seconds
                                        </Text>
                                    </BlockStack>
                                </InlineStack>
                            </Card>
                        </Box>
                    )}

                    {/* Stats Grid */}
                    <Box paddingBlockEnd="600">
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(280px, 1fr))",
                                gap: "16px",
                                marginBottom: "24px",
                            }}
                        >
                            {/* Overall Progress */}
                            <Card
                                background="bg-surface-secondary"
                                roundedAbove="sm"
                            >
                                <BlockStack gap="500">
                                    <BlockStack gap="200">
                                        <Text
                                            variant="headingSm"
                                            fontWeight="semibold"
                                            tone="subdued"
                                        >
                                            OVERALL PROGRESS
                                        </Text>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "16px",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    position: "relative",
                                                    width: 80,
                                                    height: 80,
                                                    borderRadius: "50%",
                                                    background:
                                                        "linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    border: "3px solid #2196F3",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        width: 74,
                                                        height: 74,
                                                        borderRadius: "50%",
                                                        background: `conic-gradient(#2196F3 0deg ${
                                                            (progress / 100) *
                                                            360
                                                        }deg, #e3f2fd ${
                                                            (progress / 100) *
                                                            360
                                                        }deg 360deg)`,
                                                        opacity: 0.2,
                                                    }}
                                                />
                                                <Text
                                                    variant="headingLg"
                                                    fontWeight="bold"
                                                    style={{
                                                        fontSize: "24px",
                                                        color: "#1976D2",
                                                    }}
                                                >
                                                    {progress}%
                                                </Text>
                                            </div>
                                            <BlockStack gap="100">
                                                <Text
                                                    variant="headingMd"
                                                    fontWeight="bold"
                                                >
                                                    {processed} / {total}
                                                </Text>
                                                <Text tone="subdued" size="sm">
                                                    Variants Processed
                                                </Text>
                                                <InlineStack gap="100">
                                                    <Badge tone="success">
                                                        {processed - failed}
                                                    </Badge>
                                                    {failed > 0 && (
                                                        <Badge tone="warning">
                                                            {failed} Failed
                                                        </Badge>
                                                    )}
                                                </InlineStack>
                                            </BlockStack>
                                        </div>
                                    </BlockStack>
                                    <ProgressBar
                                        progress={progress}
                                        tone={
                                            job.status === "failed"
                                                ? "critical"
                                                : "success"
                                        }
                                    />
                                </BlockStack>
                            </Card>

                            {/* Timing Stats */}
                            <Card background="bg-surface-secondary">
                                <BlockStack gap="300">
                                    <Text
                                        variant="headingSm"
                                        fontWeight="semibold"
                                        tone="subdued"
                                    >
                                        TIMING
                                    </Text>
                                    <InlineStack gap="400" blockAlign="center">
                                        <Icon
                                            source={ClockIcon}
                                            tone="base"
                                            accessibilityLabel="Clock"
                                        />
                                        <BlockStack gap="100">
                                            <Text
                                                variant="headingMd"
                                                fontWeight="bold"
                                            >
                                                {formatTime(elapsedTime)}
                                            </Text>
                                            <Text tone="subdued" size="sm">
                                                {isDone ? "Total" : "Elapsed"}{" "}
                                                Time
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                    <Divider />
                                    <Text tone="subdued" size="sm">
                                        Started:{" "}
                                        {job.started_at
                                            ? new Date(
                                                  job.started_at
                                              ).toLocaleTimeString()
                                            : "—"}
                                    </Text>
                                    {isDone && (
                                        <Text tone="subdued" size="sm">
                                            Finished:{" "}
                                            {job.finished_at
                                                ? new Date(
                                                      job.finished_at
                                                  ).toLocaleTimeString()
                                                : "—"}
                                        </Text>
                                    )}
                                </BlockStack>
                            </Card>

                            {/* Success Rate */}
                            <Card background="bg-surface-secondary">
                                <BlockStack gap="300">
                                    <Text
                                        variant="headingSm"
                                        fontWeight="semibold"
                                        tone="subdued"
                                    >
                                        SUCCESS RATE
                                    </Text>
                                    <InlineStack gap="400" blockAlign="center">
                                        <Icon
                                            source={CheckCircleIcon}
                                            tone="success"
                                            accessibilityLabel="Check"
                                        />
                                        <BlockStack gap="100">
                                            <Text
                                                variant="headingMd"
                                                fontWeight="bold"
                                            >
                                                {successRate.toFixed(1)}%
                                            </Text>
                                            <Text tone="subdued" size="sm">
                                                Successful Variants
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                    <Divider />
                                    <InlineStack gap="300" blockAlign="center">
                                        <Badge tone="success">
                                            {processed - failed} OK
                                        </Badge>
                                        {failed > 0 && (
                                            <Badge tone="critical">
                                                {failed} Error
                                            </Badge>
                                        )}
                                    </InlineStack>
                                </BlockStack>
                            </Card>

                            {/* Status */}
                            <Card background="bg-surface-secondary">
                                <BlockStack gap="300">
                                    <Text
                                        variant="headingSm"
                                        fontWeight="semibold"
                                        tone="subdued"
                                    >
                                        JOB STATUS
                                    </Text>
                                    <InlineStack gap="400" blockAlign="center">
                                        <Icon
                                            source={
                                                job.status === "completed"
                                                    ? CheckCircleIcon
                                                    : job.status === "failed"
                                                    ? XCircleIcon
                                                    : job.status === "running"
                                                    ? PlayIcon
                                                    : AlertDiamondIcon
                                            }
                                            tone={
                                                job.status === "completed"
                                                    ? "success"
                                                    : job.status === "failed"
                                                    ? "critical"
                                                    : "info"
                                            }
                                            accessibilityLabel="Status"
                                        />
                                        <BlockStack gap="100">
                                            <Text
                                                variant="headingMd"
                                                fontWeight="bold"
                                                tone={
                                                    job.status === "completed"
                                                        ? "success"
                                                        : job.status ===
                                                          "failed"
                                                        ? "critical"
                                                        : "info"
                                                }
                                            >
                                                {job.status
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    job.status.slice(1)}
                                            </Text>
                                            <Text tone="subdued" size="sm">
                                                Current state
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                </BlockStack>
                            </Card>
                        </div>
                    </Box>

                    {/* Data Migration Section */}
                    <Card
                        title="SKU Generation Details"
                        sectioned
                        roundedAbove="sm"
                    >
                        <BlockStack gap="600">
                            <InlineStack
                                align="space-between"
                                blockAlign="center"
                            >
                                <InlineStack gap="400" blockAlign="center">
                                    <Icon
                                        source={PackageIcon}
                                        tone="base"
                                        accessibilityLabel="Package"
                                    />
                                    <BlockStack gap="100">
                                        <Text
                                            variant="headingMd"
                                            fontWeight="semibold"
                                        >
                                            Variants Processing
                                        </Text>
                                        <Text tone="subdued" size="sm">
                                            Real-time SKU generation tasks
                                        </Text>
                                    </BlockStack>
                                </InlineStack>

                                <InlineStack gap="200" wrap={false}>
                                    <Badge>{total} Total</Badge>
                                    <Badge tone="success">
                                        {processed - failed} OK
                                    </Badge>
                                    {failed > 0 && (
                                        <Badge tone="critical">
                                            {failed} Failed
                                        </Badge>
                                    )}
                                </InlineStack>
                            </InlineStack>

                            <Divider />

                            <Box paddingBlockStart="200">
                                <Card
                                    background="bg-surface-success-subdued"
                                    roundedAbove="sm"
                                >
                                    <BlockStack gap="400">
                                        <InlineStack
                                            gap="400"
                                            blockAlign="center"
                                        >
                                            <Icon
                                                source={PackageIcon}
                                                tone="success"
                                                accessibilityLabel="Package"
                                            />
                                            <BlockStack gap="100">
                                                <Text fontWeight="semibold">
                                                    SKU Assignments
                                                </Text>
                                                <Text tone="subdued" size="sm">
                                                    Automated SKU generation for
                                                    product variants
                                                </Text>
                                            </BlockStack>
                                        </InlineStack>
                                        <ProgressBar
                                            progress={progress}
                                            tone={
                                                job.status === "failed"
                                                    ? "critical"
                                                    : "success"
                                            }
                                            size="sm"
                                        />
                                        <InlineStack
                                            align="space-between"
                                            blockAlign="center"
                                        >
                                            <Text
                                                tone="subdued"
                                                size="sm"
                                                fontWeight="medium"
                                            >
                                                {processed} / {total} Variants
                                            </Text>
                                            <Badge
                                                tone={
                                                    progress === 100
                                                        ? "success"
                                                        : "info"
                                                }
                                            >
                                                {progress === 100
                                                    ? "Complete"
                                                    : `${progress}% Complete`}
                                            </Badge>
                                        </InlineStack>
                                    </BlockStack>
                                </Card>
                            </Box>
                        </BlockStack>
                    </Card>
                </Layout.Section>

                {/* Live Activity Sidebar */}
                <Layout.Section variant="oneThird">
                    <Card title="Live Activity" roundedAbove="sm">
                        <BlockStack gap="400">
                            <Text tone="subdued" size="sm">
                                Real-time job updates
                            </Text>

                            <InlineStack gap="200">
                                <Badge
                                    tone={filter === "all" ? "info" : undefined}
                                    onClick={() => setFilter("all")}
                                    role="button"
                                    style={{ cursor: "pointer" }}
                                >
                                    All
                                </Badge>
                                <Badge
                                    tone={
                                        filter === "success"
                                            ? "success"
                                            : undefined
                                    }
                                    onClick={() => setFilter("success")}
                                    role="button"
                                    style={{ cursor: "pointer" }}
                                >
                                    Success
                                </Badge>
                                <Badge
                                    tone={
                                        filter === "warning"
                                            ? "warning"
                                            : undefined
                                    }
                                    onClick={() => setFilter("warning")}
                                    role="button"
                                    style={{ cursor: "pointer" }}
                                >
                                    Warnings
                                </Badge>
                            </InlineStack>

                            <Divider />

                            <ResourceList
                                items={logs.filter(
                                    (l) => filter === "all" || l.type === filter
                                )}
                                renderItem={(item) => (
                                    <ResourceItem
                                        id={item.title}
                                        media={
                                            <Avatar
                                                size="sm"
                                                initials={
                                                    item.type === "success"
                                                        ? "✓"
                                                        : "i"
                                                }
                                                background={
                                                    item.type === "success"
                                                        ? "#34C759"
                                                        : "#007AFF"
                                                }
                                                color={
                                                    item.type === "success"
                                                        ? "base"
                                                        : "base"
                                                }
                                            />
                                        }
                                    >
                                        <BlockStack gap="100">
                                            <InlineStack gap="300">
                                                <Text fontWeight="semibold">
                                                    {item.title}
                                                </Text>
                                                <Text tone="subdued" size="sm">
                                                    {item.time}
                                                </Text>
                                            </InlineStack>
                                            <Text tone="subdued" size="sm">
                                                {item.message}
                                            </Text>
                                        </BlockStack>
                                    </ResourceItem>
                                )}
                            />
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
