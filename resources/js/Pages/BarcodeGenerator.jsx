// resources/js/Pages/BarcodeGenerator.jsx
import React, { useState, useCallback } from "react";
import { Card, Page, Toast } from "@shopify/polaris";
import axios from "axios";
import { router } from "@inertiajs/react";

import BarcodeHeader from "./components/barcode/Header";
import BarcodeSidebar from "./components/barcode/BarcodeSidebar";
import BarcodePreviewTable from "./components/barcode/BarcodePreviewTable";

export default function BarcodeGenerator({
    products = [],
    barcodes = { data: [] },
}) {
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
        isbn_group: "978",
        ean_country: "50",
        search: "",
        vendor: "",
        type: "",
        collections: [],
    });

    const handleChange = (field, value) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const [selected, setSelected] = useState(new Set());
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState("");
    const [toast, setToast] = useState({
        active: false,
        message: "",
        error: false,
    });
    const [page, setPage] = useState(1);
    const [duplicates, setDuplicates] = useState([]);
    const [duplicateGroups, setDuplicateGroups] = useState({});

    const handleDrop = useCallback((_drop, accepted) => {
        if (accepted.length) {
            setFile(accepted[0]);
            setFileName(accepted[0].name);
        }
    }, []);

    const removeFile = () => {
        setFile(null);
        setFileName("");
    };

    const generate = async () => {
        const fd = new FormData();
        Object.keys(form).forEach((key) => fd.append(key, form[key]));
        if (selected.size)
            fd.append("product_ids", JSON.stringify(Array.from(selected)));
        if (file) fd.append("csv_file", file);

        try {
            const r = await axios.post("/barcode/generate", fd);
            setToast({
                active: true,
                message: `Generated ${r.data.barcodes.length} barcodes!`,
                error: false,
            });
            router.reload({ only: ["barcodes"] });
        } catch {
            setToast({
                active: true,
                message: "Failed to generate",
                error: true,
            });
        }
    };

    const checkDuplicates = async () => {
        try {
            const res = await axios.post("/barcode/check-duplicates", {
                codes: barcodes.data.map((b) => b.barcode_value),
            });
            setDuplicates(res.data.duplicates || []);
            setDuplicateGroups(res.data.duplicateGroups || {});
            setToast({
                active: true,
                message:
                    res.data.duplicates?.length || 0
                        ? `${res.data.duplicates.length} duplicates found!`
                        : "No duplicates!",
                error: (res.data.duplicates?.length || 0) > 0,
            });
        } catch {
            setToast({ active: true, message: "Check failed", error: true });
        }
    };

    const exportPDF = () => window.open("/barcode/export?format=pdf", "_blank");

    return (
        <Page fullWidth>
            {toast.active && (
                <Toast
                    content={toast.message}
                    error={toast.error}
                    onDismiss={() => setToast({ active: false })}
                />
            )}

            <div className="grid grid-cols-1 gap-6 p-4">
                {/* Header Full Width */}
                <div className="col-span-1">
                    <BarcodeHeader
                        onGenerate={generate}
                        onScan={() => console.log("scan-camera")}
                        onExport={exportPDF}
                    />
                </div>

                {/* Sidebar + Preview Table */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Sidebar (Left) */}
                    <aside className="lg:col-span-4">
                        <BarcodeSidebar
                            form={form}
                            handleChange={handleChange}
                        />
                    </aside>

                    {/* Barcode Preview (Right) */}
                    <main className="lg:col-span-8">
                        <BarcodePreviewTable
                            barcodes={barcodes.data}
                            loading={false}
                            form={form}
                            handleChange={handleChange}
                            page={page}
                            setPage={setPage}
                            duplicates={duplicates}
                            duplicateGroups={duplicateGroups}
                            selected={selected}
                            setSelected={setSelected}
                        />
                    </main>
                </div>
            </div>
        </Page>
    );
}
