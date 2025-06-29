import React, { useState, useEffect } from 'react';
import { FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const Toast = ({ 
  message, 
  type = 'info', 
  duration = 5000, 
  onClose, 
  isVisible = true,
  details = null 
}) => {
  const [show, setShow] = useState(isVisible);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setShow(isVisible);
  }, [isVisible]);

  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  const handleClose = () => {
    setShow(false);
    setTimeout(() => {
      onClose && onClose();
    }, 300); // Wait for animation to complete
  };

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-800',
          icon: <FiCheckCircle className="text-green-500" size={20} />,
          accent: 'border-l-green-500'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          icon: <FiAlertCircle className="text-red-500" size={20} />,
          accent: 'border-l-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-800',
          icon: <FiAlertTriangle className="text-yellow-500" size={20} />,
          accent: 'border-l-yellow-500'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          icon: <FiInfo className="text-blue-500" size={20} />,
          accent: 'border-l-blue-500'
        };
    }
  };

  const styles = getToastStyles();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full"
        >
          <div className={`rounded-lg border-l-4 ${styles.accent} ${styles.bg} border ${styles.bg} shadow-lg backdrop-blur-sm`}>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0 mt-0.5">
                    {styles.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${styles.text}`}>
                      {message}
                    </p>
                    {details && (
                      <div className="mt-2">
                        <button
                          onClick={() => setShowDetails(!showDetails)}
                          className={`text-xs ${styles.text} hover:underline focus:outline-none`}
                        >
                          {showDetails ? 'Hide details' : 'Show details'}
                        </button>
                        {showDetails && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`mt-2 text-xs ${styles.text} bg-white bg-opacity-50 rounded p-2 max-h-32 overflow-y-auto`}
                          >
                            {typeof details === 'string' ? (
                              <pre className="whitespace-pre-wrap">{details}</pre>
                            ) : (
                              <div>
                                {details.map((detail, index) => (
                                  <div key={index} className="mb-1">
                                    <span className="font-medium">
                                      {detail.item?.roomNumber || `Item ${index + 1}`}:
                                    </span>{' '}
                                    {detail.error}
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className={`flex-shrink-0 ml-3 ${styles.text} hover:opacity-70 focus:outline-none`}
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
