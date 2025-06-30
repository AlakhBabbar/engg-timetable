// Sample courses data
export const coursesData = [
  { 
    id: 'CS101', 
    name: 'Introduction to Computer Science', 
    faculty: { id: 1, name: 'Dr. Alex Johnson' }, 
    duration: 1, // in hours
    department: 'Computer Science',
    semester: 'Semester 7',
    color: 'blue',
    weeklyHours: '3L+1T+0P'  // 3 lectures, 1 tutorial, 0 practical
  },
  { 
    id: 'CS202', 
    name: 'Data Structures and Algorithms', 
    faculty: { id: 2, name: 'Dr. Sarah Miller' }, 
    duration: 2, 
    department: 'Computer Science',
    semester: 'Semester 7',
    color: 'indigo',
    weeklyHours: '3L+0T+2P'
  },
  { 
    id: 'CS303', 
    name: 'Database Systems', 
    faculty: { id: 3, name: 'Prof. Robert Chen' }, 
    duration: 1, 
    department: 'Computer Science',
    semester: 'Semester 7',
    color: 'purple',
    weeklyHours: '3L+1T+2P'
  },
  { 
    id: 'CS405', 
    name: 'Artificial Intelligence', 
    faculty: { id: 4, name: 'Dr. Emily Zhang' }, 
    duration: 2, 
    department: 'Computer Science',
    semester: 'Semester 7',
    color: 'green',
    weeklyHours: '4L+0T+2P'
  },
  { 
    id: 'EE201', 
    name: 'Circuit Theory', 
    faculty: { id: 5, name: 'Prof. Maria Garcia' }, 
    duration: 1, 
    department: 'Electrical Engineering',
    semester: 'Semester 7',
    color: 'amber',
    weeklyHours: '3L+1T+1P'
  },
  { 
    id: 'ME101', 
    name: 'Engineering Mechanics', 
    faculty: { id: 6, name: 'Dr. John Smith' }, 
    duration: 1, 
    department: 'Mechanical Engineering',
    semester: 'Semester 7',
    color: 'rose',
    weeklyHours: '3L+1T+0P'
  },
];

// Faculty data
export const facultyData = [
  { id: 1, name: 'Dr. Alex Johnson', department: 'Computer Science', availableSlots: ['Monday-09:00', 'Tuesday-11:00'] },
  { id: 2, name: 'Dr. Sarah Miller', department: 'Computer Science', availableSlots: ['Wednesday-10:00', 'Friday-09:00'] },
  { id: 3, name: 'Prof. Robert Chen', department: 'Computer Science', availableSlots: ['Monday-14:00', 'Thursday-11:00'] },
  { id: 4, name: 'Dr. Emily Zhang', department: 'Computer Science', availableSlots: ['Tuesday-09:00', 'Friday-14:00'] },
  { id: 5, name: 'Prof. Maria Garcia', department: 'Electrical Engineering', availableSlots: ['Wednesday-14:00', 'Thursday-09:00'] },
  { id: 6, name: 'Dr. John Smith', department: 'Mechanical Engineering', availableSlots: ['Monday-11:00', 'Thursday-14:00'] }
];

// Room data
export const roomsData = [
  { id: 'A101', capacity: 60, type: 'Lecture Hall', facilities: ['Projector', 'Smart Board'] },
  { id: 'B201', capacity: 40, type: 'Classroom', facilities: ['Projector'] },
  { id: 'C302', capacity: 30, type: 'Computer Lab', facilities: ['Computers', 'Projector'] },
  { id: 'A105', capacity: 60, type: 'Lecture Hall', facilities: ['Projector', 'Smart Board'] },
  { id: 'B204', capacity: 40, type: 'Classroom', facilities: ['Projector'] },
  { id: 'D101', capacity: 80, type: 'Lecture Hall', facilities: ['Projector', 'Smart Board', 'Audio System'] },
];

// Time slots (reduced for better fit)
export const timeSlots = [
  '7:00-7:55',
  '7:55-8:50',
  '8:50-9:45',
  '10:30-11:25',
  '11:25-12:20',
  '12:20-1:15',
  '1:15-2:10',
  '2:10-3:05',
  '3:05-4:00',
  '4:00-5:00'
];

// Days of the week (reduced for better fit)
export const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Business Logic Functions for TimetableBuilder Component

/**
 * Initialize empty timetable structure with all days and time slots
 * @returns {Object} Empty timetable data structure
 */
export const initializeEmptyTimetable = () => {
  const initialData = {};
  weekDays.forEach(day => {
    initialData[day] = {};
    timeSlots.forEach(slot => {
      initialData[day][slot] = null;
    });
  });
  return initialData;
};

/**
 * Fetch teachers from Firestore and build a name mapping
 * @param {Object} db - Firestore database instance
 * @param {Function} collection - Firestore collection function
 * @param {Function} getDocs - Firestore getDocs function
 * @returns {Promise<Object>} Map of teacher IDs to names
 */
export const fetchTeachersMap = async (db, collection, getDocs) => {
  try {
    const snap = await getDocs(collection(db, 'teachers'));
    const map = {};
    snap.docs.forEach(doc => {
      const data = doc.data();
      map[data.id || doc.id] = data.name;
    });
    return map;
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return {};
  }
};

/**
 * Fetch courses from Firestore for a specific semester
 * @param {Object} db - Firestore database instance
 * @param {Function} collection - Firestore collection function
 * @param {Function} getDocs - Firestore getDocs function
 * @param {Function} query - Firestore query function
 * @param {Function} where - Firestore where function
 * @param {string} semester - Current semester
 * @returns {Promise<Array>} Array of course data
 */
export const fetchCourses = async (db, collection, getDocs, query, where, semester) => {
  try {
    if (!semester) return [];
    const q = query(collection(db, 'courses'), where('semester', '==', semester));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
};

/**
 * Map courses to course blocks with teacher information
 * @param {Array} allCourses - Raw course data from Firestore
 * @param {Object} teacherMap - Map of teacher IDs to names
 * @param {Array} courseColors - Available color palette
 * @returns {Array} Processed course blocks
 */
export const mapCoursesToBlocks = (allCourses, teacherMap, courseColors) => {
  const courseColorMap = {};
  let colorIndex = 0;
  
  // Assign unique color per course code
  allCourses.forEach(course => {
    if (!courseColorMap[course.code]) {
      courseColorMap[course.code] = courseColors[colorIndex % courseColors.length];
      colorIndex++;
    }
  });
  
  // Flatten courses by teacher
  const blocks = [];
  allCourses.forEach(course => {
    const color = courseColorMap[course.code];
    if (Array.isArray(course.facultyList)) {
      course.facultyList.forEach(teacherId => {
        blocks.push({
          code: course.code,
          title: course.title,
          weeklyHours: course.weeklyHours,
          teacherId,
          teacherName: teacherMap[teacherId] || teacherId,
          color,
          id: `${course.code}-${teacherId}`,
          duration: course.duration || ''
        });
      });
    } else if (course.facultyList) {
      blocks.push({
        code: course.code,
        title: course.title,
        weeklyHours: course.weeklyHours,
        teacherId: course.facultyList,
        teacherName: teacherMap[course.facultyList] || course.facultyList,
        color,
        id: `${course.code}-${course.facultyList}`,
        duration: course.duration || ''
      });
    }
  });
  
  return blocks;
};

/**
 * Fetch rooms from Firestore
 * @param {Object} db - Firestore database instance
 * @param {Function} collection - Firestore collection function
 * @param {Function} getDocs - Firestore getDocs function
 * @returns {Promise<Array>} Array of room data
 */
export const fetchRooms = async (db, collection, getDocs) => {
  try {
    const snap = await getDocs(collection(db, 'rooms'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return [];
  }
};

/**
 * Set up real-time listener for timetable data
 * @param {Object} params - Parameters object
 * @param {Object} params.db - Firestore database instance
 * @param {Function} params.collection - Firestore collection function
 * @param {Function} params.query - Firestore query function
 * @param {Function} params.where - Firestore where function
 * @param {Function} params.onSnapshot - Firestore onSnapshot function
 * @param {string} params.currentSemester - Current semester
 * @param {string} params.selectedBranch - Selected branch
 * @param {string} params.selectedBatch - Selected batch
 * @param {string} params.selectedType - Selected type
 * @param {Function} params.callback - Callback function for data updates
 * @returns {Function} Unsubscribe function
 */
export const setupTimetableListener = ({
  db, doc, onSnapshot,
  currentSemester, selectedBranch, selectedBatch, selectedType,
  callback
}) => {
  if (!currentSemester || !selectedBranch || !selectedBatch || !selectedType) {
    return () => {}; // Return empty unsubscribe function
  }
  
  // Create document ID in the same format as saving
  const timetableDocId = `${currentSemester}-${selectedBranch}-${selectedBatch}-${selectedType}`;
  const timetableDocRef = doc(db, 'timetables', timetableDocId);
  
  console.log('Setting up listener for document:', timetableDocId);
  
  return onSnapshot(timetableDocRef, (docSnapshot) => {
    console.log('Document snapshot received:', {
      exists: docSnapshot.exists(),
      id: docSnapshot.id,
      data: docSnapshot.exists() ? docSnapshot.data() : null
    });
    
    if (docSnapshot.exists()) {
      const docData = docSnapshot.data();
      const scheduleData = docData.schedule || initializeEmptyTimetable();
      console.log('Loading existing timetable data:', scheduleData);
      callback(scheduleData);
    } else {
      // Document doesn't exist, initialize with empty timetable
      console.log('Document does not exist, initializing empty timetable');
      callback(initializeEmptyTimetable());
    }
  }, (error) => {
    console.error('Error listening to timetable document:', error);
    callback(initializeEmptyTimetable());
  });
};

/**
 * Save timetable data to Firestore
 * @param {Object} params - Parameters object
 * @param {Object} params.db - Firestore database instance
 * @param {Function} params.doc - Firestore doc function
 * @param {Function} params.setDoc - Firestore setDoc function
 * @param {string} params.currentSemester - Current semester
 * @param {string} params.selectedBranch - Selected branch
 * @param {string} params.selectedBatch - Selected batch
 * @param {string} params.selectedType - Selected type
 * @param {Object} params.scheduleData - Timetable schedule data
 * @returns {Promise<void>}
 */
export const saveTimetableToFirestore = async ({
  db, doc, setDoc,
  currentSemester, selectedBranch, selectedBatch, selectedType,
  scheduleData
}) => {
  if (!currentSemester || !selectedBranch || !selectedBatch || !selectedType || !scheduleData) {
    return;
  }
  
  const timetableDocId = `${currentSemester}-${selectedBranch}-${selectedBatch}-${selectedType}`;
  const safeSchedule = replaceUndefinedWithNull(scheduleData);
  
  console.log('Saving timetable to document:', timetableDocId);
  console.log('Schedule data:', safeSchedule);
  
  try {
    await setDoc(doc(db, 'timetables', timetableDocId), {
      semester: currentSemester,
      branch: selectedBranch,
      batch: selectedBatch,
      type: selectedType,
      schedule: safeSchedule
    }, { merge: true });
    console.log('Timetable saved successfully to:', timetableDocId);
  } catch (error) {
    console.error('Error saving timetable to Firestore:', error);
  }
};

/**
 * Group course blocks by course for UI display
 * @param {Array} allCourses - Raw course data
 * @param {Object} teacherMap - Map of teacher IDs to names
 * @param {Array} courseColors - Available color palette
 * @returns {Array} Grouped course blocks
 */
export const groupCourseBlocks = (allCourses, teacherMap, courseColors) => {
  const courseColorMap = {};
  let colorIndex = 0;
  
  return allCourses.map(course => {
    const color = courseColorMap[course.code] || courseColors[colorIndex++ % courseColors.length];
    courseColorMap[course.code] = color;
    
    return {
      code: course.code,
      title: course.title,
      weeklyHours: course.weeklyHours,
      duration: course.duration || '',
      blocks: Array.isArray(course.facultyList)
        ? course.facultyList.map(teacherId => ({
            teacherId,
            teacherName: teacherMap[teacherId] || null,
            color,
            id: `${course.code}-${teacherId}`
          }))
        : course.facultyList
          ? [{
              teacherId: course.facultyList,
              teacherName: teacherMap[course.facultyList] || null,
              color,
              id: `${course.code}-${course.facultyList}`
            }]
          : []
    };
  });
};

/**
 * Handle tab management operations
 */
export const tabOperations = {
  /**
   * Create a new tab
   * @param {number} nextTabId - Next available tab ID
   * @param {Object} initialData - Initial timetable data
   * @returns {Object} New tab configuration
   */
  createNewTab: (nextTabId, initialData) => {
    return {
      newTab: {
        id: nextTabId,
        name: `New Timetable ${nextTabId}`,
        isActive: true
      },
      initialData,
      resetFields: {
        selectedBranch: '',
        selectedBatch: '',
        selectedType: ''
      }
    };
  },

  /**
   * Switch active tab
   * @param {Array} tabs - Current tabs array
   * @param {number} targetTabId - Target tab ID
   * @returns {Array} Updated tabs array
   */
  switchTab: (tabs, targetTabId) => {
    return tabs.map(tab => ({
      ...tab,
      isActive: tab.id === targetTabId
    }));
  },

  /**
   * Close a tab and clean up data
   * @param {Array} tabs - Current tabs array
   * @param {number} tabId - Tab ID to close
   * @param {number} activeTabId - Currently active tab ID
   * @returns {Object} Updated state data
   */
  closeTab: (tabs, tabId, activeTabId) => {
    if (tabs.length === 1) {
      return null; // Don't close if it's the only tab
    }

    const updatedTabs = tabs.filter(tab => tab.id !== tabId);
    let newActiveTabId = activeTabId;

    // If closing the active tab, switch to another tab
    if (tabId === activeTabId) {
      const activeIndex = tabs.findIndex(tab => tab.id === activeTabId);
      const newActiveIndex = activeIndex === 0 ? 1 : activeIndex - 1;
      newActiveTabId = tabs[newActiveIndex].id;
    }

    return {
      tabs: updatedTabs,
      newActiveTabId
    };
  }
};

/**
 * History management for undo/redo functionality
 */
export const historyManager = {
  /**
   * Add state to history
   * @param {Array} history - Current history array
   * @param {number} historyIndex - Current history index
   * @param {Object} data - Data to add to history
   * @returns {Object} Updated history state
   */
  addToHistory: (history, historyIndex, data) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(deepCopy(data));
    return {
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  },

  /**
   * Perform undo operation
   * @param {Array} history - History array
   * @param {number} historyIndex - Current history index
   * @returns {Object|null} Previous state or null if no undo available
   */
  undo: (history, historyIndex) => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      return {
        data: deepCopy(history[newIndex]),
        historyIndex: newIndex
      };
    }
    return null;
  },

  /**
   * Perform redo operation
   * @param {Array} history - History array
   * @param {number} historyIndex - Current history index
   * @returns {Object|null} Next state or null if no redo available
   */
  redo: (history, historyIndex) => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      return {
        data: deepCopy(history[newIndex]),
        historyIndex: newIndex
      };
    }
    return null;
  }
};

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
  }
};

/**
 * Utility to deeply replace undefined with null in an object
 * @param {*} obj - Object to process
 * @returns {*} Processed object with undefined replaced by null
 */
export const replaceUndefinedWithNull = (obj) => {
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      if (obj[key] === undefined) {
        obj[key] = null;
      } else {
        replaceUndefinedWithNull(obj[key]);
      }
    });
  }
  return obj;
};

// Check for conflicts before dropping a course
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
            message: `${existingCourse.faculty?.name || existingCourse.teacher?.name || 'Faculty'} already teaching ${existingCourse.id || existingCourse.code} at ${slot} on ${day}`,
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
 * PRODUCTION-LEVEL CONFLICT DETECTION SYSTEM
 * This replaces the flawed checkConflicts function above
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
            type: 'room',
            severity: 'warning',
            message: `Room ${newRoomId} has a time overlap between ${newCourse.code} (${targetSlot}) and ${existingCourse.code} (${slot})`,
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
              'Adjust course duration',
              'Move to a non-overlapping time slot'
            ]
          });
        }
        
        // Faculty conflict due to time overlap
        if (newFacultyId && existingFacultyId && newFacultyId === existingFacultyId) {
          const facultyName = existingCourse.teacher?.name || existingCourse.faculty?.name || `Faculty ID: ${existingFacultyId}`;
          conflicts.push({
            type: 'faculty',
            severity: 'warning',
            message: `${facultyName} has overlapping classes: ${newCourse.code} (${targetSlot}) and ${existingCourse.code} (${slot})`,
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
              'Adjust course duration',
              'Move to a non-overlapping time slot'
            ]
          });
        }
      }
    });
  });
  
  return conflicts;
};

/**
 * Extract faculty ID from course object with multiple possible structures
 */
const extractFacultyId = (course) => {
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
 * Comprehensive logging and audit trail system
 */
export const auditLogger = {
  /**
   * Log timetable actions for audit trail
   */
  logAction: (action, details) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      user: 'current_user', // Replace with actual user context
      sessionId: window.sessionStorage.getItem('sessionId') || 'unknown'
    };
    
    console.log('AUDIT LOG:', logEntry);
    
    // Store in local storage for now (in production, send to server)
    try {
      const existingLogs = JSON.parse(localStorage.getItem('timetable_audit_logs') || '[]');
      existingLogs.push(logEntry);
      
      // Keep only last 1000 entries to prevent storage overflow
      if (existingLogs.length > 1000) {
        existingLogs.splice(0, existingLogs.length - 1000);
      }
      
      localStorage.setItem('timetable_audit_logs', JSON.stringify(existingLogs));
    } catch (error) {
      console.error('Failed to store audit log:', error);
    }
    
    return logEntry;
  },

  /**
   * Get audit logs for a specific date range
   */
  getLogs: (startDate, endDate) => {
    try {
      const logs = JSON.parse(localStorage.getItem('timetable_audit_logs') || '[]');
      if (!startDate && !endDate) return logs;
      
      return logs.filter(log => {
        const logDate = new Date(log.timestamp);
        if (startDate && logDate < new Date(startDate)) return false;
        if (endDate && logDate > new Date(endDate)) return false;
        return true;
      });
    } catch (error) {
      console.error('Failed to retrieve audit logs:', error);
      return [];
    }
  },

  /**
   * Clear audit logs (admin only)
   */
  clearLogs: () => {
    try {
      localStorage.removeItem('timetable_audit_logs');
      console.log('Audit logs cleared');
    } catch (error) {
      console.error('Failed to clear audit logs:', error);
    }
  }
};

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
  }
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
    
    const capacityMargin = 0.9; // 90% capacity utilization
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
            type: 'batch',
            severity: 'critical',
            message: `Batch ${batchId} already has ${existingCourse.code} scheduled at ${slot} on ${day}`,
            conflictingCourse: existingCourse,
            day: targetDay,
            slot: targetSlot,
            suggestedActions: [
              'Move one course to a different time slot',
              'Check if courses can be combined',
              'Verify batch assignments'
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
  validateBreakTimes: (timetableData, targetDay, targetSlot, minimumBreakMinutes = 15) => {
    const warnings = [];
    const timeSlotDuration = 55; // Assuming 55-minute slots
    
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
 * Deep copy utility function
 * @param {*} obj - Object to deep copy
 * @returns {*} Deep copied object
 */
export const deepCopy = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepCopy(item));
  if (typeof obj === 'object') {
    const copy = {};
    Object.keys(obj).forEach(key => {
      copy[key] = deepCopy(obj[key]);
    });
    return copy;
  }
};

/**
 * Add course to timetable
 * @param {Object} timetableData - Current timetable data
 * @param {string} day - Day of the week
 * @param {string} slot - Time slot
 * @param {Object} course - Course to add
 * @param {Object} room - Room assignment
 * @returns {Object} Updated timetable data
 */
export const addCourseToTimetable = (timetableData, day, slot, course, room) => {
  const newTimetable = deepCopy(timetableData);
  
  if (!newTimetable[day]) {
    newTimetable[day] = {};
  }
  
  newTimetable[day][slot] = {
    ...course,
    room: room?.id || room?.number || '',
    roomName: room?.name || room?.type || '',
    timeSlot: slot,
    dayOfWeek: day
  };
  
  return newTimetable;
};

/**
 * Save timetable (alias for saveTimetableToFirestore for backward compatibility)
 */
export const saveTimetable = saveTimetableToFirestore;

/**
 * Publish timetable
 * @param {Object} params - Parameters for publishing
 * @returns {Promise<void>}
 */
export const publishTimetable = async (params) => {
  // Implementation for publishing timetable
  try {
    await saveTimetableToFirestore({
      ...params,
      published: true,
      publishedAt: new Date().toISOString()
    });
    console.log('Timetable published successfully');
  } catch (error) {
    console.error('Error publishing timetable:', error);
    throw error;
  }
};

/**
 * Get course color class based on course color
 * @param {string} color - Course color
 * @returns {string} CSS class name
 */
export const getCourseColorClass = (color) => {
  const colorMap = {
    blue: 'bg-blue-100 border-blue-500 text-blue-800',
    indigo: 'bg-indigo-100 border-indigo-500 text-indigo-800',
    purple: 'bg-purple-100 border-purple-500 text-purple-800',
    green: 'bg-green-100 border-green-500 text-green-800',
    amber: 'bg-amber-100 border-amber-500 text-amber-800',
    rose: 'bg-rose-100 border-rose-500 text-rose-800',
    red: 'bg-red-100 border-red-500 text-red-800',
    orange: 'bg-orange-100 border-orange-500 text-orange-800',
    yellow: 'bg-yellow-100 border-yellow-500 text-yellow-800',
    emerald: 'bg-emerald-100 border-emerald-500 text-emerald-800',
    teal: 'bg-teal-100 border-teal-500 text-teal-800',
    cyan: 'bg-cyan-100 border-cyan-500 text-cyan-800',
    sky: 'bg-sky-100 border-sky-500 text-sky-800',
    violet: 'bg-violet-100 border-violet-500 text-violet-800',
    fuchsia: 'bg-fuchsia-100 border-fuchsia-500 text-fuchsia-800',
    pink: 'bg-pink-100 border-pink-500 text-pink-800'
  };
  
  return colorMap[color] || 'bg-gray-100 border-gray-500 text-gray-800';
};

/**
 * Filter courses based on search criteria
 * @param {Array} courses - Array of courses
 * @param {Object|string} criteria - Filter criteria object or search term string
 * @param {string} [filterDepartment] - Department filter (if using string params)
 * @returns {Array} Filtered courses
 */
export const filterCourses = (courses, criteria = {}, filterDepartment = '') => {
  if (!Array.isArray(courses)) return [];
  
  // Handle both object and string parameter formats for backward compatibility
  let searchTerm = '';
  let departmentFilter = '';
  let semesterFilter = '';
  let facultyFilter = '';
  
  if (typeof criteria === 'string') {
    // Legacy format: filterCourses(courses, searchTerm, filterDepartment)
    searchTerm = criteria || '';
    departmentFilter = filterDepartment || '';
  } else if (typeof criteria === 'object' && criteria !== null) {
    // New format: filterCourses(courses, { searchTerm, selectedDepartment, selectedSemester, selectedFaculty })
    searchTerm = criteria.searchTerm || '';
    departmentFilter = criteria.selectedDepartment || criteria.filterDepartment || '';
    semesterFilter = criteria.selectedSemester || '';
    facultyFilter = criteria.selectedFaculty || '';
  }
  
  return courses.filter(course => {
    // Search term matching
    const matchesSearch = !searchTerm || 
      course.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Department matching
    const matchesDepartment = !departmentFilter || 
      course.department === departmentFilter;
    
    // Semester matching
    const matchesSemester = !semesterFilter || 
      course.semester === semesterFilter;
    
    // Faculty matching (check if faculty is in the course's faculty list)
    const matchesFaculty = !facultyFilter || 
      (Array.isArray(course.facultyList) && course.facultyList.includes(facultyFilter)) ||
      course.facultyList === facultyFilter ||
      course.faculty?.id === facultyFilter ||
      course.teacher?.id === facultyFilter;
    
    return matchesSearch && matchesDepartment && matchesSemester && matchesFaculty;
  });
};

/**
 * Get compact time format for display
 * @param {string} timeSlot - Time slot (e.g., "7:00-7:55")
 * @returns {string} Compact time format
 */
export const getCompactTimeFormat = (timeSlot) => {
  if (!timeSlot) return '';
  
  const [start] = timeSlot.split('-');
  return start;
};

/**
 * Get abbreviated day name
 * @param {string} day - Full day name
 * @returns {string} Abbreviated day name
 */
export const getAbbreviatedDay = (day) => {
  const abbreviations = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
    Sunday: 'Sun'
  };
  
  return abbreviations[day] || day;
};

/**
 * Get cell height based on screen size
 * @param {boolean} isCompact - Whether to use compact mode
 * @returns {string} CSS height class
 */
export const getCellHeight = (isCompact = false) => {
  return isCompact ? 'h-12' : 'h-16';
};

/**
 * Get responsive classes for timetable layout
 * @param {boolean} isMobile - Whether device is mobile
 * @returns {Object} CSS classes for different parts of the layout
 */
export const getResponsiveClasses = (isMobile = false) => {
  return {
    // Layout widths - significantly reduced course blocks width to maximize timetable space
    courseBlockWidth: isMobile ? 'w-44' : 'w-52', // Further reduced for more timetable space
    roomSelectionWidth: isMobile ? 'w-48' : 'w-64',
    gapSize: isMobile ? 'gap-2' : 'gap-3', // Slightly reduced gap for more space
    
    // Cell styling
    cellClasses: isMobile 
      ? 'text-xs p-1 min-h-8'
      : 'text-sm p-2 min-h-12'
  };
};

/**
 * Get compact course display information
 * @param {Object} course - Course object
 * @param {boolean} isCompact - Whether to use compact mode
 * @returns {Object} Display information
 */
export const getCompactCourseDisplay = (course, isCompact = false) => {
  if (!course) return { title: '', subtitle: '' };
  
  const courseCode = course.code || course.id;
  const courseName = course.title || course.name;
  const facultyName = course.teacher?.name || course.faculty?.name || '';
  const room = course.room || '';
  
  if (isCompact) {
    return {
      title: courseCode,
      subtitle: room ? `Room: ${room}` : facultyName
    };
  }
  
  return {
    title: `${courseCode} - ${courseName}`,
    subtitle: `${facultyName}${room ? ` | Room: ${room}` : ''}`
  };
};

/**
 * Delete course from timetable
 * @param {Object} timetableData - Current timetable data
 * @param {string} day - Day of the week
 * @param {string} slot - Time slot
 * @returns {Object} Updated timetable data
 */
export const deleteCourse = (timetableData, day, slot) => {
  const newTimetable = deepCopy(timetableData);
  
  if (newTimetable[day] && newTimetable[day][slot]) {
    newTimetable[day][slot] = null;
  }
  
  return newTimetable;
};

/**
 * Update timetable when course is dropped
 * @param {Object} timetableData - Current timetable data
 * @param {string} day - Target day
 * @param {string} slot - Target slot
 * @param {Object} course - Course being dropped
 * @param {Object} room - Room assignment
 * @param {Object} dragSourceInfo - Information about drag source
 * @returns {Object} Updated timetable data
 */
export const updateTimetableOnDrop = (timetableData, day, slot, course, room, dragSourceInfo) => {
  let newTimetable = deepCopy(timetableData);
  
  // Remove course from source location if it was moved
  if (dragSourceInfo && dragSourceInfo.day && dragSourceInfo.slot) {
    newTimetable = deleteCourse(newTimetable, dragSourceInfo.day, dragSourceInfo.slot);
  }
  
  // Add course to new location
  newTimetable = addCourseToTimetable(newTimetable, day, slot, course, room);
  
  return newTimetable;
};

/**
 * Filter conflicts after course deletion
 * @param {Array} conflicts - Current conflicts
 * @param {string} day - Day where course was deleted
 * @param {string} slot - Slot where course was deleted
 * @returns {Array} Filtered conflicts
 */
export const filterConflictsAfterDeletion = (conflicts, day, slot) => {
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
  return conflicts.filter(conflict => 
    !(conflict.day === sourceDay && conflict.slot === sourceSlot)
  );
};

/**
 * Create new tab
 * @param {number} tabId - Tab ID
 * @param {string} tabName - Tab name
 * @returns {Object} New tab object
 */
export const createTab = (tabId, tabName = `Timetable ${tabId}`) => {
  return {
    id: tabId,
    name: tabName,
    isActive: false,
    data: initializeEmptyTimetable()
  };
};

/**
 * Update tabs when switching
 * @param {Array} tabs - Current tabs
 * @param {number} activeTabId - ID of active tab
 * @returns {Array} Updated tabs
 */
export const updateTabsOnSwitch = (tabs, activeTabId) => {
  return tabs.map(tab => ({
    ...tab,
    isActive: tab.id === activeTabId
  }));
};
