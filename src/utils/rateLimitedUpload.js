/**
 * Rate Limited Upload Utility
 * 
 * This utility provides rate-limited upload functionality for dataset uploads
 * to prevent overwhelming the system and respect rate limits.
 */

class RateLimitedUploader {
  constructor() {
    this.uploadQueue = [];
    this.isProcessing = false;
    this.RATE_LIMIT_DELAY = 5000; // 5 seconds
  }

  /**
   * Add upload task to the queue
   * @param {Object} uploadTask - The upload task object
   * @param {Function} uploadTask.processor - The upload processor function
   * @param {Array} uploadTask.data - The data to upload
   * @param {Object} uploadTask.options - Additional options
   * @param {Function} uploadTask.onProgress - Progress callback function
   * @param {Function} uploadTask.onComplete - Completion callback function
   * @param {Function} uploadTask.onError - Error callback function
   */
  async addToQueue(uploadTask) {
    return new Promise((resolve, reject) => {
      const task = {
        ...uploadTask,
        resolve,
        reject,
        id: Date.now() + Math.random()
      };

      this.uploadQueue.push(task);

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the upload queue with rate limiting
   */
  async processQueue() {
    if (this.isProcessing || this.uploadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.uploadQueue.length > 0) {
        const task = this.uploadQueue.shift();
        
        try {
          await this.processUploadTask(task);
          task.resolve({ success: true });
        } catch (error) {
          console.error('Upload task failed:', error);
          task.reject(error);
          
          if (task.onError) {
            task.onError(error);
          }
        }

        // Wait for rate limit delay before processing next item
        if (this.uploadQueue.length > 0) {
          await this.delay(this.RATE_LIMIT_DELAY);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual upload task
   * @param {Object} task - The upload task
   */
  async processUploadTask(task) {
    const { processor, data, options, onProgress, onComplete } = task;

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array');
    }

    const results = [];
    const batchSize = options?.batchSize || 1;
    
    // Process data in batches to respect rate limits
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      try {
        // Call the processor function for this batch
        const batchResult = await processor(batch, options);
        results.push(...batchResult);

        // Report progress
        if (onProgress) {
          const progress = Math.round(((i + batch.length) / data.length) * 100);
          onProgress(progress, i + batch.length, data.length);
        }

        // Add delay between batches (except for the last batch)
        if (i + batchSize < data.length) {
          await this.delay(this.RATE_LIMIT_DELAY);
        }

      } catch (error) {
        console.error(`Batch upload failed for items ${i} to ${i + batch.length - 1}:`, error);
        
        // Add failed results for this batch
        for (let j = 0; j < batch.length; j++) {
          results.push({
            success: false,
            error: error.message,
            item: batch[j],
            index: i + j
          });
        }
      }
    }

    // Call completion callback
    if (onComplete) {
      onComplete(results);
    }

    return results;
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.uploadQueue.length,
      isProcessing: this.isProcessing,
      rateLimitDelay: this.RATE_LIMIT_DELAY
    };
  }

  /**
   * Clear the upload queue
   */
  clearQueue() {
    this.uploadQueue = [];
    this.isProcessing = false;
  }
}

// Create a singleton instance
const rateLimitedUploader = new RateLimitedUploader();

/**
 * Rate-limited upload function for dataset uploads
 * @param {Array} data - Array of items to upload
 * @param {Function} processorFunction - Function that processes the data
 * @param {Object} options - Upload options
 * @param {number} options.batchSize - Number of items to process per batch (default: 1)
 * @param {Function} options.onProgress - Progress callback (progress, completed, total)
 * @param {Function} options.onComplete - Completion callback (results)
 * @param {Function} options.onError - Error callback (error)
 * @returns {Promise} Promise that resolves when upload is complete
 */
export const rateLimitedUpload = async (data, processorFunction, options = {}) => {
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }

  if (typeof processorFunction !== 'function') {
    throw new Error('Processor function must be provided');
  }

  return rateLimitedUploader.addToQueue({
    processor: processorFunction,
    data,
    options,
    onProgress: options.onProgress,
    onComplete: options.onComplete,
    onError: options.onError
  });
};

/**
 * Get upload queue status
 */
export const getUploadQueueStatus = () => {
  return rateLimitedUploader.getQueueStatus();
};

/**
 * Clear upload queue
 */
export const clearUploadQueue = () => {
  rateLimitedUploader.clearQueue();
};

export default rateLimitedUploader;
