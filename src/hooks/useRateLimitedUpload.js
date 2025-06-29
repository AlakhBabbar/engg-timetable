import { useState, useCallback } from 'react';
import { rateLimitedUpload, getUploadQueueStatus, cancelUpload } from '../utils/rateLimitedUpload';

/**
 * Custom hook for rate-limited dataset uploads
 * @param {Function} defaultProcessorFunction - Optional default function to process the upload data
 * @returns {Object} Upload state and functions
 */
export const useRateLimitedUpload = (defaultProcessorFunction = null) => {
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    progress: 0,
    completed: 0,
    total: 0,
    error: null,
    results: null,
    queueStatus: null
  });

  const resetUploadState = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      completed: 0,
      total: 0,
      error: null,
      results: null,
      queueStatus: null
    });
  }, []);

  const handleUpload = useCallback(async (data, options = {}) => {
    // Get processor function from options or use default
    const processorFunction = options.processor || defaultProcessorFunction;
    
    if (!processorFunction) {
      throw new Error('Processor function is required either during hook initialization or in options');
    }

    try {
      // Reset state
      setUploadState(prev => ({
        ...prev,
        isUploading: true,
        progress: 0,
        completed: 0,
        total: data.length,
        error: null,
        results: null,
        queueStatus: getUploadQueueStatus()
      }));

      // Define callbacks
      const onProgress = (progress, completed, total) => {
        setUploadState(prev => ({
          ...prev,
          progress,
          completed,
          total,
          queueStatus: getUploadQueueStatus()
        }));
      };

      const onComplete = (results) => {
        setUploadState(prev => ({
          ...prev,
          results,
          isUploading: false,
          queueStatus: getUploadQueueStatus()
        }));
      };

      const onError = (error) => {
        setUploadState(prev => ({
          ...prev,
          error: error.message || 'Upload failed',
          isUploading: false,
          queueStatus: getUploadQueueStatus()
        }));
      };

      // Start rate-limited upload
      await rateLimitedUpload(data, processorFunction, {
        ...options,
        onProgress,
        onComplete,
        onError
      });

    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        error: error.message || 'Upload initialization failed',
        isUploading: false,
        queueStatus: getUploadQueueStatus()
      }));
    }
  }, [defaultProcessorFunction]);

  const handleCancel = useCallback(() => {
    cancelUpload();
    setUploadState(prev => ({
      ...prev,
      isUploading: false,
      error: 'Upload canceled by user',
      queueStatus: getUploadQueueStatus()
    }));
  }, []);

  const updateQueueStatus = useCallback(() => {
    setUploadState(prev => ({
      ...prev,
      queueStatus: getUploadQueueStatus()
    }));
  }, []);

  return {
    uploadState,
    handleUpload,
    handleCancel,
    resetUploadState,
    updateQueueStatus
  };
};
