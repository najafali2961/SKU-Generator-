import React, { useState, useRef, useEffect } from "react";
import { Database, Download, Zap, ChevronDown, Sparkles } from "lucide-react";

// Presets array must exist in the same file
const presets = [
    {
        label: "PROD-0001",
        changes: { prefix: "PROD", auto_start: "0001", source_field: "none" },
    },
    {
        label: "SKU-001",
        changes: { prefix: "SKU", auto_start: "001", source_field: "none" },
    },
    {
        label: "Title2-PROD-0001",
        changes: {
            source_field: "title",
            source_pos: "first",
            source_len: 2,
            source_placement: "before",
            prefix: "PROD",
        },
    },
    {
        label: "PROD-0001-Vendor2",
        changes: {
            source_field: "vendor",
            source_pos: "first",
            source_len: 2,
            source_placement: "after",
            prefix: "PROD",
        },
    },
    {
        label: "Last2-PROD",
        changes: {
            source_field: "title",
            source_pos: "last",
            source_len: 2,
            source_placement: "before",
            prefix: "PROD",
        },
    },
];

export default function SkuHeader({ onPreset, onQuick, onExport }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative border shadow-xl rounded-2xl bg-white/80 backdrop-blur-xl border-white/20">
            {/* Gradient top bar */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

            <div className="p-4">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    {/* Left: Logo + Title */}
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="absolute inset-0 scale-150 opacity-50 blur-xl bg-gradient-to-br from-indigo-500 to-purple-600"></div>
                            <div className="relative p-3 shadow-2xl bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl">
                                <Database
                                    className="w-6 h-8 text-white"
                                    strokeWidth={2.5}
                                />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-transparent bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
                                SKU Generator Pro
                            </h1>
                            <p className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                Smart • Compact • Lightning Fast
                            </p>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Quick Buttons */}
                        {[
                            {
                                label: "SKU",
                                onClick: () => onQuick("SKU", "001"),
                            },
                            {
                                label: "Short",
                                onClick: () => onQuick("P", "01"),
                            },
                            {
                                label: "T2 Before",
                                onClick: () =>
                                    onQuick(null, null, {
                                        source_field: "title",
                                        source_pos: "first",
                                        source_len: 2,
                                        source_placement: "before",
                                    }),
                            },
                            {
                                label: "V2 Before",
                                onClick: () =>
                                    onQuick(null, null, {
                                        source_field: "vendor",
                                        source_pos: "first",
                                        source_len: 2,
                                        source_placement: "before",
                                    }),
                            },
                        ].map((btn) => (
                            <button
                                key={btn.label}
                                onClick={btn.onClick}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                            >
                                {btn.label}
                            </button>
                        ))}

                        {/* Presets Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white transition-all duration-300 shadow-lg bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl hover:shadow-amber-500/50 hover:scale-105"
                            >
                                <Zap className="w-3 h-3" />
                                Presets
                                <ChevronDown
                                    className={`w-3 h-3 transition-transform duration-300 ${
                                        dropdownOpen ? "rotate-180" : ""
                                    }`}
                                />
                            </button>

                            {dropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-54 z-[9999] overflow-hidden border shadow-2xl bg-white/95 backdrop-blur-xl rounded-2xl border-gray-200/50">
                                    {presets.map((p, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                onPreset(p.changes);
                                                setDropdownOpen(false); // close after selection
                                            }}
                                            className="block w-full px-5 py-3.5 text-left text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 transition-all duration-200 first:rounded-t-2xl last:rounded-b-2xl"
                                        >
                                            <span className="font-mono text-indigo-600">
                                                {p.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={onExport}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white transition-all duration-300 shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl hover:shadow-emerald-500/50 hover:scale-105"
                        >
                            <Download className="w-3 h-3" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
