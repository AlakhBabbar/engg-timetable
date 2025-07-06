/**
 * Resource and Batch Validation System
 * Validates room capacity, facilities, and scheduling requirements
 */

import { CONFIG, timeSlots } from './constants.js';
import { extractFacultyId } from './conflictDetection.js';

/**
 * Batch and resource validation system
 */
export const resourceValidator = {
  /**
   * Validate if room capacity is sufficient for batch size
   */
  validateRoomCapacity: (room, batchSize) => {
    if (!room || !room.capacity || !batchSize) {
      return {
        isValid: false,
        message: 'Room capacity or batch size information missing'
      };
    }
    
    const capacityMargin = CONFIG.ROOM_CAPACITY_MARGIN;
    const effectiveCapacity = Math.floor(room.capacity * capacityMargin);
    
    if (batchSize > effectiveCapacity) {
      return {
        isValid: false,
        severity: 'critical',
        message: `Room ${room.number || room.id} capacity (${room.capacity}) insufficient for batch size (${batchSize}). Recommended capacity: ${Math.ceil(batchSize / capacityMargin)}`,
        suggestedActions: [
          'Choose a larger room',
          'Split the batch into smaller groups',
          'Find alternative venue'
        ]
      };
    }
    
    if (batchSize > room.capacity * 0.8) {
      return {
        isValid: true,
        severity: 'warning',
        message: `Room ${room.number || room.id} will be at high capacity (${Math.round((batchSize / room.capacity) * 100)}%)`,
        suggestedActions: [
          'Consider a larger room for comfort',
          'Ensure adequate ventilation'
        ]
      };
    }
    
    return {
      isValid: true,
      message: `Room capacity sufficient for batch size`
    };
  },
  
  /**
   * Validate if room facilities match course requirements
   */
  validateRoomFacilities: (room, courseRequirements) => {
    if (!room || !room.facilities) {
      return {
        isValid: false,
        message: 'Room facilities information not available'
      };
    }
    
    if (!courseRequirements || courseRequirements.length === 0) {
      return {
        isValid: true,
        message: 'No specific facility requirements'
      };
    }
    
    const missingFacilities = courseRequirements.filter(
      requirement => !room.facilities.includes(requirement)
    );
    
    if (missingFacilities.length > 0) {
      return {
        isValid: false,
        severity: 'warning',
        message: `Room ${room.number || room.id} missing required facilities: ${missingFacilities.join(', ')}`,
        missingFacilities,
        suggestedActions: [
          'Choose a room with required facilities',
          'Arrange for portable equipment',
          'Contact facilities management'
        ]
      };
    }
    
    return {
      isValid: true,
      message: 'All required facilities available'
    };
  },
  
  /**
   * Validate batch scheduling conflicts
   */
  validateBatchConflicts: (timetableData, targetDay, targetSlot, batchId, courseCode) => {
    const conflicts = [];
    
    // Check if the same batch has another class at the same time
    Object.keys(timetableData).forEach(day => {
      Object.keys(timetableData[day] || {}).forEach(slot => {
        const existingCourse = timetableData[day][slot];
        
        if (existingCourse && 
            existingCourse.batchId === batchId && 
            day === targetDay && 
            slot === targetSlot &&
            existingCourse.code !== courseCode) {
          conflicts.push({
            type: 'batch_conflict',
            severity: 'critical',
            message: `Batch ${batchId} already has ${existingCourse.code} scheduled at ${slot} on ${day}`,
            conflictingCourse: existingCourse,
            day: targetDay,
            slot: targetSlot,
            suggestedActions: [
              'Choose a different time slot',
              'Move the conflicting course',
              'Split the batch if possible'
            ]
          });
        }
      });
    });
    
    return conflicts;
  },
  
  /**
   * Validate break time requirements
   */
  validateBreakTimes: (timetableData, targetDay, targetSlot, minimumBreakMinutes = CONFIG.MIN_BREAK_MINUTES) => {
    const warnings = [];
    const timeSlotDuration = CONFIG.TIME_SLOT_DURATION;
    
    // Check adjacent time slots for the same batch/room
    const adjacentSlots = resourceValidator.getAdjacentSlots(targetSlot);
    
    adjacentSlots.forEach(adjSlot => {
      const adjCourse = timetableData[targetDay]?.[adjSlot];
      if (adjCourse && adjCourse.code) {
        // Check if it's back-to-back classes for same batch or in same room
        warnings.push({
          type: 'break_time',
          severity: 'warning',
          message: `Back-to-back classes detected. Consider adding break time between ${targetSlot} and ${adjSlot}`,
          suggestedActions: [
            'Add buffer time between classes',
            'Ensure adequate transition time',
            'Consider student movement time'
          ]
        });
      }
    });
    
    return warnings;
  },
  
  /**
   * Get adjacent time slots
   */
  getAdjacentSlots: (currentSlot) => {
    const currentIndex = timeSlots.indexOf(currentSlot);
    const adjacent = [];
    
    if (currentIndex > 0) {
      adjacent.push(timeSlots[currentIndex - 1]);
    }
    if (currentIndex < timeSlots.length - 1) {
      adjacent.push(timeSlots[currentIndex + 1]);
    }
    
    return adjacent;
  },
  
  /**
   * Comprehensive resource validation
   */
  validateAllResources: (timetableData, day, slot, course, room, batchInfo) => {
    const validations = {
      roomCapacity: { isValid: true },
      roomFacilities: { isValid: true },
      batchConflicts: [],
      breakTimes: [],
      overall: { isValid: true, conflicts: [], warnings: [] }
    };
    
    // Validate room capacity
    if (room && batchInfo?.size) {
      validations.roomCapacity = resourceValidator.validateRoomCapacity(room, batchInfo.size);
      if (!validations.roomCapacity.isValid) {
        validations.overall.isValid = false;
        validations.overall.conflicts.push(validations.roomCapacity);
      } else if (validations.roomCapacity.severity === 'warning') {
        validations.overall.warnings.push(validations.roomCapacity);
      }
    }
    
    // Validate room facilities
    if (room && course?.requiredFacilities) {
      validations.roomFacilities = resourceValidator.validateRoomFacilities(room, course.requiredFacilities);
      if (!validations.roomFacilities.isValid) {
        if (validations.roomFacilities.severity === 'critical') {
          validations.overall.isValid = false;
          validations.overall.conflicts.push(validations.roomFacilities);
        } else {
          validations.overall.warnings.push(validations.roomFacilities);
        }
      }
    }
    
    // Validate batch conflicts
    if (batchInfo?.id) {
      validations.batchConflicts = resourceValidator.validateBatchConflicts(
        timetableData, day, slot, batchInfo.id, course?.code
      );
      if (validations.batchConflicts.length > 0) {
        validations.overall.isValid = false;
        validations.overall.conflicts.push(...validations.batchConflicts);
      }
    }
    
    // Validate break times
    validations.breakTimes = resourceValidator.validateBreakTimes(timetableData, day, slot);
    if (validations.breakTimes.length > 0) {
      validations.overall.warnings.push(...validations.breakTimes);
    }
    
    return validations;
  }
};

/**
 * Course requirement validation
 */
export const courseValidator = {
  /**
   * Validate if course can be scheduled at the given time
   */
  validateCourseScheduling: (course, day, slot, room, faculty) => {
    const validations = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    // Check course duration vs available time
    if (course.duration && course.duration > 1) {
      const currentSlotIndex = timeSlots.indexOf(slot);
      const requiredSlots = course.duration;
      
      if (currentSlotIndex + requiredSlots > timeSlots.length) {
        validations.isValid = false;
        validations.errors.push({
          type: 'duration_overflow',
          message: `Course duration (${course.duration} hours) exceeds available time slots from ${slot}`
        });
      }
    }
    
    // Check room type compatibility
    if (course.type && room?.type && !courseValidator.isRoomTypeCompatible(course.type, room.type)) {
      validations.warnings.push({
        type: 'room_type_mismatch',
        message: `Course type "${course.type}" may not be suitable for room type "${room.type}"`
      });
    }
    
    // Check faculty department alignment
    if (course.department && faculty?.department && course.department !== faculty.department) {
      validations.warnings.push({
        type: 'department_mismatch',
        message: `Course department "${course.department}" differs from faculty department "${faculty.department}"`
      });
    }
    
    return validations;
  },
  
  /**
   * Check if room type is compatible with course type
   */
  isRoomTypeCompatible: (courseType, roomType) => {
    const compatibility = {
      'lecture': ['Lecture Hall', 'Classroom', 'Auditorium'],
      'practical': ['Electronics Lab', 'Electrical Lab', 'Mechanical Lab', 'Civil Lab', 'Footwear Lab', 'Agriculture Lab', 'Laboratory', 'Workshop'],
      'tutorial': ['Classroom', 'Tutorial Room', 'Seminar Room'],
      'seminar': ['Seminar Room', 'Conference Room', 'Classroom']
    };
    
    const compatibleRoomTypes = compatibility[courseType?.toLowerCase()] || [];
    return compatibleRoomTypes.includes(roomType);
  },
  
  /**
   * Validate weekly hour distribution
   */
  validateWeeklyHours: (course, scheduledHours) => {
    if (!course.weeklyHours) {
      return { isValid: true, message: 'No weekly hour constraints' };
    }
    
    // Parse weekly hours (format: "3L+1T+2P")
    const parseWeeklyHours = (weeklyHours) => {
      const parts = weeklyHours.split('+');
      let totalHours = 0;
      
      parts.forEach(part => {
        const match = part.match(/(\d+)([LTP])/);
        if (match) {
          totalHours += parseInt(match[1]);
        }
      });
      
      return totalHours;
    };
    
    const requiredHours = parseWeeklyHours(course.weeklyHours);
    
    if (scheduledHours < requiredHours) {
      return {
        isValid: false,
        severity: 'warning',
        message: `Course requires ${requiredHours} hours per week, but only ${scheduledHours} hours are scheduled`,
        suggestedActions: [
          'Schedule additional sessions',
          'Extend session duration',
          'Review course requirements'
        ]
      };
    }
    
    if (scheduledHours > requiredHours) {
      return {
        isValid: true,
        severity: 'info',
        message: `Course has ${scheduledHours} hours scheduled, exceeding the required ${requiredHours} hours`
      };
    }
    
    return {
      isValid: true,
      message: 'Weekly hour requirements met'
    };
  }
};

/**
 * Faculty workload validation
 */
export const facultyValidator = {
  /**
   * Calculate faculty workload for a given timetable
   */
  calculateFacultyWorkload: (timetableData, facultyId) => {
    let totalHours = 0;
    const scheduledSlots = [];
    
    Object.keys(timetableData).forEach(day => {
      Object.keys(timetableData[day] || {}).forEach(slot => {
        const course = timetableData[day][slot];
        const courseFacultyId = extractFacultyId(course);
        
        if (course && courseFacultyId === facultyId) {
          totalHours += course.duration || 1;
          scheduledSlots.push({ day, slot, course: course.code });
        }
      });
    });
    
    return {
      totalHours,
      scheduledSlots,
      slotsCount: scheduledSlots.length
    };
  },
  
  /**
   * Validate faculty workload limits
   */
  validateFacultyWorkload: (timetableData, facultyId, maxHoursPerWeek = 20) => {
    const workload = facultyValidator.calculateFacultyWorkload(timetableData, facultyId);
    
    if (workload.totalHours > maxHoursPerWeek) {
      return {
        isValid: false,
        severity: 'warning',
        message: `Faculty workload (${workload.totalHours} hours) exceeds recommended maximum (${maxHoursPerWeek} hours)`,
        workload,
        suggestedActions: [
          'Redistribute some courses to other faculty',
          'Reduce session durations',
          'Review workload distribution'
        ]
      };
    }
    
    return {
      isValid: true,
      message: `Faculty workload (${workload.totalHours} hours) is within acceptable limits`,
      workload
    };
  },
  
  /**
   * Check for faculty availability conflicts
   */
  validateFacultyAvailability: (faculty, day, slot) => {
    if (!faculty.availability || !Array.isArray(faculty.availability)) {
      return {
        isValid: true,
        message: 'No specific availability constraints'
      };
    }
    
    const slotKey = `${day}-${slot}`;
    const isAvailable = faculty.availability.includes(slotKey) || 
                       faculty.availableSlots?.includes(slotKey);
    
    if (!isAvailable) {
      return {
        isValid: false,
        severity: 'critical',
        message: `Faculty ${faculty.name} is not available at ${slot} on ${day}`,
        suggestedActions: [
          'Choose a different time slot',
          'Assign a different faculty member',
          'Update faculty availability'
        ]
      };
    }
    
    return {
      isValid: true,
      message: 'Faculty is available at the requested time'
    };
  }
};
