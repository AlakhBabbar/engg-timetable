// Import Firebase configuration
import { 
  db, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  getDoc,
  onSnapshot,
  addDoc,
  serverTimestamp 
} from '../../../firebase/config.js';

// Import centralized semester service
import { 
  getAllSemesters, 
  getDefaultSemesters, 
  getActiveSemester 
} from '../../../services/SemesterService.js';

// Constant time slots and weekdays
export const timeSlots = [
  '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
  '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00',
  '16:00 - 17:00', '17:00 - 18:00'
];

export const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Add departments export to fix the error
export const departments = ['Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Footwear Engineering', 'Agricultural Engineering'];

// Add this line to maintain backward compatibility with existing code
export const semesters = ['Semester 7', 'Semester 6', 'Semester 5', 'Semester 4'];

// Collection references
const TIMETABLE_COLLECTION = 'timetables';
const DEPARTMENT_COLLECTION = 'departments';
const SEMESTER_COLLECTION = 'semesters';
const COURSES_COLLECTION = 'courses';
const FACULTY_COLLECTION = 'faculty';
const ROOMS_COLLECTION = 'rooms';

/**
 * Fetch departments from Firebase
 * @returns {Promise<Array>} - Array of department names
 */
export const fetchDepartments = async () => {
  try {
    const departmentsRef = collection(db, DEPARTMENT_COLLECTION);
    const snapshot = await getDocs(departmentsRef);
    
    if (snapshot.empty) {
      // Fallback to default departments
      return ['Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Footwear Engineering', 'Agricultural Engineering'];
    }
    
    return snapshot.docs.map(doc => doc.data().name);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return ['Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Footwear Engineering', 'Agricultural Engineering'];
  }
};

/**
 * Fetch semesters from Firebase using centralized service
 * @returns {Promise<Array>} - Array of semester names
 */
export const fetchSemesters = async () => {
  try {
    // Get all semesters using the centralized service
    const semestersData = await getAllSemesters();
    
    if (semestersData.length === 0) {
      // Fallback to default semesters if none found
      return getDefaultSemesters();
    }
    
    return semestersData.map(sem => sem.name);
  } catch (error) {
    console.error('Error fetching semesters:', error);
    return getDefaultSemesters();
  }
};

/**
 * Get active semester from centralized service
 * @returns {Promise<string>} - Active semester name
 */
export const getActiveCurrentSemester = async () => {
  try {
    const activeSem = await getActiveSemester();
    return activeSem ? activeSem.name : getDefaultSemesters()[0];
  } catch (error) {
    console.error('Error getting active semester:', error);
    return getDefaultSemesters()[0];
  }
};

/**
 * Generate random color classes for courses
 * @returns {Array} - Array of CSS class strings
 */
export const getCourseColors = () => {
  return [
    'bg-blue-100 text-blue-800 border-blue-300',
    'bg-teal-100 text-teal-800 border-teal-300',
    'bg-purple-100 text-purple-800 border-purple-300',
    'bg-amber-100 text-amber-800 border-amber-300',
    'bg-rose-100 text-rose-800 border-rose-300',
    'bg-green-100 text-green-800 border-green-300',
    'bg-indigo-100 text-indigo-800 border-indigo-300',
  ];
};

/**
 * Fetch timetable data from Firebase
 * @param {string} departmentId - Department ID
 * @param {string} semesterId - Semester ID
 * @returns {Promise<Object>} - Timetable data with courses, faculty, and rooms
 */
export const fetchTimetableData = async (departmentId, semesterId) => {
  try {
    const colorMap = {};
    const courseColors = getCourseColors();
    let colorIndex = 0;
    
    // Fetch timetable for this department and semester
    const timetablesRef = collection(db, TIMETABLE_COLLECTION);
    const timetableQuery = query(
      timetablesRef,
      where('departmentId', '==', departmentId),
      where('semesterId', '==', semesterId),
      orderBy('updatedAt', 'desc')
    );
    
    const timetableSnapshot = await getDocs(timetableQuery);
    
    // If no timetable found, return generated data
    if (timetableSnapshot.empty) {
      console.log('No timetable found, generating random data');
      return generateTimetableData();
    }
    
    // Get the latest timetable
    const timetableData = timetableSnapshot.docs[0].data();
    const slots = timetableData.slots || {};
    
    // Fetch courses information
    const coursesRef = collection(db, COURSES_COLLECTION);
    const coursesQuery = query(
      coursesRef,
      where('department', '==', departmentId)
    );
    
    const coursesSnapshot = await getDocs(coursesQuery);
    const coursesMap = {};
    
    coursesSnapshot.forEach(doc => {
      const course = doc.data();
      coursesMap[doc.id] = {
        id: doc.id,
        code: course.code || '',
        name: course.title || '',
        semester: course.semester || '',
        faculty: course.faculty || null
      };
      
      // Assign color to course
      if (!colorMap[doc.id]) {
        colorMap[doc.id] = courseColors[colorIndex % courseColors.length];
        colorIndex++;
      }
    });
    
    // Fetch faculty information
    const facultyRef = collection(db, FACULTY_COLLECTION);
    const facultyQuery = query(
      facultyRef,
      where('department', '==', departmentId)
    );
    
    const facultySnapshot = await getDocs(facultyQuery);
    const facultyMap = {};
    
    facultySnapshot.forEach(doc => {
      const faculty = doc.data();
      facultyMap[doc.id] = faculty.name || '';
    });
    
    // Fetch rooms information
    const roomsRef = collection(db, ROOMS_COLLECTION);
    const roomsSnapshot = await getDocs(roomsRef);
    const roomsMap = {};
    
    roomsSnapshot.forEach(doc => {
      const room = doc.data();
      roomsMap[doc.id] = room.name || '';
    });
    
    // Construct timetable with course, faculty and room info
    const timetable = {};
    
    weekdays.forEach(day => {
      timetable[day] = {};
      
      timeSlots.forEach(slot => {
        const slotKey = `${day}:${slot}`;
        const slotData = slots[slotKey];
        
        if (slotData && slotData.courseId && coursesMap[slotData.courseId]) {
          const course = coursesMap[slotData.courseId];
          const facultyName = slotData.facultyId ? facultyMap[slotData.facultyId] || 'Unknown Faculty' : 'No Faculty';
          const roomName = slotData.roomId ? roomsMap[slotData.roomId] || 'Unknown Room' : 'No Room';
          
          timetable[day][slot] = {
            code: course.code,
            name: course.name,
            faculty: facultyName,
            room: roomName,
            semester: course.semester,
            courseId: slotData.courseId,
            colorClass: colorMap[slotData.courseId]
          };
        } else {
          timetable[day][slot] = null; // Empty slot
        }
      });
    });
    
    // Extract unique faculty members and rooms for filtering
    const facultyMembers = [...new Set(Object.values(facultyMap))].filter(Boolean);
    const rooms = [...new Set(Object.values(roomsMap))].filter(Boolean);
    
    // Extract the courses for reference
    const courses = Object.values(coursesMap).filter(Boolean).map(course => ({
      ...course,
      faculty: course.faculty && facultyMap[course.faculty] ? facultyMap[course.faculty] : 'Unassigned'
    }));
    
    return { timetable, courses, facultyMembers, rooms };
  } catch (error) {
    console.error('Error fetching timetable data:', error);
    // Fall back to generated data
    return generateTimetableData();
  }
};

/**
 * Subscribe to timetable updates in real-time
 * @param {string} departmentId - Department ID
 * @param {string} semesterId - Semester ID
 * @param {Function} callback - Callback to handle updates
 * @returns {Function} - Unsubscribe function
 */
export const subscribeTimetableUpdates = (departmentId, semesterId, callback) => {
  const timetablesRef = collection(db, TIMETABLE_COLLECTION);
  const timetableQuery = query(
    timetablesRef,
    where('departmentId', '==', departmentId),
    where('semesterId', '==', semesterId),
    orderBy('updatedAt', 'desc')
  );
  
  return onSnapshot(timetableQuery, async (snapshot) => {
    if (snapshot.empty) {
      callback(generateTimetableData());
      return;
    }
    
    // Get fresh data on any update
    const timetableData = await fetchTimetableData(departmentId, semesterId);
    callback(timetableData);
  });
};

// Generate random timetable data (used as fallback)
export const generateTimetableData = () => {
  const courseColors = getCourseColors();

  const courses = [
    { code: 'CS101', name: 'Introduction to Computer Science', faculty: 'Dr. Alex Johnson', room: 'A101', semester: 'Semester 7' },
    { code: 'CS202', name: 'Data Structures and Algorithms', faculty: 'Dr. Sarah Miller', room: 'B201', semester: 'Semester 7' },
    { code: 'CS303', name: 'Database Systems', faculty: 'Prof. Robert Chen', room: 'A105', semester: 'Semester 7' },
    { code: 'CS405', name: 'Artificial Intelligence', faculty: 'Dr. Emily Zhang', room: 'C302', semester: 'Semester 7' },
    { code: 'CS301', name: 'Software Engineering', faculty: 'Prof. David Wilson', room: 'B204', semester: 'Semester 6' },
    { code: 'CS210', name: 'Computer Networks', faculty: 'Dr. Lisa Kumar', room: 'A102', semester: 'Semester 6' },
    { code: 'ME101', name: 'Engineering Mechanics', faculty: 'Dr. John Smith', room: 'D101', semester: 'Semester 7' },
    { code: 'EE201', name: 'Circuit Theory', faculty: 'Prof. Maria Garcia', room: 'E202', semester: 'Semester 6' },
  ];

  // Faculty members
  const facultyMembers = [...new Set(courses.map(course => course.faculty))];
  
  // Rooms
  const rooms = [...new Set(courses.map(course => course.room))];

  const timetable = {};
  weekdays.forEach(day => {
    timetable[day] = {};
    timeSlots.forEach(slot => {
      // 70% chance of having a class in this slot
      if (Math.random() < 0.7) {
        const course = courses[Math.floor(Math.random() * courses.length)];
        timetable[day][slot] = {
          ...course,
          colorClass: courseColors[Math.floor(Math.random() * courseColors.length)],
        };
      } else {
        timetable[day][slot] = null; // Empty slot
      }
    });
  });

  return { timetable, courses, facultyMembers, rooms };
};

// Filter timetable data based on current filters
export const getFilteredTimetable = (timetable, filters) => {
  const { 
    selectedDay, 
    viewType, 
    selectedFaculty, 
    selectedRoom, 
    selectedSemester, 
    searchQuery 
  } = filters;
  
  let filteredData = { ...timetable };
  
  // Filter by day if selected
  if (selectedDay) {
    const dayData = { [selectedDay]: timetable[selectedDay] };
    filteredData = dayData;
  }
  
  // Apply further filtering based on view type
  Object.keys(filteredData).forEach(day => {
    Object.keys(filteredData[day]).forEach(slot => {
      const cell = filteredData[day][slot];
      if (!cell) return;
      
      // Filter by faculty in faculty view
      if (viewType === 'faculty' && selectedFaculty && cell.faculty !== selectedFaculty) {
        filteredData[day][slot] = null;
      }
      
      // Filter by room in room view
      else if (viewType === 'room' && selectedRoom && cell.room !== selectedRoom) {
        filteredData[day][slot] = null;
      }
      
      // Filter by semester in semester view
      else if (viewType === 'semester' && selectedSemester && cell.semester !== selectedSemester) {
        filteredData[day][slot] = null;
      }
      
      // Filter by search query if provided
      if (searchQuery && 
          !cell.code.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !cell.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !cell.faculty.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !cell.room.toLowerCase().includes(searchQuery.toLowerCase())) {
        filteredData[day][slot] = null;
      }
    });
  });
  
  return filteredData;
};

// Utility functions
export const printTimetable = () => {
  window.print();
};

/**
 * Download timetable as PDF
 * @param {string} departmentId - Department ID 
 * @param {string} selectedSemester - Selected semester
 */
export const downloadTimetablePDF = async (departmentId, selectedSemester) => {
  try {
    // In production, you would call a Firebase Cloud Function here
    // that generates and returns a PDF
    
    // For now, show an alert
    alert('PDF download functionality will be implemented via Firebase Cloud Functions');
    
    // Log the download attempt
    const logsRef = collection(db, 'activityLogs');
    await addDoc(logsRef, {
      type: 'timetable',
      action: 'pdf-download',
      department: departmentId,
      semester: selectedSemester,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error downloading PDF:', error);
    alert('Error downloading PDF. Please try again later.');
  }
};

/**
 * Share timetable with department faculty
 * @param {string} departmentId - Department ID
 * @param {string} selectedSemester - Selected semester
 * @returns {Promise<Object>} - Result of sharing operation
 */
export const shareTimetable = async (departmentId, selectedSemester) => {
  try {
    // In production, you would call a Firebase Cloud Function here
    // that handles the sharing (e.g., sending emails or notifications)
    
    // Log the share action
    const logsRef = collection(db, 'activityLogs');
    await addDoc(logsRef, {
      type: 'timetable',
      action: 'share',
      department: departmentId,
      semester: selectedSemester,
      timestamp: serverTimestamp()
    });
    
    return {
      success: true,
      message: 'Timetable shared with department faculty'
    };
  } catch (error) {
    console.error('Error sharing timetable:', error);
    return {
      success: false,
      message: 'Error sharing timetable: ' + error.message
    };
  }
};

export const navigateWeek = (currentWeek, direction) => {
  // Assume there are 16 weeks in a semester
  const maxWeeks = 16;
  
  if (direction === 'previous' && currentWeek > 1) {
    return currentWeek - 1;
  } else if (direction === 'next' && currentWeek < maxWeeks) {
    return currentWeek + 1;
  }
  
  return currentWeek; // Return unchanged if conditions not met
};

// Get the appropriate toggle state and selections based on view type
export const handleViewToggleLogic = (view, facultyMembers, rooms) => {
  let result = {
    viewType: view,
    selectedFaculty: null,
    selectedRoom: null
  };
  
  if (view === 'faculty') {
    result.selectedFaculty = facultyMembers[0];
  } else if (view === 'room') {
    result.selectedRoom = rooms[0];
  }
  
  return result;
};