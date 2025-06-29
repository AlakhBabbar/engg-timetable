// Faculty Assignment service using Firebase
import { 
  db, 
  collection, 
  doc,
  getDoc, 
  getDocs, 
  addDoc,
  updateDoc,
  query,
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from '../../../firebase/config.js';
import { logActivity } from './HODDashboard';

// Collection references - aligned with TeacherManagement
const FACULTY_COLLECTION = 'teachers'; // Changed from 'faculty' to 'teachers' to match TeacherManagement
const COURSES_COLLECTION = 'courses';

// No dummy data - fully dynamic Firebase integration

/**
 * Fetch courses from Firebase with optional semester filter
 * @param {string} departmentId - Department ID
 * @param {string} semester - Optional semester filter
 * @returns {Promise<Array>} - Array of courses
 */
export const fetchCourses = async (departmentId, semester = null) => {
  return retryOperation(async () => {
    const coursesRef = collection(db, COURSES_COLLECTION);
    let coursesQuery;
    
    if (semester) {
      coursesQuery = query(
        coursesRef, 
        where('department', '==', departmentId),
        where('semester', '==', semester),
        orderBy('code')
      );
    } else {
      coursesQuery = query(
        coursesRef, 
        where('department', '==', departmentId),
        orderBy('code')
      );
    }
    
    const snapshot = await getDocs(coursesQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        code: data.code || '',
        title: data.title || '',
        semester: data.semester || '',
        weeklyHours: data.weeklyHours || '',
        faculty: data.faculty || null,
        tags: data.tags || [],
        department: data.department || departmentId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    });
  });
};

/**
 * Fetch faculty from Firebase
 * @param {string} departmentId - Department ID
 * @returns {Promise<Array>} - Array of faculty members
 */
export const fetchFaculty = async (departmentId) => {
  return retryOperation(async () => {
    const facultyRef = collection(db, FACULTY_COLLECTION);
    
    // Get both department ID and full name for flexible filtering
    const fullDepartmentName = getDepartmentName(departmentId);
    
    // Try to query with both department formats
    let snapshot;
    try {
      // First try with full department name (TeacherManagement format)
      const facultyQuery = query(
        facultyRef, 
        where('department', '==', fullDepartmentName),
        orderBy('name')
      );
      snapshot = await getDocs(facultyQuery);
      
      // If no results, try with department ID
      if (snapshot.empty && fullDepartmentName !== departmentId) {
        const facultyQueryById = query(
          facultyRef, 
          where('department', '==', departmentId),
          orderBy('name')
        );
        snapshot = await getDocs(facultyQueryById);
      }
    } catch (error) {
      // If orderBy fails (no index), fetch all and filter client-side
      console.warn('Firestore index missing, falling back to client-side filtering');
      const allFacultyQuery = query(facultyRef);
      const allSnapshot = await getDocs(allFacultyQuery);
      
      const filteredDocs = allSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.department === fullDepartmentName || data.department === departmentId;
      });
      
      // Sort client-side
      filteredDocs.sort((a, b) => {
        const nameA = a.data().name || '';
        const nameB = b.data().name || '';
        return nameA.localeCompare(nameB);
      });
      
      snapshot = { docs: filteredDocs };
    }
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        avatar: data.avatar || 'https://i.pravatar.cc/150?img=11',
        status: data.status || 'available',
        loadHours: data.loadHours || 0,
        maxHours: data.maxHours || 40, // Updated default to match TeacherManagement
        expertise: data.expertise || [],
        preferredCourses: data.preferredCourses || [],
        assignedCourses: data.assignedCourses || [],
        department: data.department || departmentId,
        // Additional fields from TeacherManagement
        email: data.email || '',
        qualification: data.qualification || '',
        experience: data.experience || 0,
        active: data.active !== false,
        role: data.role || 'Faculty',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    });
  });
};

/**
 * Calculate time slots from weekly hours string
 * @param {string} weeklyHours - String representing weekly hours (e.g., "3L+1T+2P")
 * @returns {number} - Total hours
 */
export const getTimeSlots = (weeklyHours) => {
  const lectureMatch = weeklyHours.match(/(\d+)L/);
  const tutorialMatch = weeklyHours.match(/(\d+)T/);
  const practicalMatch = weeklyHours.match(/(\d+)P/);
  
  const lectureHours = lectureMatch ? parseInt(lectureMatch[1]) : 0;
  const tutorialHours = tutorialMatch ? parseInt(tutorialMatch[1]) : 0;
  const practicalHours = practicalMatch ? parseInt(practicalMatch[1]) : 0;
  
  return lectureHours + tutorialHours + practicalHours;
};

/**
 * Update faculty load hours in Firebase
 * @param {string} facultyId - Faculty ID to update
 * @param {number} hoursChange - Change in load hours (positive or negative)
 * @returns {Promise<Object>} - Updated faculty data
 */
export const updateFacultyLoad = async (facultyId, hoursChange) => {
  try {
    // Get current faculty data
    const facultyRef = doc(db, FACULTY_COLLECTION, facultyId);
    const facultySnapshot = await getDoc(facultyRef);
    
    if (!facultySnapshot.exists()) {
      throw new Error(`Faculty with ID ${facultyId} not found`);
    }
    
    const facultyData = facultySnapshot.data();
    const currentLoadHours = facultyData.loadHours || 0;
    const maxHours = facultyData.maxHours || 18;
    
    // Calculate new load hours
    const newLoadHours = Math.max(0, currentLoadHours + hoursChange);
    
    // Determine new status based on load percentage
    const loadPercentage = (newLoadHours / maxHours) * 100;
    let newStatus = 'available';
    
    if (loadPercentage > 90) {
      newStatus = 'overloaded';
    } else if (loadPercentage > 70) {
      newStatus = 'nearlyFull';
    }
    
    // Update faculty document
    await updateDoc(facultyRef, {
      loadHours: newLoadHours,
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    
    return {
      id: facultyId,
      loadHours: newLoadHours,
      status: newStatus,
      loadPercentage
    };
  } catch (error) {
    console.error('Error updating faculty load:', error);
    throw error;
  }
};

/**
 * Filter faculty members by search query
 * @param {Array} faculty - Array of faculty members
 * @param {string} searchQuery - Search query
 * @returns {Array} - Filtered faculty members
 */
export const filterFacultyBySearch = (faculty, searchQuery) => {
  if (!searchQuery || searchQuery.trim() === '') {
    return faculty;
  }
  
  const query = searchQuery.toLowerCase();
  return faculty.filter(f => 
    f.name.toLowerCase().includes(query) || 
    f.expertise.some(e => e.toLowerCase().includes(query))
  );
};

/**
 * Assign a faculty member to a course in Firebase
 * @param {string} departmentId - Department ID
 * @param {string} courseId - Course ID
 * @param {string} facultyId - Faculty ID
 * @returns {Promise<Object>} - Result of the assignment
 */
export const assignFacultyToCourse = async (departmentId, courseId, facultyId) => {
  try {
    // Get course data
    const courseRef = doc(db, COURSES_COLLECTION, courseId);
    const courseSnapshot = await getDoc(courseRef);
    
    if (!courseSnapshot.exists()) {
      throw new Error(`Course with ID ${courseId} not found`);
    }
    
    const courseData = courseSnapshot.data();
    const previousFacultyId = courseData.faculty;
    
    // If the course already has the same faculty assigned, do nothing
    if (previousFacultyId === facultyId) {
      return { success: true, course: { id: courseId, ...courseData } };
    }
    
    // If another faculty was previously assigned, update their load
    if (previousFacultyId) {
      // Remove course from previous faculty's assigned courses
      const prevFacultyRef = doc(db, FACULTY_COLLECTION, previousFacultyId);
      await updateDoc(prevFacultyRef, {
        assignedCourses: arrayRemove(courseId)
      });
      
      // Update previous faculty's load hours
      const hoursChange = -getTimeSlots(courseData.weeklyHours);
      await updateFacultyLoad(previousFacultyId, hoursChange);
    }
    
    // Update course with new faculty
    await updateDoc(courseRef, {
      faculty: facultyId,
      updatedAt: serverTimestamp()
    });
    
    // Add course to faculty's assigned courses
    const facultyRef = doc(db, FACULTY_COLLECTION, facultyId);
    await updateDoc(facultyRef, {
      assignedCourses: arrayUnion(courseId)
    });
    
    // Update new faculty's load hours
    const hoursChange = getTimeSlots(courseData.weeklyHours);
    await updateFacultyLoad(facultyId, hoursChange);
    
    // Log the activity
    await logActivity(
      departmentId, 
      'faculty', 
      `Faculty ${facultyId} assigned to course ${courseData.code}`
    );
    
    return { 
      success: true, 
      message: 'Faculty assigned successfully',
      courseId,
      facultyId
    };
  } catch (error) {
    console.error('Error assigning faculty to course:', error);
    return {
      success: false,
      message: 'Error assigning faculty: ' + error.message
    };
  }
};

/**
 * Automatically assign faculty to courses based on expertise match
 * @param {string} departmentId - Department ID 
 * @param {Array} courses - Array of courses
 * @param {Array} faculty - Array of faculty members
 * @returns {Promise<Object>} - Result of auto-assignment
 */
export const autoAssignFaculty = async (departmentId, courses, faculty) => {
  try {
    // Filter out courses that are already assigned
    const unassignedCourses = courses.filter(course => !course.faculty);
    
    // Skip if there are no unassigned courses
    if (unassignedCourses.length === 0) {
      return {
        success: true,
        message: 'All courses are already assigned',
        assignedCount: 0
      };
    }
    
    // Filter out overloaded faculty
    const availableFaculty = faculty.filter(f => f.status !== 'overloaded');
    
    // Skip if there are no available faculty
    if (availableFaculty.length === 0) {
      return {
        success: false,
        message: 'No available faculty for assignment',
        assignedCount: 0
      };
    }
    
    let assignedCount = 0;
    
    // Process each unassigned course
    for (const course of unassignedCourses) {
      // Find faculty with expertise in the course's tags
      const matchingFaculty = availableFaculty.filter(f => 
        f.expertise.some(exp => course.tags.includes(exp)) ||
        f.preferredCourses.includes(course.code)
      );
      
      if (matchingFaculty.length === 0) {
        continue; // Skip if no matching faculty
      }
      
      // Sort matching faculty by current load (ascending)
      matchingFaculty.sort((a, b) => a.loadHours - b.loadHours);
      
      // Assign the course to the faculty with the lowest load
      const selectedFaculty = matchingFaculty[0];
      
      // Make the assignment
      const result = await assignFacultyToCourse(
        departmentId,
        course.id, 
        selectedFaculty.id
      );
      
      if (result.success) {
        assignedCount++;
        
        // Update the faculty's load for subsequent assignments
        const foundFaculty = availableFaculty.find(f => f.id === selectedFaculty.id);
        if (foundFaculty) {
          const courseHours = getTimeSlots(course.weeklyHours);
          foundFaculty.loadHours += courseHours;
          
          // Update faculty status if needed
          const loadPercentage = (foundFaculty.loadHours / foundFaculty.maxHours) * 100;
          if (loadPercentage > 90) {
            foundFaculty.status = 'overloaded';
          } else if (loadPercentage > 70) {
            foundFaculty.status = 'nearlyFull';
          }
        }
      }
    }
    
    // Log the activity
    await logActivity(
      departmentId, 
      'faculty', 
      `Auto-assigned ${assignedCount} courses to faculty`
    );
    
    return {
      success: true,
      message: `Successfully assigned ${assignedCount} out of ${unassignedCourses.length} courses`,
      assignedCount
    };
  } catch (error) {
    console.error('Error auto-assigning faculty:', error);
    return {
      success: false,
      message: 'Error during auto-assignment: ' + error.message,
      assignedCount: 0
    };
  }
};

/**
 * Save faculty assignments to Firebase
 * @param {string} departmentId - Department ID
 * @returns {Promise<Object>} - Result of the save operation
 */
export const saveAssignments = async (departmentId) => {
  try {
    // Create a snapshot record of current assignments
    const assignmentHistoryRef = collection(db, 'assignmentHistory');
    
    // Get current assignments
    const coursesRef = collection(db, COURSES_COLLECTION);
    const coursesQuery = query(coursesRef, where('department', '==', departmentId));
    const coursesSnapshot = await getDocs(coursesQuery);
    
    const assignments = [];
    coursesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.faculty) {
        assignments.push({
          courseId: doc.id,
          courseCode: data.code,
          facultyId: data.faculty
        });
      }
    });
    
    // Save the assignment record
    await addDoc(assignmentHistoryRef, {
      departmentId,
      timestamp: serverTimestamp(),
      assignments,
      totalAssigned: assignments.length
    });
    
    // Log the activity
    await logActivity(
      departmentId, 
      'faculty', 
      `Faculty assignments saved`
    );
    
    return {
      success: true,
      message: `Successfully saved ${assignments.length} faculty assignments`,
      assignmentCount: assignments.length
    };
  } catch (error) {
    console.error('Error saving assignments:', error);
    return {
      success: false,
      message: 'Error saving assignments: ' + error.message
    };
  }
};

/**
 * Create a new course in Firebase
 * @param {Object} courseData - Course data
 * @returns {Promise<Object>} - Created course
 */
export const createCourse = async (courseData) => {
  try {
    const coursesRef = collection(db, COURSES_COLLECTION);
    const docRef = await addDoc(coursesRef, {
      ...courseData,
      faculty: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      id: docRef.id,
      ...courseData,
      faculty: null
    };
  } catch (error) {
    console.error('Error creating course:', error);
    throw new Error('Failed to create course');
  }
};

/**
 * Create a new faculty member in Firebase (compatible with TeacherManagement structure)
 * @param {Object} facultyData - Faculty data
 * @returns {Promise<Object>} - Created faculty member
 */
export const createFaculty = async (facultyData) => {
  try {
    const facultyRef = collection(db, FACULTY_COLLECTION);
    
    // Create faculty data compatible with TeacherManagement structure
    const teacherData = {
      name: facultyData.name || '',
      email: facultyData.email || '',
      department: facultyData.department || '',
      expertise: facultyData.expertise || [],
      qualification: facultyData.qualification || '',
      experience: facultyData.experience || 0,
      active: facultyData.active !== false,
      role: 'Faculty',
      // Faculty Assignment specific fields
      status: 'available',
      loadHours: 0,
      maxHours: facultyData.maxHours || 40,
      preferredCourses: facultyData.preferredCourses || [],
      assignedCourses: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(facultyRef, teacherData);
    
    return {
      id: docRef.id,
      ...teacherData,
    };
  } catch (error) {
    console.error('Error creating faculty:', error);
    throw new Error('Failed to create faculty member');
  }
};

/**
 * Delete a course from Firebase
 * @param {string} courseId - Course ID to delete
 * @returns {Promise<boolean>} - Success status
 */
export const deleteCourse = async (courseId) => {
  try {
    const courseRef = doc(db, COURSES_COLLECTION, courseId);
    await updateDoc(courseRef, {
      deletedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error deleting course:', error);
    throw new Error('Failed to delete course');
  }
};

/**
 * Delete a faculty member from Firebase
 * @param {string} facultyId - Faculty ID to delete
 * @returns {Promise<boolean>} - Success status
 */
export const deleteFaculty = async (facultyId) => {
  try {
    const facultyRef = doc(db, FACULTY_COLLECTION, facultyId);
    await updateDoc(facultyRef, {
      deletedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error deleting faculty:', error);
    throw new Error('Failed to delete faculty member');
  }
};

/**
 * Get faculty workload statistics
 * @param {Array} faculty - Array of faculty members
 * @returns {Object} - Workload statistics
 */
export const getFacultyWorkloadStats = (faculty) => {
  if (faculty.length === 0) {
    return {
      available: 0,
      nearlyFull: 0,
      overloaded: 0,
      averageLoad: 0,
      totalHours: 0
    };
  }

  const stats = faculty.reduce((acc, f) => {
    acc.totalHours += f.loadHours;
    switch (f.status) {
      case 'available':
        acc.available++;
        break;
      case 'nearlyFull':
        acc.nearlyFull++;
        break;
      case 'overloaded':
        acc.overloaded++;
        break;
    }
    return acc;
  }, { available: 0, nearlyFull: 0, overloaded: 0, totalHours: 0 });

  stats.averageLoad = Math.round(stats.totalHours / faculty.length);
  
  return stats;
};

/**
 * Get course assignment statistics
 * @param {Array} courses - Array of courses
 * @returns {Object} - Assignment statistics
 */
export const getCourseAssignmentStats = (courses) => {
  if (courses.length === 0) {
    return {
      assigned: 0,
      unassigned: 0,
      totalCourses: 0,
      assignmentPercentage: 0
    };
  }

  const assigned = courses.filter(c => c.faculty).length;
  const unassigned = courses.length - assigned;
  const assignmentPercentage = Math.round((assigned / courses.length) * 100);

  return {
    assigned,
    unassigned,
    totalCourses: courses.length,
    assignmentPercentage
  };
};

/**
 * Validate course data before creating/updating
 * @param {Object} courseData - Course data to validate
 * @returns {Object} - Validation result
 */
export const validateCourseData = (courseData) => {
  const errors = [];

  if (!courseData.code || courseData.code.trim() === '') {
    errors.push('Course code is required');
  }

  if (!courseData.title || courseData.title.trim() === '') {
    errors.push('Course title is required');
  }

  if (!courseData.semester || courseData.semester.trim() === '') {
    errors.push('Semester is required');
  }

  if (!courseData.weeklyHours || courseData.weeklyHours.trim() === '') {
    errors.push('Weekly hours is required');
  }

  if (!courseData.department || courseData.department.trim() === '') {
    errors.push('Department is required');
  }

  // Validate weekly hours format (e.g., "3L+1T+2P")
  const hoursPattern = /^(\d+L)?(\+\d+T)?(\+\d+P)?$/;
  if (courseData.weeklyHours && !hoursPattern.test(courseData.weeklyHours)) {
    errors.push('Weekly hours format is invalid (use format like "3L+1T+2P")');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate faculty data before creating/updating
 * @param {Object} facultyData - Faculty data to validate
 * @returns {Object} - Validation result
 */
export const validateFacultyData = (facultyData) => {
  const errors = [];

  if (!facultyData.name || facultyData.name.trim() === '') {
    errors.push('Faculty name is required');
  }

  if (!facultyData.department || facultyData.department.trim() === '') {
    errors.push('Department is required');
  }

  if (facultyData.maxHours && (facultyData.maxHours < 0 || facultyData.maxHours > 40)) {
    errors.push('Max hours should be between 0 and 40');
  }

  if (facultyData.expertise && !Array.isArray(facultyData.expertise)) {
    errors.push('Expertise should be an array');
  }

  if (facultyData.preferredCourses && !Array.isArray(facultyData.preferredCourses)) {
    errors.push('Preferred courses should be an array');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Check Firebase connection health
 * @returns {Promise<boolean>} - Connection status
 */
export const checkFirebaseConnection = async () => {
  try {
    // Try to read a small document or collection
    const testRef = collection(db, 'health_check');
    const testQuery = query(testRef, limit(1));
    await getDocs(testQuery);
    return true;
  } catch (error) {
    console.error('Firebase connection error:', error);
    return false;
  }
};

/**
 * Retry operation with exponential backoff
 * @param {Function} operation - Operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} - Result of the operation
 */
export const retryOperation = async (operation, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Map department ID to full department name for compatibility
 * @param {string} departmentId - Department ID or name
 * @returns {string} - Full department name
 */
export const getDepartmentName = (departmentId) => {
  const departmentMap = {
    'dept_computer_science': 'Computer Science',
    'dept_electrical_engineering': 'Electrical Engineering',
    'dept_mechanical_engineering': 'Mechanical Engineering',
    'dept_civil_engineering': 'Civil Engineering',
    'dept_chemical_engineering': 'Chemical Engineering',
    'dept_agricultural_engineering': 'Agricultural Engineering'
  };
  
  // If it's already a full name, return as is
  if (Object.values(departmentMap).includes(departmentId)) {
    return departmentId;
  }
  
  // If it's a department ID, map it to full name
  return departmentMap[departmentId] || departmentId;
};