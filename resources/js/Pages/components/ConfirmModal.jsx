import React from "react";
import {
    Modal,
    TextContainer,
    Banner,
    BlockStack,
    Text,
    Box,
} from "@shopify/polaris";

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDangerous = false,
}) => {
    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title={title}
            primaryAction={{
                content: confirmText,
                onAction: onConfirm,
                destructive: isDangerous,
            }}
            secondaryActions={[
                {
                    content: cancelText,
                    onAction: onClose,
                },
            ]}
        >
            <Modal.Section>
                <BlockStack gap="400">
                    <Banner tone="warning">
                        <Text as="p" fontWeight="semibold">
                            This action cannot be reverted once the job has
                            started.
                        </Text>
                    </Banner>

                    <Box paddingBlockStart="200">
                        <Text variant="bodyLg" as="p">
                            {message}
                        </Text>
                    </Box>
                </BlockStack>
            </Modal.Section>
        </Modal>
    );
};

export default ConfirmModal;
