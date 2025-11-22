// resources/js/Pages/components/SkuPreviewTable.jsx
import React from "react";
import {
    Search,
    AlertCircle,
    Box,
    Copy,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Hash,
    Check,
    Sparkles,
} from "lucide-react";

const PAGE_SIZE = 25;

export default function SkuPreviewTable({
    preview,
    total,
    page,
    setPage,
    activeTab,
    setActiveTab,
    selected,
    setSelected,
    loading,
    duplicates,
    duplicateGroups,
    applySKUs,
    applying,
    mediaUrl,
    scrollerRef,
    form,
    handleChange,
}) {
    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="overflow-hidden border shadow-xl bg-white/80 backdrop-blur-xl border-white/30 rounded-xl">
            {/* Fancy Tabs */}
            <div className="flex border-b border-gray-200/70">
                <button
                    onClick={() => {
                        setActiveTab("all");
                        setPage(1);
                    }}
                    className={`flex-1 px-3 py-3 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                        activeTab === "all"
                            ? "text-indigo-600 bg-indigo-50/70 border-b-3 border-indigo-600"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50/70"
                    }`}
                >
                    <Box className="w-3 h-3" />
                    All Products
                    <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-black/10 rounded-full">
                        {total}
                    </span>
                </button>
                <button
                    onClick={() => {
                        setActiveTab("duplicates");
                        setPage(1);
                    }}
                    className={`flex-1 px-3 py-2 text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                        activeTab === "duplicates"
                            ? "text-red-600 bg-red-50/70 border-b-3 border-red-600"
                            : "text-gray-600 hover:text-red-600 hover:bg-red-50/30"
                    }`}
                >
                    <AlertCircle className="w-5 h-5" />
                    Duplicates
                    <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded-full">
                        {duplicates.length}
                    </span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="p-5 border-b bg-gradient-to-r from-indigo-50/50 to-purple-50/30 border-gray-200/50">
                <div className="relative max-w-md mx-auto">
                    <Search className="absolute w-5 h-5 text-gray-500 -translate-y-1/2 left-4 top-1/2" />
                    <input
                        type="text"
                        placeholder="Search products, vendors, SKUs..."
                        value={form.search}
                        onChange={(e) => handleChange("search", e.target.value)}
                        className="w-full pl-12 pr-5 py-2.5 text-xs font-medium bg-white/80 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all"
                    />
                </div>
            </div>

            {/* Scrollable List */}
            <div ref={scrollerRef} className="overflow-y-auto max-h-96">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <Loader2 className="w-12 h-12 mb-4 animate-spin" />
                        <p className="text-xs font-medium">
                            Generating preview...
                        </p>
                    </div>
                ) : activeTab === "duplicates" && duplicates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-emerald-600">
                        <Check className="w-16 h-16 mb-4" />
                        <p className="text-xl font-bold">
                            All SKUs are unique!
                        </p>
                        <p className="flex items-center gap-1 mt-2 text-xs">
                            <Sparkles className="w-5 h-5 text-amber-500" />{" "}
                            Perfect!
                        </p>
                    </div>
                ) : activeTab === "duplicates" ? (
                    /* DUPLICATES VIEW – PREMIUM STYLE */
                    <div className="p-5 space-y-5">
                        {Object.entries(duplicateGroups).map(([sku, items]) => (
                            <div
                                key={sku}
                                className="overflow-hidden border border-red-200 shadow-lg bg-red-50/70 rounded-2xl"
                            >
                                <div className="flex items-center gap-3 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600">
                                    <Hash className="w-5 h-5" />
                                    {sku === "(Blank)" ? "Blank SKU" : sku}
                                    <span className="px-3 py-1 ml-auto text-xs rounded-full bg-white/20">
                                        {items.length} conflicts
                                    </span>
                                </div>

                                <div className="p-4 space-y-3 bg-white/60">
                                    {items.map((p) => (
                                        <div
                                            key={p.id}
                                            className={`flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-white/80 hover:shadow-md ${
                                                selected.has(p.id)
                                                    ? "bg-indigo-50 ring-2 ring-indigo-500"
                                                    : ""
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selected.has(p.id)}
                                                onChange={() =>
                                                    setSelected((s) => {
                                                        const n = new Set(s);
                                                        n.has(p.id)
                                                            ? n.delete(p.id)
                                                            : n.add(p.id);
                                                        return n;
                                                    })
                                                }
                                                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            {mediaUrl(p) ? (
                                                <img
                                                    src={mediaUrl(p)}
                                                    alt=""
                                                    className="object-cover shadow-sm w-14 h-14 rounded-xl"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center bg-gray-100 w-14 h-14 rounded-xl">
                                                    <Box className="w-6 h-8 text-gray-400" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 truncate">
                                                    {p.title}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {p.vendor}
                                                </p>
                                            </div>
                                            <code className="font-mono text-sm font-bold text-red-600">
                                                {p.new_sku}
                                            </code>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-3 p-4 bg-red-100/70">
                                    <button
                                        onClick={() =>
                                            setSelected(
                                                new Set(items.map((i) => i.id))
                                            )
                                        }
                                        className="flex-1 py-2 text-xs font-bold transition-all bg-white shadow-md rounded-xl hover:bg-gray-100 hover:scale-105"
                                    >
                                        Select Group
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelected(
                                                new Set(items.map((i) => i.id))
                                            );
                                            applySKUs("selected");
                                        }}
                                        className="flex-1 py-2 text-xs font-bold text-white transition-all shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl hover:shadow-emerald-500/50 hover:scale-105"
                                    >
                                        Fix This Group
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* NORMAL LIST – CLEAN & MODERN */
                    <div className="divide-y divide-gray-100">
                        {preview.map((p) => {
                            const isSel = selected.has(p.id);
                            return (
                                <div
                                    key={p.id}
                                    className={`flex items-center gap-5 p-5 transition-all hover:bg-gray-50/70 ${
                                        isSel
                                            ? "bg-indigo-50/70 ring-2 ring-indigo-500"
                                            : ""
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSel}
                                        onChange={() =>
                                            setSelected((s) => {
                                                const n = new Set(s);
                                                n.has(p.id)
                                                    ? n.delete(p.id)
                                                    : n.add(p.id);
                                                return n;
                                            })
                                        }
                                        className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    {mediaUrl(p) ? (
                                        <img
                                            src={mediaUrl(p)}
                                            alt=""
                                            className="object-cover w-16 h-16 shadow-md rounded-xl"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl">
                                            <Box className="w-10 h-10 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 truncate">
                                            {p.title}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {p.vendor} • {p.option || "Default"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs tracking-wider text-gray-500 uppercase">
                                            Old
                                        </p>
                                        <code className="font-mono text-xs text-gray-500">
                                            {p.old_sku || "—"}
                                        </code>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs tracking-wider text-gray-500 uppercase">
                                            New
                                        </p>
                                        <code className="font-mono text-lg font-bold text-indigo-600">
                                            {p.new_sku}
                                        </code>
                                    </div>
                                    {p.is_duplicate && (
                                        <div className="px-3 py-2 text-xs font-bold text-red-700 bg-red-100 rounded-full animate-pulse">
                                            DUPLICATE
                                        </div>
                                    )}
                                    <button
                                        onClick={() =>
                                            navigator.clipboard.writeText(
                                                p.new_sku
                                            )
                                        }
                                        className="p-2 text-gray-500 transition-all rounded-lg hover:text-indigo-600 hover:bg-indigo-50"
                                        title="Copy SKU"
                                    >
                                        <Copy className="w-5 h-5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {activeTab === "all" && totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                    <p className="text-xs font-medium text-gray-700">
                        Page{" "}
                        <span className="font-bold text-indigo-600">
                            {page}
                        </span>{" "}
                        of {totalPages}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(1)}
                            disabled={page === 1}
                            className="p-2 transition-all rounded-lg hover:bg-white disabled:opacity-50"
                        >
                            <ChevronsLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 transition-all rounded-lg hover:bg-white disabled:opacity-50"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="px-2 py-1 font-bold text-white bg-indigo-600 rounded-lg shadow-md">
                            {page}
                        </div>
                        <button
                            onClick={() =>
                                setPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={page === totalPages}
                            className="p-2 transition-all rounded-lg hover:bg-white disabled:opacity-50"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setPage(totalPages)}
                            disabled={page === totalPages}
                            className="p-2 transition-all rounded-lg hover:bg-white disabled:opacity-50"
                        >
                            <ChevronsRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* Action Bar – Compact & Decent */}

            <div className="p-3 text-black bg-gradient-to-r from-indigo-50/50 to-purple-50/30 border-gray-200/50 rounded-b-xl">
                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                    {/* Left buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setSelected(new Set())}
                            className="px-3 py-1.5 text-xs font-medium transition-all bg-black/20 hover:bg-white/30 rounded-lg hover:scale-105"
                        >
                            Clear Selection
                        </button>
                        <button
                            onClick={() =>
                                setSelected(new Set(preview.map((p) => p.id)))
                            }
                            className="px-3 py-1.5 text-xs font-medium transition-all bg-black/20 hover:bg-white/30 rounded-lg hover:scale-105"
                        >
                            Select All Visible
                        </button>
                    </div>

                    {/* Right section */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="text-xs font-semibold">
                            {selected.size} selected
                        </div>

                        <button
                            onClick={() => applySKUs("selected")}
                            disabled={selected.size === 0 || applying}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-white transition-all rounded-lg shadow-md bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-emerald-500/50 disabled:opacity-60 hover:scale-105 disabled:hover:scale-100"
                        >
                            {applying ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            Apply Selected
                        </button>

                        <button
                            onClick={() => applySKUs("all_matching")}
                            disabled={applying}
                            className="px-3 py-2 text-xs font-bold text-white transition-all rounded-lg shadow-md bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-purple-500/50 disabled:opacity-60 hover:scale-105"
                        >
                            Apply All Matching
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
