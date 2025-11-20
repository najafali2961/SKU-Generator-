import React from "react";
import {
  Page,
  Card,
  Text,
  InlineStack,
  BlockStack,
  Thumbnail,
  Badge,
  Button,
  Box,
  Divider,
} from "@shopify/polaris";
import { router } from "@inertiajs/react";

export default function ProductShow({ product }) {
  return (
    <Page title={product.title} fullWidth>
      {/* Images Gallery */}
      <Card sectioned>
        <Text variant="headingMd" as="h2">
          Product Images
        </Text>
        <InlineStack spacing="6" blockAlign="center" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
          {product.images.length ? (
            product.images.map((img, index) => (
              <Thumbnail
                key={index}
                source={img.src}
                alt={img.altText || product.title}
                size="large"
              />
            ))
          ) : (
            <Text tone="subdued">No images available</Text>
          )}
        </InlineStack>
      </Card>

      <Box marginBlockStart="4">
        <InlineStack spacing="6" wrap>
          {/* Product Details */}
          <Card sectioned title="Product Details" subdued>
            <BlockStack spacing="2">
              <Text as="p">
                <strong>Status: </strong>
                <Badge tone={product.status === "ACTIVE" ? "success" : "warning"}>
                  {product.status}
                </Badge>
              </Text>
              <Text as="p"><strong>Vendor: </strong>{product.vendor}</Text>
              <Text as="p"><strong>Tags: </strong>{product.tags || '-'}</Text>
            </BlockStack>
          </Card>

          {/* Actions */}
          <Card sectioned title="Actions" subdued>
            <BlockStack spacing="2">
              <Button
                primary
                onClick={() => router.get(`/products/${product.id}/edit`)}
              >
                Edit Product
              </Button>
              <Button
                destructive
                onClick={() => router.delete(`/products/${product.id}`)}
              >
                Delete Product
              </Button>
              <Button
                onClick={() => router.get('/products')}
              >
                Back to Products
              </Button>
            </BlockStack>
          </Card>
        </InlineStack>
      </Box>

      <Divider />
    </Page>
  );
}
