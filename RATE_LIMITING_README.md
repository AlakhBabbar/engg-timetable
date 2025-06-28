# Rate Limited Upload Implementation

## Overview

This implementation adds rate limiting to all dataset upload functionalities in the Admin dashboard to prevent overwhelming the system and respect API rate limits. Each upload operation waits 5 seconds between processing items.

## Features

- **5-second rate limiting**: Each upload item is processed with a 5-second delay between them
- **Queue management**: Multiple uploads are queued and processed sequentially
- **Progress tracking**: Real-time progress indicators show upload status
- **Error handling**: Failed uploads are tracked and reported
- **Visual feedback**: Progress bars and status indicators for better UX

## Implementation Details

### Core Components

1. **RateLimitedUploader** (`src/utils/rateLimitedUpload.js`)
   - Singleton class that manages upload queues
   - Processes uploads with configurable rate limiting
   - Handles batch processing and error recovery

2. **useRateLimitedUpload Hook** (`src/hooks/useRateLimitedUpload.js`)
   - React hook for easy integration with components
   - Provides upload state management and callbacks
   - Handles progress tracking and error states

3. **UploadProgressIndicator** (`src/components/common/UploadProgressIndicator.jsx`)
   - Visual component showing upload progress
   - Displays queue status and rate limiting info
   - Dismissible when uploads complete

4. **RateLimitStatusMonitor** (`src/components/common/RateLimitStatusMonitor.jsx`)
   - Global status monitor for upload queues
   - Shows system-wide upload activity
   - Automatically hides when no uploads are active

### Modified Components

#### SuperAdmin Components
- **TeacherManagement.jsx**: Faculty dataset uploads
- **RoomManagement.jsx**: Room dataset uploads  
- **SuperAdminLayout.jsx**: Added global rate limit monitor

#### HOD Components
- **CourseManagement.jsx**: Course dataset uploads
- **HODLayout.jsx**: Added global rate limit monitor

### Service Methods Added

Each service now includes single-item processing methods for rate-limited uploads:

- `TeacherManagementService.processSingleFacultyImport()`
- `RoomManagementService.processSingleRoomImport()`
- `CourseManagementService.processSingleCourseImport()`

## Usage

### For Existing Upload Components

1. Import the hook and progress indicator:
```jsx
import { useRateLimitedUpload } from '../../hooks/useRateLimitedUpload';
import UploadProgressIndicator from '../common/UploadProgressIndicator';
```

2. Set up the rate-limited upload hook:
```jsx
const { uploadState, handleUpload, resetUploadState } = useRateLimitedUpload(
  // Processor function that handles individual items
  async (itemBatch) => {
    const results = [];
    for (const item of itemBatch) {
      try {
        const result = await YourService.processSingleItem(item);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          item
        });
      }
    }
    return results;
  }
);
```

3. Use in file upload handler:
```jsx
await handleUpload(dataArray, {
  batchSize: 1, // Process one item at a time
  onComplete: (results) => {
    // Handle completion
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    // Show success/error messages
  },
  onError: (error) => {
    setError(`Upload failed: ${error}`);
  }
});
```

4. Add progress indicator to render:
```jsx
<UploadProgressIndicator 
  uploadState={uploadState}
  onDismiss={resetUploadState}
  showQueueInfo={true}
/>
```

## Configuration

### Rate Limit Delay
The default rate limit delay is 5 seconds (5000ms). This can be modified in `src/utils/rateLimitedUpload.js`:

```javascript
this.RATE_LIMIT_DELAY = 5000; // Change this value
```

### Batch Size
Individual components can specify batch size when calling `handleUpload()`:

```javascript
await handleUpload(data, {
  batchSize: 1, // Process 1 item at a time (recommended)
  // ... other options
});
```

## Benefits

1. **System Protection**: Prevents overwhelming the database with rapid consecutive writes
2. **Rate Limit Compliance**: Ensures compliance with Firebase and other API rate limits
3. **Better UX**: Progress indicators keep users informed during long uploads
4. **Error Recovery**: Failed items are tracked and can be retried
5. **Queue Management**: Multiple uploads are handled gracefully without conflicts

## User Experience

- **Visual Feedback**: Users see real-time progress with progress bars
- **Queue Status**: Global status monitor shows when uploads are processing
- **Error Reporting**: Clear error messages for failed uploads
- **Non-blocking**: UI remains responsive during uploads
- **Dismissible**: Progress indicators can be dismissed when complete

## Testing

To test the rate limiting:

1. Upload a JSON dataset with multiple items
2. Observe the progress indicator showing 5-second intervals
3. Check the global queue status monitor in the top-right corner
4. Verify that uploads don't overwhelm the system

## Future Enhancements

- Configurable rate limits per component
- Retry mechanisms for failed uploads
- Upload scheduling and prioritization
- Bulk operation batching optimization
