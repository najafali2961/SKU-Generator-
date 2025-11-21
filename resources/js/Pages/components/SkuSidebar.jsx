// resources/js/Pages/components/SkuSidebar.jsx
import React from "react";
import { Settings, Filter, Package, Hash } from "lucide-react";

export default function SkuSidebar({
    form,
    handleChange,
    toggleCollection,
    initialCollections,
}) {
    const rules = [
        ["only_missing", "Only missing SKUs"],
        ["remove_spaces", "Remove spaces from final SKU"],
        ["alphanumeric", "Alphanumeric only (no special chars)"],
        ["auto_number_per_product", "Restart numbering per product"],
    ];

    return (
        <aside className="space-y-5 lg:col-span-4">
            {/* Pattern Builder */}
            <div className="p-4 border shadow-xl bg-white/80 backdrop-blur-xl border-white/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                        <Hash className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">
                        Pattern Builder
                    </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <input
                        placeholder="Prefix"
                        value={form.prefix}
                        onChange={(e) =>
                            handleChange("prefix", e.target.value.toUpperCase())
                        }
                        className="px-3 py-2 text-xs font-medium transition-all border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <input
                        placeholder="Start Number"
                        value={form.auto_start}
                        onChange={(e) =>
                            handleChange("auto_start", e.target.value)
                        }
                        className="px-3 py-2 text-xs font-medium transition-all border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <select
                        value={form.delimiter}
                        onChange={(e) =>
                            handleChange("delimiter", e.target.value)
                        }
                        className="px-3 py-2 text-xs font-medium transition-all border border-gray-200 appearance-none cursor-pointer bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: "right 0.5rem center",
                            backgroundRepeat: "no-repeat",
                            backgroundSize: "1.5em",
                        }}
                    >
                        <option value="-">Hyphen (-)</option>
                        <option value="_">Underscore (_)</option>
                        <option value="">None</option>
                    </select>
                    <input
                        placeholder="Suffix"
                        value={form.suffix}
                        onChange={(e) =>
                            handleChange("suffix", e.target.value.toUpperCase())
                        }
                        className="px-3 py-2 text-xs font-medium transition-all border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                {/* Source Field Row */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                    <select
                        value={form.source_field}
                        onChange={(e) =>
                            handleChange("source_field", e.target.value)
                        }
                        className="px-3 py-2 text-xs font-medium transition-all border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="none">No Source</option>
                        <option value="title">From Title</option>
                        <option value="vendor">From Vendor</option>
                    </select>
                    <select
                        value={form.source_pos}
                        onChange={(e) =>
                            handleChange("source_pos", e.target.value)
                        }
                        className="px-3 py-2 text-xs font-medium transition-all border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="first">First Letters</option>
                        <option value="last">Last Letters</option>
                    </select>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={form.source_len}
                        onChange={(e) =>
                            handleChange("source_len", Number(e.target.value))
                        }
                        className="px-3 py-2 text-xs font-medium text-center transition-all border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                <select
                    value={form.source_placement}
                    onChange={(e) =>
                        handleChange("source_placement", e.target.value)
                    }
                    className="w-full px-3 py-2 mt-3 text-xs font-medium transition-all border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="before">
                        Source Before Number (e.g. AB-PROD-0001)
                    </option>
                    <option value="after">
                        Source After Number (e.g. PROD-0001-AB)
                    </option>
                </select>
            </div>

            {/* Rules */}
            <div className="p-4 border shadow-xl bg-white/80 backdrop-blur-xl border-white/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                        <Settings className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">
                        Generation Rules
                    </h3>
                </div>

                <div className="space-y-3">
                    {rules.map(([key, label]) => (
                        <label
                            key={key}
                            className="flex items-center gap-3 cursor-pointer group"
                        >
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={form[key]}
                                    onChange={(e) =>
                                        handleChange(key, e.target.checked)
                                    }
                                    className="w-5 h-5 text-indigo-600 transition-all border-2 border-gray-300 rounded-lg cursor-pointer focus:ring-indigo-500 focus:ring-2"
                                />
                                <div className="absolute inset-0 transition-opacity bg-indigo-500 rounded-lg opacity-0 pointer-events-none group-hover:opacity-10"></div>
                            </div>
                            <span className="text-xs font-medium text-gray-700">
                                {label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="p-4 border shadow-xl bg-white/80 backdrop-blur-xl border-white/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                        <Filter className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Filters</h3>
                </div>

                <div className="space-y-4">
                    <input
                        placeholder="Vendor (e.g. Nike)"
                        value={form.vendor}
                        onChange={(e) => handleChange("vendor", e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium placeholder-gray-400 transition-all border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                        placeholder="Product Type (e.g. T-Shirt)"
                        value={form.type}
                        onChange={(e) => handleChange("type", e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium placeholder-gray-400 transition-all border border-gray-200 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    {initialCollections.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Package className="w-3 h-3 text-gray-500" />
                                <p className="text-xs font-semibold text-gray-700">
                                    Collections
                                </p>
                                <span className="ml-auto text-xs text-gray-500">
                                    {form.collections.length} selected
                                </span>
                            </div>
                            <div className="p-2 space-y-1 overflow-y-auto border border-gray-200 max-h-38 bg-gray-50/50 rounded-xl">
                                {initialCollections.map((c) => (
                                    <label
                                        key={c.id}
                                        className="flex items-center gap-3 p-2 transition-all rounded-lg cursor-pointer hover:bg-white/70"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.collections.includes(
                                                c.id
                                            )}
                                            onChange={() =>
                                                toggleCollection(c.id)
                                            }
                                            className="w-3 h-3 border-gray-300 rounded text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span className="text-xs text-gray-700 truncate">
                                            {c.title}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
