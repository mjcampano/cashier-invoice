import React, { useCallback, useMemo, useState } from "react";
import NotificationContext from "./NotificationContext";

const DEFAULT_TOAST_DURATION = 4000;

export default function NotificationProvider({ children }) {
  const [alert, setAlert] = useState(null);
  const [validation, setValidation] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((targetId) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== targetId));
  }, []);

  const showToast = useCallback(
    (message, options = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const toast = {
        id,
        message,
        type: options.type || "success",
      };

      setToasts((prev) => [...prev, toast]);

      const duration =
        typeof options.duration === "number" ? options.duration : DEFAULT_TOAST_DURATION;
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);

      return () => {
        clearTimeout(timer);
        removeToast(id);
      };
    },
    [removeToast]
  );

  const showAlert = useCallback((message, options = {}) => {
    setAlert({
      message,
      variant: options.variant || "info",
    });
  }, []);

  const showValidation = useCallback((message) => {
    setValidation(message);
  }, []);

  const clearValidation = useCallback(() => {
    setValidation(null);
  }, []);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setConfirmation({
        message,
        title: options.title || "Are you sure?",
        confirmLabel: options.confirmLabel || "Confirm",
        cancelLabel: options.cancelLabel || "Cancel",
        resolve,
      });
    });
  }, []);

  const handleConfirmation = useCallback((accepted) => {
    setConfirmation((current) => {
      if (!current) return null;
      current.resolve(accepted);
      return null;
    });
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      showAlert,
      showValidation,
      clearValidation,
      confirm,
    }),
    [showToast, showAlert, showValidation, clearValidation, confirm]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {alert && (
        <div className={`notification-banner notification-banner--${alert.variant}`}>
          <span>{alert.message}</span>
          <button
            type="button"
            className="notification-banner__close"
            onClick={() => setAlert(null)}
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}

      {validation && (
        <div className="validation-banner">
          <span>{validation}</span>
          <button
            type="button"
            className="validation-banner__close"
            onClick={clearValidation}
            aria-label="Dismiss validation message"
          >
            ×
          </button>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast--${toast.type}`}>
              <span>{toast.message}</span>
              <button
                type="button"
                className="toast__close"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss toast"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <p className="confirmation-title">{confirmation.title}</p>
            <p className="confirmation-message">{confirmation.message}</p>
            <div className="confirmation-actions">
              <button
                type="button"
                className="actionBtn"
                onClick={() => handleConfirmation(false)}
              >
                {confirmation.cancelLabel}
              </button>
              <button
                type="button"
                className="actionBtn danger"
                onClick={() => handleConfirmation(true)}
              >
                {confirmation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
