import React from "react";
import { Modal, TextContainer } from "@shopify/polaris";

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
                <TextContainer>
                    <p className="whitespace-pre-wrap">{message}</p>
                </TextContainer>
            </Modal.Section>
        </Modal>
    );
};

export default ConfirmModal;
