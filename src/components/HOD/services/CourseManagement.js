// Course Management Service using Firebase
import { 
  db, 
  collection, 
  doc,
  getDoc, 
  getDocs, 
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where, 
  orderBy, 
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from '../../../firebase/config.js';
import { logActivity } from './HODDashboard';
import { 
  getCurrentSemesterPeriod,
  getSemesterNumbersForPeriod 
} from '../../../services/SemesterService';

// Collection references
const COURSES_COLLECTION = 'courses';
const FACULTY_COLLECTION = 'faculty';

// Dummy data for courses (used as fallback)
const dummyCourses = [
  { 
    id: 1, 
    code: 'CS101', 
    title: 'Introduction to Computer Science', 
    faculty: { id: 1, name: 'Dr. Alex Johnson', avatar: 'https://via.placeholder.com/36', status: 'available' }, 
    semester: 'Fall 2024', 
    weeklyHours: '3L+1T' 
  },
  { 
    id: 2, 
    code: 'CS202', 
    title: 'Data Structures and Algorithms', 
    faculty: { id: 2, name: 'Dr. Sarah Miller', avatar: 'https://via.placeholder.com/36', status: 'busy' }, 
    semester: 'Spring 2025', 
    weeklyHours: '3L+2P' 
  },
  { 
    id: 3, 
    code: 'CS303', 
    title: 'Database Systems', 
    faculty: { id: 3, name: 'Prof. Robert Chen', avatar: 'https://via.placeholder.com/36', status: 'available' }, 
    semester: 'Fall 2024', 
    weeklyHours: '3L+1T+2P' 
  },
  { 
    id: 4, 
    code: 'CS405', 
    title: 'Artificial Intelligence', 
    faculty: { id: 4, name: 'Dr. Emily Zhang', avatar: 'https://via.placeholder.com/36', status: 'available' }, 
    semester: 'Spring 2025', 
    weeklyHours: '4L+2P' 
  },
  { 
    id: 5, 
    code: 'CS301', 
    title: 'Software Engineering', 
    faculty: { id: 5, name: 'Prof. David Wilson', avatar: 'https://via.placeholder.com/36', status: 'on-leave' }, 
    semester: 'Fall 2024', 
    weeklyHours: '3L+1T' 
  },
  { 
    id: 6, 
    code: 'CS210', 
    title: 'Computer Networks', 
    faculty: null, 
    semester: 'Spring 2025', 
    weeklyHours: '3L+1T+1P' 
  },
];

// Dummy data for faculty (used as fallback)
const dummyFaculty = [
  { id: 1, name: 'Dr. Alex Johnson', avatar: 'https://via.placeholder.com/36', status: 'available' },
  { id: 2, name: 'Dr. Sarah Miller', avatar: 'https://via.placeholder.com/36', status: 'busy' },
  { id: 3, name: 'Prof. Robert Chen', avatar: 'https://via.placeholder.com/36', status: 'available' },
  { id: 4, name: 'Dr. Emily Zhang', avatar: 'https://via.placeholder.com/36', status: 'available' },
  { id: 5, name: 'Prof. David Wilson', avatar: 'https://via.placeholder.com/36', status: 'on-leave' },
  { id: 6, name: 'Dr. Lisa Kumar', avatar: 'https://via.placeholder.com/36', status: 'available' },
  { id: 7, name: 'Prof. Michael Brown', avatar: 'https://via.placeholder.com/36', status: 'busy' },
];

/**
 * Fetch courses from Firebase
 * @param {string} departmentId - Department ID 
 * @returns {Promise<Array>} - Array of courses
 */
export const fetchCourses = async (departmentId) => {
  try {
    const coursesRef = collection(db, COURSES_COLLECTION);
    const coursesQuery = query(coursesRef, where('department', '==', departmentId));
    
    const snapshot = await getDocs(coursesQuery);
    
    if (snapshot.empty) {
      console.log('No courses found, using dummy data');
      return dummyCourses;
    }
    
    const courses = [];
    
    for (const courseDoc of snapshot.docs) {
      const courseData = courseDoc.data();
      let facultyData = null;
      
      // Fetch faculty data if assigned
      if (courseData.faculty) {
        const facultyRef = doc(db, FACULTY_COLLECTION, courseData.faculty);
        const facultySnapshot = await getDoc(facultyRef);
        
        if (facultySnapshot.exists()) {
          const faculty = facultySnapshot.data();
          facultyData = {
            id: courseData.faculty,
            name: faculty.name || '',
            avatar: faculty.avatar || 'https://via.placeholder.com/36',
            status: faculty.status || 'available'
          };
        }
      }
      
      courses.push({
        id: courseDoc.id,
        code: courseData.code || '',
        title: courseData.title || '',
        faculty: facultyData,
        semester: courseData.semester || '',
        weeklyHours: courseData.weeklyHours || ''
      });
    }
    
    return courses;
  } catch (error) {
    console.error('Error fetching courses:', error);
    return dummyCourses;
  }
};

/**
 * Get courses from cache or fetch from Firebase
 * @returns {Array} - Array of courses
 */
export const getCourses = () => {
  // For now, return dummy data
  // In a real implementation, we would check cache first, then fetch from Firebase
  return dummyCourses;
};

/**
 * Fetch faculty from Firebase
 * @param {string} departmentId - Department ID
 * @returns {Promise<Array>} - Array of faculty members
 */
export const fetchFaculty = async (departmentId) => {
  try {
    const facultyRef = collection(db, FACULTY_COLLECTION);
    const facultyQuery = query(facultyRef, where('department', '==', departmentId));
    
    const snapshot = await getDocs(facultyQuery);
    
    if (snapshot.empty) {
      console.log('No faculty found, using dummy data');
      return dummyFaculty;
    }
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        avatar: data.avatar || 'https://via.placeholder.com/36',
        status: data.status || 'available'
      };
    });
  } catch (error) {
    console.error('Error fetching faculty:', error);
    return dummyFaculty;
  }
};

/**
 * Get faculty from cache or fetch from Firebase
 * @returns {Array} - Array of faculty
 */
export const getFaculty = () => {
  // For now, return dummy data
  // In a real implementation, we would check cache first, then fetch from Firebase
  return dummyFaculty;
};

/**
 * Get semester options based on the current period (odd/even)
 * @returns {Array} - Array of semester options
 */
export const getSemesterOptions = () => {
  const currentPeriod = getCurrentSemesterPeriod();
  const semesterNumbers = getSemesterNumbersForPeriod(currentPeriod);
  
  // Generate semester names like "Semester 1", "Semester 3", etc.
  const semesterOptions = semesterNumbers.map(num => `Semester ${num}`);
  
  // Always include "All Semesters" as first option
  return ['All Semesters', ...semesterOptions];
};

/**
 * Filter courses based on search and filters
 * @param {Array} courses - Array of courses
 * @param {string} searchTerm - Search term
 * @param {string} selectedSemester - Selected semester
 * @param {Object} selectedFaculty - Selected faculty
 * @returns {Array} - Filtered courses
 */
export const filterCourses = (courses, searchTerm, selectedSemester, selectedFaculty) => {
  return courses.filter(course => {
    // Filter by semester
    if (selectedSemester !== 'All Semesters' && course.semester !== selectedSemester) {
      return false;
    }
    
    // Filter by faculty
    if (selectedFaculty && (!course.faculty || course.faculty.id !== selectedFaculty.id)) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchesCode = course.code.toLowerCase().includes(term);
      const matchesTitle = course.title.toLowerCase().includes(term);
      
      if (!matchesCode && !matchesTitle) {
        return false;
      }
    }
    
    return true;
  });
};

/**
 * Parse weekly hours from string format
 * @param {string} weeklyHours - Weekly hours string (e.g. "3L+1T+2P")
 * @returns {Object} - Parsed hours
 */
export const parseWeeklyHours = (weeklyHours) => {
  const lectureMatch = weeklyHours.match(/(\d+)L/);
  const tutorialMatch = weeklyHours.match(/(\d+)T/);
  const practicalMatch = weeklyHours.match(/(\d+)P/);
  
  return {
    lectureHours: lectureMatch ? lectureMatch[1] : '0',
    tutorialHours: tutorialMatch ? tutorialMatch[1] : '0',
    practicalHours: practicalMatch ? practicalMatch[1] : '0'
  };
};

/**
 * Format weekly hours from components
 * @param {string} lectureHours - Lecture hours
 * @param {string} tutorialHours - Tutorial hours
 * @param {string} practicalHours - Practical hours
 * @returns {string} - Formatted weekly hours
 */
export const formatWeeklyHours = (lectureHours, tutorialHours, practicalHours) => {
  const parts = [];
  
  if (lectureHours && parseInt(lectureHours) > 0) {
    parts.push(`${lectureHours}L`);
  }
  
  if (tutorialHours && parseInt(tutorialHours) > 0) {
    parts.push(`${tutorialHours}T`);
  }
  
  if (practicalHours && parseInt(practicalHours) > 0) {
    parts.push(`${practicalHours}P`);
  }
  
  return parts.join('+') || '0L';
};

/**
 * Add a new course to Firebase
 * @param {Array} courses - Current courses array
 * @param {Object} formData - Form data for new course
 * @param {Array} faculty - Available faculty
 * @param {string} departmentId - Department ID
 * @returns {Promise<Array>} - Updated courses array
 */
export const addCourse = async (courses, formData, faculty, departmentId) => {
  try {
    const courseData = {
      code: formData.code,
      title: formData.title,
      faculty: formData.faculty ? formData.faculty : null,
      semester: formData.semester,
      weeklyHours: formData.weeklyHours,
      department: departmentId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Additional fields
      lectureHours: parseInt(formData.lectureHours || 0),
      tutorialHours: parseInt(formData.tutorialHours || 0),
      practicalHours: parseInt(formData.practicalHours || 0),
      tags: [] // Can be populated based on course title/code
    };
    
    // Add the course to Firebase
    const courseRef = await addDoc(collection(db, COURSES_COLLECTION), courseData);
    
    // If faculty is assigned, update their assigned courses
    if (formData.faculty) {
      const facultyRef = doc(db, FACULTY_COLLECTION, formData.faculty);
      await updateDoc(facultyRef, {
        assignedCourses: arrayUnion(courseRef.id)
      });
    }
    
    // Log activity
    await logActivity(
      departmentId,
      'course',
      `Added new course: ${formData.code} - ${formData.title}`
    );
    
    // Create a new course object for the UI
    const newCourse = {
      id: courseRef.id,
      ...courseData,
      faculty: formData.faculty 
        ? faculty.find(f => f.id.toString() === formData.faculty)
        : null
    };
    
    // Return updated courses array
    return [...courses, newCourse];
  } catch (error) {
    console.error('Error adding course:', error);
    throw error;
  }
};

/**
 * Update an existing course in Firebase
 * @param {Array} courses - Current courses array
 * @param {string} courseId - Course ID to update
 * @param {Object} formData - Updated course data
 * @param {Array} faculty - Available faculty
 * @param {string} departmentId - Department ID
 * @returns {Promise<Array>} - Updated courses array
 */
export const updateCourse = async (courses, courseId, formData, faculty, departmentId) => {
  try {
    // Find the existing course
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) {
      throw new Error('Course not found');
    }
    
    const existingCourse = courses[courseIndex];
    
    // Prepare update data
    const courseData = {
      code: formData.code,
      title: formData.title,
      faculty: formData.faculty ? formData.faculty : null,
      semester: formData.semester,
      weeklyHours: formData.weeklyHours,
      updatedAt: serverTimestamp(),
      // Additional fields
      lectureHours: parseInt(formData.lectureHours || 0),
      tutorialHours: parseInt(formData.tutorialHours || 0),
      practicalHours: parseInt(formData.practicalHours || 0)
    };
    
    // Update course in Firebase
    const courseRef = doc(db, COURSES_COLLECTION, courseId);
    await updateDoc(courseRef, courseData);
    
    // Handle faculty assignment changes
    const previousFacultyId = existingCourse.faculty ? existingCourse.faculty.id : null;
    const newFacultyId = formData.faculty;
    
    if (previousFacultyId !== newFacultyId) {
      // Remove course from previous faculty's assignments if necessary
      if (previousFacultyId) {
        const prevFacultyRef = doc(db, FACULTY_COLLECTION, previousFacultyId);
        await updateDoc(prevFacultyRef, {
          assignedCourses: arrayRemove(courseId)
        });
      }
      
      // Add course to new faculty's assignments if necessary
      if (newFacultyId) {
        const newFacultyRef = doc(db, FACULTY_COLLECTION, newFacultyId);
        await updateDoc(newFacultyRef, {
          assignedCourses: arrayUnion(courseId)
        });
      }
    }
    
    // Log activity
    await logActivity(
      departmentId,
      'course',
      `Updated course: ${formData.code} - ${formData.title}`
    );
    
    // Create updated course object for UI
    const updatedCourse = {
      ...existingCourse,
      code: formData.code,
      title: formData.title,
      faculty: formData.faculty 
        ? faculty.find(f => f.id.toString() === formData.faculty)
        : null,
      semester: formData.semester,
      weeklyHours: formData.weeklyHours
    };
    
    // Return updated courses array
    return [
      ...courses.slice(0, courseIndex),
      updatedCourse,
      ...courses.slice(courseIndex + 1)
    ];
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
};

/**
 * Delete a course from Firebase
 * @param {Array} courses - Current courses array
 * @param {number} courseId - Course ID to delete
 * @param {string} departmentId - Department ID
 * @returns {Promise<Array>} - Updated courses array
 */
export const deleteCourse = async (courses, courseId, departmentId) => {
  try {
    // Find the course to delete
    const courseToDelete = courses.find(c => c.id === courseId);
    if (!courseToDelete) {
      throw new Error('Course not found');
    }
    
    // Delete the course from Firebase
    const courseRef = doc(db, COURSES_COLLECTION, courseId);
    await deleteDoc(courseRef);
    
    // If the course had a faculty assigned, update their assignments
    if (courseToDelete.faculty && courseToDelete.faculty.id) {
      const facultyRef = doc(db, FACULTY_COLLECTION, courseToDelete.faculty.id);
      await updateDoc(facultyRef, {
        assignedCourses: arrayRemove(courseId)
      });
    }
    
    // Log activity
    await logActivity(
      departmentId,
      'course',
      `Deleted course: ${courseToDelete.code} - ${courseToDelete.title}`
    );
    
    // Return updated courses array
    return courses.filter(c => c.id !== courseId);
  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
};

/**
 * Process uploaded course data and create/update courses in Firebase
 * @param {Array} jsonData - Array of course data from JSON upload
 * @param {Array} courses - Existing courses array
 * @param {Array} faculty - Available faculty
 * @param {string} departmentId - Department ID
 * @returns {Promise<Object>} - Results of the upload process
 */
export const processUploadedCourses = async (jsonData, courses, faculty, departmentId) => {
  try {
    if (!Array.isArray(jsonData)) {
      throw new Error('Uploaded data must be an array of courses');
    }
    
    const results = [];
    const updatedCourses = [...courses];
    
    for (const courseData of jsonData) {
      try {
        // Validate required fields
        if (!courseData.code || !courseData.title || !courseData.semester) {
          results.push({
            code: courseData.code || 'Unknown',
            success: false,
            error: 'Missing required fields (code, title, or semester)'
          });
          continue;
        }
        
        // Check if course already exists
        const existingIndex = updatedCourses.findIndex(c => c.code === courseData.code);
        
        // Format weekly hours
        const lectureHours = courseData.lectureHours || 0;
        const tutorialHours = courseData.tutorialHours || 0;
        const practicalHours = courseData.practicalHours || 0;
        const weeklyHours = formatWeeklyHours(
          lectureHours.toString(), 
          tutorialHours.toString(), 
          practicalHours.toString()
        );
        
        // Find faculty by name or ID if specified
        let facultyId = null;
        if (courseData.faculty) {
          const facultyMember = faculty.find(f => 
            f.id === courseData.faculty || 
            f.name === courseData.faculty
          );
          facultyId = facultyMember ? facultyMember.id : null;
        }
        
        // Prepare the data
        const formattedData = {
          code: courseData.code,
          title: courseData.title,
          faculty: facultyId,
          semester: courseData.semester,
          weeklyHours: weeklyHours,
          lectureHours: lectureHours.toString(),
          tutorialHours: tutorialHours.toString(),
          practicalHours: practicalHours.toString()
        };
        
        // Update or create course
        if (existingIndex !== -1) {
          // Update existing course
          const courseId = updatedCourses[existingIndex].id;
          const updated = await updateCourse(
            updatedCourses, 
            courseId, 
            formattedData, 
            faculty,
            departmentId
          );
          updatedCourses.splice(0, updatedCourses.length, ...updated);
          
          results.push({
            code: courseData.code,
            success: true,
            action: 'updated'
          });
        } else {
          // Create new course
          const updated = await addCourse(updatedCourses, formattedData, faculty, departmentId);
          updatedCourses.splice(0, updatedCourses.length, ...updated);
          
          results.push({
            code: courseData.code,
            success: true,
            action: 'created'
          });
        }
      } catch (courseError) {
        // Add error result for this course
        results.push({
          code: courseData.code || 'Unknown',
          success: false,
          error: courseError.message
        });
      }
    }
    
    // Log activity
    await logActivity(
      departmentId,
      'course',
      `Bulk imported ${results.filter(r => r.success).length} courses`
    );
    
    return { results, updatedCourses };
  } catch (error) {
    console.error('Error processing uploaded courses:', error);
    throw error;
  }
};

/**
 * Get example course data in JSON format
 * @returns {Array} - Example course data
 */
export const getExampleCourseData = () => {
  return [
    {
      code: "CS101",
      title: "Introduction to Computer Science",
      faculty: "Dr. Alex Johnson",
      semester: "Fall 2024",
      lectureHours: 3,
      tutorialHours: 1,
      practicalHours: 0
    },
    {
      code: "CS202",
      title: "Data Structures and Algorithms",
      faculty: null,
      semester: "Spring 2025",
      lectureHours: 3,
      tutorialHours: 0,
      practicalHours: 2
    }
  ];
};

// Export functions for use in the component
const CourseManagementService = {
  getCourses,
  getFaculty,
  getSemesterOptions,
  filterCourses,
  addCourse,
  updateCourse,
  deleteCourse,
  parseWeeklyHours,
  formatWeeklyHours,
  processUploadedCourses,
  getExampleCourseData
};

export default CourseManagementService;