/**
 * Timetable Builder Services Index
 * Central export point for all timetable builder functionality
 */

// Import functions needed for service factory
import {
  initializeEmptyTimetable,
  addCourseToTimetable,
  deleteCourse,
  updateTimetableOnDrop,
  mapCoursesToBlocks,
  groupCourseBlocks,
  filterCourses
} from './timetableOperations.js';

import {
  fetchTeachersMap,
  fetchCourses,
  fetchRooms,
  setupTimetableListener,
  saveTimetableToFirestore,
  publishTimetable
} from './firestoreService.js';

import {
  checkConflictsProduction,
  validateCoursePlacement,
  getAllTimetableConflicts,
  conflictResolver,
  filterConflictsAfterDeletion,
  filterConflictsAfterMove
} from './conflictDetection.js';

import {
  resourceValidator,
  courseValidator,
  facultyValidator
} from './validation.js';

import {
  tabOperations,
  createTab,
  updateTabsOnSwitch,
  tabValidator
} from './tabManagement.js';

import {
  historyManager,
  enhancedHistoryManager,
  HISTORY_ACTIONS
} from './historyManager.js';

import {
  dragDropOperations
} from './dragDropOperations.js';

import {
  getCompactTimeFormat,
  getAbbreviatedDay,
  getCellHeight,
  getResponsiveClasses,
  getCompactCourseDisplay,
  getCourseColorClass,
  deepCopy
} from './utils.js';

import {
  TimetableIndex,
  performanceMonitor,
  operationCache
} from './performanceOptimizer.js';

import {
  auditLogger,
  performanceLogger,
  errorLogger,
  AUDIT_ACTIONS
} from './auditLogger.js';

// Re-export all modules
export * from './constants.js';
export * from './timetableOperations.js';
export * from './firestoreService.js';
export * from './conflictDetection.js';
export * from './validation.js';
export * from './tabManagement.js';
export * from './historyManager.js';
export * from './dragDropOperations.js';
export * from './utils.js';
export * from './performanceOptimizer.js';
export * from './auditLogger.js';

/**
 * Service factory for creating configured service instances
 * This provides a way to create pre-configured service objects
 */
export const createTimetableServices = (config = {}) => {
  const {
    enablePerformanceMonitoring = true,
    enableAuditLogging = true,
    cacheEnabled = true,
    maxHistoryEntries = 50
  } = config;

  return {
    // Core services
    timetable: {
      initialize: initializeEmptyTimetable,
      addCourse: addCourseToTimetable,
      deleteCourse,
      updateOnDrop: updateTimetableOnDrop,
      mapCourses: mapCoursesToBlocks,
      groupCourses: groupCourseBlocks,
      filterCourses
    },

    // Firebase services
    firebase: {
      fetchTeachers: fetchTeachersMap,
      fetchCourses,
      fetchRooms,
      setupListener: setupTimetableListener,
      save: saveTimetableToFirestore,
      publish: publishTimetable
    },

    // Conflict services
    conflicts: {
      check: checkConflictsProduction,
      validate: validateCoursePlacement,
      getAll: getAllTimetableConflicts,
      resolver: conflictResolver
    },

    // Validation services
    validation: {
      resource: resourceValidator,
      course: courseValidator,
      faculty: facultyValidator
    },

    // Tab services
    tabs: {
      operations: tabOperations,
      create: createTab,
      updateOnSwitch: updateTabsOnSwitch,
      validate: tabValidator
    },

    // History services
    history: enablePerformanceMonitoring ? enhancedHistoryManager : historyManager,

    // Drag and drop services
    dragDrop: dragDropOperations,

    // Performance services (optional)
    performance: enablePerformanceMonitoring ? {
      index: TimetableIndex,
      monitor: performanceMonitor,
      cache: cacheEnabled ? operationCache : null
    } : null,

    // Logging services (optional)
    logging: enableAuditLogging ? {
      audit: auditLogger,
      performance: performanceLogger,
      error: errorLogger
    } : null,

    // Configuration
    config: {
      performanceMonitoring: enablePerformanceMonitoring,
      auditLogging: enableAuditLogging,
      cacheEnabled,
      maxHistoryEntries
    }
  };
};

/**
 * Default service instance with standard configuration
 * Use this for quick setup with default settings
 */
export const defaultTimetableServices = createTimetableServices({
  enablePerformanceMonitoring: true,
  enableAuditLogging: true,
  cacheEnabled: true,
  maxHistoryEntries: 50
});

/**
 * Lightweight service instance for basic usage
 * Use this for minimal overhead when advanced features aren't needed
 */
export const lightweightTimetableServices = createTimetableServices({
  enablePerformanceMonitoring: false,
  enableAuditLogging: false,
  cacheEnabled: false,
  maxHistoryEntries: 10
});
