import React, { useState, useEffect, useRef, useCallback } from "react";
import { router } from "@inertiajs/react";
import axios from "axios";

/**
 * Live product-sync progress widget.
 *
 * This component renders nothing inline — it's triggered from elsewhere (a
 * "Sync products" button in the page header) via the `start-product-sync`
 * window event, which callers fire through {@link triggerProductSync}. While a
 * sync runs it shows a floating widget bottom-left: a full progress card that
 * can be minimized to a compact animated circle (progress ring + spinning icon)
 * or dismissed (sync keeps running in the background). Minimized/dismissed
 * state persists across page changes.
 */

const SYNC_EVENT = "start-product-sync";

/** Fire from anywhere (e.g. a header button) to kick off a product sync. */
export const triggerProductSync = () =>
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));

// Inline design tokens (this app has no shared theme module).
const T = {
    purple: "#6E40E6",
    purpleStrong: "#5A2EDC",
    purpleHover: "#8B6CF6",
    purpleSoft: "#EFEAFE",
    surface: "#ffffff",
    surfaceSubdued: "#FAFAFB",
    border: "#E6E6EB",
    textSubdued: "#6B7280",
    radiusSm: "8px",
    radiusMd: "12px",
    shadowMd: "0 4px 12px rgba(16,24,40,.10)",
    shadowLg: "0 12px 30px rgba(16,24,40,.16)",
};

const RING_R = 25;
const RING_C = 2 * Math.PI * RING_R;

const LS_MIN = "syncWidgetMinimized";
const LS_DISMISS = "syncWidgetDismissed";

const readLS = (key) => {
    try {
        return localStorage.getItem(key) === "true";
    } catch {
        return false;
    }
};
const writeLS = (key, val) => {
    try {
        if (val) localStorage.setItem(key, "true");
        else localStorage.removeItem(key);
    } catch {
        /* ignore */
    }
};

const KEYFRAMES = `
@keyframes syncw-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes syncw-indeterminate{0%{left:-40%}60%{left:100%}100%{left:100%}}
@keyframes syncw-shimmer{0%{transform:translateX(-150%)}100%{transform:translateX(350%)}}
.syncw-icon-spin{animation:syncw-spin 2s linear infinite;transform-origin:center}
.syncw-min-btn{transition:transform .2s ease,box-shadow .2s ease}
.syncw-min-btn:hover{transform:scale(1.06)}
.syncw-iconbtn{background:none;border:none;padding:6px;border-radius:8px;cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;transition:background .15s}
.syncw-iconbtn:hover{background:#F1F1F4}
.syncw-shimmer{position:absolute;top:0;bottom:0;left:0;width:35%;
  background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.55) 50%,rgba(255,255,255,0) 100%);
  animation:syncw-shimmer 1.8s linear infinite}
@media (prefers-reduced-motion:reduce){
  .syncw-icon-spin,.syncw-shimmer{animation:none!important}
  .syncw-shimmer{display:none}
}
`;

function SyncSvg({ size = 18, color = T.purple }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
        </svg>
    );
}

export default function SyncProducts() {
    const [status, setStatus] = useState(null);
    const [starting, setStarting] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [justFinished, setJustFinished] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => readLS(LS_MIN));
    const [dismissed, setDismissed] = useState(() => readLS(LS_DISMISS));
    const pollRef = useRef(null);
    const finishTimerRef = useRef(null);
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

    const handleFinished = useCallback(() => {
        // Sync just finished — refresh dashboard counts.
        router.reload({ only: ["stats", "recentJobs"] });
        writeLS(LS_MIN, false);
        setIsMinimized(false);
        // Briefly show a "complete" state (unless the user had dismissed it).
        setDismissed((wasDismissed) => {
            if (!wasDismissed) {
                setJustFinished(true);
                if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
                finishTimerRef.current = setTimeout(() => {
                    setJustFinished(false);
                }, 2500);
            }
            writeLS(LS_DISMISS, false);
            return false;
        });
    }, []);

    const startPolling = useCallback(() => {
        stopPolling();
        pollRef.current = setInterval(async () => {
            const data = await fetchStatus();
            setIsStarting(false);
            if (data && !data.running) {
                stopPolling();
                if (wasRunningRef.current) handleFinished();
                wasRunningRef.current = false;
            } else if (data && data.running) {
                wasRunningRef.current = true;
            }
        }, 2000);
    }, [fetchStatus, stopPolling, handleFinished]);

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
            if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
        };
    }, [fetchStatus, startPolling, stopPolling]);

    const handleSync = useCallback(async () => {
        setStarting(true);
        setIsStarting(true);
        setJustFinished(false);
        setDismissed(false);
        writeLS(LS_DISMISS, false);
        setIsMinimized(false);
        writeLS(LS_MIN, false);
        try {
            const { data } = await axios.post("/sync/products");
            setStatus(data);
            wasRunningRef.current = true;
            startPolling();
        } catch (e) {
            setIsStarting(false);
            // Leave previous status visible on failure.
        } finally {
            setStarting(false);
        }
    }, [startPolling]);

    const minimize = () => {
        setIsMinimized(true);
        writeLS(LS_MIN, true);
    };
    const expand = () => {
        setIsMinimized(false);
        writeLS(LS_MIN, false);
    };
    const dismiss = () => {
        // Hide the widget but keep the sync running in the background.
        setDismissed(true);
        writeLS(LS_DISMISS, true);
    };

    const running = !!status?.running;

    // Listen for the global trigger fired by the header "Sync products" button.
    useEffect(() => {
        const onTrigger = () => {
            if (!running && !starting) handleSync();
        };
        window.addEventListener(SYNC_EVENT, onTrigger);
        return () => window.removeEventListener(SYNC_EVENT, onTrigger);
    }, [handleSync, running, starting]);

    const total = status?.total ?? 0;
    const processed = status?.processed ?? 0;
    const rawPercent =
        status?.percent ?? (total > 0 ? Math.round((processed / total) * 100) : 0);
    const finishedFailed = justFinished && status?.status === "failed";
    const finishedOk = justFinished && !finishedFailed;
    const percent = finishedOk
        ? 100
        : Math.min(100, Math.max(0, Math.round(rawPercent)));
    const indeterminate = running && total === 0 && !justFinished && !isStarting;

    const accent = finishedFailed ? "#D92D20" : T.purple;
    const accentSoft = finishedFailed ? "#FDECEA" : T.purpleSoft;

    const showWidget = (running || isStarting || justFinished) && !dismissed;

    const title = isStarting
        ? "Starting sync…"
        : finishedFailed
          ? "Sync failed"
          : finishedOk
            ? "Sync complete"
            : "Syncing products";
    const subtitle = isStarting
        ? "Preparing to sync products…"
        : finishedFailed
          ? "Something went wrong — please try again"
          : finishedOk
            ? "Products are up to date"
            : total > 0
              ? `${processed} of ${total} synced`
              : "Fetching from Shopify…";

    return (
        <>
            {/* Floating progress widget (triggered from the header button) */}
            {showWidget &&
                (isMinimized ? (
                    <div
                        className="syncw-min-btn"
                        onClick={expand}
                        role="button"
                        tabIndex={0}
                        aria-label={`Sync progress ${percent}% — expand`}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") expand();
                        }}
                        style={{
                            position: "fixed",
                            bottom: 20,
                            left: 20,
                            zIndex: 9999,
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            background: T.surface,
                            border: `1px solid ${T.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: T.shadowMd,
                            cursor: "pointer",
                        }}
                    >
                        <div
                            className={finishedFailed ? "" : "syncw-icon-spin"}
                            style={{
                                display: "flex",
                                position: "relative",
                                zIndex: 1,
                            }}
                        >
                            <SyncSvg size={22} color={accent} />
                        </div>
                        <svg
                            viewBox="0 0 56 56"
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: 56,
                                height: 56,
                                transform: "rotate(-90deg)",
                                pointerEvents: "none",
                            }}
                        >
                            <circle
                                cx="28"
                                cy="28"
                                r={RING_R}
                                fill="none"
                                stroke={accentSoft}
                                strokeWidth="3"
                            />
                            <circle
                                cx="28"
                                cy="28"
                                r={RING_R}
                                fill="none"
                                stroke={accent}
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={RING_C}
                                strokeDashoffset={RING_C * (1 - percent / 100)}
                                style={{ transition: "stroke-dashoffset .3s ease" }}
                            />
                        </svg>
                    </div>
                ) : (
                    <div
                        style={{
                            position: "fixed",
                            bottom: 20,
                            left: 20,
                            zIndex: 9999,
                            width: 340,
                            maxWidth: "calc(100vw - 40px)",
                            background: T.surface,
                            borderRadius: T.radiusMd,
                            boxShadow: T.shadowLg,
                            border: `1px solid ${T.border}`,
                        }}
                    >
                        <div style={{ padding: 16 }}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        minWidth: 0,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: T.radiusMd,
                                            background: accentSoft,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <span
                                            className={
                                                justFinished
                                                    ? ""
                                                    : "syncw-icon-spin"
                                            }
                                            style={{ display: "flex" }}
                                        >
                                            <SyncSvg size={18} color={accent} />
                                        </span>
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: 14,
                                                fontWeight: 600,
                                                color: "#1A1A1F",
                                                lineHeight: 1.25,
                                            }}
                                        >
                                            {title}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: T.textSubdued,
                                                lineHeight: 1.3,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {subtitle}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", flexShrink: 0 }}>
                                    <button
                                        type="button"
                                        className="syncw-iconbtn"
                                        onClick={minimize}
                                        aria-label="Minimize"
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke={T.textSubdued}
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        >
                                            <path d="M19 12H5" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        className="syncw-iconbtn"
                                        onClick={dismiss}
                                        aria-label="Close"
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke={T.textSubdued}
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        >
                                            <path d="M18 6 6 18M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div
                                style={{
                                    marginTop: 12,
                                    padding: "10px 14px",
                                    borderRadius: T.radiusSm,
                                    background: T.surfaceSubdued,
                                    border: `1px solid ${T.border}`,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: 8,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 12.5,
                                            color: T.textSubdued,
                                            fontWeight: 500,
                                        }}
                                    >
                                        Progress
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: accent,
                                            background: accentSoft,
                                            borderRadius: 999,
                                            padding: "2px 9px",
                                        }}
                                    >
                                        {finishedFailed
                                            ? "Failed"
                                            : total > 0 || justFinished
                                              ? `${percent}%`
                                              : `${processed} synced`}
                                    </span>
                                </div>

                                <div
                                    style={{
                                        height: 8,
                                        width: "100%",
                                        borderRadius: 999,
                                        overflow: "hidden",
                                        background: accentSoft,
                                        position: "relative",
                                    }}
                                >
                                    {indeterminate ? (
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                left: 0,
                                                height: "100%",
                                                width: "40%",
                                                background: `linear-gradient(90deg, ${T.purple} 0%, ${T.purpleHover} 100%)`,
                                                borderRadius: 999,
                                                animation:
                                                    "syncw-indeterminate 1.4s ease-in-out infinite",
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                position: "relative",
                                                height: "100%",
                                                width: `${percent}%`,
                                                background: finishedFailed
                                                    ? accent
                                                    : `linear-gradient(90deg, ${T.purpleStrong} 0%, ${T.purple} 100%)`,
                                                borderRadius: 999,
                                                transition: "width 300ms ease",
                                                overflow: "hidden",
                                            }}
                                        >
                                            {!justFinished && (
                                                <span className="syncw-shimmer" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div
                                    style={{
                                        minHeight: 16,
                                        marginTop: 6,
                                        textAlign: "center",
                                        opacity:
                                            total > 0 &&
                                            processed < total &&
                                            !justFinished
                                                ? 1
                                                : 0,
                                        transition: "opacity .3s ease",
                                        fontSize: 11.5,
                                        color: T.textSubdued,
                                    }}
                                >
                                    {Math.max(0, total - processed)} remaining
                                </div>
                            </div>

                            <div
                                style={{
                                    marginTop: 10,
                                    textAlign: "center",
                                    fontSize: 11.5,
                                    color: T.textSubdued,
                                }}
                            >
                                You can leave this page — sync continues in the
                                background.
                            </div>
                        </div>
                    </div>
                ))}

            <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
        </>
    );
}
