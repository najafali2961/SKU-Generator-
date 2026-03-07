import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
    Box,
    Text,
    InlineStack,
    BlockStack,
    Banner,
    Icon,
    TextField,
    Tooltip,
    Card,
} from "@shopify/polaris";
import { StarIcon, StarFilledIcon, InfoIcon } from "@shopify/polaris-icons";
import { Modal as ABModal, TitleBar } from "@shopify/app-bridge-react";

function FeedbackModal({ open, onClose, openSupport = false }) {
    const [mode, setMode] = useState("review");
    const [showSupport, setShowSupport] = useState(false);
    const [skipFeedbackHide, setSkipFeedbackHide] = useState(false);
    const appImageSrc =
        "https://cdn.shopify.com/s/files/1/0718/7723/0786/files/SKU.png?v=1772877734";
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [supportText, setSupportText] = useState("");
    const [sendingReview, setSendingReview] = useState(false);
    const [sendingSupport, setSendingSupport] = useState(false);
    const [errorReview, setErrorReview] = useState("");
    const [errorSupport, setErrorSupport] = useState("");

    const plan =
        typeof window !== "undefined" && window.shopifyContext?.plan_name
            ? String(window.shopifyContext.plan_name)
            : "";
    const isDevStore =
        plan.toLowerCase() === "developer preview" ||
        plan.toLowerCase() === "affiliate";
    const storeEmail =
        typeof window !== "undefined" && window.shopifyContext?.email
            ? String(window.shopifyContext.email)
            : "your email";

    useEffect(() => {
        if (!open) {
            setRating(0);
            setMode("review");
            setSupportText("");
        }
    }, [open]);

    useEffect(() => {
        window.__acc_open_support = () => {
            const feedbackEl = document.getElementById("feedback-modal");
            setSkipFeedbackHide(true);
            if (feedbackEl && feedbackEl.hide) feedbackEl.hide();
            setTimeout(() => setShowSupport(true), 150);
        };
        window.__acc_review_submit = async () => {
            if (sendingReview) return;
            if (rating === 0) return;
            try {
                setErrorReview("");
                setSendingReview(true);
                await window.axios.post("/feedback", {
                    rating,
                    message: reviewText,
                });
                if (window.shopify?.toast?.show) {
                    window.shopify.toast.show("Thank you for your feedback!");
                }
                const el = document.getElementById("feedback-modal");
                if (el && el.hide) el.hide();
                onClose();
            } catch {
                setErrorReview("Failed to submit review. Please try again.");
                if (window.shopify?.toast?.show) {
                    window.shopify.toast.show("Failed to send feedback", {
                        isError: true,
                    });
                }
            } finally {
                setSendingReview(false);
            }
        };
        window.__acc_support_send = async () => {
            if (sendingSupport) return;
            if (supportText.length < 30) return;
            try {
                setErrorSupport("");
                setSendingSupport(true);
                await window.axios.post("/feedback", {
                    message: supportText,
                    rating: 1,
                });
                const el = document.getElementById("support-modal");
                if (el && el.hide) el.hide();
                setShowSupport(false);
                if (window.shopify?.toast?.show) {
                    window.shopify.toast.show("Message sent successfully!");
                }
                setTimeout(() => {
                    if (typeof window.__acc_on_support_done === "function") {
                        window.__acc_on_support_done();
                    }
                    onClose();
                }, 150);
            } catch {
                setErrorSupport("Failed to send message. Please try again.");
            } finally {
                setSendingSupport(false);
            }
        };
        return () => {
            delete window.__acc_open_support;
            delete window.__acc_review_submit;
            delete window.__acc_support_send;
        };
    }, [
        mode,
        rating,
        reviewText,
        supportText,
        showSupport,
        sendingReview,
        sendingSupport,
    ]);

    useEffect(() => {
        if (openSupport) {
            setShowSupport(true);
        }
    }, [openSupport]);

    return (
        <div className={`${onClose ? "hidden" : "block"}`}>
            <Card>
                <ABModal
                    id="feedback-modal"
                    open={open && !showSupport}
                    onHide={() => {
                        if (skipFeedbackHide) {
                            setSkipFeedbackHide(false);
                            return;
                        }
                        onClose && onClose();
                        setTimeout(() => {
                            if (
                                typeof window.__acc_on_feedback_done ===
                                "function"
                            ) {
                                window.__acc_on_feedback_done();
                            }
                        }, 100);
                    }}
                    variant="base"
                >
                    <TitleBar
                        title={
                            mode === "review" ? "Review this app" : "Support"
                        }
                        dangerouslySetInnerHTML={{
                            __html:
                                mode === "review"
                                    ? `<button variant="primary" ${rating === 0 || sendingReview ? "disabled" : ""} onclick="window.__acc_review_submit()">Submit</button>`
                                    : `<button variant="primary" ${supportText.length < 30 || sendingSupport ? "disabled" : ""} onclick="window.__acc_support_send()">Send</button>`,
                        }}
                    />
                    <Box padding="400">
                        {mode === "review" ? (
                            <BlockStack gap="300">
                                {errorReview && (
                                    <Box>
                                        <Banner tone="critical">
                                            <Text as="p">{errorReview}</Text>
                                        </Banner>
                                    </Box>
                                )}
                                {isDevStore && (
                                    <Box>
                                        <Banner tone="info">
                                            <Text as="p">
                                                Development stores aren’t
                                                eligible to review apps. This is
                                                for testing purposes only.
                                            </Text>
                                        </Banner>
                                    </Box>
                                )}

                                <Box style={{ marginTop: "6px" }}>
                                    <InlineStack align="start" gap="300">
                                        <Box
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 8,
                                                overflow: "hidden",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <img
                                                src={appImageSrc}
                                                alt="App"
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                }}
                                            />
                                        </Box>
                                        <BlockStack gap="100">
                                            <Text as="h6" variant="headingXs">
                                                How would you rate Airo SKU &
                                                Barcode Generator?
                                            </Text>
                                            <InlineStack>
                                                {[...Array(5)].map((_, i) => (
                                                    <Box
                                                        key={i}
                                                        width="20px"
                                                        height="20px"
                                                        onClick={() =>
                                                            setRating(i + 1)
                                                        }
                                                        style={{
                                                            cursor: "pointer",
                                                            marginRight: "1px",
                                                        }}
                                                    >
                                                        <Icon
                                                            source={
                                                                i < rating
                                                                    ? StarFilledIcon
                                                                    : StarIcon
                                                            }
                                                            tone={
                                                                i < rating
                                                                    ? "base"
                                                                    : "subdued"
                                                            }
                                                            style={
                                                                i < rating
                                                                    ? {
                                                                          color: "#000000",
                                                                      }
                                                                    : undefined
                                                            }
                                                        />
                                                    </Box>
                                                ))}
                                            </InlineStack>
                                        </BlockStack>
                                    </InlineStack>
                                </Box>

                                <BlockStack gap="100">
                                    <Text as="p" variant="bodyMd">
                                        Describe your experience (optional)
                                    </Text>
                                    <Box className="acc-modal-textarea">
                                        <textarea
                                            placeholder="What should other merchants know about this app?"
                                            value={reviewText}
                                            onChange={(e) =>
                                                setReviewText(e.target.value)
                                            }
                                            autoComplete="off"
                                            style={{
                                                height: "130px",
                                                borderRadius: "8px",
                                                width: "100%",
                                                border: "1px solid darkgray",
                                                fontSize: "13px",
                                                background: "#fdfdfd",
                                                resize: "none",
                                                padding: "10px",
                                            }}
                                        ></textarea>
                                    </Box>
                                </BlockStack>

                                <InlineStack align="start" gap="100">
                                    <Box style={{ paddingTop: "1px" }}>
                                        <Text
                                            as="p"
                                            tone="subdued"
                                            variant="bodySm"
                                        >
                                            If your review is published on the
                                            Shopify App Store, we'll include
                                            some details about your store.
                                        </Text>
                                    </Box>
                                    <Tooltip
                                        content="Learn more"
                                        preferredPosition="above"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                window.open(
                                                    "https://help.shopify.com/en/manual/apps/choosing-apps#app-reviews",
                                                    "_blank",
                                                )
                                            }
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                padding: 0,
                                                cursor: "pointer",
                                            }}
                                            aria-label="Learn more about app reviews"
                                        >
                                            <Icon
                                                source={InfoIcon}
                                                tone="subdued"
                                            />
                                        </button>
                                    </Tooltip>
                                </InlineStack>
                            </BlockStack>
                        ) : (
                            <BlockStack gap="100">
                                <Text as="p" variant="bodyMd">
                                    Send a message to the developer.
                                </Text>
                                <Box
                                    position="relative"
                                    className="acc-modal-textarea"
                                >
                                    <TextField
                                        label=""
                                        labelHidden
                                        placeholder="Minimum 30 characters"
                                        value={supportText}
                                        onChange={setSupportText}
                                        multiline={4}
                                        autoComplete="off"
                                    />
                                    <Box
                                        style={{
                                            position: "absolute",
                                            right: 12,
                                            bottom: 12,
                                            pointerEvents: "none",
                                            userSelect: "none",
                                            zIndex: 9999,
                                        }}
                                    >
                                        <Text
                                            as="p"
                                            tone="subdued"
                                            variant="bodySm"
                                        >
                                            {supportText.length}
                                        </Text>
                                    </Box>
                                </Box>
                                <Text as="p" variant="bodyMd">
                                    Replies will be sent to {storeEmail}.
                                </Text>
                            </BlockStack>
                        )}
                    </Box>
                </ABModal>

                <ABModal
                    id="support-modal"
                    open={showSupport}
                    onHide={() => {
                        setShowSupport(false);
                        onClose && onClose();
                        setTimeout(() => {
                            if (
                                typeof window.__acc_on_support_done ===
                                "function"
                            ) {
                                window.__acc_on_support_done();
                            }
                        }, 100);
                    }}
                    variant="base"
                >
                    <TitleBar
                        title="Support"
                        dangerouslySetInnerHTML={{
                            __html: `<button variant="primary" ${supportText.length < 30 || sendingSupport ? "disabled" : ""} onclick="window.__acc_support_send()">Send</button>`,
                        }}
                    />
                    <Box padding="400">
                        <BlockStack gap="00">
                            {errorSupport && (
                                <Box style={{ marginBottom: "6px" }}>
                                    <Banner tone="critical">
                                        <Text as="p">{errorSupport}</Text>
                                    </Banner>
                                </Box>
                            )}
                            <Box style={{ marginBottom: "3px" }}>
                                <Text as="p" variant="bodyMd">
                                    Send a message to the developer.
                                </Text>
                            </Box>
                            <Box
                                position="relative"
                                className="acc-modal-textarea"
                            >
                                <textarea
                                    placeholder="Minimum 30 characters"
                                    value={supportText}
                                    onChange={(e) =>
                                        setSupportText(e.target.value)
                                    }
                                    autoComplete="off"
                                    style={{
                                        height: "90px",
                                        borderRadius: "8px",
                                        width: "100%",
                                        border: "1px solid darkgray",
                                        fontSize: "13px",
                                        background: "#fdfdfd",
                                        resize: "none",
                                        padding: "10px",
                                    }}
                                ></textarea>
                                <Box
                                    style={{
                                        position: "absolute",
                                        right: 12,
                                        bottom: 12,
                                        pointerEvents: "none",
                                        userSelect: "none",
                                        zIndex: 9999,
                                    }}
                                >
                                    <Text
                                        as="p"
                                        tone="subdued"
                                        variant="bodySm"
                                    >
                                        {supportText.length}
                                    </Text>
                                </Box>
                            </Box>
                            <Box>
                                <Text as="p" variant="bodyMd">
                                    Replies will be sent to {storeEmail}.
                                </Text>
                            </Box>
                        </BlockStack>
                    </Box>
                </ABModal>
            </Card>
        </div>
    );
}

FeedbackModal.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    openSupport: PropTypes.bool,
};

export default FeedbackModal;
