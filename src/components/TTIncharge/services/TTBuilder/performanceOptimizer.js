/**
 * Performance Optimization with Indexing
 * Provides fast lookup and conflict detection for timetable operations
 */

import { extractFacultyId } from './conflictDetection.js';
import { deepCopy } from './utils.js';

/**
 * Performance optimization with indexing for conflict detection
 */
export const TimetableIndex = {
  // Index structures for fast lookups
  roomIndex: new Map(), // roomId -> Set of slot keys
  facultyIndex: new Map(), // facultyId -> Set of slot keys
  slotIndex: new Map(), // day-slot -> course data
  
  /**
   * Build indexes from timetable data
   */
  buildIndexes: (timetableData) => {
    // Clear existing indexes
    TimetableIndex.roomIndex.clear();
    TimetableIndex.facultyIndex.clear();
    TimetableIndex.slotIndex.clear();
    
    Object.keys(timetableData).forEach(day => {
      Object.keys(timetableData[day] || {}).forEach(slot => {
        const course = timetableData[day][slot];
        if (!course || !course.code) return;
        
        const slotKey = `${day}-${slot}`;
        
        // Index by slot
        TimetableIndex.slotIndex.set(slotKey, course);
        
        // Index by room
        if (course.room) {
          if (!TimetableIndex.roomIndex.has(course.room)) {
            TimetableIndex.roomIndex.set(course.room, new Set());
          }
          TimetableIndex.roomIndex.get(course.room).add(slotKey);
        }
        
        // Index by faculty
        const facultyId = extractFacultyId(course);
        if (facultyId) {
          if (!TimetableIndex.facultyIndex.has(facultyId)) {
            TimetableIndex.facultyIndex.set(facultyId, new Set());
          }
          TimetableIndex.facultyIndex.get(facultyId).add(slotKey);
        }
      });
    });
  },
  
  /**
   * Fast conflict detection using indexes
   */
  checkConflictsOptimized: (targetDay, targetSlot, newCourse, selectedRoom) => {
    const conflicts = [];
    const targetSlotKey = `${targetDay}-${targetSlot}`;
    const newFacultyId = extractFacultyId(newCourse);
    const newRoomId = selectedRoom?.id || selectedRoom?.number;
    
    // Check room conflicts using index
    if (newRoomId && TimetableIndex.roomIndex.has(newRoomId)) {
      const roomSlots = TimetableIndex.roomIndex.get(newRoomId);
      if (roomSlots.has(targetSlotKey)) {
        const existingCourse = TimetableIndex.slotIndex.get(targetSlotKey);
        if (existingCourse && existingCourse.code !== newCourse.code) {
          conflicts.push({
            type: 'room',
            severity: 'critical',
            message: `Room ${newRoomId} is already booked for ${existingCourse.code} at ${targetSlot} on ${targetDay}`,
            conflictingCourse: existingCourse,
            day: targetDay,
            slot: targetSlot
          });
        }
      }
    }
    
    // Check faculty conflicts using index
    if (newFacultyId && TimetableIndex.facultyIndex.has(newFacultyId)) {
      const facultySlots = TimetableIndex.facultyIndex.get(newFacultyId);
      if (facultySlots.has(targetSlotKey)) {
        const existingCourse = TimetableIndex.slotIndex.get(targetSlotKey);
        if (existingCourse && existingCourse.code !== newCourse.code) {
          const facultyName = existingCourse.teacher?.name || existingCourse.faculty?.name || `Faculty ID: ${newFacultyId}`;
          conflicts.push({
            type: 'faculty',
            severity: 'critical',
            message: `${facultyName} is already teaching ${existingCourse.code} at ${targetSlot} on ${targetDay}`,
            conflictingCourse: existingCourse,
            day: targetDay,
            slot: targetSlot
          });
        }
      }
    }
    
    return conflicts;
  },
  
  /**
   * Update indexes when timetable changes
   */
  updateIndex: (day, slot, oldCourse, newCourse, roomId) => {
    const slotKey = `${day}-${slot}`;
    
    // Remove old course from indexes
    if (oldCourse) {
      TimetableIndex.slotIndex.delete(slotKey);
      
      if (oldCourse.room) {
        const roomSlots = TimetableIndex.roomIndex.get(oldCourse.room);
        if (roomSlots) {
          roomSlots.delete(slotKey);
          if (roomSlots.size === 0) {
            TimetableIndex.roomIndex.delete(oldCourse.room);
          }
        }
      }
      
      const oldFacultyId = extractFacultyId(oldCourse);
      if (oldFacultyId) {
        const facultySlots = TimetableIndex.facultyIndex.get(oldFacultyId);
        if (facultySlots) {
          facultySlots.delete(slotKey);
          if (facultySlots.size === 0) {
            TimetableIndex.facultyIndex.delete(oldFacultyId);
          }
        }
      }
    }
    
    // Add new course to indexes
    if (newCourse) {
      TimetableIndex.slotIndex.set(slotKey, newCourse);
      
      if (roomId) {
        if (!TimetableIndex.roomIndex.has(roomId)) {
          TimetableIndex.roomIndex.set(roomId, new Set());
        }
        TimetableIndex.roomIndex.get(roomId).add(slotKey);
      }
      
      const newFacultyId = extractFacultyId(newCourse);
      if (newFacultyId) {
        if (!TimetableIndex.facultyIndex.has(newFacultyId)) {
          TimetableIndex.facultyIndex.set(newFacultyId, new Set());
        }
        TimetableIndex.facultyIndex.get(newFacultyId).add(slotKey);
      }
    }
  },

  /**
   * Get all courses for a specific faculty
   * @param {string} facultyId - Faculty ID to search for
   * @returns {Array} Array of course assignments
   */
  getFacultyCourses: (facultyId) => {
    const courses = [];
    const facultySlots = TimetableIndex.facultyIndex.get(facultyId);
    
    if (facultySlots) {
      facultySlots.forEach(slotKey => {
        const course = TimetableIndex.slotIndex.get(slotKey);
        if (course) {
          const [day, slot] = slotKey.split('-');
          courses.push({
            ...course,
            day,
            slot
          });
        }
      });
    }
    
    return courses;
  },

  /**
   * Get all courses for a specific room
   * @param {string} roomId - Room ID to search for
   * @returns {Array} Array of course assignments
   */
  getRoomCourses: (roomId) => {
    const courses = [];
    const roomSlots = TimetableIndex.roomIndex.get(roomId);
    
    if (roomSlots) {
      roomSlots.forEach(slotKey => {
        const course = TimetableIndex.slotIndex.get(slotKey);
        if (course) {
          const [day, slot] = slotKey.split('-');
          courses.push({
            ...course,
            day,
            slot
          });
        }
      });
    }
    
    return courses;
  },

  /**
   * Find available time slots for a faculty
   * @param {string} facultyId - Faculty ID
   * @param {Array} allTimeSlots - All possible time slots
   * @param {Array} allDays - All possible days
   * @returns {Array} Available time slots
   */
  findAvailableSlots: (facultyId, allTimeSlots, allDays) => {
    const available = [];
    const facultySlots = TimetableIndex.facultyIndex.get(facultyId) || new Set();
    
    allDays.forEach(day => {
      allTimeSlots.forEach(slot => {
        const slotKey = `${day}-${slot}`;
        if (!facultySlots.has(slotKey)) {
          available.push({ day, slot });
        }
      });
    });
    
    return available;
  },

  /**
   * Get index statistics for monitoring
   * @returns {Object} Index statistics
   */
  getIndexStats: () => {
    return {
      totalSlots: TimetableIndex.slotIndex.size,
      uniqueRooms: TimetableIndex.roomIndex.size,
      uniqueFaculty: TimetableIndex.facultyIndex.size,
      memoryUsage: {
        roomIndex: TimetableIndex.roomIndex.size,
        facultyIndex: TimetableIndex.facultyIndex.size,
        slotIndex: TimetableIndex.slotIndex.size
      }
    };
  },

  /**
   * Clear all indexes
   */
  clearIndexes: () => {
    TimetableIndex.roomIndex.clear();
    TimetableIndex.facultyIndex.clear();
    TimetableIndex.slotIndex.clear();
  },

  /**
   * Validate index consistency
   * @param {Object} timetableData - Original timetable data
   * @returns {Object} Validation result
   */
  validateIndexes: (timetableData) => {
    const errors = [];
    let coursesInData = 0;
    let coursesInIndex = 0;
    
    // Count courses in original data
    Object.keys(timetableData).forEach(day => {
      Object.keys(timetableData[day] || {}).forEach(slot => {
        const course = timetableData[day][slot];
        if (course && course.code) {
          coursesInData++;
        }
      });
    });
    
    // Count courses in index
    coursesInIndex = TimetableIndex.slotIndex.size;
    
    if (coursesInData !== coursesInIndex) {
      errors.push({
        type: 'count_mismatch',
        message: `Course count mismatch: ${coursesInData} in data, ${coursesInIndex} in index`
      });
    }
    
    // Check for orphaned index entries
    TimetableIndex.slotIndex.forEach((course, slotKey) => {
      const [day, slot] = slotKey.split('-');
      const actualCourse = timetableData[day]?.[slot];
      
      if (!actualCourse || actualCourse.code !== course.code) {
        errors.push({
          type: 'orphaned_entry',
          message: `Orphaned index entry: ${slotKey} -> ${course.code}`
        });
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      stats: {
        coursesInData,
        coursesInIndex,
        indexStats: TimetableIndex.getIndexStats()
      }
    };
  }
};

/**
 * Performance monitoring utilities
 */
export const performanceMonitor = {
  /**
   * Measure execution time of a function
   * @param {Function} func - Function to measure
   * @param {Array} args - Arguments to pass to function
   * @returns {Object} Result and timing information
   */
  measureTime: async (func, args = []) => {
    const startTime = performance.now();
    let result;
    let error = null;
    
    try {
      result = await func(...args);
    } catch (err) {
      error = err;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    return {
      result,
      error,
      duration,
      startTime,
      endTime
    };
  },

  /**
   * Create a performance profiler for multiple operations
   * @returns {Object} Profiler object
   */
  createProfiler: () => {
    const measurements = [];
    
    return {
      /**
       * Start a new measurement
       * @param {string} name - Operation name
       * @returns {Function} Function to end measurement
       */
      start: (name) => {
        const startTime = performance.now();
        const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        return () => {
          const endTime = performance.now();
          const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
          
          measurements.push({
            name,
            duration: endTime - startTime,
            memoryDelta: endMemory - startMemory,
            timestamp: new Date().toISOString()
          });
        };
      },

      /**
       * Get all measurements
       * @returns {Array} Array of measurements
       */
      getMeasurements: () => [...measurements],

      /**
       * Get summary statistics
       * @returns {Object} Summary statistics
       */
      getSummary: () => {
        if (measurements.length === 0) {
          return { totalOperations: 0 };
        }
        
        const durations = measurements.map(m => m.duration);
        const memoryDeltas = measurements.map(m => m.memoryDelta);
        
        return {
          totalOperations: measurements.length,
          totalDuration: durations.reduce((sum, d) => sum + d, 0),
          averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
          minDuration: Math.min(...durations),
          maxDuration: Math.max(...durations),
          totalMemoryDelta: memoryDeltas.reduce((sum, d) => sum + d, 0),
          averageMemoryDelta: memoryDeltas.reduce((sum, d) => sum + d, 0) / memoryDeltas.length
        };
      },

      /**
       * Clear all measurements
       */
      clear: () => {
        measurements.length = 0;
      },

      /**
       * Export measurements as CSV
       * @returns {string} CSV string
       */
      exportCSV: () => {
        const headers = ['name', 'duration', 'memoryDelta', 'timestamp'];
        const rows = measurements.map(m => 
          [m.name, m.duration, m.memoryDelta, m.timestamp].join(',')
        );
        return [headers.join(','), ...rows].join('\n');
      }
    };
  },

  /**
   * Monitor memory usage
   * @returns {Object} Memory information
   */
  getMemoryInfo: () => {
    if (!performance.memory) {
      return { supported: false };
    }
    
    return {
      supported: true,
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      usagePercentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
    };
  },

  /**
   * Check if performance is degraded
   * @param {number} threshold - Warning threshold in milliseconds
   * @returns {Object} Performance check result
   */
  checkPerformance: (threshold = 100) => {
    const measurements = performanceMonitor.createProfiler().getMeasurements();
    const recentMeasurements = measurements.slice(-10); // Last 10 operations
    
    if (recentMeasurements.length === 0) {
      return { status: 'unknown', message: 'No recent measurements available' };
    }
    
    const averageDuration = recentMeasurements.reduce((sum, m) => sum + m.duration, 0) / recentMeasurements.length;
    
    if (averageDuration > threshold) {
      return {
        status: 'degraded',
        message: `Performance degraded: average ${averageDuration.toFixed(2)}ms exceeds threshold of ${threshold}ms`,
        averageDuration,
        threshold
      };
    }
    
    return {
      status: 'good',
      message: `Performance is good: average ${averageDuration.toFixed(2)}ms`,
      averageDuration,
      threshold
    };
  }
};

/**
 * Cache implementation for expensive operations
 */
export const operationCache = {
  cache: new Map(),
  
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get: (key) => {
    const entry = operationCache.cache.get(key);
    if (!entry) return undefined;
    
    // Check if entry has expired
    if (entry.expires && Date.now() > entry.expires) {
      operationCache.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  },

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttlMs - Time to live in milliseconds
   */
  set: (key, value, ttlMs = 60000) => {
    const entry = {
      value: deepCopy(value),
      created: Date.now(),
      expires: ttlMs > 0 ? Date.now() + ttlMs : null
    };
    
    operationCache.cache.set(key, entry);
  },

  /**
   * Clear cache entry
   * @param {string} key - Cache key to clear
   */
  delete: (key) => {
    operationCache.cache.delete(key);
  },

  /**
   * Clear all cache entries
   */
  clear: () => {
    operationCache.cache.clear();
  },

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats: () => {
    const now = Date.now();
    let expired = 0;
    let active = 0;
    
    operationCache.cache.forEach(entry => {
      if (entry.expires && now > entry.expires) {
        expired++;
      } else {
        active++;
      }
    });
    
    return {
      totalEntries: operationCache.cache.size,
      activeEntries: active,
      expiredEntries: expired,
      memoryUsage: JSON.stringify([...operationCache.cache]).length
    };
  },

  /**
   * Clean up expired entries
   */
  cleanup: () => {
    const now = Date.now();
    const keysToDelete = [];
    
    operationCache.cache.forEach((entry, key) => {
      if (entry.expires && now > entry.expires) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => operationCache.cache.delete(key));
    
    return keysToDelete.length;
  }
};
