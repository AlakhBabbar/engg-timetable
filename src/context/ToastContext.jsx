import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/common/Toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', options = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type,
      duration: options.duration !== undefined ? options.duration : 5000,
      details: options.details || null,
      ...options
    };

    setToasts(prev => [...prev, toast]);

    // Auto remove toast after duration (if duration > 0)
    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Helper methods for different toast types
  const showSuccess = useCallback((message, options = {}) => {
    return addToast(message, 'success', options);
  }, [addToast]);

  const showError = useCallback((message, options = {}) => {
    return addToast(message, 'error', { duration: 8000, ...options });
  }, [addToast]);

  const showWarning = useCallback((message, options = {}) => {
    return addToast(message, 'warning', { duration: 6000, ...options });
  }, [addToast]);

  const showInfo = useCallback((message, options = {}) => {
    return addToast(message, 'info', options);
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Render toasts */}
      <div className="fixed top-4 right-4 z-[70] space-y-3 w-96 max-w-[calc(100vw-2rem)]">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            style={{
              transform: `translateY(${index * 8}px)`,
              zIndex: 1200 - index
            }}
          >
            <Toast
              message={toast.message}
              type={toast.type}
              duration={0} // Managed by provider
              details={toast.details}
              onClose={() => removeToast(toast.id)}
              isVisible={true}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
