import { useEffect, useState } from "react";
import {
    Page,
    Layout,
    Card,
    Text,
    ProgressBar,
    InlineStack,
    BlockStack,
    Box,
    Divider,
    Icon,
    ResourceList,
    ResourceItem,
    Spinner,
    Banner,
    Badge,
    Button,
} from "@shopify/polaris";
import {
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon,
    PlayIcon,
    AlertDiamondIcon,
    PackageIcon,
    ArrowLeftIcon,
    HomeIcon,
} from "@shopify/polaris-icons";

// SAFE NAVIGATION — NO APP-BRIDGE NEEDED!
const useAppNavigate = () => {
    return (path) => {
        const params = new URLSearchParams(window.location.search);
        const shop = params.get("shop");
        const host = params.get("host");

        if (shop && host) {
            // Proper Shopify embedded app navigation
            window.location.href = `/?shop=${shop}&host=${host}&target=${encodeURIComponent(
                path
            )}`;
        } else {
            // Fallback
            window.location.href = path;
        }
    };
};

export default function JobShow({ job: initialJob }) {
    const navigate = useAppNavigate();
    const [job, setJob] = useState(initialJob);
    const [logs, setLogs] = useState([]);
    const [filter, setFilter] = useState("all");
    const [elapsedTime, setElapsedTime] = useState(0);

    const isDone = ["completed", "failed"].includes(job.status);
    const progress = job.progress_percentage || 0;
    const processed = job.processed_items || 0;
    const total = job.total_items || 0;
    const failed = job.failed_items || 0;

    const formatRelativeTime = (timeString) => {
        if (!timeString) return "Just now";
        if (
            typeof timeString === "string" &&
            (timeString.includes("ago") ||
                timeString.includes("from now") ||
                timeString.includes("Just now"))
        ) {
            return timeString;
        }
        const past = new Date(timeString);
        if (isNaN(past)) return timeString;
        const now = new Date();
        const secondsAgo = Math.floor((now - past) / 1000);
        if (secondsAgo < 60) return `${secondsAgo}s ago`;
        if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
        if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
        return past.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const successRate = total > 0 ? ((processed - failed) / total) * 100 : 0;

    useEffect(() => {
        if (initialJob.activityLogs?.length > 0) {
            const formatted = initialJob.activityLogs
                .map((log) => ({
                    type: log.level,
                    title: log.title,
                    message: log.message || null,
                    time: log.logged_at,
                }))
                .reverse();
            setLogs(formatted);
        }
    }, []);

    useEffect(() => {
        if (isDone) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/jobs/${job.id}/progress`);
                if (!res.ok) return;
                const data = await res.json();

                setJob((prev) => ({ ...prev, ...data }));

                if (data.logs?.length > 0) {
                    const newLogs = data.logs.map((log) => ({
                        type: log.type || log.level,
                        title: log.title,
                        message: log.message || null,
                        time: log.time || log.logged_at,
                    }));

                    setLogs((prev) => {
                        const existing = new Set(
                            prev.map((l) => `${l.title}-${l.time}`)
                        );
                        const filtered = newLogs.filter(
                            (l) => !existing.has(`${l.title}-${l.time}`)
                        );
                        return [...prev, ...filtered].slice(-300);
                    });
                }

                if (data.status === "completed" || data.status === "failed") {
                    clearInterval(interval);
                }
            } catch (err) {
                console.error("Polling failed:", err);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [job.id, isDone]);

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

    const filteredLogs = logs.filter((log) => {
        if (filter === "all") return true;
        const logType = (log.type || log.level || "info").toLowerCase();
        return logType === filter;
    });

    return (
        <Page
            title={`Job #${job.id}`}
            secondaryActions={[
                {
                    content: "Home",
                    icon: HomeIcon,
                    onAction: () => navigate("/"),
                },
            ]}
        >
            <Layout>
                <Layout.Section>
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
                            </Banner>
                        </Box>
                    )}

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

                    <Box paddingBlockEnd="600">
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(280px, 1fr))",
                                gap: "16px",
                            }}
                        >
                            <Card background="bg-surface-secondary">
                                <BlockStack gap="500">
                                    <Text
                                        variant="headingSm"
                                        tone="subdued"
                                        fontWeight="semibold"
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
                                </BlockStack>
                            </Card>

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

                    <Card title="Job Details" sectioned>
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
                                            Real-time Job Progress
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
                                            Assignments
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

                <Layout.Section variant="oneThird">
                    <Card title="Live Activity" roundedAbove="sm">
                        <BlockStack gap="400">
                            <Text tone="subdued" size="small">
                                Real-time job updates
                            </Text>

                            <InlineStack gap="40">
                                {[
                                    "all",
                                    "success",
                                    "info",
                                    "warning",
                                    "error",
                                ].map((type) => {
                                    const isActive = filter === type;
                                    const toneMap = {
                                        all: "info",
                                        success: "success",
                                        info: "info",
                                        warning: "warning",
                                        error: "critical",
                                    };
                                    const tone = toneMap[type];

                                    return (
                                        <div
                                            key={type}
                                            onClick={() => setFilter(type)}
                                            style={{
                                                padding: "2px 8px",
                                                borderRadius: "12px",
                                                backgroundColor: isActive
                                                    ? `var(--p-color-bg-${tone}-subdued)`
                                                    : "transparent",
                                                border: isActive
                                                    ? `1px solid var(--p-color-border-${tone})`
                                                    : "1px solid transparent",
                                                cursor: "pointer",
                                                transition: "all 0.15s ease",
                                            }}
                                            onMouseEnter={(e) =>
                                                !isActive &&
                                                (e.currentTarget.style.backgroundColor =
                                                    "var(--p-color-bg-surface-hover)")
                                            }
                                            onMouseLeave={(e) =>
                                                !isActive &&
                                                (e.currentTarget.style.backgroundColor =
                                                    "transparent")
                                            }
                                        >
                                            <Text
                                                fontWeight={
                                                    isActive
                                                        ? "semibold"
                                                        : "medium"
                                                }
                                                tone={
                                                    isActive ? tone : "subdued"
                                                }
                                                size="small"
                                            >
                                                {type.charAt(0).toUpperCase() +
                                                    type.slice(1)}
                                            </Text>
                                        </div>
                                    );
                                })}
                            </InlineStack>

                            <Divider />

                            <div
                                style={{ maxHeight: "65vh", overflowY: "auto" }}
                            >
                                <ResourceList
                                    items={filteredLogs}
                                    renderItem={(item) => {
                                        const logType = (
                                            item.type ||
                                            item.level ||
                                            "info"
                                        ).toLowerCase();
                                        const iconConfig = {
                                            success: {
                                                source: CheckCircleIcon,
                                                tone: "success",
                                            },
                                            error: {
                                                source: XCircleIcon,
                                                tone: "critical",
                                            },
                                            warning: {
                                                source: AlertDiamondIcon,
                                                tone: "warning",
                                            },
                                            info: {
                                                source: PlayIcon,
                                                tone: "info",
                                            },
                                        };
                                        const config =
                                            iconConfig[logType] ||
                                            iconConfig.info;

                                        return (
                                            <ResourceItem
                                                id={`${item.title}-${item.time}`}
                                                media={
                                                    <Icon
                                                        source={config.source}
                                                        tone={config.tone}
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
                                                            {formatRelativeTime(
                                                                item.time
                                                            )}
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
