import React, { useState, useEffect } from "react";
import { Page, Frame, Toast, Loading } from "@shopify/polaris";
import axios from "axios";

import BarcodeHeader from "./components/barcode/Header";
import BarcodeSidebar from "./components/barcode/BarcodeSidebar";
import BarcodePreviewTable from "./components/barcode/BarcodePreviewTable";

export default function BarcodeGenerator({ initialData = [] }) {
    const [form, setForm] = useState({
        format: "UPC",
        search: "",
        vendor: "",
        type: "",
    });

    const [barcodes, setBarcodes] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [summary, setSummary] = useState({
        total: 0,
        unique: 0,
        duplicates: 0,
        empty_or_auto: 0,
    });

    const [toast, setToast] = useState({
        active: false,
        message: "",
        error: false,
    });

    const showToast = (message, error = false) => {
        setToast({ active: true, message, error });
    };

    const fetchBarcodes = async () => {
        setLoading(true);
        try {
            const res = await axios.post("/barcode-generator/preview", {
                ...form,
                page,
            });
            setBarcodes(res.data.data);
            setTotal(res.data.total);
            setSummary(res.data.summary);
        } catch (err) {
            console.error(err);
            showToast("Failed to load barcodes", true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBarcodes();
    }, [page, form]);

    const generate = async () => {
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));
            if (selected.size > 0) {
                fd.append("selected", JSON.stringify([...selected]));
            }

            const res = await axios.post("/barcode/generate", fd);
            showToast(`Generated ${res.data.count} barcode(s)!`);
            fetchBarcodes();
        } catch {
            showToast("Failed to generate barcodes", true);
        }
    };

    return (
        <Frame>
            {loading && <Loading />}
            <Page fullWidth title="Barcode Generator">
                {toast.active && (
                    <Toast
                        content={toast.message}
                        error={toast.error}
                        onDismiss={() => setToast({ ...toast, active: false })}
                        duration={4500}
                    />
                )}

                <div className="p-4">
                    <BarcodeHeader onGenerate={generate} />

                    <div className="grid grid-cols-1 gap-6 mt-6 lg:grid-cols-12">
                        <aside className="lg:col-span-4">
                            <BarcodeSidebar form={form} setForm={setForm} />
                        </aside>

                        <main className="lg:col-span-8">
                            <BarcodePreviewTable
                                barcodes={barcodes}
                                total={total}
                                page={page}
                                setPage={setPage}
                                loading={loading}
                                selected={selected}
                                setSelected={setSelected}
                                summary={summary}
                                refresh={fetchBarcodes}
                            />
                        </main>
                    </div>
                </div>
            </Page>
        </Frame>
    );
}
