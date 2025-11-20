// import React, { useState, useEffect } from "react";
// import {
//     Page,
//     Layout,
//     Card,
//     DataTable,
//     Thumbnail,
//     Button,
//     Badge,
//     Select,
//     TextField,
//     InlineStack,
//     BlockStack,
//     ProgressBar,
//     Pagination,
//     Checkbox,
//     Text,
//     Toast,
//     Frame,
//     EmptyState,
//     Spinner,
//     Popover,
//     ActionList,
// } from "@shopify/polaris";
// import { router, usePage } from "@inertiajs/react";
// import axios from "axios";

// export default function BulkEdit({ products: initialProducts, meta }) {
//     const { props } = usePage();
//     const flashSuccess = props.flash?.success;

//     const [products, setProducts] = useState(initialProducts);
//     const [selectedIds, setSelectedIds] = useState([]);
//     const [selectAll, setSelectAll] = useState(false); // select all across pages
//     const [field, setField] = useState("");
//     const [value, setValue] = useState("");
//     const [processing, setProcessing] = useState(false);
//     const [toast, setToast] = useState(null);
//     const [popoverActive, setPopoverActive] = useState(false);

//     const selectedCount = selectAll ? "all" : selectedIds.length;
//     const hasProducts = products.length > 0;

//     const bulkOptions = [
//         { label: "Select field to edit", value: "", disabled: true },
//         { label: "Title", value: "title" },
//         { label: "Description", value: "description" },
//         { label: "Vendor", value: "vendor" },
//         { label: "Product Type", value: "product_type" },
//         { label: "Tags", value: "tags" },
//         { label: "Status", value: "status" },
//     ];

//     const handleSelect = (id) => {
//         setSelectedIds((prev) =>
//             prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
//         );
//     };

//     const handleSelectAllOnPage = () => {
//         if (selectedIds.length === products.length) {
//             setSelectedIds([]);
//             setSelectAll(false);
//         } else {
//             setSelectedIds(products.map((p) => p.id));
//             setSelectAll(false);
//         }
//     };

//     const handleSelectAllProducts = async () => {
//         setProcessing(true);
//         try {
//             const response = await axios.get(`/pro/all`);
//             const data = response.data; // already JSON
//             setSelectedIds(data.ids);
//             setSelectAll(true);
//         } catch (err) {
//             console.error("Failed to select all products", err);
//             setToast({
//                 message: "Failed to fetch all product IDs",
//                 isError: true,
//             });
//         } finally {
//             setProcessing(false);
//         }
//     };

//     const applyChanges = async () => {
//         if (!field || selectedCount === 0) return;

//         const finalValue = field === "status" ? value.toUpperCase() : value;
//         setProcessing(true);

//         try {
//             await router.post(
//                 "/bulk-edit/apply",
//                 { product_ids: selectedIds, field, value: finalValue },
//                 {
//                     preserveScroll: true,
//                     onSuccess: () => {
//                         setProducts((prev) =>
//                             prev.map((p) =>
//                                 selectedIds.includes(p.id)
//                                     ? { ...p, [field]: finalValue }
//                                     : p
//                             )
//                         );
//                         setToast({
//                             message: `${selectedCount} product${
//                                 selectedCount > 1 ? "s" : ""
//                             } updated successfully!`,
//                             isError: false,
//                         });
//                     },
//                     onFinish: () => {
//                         setProcessing(false);
//                         setSelectedIds([]);
//                         setSelectAll(false);
//                         setField("");
//                         setValue("");
//                     },
//                 }
//             );
//         } catch (err) {
//             setToast({ message: "Failed to update products", isError: true });
//             setProcessing(false);
//         }
//     };

//     useEffect(() => {
//         if (flashSuccess) setToast({ message: flashSuccess, isError: false });
//     }, [flashSuccess]);

//     const rows = products.map((product) => [
//         <Checkbox
//             labelHidden
//             checked={selectedIds.includes(product.id)}
//             onChange={() => handleSelect(product.id)}
//             disabled={processing || selectAll}
//         />,
//         <Thumbnail
//             source={product.images?.[0]?.src || ""}
//             alt={product.title}
//             size="small"
//         />,
//         <Text fontWeight="semibold">{product.title}</Text>,
//         product.status === "ACTIVE" ? (
//             <Badge tone="success">Active</Badge>
//         ) : product.status === "DRAFT" ? (
//             <Badge tone="warning">Draft</Badge>
//         ) : (
//             <Badge tone="critical">Archived</Badge>
//         ),
//         <Text color="subdued">{product.vendor || "—"}</Text>,
//         <Text color="subdued">
//             {Array.isArray(product.tags)
//                 ? product.tags.join(", ")
//                 : product.tags || "—"}
//         </Text>,
//         processing && selectedIds.includes(product.id) ? (
//             <InlineStack gap="200">
//                 <Spinner size="small" />
//                 <Text color="subdued">Updating…</Text>
//             </InlineStack>
//         ) : (
//             <Text color="success" fontWeight="medium">
//                 Ready
//             </Text>
//         ),
//     ]);

//     return (
//         <Frame>
//             <Page
//                 title="Bulk Product Editor"
//                 subtitle="Update multiple products quickly"
//                 primaryAction={{
//                     content: `Apply to ${selectedCount} ${
//                         selectedCount === 1 ? "product" : "products"
//                     }`,
//                     onAction: applyChanges,
//                     disabled: !field || selectedCount === 0 || processing,
//                     loading: processing,
//                     tone: "success",
//                 }}
//             >
//                 <Layout>
//                     {toast && (
//                         <Toast
//                             content={toast.message}
//                             error={toast.isError}
//                             onDismiss={() => setToast(null)}
//                             duration={5000}
//                         />
//                     )}

//                     <Layout.Section>
//                         <Card>
//                             <BlockStack gap="400">
//                                 <InlineStack
//                                     align="space-between"
//                                     blockAlign="center"
//                                 >
//                                     <BlockStack gap="100">
//                                         <Text variant="headingLg">
//                                             Bulk Edit
//                                         </Text>
//                                         <Text color="subdued">
//                                             {selectedCount > 0
//                                                 ? `${selectedCount} selected`
//                                                 : "Select products to edit"}
//                                         </Text>
//                                     </BlockStack>

//                                     <InlineStack gap="300">
//                                         <Select
//                                             labelInline
//                                             label="Field"
//                                             options={bulkOptions}
//                                             value={field}
//                                             onChange={setField}
//                                             disabled={processing}
//                                         />
//                                         {field && field !== "status" && (
//                                             <TextField
//                                                 label="New Value"
//                                                 value={value}
//                                                 onChange={setValue}
//                                                 disabled={processing}
//                                             />
//                                         )}
//                                         {field === "status" && (
//                                             <Select
//                                                 labelInline
//                                                 label="New Status"
//                                                 options={[
//                                                     {
//                                                         label: "Active",
//                                                         value: "ACTIVE",
//                                                     },
//                                                     {
//                                                         label: "Draft",
//                                                         value: "DRAFT",
//                                                     },
//                                                     {
//                                                         label: "Archived",
//                                                         value: "ARCHIVED",
//                                                     },
//                                                 ]}
//                                                 value={value}
//                                                 onChange={setValue}
//                                                 disabled={processing}
//                                             />
//                                         )}
//                                     </InlineStack>
//                                 </InlineStack>
//                                 {processing && (
//                                     <ProgressBar progress={50} tone="primary" />
//                                 )}
//                             </BlockStack>
//                         </Card>
//                     </Layout.Section>

//                     <Layout.Section>
//                         <Card>
//                             {hasProducts ? (
//                                 <BlockStack gap="400">
//                                     <InlineStack>
//                                         <Popover
//                                             active={popoverActive}
//                                             activator={
//                                                 <Button
//                                                     onClick={() =>
//                                                         setPopoverActive(
//                                                             (prev) => !prev
//                                                         )
//                                                     }
//                                                 >
//                                                     {selectedIds.length ===
//                                                     products.length
//                                                         ? "Deselect All"
//                                                         : "Select"}
//                                                 </Button>
//                                             }
//                                             onClose={() =>
//                                                 setPopoverActive(false)
//                                             }
//                                         >
//                                             <ActionList
//                                                 items={[
//                                                     {
//                                                         content:
//                                                             "Select All on this page",
//                                                         onAction:
//                                                             handleSelectAllOnPage,
//                                                     },
//                                                     {
//                                                         content:
//                                                             "Select All Products",
//                                                         onAction:
//                                                             handleSelectAllProducts,
//                                                     },
//                                                 ]}
//                                             />
//                                         </Popover>
//                                     </InlineStack>

//                                     <DataTable
//                                         stickyHeader
//                                         increasedTableDensity
//                                         columnContentTypes={[
//                                             "text",
//                                             "text",
//                                             "text",
//                                             "text",
//                                             "text",
//                                             "text",
//                                             "text",
//                                         ]}
//                                         headings={[
//                                             <Checkbox
//                                                 labelHidden
//                                                 checked={
//                                                     selectedIds.length ===
//                                                         products.length &&
//                                                     !selectAll
//                                                 }
//                                                 indeterminate={
//                                                     selectedIds.length > 0 &&
//                                                     selectedIds.length <
//                                                         products.length &&
//                                                     !selectAll
//                                                 }
//                                                 onChange={handleSelectAllOnPage}
//                                                 disabled={
//                                                     processing || selectAll
//                                                 }
//                                             />,
//                                             "",
//                                             "Product",
//                                             "Status",
//                                             "Vendor",
//                                             "Tags",
//                                             "Update",
//                                         ]}
//                                         rows={rows}
//                                     />

//                                     {meta?.last_page > 1 && (
//                                         <BlockStack align="center">
//                                             <Pagination
//                                                 hasPrevious={
//                                                     meta.current_page > 1
//                                                 }
//                                                 onPrevious={() =>
//                                                     router.visit(
//                                                         `/bulk-edit?page=${
//                                                             meta.current_page -
//                                                             1
//                                                         }`
//                                                     )
//                                                 }
//                                                 hasNext={
//                                                     meta.current_page <
//                                                     meta.last_page
//                                                 }
//                                                 onNext={() =>
//                                                     router.visit(
//                                                         `/bulk-edit?page=${
//                                                             meta.current_page +
//                                                             1
//                                                         }`
//                                                     )
//                                                 }
//                                                 label={`Page ${meta.current_page} of ${meta.last_page}`}
//                                             />
//                                         </BlockStack>
//                                     )}
//                                 </BlockStack>
//                             ) : (
//                                 <EmptyState
//                                     heading="No products found"
//                                     action={{
//                                         content: "View all products",
//                                         url: "/products",
//                                     }}
//                                     image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
//                                 >
//                                     <Text color="subdued">
//                                         There are no products to display. Add
//                                         products or adjust your filters.
//                                     </Text>
//                                 </EmptyState>
//                             )}
//                         </Card>
//                     </Layout.Section>
//                 </Layout>
//             </Page>
//         </Frame>
//     );
// }

import React, { useState, useEffect } from "react";
import {
    Page,
    Layout,
    Card,
    DataTable,
    Thumbnail,
    Button,
    Badge,
    Select,
    TextField,
    InlineStack,
    BlockStack,
    ProgressBar,
    Pagination,
    Checkbox,
    Text,
    Toast,
    Frame,
    EmptyState,
    Spinner,
    Popover,
    ActionList,
} from "@shopify/polaris";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";

export default function BulkEdit({ products: initialProducts, meta }) {
    const { props } = usePage();
    const flashSuccess = props.flash?.success;

    const [products, setProducts] = useState(initialProducts);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectAll, setSelectAll] = useState(false); // all products across pages
    const [field, setField] = useState("");
    const [value, setValue] = useState("");
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState(null);
    const [popoverActive, setPopoverActive] = useState(false);

    const selectedCount = selectAll ? "all" : selectedIds.length;
    const hasProducts = products.length > 0;

    const bulkOptions = [
        { label: "Select field to edit", value: "", disabled: true },
        { label: "Title", value: "title" },
        { label: "Description", value: "description" },
        { label: "Vendor", value: "vendor" },
        { label: "Product Type", value: "product_type" },
        { label: "Tags", value: "tags" },
        { label: "Status", value: "status" },
    ];

    // Toggle single product
    const handleSelect = (id) => {
        if (selectAll) {
            // if selectAll is true, toggle off this product only
            setSelectedIds((prev) => prev.filter((x) => x !== id));
        } else {
            setSelectedIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            );
        }
    };

    // Toggle select all on current page
    const handleSelectAllOnPage = () => {
        const pageIds = products.map((p) => p.id);

        if (selectAll) {
            // If global selectAll is true, deselect all page IDs
            setSelectedIds((prev) =>
                prev.filter((id) => !pageIds.includes(id))
            );
        } else {
            // If all on page already selected, deselect
            const allOnPageSelected = pageIds.every((id) =>
                selectedIds.includes(id)
            );
            if (allOnPageSelected) {
                setSelectedIds((prev) =>
                    prev.filter((id) => !pageIds.includes(id))
                );
            } else {
                setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
            }
        }
        setSelectAll(false);
    };

    // Select all products across all pages
    const handleSelectAllProducts = async () => {
        setProcessing(true);
        try {
            const response = await axios.get(`/pro/all`);
            const data = response.data; // array of all product IDs
            setSelectedIds(data.ids);
            setSelectAll(true);
        } catch (err) {
            console.error("Failed to select all products", err);
            setToast({
                message: "Failed to fetch all product IDs",
                isError: true,
            });
        } finally {
            setProcessing(false);
        }
    };

    const applyChanges = async () => {
        if (!field || selectedCount === 0) return;

        const finalValue = field === "status" ? value.toUpperCase() : value;
        setProcessing(true);

        try {
            await router.post(
                "/bulk-edit/apply",
                { product_ids: selectedIds, field, value: finalValue },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setProducts((prev) =>
                            prev.map((p) =>
                                selectedIds.includes(p.id)
                                    ? { ...p, [field]: finalValue }
                                    : p
                            )
                        );
                        setToast({
                            message: `${selectedCount} product${
                                selectedCount > 1 ? "s" : ""
                            } updated successfully!`,
                            isError: false,
                        });
                    },
                    onFinish: () => {
                        setProcessing(false);
                        setSelectedIds([]);
                        setSelectAll(false);
                        setField("");
                        setValue("");
                    },
                }
            );
        } catch (err) {
            setToast({ message: "Failed to update products", isError: true });
            setProcessing(false);
        }
    };

    useEffect(() => {
        if (flashSuccess) setToast({ message: flashSuccess, isError: false });
    }, [flashSuccess]);

    const rows = products.map((product) => [
        <Checkbox
            labelHidden
            checked={selectAll || selectedIds.includes(product.id)}
            onChange={() => handleSelect(product.id)}
            disabled={processing}
        />,
        <Thumbnail
            source={product.images?.[0]?.src || ""}
            alt={product.title}
            size="small"
        />,
        <Text fontWeight="semibold">{product.title}</Text>,
        product.status === "ACTIVE" ? (
            <Badge tone="success">Active</Badge>
        ) : product.status === "DRAFT" ? (
            <Badge tone="warning">Draft</Badge>
        ) : (
            <Badge tone="critical">Archived</Badge>
        ),
        <Text color="subdued">{product.vendor || "—"}</Text>,
        <Text color="subdued">
            {Array.isArray(product.tags)
                ? product.tags.join(", ")
                : product.tags || "—"}
        </Text>,
        processing && selectedIds.includes(product.id) ? (
            <InlineStack gap="200">
                <Spinner size="small" />
                <Text color="subdued">Updating…</Text>
            </InlineStack>
        ) : (
            <Text color="success" fontWeight="medium">
                Ready
            </Text>
        ),
    ]);

    return (
        <Frame>
            <Page
                title="Bulk Product Editor"
                subtitle="Update multiple products quickly"
                primaryAction={{
                    content: `Apply to ${selectedCount} ${
                        selectedCount === 1 ? "product" : "products"
                    }`,
                    onAction: applyChanges,
                    disabled: !field || selectedCount === 0 || processing,
                    loading: processing,
                    tone: "success",
                }}
            >
                <Layout>
                    {toast && (
                        <Toast
                            content={toast.message}
                            error={toast.isError}
                            onDismiss={() => setToast(null)}
                            duration={5000}
                        />
                    )}

                    <Layout.Section>
                        <Card>
                            <BlockStack gap="400">
                                <InlineStack
                                    align="space-between"
                                    blockAlign="center"
                                >
                                    <BlockStack gap="100">
                                        <Text variant="headingLg">
                                            Bulk Edit
                                        </Text>
                                        <Text color="subdued">
                                            {selectedCount > 0
                                                ? `${selectedCount} selected`
                                                : "Select products to edit"}
                                        </Text>
                                    </BlockStack>

                                    <InlineStack gap="300">
                                        <Select
                                            labelInline
                                            label="Field"
                                            options={bulkOptions}
                                            value={field}
                                            onChange={setField}
                                            disabled={processing}
                                        />
                                        {field && field !== "status" && (
                                            <TextField
                                                label="New Value"
                                                value={value}
                                                onChange={setValue}
                                                disabled={processing}
                                            />
                                        )}
                                        {field === "status" && (
                                            <Select
                                                labelInline
                                                label="New Status"
                                                options={[
                                                    {
                                                        label: "Active",
                                                        value: "ACTIVE",
                                                    },
                                                    {
                                                        label: "Draft",
                                                        value: "DRAFT",
                                                    },
                                                    {
                                                        label: "Archived",
                                                        value: "ARCHIVED",
                                                    },
                                                ]}
                                                value={value}
                                                onChange={setValue}
                                                disabled={processing}
                                            />
                                        )}
                                    </InlineStack>
                                </InlineStack>
                                {processing && (
                                    <ProgressBar progress={50} tone="primary" />
                                )}
                            </BlockStack>
                        </Card>
                    </Layout.Section>

                    <Layout.Section>
                        <Card>
                            {hasProducts ? (
                                <BlockStack gap="400">
                                    <InlineStack>
                                        <Popover
                                            active={popoverActive}
                                            activator={
                                                <Button
                                                    onClick={() =>
                                                        setPopoverActive(
                                                            (prev) => !prev
                                                        )
                                                    }
                                                >
                                                    {selectAll
                                                        ? "Deselect All"
                                                        : "Select"}
                                                </Button>
                                            }
                                            onClose={() =>
                                                setPopoverActive(false)
                                            }
                                        >
                                            <ActionList
                                                items={[
                                                    {
                                                        content:
                                                            "Select All on this page",
                                                        onAction:
                                                            handleSelectAllOnPage,
                                                    },
                                                    {
                                                        content:
                                                            "Select All Products",
                                                        onAction:
                                                            handleSelectAllProducts,
                                                    },
                                                ]}
                                            />
                                        </Popover>
                                    </InlineStack>

                                    <DataTable
                                        stickyHeader
                                        increasedTableDensity
                                        columnContentTypes={[
                                            "text",
                                            "text",
                                            "text",
                                            "text",
                                            "text",
                                            "text",
                                            "text",
                                        ]}
                                        headings={[
                                            <Checkbox
                                                labelHidden
                                                checked={
                                                    selectAll ||
                                                    selectedIds.length ===
                                                        products.length
                                                }
                                                indeterminate={
                                                    !selectAll &&
                                                    selectedIds.length > 0 &&
                                                    selectedIds.length <
                                                        products.length
                                                }
                                                onChange={handleSelectAllOnPage}
                                                disabled={processing}
                                            />,
                                            "",
                                            "Product",
                                            "Status",
                                            "Vendor",
                                            "Tags",
                                            "Update",
                                        ]}
                                        rows={rows}
                                    />

                                    {meta?.last_page > 1 && (
                                        <BlockStack align="center">
                                            <Pagination
                                                hasPrevious={
                                                    meta.current_page > 1
                                                }
                                                onPrevious={() =>
                                                    router.visit(
                                                        `/bulk-edit?page=${
                                                            meta.current_page -
                                                            1
                                                        }`
                                                    )
                                                }
                                                hasNext={
                                                    meta.current_page <
                                                    meta.last_page
                                                }
                                                onNext={() =>
                                                    router.visit(
                                                        `/bulk-edit?page=${
                                                            meta.current_page +
                                                            1
                                                        }`
                                                    )
                                                }
                                                label={`Page ${meta.current_page} of ${meta.last_page}`}
                                            />
                                        </BlockStack>
                                    )}
                                </BlockStack>
                            ) : (
                                <EmptyState
                                    heading="No products found"
                                    action={{
                                        content: "View all products",
                                        url: "/products",
                                    }}
                                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                >
                                    <Text color="subdued">
                                        There are no products to display. Add
                                        products or adjust your filters.
                                    </Text>
                                </EmptyState>
                            )}
                        </Card>
                    </Layout.Section>
                </Layout>
            </Page>
        </Frame>
    );
}
