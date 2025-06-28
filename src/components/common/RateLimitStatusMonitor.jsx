import React, { useState, useEffect } from 'react';
import { FiClock, FiUpload, FiCheckCircle, FiList } from 'react-icons/fi';
import { getUploadQueueStatus } from '../../utils/rateLimitedUpload';

/**
 * Rate Limit Status Monitor Component
 * Shows global upload queue status and rate limiting information
 */
const RateLimitStatusMonitor = ({ className = "" }) => {
  const [queueStatus, setQueueStatus] = useState({
    queueLength: 0,
    isProcessing: false,
    rateLimitDelay: 5000
  });

  useEffect(() => {
    // Update queue status every second
    const interval = setInterval(() => {
      const status = getUploadQueueStatus();
      setQueueStatus(status);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Don't render if no queue activity
  if (queueStatus.queueLength === 0 && !queueStatus.isProcessing) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 bg-white border border-blue-200 rounded-lg shadow-lg p-4 max-w-sm z-40 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <FiUpload className="text-blue-500" size={16} />
        <h3 className="font-medium text-gray-800">Upload Queue Status</h3>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Queue Length:</span>
          <span className="font-medium">{queueStatus.queueLength}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Status:</span>
          <div className="flex items-center gap-1">
            {queueStatus.isProcessing ? (
              <>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-600 font-medium">Processing</span>
              </>
            ) : (
              <>
                <FiList className="text-gray-500" size={12} />
                <span className="text-gray-600">Queued</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Rate Limit:</span>
          <div className="flex items-center gap-1">
            <FiClock className="text-amber-500" size={12} />
            <span className="text-amber-600 font-medium">
              {queueStatus.rateLimitDelay / 1000}s
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <FiCheckCircle size={12} />
          <span>Rate limiting prevents system overload</span>
        </div>
      </div>
    </div>
  );
};

export default RateLimitStatusMonitor;
