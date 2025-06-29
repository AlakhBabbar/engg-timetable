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

// Initialize empty timetable data
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
  const facultyId = course.faculty.id;
  Object.keys(timetableData).forEach(d => {
    Object.keys(timetableData[d]).forEach(s => {
      const existingCourse = timetableData[d][s];
      if (existingCourse && existingCourse.faculty.id === facultyId && d === day && s === slot) {
        conflicts.push({
          type: 'faculty',
          message: `${course.faculty.name} already teaching ${existingCourse.id} at ${slot} on ${day}`,
          day,
          slot
        });
      }
    });
  });
  
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

// Additional business logic functions moved from TimetableBuilder.jsx

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
  
  // Add the course to the timetable
  newTimetable[day][slot] = {
    ...course,
    room: selectedRoom.id
  };
  
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