// resources/js/Pages/BarcodeGenerator.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";

import BarcodeHeader from "./components/barcode/Header";
import BarcodeSidebar from "./components/barcode/BarcodeSidebar";
import BarcodePreviewTable from "./components/barcode/BarcodePreviewTable";

const DEBOUNCE_MS = 500;

export default function BarcodeGenerator() {
    const [form, setForm] = useState({
        format: "UPC",
        prefix: "",
        length: 12,
        checksum: true,
        enforce_length: true,
        numeric_only: true,
        auto_fill: true,
        validate_standard: true,
        allow_qr_text: false,
        isbn_group: "",
        ean_country: "",
        search: "",
        vendor: "",
        type: "",
        start_number: "000000000001",
    });

    const [barcodes, setBarcodes] = useState([]);
    const [total, setTotal] = useState(0);
    const [duplicateGroups, setDuplicateGroups] = useState({});
    const [selected, setSelected] = useState(new Set());
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState("all");
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [progress, setProgress] = useState(0);

    const debounceRef = useRef(null);

    const handleChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setPage(1);
        setSelected(new Set());
    };

    const fetchPreview = async () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await axios.post("/barcode-generator/preview", {
                    ...form,
                    page,
                    tab: activeTab,
                });

                setBarcodes(res.data.data || []);
                setTotal(res.data.total || 0);
                setDuplicateGroups(res.data.duplicateGroups || {});
            } catch (err) {
                console.error("Preview error:", err);
            } finally {
                setLoading(false);
            }
        }, DEBOUNCE_MS);
    };

    useEffect(() => {
        fetchPreview();
        return () => clearTimeout(debounceRef.current);
    }, [form, page, activeTab]);

    useEffect(() => {
        if (!applying) return;

        const interval = setInterval(async () => {
            try {
                const { data } = await axios.get("/barcode-generator/progress");
                setProgress(data.progress || 0);
                if (data.progress >= 100) {
                    setApplying(false);
                    setProgress(0);
                    fetchPreview();
                }
            } catch (err) {
                console.error(err);
            }
        }, 1200);

        return () => clearInterval(interval);
    }, [applying]);

    const applyBarcodes = (scope = "selected") => {
        const ids = scope === "selected" ? Array.from(selected) : [];

        setApplying(true);
        setProgress(0);

        router.post(
            "/barcode-generator/apply",
            {
                ...form,
                apply_scope: scope,
                selected_variant_ids: ids.length > 0 ? ids : undefined,
            },
            {
                onFinish: () => setSelected(new Set()),
                onError: (err) => {
                    setApplying(false);
                    alert("Apply failed: " + JSON.stringify(err));
                },
            }
        );
    };

    const handleImport = () => {
        alert("Import EAN/UPC/ISBN from CSV – coming soon!");
    };

    const handleExport = () => {
        if (barcodes.length === 0) {
            alert("No barcodes to export yet!");
            return;
        }

        const csv = [
            ["Barcode", "Format", "Variant ID", "Product Title"],
            ...barcodes.map((b) => [
                b.barcode || "",
                b.format || "",
                b.variant_id || "",
                b.title || "",
            ]),
        ]
            .map((row) => row.join(","))
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `barcodes-${new Date().toISOString().slice(0, 10)}.csv`;
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-6 mx-auto max-w-7xl">
                <BarcodeHeader
                    onImport={handleImport}
                    onExport={handleExport}
                />

                <div className="grid gap-6 mt-6 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <BarcodeSidebar
                            form={form}
                            handleChange={handleChange}
                        />
                    </div>

                    <div className="space-y-6 lg:col-span-8">
                        <BarcodePreviewTable
                            barcodes={barcodes}
                            total={total}
                            page={page}
                            setPage={setPage}
                            selected={selected}
                            setSelected={setSelected}
                            loading={loading}
                            applying={applying}
                            duplicateGroups={duplicateGroups}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            applyBarcodes={applyBarcodes}
                            form={form}
                            handleChange={handleChange}
                        />

                        {applying && (
                            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
                                <h3 className="mb-4 text-lg font-medium">
                                    Applying Barcodes...
                                </h3>
                                <div className="space-y-3">
                                    <div className="w-full h-4 bg-gray-200 rounded-full">
                                        <div
                                            className="h-4 transition-all duration-300 bg-blue-600 rounded-full"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className="text-sm text-center text-gray-600">
                                        {progress}% – Applying to{" "}
                                        {total.toLocaleString()} variants
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
