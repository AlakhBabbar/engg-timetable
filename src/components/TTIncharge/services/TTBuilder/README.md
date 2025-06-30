# Timetable Builder Services

This directory contains the refactored and organized services for the Timetable Builder application. The original monolithic `TimetableBuilder.js` file has been broken down into separate, maintainable modules.

## Directory Structure

```
TTBuilder/
├── index.js                    # Main export file and service factory
├── constants.js                # Sample data and configuration constants
├── timetableOperations.js      # Core timetable CRUD operations
├── firestoreService.js         # Firebase/Firestore integration
├── conflictDetection.js        # Conflict detection and resolution
├── validation.js               # Resource and batch validation
├── tabManagement.js            # Tab operations and state management
├── historyManager.js           # Undo/redo functionality
├── dragDropOperations.js       # Drag and drop handlers
├── utils.js                    # Utility functions
├── performanceOptimizer.js     # Performance optimization features
├── auditLogger.js              # Logging and audit trail
└── README.md                   # This documentation file
```

## Module Overview

### 🏗️ Core Modules

#### `constants.js`
Contains all static data and configuration constants:
- Sample course, faculty, and room data
- Time slots and week days
- Color mappings and UI constants
- Application configuration values

#### `timetableOperations.js`
Core timetable management operations:
- Initialize empty timetable structures
- Add, update, and delete courses
- Map courses to display blocks
- Filter and search functionality

#### `firestoreService.js`
Firebase/Firestore integration:
- Fetch teachers, courses, and rooms
- Real-time timetable listeners
- Save and publish operations
- Data synchronization

### 🔍 Advanced Features

#### `conflictDetection.js`
Production-grade conflict detection:
- Room and faculty conflict detection
- Time slot overlap checking
- Comprehensive validation
- Automatic conflict resolution suggestions

#### `validation.js`
Resource and requirement validation:
- Room capacity validation
- Facility requirement checking
- Faculty workload management
- Break time validation

### 🎛️ User Interface

#### `tabManagement.js`
Multi-tab functionality:
- Create, switch, and close tabs
- Tab state management
- Auto-save tab configurations
- Validation for tab operations

#### `dragDropOperations.js`
Drag and drop functionality:
- Course placement validation
- Visual feedback systems
- Bulk operations
- Auto-arrangement features

#### `historyManager.js`
Undo/redo functionality:
- State history management
- Action tracking and metadata
- Performance-optimized history
- Timeline visualization

### 🚀 Performance & Monitoring

#### `performanceOptimizer.js`
Performance optimization features:
- Fast lookup indexing
- Memory usage monitoring
- Operation caching
- Performance profiling

#### `auditLogger.js`
Comprehensive logging system:
- Audit trail for all actions
- Performance metrics logging
- Error tracking and reporting
- Export capabilities

#### `utils.js`
Common utility functions:
- Deep copy and object manipulation
- Time and date formatting
- Validation helpers
- Browser feature detection

## Usage Examples

### Basic Usage

```javascript
import { 
  initializeEmptyTimetable,
  addCourseToTimetable,
  checkConflictsProduction 
} from './TTBuilder/index.js';

// Initialize a new timetable
const timetable = initializeEmptyTimetable();

// Add a course
const updatedTimetable = addCourseToTimetable(
  timetable, 
  'Monday', 
  '9:00-10:00', 
  course, 
  room
);

// Check for conflicts
const conflicts = checkConflictsProduction(
  updatedTimetable, 
  'Monday', 
  '9:00-10:00', 
  newCourse, 
  selectedRoom
);
```

### Using Service Factory

```javascript
import { createTimetableServices } from './TTBuilder/index.js';

// Create configured services
const services = createTimetableServices({
  enablePerformanceMonitoring: true,
  enableAuditLogging: true,
  cacheEnabled: true
});

// Use services
const timetable = services.timetable.initialize();
const conflicts = services.conflicts.check(timetable, day, slot, course, room);
```

### Advanced Features

```javascript
import { 
  TimetableIndex,
  auditLogger,
  conflictResolver,
  performanceMonitor 
} from './TTBuilder/index.js';

// Build performance indexes
TimetableIndex.buildIndexes(timetableData);

// Log actions
auditLogger.logAction('course_add', { courseId: 'CS101', slot: 'Monday-9:00' });

// Get conflict resolution suggestions
const suggestions = conflictResolver.generateSuggestions(
  timetableData, 
  conflict, 
  availableRooms, 
  availableTeachers
);

// Monitor performance
const profiler = performanceMonitor.createProfiler();
const endMeasurement = profiler.start('complex_operation');
// ... perform operation
endMeasurement();
```

## Migration Guide

If you're updating from the old monolithic structure:

### Before (Old Structure)
```javascript
import { 
  initializeEmptyTimetable,
  checkConflicts,
  saveTimetableToFirestore 
} from '../services/TimetableBuilder.js';
```

### After (New Structure)
```javascript
// Option 1: Use the compatibility layer (recommended for gradual migration)
import { 
  initializeEmptyTimetable,
  checkConflictsProduction as checkConflicts,
  saveTimetableToFirestore 
} from '../services/TimetableBuilder.js';

// Option 2: Import directly from organized modules
import { 
  initializeEmptyTimetable 
} from '../services/TTBuilder/timetableOperations.js';
import { 
  checkConflictsProduction 
} from '../services/TTBuilder/conflictDetection.js';
import { 
  saveTimetableToFirestore 
} from '../services/TTBuilder/firestoreService.js';

// Option 3: Use the service factory
import { defaultTimetableServices } from '../services/TTBuilder/index.js';
const timetable = defaultTimetableServices.timetable.initialize();
```

## Performance Considerations

### Indexing
For large timetables, use the indexing system for fast lookups:

```javascript
import { TimetableIndex } from './TTBuilder/index.js';

// Build indexes once
TimetableIndex.buildIndexes(timetableData);

// Use optimized conflict detection
const conflicts = TimetableIndex.checkConflictsOptimized(day, slot, course, room);
```

### Caching
Enable caching for repeated operations:

```javascript
import { operationCache } from './TTBuilder/index.js';

// Cache expensive computations
const cacheKey = `conflicts_${day}_${slot}`;
let conflicts = operationCache.get(cacheKey);
if (!conflicts) {
  conflicts = checkConflictsProduction(timetableData, day, slot, course, room);
  operationCache.set(cacheKey, conflicts, 60000); // Cache for 1 minute
}
```

## Configuration

### Environment Variables
The system respects these configuration options:

```javascript
const config = {
  enablePerformanceMonitoring: true,  // Enable performance tracking
  enableAuditLogging: true,           // Enable audit trail
  cacheEnabled: true,                 // Enable operation caching
  maxHistoryEntries: 50,              // Maximum undo/redo history
  maxAuditLogs: 1000                  // Maximum audit log entries
};
```

## Testing

Each module is designed to be independently testable:

```javascript
// Example test for timetableOperations.js
import { initializeEmptyTimetable, addCourseToTimetable } from './timetableOperations.js';

describe('Timetable Operations', () => {
  test('should initialize empty timetable', () => {
    const timetable = initializeEmptyTimetable();
    expect(timetable).toHaveProperty('Monday');
    expect(timetable.Monday).toHaveProperty('7:00-7:55');
  });

  test('should add course to timetable', () => {
    const timetable = initializeEmptyTimetable();
    const course = { code: 'CS101', title: 'Introduction to CS' };
    const room = { id: 'A101', name: 'Lecture Hall A' };
    
    const result = addCourseToTimetable(timetable, 'Monday', '7:00-7:55', course, room);
    expect(result.Monday['7:00-7:55']).toMatchObject(course);
  });
});
```

## Contributing

When adding new functionality:

1. Choose the appropriate module or create a new one if needed
2. Follow the existing code style and documentation patterns
3. Add JSDoc comments for all functions
4. Update the exports in `index.js`
5. Add tests for new functionality
6. Update this README if needed

## Future Enhancements

Planned improvements:
- WebWorker support for heavy computations
- Real-time collaboration features
- Advanced analytics and reporting
- Plugin system for custom validators
- GraphQL integration
- Offline support with sync capabilities

## Support

For questions or issues related to the timetable builder services:
1. Check the function documentation in the relevant module
2. Look at usage examples in this README
3. Review the migration guide for compatibility issues
4. Check the audit logs for debugging information
