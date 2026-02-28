import React from "react";
import {
    Page,
    Layout,
    Card,
    Text,
    BlockStack,
    InlineGrid,
    InlineStack,
    Box,
    Button,
    Badge,
    Icon,
    Modal,
    TextField,
    FormLayout,
} from "@shopify/polaris";
import {
    CreditCardIcon,
    MagicIcon,
    ProductIcon,
    StoreIcon,
    BarcodeIcon,
    ArrowRightIcon,
    LabelPrinterIcon,
    StarIcon,
    StarFilledIcon,
    XIcon,
} from "@shopify/polaris-icons";
import { Link, useForm } from "@inertiajs/react";
import { useState, useCallback } from "react";
import RecentJobsTable from "./RecentJobsTable";
import CreditsSpeedometerCard from "./CreditsSpeedometerCard";

const styles = `
    .airo-hero {
        background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #6366f1 100%);
        border-radius: 12px;
        padding: 24px 28px;
        color: #fff;
        position: relative;
        overflow: hidden;
    }
    .airo-hero::before {
        content: '';
        position: absolute;
        top: -40%;
        right: -15%;
        width: 250px;
        height: 250px;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
    }
    .airo-feedback-btn {
        background: rgba(255,255,255,0.15);
        color: #fff;
        border: 1.5px solid rgba(255,255,255,0.4);
        border-radius: 8px;
        padding: 6px 16px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }
    .airo-feedback-btn:hover {
        background: rgba(255,255,255,0.25);
        border-color: #fff;
    }
    .airo-card-white {
        background: #fff;
        border: 1px solid #ebebeb;
        border-radius: 12px;
        padding: 24px;
        color: #202223;
        transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .airo-action-card {
        cursor: pointer;
    }
    .airo-action-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px -8px rgba(0,0,0,0.1);
        border-color: #c4b5fd;
    }
    .airo-icon-circle {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f3f0ff;
        color: #7c3aed;
        flex-shrink: 0;
    }
    .airo-action-btn {
        background: transparent;
        color: #005bd3;
        border: none;
        padding: 0;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: color 0.15s;
    }
    .airo-action-btn:hover {
        color: #004299;
        text-decoration: underline;
    }
    .airo-giveaway {
        background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
        border: none;
        border-radius: 12px;
        padding: 20px 24px;
        color: #fff;
        height: 100%;
        width: 100%;
        display: flex;
        align-items: center;
        position: relative;
        overflow: hidden;
        box-shadow: 0 4px 15px -3px rgba(168, 85, 247, 0.4);
    }
    .airo-close-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 10;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 50%;
        width: 26px;
        height: 26px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        transition: background 0.2s, transform 0.2s;
    }
    .airo-close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.05);
    }
    .airo-claim-btn {
        background: #fff;
        color: #7c3aed;
        border: none;
        border-radius: 8px;
        padding: 8px 18px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: transform 0.2s, box-shadow 0.2s;
        flex-shrink: 0;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .airo-claim-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 8px -2px rgba(0,0,0,0.15);
    }
    .airo-top-grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    .airo-top-grid > div { display: flex; flex-direction: column; width: 100%; }
    .airo-star {
        cursor: pointer;
        transition: transform 0.12s;
    }
    .airo-star:hover {
        transform: scale(1.15);
    }
`;

export default function Home({
    stats = {},
    credits = {},
    recentJobs = [],
    has_claimed_giveaway = false,
}) {
    const data = {
        total_variants: stats.total_variants || 0,
        variants_missing_sku: stats.variants_missing_sku || 0,
        variants_missing_barcode: stats.variants_missing_barcode || 0,
        active_stores: stats.active_stores || 1,
    };

    const missingSkuPercent =
        data.total_variants > 0
            ? Math.round(
                  (data.variants_missing_sku / data.total_variants) * 100,
              )
            : 0;

    const missingBarcodePercent =
        data.total_variants > 0
            ? Math.round(
                  (data.variants_missing_barcode / data.total_variants) * 100,
              )
            : 0;

    const getBadgeProps = (count, percent) => {
        if (count === 0)
            return {
                tone: "success",
                progress: "complete",
                children: "All good",
            };
        if (percent <= 30)
            return {
                tone: "warning",
                progress: "partiallyComplete",
                children: "Action needed",
            };
        return {
            tone: "critical",
            progress: "partiallyComplete",
            children: "Fix required",
        };
    };

    const [isGiveawayDismissed, setIsGiveawayDismissed] = useState(false);
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

    const {
        data: feedbackData,
        setData: setFeedbackData,
        post: postFeedback,
        processing: feedbackProcessing,
        reset: resetFeedback,
    } = useForm({
        rating: 0,
        message: "",
    });

    const handleBadFeedback = useCallback(() => {
        setFeedbackModalOpen(true);
    }, []);

    const submitBadFeedback = useCallback(() => {
        postFeedback("/feedback", {
            onSuccess: () => {
                setFeedbackModalOpen(false);
                resetFeedback();
                shopify.toast.show("Thank you for your feedback!");
            },
            onError: () => {
                shopify.toast.show("Failed to send feedback", {
                    isError: true,
                });
            },
        });
    }, [postFeedback, resetFeedback]);

    return (
        <Page>
            <style>{styles}</style>
            <BlockStack gap="500">
                {/* ── Hero Banner ── */}
                <div className="airo-hero">
                    <div style={{ position: "relative", zIndex: 1 }}>
                        <InlineStack
                            align="space-between"
                            blockAlign="center"
                            wrap
                        >
                            <BlockStack gap="100">
                                <Text
                                    as="h1"
                                    variant="headingXl"
                                    fontWeight="bold"
                                >
                                    <span>Airo SKU & Barcode Generator</span>
                                </Text>
                                <Text as="p" variant="bodyMd">
                                    <span
                                        style={{
                                            color: "rgba(255,255,255,0.85)",
                                        }}
                                    >
                                        Fix missing SKUs & barcodes in seconds •
                                        Trusted by{" "}
                                        {data.active_stores.toLocaleString()}00+
                                        stores
                                    </span>
                                </Text>
                            </BlockStack>
                            <BlockStack gap="100">
                                <Text as="p" variant="bodySm">
                                    <span
                                        style={{
                                            color: "rgba(255,255,255,0.65)",
                                        }}
                                    >
                                        Share your feedback
                                    </span>
                                </Text>
                                <InlineStack gap="200">
                                    <button
                                        className="airo-feedback-btn"
                                        onClick={() =>
                                            window.open(
                                                "https://apps.shopify.com/airo-sku-barcode-generator#modal-show=ReviewListingModal",
                                                "_blank",
                                            )
                                        }
                                    >
                                        😄 Good
                                    </button>
                                    <button
                                        className="airo-feedback-btn"
                                        onClick={handleBadFeedback}
                                    >
                                        😥 Bad
                                    </button>
                                </InlineStack>
                            </BlockStack>
                        </InlineStack>
                    </div>
                </div>

                {/* ── Feedback Modal ── */}
                <Modal
                    open={feedbackModalOpen}
                    onClose={() => setFeedbackModalOpen(false)}
                    title="Review this app"
                    primaryAction={{
                        content: "Submit",
                        onAction: submitBadFeedback,
                        loading: feedbackProcessing,
                    }}
                    secondaryActions={[
                        {
                            content: "Cancel",
                            onAction: () => setFeedbackModalOpen(false),
                        },
                    ]}
                >
                    <Modal.Section>
                        <FormLayout>
                            <InlineStack gap="200">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <span
                                        key={star}
                                        className="airo-star"
                                        onClick={() =>
                                            setFeedbackData("rating", star)
                                        }
                                        style={{
                                            width: 32,
                                            height: 32,
                                            display: "inline-flex",
                                            color: "#7c3aed",
                                        }}
                                    >
                                        <Icon
                                            source={
                                                feedbackData.rating >= star
                                                    ? StarFilledIcon
                                                    : StarIcon
                                            }
                                        />
                                    </span>
                                ))}
                            </InlineStack>
                            <TextField
                                label="Your feedback"
                                value={feedbackData.message}
                                onChange={(value) =>
                                    setFeedbackData("message", value)
                                }
                                multiline={4}
                                autoComplete="off"
                                placeholder="What should other merchants know about this app?"
                            />
                            <Text as="p" variant="bodySm" tone="subdued">
                                If your review is published, we'll include some
                                details about your store.{" "}
                                <Link
                                    href="https://help.shopify.com"
                                    target="_blank"
                                >
                                    Learn more
                                </Link>
                            </Text>
                        </FormLayout>
                    </Modal.Section>
                </Modal>

                {/* ── Credits Speedometer ── */}
                <div className="airo-top-grid">
                    <div style={{ display: "flex", flex: 1 }}>
                        <CreditsSpeedometerCard credits={credits} />
                    </div>
                    <div style={{ display: "flex", flex: 1 }}>
                        {/* ── Giveaway Banner ── */}
                        {!isGiveawayDismissed && !has_claimed_giveaway ? (
                            <div className="airo-giveaway">
                                <div className="airo-shimmer-overlay">
                                    <div className="airo-shimmer-bar" />
                                </div>
                                <button
                                    className="airo-close-btn"
                                    onClick={() => setIsGiveawayDismissed(true)}
                                >
                                    <Icon source={XIcon} />
                                </button>
                                <div
                                    style={{
                                        position: "relative",
                                        zIndex: 1,
                                        width: "100%",
                                        paddingRight: "36px",
                                    }}
                                >
                                    <InlineStack
                                        align="space-between"
                                        blockAlign="center"
                                        wrap={false}
                                    >
                                        <InlineStack
                                            gap="400"
                                            blockAlign="center"
                                        >
                                            <span
                                                style={{
                                                    fontSize: 36,
                                                    animation:
                                                        "airo-float 3s ease-in-out infinite",
                                                }}
                                            >
                                                🎁
                                            </span>
                                            <BlockStack gap="050">
                                                <InlineStack
                                                    gap="100"
                                                    blockAlign="center"
                                                >
                                                    <Text
                                                        as="p"
                                                        variant="headingSm"
                                                        fontWeight="bold"
                                                    >
                                                        <span
                                                            style={{
                                                                fontSize: 12,
                                                            }}
                                                        >
                                                            ✨
                                                        </span>
                                                        <span
                                                            style={{
                                                                color: "#fff",
                                                            }}
                                                        >
                                                            Special Giveaway
                                                        </span>
                                                    </Text>
                                                </InlineStack>
                                                <Text as="p" variant="bodySm">
                                                    <span
                                                        style={{
                                                            color: "rgba(255,255,255,0.8)",
                                                        }}
                                                    >
                                                        Chat with our support
                                                        team to claim yours
                                                        instantly.
                                                    </span>
                                                </Text>
                                            </BlockStack>
                                        </InlineStack>
                                        <button
                                            className="airo-claim-btn"
                                            onClick={() => {
                                                if (window.$crisp) {
                                                    window.$crisp.push([
                                                        "do",
                                                        "chat:open",
                                                    ]);
                                                    window.$crisp.push([
                                                        "do",
                                                        "message:send",
                                                        [
                                                            "text",
                                                            "Hello! I am here to claim my free giveaway credits for my store! 🎁",
                                                        ],
                                                    ]);
                                                } else {
                                                    window.open(
                                                        "mailto:support@airoapps.com?subject=Giveaway Credits Claim",
                                                        "_blank",
                                                    );
                                                }
                                            }}
                                        >
                                            Chat to Claim
                                            <Icon source={ArrowRightIcon} />
                                        </button>
                                    </InlineStack>
                                </div>
                            </div>
                        ) : (
                            <div />
                        )}
                    </div>
                </div>

                {/* ── Stats Grid ── */}
                <InlineGrid columns={3} gap="400">
                    <div className="airo-card-white">
                        <InlineStack gap="300" blockAlign="center">
                            <div className="airo-icon-circle">
                                <Icon source={ProductIcon} />
                            </div>
                            <BlockStack gap="050">
                                <Text
                                    as="p"
                                    variant="headingLg"
                                    fontWeight="bold"
                                >
                                    <span>
                                        {data.total_variants.toLocaleString()}
                                    </span>
                                </Text>
                                <Text as="p" variant="bodySm">
                                    <span
                                        style={{
                                            color: "#9ca3af",
                                        }}
                                    >
                                        Total Variants
                                    </span>
                                </Text>
                            </BlockStack>
                        </InlineStack>
                    </div>

                    <div className="airo-card-white">
                        <InlineStack gap="300" blockAlign="center">
                            <div className="airo-icon-circle">
                                <Icon source={CreditCardIcon} />
                            </div>
                            <BlockStack gap="050">
                                <InlineStack gap="200" blockAlign="center">
                                    <Text
                                        as="p"
                                        variant="headingLg"
                                        fontWeight="bold"
                                    >
                                        <span>
                                            {data.variants_missing_sku.toLocaleString()}
                                        </span>
                                    </Text>
                                    <Badge
                                        {...getBadgeProps(
                                            data.variants_missing_sku,
                                            missingSkuPercent,
                                        )}
                                    />
                                </InlineStack>
                                <Text as="p" variant="bodySm">
                                    <span
                                        style={{
                                            color: "#9ca3af",
                                        }}
                                    >
                                        Missing SKUs
                                    </span>
                                </Text>
                            </BlockStack>
                        </InlineStack>
                    </div>

                    <div className="airo-card-white">
                        <InlineStack gap="300" blockAlign="center">
                            <div className="airo-icon-circle">
                                <Icon source={BarcodeIcon} />
                            </div>
                            <BlockStack gap="050">
                                <InlineStack gap="200" blockAlign="center">
                                    <Text
                                        as="p"
                                        variant="headingLg"
                                        fontWeight="bold"
                                    >
                                        <span>
                                            {data.variants_missing_barcode.toLocaleString()}
                                        </span>
                                    </Text>
                                    <Badge
                                        {...getBadgeProps(
                                            data.variants_missing_barcode,
                                            missingBarcodePercent,
                                        )}
                                    />
                                </InlineStack>
                                <Text as="p" variant="bodySm">
                                    <span
                                        style={{
                                            color: "#9ca3af",
                                        }}
                                    >
                                        Missing Barcodes
                                    </span>
                                </Text>
                            </BlockStack>
                        </InlineStack>
                    </div>
                </InlineGrid>
                <InlineGrid columns={3} gap="400">
                    <div className="airo-card-white airo-action-card">
                        <BlockStack gap="300">
                            <InlineStack gap="300" blockAlign="center">
                                <div className="airo-icon-circle">
                                    <Icon source={MagicIcon} />
                                </div>
                                <BlockStack gap="050">
                                    <Text
                                        as="p"
                                        variant="headingSm"
                                        fontWeight="semibold"
                                    >
                                        <span>Generate SKUs</span>
                                    </Text>
                                    <Text as="p" variant="bodySm">
                                        <span
                                            style={{
                                                color: "#9ca3af",
                                            }}
                                        >
                                            Auto-fill missing SKUs instantly
                                        </span>
                                    </Text>
                                </BlockStack>
                            </InlineStack>
                            <InlineStack align="start" blockAlign="center">
                                <Link href="/sku-generator">
                                    <button className="airo-action-btn">
                                        Fix{" "}
                                        {data.variants_missing_sku.toLocaleString()}{" "}
                                        SKUs
                                        <Icon source={ArrowRightIcon} />
                                    </button>
                                </Link>
                            </InlineStack>
                        </BlockStack>
                    </div>

                    <div className="airo-card-white airo-action-card">
                        <BlockStack gap="300">
                            <InlineStack gap="300" blockAlign="center">
                                <div className="airo-icon-circle">
                                    <Icon source={BarcodeIcon} />
                                </div>
                                <BlockStack gap="050">
                                    <Text
                                        as="p"
                                        variant="headingSm"
                                        fontWeight="semibold"
                                    >
                                        <span>Generate Barcodes</span>
                                    </Text>
                                    <Text as="p" variant="bodySm">
                                        <span
                                            style={{
                                                color: "#9ca3af",
                                            }}
                                        >
                                            Instant barcode creation
                                        </span>
                                    </Text>
                                </BlockStack>
                            </InlineStack>
                            <InlineStack align="start" blockAlign="center">
                                <Link href="/barcode-generator">
                                    <button className="airo-action-btn">
                                        Fix{" "}
                                        {data.variants_missing_barcode.toLocaleString()}{" "}
                                        barcodes
                                        <Icon source={ArrowRightIcon} />
                                    </button>
                                </Link>
                            </InlineStack>
                        </BlockStack>
                    </div>

                    <div className="airo-card-white airo-action-card">
                        <BlockStack gap="300">
                            <InlineStack gap="300" blockAlign="center">
                                <div className="airo-icon-circle">
                                    <Icon source={LabelPrinterIcon} />
                                </div>
                                <BlockStack gap="050">
                                    <Text
                                        as="p"
                                        variant="headingSm"
                                        fontWeight="semibold"
                                    >
                                        <span>Print Labels</span>
                                    </Text>
                                    <Text as="p" variant="bodySm">
                                        <span
                                            style={{
                                                color: "#9ca3af",
                                            }}
                                        >
                                            QR codes & barcode labels
                                        </span>
                                    </Text>
                                </BlockStack>
                            </InlineStack>
                            <InlineStack align="start" blockAlign="center">
                                <Link href="/barcode-printer">
                                    <button className="airo-action-btn">
                                        Start printing
                                        <Icon source={ArrowRightIcon} />
                                    </button>
                                </Link>
                            </InlineStack>
                        </BlockStack>
                    </div>
                </InlineGrid>

                {/* ── Recent Jobs ── */}
                <RecentJobsTable recentJobs={recentJobs} />
            </BlockStack>
        </Page>
    );
}
