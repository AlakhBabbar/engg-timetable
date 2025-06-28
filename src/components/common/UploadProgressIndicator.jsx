import React from 'react';
import { FiUpload, FiClock, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';

/**
 * Upload Progress Indicator Component
 * Shows the progress of rate-limited uploads with queue information
 */
const UploadProgressIndicator = ({ 
  uploadState, 
  onDismiss, 
  className = "",
  showQueueInfo = true 
}) => {
  const { 
    isUploading, 
    progress, 
    completed, 
    total, 
    error, 
    results, 
    queueStatus 
  } = uploadState;

  // Don't render if no upload activity
  if (!isUploading && !results && !error) {
    return null;
  }

  const getStatusIcon = () => {
    if (error) return <FiAlertCircle className="text-red-500" size={20} />;
    if (results && !isUploading) return <FiCheckCircle className="text-green-500" size={20} />;
    if (isUploading) return <FiLoader className="text-blue-500 animate-spin" size={20} />;
    return <FiUpload className="text-gray-500" size={20} />;
  };

  const getStatusText = () => {
    if (error) return 'Upload Failed';
    if (results && !isUploading) return 'Upload Complete';
    if (isUploading) return 'Uploading...';
    return 'Ready to Upload';
  };

  const getStatusColor = () => {
    if (error) return 'border-red-200 bg-red-50';
    if (results && !isUploading) return 'border-green-200 bg-green-50';
    if (isUploading) return 'border-blue-200 bg-blue-50';
    return 'border-gray-200 bg-gray-50';
  };

  const successful = results ? results.filter(r => r.success).length : 0;
  const failed = results ? results.filter(r => !r.success).length : 0;

  return (
    <div className={`fixed bottom-4 right-4 max-w-sm w-full z-50 ${className}`}>
      <div className={`rounded-lg border-2 p-4 shadow-lg backdrop-blur-sm ${getStatusColor()}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium text-gray-800">{getStatusText()}</span>
          </div>
          
          {onDismiss && !isUploading && (
            <button 
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              ×
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {isUploading && total > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress: {completed}/{total}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Rate Limiting Info */}
        {isUploading && (
          <div className="mb-3 p-2 bg-white/70 rounded text-xs text-gray-600">
            <div className="flex items-center gap-1 mb-1">
              <FiClock size={12} />
              <span>Rate Limited Upload (5 sec intervals)</span>
            </div>
            {showQueueInfo && (
              <div className="space-y-1">
                {total > 0 && (
                  <div>Remaining: {total - completed} of {total} items</div>
                )}
                {queueStatus && queueStatus.queueLength > 0 && (
                  <div>Queued tasks: {queueStatus.queueLength}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Results Summary */}
        {results && !isUploading && (
          <div className="text-sm">
            {successful === total ? (
              <div className="text-green-700 font-medium">
                ✅ Successfully uploaded {successful} items
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-green-700">✅ Success: {successful}</div>
                {failed > 0 && (
                  <div className="text-red-700">❌ Failed: {failed}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-700 font-medium">
            ❌ {error}
          </div>
        )}

        {/* Queue Status */}
        {showQueueInfo && queueStatus && (queueStatus.queueLength > 0 || queueStatus.isProcessing) && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <FiClock size={12} />
              <span>
                {queueStatus.isProcessing ? 'Processing...' : 'Queued'} 
                {queueStatus.queueLength > 0 && ` (${queueStatus.queueLength} pending)`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadProgressIndicator;
