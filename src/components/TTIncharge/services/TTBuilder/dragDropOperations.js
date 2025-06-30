/**
 * Drag and Drop Operations
 * Handles all drag and drop functionality for timetable courses
 */

import { updateTimetableOnDrop, deleteCourse } from './timetableOperations.js';
import { checkConflictsProduction } from './conflictDetection.js';
import { filterConflictsAfterDeletion, filterConflictsAfterMove } from './conflictDetection.js';

/**
 * Drag and drop operations for timetable
 */
export const dragDropOperations = {
  /**
   * Handle course deletion from timetable
   * @param {Object} timetableData - Current timetable data
   * @param {string} day - Day of the week
   * @param {string} slot - Time slot
   * @param {Array} conflicts - Current conflicts array
   * @returns {Object} Updated timetable and conflicts
   */
  deleteCourse: (timetableData, day, slot, conflicts) => {
    const newTimetable = deleteCourse(timetableData, day, slot);
    const newConflicts = filterConflictsAfterDeletion(conflicts, day, slot);
    return {
      timetable: newTimetable,
      conflicts: newConflicts
    };
  },

  /**
   * Handle course drop on timetable
   * @param {Object} params - Parameters object
   * @returns {Object} Updated timetable and conflicts
   */
  handleDrop: ({
    timetableData, day, slot, draggedCourse, selectedRoom,
    dragSourceInfo, conflicts
  }) => {
    // Ensure room is properly set
    let roomToAssign = selectedRoom;
    if (!roomToAssign || !roomToAssign.id) {
      roomToAssign = { id: '', name: '', capacity: '', availability: '' };
    }

    // Update timetable
    const newTimetable = updateTimetableOnDrop(
      timetableData, day, slot, draggedCourse, roomToAssign, dragSourceInfo
    );

    // Handle conflicts
    let updatedConflicts = conflicts;
    if (dragSourceInfo) {
      updatedConflicts = filterConflictsAfterMove(
        conflicts, dragSourceInfo.day, dragSourceInfo.slot
      );
    }

    // Check for new conflicts using production-level detection
    const newConflicts = checkConflictsProduction(newTimetable, day, slot, draggedCourse, roomToAssign);
    const finalConflicts = [
      ...updatedConflicts.filter(c => !(c.day === day && c.slot === slot)),
      ...newConflicts
    ];

    return {
      timetable: newTimetable,
      conflicts: finalConflicts
    };
  },

  /**
   * Validate drop target before allowing drop
   * @param {Object} params - Validation parameters
   * @returns {Object} Validation result
   */
  validateDropTarget: ({
    timetableData, day, slot, draggedCourse, selectedRoom
  }) => {
    // Check if target slot is valid
    if (!day || !slot) {
      return {
        isValid: false,
        message: 'Invalid drop target'
      };
    }

    // Check if course already exists in target slot
    const existingCourse = timetableData[day]?.[slot];
    if (existingCourse && existingCourse.code) {
      return {
        isValid: false,
        message: 'Slot already occupied',
        conflictType: 'slot_occupied'
      };
    }

    // Check for conflicts
    const conflicts = checkConflictsProduction(timetableData, day, slot, draggedCourse, selectedRoom);
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical');

    if (criticalConflicts.length > 0) {
      return {
        isValid: false,
        message: 'Cannot place course due to conflicts',
        conflicts: criticalConflicts
      };
    }

    return {
      isValid: true,
      message: 'Valid drop target',
      warnings: conflicts.filter(c => c.severity === 'warning')
    };
  },

  /**
   * Prepare course data for dragging
   * @param {Object} course - Course to prepare for drag
   * @param {string} sourceType - Type of source ('courseList' or 'timetable')
   * @param {Object} sourceLocation - Location information if dragged from timetable
   * @returns {Object} Prepared drag data
   */
  prepareDragData: (course, sourceType, sourceLocation = null) => {
    const dragData = {
      course: { ...course },
      sourceType,
      timestamp: Date.now()
    };

    if (sourceType === 'timetable' && sourceLocation) {
      dragData.sourceLocation = {
        day: sourceLocation.day,
        slot: sourceLocation.slot
      };
    }

    return dragData;
  },

  /**
   * Handle drag start event
   * @param {Object} course - Course being dragged
   * @param {string} sourceType - Source type
   * @param {Object} sourceLocation - Source location if from timetable
   * @returns {Object} Drag state
   */
  handleDragStart: (course, sourceType, sourceLocation = null) => {
    const dragData = dragDropOperations.prepareDragData(course, sourceType, sourceLocation);
    
    return {
      isDragging: true,
      draggedCourse: course,
      dragData,
      dragStartTime: Date.now()
    };
  },

  /**
   * Handle drag end event
   * @returns {Object} Updated drag state
   */
  handleDragEnd: () => {
    return {
      isDragging: false,
      draggedCourse: null,
      dragData: null,
      dragStartTime: null
    };
  },

  /**
   * Handle drag over event for drop zones
   * @param {Event} event - Drag event
   * @param {string} day - Target day
   * @param {string} slot - Target slot
   * @returns {Object} Drag over state
   */
  handleDragOver: (event, day, slot) => {
    event.preventDefault();
    
    return {
      dragOverTarget: { day, slot },
      isDragOver: true
    };
  },

  /**
   * Handle drag leave event
   * @returns {Object} Updated drag state
   */
  handleDragLeave: () => {
    return {
      dragOverTarget: null,
      isDragOver: false
    };
  },

  /**
   * Check if drop is allowed based on current drag state
   * @param {Object} dragState - Current drag state
   * @param {string} targetDay - Target day
   * @param {string} targetSlot - Target slot
   * @returns {boolean} Whether drop is allowed
   */
  isDropAllowed: (dragState, targetDay, targetSlot) => {
    if (!dragState.isDragging || !dragState.draggedCourse) {
      return false;
    }

    // Don't allow dropping on the same location
    if (dragState.dragData?.sourceType === 'timetable' && 
        dragState.dragData?.sourceLocation) {
      const source = dragState.dragData.sourceLocation;
      if (source.day === targetDay && source.slot === targetSlot) {
        return false;
      }
    }

    return true;
  },

  /**
   * Get visual feedback for drag operations
   * @param {Object} dragState - Current drag state
   * @param {string} targetDay - Target day
   * @param {string} targetSlot - Target slot
   * @param {Object} validationResult - Drop validation result
   * @returns {Object} Visual feedback classes and styles
   */
  getDragFeedback: (dragState, targetDay, targetSlot, validationResult) => {
    const feedback = {
      classes: [],
      styles: {},
      showIndicator: false,
      indicatorType: 'info'
    };

    if (!dragState.isDragging) {
      return feedback;
    }

    const isCurrentTarget = dragState.dragOverTarget?.day === targetDay && 
                           dragState.dragOverTarget?.slot === targetSlot;

    if (isCurrentTarget) {
      feedback.showIndicator = true;
      
      if (validationResult.isValid) {
        feedback.classes.push('drag-over-valid');
        feedback.indicatorType = 'success';
      } else {
        feedback.classes.push('drag-over-invalid');
        feedback.indicatorType = 'error';
      }
    }

    // Add visual cues for valid drop zones
    if (dragState.isDragging && validationResult.isValid) {
      feedback.classes.push('drop-zone-valid');
    } else if (dragState.isDragging) {
      feedback.classes.push('drop-zone-invalid');
    }

    return feedback;
  },

  /**
   * Handle bulk drag and drop operations
   * @param {Array} courses - Multiple courses to move
   * @param {Object} targetLocation - Target location pattern
   * @param {Object} timetableData - Current timetable data
   * @returns {Object} Results of bulk operation
   */
  handleBulkDrop: (courses, targetLocation, timetableData) => {
    const results = {
      successful: [],
      failed: [],
      conflicts: []
    };

    courses.forEach((course, index) => {
      try {
        // Calculate target slot based on pattern
        const targetDay = targetLocation.day;
        const baseSlotIndex = parseInt(targetLocation.slot) || 0;
        const targetSlot = `${baseSlotIndex + index}:00-${baseSlotIndex + index + 1}:00`;

        // Validate and attempt placement
        const validation = dragDropOperations.validateDropTarget({
          timetableData,
          day: targetDay,
          slot: targetSlot,
          draggedCourse: course,
          selectedRoom: targetLocation.room
        });

        if (validation.isValid) {
          results.successful.push({
            course,
            targetDay,
            targetSlot
          });
        } else {
          results.failed.push({
            course,
            reason: validation.message,
            conflicts: validation.conflicts
          });
        }
      } catch (error) {
        results.failed.push({
          course,
          reason: `Unexpected error: ${error.message}`
        });
      }
    });

    return results;
  },

  /**
   * Auto-arrange courses in available slots
   * @param {Array} courses - Courses to arrange
   * @param {Object} timetableData - Current timetable data
   * @param {Object} preferences - Arrangement preferences
   * @returns {Object} Arrangement result
   */
  autoArrangeCourses: (courses, timetableData, preferences = {}) => {
    const arrangement = {
      placements: [],
      unplaced: [],
      conflicts: []
    };

    const {
      preferredDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      preferredTimeSlots = [],
      avoidBackToBack = true
    } = preferences;

    courses.forEach(course => {
      let placed = false;

      // Try preferred days first
      for (const day of preferredDays) {
        if (placed) break;

        const daySlots = timetableData[day] || {};
        
        for (const slot of Object.keys(daySlots)) {
          if (placed) break;

          // Skip if slot is occupied
          if (daySlots[slot] && daySlots[slot].code) {
            continue;
          }

          // Check conflicts
          const validation = dragDropOperations.validateDropTarget({
            timetableData,
            day,
            slot,
            draggedCourse: course,
            selectedRoom: preferences.defaultRoom
          });

          if (validation.isValid) {
            arrangement.placements.push({
              course,
              day,
              slot,
              room: preferences.defaultRoom
            });
            
            // Update timetable data for next iteration
            timetableData[day][slot] = {
              ...course,
              room: preferences.defaultRoom?.id || ''
            };
            
            placed = true;
          }
        }
      }

      if (!placed) {
        arrangement.unplaced.push(course);
      }
    });

    return arrangement;
  }
};
