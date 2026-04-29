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
import ReviewBanner from "./ReviewBanner";

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
        background: #0d0d0f;
        border: 1px solid #1f1f23;
        border-radius: 16px;
        padding: 24px 32px;
        color: #fff;
        height: auto;
        width: 100%;
        display: flex;
        align-items: center;
        gap: 32px;
        position: relative;
        overflow: hidden;
        box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6);
    }
    .airo-giveaway::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 15% 50%, rgba(124, 58, 237, 0.15) 0%, transparent 60%);
        pointer-events: none;
    }
    .airo-giveaway-icon-container {
        width: 80px;
        height: 80px;
        border-radius: 20px;
        background: rgba(124, 58, 237, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        position: relative;
        border: 1px solid rgba(124, 58, 237, 0.2);
        animation: airo-float 4s ease-in-out infinite;
    }
    .airo-giveaway-icon-container::after {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        background: #7c3aed;
        filter: blur(25px);
        opacity: 0.2;
        border-radius: 50%;
        z-index: -1;
    }
    .airo-giveaway-icon-svg {
        width: 40px;
        height: 40px;
        color: #7c3aed;
        filter: drop-shadow(0 0 10px rgba(124, 58, 237, 0.5));
    }
    @keyframes airo-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
    }
    .airo-giveaway-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        z-index: 1;
    }
    .airo-badge-limited {
        background: rgba(124, 58, 237, 0.2);
        color: #c4b5fd;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        gap: 4px;
        width: fit-content;
        border: 1px solid rgba(124, 58, 237, 0.3);
        margin-bottom: 4px;
        letter-spacing: 0.5px;
    }
    .airo-giveaway-title {
        font-size: 34px;
        font-weight: 800;
        color: #fff;
        margin: 0;
        line-height: 1;
        letter-spacing: -0.8px;
    }
    .airo-giveaway-title span {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-left: 8px;
    }
    .airo-giveaway-subtitle {
        color: #94a3b8;
        font-size: 14px;
        max-width: 400px;
        margin-top: 4px;
    }
    .airo-giveaway-subtitle b {
        color: #7c3aed;
        font-weight: 600;
    }
    .airo-trust-badges {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-top: 16px;
    }
    .airo-trust-item {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #64748b;
        font-size: 12px;
        font-weight: 600;
    }
    .airo-trust-icon {
        width: 16px;
        height: 16px;
        color: #7c3aed;
        flex-shrink: 0;
    }
    .airo-cta-group {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        z-index: 1;
    }
    .airo-claim-btn {
        background: #7c3aed;
        color: #fff;
        border: none;
        border-radius: 12px;
        padding: 14px 28px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 8px 20px rgba(124, 58, 237, 0.4);
    }
    .airo-claim-btn:hover {
        background: #6d28d9;
        transform: translateY(-3px) scale(1.02);
        box-shadow: 0 12px 25px rgba(124, 58, 237, 0.5);
    }
    .airo-winners {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .airo-avatars {
        display: flex;
        margin-right: -4px;
    }
    .airo-avatar {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 2px solid #0d0d0f;
        margin-left: -10px;
        background: #1f1f23;
        object-fit: cover;
    }
    .airo-avatar:first-child {
        margin-left: 0;
    }
    .airo-winners-text {
        font-size: 11px;
        color: #475569;
        font-weight: 500;
    }
    .airo-close-btn {
        position: absolute;
        top: 20px;
        right: 20px;
        z-index: 10;
        background: rgba(255, 255, 255, 0.05);
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
        transition: all 0.2s;
    }
    .airo-close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        transform: rotate(90deg);
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

    return (
        <Page>
            <style>{styles}</style>
            <BlockStack gap="300">
                {/* ── Hero Banner ── */}
                {/* <div className="airo-hero">
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
                        </InlineStack>
                    </div>
                </div> */}

                {/* ── Credits Speedometer ── */}
                <div className="airo-top-grid">
                    <div style={{ display: "flex", flex: 1 }}>
                        {/* ── Giveaway Banner ── */}
                        {!isGiveawayDismissed && !has_claimed_giveaway ? (
                            <div className="airo-giveaway">
                                <button
                                    className="airo-close-btn"
                                    onClick={() => setIsGiveawayDismissed(true)}
                                >
                                    <Icon source={XIcon} />
                                </button>
                                
                                <div className="airo-giveaway-icon-container">
                                    <svg className="airo-giveaway-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 12 20 22 4 22 4 12"></polyline>
                                        <rect x="2" y="7" width="20" height="5"></rect>
                                        <line x1="12" y1="22" x2="12" y2="7"></line>
                                        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                                        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                                    </svg>
                                </div>

                                <div className="airo-giveaway-content">
                                    <div className="airo-badge-limited">
                                        ✨ Limited Time
                                    </div>
                                    <h2 className="airo-giveaway-title">
                                        Exclusive <span>Giveaway</span>
                                    </h2>
                                    <p className="airo-giveaway-subtitle">
                                        Chat with our support team to claim your reward <b>instantly</b>.
                                    </p>
                                    
                                    <div className="airo-trust-badges">
                                        <div className="airo-trust-item">
                                            <svg className="airo-trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                            100% Secure
                                        </div>
                                        <div className="airo-trust-item">
                                            <svg className="airo-trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                                            Instant Claim
                                        </div>
                                        <div className="airo-trust-item">
                                            <svg className="airo-trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                            Trusted Support
                                        </div>
                                    </div>
                                </div>

                                <div className="airo-cta-group">
                                    <button
                                        className="airo-claim-btn"
                                        onClick={() => {
                                            if (window.$crisp) {
                                                window.$crisp.push(["do", "chat:open"]);
                                                window.$crisp.push(["do", "message:send", ["text", "Hi! I’m here to collect my complimentary giveaway credits! 🎊"]]);
                                            } else {
                                                window.open("mailto:sku@airoapps.com?subject=Giveaway Credits Claim", "_blank");
                                            }
                                        }}
                                    >
                                        Chat to Claim Now
                                        <Icon source={ArrowRightIcon} />
                                    </button>
                                    
                                    <div className="airo-winners">
                                        <div className="airo-avatars">
                                            <img src="https://i.pravatar.cc/150?u=11" className="airo-avatar" />
                                            <img src="https://i.pravatar.cc/150?u=22" className="airo-avatar" />
                                            <img src="https://i.pravatar.cc/150?u=33" className="airo-avatar" />
                                            <img src="https://i.pravatar.cc/150?u=44" className="airo-avatar" />
                                        </div>
                                        <span className="airo-winners-text">Join 10,000+ happy winners</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div />
                        )}
                    </div>
                    <div style={{ display: "flex", flex: 1 }}>
                        <CreditsSpeedometerCard credits={credits} />
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
            <ReviewBanner />
        </Page>
    );
}
