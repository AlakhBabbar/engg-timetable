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
  db, collection, query, where, onSnapshot,
  currentSemester, selectedBranch, selectedBatch, selectedType,
  callback
}) => {
  if (!currentSemester || !selectedBranch || !selectedBatch || !selectedType) {
    return () => {}; // Return empty unsubscribe function
  }
  
  const timetableQuery = query(
    collection(db, 'timetables'),
    where('semester', '==', currentSemester),
    where('branch', '==', selectedBranch),
    where('batch', '==', selectedBatch),
    where('type', '==', selectedType)
  );
  
  return onSnapshot(timetableQuery, (snapshot) => {
    if (!snapshot.empty) {
      const docData = snapshot.docs[0].data();
      callback(docData.schedule || initializeEmptyTimetable());
    } else {
      callback(initializeEmptyTimetable());
    }
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
  
  try {
    await setDoc(doc(db, 'timetables', timetableDocId), {
      semester: currentSemester,
      branch: selectedBranch,
      batch: selectedBatch,
      type: selectedType,
      schedule: safeSchedule
    }, { merge: true });
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

    // Check for new conflicts
    const newConflicts = checkConflicts(newTimetable, day, slot, draggedCourse, roomToAssign);
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

// Add course to timetable
export const addCourseToTimetable = (timetableData, day, slot, course, selectedRoom) => {
  const newTimetable = JSON.parse(JSON.stringify(timetableData));
  
  // Add the course to the timetable with the selected room
  newTimetable[day][slot] = {
    ...course,
    room: selectedRoom.id
  };
  
  return newTimetable;
};

// Save timetable
export const saveTimetable = (timetableData) => {
  // In a real app, this would make an API call to save the data
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      console.log('Timetable saved:', timetableData);
      resolve({ success: true, message: 'Timetable saved successfully!' });
    }, 500);
  });
};

// Publish timetable
export const publishTimetable = (timetableData, conflicts) => {
  return new Promise((resolve, reject) => {
    // Check if there are any conflicts first
    if (conflicts.length > 0) {
      reject({ success: false, message: 'Please resolve all conflicts before publishing' });
      return;
    }
    
    // Simulate API delay
    setTimeout(() => {
      console.log('Timetable published:', timetableData);
      resolve({ success: true, message: 'Timetable published successfully!' });
    }, 500);
  });
};

// Get color class for a course based on its color property
export const getCourseColorClass = (course) => {
  const colorMap = {
    'blue': 'bg-blue-100 border-blue-300 text-blue-800',
    'indigo': 'bg-indigo-100 border-indigo-300 text-indigo-800',
    'purple': 'bg-purple-100 border-purple-300 text-purple-800',
    'green': 'bg-green-100 border-green-300 text-green-800',
    'amber': 'bg-amber-100 border-amber-300 text-amber-800',
    'rose': 'bg-rose-100 border-rose-300 text-rose-800'
  };
  
  return colorMap[course.color] || 'bg-gray-100 border-gray-300 text-gray-800';
};

// Filter courses based on selected filters
export const filterCourses = (courses, { selectedSemester, selectedDepartment, selectedFaculty }) => {
  return courses.filter(course => {
    if (selectedSemester && course.semester !== selectedSemester) return false;
    if (selectedDepartment && course.department !== selectedDepartment) return false;
    if (selectedFaculty && course.faculty.id !== selectedFaculty.id) return false;
    return true;
  });
};

// Get compact hour format for display
export const getCompactTimeFormat = (timeSlot) => {
  const parts = timeSlot.split(' - ');
  if (parts.length !== 2) return timeSlot;
  
  const start = parts[0].substring(0, 5);
  const end = parts[1].substring(0, 5);
  return `${start}-${end}`;
};

// Get abbreviated day name
export const getAbbreviatedDay = (day) => {
  return day.substring(0, 3);
};

// Get compacted cell height based on view mode
export const getCellHeight = (viewMode) => {
  return viewMode === 'week' ? 'h-14' : 'h-20';
};

// Optimize display for smaller screens
export const getResponsiveClasses = (isMobile) => {
  return {
    courseBlockWidth: isMobile ? 'w-40' : 'w-52',
    roomSelectionWidth: isMobile ? 'w-44' : 'w-56',
    gapSize: isMobile ? 'gap-1' : 'gap-3',
    fontSize: isMobile ? 'text-xs' : 'text-sm',
    padding: isMobile ? 'p-2' : 'p-4'
  };
};

// Get compact display of course details based on available space
export const getCompactCourseDisplay = (course, isCompact) => {
  if (isCompact) {
    return {
      title: course.id,
      subtitle: course.faculty.name.split(' ')[1], // Just the last name
      room: course.room
    };
  }
  
  return {
    title: `${course.id}: ${course.name}`,
    subtitle: course.faculty.name,
    room: `Room: ${course.room}`
  };
};

// Delete course from timetable
export const deleteCourse = (timetableData, day, slot) => {
  const newTimetable = JSON.parse(JSON.stringify(timetableData));
  newTimetable[day][slot] = null;
  return newTimetable;
};

// Update timetable on course drop
export const updateTimetableOnDrop = (timetableData, day, slot, course, selectedRoom, dragSourceInfo) => {
  const newTimetable = JSON.parse(JSON.stringify(timetableData));

  // If this is a re-drag from another cell, remove the course from its original position
  if (dragSourceInfo) {
    newTimetable[dragSourceInfo.day][dragSourceInfo.slot] = null;
  }

  // Normalize course block structure for timetable grid
  const normalizedCourse = {
    id: course.id || course.code, // prefer id, fallback to code
    code: course.code,
    name: course.title || course.name || '',
    faculty: course.faculty || course.teacher || {},
    teacher: course.teacher || course.faculty || {},
    color: course.color,
    duration: course.duration,
    weeklyHours: course.weeklyHours,
    room: selectedRoom.id,
    roomNumber: selectedRoom.number || '',
  };

  // Add the normalized course to the timetable
  newTimetable[day][slot] = normalizedCourse;

  return newTimetable;
};

// Filter conflicts when a course is deleted
export const filterConflictsAfterDeletion = (conflicts, day, slot) => {
  return conflicts.filter(
    conflict => !(conflict.day === day && conflict.slot === slot)
  );
};

// Filter conflicts related to the source position when moving a course
export const filterConflictsAfterMove = (conflicts, sourceDay, sourceSlot) => {
  return conflicts.filter(
    c => !(c.day === sourceDay && c.slot === sourceSlot)
  );
};

// Create a tab object
export const createTab = (id, name, isActive = true) => {
  return { id, name, isActive };
};

// Update tabs state when switching tabs
export const updateTabsOnSwitch = (tabs, targetTabId) => {
  return tabs.map(tab => ({ 
    ...tab, 
    isActive: tab.id === targetTabId 
  }));
};

// Create a deep copy of a timetable or any object
export const deepCopy = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};
