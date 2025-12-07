// Sample room conflict data
export const roomConflictsData = [
  {
    id: 1,
    course1: { 
      id: 'CS101', 
      name: 'Introduction to Computer Science', 
      faculty: { id: 1, name: 'Dr. Alex Johnson' }, 
      time: 'Monday, 09:00 - 10:00',
      room: 'A101'
    },
    course2: { 
      id: 'EE201', 
      name: 'Circuit Theory', 
      faculty: { id: 5, name: 'Prof. Maria Garcia' }, 
      time: 'Monday, 09:00 - 10:00',
      room: 'A101'
    },
    isCritical: true,
    date: new Date().toISOString(),
    resolved: false
  },
  {
    id: 2,
    course1: { 
      id: 'CS303', 
      name: 'Database Systems', 
      faculty: { id: 3, name: 'Prof. Robert Chen' }, 
      time: 'Tuesday, 11:00 - 12:00',
      room: 'B201'
    },
    course2: { 
      id: 'CS202', 
      name: 'Data Structures and Algorithms', 
      faculty: { id: 2, name: 'Dr. Sarah Miller' }, 
      time: 'Tuesday, 11:00 - 12:00',
      room: 'B201'
    },
    isCritical: false,
    date: new Date(Date.now() - 86400000).toISOString(), // yesterday
    resolved: false
  },
  {
    id: 3,
    course1: { 
      id: 'CS405', 
      name: 'Artificial Intelligence', 
      faculty: { id: 4, name: 'Dr. Emily Zhang' }, 
      time: 'Wednesday, 14:00 - 15:00',
      room: 'C302'
    },
    course2: { 
      id: 'ME101', 
      name: 'Engineering Mechanics', 
      faculty: { id: 6, name: 'Dr. John Smith' }, 
      time: 'Wednesday, 14:00 - 15:00',
      room: 'C302'
    },
    isCritical: true,
    date: new Date().toISOString(),
    resolved: false
  },
];

// Sample faculty conflict data
export const facultyConflictsData = [
  {
    id: 4,
    faculty: { id: 2, name: 'Dr. Sarah Miller' },
    course1: { 
      id: 'CS202', 
      name: 'Data Structures and Algorithms', 
      time: 'Thursday, 09:00 - 10:00',
      room: 'A105'
    },
    course2: { 
      id: 'CS204', 
      name: 'Computer Architecture', 
      time: 'Thursday, 09:00 - 10:00',
      room: 'B204'
    },
    isCritical: true,
    date: new Date().toISOString(),
    resolved: false
  },
  {
    id: 5,
    faculty: { id: 3, name: 'Prof. Robert Chen' },
    course1: { 
      id: 'CS303', 
      name: 'Database Systems', 
      time: 'Friday, 11:00 - 12:00',
      room: 'D101'
    },
    course2: { 
      id: 'CS401', 
      name: 'Advanced Databases', 
      time: 'Friday, 11:00 - 12:00',
      room: 'A101'
    },
    isCritical: false,
    date: new Date().toISOString(),
    resolved: false
  }
];

// Sample overlapping courses data
export const overlappingCoursesData = [
  {
    id: 6,
    course1: { 
      id: 'CS101', 
      name: 'Introduction to Computer Science', 
      semester: 1,
      program: 'B.Tech CS',
      time: 'Monday, 14:00 - 15:00',
      faculty: { id: 1, name: 'Dr. Alex Johnson' },
      room: 'A101'
    },
    course2: { 
      id: 'CS303', 
      name: 'Database Systems', 
      semester: 1,
      program: 'B.Tech CS',
      time: 'Monday, 14:00 - 15:00',
      faculty: { id: 3, name: 'Prof. Robert Chen' },
      room: 'B201'
    },
    isCritical: true,
    date: new Date().toISOString(),
    resolved: false
  },
  {
    id: 7,
    course1: { 
      id: 'CS202', 
      name: 'Data Structures and Algorithms', 
      semester: 2,
      program: 'B.Tech CS',
      time: 'Wednesday, 09:00 - 10:00',
      faculty: { id: 2, name: 'Dr. Sarah Miller' },
      room: 'A105'
    },
    course2: { 
      id: 'CS204', 
      name: 'Computer Architecture', 
      semester: 2,
      program: 'B.Tech CS',
      time: 'Wednesday, 09:00 - 10:00',
      faculty: { id: 4, name: 'Dr. Emily Zhang' },
      room: 'C302'
    },
    isCritical: false,
    date: new Date(Date.now() - 86400000).toISOString(), // yesterday
    resolved: false
  }
];

// List of available rooms
export const availableRooms = [
  'A101', 'A105', 'B201', 'B204', 'C302', 'D101'
];

// List of available faculty
export const availableFaculty = [
  { id: 1, name: 'Dr. Alex Johnson' },
  { id: 2, name: 'Dr. Sarah Miller' },
  { id: 3, name: 'Prof. Robert Chen' },
  { id: 4, name: 'Dr. Emily Zhang' },
  { id: 5, name: 'Prof. Maria Garcia' },
  { id: 6, name: 'Dr. John Smith' }
];

// List of available time slots
export const availableTimeSlots = [
  'Monday, 08:00 - 09:00', 
  'Monday, 09:00 - 10:00',
  'Monday, 10:00 - 11:00',
  'Monday, 11:00 - 12:00',
  'Monday, 14:00 - 15:00',
  'Tuesday, 09:00 - 10:00',
  'Tuesday, 10:00 - 11:00',
  'Tuesday, 11:00 - 12:00',
  'Tuesday, 14:00 - 15:00',
  'Wednesday, 09:00 - 10:00',
  'Wednesday, 10:00 - 11:00',
  'Wednesday, 14:00 - 15:00',
  'Thursday, 09:00 - 10:00',
  'Thursday, 11:00 - 12:00',
  'Friday, 09:00 - 10:00',
  'Friday, 11:00 - 12:00',
];

// Helper function to update a conflict
const updateConflict = (conflict, id, updates) => {
  if (conflict.id === id) {
    return {
      ...conflict,
      ...updates,
      resolved: true,
      resolvedDate: new Date().toISOString()
    };
  }
  return conflict;
};

// Mark conflict as resolved
export const markAsResolved = (conflicts, id) => {
  return conflicts.map(conflict => 
    conflict.id === id ? { 
      ...conflict, 
      resolved: true, 
      resolvedDate: new Date().toISOString() 
    } : conflict
  );
};

// Change room for a conflict
export const changeRoom = (conflicts, id, courseIndex, newRoom) => {
  return conflicts.map(conflict => {
    if (conflict.id === id) {
      const updatedConflict = { ...conflict };
      if (courseIndex === 1) {
        updatedConflict.course1 = {
          ...updatedConflict.course1,
          room: newRoom
        };
      } else {
        updatedConflict.course2 = {
          ...updatedConflict.course2,
          room: newRoom
        };
      }
      updatedConflict.resolved = true;
      updatedConflict.resolvedDate = new Date().toISOString();
      return updatedConflict;
    }
    return conflict;
  });
};

// Swap time for a conflict
export const swapTime = (conflicts, id, courseIndex, newTime) => {
  return conflicts.map(conflict => {
    if (conflict.id === id) {
      const updatedConflict = { ...conflict };
      if (courseIndex === 1) {
        updatedConflict.course1 = {
          ...updatedConflict.course1,
          time: newTime
        };
      } else {
        updatedConflict.course2 = {
          ...updatedConflict.course2,
          time: newTime
        };
      }
      updatedConflict.resolved = true;
      updatedConflict.resolvedDate = new Date().toISOString();
      return updatedConflict;
    }
    return conflict;
  });
};

// Reassign faculty for a conflict
export const reassignFaculty = (conflicts, id, courseIndex, newFaculty) => {
  return conflicts.map(conflict => {
    if (conflict.id === id) {
      const updatedConflict = { ...conflict };
      if (courseIndex === 1) {
        updatedConflict.course1 = {
          ...updatedConflict.course1,
          faculty: newFaculty
        };
      } else {
        updatedConflict.course2 = {
          ...updatedConflict.course2,
          faculty: newFaculty
        };
      }
      updatedConflict.resolved = true;
      updatedConflict.resolvedDate = new Date().toISOString();
      return updatedConflict;
    }
    return conflict;
  });
};

// Auto resolve all conflicts
export const autoResolveConflicts = (roomConflicts, facultyConflicts, overlappingCourses) => {
  // For room conflicts, change rooms
  const updatedRoomConflicts = roomConflicts.map(conflict => ({
    ...conflict,
    course2: {
      ...conflict.course2,
      room: availableRooms.find(r => r !== conflict.course1.room && r !== conflict.course2.room) || 'D101'
    },
    resolved: true,
    resolvedDate: new Date().toISOString()
  }));
  
  // For faculty conflicts, swap times
  const updatedFacultyConflicts = facultyConflicts.map(conflict => ({
    ...conflict,
    course2: {
      ...conflict.course2,
      time: availableTimeSlots.find(t => t !== conflict.course1.time && t !== conflict.course2.time) || 'Monday, 08:00 - 09:00'
    },
    resolved: true,
    resolvedDate: new Date().toISOString()
  }));
  
  // For overlapping courses, change rooms and times
  const updatedOverlappingCourses = overlappingCourses.map(conflict => ({
    ...conflict,
    course2: {
      ...conflict.course2,
      time: availableTimeSlots.find(t => t !== conflict.course1.time && t !== conflict.course2.time) || 'Tuesday, 09:00 - 10:00',
      room: availableRooms.find(r => r !== conflict.course1.room) || 'A105'
    },
    resolved: true,
    resolvedDate: new Date().toISOString()
  }));
  
  return {
    roomConflicts: updatedRoomConflicts,
    facultyConflicts: updatedFacultyConflicts,
    overlappingCourses: updatedOverlappingCourses
  };
};

// Calculate summary data from conflicts
export const calculateSummary = (roomConflicts, facultyConflicts, overlappingCourses) => {
  const allConflicts = [...roomConflicts, ...facultyConflicts, ...overlappingCourses];
  const total = allConflicts.length;
  const critical = allConflicts.filter(c => c.isCritical).length;
  const minor = total - critical;
  
  // Count conflicts resolved today
  const today = new Date().toDateString();
  const resolvedToday = allConflicts.filter(c => {
    return c.resolved && new Date(c.resolvedDate).toDateString() === today;
  }).length;
  
  return {
    total,
    critical,
    minor,
    resolvedToday
  };
};

// Mark all conflicts as resolved
export const markAllAsResolved = (roomConflicts, facultyConflicts, overlappingCourses) => {
  const updateFn = (conflict) => ({
    ...conflict, 
    resolved: true, 
    resolvedDate: new Date().toISOString()
  });
  
  return {
    roomConflicts: roomConflicts.map(updateFn),
    facultyConflicts: facultyConflicts.map(updateFn),
    overlappingCourses: overlappingCourses.map(updateFn)
  };
};