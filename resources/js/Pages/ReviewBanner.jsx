import { useState, useEffect, lazy, Suspense } from "react";
import PropTypes from "prop-types";
import { ThumbsUp, ThumbsDown, X as IconX, Megaphone } from "lucide-react";
import { usePage } from "@inertiajs/react";

const FeedbackModal = lazy(() => import("./FeedbackModal.jsx"));

function ReviewBanner({ onHide }) {
    const [showModal, setShowModal] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const { url } = usePage();

    useEffect(() => {
        const handleNavigation = () => setShowActions(false);
        document.addEventListener("inertia:start", handleNavigation);
        return () => {
            document.removeEventListener("inertia:start", handleNavigation);
        };
    }, []);

    if (url.toLowerCase().includes("/pricing")) return null;

    return (
        <div
            className="fixed hidden sm:block"
            style={{
                bottom: 10,
                right: 24,
                zIndex: 9999999,
            }}
        >
            <div className="group relative rounded-full shadow-sm transition-all duration-200 select-none overflow-visible">
                <div
                    className="relative flex items-center justify-between gap-3 rounded-full pl-5 pr-5 py-3 text-white backdrop-blur-md backdrop-saturate-150 overflow-visible"
                    style={{
                        contentVisibility: "auto",
                        containIntrinsicSize: "40px 320px",
                        contain: "content",
                        backgroundColor: "#000000",
                        backgroundImage:
                            "radial-gradient(circle at center, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.10) 55%, rgba(255,255,255,0) 100%), radial-gradient(rgba(255,255,255,0.12) 1.4px, rgba(255,255,255,0) 1.4px)",
                        backgroundPosition: "center, 0 0",
                        backgroundRepeat: "no-repeat, repeat",
                        backgroundSize: "140% 140%, 18px 18px",
                    }}
                >
                    <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => setShowActions((v) => !v)}
                        aria-expanded={showActions ? "true" : "false"}
                        aria-label="Give feedback"
                        title="Give feedback"
                    >
                        <Megaphone
                            size={16}
                            className="text-white opacity-95"
                            aria-hidden="true"
                        />
                        <span className="text-white text-[14px] font-medium">
                            Give feedback
                        </span>
                    </div>
                    <div
                        className={`flex items-center gap-3 transition-all duration-300 ease-out ${showActions ? "opacity-100 translate-x-0 max-w-[240px]" : "opacity-0 translate-x-3 max-w-0"} overflow-hidden`}
                        style={{ pointerEvents: showActions ? "auto" : "none" }}
                    >
                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-2 justify-center px-4 h-9 rounded-full bg-white hover:text-white hover:bg-[#892727] active:bg-neutral-950 text-black  ring-white/25 hover:ring-white/40 transition-all  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                            aria-label="Bad"
                            title="Bad"
                        >
                            <ThumbsDown size={15} />
                            <span className="text-[13px] font-medium">Bad</span>
                        </button>
                        <button
                            onClick={async () => {
                                window.open(
                                    "https://apps.shopify.com/airo-sku-barcode-generator#modal-show=ReviewListingModal",
                                    "_blank",
                                );
                                try {
                                    await window.axios.post(
                                        "/mark-review-done",
                                    );
                                } catch (e) {
                                    console.error(e);
                                }
                                onHide && onHide();
                            }}
                            className="inline-flex items-center gap-2 justify-center px-4 h-9 rounded-full bg-[#3f8e3f] hover:text-black hover:bg-neutral-100 active:bg-neutral-200 text-white shadow-sm transition-all hover:shadow-md ring-1 ring-black/20 hover:ring-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black/40"
                            aria-label="Good"
                            title="Good"
                        >
                            <ThumbsUp size={15} />
                            <span className="text-[13px] font-medium">
                                Good
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            {showModal && (
                <Suspense fallback={null}>
                    <FeedbackModal
                        open={showModal}
                        onClose={() => setShowModal(false)}
                    />
                </Suspense>
            )}
        </div>
    );
}

export default ReviewBanner;

ReviewBanner.propTypes = {
    onHide: PropTypes.func,
};
