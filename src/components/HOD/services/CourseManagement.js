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
const FACULTY_COLLECTION = 'teachers';

// Dummy data for courses (used as fallback)
const dummyCourses = [];

// Dummy data for faculty (used as fallback)
const dummyFaculty = [];

/**
 * Fetch courses from Firebase with support for multiple faculty assignments
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
      let facultyList = [];
      
      // Handle both single faculty (backward compatibility) and multiple faculty
      const facultyIds = [];
      
      // Add primary faculty if exists
      if (courseData.faculty) {
        facultyIds.push(courseData.faculty);
      }
      
      // Add faculty from facultyList if exists
      if (courseData.facultyList && Array.isArray(courseData.facultyList)) {
        facultyIds.push(...courseData.facultyList.filter(id => id && !facultyIds.includes(id)));
      }
      
      // Fetch all faculty data
      if (facultyIds.length > 0) {
        for (const facultyId of facultyIds) {
          const facultyRef = doc(db, FACULTY_COLLECTION, facultyId);
          const facultySnapshot = await getDoc(facultyRef);
          
          if (facultySnapshot.exists()) {
            const faculty = facultySnapshot.data();
            const facultyInfo = {
              id: facultyId,
              name: faculty.name || '',
              avatar: faculty.avatar || 'https://via.placeholder.com/36',
              status: faculty.status || 'available'
            };
            
            facultyList.push(facultyInfo);
            
            // Set the first faculty as primary for backward compatibility
            if (!facultyData) {
              facultyData = facultyInfo;
            }
          }
        }
      }
      
      courses.push({
        id: courseDoc.id,
        code: courseData.code || '',
        title: courseData.title || '',
        faculty: facultyData, // Primary faculty (backward compatibility)
        facultyList: facultyList, // All assigned faculty
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
 * Filter courses based on search and filters with support for multiple faculty
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
    
    // Filter by faculty - check both primary faculty and facultyList
    if (selectedFaculty) {
      let facultyMatch = false;
      
      // Check primary faculty (backward compatibility)
      if (course.faculty && course.faculty.id === selectedFaculty.id) {
        facultyMatch = true;
      }
      
      // Check facultyList for multiple faculty assignments
      if (!facultyMatch && course.facultyList && Array.isArray(course.facultyList)) {
        facultyMatch = course.facultyList.some(faculty => faculty.id === selectedFaculty.id);
      }
      
      if (!facultyMatch) {
        return false;
      }
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
 * Add a new course to Firebase with support for multiple faculty assignments
 * @param {Array} courses - Current courses array
 * @param {Object} formData - Form data for new course
 * @param {Array} faculty - Available faculty
 * @param {string} departmentId - Department ID
 * @returns {Promise<Array>} - Updated courses array
 */
export const addCourse = async (courses, formData, faculty, departmentId) => {
  try {
    // Prepare faculty assignments
    const facultyIds = [];
    let primaryFacultyId = null;
    
    // Handle single faculty (backward compatibility)
    if (formData.faculty) {
      primaryFacultyId = formData.faculty;
      facultyIds.push(formData.faculty);
    }
    
    // Handle multiple faculty from facultyList
    if (formData.facultyList && Array.isArray(formData.facultyList)) {
      formData.facultyList.forEach(id => {
        if (id && !facultyIds.includes(id)) {
          facultyIds.push(id);
          // Set first faculty as primary if not already set
          if (!primaryFacultyId) {
            primaryFacultyId = id;
          }
        }
      });
    }
    
    const courseData = {
      code: formData.code,
      title: formData.title,
      faculty: primaryFacultyId, // Primary faculty for backward compatibility
      facultyList: facultyIds, // All assigned faculty
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
    
    // Update all assigned faculty's course lists
    if (facultyIds.length > 0) {
      const updatePromises = facultyIds.map(facultyId => {
        const facultyRef = doc(db, FACULTY_COLLECTION, facultyId);
        return updateDoc(facultyRef, {
          assignedCourses: arrayUnion(courseRef.id)
        });
      });
      await Promise.all(updatePromises);
    }
    
    // Log activity
    await logActivity(
      departmentId,
      'course',
      `Added new course: ${formData.code} - ${formData.title} with ${facultyIds.length} faculty assigned`
    );
    
    // Prepare faculty data for UI
    const facultyList = facultyIds.map(id => 
      faculty.find(f => f.id.toString() === id)
    ).filter(Boolean);
    
    // Create a new course object for the UI
    const newCourse = {
      id: courseRef.id,
      ...courseData,
      faculty: facultyList.length > 0 ? facultyList[0] : null, // Primary faculty
      facultyList: facultyList // All assigned faculty
    };
    
    // Return updated courses array
    return [...courses, newCourse];
  } catch (error) {
    console.error('Error adding course:', error);
    throw error;
  }
};

/**
 * Update an existing course in Firebase with support for multiple faculty assignments
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
    
    // Get previous faculty assignments
    const previousFacultyIds = [];
    if (existingCourse.faculty && existingCourse.faculty.id) {
      previousFacultyIds.push(existingCourse.faculty.id);
    }
    if (existingCourse.facultyList && Array.isArray(existingCourse.facultyList)) {
      existingCourse.facultyList.forEach(f => {
        if (f.id && !previousFacultyIds.includes(f.id)) {
          previousFacultyIds.push(f.id);
        }
      });
    }
    
    // Prepare new faculty assignments
    const newFacultyIds = [];
    let primaryFacultyId = null;
    
    // Handle single faculty (backward compatibility)
    if (formData.faculty) {
      primaryFacultyId = formData.faculty;
      newFacultyIds.push(formData.faculty);
    }
    
    // Handle multiple faculty from facultyList
    if (formData.facultyList && Array.isArray(formData.facultyList)) {
      formData.facultyList.forEach(id => {
        if (id && !newFacultyIds.includes(id)) {
          newFacultyIds.push(id);
          // Set first faculty as primary if not already set
          if (!primaryFacultyId) {
            primaryFacultyId = id;
          }
        }
      });
    }
    
    // Prepare update data
    const courseData = {
      code: formData.code,
      title: formData.title,
      faculty: primaryFacultyId, // Primary faculty for backward compatibility
      facultyList: newFacultyIds, // All assigned faculty
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
    const facultyToRemove = previousFacultyIds.filter(id => !newFacultyIds.includes(id));
    const facultyToAdd = newFacultyIds.filter(id => !previousFacultyIds.includes(id));
    
    // Remove course from faculty who are no longer assigned
    if (facultyToRemove.length > 0) {
      const removePromises = facultyToRemove.map(facultyId => {
        const facultyRef = doc(db, FACULTY_COLLECTION, facultyId);
        return updateDoc(facultyRef, {
          assignedCourses: arrayRemove(courseId)
        });
      });
      await Promise.all(removePromises);
    }
    
    // Add course to newly assigned faculty
    if (facultyToAdd.length > 0) {
      const addPromises = facultyToAdd.map(facultyId => {
        const facultyRef = doc(db, FACULTY_COLLECTION, facultyId);
        return updateDoc(facultyRef, {
          assignedCourses: arrayUnion(courseId)
        });
      });
      await Promise.all(addPromises);
    }
    
    // Log activity
    await logActivity(
      departmentId,
      'course',
      `Updated course: ${formData.code} - ${formData.title} with ${newFacultyIds.length} faculty assigned`
    );
    
    // Prepare faculty data for UI
    const facultyList = newFacultyIds.map(id => 
      faculty.find(f => f.id.toString() === id)
    ).filter(Boolean);
    
    // Create updated course object for UI
    const updatedCourse = {
      ...existingCourse,
      code: formData.code,
      title: formData.title,
      faculty: facultyList.length > 0 ? facultyList[0] : null, // Primary faculty
      facultyList: facultyList, // All assigned faculty
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
 * Delete a course from Firebase and remove from all assigned faculty
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
    
    // Get all faculty assigned to this course
    const assignedFacultyIds = [];
    
    // Add primary faculty if exists
    if (courseToDelete.faculty && courseToDelete.faculty.id) {
      assignedFacultyIds.push(courseToDelete.faculty.id);
    }
    
    // Add all faculty from facultyList if exists
    if (courseToDelete.facultyList && Array.isArray(courseToDelete.facultyList)) {
      courseToDelete.facultyList.forEach(faculty => {
        if (faculty.id && !assignedFacultyIds.includes(faculty.id)) {
          assignedFacultyIds.push(faculty.id);
        }
      });
    }
    
    // Delete the course from Firebase
    const courseRef = doc(db, COURSES_COLLECTION, courseId);
    await deleteDoc(courseRef);
    
    // Remove course from all assigned faculty's course lists
    if (assignedFacultyIds.length > 0) {
      const updatePromises = assignedFacultyIds.map(facultyId => {
        const facultyRef = doc(db, FACULTY_COLLECTION, facultyId);
        return updateDoc(facultyRef, {
          assignedCourses: arrayRemove(courseId)
        });
      });
      await Promise.all(updatePromises);
    }
    
    // Log activity
    await logActivity(
      departmentId,
      'course',
      `Deleted course: ${courseToDelete.code} - ${courseToDelete.title} (removed from ${assignedFacultyIds.length} faculty)`
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
 * Process a single course import (used for rate-limited uploads)
 * @param {Object} courseData - Single course data object
 * @param {Array} faculty - Available faculty list
 * @param {string} departmentId - Department ID of the user
 * @returns {Promise<Object>} Result object with success status
 */
export const processSingleCourseImport = async (courseData, faculty, departmentId) => {
  try {
    // Validate required fields
    if (!courseData.code || !courseData.title || !courseData.semester) {
      return {
        success: false,
        error: 'Missing required fields (code, title, or semester)',
        item: courseData
      };
    }

    // Format weekly hours
    const lectureHours = parseInt(courseData.lectureHours) || 0;
    const tutorialHours = parseInt(courseData.tutorialHours) || 0;
    const practicalHours = parseInt(courseData.practicalHours) || 0;
    const totalHours = lectureHours + tutorialHours + practicalHours;

    // Find faculty member if specified
    let assignedFaculty = null;
    if (courseData.faculty) {
      assignedFaculty = faculty.find(f => 
        f.name.toLowerCase().includes(courseData.faculty.toLowerCase()) ||
        f.email.toLowerCase() === courseData.faculty.toLowerCase()
      );
    }

    // Prepare course document
    const courseDoc = {
      code: courseData.code.toUpperCase(),
      title: courseData.title,
      semester: courseData.semester,
      lectureHours,
      tutorialHours,
      practicalHours,
      weeklyHours: totalHours,
      faculty: assignedFaculty ? assignedFaculty.name : courseData.faculty || '',
      facultyId: assignedFaculty ? assignedFaculty.id : null,
      credits: courseData.credits || Math.ceil(totalHours / 3),
      department: departmentId, // Use the user's department, not from JSON data
      type: courseData.type || 'Core',
      description: courseData.description || '',
      prerequisites: Array.isArray(courseData.prerequisites) ? courseData.prerequisites : [],
      active: courseData.active !== false, // Default to true unless explicitly false
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Generate unique document ID
    const docId = `${courseDoc.code}_${courseDoc.semester.replace(/\s+/g, '_')}`;
    
    // Check if course already exists in Firebase
    const courseRef = doc(db, COURSES_COLLECTION, docId);
    const existingDoc = await getDoc(courseRef);
    
    if (existingDoc.exists()) {
      // Update existing course
      await updateDoc(courseRef, {
        ...courseDoc,
        createdAt: existingDoc.data().createdAt, // Keep original creation date
      });
      
      return {
        success: true,
        action: 'updated',
        code: courseData.code,
        title: courseData.title,
        item: courseData
      };
    } else {
      // Create new course
      await setDoc(courseRef, courseDoc);
      
      return {
        success: true,
        action: 'created',
        code: courseData.code,
        title: courseData.title,
        item: courseData
      };
    }

  } catch (error) {
    console.error('Error processing single course import:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      item: courseData
    };
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

/**
 * Helper function to normalize faculty data for consistency
 * @param {Object} course - Course object
 * @returns {Object} - Normalized course object
 */
export const normalizeCourseData = (course) => {
  const facultyIds = [];
  
  // Collect all faculty IDs from both faculty and facultyList
  if (course.faculty) {
    if (typeof course.faculty === 'string') {
      facultyIds.push(course.faculty);
    } else if (course.faculty.id) {
      facultyIds.push(course.faculty.id);
    }
  }
  
  if (course.facultyList && Array.isArray(course.facultyList)) {
    course.facultyList.forEach(faculty => {
      const id = typeof faculty === 'string' ? faculty : faculty.id;
      if (id && !facultyIds.includes(id)) {
        facultyIds.push(id);
      }
    });
  }
  
  return {
    ...course,
    facultyIds: facultyIds, // Normalized array of faculty IDs
    hasMutlipleFaculty: facultyIds.length > 1
  };
};

/**
 * Get all courses assigned to a specific faculty member
 * @param {Array} courses - Array of courses
 * @param {string} facultyId - Faculty ID
 * @returns {Array} - Array of courses assigned to the faculty
 */
export const getCoursesByFaculty = (courses, facultyId) => {
  return courses.filter(course => {
    // Check primary faculty
    if (course.faculty && course.faculty.id === facultyId) {
      return true;
    }
    
    // Check facultyList
    if (course.facultyList && Array.isArray(course.facultyList)) {
      return course.facultyList.some(faculty => faculty.id === facultyId);
    }
    
    return false;
  });
};

// Export functions for use in the component
const CourseManagementService = {
  fetchCourses,
  fetchFaculty,
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
  processSingleCourseImport,
  getExampleCourseData,
  normalizeCourseData,
  getCoursesByFaculty
};

export default CourseManagementService;