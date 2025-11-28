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
    XCircleIcon,
    PlayIcon,
    AlertDiamondIcon,
    PackageIcon,
} from "@shopify/polaris-icons";

export default function JobShow({ job: initialJob }) {
    const [job, setJob] = useState(initialJob);
    const [logs, setLogs] = useState([]);
    const [filter, setFilter] = useState("all");
    const [elapsedTime, setElapsedTime] = useState(0);

    const isDone = ["completed", "failed"].includes(job.status);
    const progress = job.progress_percentage || 0;
    const processed = job.processed_items || 0;
    const total = job.total_items || 0;
    const failed = job.failed_items || 0;

    // Initialize logs from initial data (page load)
    useEffect(() => {
        if (initialJob.activityLogs?.length > 0) {
            const formatted = initialJob.activityLogs
                .map((log) => ({
                    type: log.level,
                    title: log.title,
                    message: log.message || null,
                    time: new Date(log.logged_at).toLocaleTimeString(),
                }))
                .reverse(); // oldest first

            setLogs(formatted);
        }
    }, []);

    // Single polling effect — handles both progress + live logs
    useEffect(() => {
        if (isDone) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/jobs/${job.id}/progress`);
                if (!res.ok) return;

                const data = await res.json();

                // Update job state
                setJob((prev) => ({ ...prev, ...data }));

                // Append new logs (avoid duplicates)
                if (data.logs?.length > 0) {
                    const newLogs = data.logs.map((log) => ({
                        type: log.type,
                        title: log.title,
                        message: log.message || null,
                        time: log.time, // comes from diffForHumans() → "2 seconds ago"
                    }));

                    setLogs((prev) => {
                        const existing = new Set(
                            prev.map((l) => `${l.title}-${l.message}-${l.time}`)
                        );
                        const filtered = newLogs.filter(
                            (l) =>
                                !existing.has(
                                    `${l.title}-${l.message}-${l.time}`
                                )
                        );
                        return [...prev, ...filtered].slice(-300); // limit to last 300
                    });
                }

                // Stop polling when job ends
                if (data.status === "completed" || data.status === "failed") {
                    clearInterval(interval);
                }
            } catch (err) {
                console.error("Polling failed:", err);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [job.id, isDone]);

    // Elapsed time tracker
    useEffect(() => {
        if (!job.started_at) return;

        if (isDone && job.finished_at) {
            const diff = Math.floor(
                (new Date(job.finished_at) - new Date(job.started_at)) / 1000
            );
            setElapsedTime(diff);
            return;
        }

        const interval = setInterval(() => {
            setElapsedTime(
                Math.floor(
                    (Date.now() - new Date(job.started_at).getTime()) / 1000
                )
            );
        }, 1000);

        return () => clearInterval(interval);
    }, [job.started_at, job.finished_at, isDone]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const successRate = total > 0 ? ((processed - failed) / total) * 100 : 0;

    // Avatar + color per log type
    const getLogAvatar = (type) => {
        const styles = {
            success: { bg: "#34C759", char: "Success" },
            info: { bg: "#007AFF", char: "Info" },
            warning: { bg: "#FF9500", char: "Warning" },
            error: { bg: "#FF3B30", char: "Error" },
        };
        const { bg = "#8E8E93", char = "Question" } = styles[type] || {};
        return <Avatar size="sm" initials={char} background={bg} />;
    };

    // CORRECT FILTER — WORKS FOR BOTH .type AND .level
    const filteredLogs = logs.filter((log) => {
        if (filter === "all") return true;
        const logType = log.type || log.level;
        return logType === filter;
    });
    return (
        <Page
            title={`Job #${job.id} – SKU Generation`}
            backUrl="/sku-generator"
            primaryAction={{
                content: "Back to Generator",
                onAction: () => (window.location.href = "/sku-generator"),
            }}
            secondaryActions={[
                {
                    content: isDone ? "New Job" : "Cancel Job",
                    destructive: !isDone,
                    onAction: () =>
                        isDone && (window.location.href = "/sku-generator"),
                },
            ]}
        >
            <Layout>
                {/* Main Content */}
                <Layout.Section>
                    {/* Success / Failure Banner */}
                    {isDone && (
                        <Box paddingBlockEnd="600">
                            <Banner
                                title={
                                    job.status === "completed"
                                        ? "Completed Successfully"
                                        : "Job Failed"
                                }
                                tone={
                                    job.status === "completed"
                                        ? "success"
                                        : "critical"
                                }
                            >
                                <Text>
                                    {job.status === "completed"
                                        ? `All ${total} variants processed and synced to Shopify.`
                                        : job.error_message ||
                                          "An unknown error occurred."}
                                </Text>
                                {job.status === "failed" && processed > 0 && (
                                    <Text tone="subdued" size="small">
                                        {processed} variants were processed
                                        before failure.
                                    </Text>
                                )}
                            </Banner>
                        </Box>
                    )}

                    {/* Live Processing Indicator */}
                    {!isDone && job.status === "running" && (
                        <Box paddingBlockEnd="600">
                            <Card
                                background="bg-surface-info-subdued"
                                roundedAbove="sm"
                            >
                                <InlineStack gap="300" blockAlign="center">
                                    <Spinner size="small" />
                                    <BlockStack gap="100">
                                        <Text fontWeight="semibold">
                                            Processing in Progress
                                        </Text>
                                        <Text tone="subdued" size="small">
                                            Updating every 2 seconds
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
                            }}
                        >
                            {/* Progress Circle */}
                            <Card background="bg-surface-secondary">
                                <BlockStack gap="500">
                                    <Text
                                        variant="headingSm"
                                        fontWeight="semibold"
                                        tone="subdued"
                                    >
                                        OVERALL PROGRESS
                                    </Text>
                                    <InlineStack gap="400" blockAlign="center">
                                        <div
                                            style={{
                                                position: "relative",
                                                width: 80,
                                                height: 80,
                                                borderRadius: "50%",
                                                background:
                                                    "linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%)",
                                                border: "3px solid #2196F3",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    width: 74,
                                                    height: 74,
                                                    borderRadius: "50%",
                                                    background: `conic-gradient(#2196F3 0deg ${
                                                        (progress / 100) * 360
                                                    }deg, #e3f2fd ${
                                                        (progress / 100) * 360
                                                    }deg 360deg)`,
                                                    opacity: 0.2,
                                                }}
                                            />
                                            <Text
                                                variant="headingLg"
                                                fontWeight="bold"
                                                style={{ color: "#1976D2" }}
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
                                            <Text tone="subdued" size="small">
                                                Variants Processed
                                            </Text>
                                            <InlineStack gap="100">
                                                <Badge tone="success">
                                                    {processed - failed} OK
                                                </Badge>
                                                {failed > 0 && (
                                                    <Badge tone="critical">
                                                        {failed} Failed
                                                    </Badge>
                                                )}
                                            </InlineStack>
                                        </BlockStack>
                                    </InlineStack>
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

                            {/* Timing */}
                            <Card background="bg-surface-secondary">
                                <BlockStack gap="300">
                                    <Text
                                        variant="headingSm"
                                        tone="subdued"
                                        fontWeight="semibold"
                                    >
                                        TIMING
                                    </Text>
                                    <InlineStack gap="400" blockAlign="center">
                                        <Icon source={ClockIcon} tone="base" />
                                        <BlockStack gap="100">
                                            <Text
                                                variant="headingMd"
                                                fontWeight="bold"
                                            >
                                                {formatTime(elapsedTime)}
                                            </Text>
                                            <Text tone="subdued" size="small">
                                                {isDone ? "Total" : "Elapsed"}{" "}
                                                Time
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                    <Divider />
                                    <Text tone="subdued" size="small">
                                        Started:{" "}
                                        {job.started_at
                                            ? new Date(
                                                  job.started_at
                                              ).toLocaleTimeString()
                                            : "—"}
                                    </Text>
                                    {isDone && job.finished_at && (
                                        <Text tone="subdued" size="small">
                                            Finished:{" "}
                                            {new Date(
                                                job.finished_at
                                            ).toLocaleTimeString()}
                                        </Text>
                                    )}
                                </BlockStack>
                            </Card>

                            {/* Success Rate */}
                            <Card background="bg-surface-secondary">
                                <BlockStack gap="300">
                                    <Text
                                        variant="headingSm"
                                        tone="subdued"
                                        fontWeight="semibold"
                                    >
                                        SUCCESS RATE
                                    </Text>
                                    <InlineStack gap="400" blockAlign="center">
                                        <Icon
                                            source={CheckCircleIcon}
                                            tone="success"
                                        />
                                        <BlockStack gap="100">
                                            <Text
                                                variant="headingMd"
                                                fontWeight="bold"
                                            >
                                                {successRate.toFixed(1)}%
                                            </Text>
                                            <Text tone="subdued" size="small">
                                                Successful Variants
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                    <Divider />
                                    <InlineStack gap="300">
                                        <Badge tone="success">
                                            {processed - failed} OK
                                        </Badge>
                                        {failed > 0 && (
                                            <Badge tone="critical">
                                                {failed} Errors
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
                                        tone="subdued"
                                        fontWeight="semibold"
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
                                        />
                                        <BlockStack gap="100">
                                            <Text
                                                variant="headingMd"
                                                fontWeight="bold"
                                            >
                                                {job.status
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    job.status.slice(1)}
                                            </Text>
                                            <Text tone="subdued" size="small">
                                                Current state
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>
                                </BlockStack>
                            </Card>
                        </div>
                    </Box>

                    {/* SKU Details Card */}
                    <Card title="SKU Generation Details" sectioned>
                        <BlockStack gap="600">
                            <InlineStack
                                align="space-between"
                                blockAlign="center"
                            >
                                <InlineStack gap="400" blockAlign="center">
                                    <Icon source={PackageIcon} tone="base" />
                                    <BlockStack gap="100">
                                        <Text
                                            variant="headingMd"
                                            fontWeight="semibold"
                                        >
                                            Variants Processing
                                        </Text>
                                        <Text tone="subdued" size="small">
                                            Real-time SKU generation
                                        </Text>
                                    </BlockStack>
                                </InlineStack>
                                <InlineStack gap="200">
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

                            <Card
                                background="bg-surface-success-subdued"
                                roundedAbove="sm"
                            >
                                <BlockStack gap="400">
                                    <InlineStack gap="400" blockAlign="center">
                                        <Icon
                                            source={PackageIcon}
                                            tone="success"
                                        />
                                        <Text fontWeight="semibold">
                                            SKU Assignments
                                        </Text>
                                    </InlineStack>
                                    <ProgressBar
                                        progress={progress}
                                        tone={
                                            job.status === "failed"
                                                ? "critical"
                                                : "success"
                                        }
                                        size="small"
                                    />
                                    <InlineStack align="space-between">
                                        <Text tone="subdued" size="small">
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
                        </BlockStack>
                    </Card>
                </Layout.Section>

                {/* Live Activity Sidebar — NOW FILTER WORKS 100% */}
                <Layout.Section variant="oneThird">
                    <Card title="Live Activity" roundedAbove="sm">
                        <BlockStack gap="400">
                            <Text tone="subdued" size="small">
                                Real-time job updates
                            </Text>

                            {/* Filter Buttons — NOW WORKING */}
                            <InlineStack gap="200">
                                {[
                                    "all",
                                    "success",
                                    "info",
                                    "warning",
                                    "error",
                                ].map((type) => (
                                    <Badge
                                        key={type}
                                        tone={
                                            filter === type
                                                ? type === "all"
                                                    ? "info"
                                                    : type === "error"
                                                    ? "critical"
                                                    : type === "warning"
                                                    ? "warning"
                                                    : type
                                                : undefined
                                        }
                                        onClick={() => setFilter(type)}
                                        role="button"
                                        style={{ cursor: "pointer" }}
                                    >
                                        {type.charAt(0).toUpperCase() +
                                            type.slice(1)}
                                    </Badge>
                                ))}
                            </InlineStack>

                            <Divider />

                            {/* Scrollable logs */}
                            <div
                                style={{ maxHeight: "65vh", overflowY: "auto" }}
                            >
                                <ResourceList
                                    items={filteredLogs}
                                    renderItem={(item) => {
                                        const logType = item.type || item.level; // Support both

                                        let iconSource, iconTone;
                                        if (logType === "success") {
                                            iconSource = CheckCircleIcon;
                                            iconTone = "success";
                                        } else if (logType === "error") {
                                            iconSource = XCircleIcon;
                                            iconTone = "critical";
                                        } else if (logType === "warning") {
                                            iconSource = AlertDiamondIcon;
                                            iconTone = "warning";
                                        } else {
                                            iconSource = PlayIcon;
                                            iconTone = "info";
                                        }

                                        return (
                                            <ResourceItem
                                                id={`${item.title}-${item.time}`}
                                                media={
                                                    <Icon
                                                        source={iconSource}
                                                        tone={iconTone}
                                                    />
                                                }
                                            >
                                                <BlockStack gap="100">
                                                    <InlineStack
                                                        gap="300"
                                                        blockAlign="center"
                                                    >
                                                        <Text
                                                            fontWeight="semibold"
                                                            variation={
                                                                logType ===
                                                                "success"
                                                                    ? "positive"
                                                                    : logType ===
                                                                      "error"
                                                                    ? "negative"
                                                                    : logType ===
                                                                      "warning"
                                                                    ? "warning"
                                                                    : undefined
                                                            }
                                                        >
                                                            {item.title}
                                                        </Text>
                                                        <Text
                                                            tone="subdued"
                                                            size="small"
                                                        >
                                                            {item.time}
                                                        </Text>
                                                    </InlineStack>
                                                    {item.message && (
                                                        <Text
                                                            tone="subdued"
                                                            size="small"
                                                        >
                                                            {item.message}
                                                        </Text>
                                                    )}
                                                </BlockStack>
                                            </ResourceItem>
                                        );
                                    }}
                                />
                            </div>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
