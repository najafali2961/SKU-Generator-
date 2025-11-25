import React, { useEffect, useState, useRef } from "react";
import {
    Page,
    Layout,
    Card,
    BlockStack,
    Text,
    ProgressBar,
} from "@shopify/polaris";
import axios from "axios";
import { router } from "@inertiajs/react";

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
        setSelected(new Set()); // Clear selection on change
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

    // Debounced preview
    useEffect(() => {
        fetchPreview();
        return () => clearTimeout(debounceRef.current);
    }, [form, page, activeTab]);

    // Progress polling when applying
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
                onFinish: () => {
                    setSelected(new Set());
                    // Progress polling handles completion
                },
                onError: (err) => {
                    setApplying(false);
                    alert("Apply failed: " + JSON.stringify(err));
                },
            }
        );
    };

    return (
        <Page fullWidth title="Barcode Generator">
            <Layout>
                <Layout.Section variant="oneThird">
                    <BarcodeSidebar form={form} handleChange={handleChange} />
                </Layout.Section>

                <Layout.Section>
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
                        <Card sectioned title="Applying Barcodes...">
                            <BlockStack gap="400">
                                <ProgressBar
                                    progress={progress}
                                    color="primary"
                                />
                                <Text alignment="center">
                                    {progress}% – Applying to{" "}
                                    {total.toLocaleString()} variants...
                                </Text>
                            </BlockStack>
                        </Card>
                    )}
                </Layout.Section>
            </Layout>
        </Page>
    );
}
