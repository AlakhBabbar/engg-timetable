/**
 * Timetable Builder Services - Compatibility Layer
 * 
 * This file serves as a compatibility layer and re-exports all functionality
 * from the organized service modules in the TTBuilder directory.
 * 
 * The original monolithic code has been refactored into separate, maintainable modules:
 * - constants.js: Sample data and configuration
 * - timetableOperations.js: Core timetable CRUD operations
 * - firestoreService.js: Firebase/Firestore integration
 * - conflictDetection.js: Conflict detection and resolution
 * - validation.js: Resource and batch validation
 * - tabManagement.js: Tab operations
 * - historyManager.js: Undo/redo functionality
 * - dragDropOperations.js: Drag and drop handlers
 * - utils.js: Utility functions
 * - performanceOptimizer.js: Performance optimization features
 * - auditLogger.js: Logging and audit trail
 * 
 * @deprecated This compatibility layer exists for backward compatibility.
 * New code should import directly from the TTBuilder modules.
 */

// Re-export all functionality from the organized modules
export * from './TTBuilder/index.js';
