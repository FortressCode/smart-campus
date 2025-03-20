import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

// Define the confirmation dialog options and structure
export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "success" | "info";
  icon?: string;
  size?: "sm" | "md" | "lg";
}

// Define the context type
interface ConfirmContextType {
  isOpen: boolean;
  options: ConfirmDialogOptions;
  onConfirm: (() => void) | null;
  onCancel: (() => void) | null;
  showConfirm: (
    options: ConfirmDialogOptions,
    onConfirm: () => void,
    onCancel?: () => void
  ) => void;
  hideConfirm: () => void;
}

// Create the context
const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

// Custom hook to use the confirm context
export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (context === undefined) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
};

// Props for the provider component
interface ConfirmProviderProps {
  children: ReactNode;
}

// Provider component
export const ConfirmProvider = ({ children }: ConfirmProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions>({
    title: "",
    message: "",
    confirmLabel: "Yes",
    cancelLabel: "Cancel",
    variant: "warning",
    icon: "bi-exclamation-triangle",
    size: "md",
  });
  const [onConfirmCallback, setOnConfirmCallback] = useState<
    (() => void) | null
  >(null);
  const [onCancelCallback, setOnCancelCallback] = useState<(() => void) | null>(
    null
  );

  // Function to show a confirmation dialog
  const showConfirm = useCallback(
    (
      dialogOptions: ConfirmDialogOptions,
      onConfirm: () => void,
      onCancel?: () => void
    ) => {
      setOptions({
        title: dialogOptions.title,
        message: dialogOptions.message,
        confirmLabel: dialogOptions.confirmLabel || "Yes",
        cancelLabel: dialogOptions.cancelLabel || "Cancel",
        variant: dialogOptions.variant || "warning",
        icon: dialogOptions.icon || "bi-exclamation-triangle",
        size: dialogOptions.size || "md",
      });
      setOnConfirmCallback(() => onConfirm);
      setOnCancelCallback(() => onCancel || null);
      setIsOpen(true);
    },
    []
  );

  // Function to hide the confirmation dialog
  const hideConfirm = useCallback(() => {
    setIsOpen(false);
    // We delay clearing the callbacks to avoid UI flicker and allow animations
    setTimeout(() => {
      setOnConfirmCallback(null);
      setOnCancelCallback(null);
    }, 300);
  }, []);

  const handleConfirm = useCallback(() => {
    if (onConfirmCallback) {
      onConfirmCallback();
    }
    hideConfirm();
  }, [onConfirmCallback, hideConfirm]);

  const handleCancel = useCallback(() => {
    if (onCancelCallback) {
      onCancelCallback();
    }
    hideConfirm();
  }, [onCancelCallback, hideConfirm]);

  const value = {
    isOpen,
    options,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
    showConfirm,
    hideConfirm,
  };

  return (
    <ConfirmContext.Provider value={value}>{children}</ConfirmContext.Provider>
  );
};
