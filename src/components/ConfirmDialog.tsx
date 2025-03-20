import React, { CSSProperties } from "react";
import { useConfirm } from "../contexts/ConfirmContext";

const ConfirmDialog: React.FC = () => {
  const { isOpen, options, onConfirm, onCancel } = useConfirm();

  if (!isOpen) return null;

  // Custom styling for all dialogs regardless of variant
  const customStyles: Record<string, CSSProperties> = {
    modalContent: {
      backgroundColor: "#ffffff",
      border: "1px solid #000",
      borderRadius: "12px",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
      opacity: 1,
      width: "100%",
      position: "relative" as const,
    },
    modalHeader: {
      backgroundColor: "#ffffff",
      borderBottom: "1px solid #e0e0e0",
      borderTopLeftRadius: "11px",
      borderTopRightRadius: "11px",
      color: "#000000",
      opacity: 1,
      padding: "1rem 1.5rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    modalFooter: {
      backgroundColor: "#ffffff",
      borderTop: "1px solid #e0e0e0",
      padding: "1rem 1.5rem",
      borderBottomLeftRadius: "11px",
      borderBottomRightRadius: "11px",
      opacity: 1,
      display: "flex",
      justifyContent: "flex-end",
      gap: "0.75rem",
    },
    confirmButton: {
      backgroundColor: "#ffffff",
      color: "#000000",
      borderColor: "#000000",
      fontWeight: 500,
      borderRadius: "6px",
      padding: "0.5rem 1.25rem",
      transition: "all 0.2s ease-in-out",
      opacity: 1,
      cursor: "pointer",
    },
    cancelButton: {
      backgroundColor: "#ffffff",
      color: "#000000",
      borderColor: "#c0c0c0",
      borderRadius: "6px",
      padding: "0.5rem 1.25rem",
      transition: "all 0.2s ease-in-out",
      opacity: 1,
      cursor: "pointer",
    },
    backdrop: {
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      zIndex: 1050,
    },
    modalBody: {
      backgroundColor: "#ffffff",
      padding: "1.5rem",
      opacity: 1,
    },
    modal: {
      zIndex: 1055,
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: 1,
      padding: "1rem",
    },
    modalDialog: {
      opacity: 1,
      width: "100%",
      maxWidth:
        options.size === "lg"
          ? "800px"
          : options.size === "sm"
          ? "400px"
          : "500px",
      margin: "auto",
      position: "relative" as const,
    },
    title: {
      margin: 0,
      fontSize: "1.25rem",
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
    },
    icon: {
      marginRight: "0.75rem",
      fontSize: "1.25rem",
    },
    closeButton: {
      background: "transparent",
      border: "none",
      padding: "0.25rem",
      fontSize: "1.25rem",
      cursor: "pointer",
      opacity: 0.7,
      transition: "opacity 0.2s",
    },
    messageText: {
      margin: 0,
      fontSize: "1rem",
      lineHeight: 1.5,
    },
  };

  // Get icon based on variant
  const getIconForVariant = () => {
    switch (options.variant) {
      case "danger":
        return "bi-exclamation-circle";
      case "warning":
        return "bi-exclamation-triangle";
      case "success":
        return "bi-check-circle";
      case "info":
        return "bi-info-circle";
      default:
        return options.icon || "bi-question-circle";
    }
  };

  // Handle nullable callbacks safely
  const handleConfirm = () => {
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          ...customStyles.backdrop,
        }}
      />

      {/* Modal */}
      <div style={customStyles.modal}>
        <div
          style={customStyles.modalDialog}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={customStyles.modalContent}>
            <div style={customStyles.modalHeader}>
              <h5 style={customStyles.title}>
                <i
                  className={`bi ${getIconForVariant()}`}
                  style={{
                    ...customStyles.icon,
                    color:
                      options.variant === "danger"
                        ? "#dc3545"
                        : options.variant === "warning"
                        ? "#ffc107"
                        : options.variant === "success"
                        ? "#198754"
                        : options.variant === "info"
                        ? "#0dcaf0"
                        : "#000",
                  }}
                ></i>
                {options.title}
              </h5>
              <button
                type="button"
                style={customStyles.closeButton}
                onClick={handleCancel}
                aria-label="Close"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div style={customStyles.modalBody}>
              <p style={customStyles.messageText}>{options.message}</p>
            </div>
            <div style={customStyles.modalFooter}>
              <button
                type="button"
                style={customStyles.cancelButton}
                onClick={handleCancel}
              >
                {options.cancelLabel || "Cancel"}
              </button>
              <button
                type="button"
                style={{
                  ...customStyles.confirmButton,
                  borderColor:
                    options.variant === "danger"
                      ? "#dc3545"
                      : options.variant === "warning"
                      ? "#ffc107"
                      : options.variant === "success"
                      ? "#198754"
                      : options.variant === "info"
                      ? "#0dcaf0"
                      : "#000",
                }}
                onClick={handleConfirm}
              >
                {options.confirmLabel || "Yes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmDialog;
