/**
 * Conflict Detection and Resolution System
 * Advanced conflict detection with resolution suggestions
 */

import { timeSlots } from './constants.js';
import { deepCopy } from './utils.js';

/**
 * Extract faculty ID from course object with multiple possible structures
 */
export const extractFacultyId = (course) => {
  if (!course) return null;
  
  // Try different possible structures
  return course.teacherId || 
         course.facultyId ||
         course.teacher?.id ||
         course.faculty?.id ||
         course.instructor?.id ||
         null;
};

/**
 * Check if two time slots overlap based on their start times and durations
 */
const checkTimeSlotOverlap = (slot1, slot2, duration1 = 1, duration2 = 1) => {
  // Parse time slots (format: "HH:MM-HH:MM")
  const parseTimeSlot = (slot) => {
    const [start, end] = slot.split('-');
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    return {
      start: startHour * 60 + startMin,
      end: endHour * 60 + endMin
    };
  };
  
  try {
    const time1 = parseTimeSlot(slot1);
    const time2 = parseTimeSlot(slot2);
    
    // Extend durations if courses are longer than the base slot
    const duration1Minutes = (duration1 || 1) * (time1.end - time1.start);
    const duration2Minutes = (duration2 || 1) * (time2.end - time2.start);
    
    const end1 = time1.start + duration1Minutes;
    const end2 = time2.start + duration2Minutes;
    
    // Check for overlap: courses overlap if one starts before the other ends
    return (time1.start < end2 && time2.start < end1);
  } catch (error) {
    console.warn('Error parsing time slots for overlap check:', error);
    return false;
  }
};

/**
 * PRODUCTION-LEVEL CONFLICT DETECTION SYSTEM
 * This replaces the flawed checkConflicts function
 */
export const checkConflictsProduction = (timetableData, targetDay, targetSlot, newCourse, selectedRoom) => {
  const conflicts = [];
  
  // Extract faculty/teacher ID from the new course being placed
  const newFacultyId = extractFacultyId(newCourse);
  const newRoomId = selectedRoom?.id || selectedRoom?.number;
  
  // Check all existing courses in the timetable for conflicts
  Object.keys(timetableData).forEach(day => {
    Object.keys(timetableData[day] || {}).forEach(slot => {
      const existingCourse = timetableData[day][slot];
      
      // Skip empty slots or the target slot itself
      if (!existingCourse || !existingCourse.code || (day === targetDay && slot === targetSlot)) {
        return;
      }
      
      // ROOM CONFLICT: Same room, same time slot, same day
      if (newRoomId && existingCourse.room === newRoomId && day === targetDay && slot === targetSlot) {
        conflicts.push({
          type: 'room',
          severity: 'critical',
          message: `Room ${newRoomId} is already booked for ${existingCourse.code} (${existingCourse.name || 'Unknown Course'}) at ${slot} on ${day}`,
          conflictingCourse: {
            code: existingCourse.code,
            name: existingCourse.name,
            day: day,
            slot: slot,
            room: existingCourse.room
          },
          day: targetDay,
          slot: targetSlot,
          suggestedActions: [
            'Choose a different room',
            'Move to a different time slot',
            'Reschedule the conflicting course'
          ]
        });
      }
      
      // FACULTY CONFLICT: Same faculty, same time slot, same day
      const existingFacultyId = extractFacultyId(existingCourse);
      if (newFacultyId && existingFacultyId && newFacultyId === existingFacultyId && 
          day === targetDay && slot === targetSlot) {
        const facultyName = existingCourse.teacher?.name || existingCourse.faculty?.name || `Faculty ID: ${existingFacultyId}`;
        conflicts.push({
          type: 'faculty',
          severity: 'critical',
          message: `${facultyName} is already teaching ${existingCourse.code} (${existingCourse.name || 'Unknown Course'}) at ${slot} on ${day}`,
          conflictingCourse: {
            code: existingCourse.code,
            name: existingCourse.name,
            day: day,
            slot: slot,
            faculty: facultyName
          },
          day: targetDay,
          slot: targetSlot,
          suggestedActions: [
            'Assign a different faculty member',
            'Move to a different time slot',
            'Reschedule the conflicting course'
          ]
        });
      }
      
      // ADVANCED: Check for overlapping time slots (for multi-hour courses)
      const timeOverlap = checkTimeSlotOverlap(targetSlot, slot, newCourse.duration, existingCourse.duration);
      if (timeOverlap && day === targetDay) {
        // Room conflict due to time overlap
        if (newRoomId && existingCourse.room === newRoomId) {
          conflicts.push({
            type: 'room_overlap',
            severity: 'critical',
            message: `Room ${newRoomId} has overlapping time slots: ${targetSlot} overlaps with ${slot}`,
            conflictingCourse: existingCourse,
            day: targetDay,
            slot: targetSlot
          });
        }
        
        // Faculty conflict due to time overlap
        if (newFacultyId && existingFacultyId && newFacultyId === existingFacultyId) {
          const facultyName = existingCourse.teacher?.name || existingCourse.faculty?.name || `Faculty ID: ${existingFacultyId}`;
          conflicts.push({
            type: 'faculty_overlap',
            severity: 'critical',
            message: `${facultyName} has overlapping teaching slots: ${targetSlot} overlaps with ${slot}`,
            conflictingCourse: existingCourse,
            day: targetDay,
            slot: targetSlot
          });
        }
      }
    });
  });
  
  return conflicts;
};

/**
 * Legacy conflict detection for backward compatibility
 */
export const checkConflicts = (timetableData, day, slot, course, selectedRoom) => {
  const conflicts = [];
  
  // Check for room conflicts
  Object.keys(timetableData).forEach(d => {
    Object.keys(timetableData[d]).forEach(s => {
      const existingCourse = timetableData[d][s];
      if (existingCourse && existingCourse.room === selectedRoom.id && d === day && s === slot) {
        conflicts.push({
          type: 'room',
          message: `Room ${selectedRoom.id} already booked for ${existingCourse.id} at ${slot} on ${day}`,
          day,
          slot
        });
      }
    });
  });
  
  // Check for faculty conflicts
  const facultyId = (course.faculty && course.faculty.id) ? course.faculty.id : (course.teacher && course.teacher.id ? course.teacher.id : undefined);
  if (facultyId) {
    Object.keys(timetableData).forEach(d => {
      Object.keys(timetableData[d]).forEach(s => {
        const existingCourse = timetableData[d][s];
        const existingFacultyId = existingCourse?.faculty?.id || existingCourse?.teacher?.id;
        if (existingCourse && existingFacultyId === facultyId && d === day && s === slot) {
          conflicts.push({
            type: 'faculty',
            message: `Faculty already scheduled for ${existingCourse.id} at ${slot} on ${day}`,
            day,
            slot
          });
        }
      });
    });
  }
  
  return conflicts;
};

/**
 * Get all conflicts for the entire timetable (for comprehensive validation)
 */
export const getAllTimetableConflicts = (timetableData) => {
  const allConflicts = [];
  
  Object.keys(timetableData).forEach(day => {
    Object.keys(timetableData[day] || {}).forEach(slot => {
      const course = timetableData[day][slot];
      if (course && course.code) {
        // Check conflicts for this course against all other courses
        const courseConflicts = checkConflictsProduction(
          timetableData, 
          day, 
          slot, 
          course, 
          { id: course.room }
        );
        allConflicts.push(...courseConflicts);
      }
    });
  });
  
  // Remove duplicates (same conflict detected from both sides)
  return deduplicateConflicts(allConflicts);
};

/**
 * Remove duplicate conflicts
 */
const deduplicateConflicts = (conflicts) => {
  const seen = new Set();
  return conflicts.filter(conflict => {
    const key = `${conflict.type}-${conflict.day}-${conflict.slot}-${conflict.conflictingCourse?.code}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/**
 * Validate course placement before allowing drop (prevents invalid placements)
 */
export const validateCoursePlacement = (timetableData, day, slot, course, selectedRoom) => {
  const conflicts = checkConflictsProduction(timetableData, day, slot, course, selectedRoom);
  const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
  
  return {
    isValid: criticalConflicts.length === 0,
    conflicts: conflicts,
    criticalConflicts: criticalConflicts,
    canPlace: criticalConflicts.length === 0,
    warnings: conflicts.filter(c => c.severity === 'warning')
  };
};

/**
 * Filter conflicts after course deletion
 * @param {Array} conflicts - Current conflicts
 * @param {string} day - Day where course was deleted
 * @param {string} slot - Slot where course was deleted
 * @returns {Array} Filtered conflicts
 */
export const filterConflictsAfterDeletion = (conflicts, day, slot) => {
  if (!Array.isArray(conflicts)) {
    return [];
  }
  return conflicts.filter(conflict => 
    !(conflict.day === day && conflict.slot === slot)
  );
};

/**
 * Filter conflicts after course move
 * @param {Array} conflicts - Current conflicts
 * @param {string} sourceDay - Source day
 * @param {string} sourceSlot - Source slot
 * @returns {Array} Filtered conflicts
 */
export const filterConflictsAfterMove = (conflicts, sourceDay, sourceSlot) => {
  if (!Array.isArray(conflicts)) {
    return [];
  }
  return conflicts.filter(conflict => 
    !(conflict.day === sourceDay && conflict.slot === sourceSlot)
  );
};

/**
 * Conflict resolution suggestions system
 */
export const conflictResolver = {
  /**
   * Generate suggestions for resolving conflicts
   */
  generateSuggestions: (timetableData, conflictData, allRooms, allTeachers) => {
    const suggestions = [];
    
    switch (conflictData.type) {
      case 'room':
        suggestions.push(...conflictResolver.getRoomConflictSuggestions(
          timetableData, conflictData, allRooms
        ));
        break;
      case 'faculty':
        suggestions.push(...conflictResolver.getFacultyConflictSuggestions(
          timetableData, conflictData, allTeachers
        ));
        break;
    }
    
    return suggestions;
  },
  
  /**
   * Get suggestions for room conflicts
   */
  getRoomConflictSuggestions: (timetableData, conflict, allRooms) => {
    const suggestions = [];
    const { day, slot } = conflict;
    
    // Find alternative rooms
    const availableRooms = allRooms.filter(room => {
      const existingCourse = timetableData[day]?.[slot];
      if (!existingCourse) return true;
      
      // Check if this room is free at this time
      return !Object.keys(timetableData).some(d => 
        Object.keys(timetableData[d] || {}).some(s => {
          const course = timetableData[d][s];
          return course && course.room === room.id && d === day && s === slot;
        })
      );
    });
    
    availableRooms.forEach(room => {
      suggestions.push({
        type: 'room_change',
        priority: 'high',
        title: `Use Room ${room.number || room.id}`,
        description: `Move course to ${room.number || room.id} (${room.type}, capacity: ${room.capacity})`,
        action: {
          type: 'change_room',
          roomId: room.id,
          day,
          slot
        },
        estimatedEffort: 'Low'
      });
    });
    
    // Find alternative time slots
    const alternativeSlots = conflictResolver.findAlternativeTimeSlots(
      timetableData, day, slot, conflict.conflictingCourse
    );
    
    alternativeSlots.forEach(altSlot => {
      suggestions.push({
        type: 'time_change',
        priority: 'medium',
        title: `Move to ${altSlot.day} at ${altSlot.slot}`,
        description: `Reschedule course to ${altSlot.day} ${altSlot.slot}`,
        action: {
          type: 'change_time',
          newDay: altSlot.day,
          newSlot: altSlot.slot,
          originalDay: day,
          originalSlot: slot
        },
        estimatedEffort: 'Medium'
      });
    });
    
    return suggestions;
  },
  
  /**
   * Get suggestions for faculty conflicts
   */
  getFacultyConflictSuggestions: (timetableData, conflict, allTeachers) => {
    const suggestions = [];
    const { day, slot, conflictingCourse } = conflict;
    
    // Find alternative teachers for the same course
    const courseCode = conflictingCourse.code;
    const availableTeachers = allTeachers.filter(teacher => {
      // Check if teacher is available at this time
      return !Object.keys(timetableData).some(d => 
        Object.keys(timetableData[d] || {}).some(s => {
          const course = timetableData[d][s];
          const facultyId = extractFacultyId(course);
          return course && facultyId === teacher.id && d === day && s === slot;
        })
      );
    });
    
    availableTeachers.forEach(teacher => {
      suggestions.push({
        type: 'faculty_change',
        priority: 'high',
        title: `Assign ${teacher.name}`,
        description: `Change instructor to ${teacher.name} (${teacher.department || 'N/A'})`,
        action: {
          type: 'change_faculty',
          teacherId: teacher.id,
          teacherName: teacher.name,
          day,
          slot,
          courseCode
        },
        estimatedEffort: 'Medium'
      });
    });
    
    // Find alternative time slots for faculty
    const alternativeSlots = conflictResolver.findAlternativeTimeSlots(
      timetableData, day, slot, conflictingCourse
    );
    
    alternativeSlots.forEach(altSlot => {
      suggestions.push({
        type: 'time_change',
        priority: 'medium',
        title: `Move to ${altSlot.day} at ${altSlot.slot}`,
        description: `Reschedule to avoid faculty conflict`,
        action: {
          type: 'change_time',
          newDay: altSlot.day,
          newSlot: altSlot.slot,
          originalDay: day,
          originalSlot: slot
        },
        estimatedEffort: 'High'
      });
    });
    
    return suggestions;
  },
  
  /**
   * Find alternative time slots
   */
  findAlternativeTimeSlots: (timetableData, currentDay, currentSlot, course) => {
    const alternatives = [];
    const maxSuggestions = 5;
    
    // Check all days and slots
    Object.keys(timetableData).forEach(day => {
      Object.keys(timetableData[day] || {}).forEach(slot => {
        if (day === currentDay && slot === currentSlot) return;
        
        const existingCourse = timetableData[day][slot];
        if (!existingCourse || !existingCourse.code) {
          // This slot is free
          alternatives.push({
            day,
            slot,
            priority: day === currentDay ? 'high' : 'medium'
          });
        }
      });
    });
    
    // Sort by priority and return top suggestions
    return alternatives
      .sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        return 0;
      })
      .slice(0, maxSuggestions);
  },
  
  /**
   * Apply a suggestion to resolve conflict
   */
  applySuggestion: (timetableData, suggestion) => {
    const newTimetable = deepCopy(timetableData);
    
    switch (suggestion.action.type) {
      case 'change_room':
        const course = newTimetable[suggestion.action.day][suggestion.action.slot];
        if (course) {
          course.room = suggestion.action.roomId;
        }
        break;
        
      case 'change_time':
        const courseToMove = newTimetable[suggestion.action.originalDay][suggestion.action.originalSlot];
        if (courseToMove) {
          // Remove from original slot
          newTimetable[suggestion.action.originalDay][suggestion.action.originalSlot] = null;
          // Add to new slot
          newTimetable[suggestion.action.newDay][suggestion.action.newSlot] = courseToMove;
        }
        break;
        
      case 'change_faculty':
        const courseToUpdate = newTimetable[suggestion.action.day][suggestion.action.slot];
        if (courseToUpdate) {
          courseToUpdate.teacher = {
            id: suggestion.action.teacherId,
            name: suggestion.action.teacherName
          };
          courseToUpdate.faculty = {
            id: suggestion.action.teacherId,
            name: suggestion.action.teacherName
          };
        }
        break;
    }
    
    return newTimetable;
  }
};
