
import React, { useState } from "react";
import {
  Page,
  Card,
  DataTable,
  Thumbnail,
  Button,
  Badge,
  Pagination,
} from "@shopify/polaris";
import { router } from "@inertiajs/react";

export default function ProductIndex({ products, meta }) {
  const [currentPage, setCurrentPage] = useState(meta.current_page || 1);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    router.get(`/products?page=${page}`, {}, { preserveState: true });
  };

  const rows = products.map((product) => [
    <Thumbnail
      key={product.shopify_id}
      source={product.images[0]?.src || ""}
      alt={product.images[0]?.altText || product.title}
      size="small"
    />,
    product.title,
    <Badge
      key={product.shopify_id}
      status={product.status === "ACTIVE" ? "success" : "warning"}
    >
      {product.status}
    </Badge>,
    product.vendor,
    product.tags,
    <Button
      key={product.shopify_id}
      size="slim"
      onClick={() => router.get(`/products/${product.id}`)}
    >
      View
    </Button>,
  ]);

  return (
    <Page title="Your Products">
      <Card sectioned>
        <DataTable
          columnContentTypes={['text','text','text','text','text','text']}
          headings={['Image', 'Title', 'Status', 'Vendor', 'Tags', 'Actions']}
          rows={rows}
          footerContent={`Showing ${products.length} products`}
        />
      </Card>

      {meta.last_page > 1 && (
        <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
          <Pagination
            hasPrevious={currentPage > 1}
            onPrevious={() => handlePageChange(currentPage - 1)}
            hasNext={currentPage < meta.last_page}
            onNext={() => handlePageChange(currentPage + 1)}
          />
        </div>
      )}
    </Page>
  );
}
