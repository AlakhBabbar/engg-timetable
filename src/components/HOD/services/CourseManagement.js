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
// Import semester service functions
import { 
  getCurrentSemesterPeriod,
  getSemesterNumbersForPeriod,
  getAllSemesterNumbers,
  generateSemesterOptions,
  parseSemesterString,
  formatSemesterName as formatSemesterNameUtil
} from '../../../services/SemesterService';

// Collection references
const COURSES_COLLECTION = 'courses';
const FACULTY_COLLECTION = 'teachers';
const DEPARTMENTS_COLLECTION = 'departments';

// Dummy data for courses (used as fallback)
const dummyCourses = [];

// Dummy data for faculty (used as fallback)
const dummyFaculty = [];

/**
 * Fetch courses from Firebase with support for multiple faculty assignments
 * Includes both department-specific courses and common courses
 * @param {string} departmentName - Department name 
 * @returns {Promise<Array>} - Array of courses
 */
export const fetchCourses = async (departmentName) => {
  // Use the enhanced version that supports the new common course system
  return await fetchCoursesEnhanced(departmentName);
};

/**
 * Fetch a single course by ID from Firebase
 * @param {string} courseId - Course document ID
 * @returns {Promise<Object|null>} - Course data or null if not found
 */
export const fetchSingleCourse = async (courseId) => {
  try {
    const courseDocRef = doc(db, COURSES_COLLECTION, courseId);
    
    const courseSnapshot = await getDoc(courseDocRef);
    
    if (!courseSnapshot.exists()) {
      return null;
    }
    
    const courseData = courseSnapshot.data();
    
    // Fetch faculty data if assigned
    let facultyData = null;
    let facultyList = [];
    
    if (courseData.faculty) {
      try {
        const facultyDoc = await getDoc(doc(db, FACULTY_COLLECTION, courseData.faculty));
        if (facultyDoc.exists()) {
          facultyData = {
            id: facultyDoc.id,
            ...facultyDoc.data()
          };
        }
      } catch (facultyError) {
        console.error('Error fetching primary faculty:', facultyError);
      }
    }
    
    // Fetch multiple faculty if assigned (facultyList field)
    if (courseData.facultyList && Array.isArray(courseData.facultyList)) {
      try {
        for (const facultyId of courseData.facultyList) {
          const facultyDoc = await getDoc(doc(db, FACULTY_COLLECTION, facultyId));
          if (facultyDoc.exists()) {
            facultyList.push({
              id: facultyDoc.id,
              ...facultyDoc.data()
            });
          }
        }
      } catch (facultyListError) {
        console.error('Error fetching faculty list:', facultyListError);
      }
    }
    
    // Ensure weeklyHours is a string
    let finalWeeklyHours = courseData.weeklyHours;
    if (typeof finalWeeklyHours !== 'string') {
      if (finalWeeklyHours && typeof finalWeeklyHours === 'object') {
        // If it's an object, try to format it
        finalWeeklyHours = `${finalWeeklyHours.lecture || 0}-${finalWeeklyHours.tutorial || 0}-${finalWeeklyHours.practical || 0}`;
      } else {
        finalWeeklyHours = String(finalWeeklyHours || '0-0-0');
      }
    }
    
    // Determine if this is a common course (either new system or legacy)
    let isCommon = false;
    
    if (courseData.isCommonCourse === true) {
      isCommon = true; // New system: SuperAdmin marked as common
    } else if (courseData.department === 'common' || 
               courseData.department === 'Common' || 
               courseData.department === 'COMMON') {
      isCommon = true; // Legacy system: department is "common"
    } else {
      // Check if department ID matches common department ID (legacy)
      try {
        const departmentsQuery = query(collection(db, DEPARTMENTS_COLLECTION));
        const departmentsSnapshot = await getDocs(departmentsQuery);
        
        for (const deptDoc of departmentsSnapshot.docs) {
          const deptData = deptDoc.data();
          if (deptData.name && 
              (deptData.name.toLowerCase() === 'common' || 
               deptData.name.toLowerCase() === 'common department') &&
              courseData.department === deptDoc.id) {
            isCommon = true;
            break;
          }
        }
      } catch (deptError) {
        console.error('Error checking common department:', deptError);
      }
    }
    
    const course = {
      id: courseSnapshot.id,
      code: courseData.code || '',
      title: courseData.title || '',
      faculty: facultyData, // Primary faculty (backward compatibility)
      facultyList: facultyList, // All assigned faculty
      semester: courseData.semester || '',
      weeklyHours: finalWeeklyHours,
      department: courseData.department || '',
      isCommon: isCommon,
      isCommonCourse: courseData.isCommonCourse || false, // SuperAdmin flag
      // Include the individual hour fields
      lectureHours: courseData.lectureHours || 0,
      tutorialHours: courseData.tutorialHours || 0,
      practicalHours: courseData.practicalHours || 0,
      // Include other important fields
      credits: courseData.credits || 0,
      type: courseData.type || 'Core',
      description: courseData.description || '',
      prerequisites: courseData.prerequisites || [],
      active: courseData.active !== false,
      facultyId: courseData.facultyId || null,
      createdAt: courseData.createdAt || '',
      updatedAt: courseData.updatedAt || ''
    };
    
    return course;
    
  } catch (error) {
    console.error('Error fetching single course:', error);
    return null;
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
 * @param {string} departmentName - Department name
 * @returns {Promise<Array>} - Array of faculty members
 */
export const fetchFaculty = async (departmentName) => {
  try {
    
    // First, find the department ID from the department name
    let departmentId = null;
    if (departmentName && departmentName !== 'common') {
      try {
        const departmentsRef = collection(db, DEPARTMENTS_COLLECTION);
        const departmentsSnapshot = await getDocs(departmentsRef);
        
        for (const deptDoc of departmentsSnapshot.docs) {
          const deptData = deptDoc.data();
          if (deptData.name === departmentName) {
            departmentId = deptDoc.id;
            break;
          }
        }
        
        if (!departmentId) {
          return dummyFaculty;
        }
      } catch (deptError) {
        console.error('fetchFaculty: Error finding department ID:', deptError);
        return dummyFaculty;
      }
    }
    
    const facultyRef = collection(db, FACULTY_COLLECTION);
    const facultyQuery = query(facultyRef, where('department', '==', departmentId));
    
    const snapshot = await getDocs(facultyQuery);
    
    if (snapshot.empty) {
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
 * Get semester options in standard format only
 * @param {Object} options - Configuration options
 * @param {boolean} options.includeAll - Include all 8 semesters or just current period
 * @returns {Array} - Array of semester options
 */
export const getSemesterOptions = (options = {}) => {
  const { includeAll = false } = options;
  
  // Generate semester options using the simplified service
  const semesterOptions = generateSemesterOptions(includeAll);
  
  // Always include "All Semesters" as first option for filtering
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
/**
 * Parse weekly hours into components (lecture, tutorial, practical)
 * @param {string|number} weeklyHours - Weekly hours string or number
 * @param {Object} courseData - Full course data object (optional) 
 * @returns {Object} - Parsed hours
 */
export const parseWeeklyHours = (weeklyHours, courseData = null) => {
  
  // If course data is provided and has individual hour fields, use them directly
  if (courseData && (courseData.lectureHours !== undefined || courseData.tutorialHours !== undefined || courseData.practicalHours !== undefined)) {
    
    const result = {
      lectureHours: courseData.lectureHours !== undefined && courseData.lectureHours !== null ? courseData.lectureHours.toString() : '0',
      tutorialHours: courseData.tutorialHours !== undefined && courseData.tutorialHours !== null ? courseData.tutorialHours.toString() : '0',
      practicalHours: courseData.practicalHours !== undefined && courseData.practicalHours !== null ? courseData.practicalHours.toString() : '0'
    };
    return result;
  }
  
  // Handle null or undefined values
  if (!weeklyHours && weeklyHours !== 0) {
    return {
      lectureHours: '0',
      tutorialHours: '0',
      practicalHours: '0'
    };
  }
  
  try {
    
    // Handle number format - assume it's total lecture hours
    if (typeof weeklyHours === 'number') {
      const result = {
        lectureHours: weeklyHours.toString(),
        tutorialHours: '0',
        practicalHours: '0'
      };
      return result;
    }
    
    // Convert to string for further processing
    const weeklyHoursStr = weeklyHours.toString();
    
    // Try format with L-T-P suffixes with + separators (e.g., "3L+1T+2P")
    let lectureMatch = weeklyHoursStr.match(/(\d+)L/);
    let tutorialMatch = weeklyHoursStr.match(/(\d+)T/);
    let practicalMatch = weeklyHoursStr.match(/(\d+)P/);
    
    if (lectureMatch || tutorialMatch || practicalMatch) {
      const result = {
        lectureHours: lectureMatch ? lectureMatch[1] : '0',
        tutorialHours: tutorialMatch ? tutorialMatch[1] : '0',
        practicalHours: practicalMatch ? practicalMatch[1] : '0'
      };
      return result;
    }
    
    // Try format without suffixes with dash separators (e.g., "3-1-2")
    const dashSeparated = weeklyHoursStr.split('-');
    if (dashSeparated.length >= 3) {
      const result = {
        lectureHours: dashSeparated[0] || '0',
        tutorialHours: dashSeparated[1] || '0',
        practicalHours: dashSeparated[2] || '0'
      };
      return result;
    }
    
    // If it's a single number string, treat as lecture hours
    const singleNumber = parseInt(weeklyHoursStr);
    if (!isNaN(singleNumber)) {
      const result = {
        lectureHours: singleNumber.toString(),
        tutorialHours: '0',
        practicalHours: '0'
      };
      return result;
    }
    
    // If no recognized format, return defaults
    return {
      lectureHours: '0',
      tutorialHours: '0',
      practicalHours: '0'
    };
    
  } catch (error) {
    return {
      lectureHours: '0',
      tutorialHours: '0',
      practicalHours: '0'
    };
  }
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
 * @param {Object} user - Current user object with permissions
 * @returns {Promise<Array>} - Updated courses array
 */
export const addCourse = async (courses, formData, faculty, departmentId, user = null) => {
  try {
    // Prevent HODs from adding courses to the "common" department unless they have permission
    if (departmentId === 'common' && (!user || !user.canEditCommonCourses)) {
      throw new Error('HODs cannot add courses to the common department. Please contact SuperAdmin.');
    }
    
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
 * @param {string} departmentId - Department ID
 * @param {Object} user - Current user object with permissions
 * @returns {Promise<Array>} - Updated courses array
 */
export const updateCourse = async (courses, courseId, formData, faculty, departmentId, user = null) => {
  try {
    // Find the existing course
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) {
      throw new Error('Course not found');
    }
    
    const existingCourse = courses[courseIndex];
    
    // Prevent HODs from updating common courses unless they have permission
    if (existingCourse.department === 'common' && (!user || !user.canEditCommonCourses)) {
      throw new Error('HODs cannot modify common courses. Please contact SuperAdmin.');
    }
    
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
 * @param {string} departmentId - Department ID
 * @param {Object} user - Current user object with permissions
 * @returns {Promise<Array>} - Updated courses array
 */
export const deleteCourse = async (courses, courseId, departmentId, user = null) => {
  try {
    // Find the course to delete
    const courseToDelete = courses.find(c => c.id === courseId);
    if (!courseToDelete) {
      throw new Error('Course not found');
    }
    
    // Prevent HODs from deleting common courses unless they have permission
    if (courseToDelete.department === 'common' && (!user || !user.canEditCommonCourses)) {
      throw new Error('HODs cannot delete common courses. Please contact SuperAdmin.');
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
 * @param {Object} user - Current user object with permissions
 * @returns {Promise<Object>} Result object with success status
 */
export const processSingleCourseImport = async (courseData, faculty, departmentId, user = null) => {
  try {
    // Prevent HODs from uploading courses to the "common" department unless they have permission
    if (departmentId === 'common' && (!user || !user.canEditCommonCourses)) {
      return {
        success: false,
        error: 'HODs cannot upload courses to the common department. Please contact SuperAdmin.',
        item: courseData
      };
    }
    
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
 * Process a single course import for SuperAdmin (allows department override)
 * @param {Object} courseData - Single course data object
 * @param {Array} faculty - Available faculty list
 * @param {string} fallbackDepartmentId - Fallback department ID if not specified in course data
 * @returns {Promise<Object>} Result object with success status
 */
export const processSuperAdminCourseImport = async (courseData, faculty, fallbackDepartmentId) => {
  try {
    // Validate required fields
    if (!courseData.code || !courseData.title || !courseData.semester) {
      return {
        success: false,
        error: 'Missing required fields (code, title, or semester)',
        item: courseData
      };
    }

    // For SuperAdmin: Use department from JSON if specified, otherwise use fallback
    const departmentId = courseData.department || fallbackDepartmentId;
    
    if (!departmentId) {
      return {
        success: false,
        error: 'No department specified and no fallback department provided',
        item: courseData
      };
    }

    // Format weekly hours
    const lectureHours = parseInt(courseData.lectureHours) || 0;
    const tutorialHours = parseInt(courseData.tutorialHours) || 0;
    const practicalHours = parseInt(courseData.practicalHours) || 0;
    const totalHours = lectureHours + tutorialHours + practicalHours;

    // Find faculty member if specified (can be from any department for SuperAdmin)
    let assignedFaculty = null;
    if (courseData.faculty) {
      assignedFaculty = faculty.find(f => 
        f.name.toLowerCase().includes(courseData.faculty.toLowerCase()) ||
        f.email.toLowerCase() === courseData.faculty.toLowerCase() ||
        f.id === courseData.faculty
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
      facultyList: assignedFaculty ? [assignedFaculty.id] : [],
      credits: courseData.credits || Math.ceil(totalHours / 3),
      department: departmentId, // Use specified department or fallback
      type: courseData.type || 'Core',
      description: courseData.description || '',
      prerequisites: Array.isArray(courseData.prerequisites) ? courseData.prerequisites : [],
      active: courseData.active !== false, // Default to true unless explicitly false
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Generate unique document ID with department to avoid conflicts
    const docId = `${courseDoc.code}_${courseDoc.semester.replace(/\s+/g, '_')}_${departmentId}`;
    
    // Check if course already exists in Firebase
    const courseRef = doc(db, COURSES_COLLECTION, docId);
    const existingDoc = await getDoc(courseRef);
    
    if (existingDoc.exists()) {
      // Update existing course
      await updateDoc(courseRef, {
        ...courseDoc,
        createdAt: existingDoc.data().createdAt, // Keep original creation date
      });
      
      // Update faculty assignment if applicable
      if (assignedFaculty) {
        const facultyRef = doc(db, FACULTY_COLLECTION, assignedFaculty.id);
        await updateDoc(facultyRef, {
          assignedCourses: arrayUnion(docId)
        });
      }
      
      return {
        success: true,
        action: 'updated',
        code: courseData.code,
        title: courseData.title,
        department: departmentId,
        item: courseData
      };
    } else {
      // Create new course
      await setDoc(courseRef, courseDoc);
      
      // Update faculty assignment if applicable
      if (assignedFaculty) {
        const facultyRef = doc(db, FACULTY_COLLECTION, assignedFaculty.id);
        await updateDoc(facultyRef, {
          assignedCourses: arrayUnion(docId)
        });
      }
      
      return {
        success: true,
        action: 'created',
        code: courseData.code,
        title: courseData.title,
        department: departmentId,
        item: courseData
      };
    }

  } catch (error) {
    console.error('Error processing SuperAdmin course import:', error);
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
      semester: "Semester 1",
      lectureHours: 3,
      tutorialHours: 1,
      practicalHours: 0
    },
    {
      code: "CS202",
      title: "Data Structures and Algorithms",
      faculty: null,
      semester: "Semester 2",
      lectureHours: 3,
      tutorialHours: 0,
      practicalHours: 2
    },
    {
      code: "MATH101",
      title: "Engineering Mathematics I",
      faculty: "Dr. Sarah Miller",
      semester: "Semester 1",
      lectureHours: 4,
      tutorialHours: 1,
      practicalHours: 0
    },
    {
      code: "PHY101",
      title: "Engineering Physics",
      faculty: "Dr. John Smith",
      semester: "Semester 1",
      lectureHours: 3,
      tutorialHours: 1,
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

/**
 * Create sample common courses for testing (for development only)
 * @returns {Promise<void>}
 */
export const createSampleCommonCourses = async () => {
  try {
    
    const sampleCommonCourses = [
      {
        code: 'MATH101',
        title: 'Engineering Mathematics I',
        semester: 'Semester 1',
        lectureHours: 4,
        tutorialHours: 1,
        practicalHours: 0,
        weeklyHours: '4L+1T',
        department: 'common',
        faculty: null,
        facultyList: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        code: 'PHY101',
        title: 'Engineering Physics',
        semester: 'Semester 1',
        lectureHours: 3,
        tutorialHours: 1,
        practicalHours: 2,
        weeklyHours: '3L+1T+2P',
        department: 'common',
        faculty: null,
        facultyList: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        code: 'CHEM101',
        title: 'Engineering Chemistry',
        semester: 'Semester 1',
        lectureHours: 3,
        tutorialHours: 0,
        practicalHours: 2,
        weeklyHours: '3L+2P',
        department: 'common',
        faculty: null,
        facultyList: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        code: 'ENG101',
        title: 'Technical Communication',
        semester: 'Semester 2',
        lectureHours: 2,
        tutorialHours: 1,
        practicalHours: 0,
        weeklyHours: '2L+1T',
        department: 'common',
        faculty: null,
        facultyList: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];
    
    for (const courseData of sampleCommonCourses) {
      const courseRef = doc(db, COURSES_COLLECTION, `${courseData.code}_${courseData.semester.replace(/\s+/g, '_')}_common`);
      
      // Check if course already exists
      const existingDoc = await getDoc(courseRef);
      if (!existingDoc.exists()) {
        await setDoc(courseRef, courseData);
      }
    }
    
  } catch (error) {
    console.error('Error creating sample common courses:', error);
  }
};

/**
 * Fetch courses from Firebase with support for common courses (enhanced)
 * Includes both department-specific courses and courses marked as common by SuperAdmin
 * @param {string} departmentName - Department name 
 * @returns {Promise<Array>} - Array of courses
 */
export const fetchCoursesEnhanced = async (departmentName) => {
  try {
    const coursesRef = collection(db, COURSES_COLLECTION);
    
    // First, find the department ID from the department name
    let departmentId = null;
    
    try {
      const departmentsRef = collection(db, DEPARTMENTS_COLLECTION);
      const departmentsSnapshot = await getDocs(departmentsRef);
      
      for (const deptDoc of departmentsSnapshot.docs) {
        const deptData = deptDoc.data();
        
        // Check if this is the user's department
        if (deptData.name === departmentName) {
          departmentId = deptDoc.id;
          break;
        }
      }
      
      if (!departmentId && departmentName !== 'common') {
        console.warn(`Department "${departmentName}" not found in database`);
        return dummyCourses;
      }
    } catch (deptError) {
      console.error('fetchCoursesEnhanced: Error finding department ID:', deptError);
      return dummyCourses;
    }
    
    // Query 1: Courses owned by this department
    const ownedCoursesQuery = query(coursesRef, where('department', '==', departmentId));
    const ownedSnapshot = await getDocs(ownedCoursesQuery);
    
    // Query 2: Common courses (marked by SuperAdmin with isCommonCourse flag)
    const commonCoursesQuery = query(coursesRef, where('isCommonCourse', '==', true));
    const commonSnapshot = await getDocs(commonCoursesQuery);
    
    // Query 3: Legacy common courses (for backward compatibility)
    const legacyCommonQuery1 = query(coursesRef, where('department', '==', 'common'));
    const legacyCommonQuery2 = query(coursesRef, where('department', '==', 'Common'));
    const legacyCommonQuery3 = query(coursesRef, where('department', '==', 'COMMON'));
    
    const [legacySnapshot1, legacySnapshot2, legacySnapshot3] = await Promise.all([
      getDocs(legacyCommonQuery1),
      getDocs(legacyCommonQuery2),
      getDocs(legacyCommonQuery3)
    ]);
    
    // Combine all course documents and remove duplicates
    const allCourseDocs = [...ownedSnapshot.docs];
    
    // Add common courses (new system)
    commonSnapshot.docs.forEach(doc => {
      if (!allCourseDocs.find(existing => existing.id === doc.id)) {
        allCourseDocs.push(doc);
      }
    });
    
    // Add legacy common courses
    [legacySnapshot1, legacySnapshot2, legacySnapshot3].forEach(snapshot => {
      snapshot.docs.forEach(doc => {
        if (!allCourseDocs.find(existing => existing.id === doc.id)) {
          allCourseDocs.push(doc);
        }
      });
    });
    
    if (allCourseDocs.length === 0) {
      return dummyCourses;
    }
    
    const courses = [];
    
    for (const courseDoc of allCourseDocs) {
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
      
      // Format weekly hours
      let finalWeeklyHours = courseData.weeklyHours;
      if (!finalWeeklyHours || finalWeeklyHours === '0' || finalWeeklyHours === 0) {
        const lectureHours = courseData.lectureHours || 0;
        const tutorialHours = courseData.tutorialHours || 0;
        const practicalHours = courseData.practicalHours || 0;
        finalWeeklyHours = `${lectureHours}L`;
        if (tutorialHours > 0) finalWeeklyHours += `+${tutorialHours}T`;
        if (practicalHours > 0) finalWeeklyHours += `+${practicalHours}P`;
        
        if (finalWeeklyHours === '0L') {
          finalWeeklyHours = String(finalWeeklyHours || '0-0-0');
        }
      }
      
      // Determine if this is a common course (either new system or legacy)
      let isCommon = false;
      const isOwnedCourse = courseData.department === departmentId;
      
      if (courseData.isCommonCourse === true) {
        isCommon = true; // New system: SuperAdmin marked as common
      } else if (courseData.department === 'common' || 
                 courseData.department === 'Common' || 
                 courseData.department === 'COMMON') {
        isCommon = true; // Legacy system: department is "common"
      }
      
      const course = {
        id: courseDoc.id,
        code: courseData.code || '',
        title: courseData.title || '',
        faculty: facultyData, // Primary faculty (backward compatibility)
        facultyList: facultyList, // All assigned faculty
        semester: courseData.semester || '',
        weeklyHours: finalWeeklyHours,
        department: courseData.department || '',
        isCommon: isCommon,
        isCommonCourse: courseData.isCommonCourse || false, // SuperAdmin flag
        isOwnedCourse: isOwnedCourse,
        canEdit: isOwnedCourse, // Only allow editing if department owns the course
        // Include the individual hour fields
        lectureHours: courseData.lectureHours || 0,
        tutorialHours: courseData.tutorialHours || 0,
        practicalHours: courseData.practicalHours || 0,
        // Include other important fields
        credits: courseData.credits || 0,
        type: courseData.type || 'Core',
        description: courseData.description || '',
        prerequisites: courseData.prerequisites || [],
        active: courseData.active !== false,
        facultyId: courseData.facultyId || null,
        createdAt: courseData.createdAt || '',
        updatedAt: courseData.updatedAt || ''
      };
      
      courses.push(course);
    }
    
    return courses;
    
  } catch (error) {
    console.error('Error fetching courses (enhanced):', error);
    return dummyCourses;
  }
};

// Export functions for use in the component
const CourseManagementService = {
  fetchCourses,
  fetchSingleCourse,
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
  processSuperAdminCourseImport,
  getExampleCourseData,
  normalizeCourseData,
  getCoursesByFaculty,
  createSampleCommonCourses,
  fetchCoursesEnhanced
};

export default CourseManagementService;