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
  arrayRemove,
  writeBatch
} from '../../../firebase/config.js';
import { logActivity } from './HODDashboard';

// Collection references - aligned with TeacherManagement
const FACULTY_COLLECTION = 'teachers'; // Changed from 'faculty' to 'teachers' to match TeacherManagement
const COURSES_COLLECTION = 'courses';
const DEPARTMENTS_COLLECTION = 'departments';

// Local state management for unsaved changes
let localAssignmentState = {
  courses: new Map(), // courseId -> course data with local changes
  faculty: new Map(), // facultyId -> faculty data with local changes
  pendingChanges: [], // Array of change operations to apply on save
  isInitialized: false,
  originalCourses: new Map(), // Original data for comparison
  originalFaculty: new Map()
};

/**
 * Fetch courses from Firebase (renamed to avoid confusion with local state)
 * Includes both department-specific courses and common courses
 * @param {string} departmentName - Department name (e.g., "Computer Science")
 * @param {string} semester - Optional semester filter
 * @returns {Promise<Array>} - Array of courses
 */
export const fetchCoursesFromFirebase = async (departmentName, semester = null) => {
  return retryOperation(async () => {
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
      }
    } catch (deptError) {
      console.error('fetchCoursesFromFirebase: Error finding department IDs:', deptError);
    }
    
    // Create queries for both department-specific and common courses
    const queries = [];
    
    // Add department-specific query if we found a department ID
    if (departmentId) {
      if (semester) {
        queries.push(getDocs(query(coursesRef, 
          where('department', '==', departmentId),
          where('semester', '==', semester),
          orderBy('code')
        )));
      } else {
        queries.push(getDocs(query(coursesRef, 
          where('department', '==', departmentId),
          orderBy('code')
        )));
      }
    }
    
    // Add common courses queries - NEW SYSTEM (SuperAdmin marked common courses)
    if (semester) {
      queries.push(getDocs(query(coursesRef, 
        where('isCommonCourse', '==', true), 
        where('semester', '==', semester)
      )));
    } else {
      queries.push(getDocs(query(coursesRef, where('isCommonCourse', '==', true))));
    }
    
    // Add legacy common courses queries (for backward compatibility)
    if (semester) {
      queries.push(getDocs(query(coursesRef, where('department', '==', 'common'), where('semester', '==', semester))));
      queries.push(getDocs(query(coursesRef, where('department', '==', 'Common'), where('semester', '==', semester))));
      queries.push(getDocs(query(coursesRef, where('department', '==', 'COMMON'), where('semester', '==', semester))));
    } else {
      queries.push(getDocs(query(coursesRef, where('department', '==', 'common'))));
      queries.push(getDocs(query(coursesRef, where('department', '==', 'Common'))));
      queries.push(getDocs(query(coursesRef, where('department', '==', 'COMMON'))));
    }
    
    // Execute all queries
    const snapshots = await Promise.all(queries);
    
    // Combine all course documents
    const allCourseDocs = [];
    snapshots.forEach(snapshot => {
      allCourseDocs.push(...snapshot.docs);
    });
    
    // Remove duplicates based on course ID
    const uniqueCourses = new Map();
    
    allCourseDocs.forEach(doc => {
      if (!uniqueCourses.has(doc.id)) {
        const data = doc.data();
        
        // Determine if this is a common course (new system or legacy)
        const isCommon = data.isCommonCourse === true || 
                        data.department === 'common' || 
                        data.department === 'Common' || 
                        data.department === 'COMMON';
        
        const isOwnedCourse = data.department === departmentId;
        
        uniqueCourses.set(doc.id, {
          id: doc.id,
          code: data.code || '',
          title: data.title || '',
          semester: data.semester || '',
          weeklyHours: data.weeklyHours || '',
          faculty: data.faculty || null, // Keep for backward compatibility
          facultyList: data.facultyList || (data.faculty ? [data.faculty] : []), // Array of faculty IDs
          tags: data.tags || [],
          department: data.department || departmentId,
          isCommon: isCommon, // Flag to identify common courses
          isCommonCourse: data.isCommonCourse || false, // SuperAdmin flag
          isOwnedCourse: isOwnedCourse,
          canEdit: isOwnedCourse, // Only allow editing if department owns the course
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      }
    });
    
    return Array.from(uniqueCourses.values()).sort((a, b) => a.code.localeCompare(b.code));
  });
};

/**
 * Fetch courses from local state (main function for components to use)
 * @param {string} departmentName - Department name (e.g., "Computer Science")
 * @param {string} semester - Optional semester filter
 * @returns {Promise<Array>} - Array of courses from local state
 */
export const fetchCourses = async (departmentName, semester = null) => {
  // Initialize if not already done
  if (!localAssignmentState.isInitialized) {
    await initializeLocalState(departmentName);
  }
  
  const courses = Array.from(localAssignmentState.courses.values());
  
  // Apply semester filter if specified
  if (semester) {
    return courses.filter(course => course.semester === semester);
  }
  
  return courses;
};

/**
 * Fetch faculty from Firebase (renamed to avoid confusion with local state)
 * @param {string} departmentName - Department name (e.g., "Computer Science")
 * @returns {Promise<Array>} - Array of faculty members
 */
export const fetchFacultyFromFirebase = async (departmentName) => {
  return retryOperation(async () => {
    const facultyRef = collection(db, FACULTY_COLLECTION);
    
    // First, find the department ID from the department name
    let departmentId = null;
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
        console.warn(`Department "${departmentName}" not found in database`);
        // Fallback: use department name as ID
        departmentId = departmentName;
      }
    } catch (deptError) {
      console.error('fetchFacultyFromFirebase: Error finding department ID:', deptError);
      // Fallback: use department name as ID
      departmentId = departmentName;
    }
    
    // Try to query with both department formats
    let snapshot;
    try {
      // First try with full department name (TeacherManagement format)
      const facultyQuery = query(
        facultyRef, 
        where('department', '==', departmentName),
        orderBy('name')
      );
      snapshot = await getDocs(facultyQuery);
      
      // If no results, try with department ID
      if (snapshot.empty && departmentName !== departmentId) {
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
        return data.department === departmentName || data.department === departmentId;
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
      
      // Handle backward compatibility for assignedCourses
      let assignedCourses = data.assignedCourses || [];
      
      // If assignedCourses is an array (old format), convert to semester-aware object
      if (Array.isArray(assignedCourses)) {
        console.log(`Converting faculty ${data.name} from old assignment format to semester-aware format`);
        // For now, we'll put all old assignments in a "Legacy" semester
        // In a real migration, you'd want to look up each course's actual semester
        assignedCourses = assignedCourses.length > 0 ? { "Legacy": assignedCourses } : {};
      }
      
      return {
        id: doc.id,
        name: data.name || '',
        avatar: data.avatar || 'https://i.pravatar.cc/150?img=11',
        status: data.status || 'available',
        loadHours: data.loadHours || 0,
        maxHours: data.maxHours || 40, // Updated default to match TeacherManagement
        expertise: data.expertise || [],
        preferredCourses: data.preferredCourses || [],
        assignedCourses: assignedCourses, // Now semester-aware object
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
 * Fetch faculty from local state (main function for components to use)
 * @param {string} departmentName - Department name (e.g., "Computer Science")
 * @returns {Promise<Array>} - Array of faculty members from local state
 */
export const fetchFaculty = async (departmentName) => {
  // Initialize if not already done
  if (!localAssignmentState.isInitialized) {
    await initializeLocalState(departmentName);
  }
  
  return Array.from(localAssignmentState.faculty.values());
};

/**
 * Calculate time slots from weekly hours string
 * @param {string|number} weeklyHours - String representing weekly hours (e.g., "3L+1T+2P") or number
 * @returns {number} - Total hours
 */
export const getTimeSlots = (weeklyHours) => {
  // Handle null, undefined, or empty values
  if (!weeklyHours || weeklyHours === '') {
    return 0;
  }
  
  // Convert to string if it's a number
  let weeklyHoursStr = String(weeklyHours).trim();
  
  // Handle empty string after trimming
  if (!weeklyHoursStr) {
    return 0;
  }
  
  // If it's just a number (no L/T/P format), return the number
  if (/^\d+$/.test(weeklyHoursStr)) {
    return parseInt(weeklyHoursStr) || 0;
  }
  
  // If it's a number, return it
  const hours = parseInt(weeklyHoursStr);
  return isNaN(hours) ? 0 : hours;
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
 * Assign a faculty member to a course in local state (no Firebase update until save)
 * @param {string} departmentName - Department name (e.g., "Computer Science")
 * @param {string} courseId - Course ID
 * @param {string} facultyId - Faculty ID
 * @param {boolean} replace - If true, replace all existing faculty; if false, add to existing
 * @returns {Promise<Object>} - Result of the assignment
 */
export const assignFacultyToCourse = async (departmentId, courseId, facultyId, replace = false) => {
  try {
    if (!localAssignmentState.isInitialized) {
      throw new Error('Local state not initialized. Call initializeLocalState first.');
    }
    
    // Get course and faculty from local state
    const course = localAssignmentState.courses.get(courseId);
    const faculty = localAssignmentState.faculty.get(facultyId);
    
    if (!course) {
      throw new Error(`Course with ID ${courseId} not found in local state`);
    }
    
    if (!faculty) {
      throw new Error(`Faculty with ID ${facultyId} not found in local state`);
    }
    
    // Get the semester for this course
    const courseSemester = course.semester;
    if (!courseSemester) {
      throw new Error(`Course ${course.code} does not have a semester assigned`);
    }
    
    const currentFacultyList = course.facultyList || (course.faculty ? [course.faculty] : []);
    
    // Check if faculty is already assigned
    if (currentFacultyList.includes(facultyId)) {
      return { success: true, message: 'Faculty already assigned to this course', courseId, facultyId };
    }
    
    let newFacultyList;
    let removedFaculty = [];
    
    if (replace) {
      // Replace all existing faculty with new one
      removedFaculty = currentFacultyList.filter(id => id !== facultyId);
      newFacultyList = [facultyId];
    } else {
      // Add faculty to existing list
      newFacultyList = [...currentFacultyList, facultyId];
    }
    
    // Update load hours for removed faculty in local state
    for (const removedFacultyId of removedFaculty) {
      const removedFacultyData = localAssignmentState.faculty.get(removedFacultyId);
      if (removedFacultyData) {
        // Remove course from assigned courses (semester-aware)
        const updatedAssignedCourses = { ...removedFacultyData.assignedCourses };
        if (updatedAssignedCourses[courseSemester]) {
          updatedAssignedCourses[courseSemester] = updatedAssignedCourses[courseSemester].filter(id => id !== courseId);
          // Remove semester key if no courses left
          if (updatedAssignedCourses[courseSemester].length === 0) {
            delete updatedAssignedCourses[courseSemester];
          }
        }
        
        localAssignmentState.faculty.set(removedFacultyId, {
          ...removedFacultyData,
          assignedCourses: updatedAssignedCourses
        });
        
        // Update load hours
        const hoursChange = -(course.credits || course.weeklyHours || 0);
        updateFacultyLoadLocal(removedFacultyId, hoursChange);
      }
    }
    
    // Update course in local state
    const updatedCourse = {
      ...course,
      faculty: newFacultyList[0] || null, // Keep primary faculty for backward compatibility
      facultyList: newFacultyList
    };
    localAssignmentState.courses.set(courseId, updatedCourse);
    
    // Add course to new faculty's assigned courses in local state (semester-aware)
    const updatedAssignedCourses = { ...faculty.assignedCourses };
    
    // Initialize semester array if it doesn't exist
    if (!updatedAssignedCourses[courseSemester]) {
      updatedAssignedCourses[courseSemester] = [];
    }
    
    // Add course if not already in the semester
    if (!updatedAssignedCourses[courseSemester].includes(courseId)) {
      updatedAssignedCourses[courseSemester].push(courseId);
    }
    
    localAssignmentState.faculty.set(facultyId, {
      ...faculty,
      assignedCourses: updatedAssignedCourses
    });
    
    // Update new faculty's load hours (proportional if multiple faculty)
    const totalHours = course.credits || course.weeklyHours || 0;
    const hoursPerFaculty = Math.ceil(totalHours / newFacultyList.length);
    updateFacultyLoadLocal(facultyId, hoursPerFaculty);
    
    // Update load hours for existing faculty if adding to multiple
    if (!replace && currentFacultyList.length > 0) {
      // Redistribute hours among all faculty
      const newHoursPerFaculty = Math.ceil(totalHours / newFacultyList.length);
      const oldHoursPerFaculty = Math.ceil(totalHours / currentFacultyList.length);
      const hoursDifference = newHoursPerFaculty - oldHoursPerFaculty;
      
      for (const existingFacultyId of currentFacultyList) {
        if (hoursDifference !== 0) {
          updateFacultyLoadLocal(existingFacultyId, hoursDifference);
        }
      }
    }
    
    // Record the change for later Firebase update
    localAssignmentState.pendingChanges.push({
      type: 'ASSIGN_FACULTY',
      departmentId,
      courseId,
      facultyId,
      replace,
      timestamp: new Date(),
      description: `Faculty ${facultyId} assigned to course ${course.code} (${replace ? 'replaced' : 'added'})`
    });
    
    return { 
      success: true, 
      message: `Faculty ${replace ? 'replaced' : 'assigned'} successfully (unsaved)`,
      courseId,
      facultyId,
      facultyList: newFacultyList,
      isLocal: true
    };
  } catch (error) {
    console.error('Error assigning faculty to course (local):', error);
    return {
      success: false,
      message: 'Error assigning faculty: ' + error.message
    };
  }
};

/**
 * Remove a faculty member from a course in local state (no Firebase update until save)
 * @param {string} departmentName - Department name (e.g., "Computer Science")
 * @param {string} courseId - Course ID
 * @param {string} facultyId - Faculty ID to remove
 * @returns {Promise<Object>} - Result of the removal
 */
export const removeFacultyFromCourse = async (departmentId, courseId, facultyId) => {
  try {
    if (!localAssignmentState.isInitialized) {
      throw new Error('Local state not initialized. Call initializeLocalState first.');
    }
    
    // Get course and faculty from local state
    const course = localAssignmentState.courses.get(courseId);
    const faculty = localAssignmentState.faculty.get(facultyId);
    
    if (!course) {
      throw new Error(`Course with ID ${courseId} not found in local state`);
    }
    
    if (!faculty) {
      throw new Error(`Faculty with ID ${facultyId} not found in local state`);
    }
    
    // Get the semester for this course
    const courseSemester = course.semester;
    if (!courseSemester) {
      throw new Error(`Course ${course.code} does not have a semester assigned`);
    }
    
    const currentFacultyList = course.facultyList || (course.faculty ? [course.faculty] : []);
    
    // Check if faculty is assigned to this course
    if (!currentFacultyList.includes(facultyId)) {
      return { success: true, message: 'Faculty not assigned to this course', courseId, facultyId };
    }
    
    // Remove faculty from list
    const newFacultyList = currentFacultyList.filter(id => id !== facultyId);
    
    // Update course in local state
    const updatedCourse = {
      ...course,
      faculty: newFacultyList[0] || null, // Update primary faculty
      facultyList: newFacultyList
    };
    localAssignmentState.courses.set(courseId, updatedCourse);
    
    // Remove course from faculty's assigned courses in local state (semester-aware)
    const updatedAssignedCourses = { ...faculty.assignedCourses };
    if (updatedAssignedCourses[courseSemester]) {
      updatedAssignedCourses[courseSemester] = updatedAssignedCourses[courseSemester].filter(id => id !== courseId);
      // Remove semester key if no courses left
      if (updatedAssignedCourses[courseSemester].length === 0) {
        delete updatedAssignedCourses[courseSemester];
      }
    }
    
    localAssignmentState.faculty.set(facultyId, {
      ...faculty,
      assignedCourses: updatedAssignedCourses
    });
    
    // Update faculty's load hours
    const totalHours = course.credits || course.weeklyHours || 0;
    const previousHoursPerFaculty = Math.ceil(totalHours / currentFacultyList.length);
    updateFacultyLoadLocal(facultyId, -previousHoursPerFaculty);
    
    // Redistribute hours among remaining faculty
    if (newFacultyList.length > 0) {
      const newHoursPerFaculty = Math.ceil(totalHours / newFacultyList.length);
      const hoursDifference = newHoursPerFaculty - previousHoursPerFaculty;
      
      if (hoursDifference !== 0) {
        for (const remainingFacultyId of newFacultyList) {
          updateFacultyLoadLocal(remainingFacultyId, hoursDifference);
        }
      }
    }
    
    // Record the change for later Firebase update
    localAssignmentState.pendingChanges.push({
      type: 'REMOVE_FACULTY',
      departmentId,
      courseId,
      facultyId,
      timestamp: new Date(),
      description: `Faculty ${facultyId} removed from course ${course.code}`
    });
    
    return { 
      success: true, 
      message: 'Faculty removed successfully (unsaved)',
      courseId,
      facultyId,
      facultyList: newFacultyList,
      isLocal: true
    };
  } catch (error) {
    console.error('Error removing faculty from course (local):', error);
    return {
      success: false,
      message: 'Error removing faculty: ' + error.message
    };
  }
};

/**
 * Automatically assign faculty to courses based on expertise match (operates on local state)
 * @param {string} departmentName - Department name (e.g., "Computer Science")
 * @param {Array} courses - Array of courses (optional, uses local state if not provided)
 * @param {Array} faculty - Array of faculty members (optional, uses local state if not provided)
 * @param {boolean} allowMultiple - Allow multiple faculty per course
 * @returns {Promise<Object>} - Result of auto-assignment
 */
export const autoAssignFaculty = async (departmentId, courses = null, faculty = null, allowMultiple = false) => {
  try {
    if (!localAssignmentState.isInitialized) {
      await initializeLocalState(departmentId);
    }
    
    // Use local state if not provided
    const targetCourses = courses || Array.from(localAssignmentState.courses.values());
    const availableFacultyList = faculty || Array.from(localAssignmentState.faculty.values());
    
    // Filter courses based on assignment strategy
    const coursesToProcess = allowMultiple 
      ? targetCourses // Include all courses for potential multiple assignments
      : targetCourses.filter(course => !course.faculty && (!course.facultyList || course.facultyList.length === 0));
    
    // Skip if there are no target courses
    if (coursesToProcess.length === 0) {
      return {
        success: true,
        message: allowMultiple ? 'No courses available for additional assignments' : 'All courses are already assigned',
        assignedCount: 0,
        isLocal: true
      };
    }
    
    // Filter out overloaded faculty
    const availableFaculty = availableFacultyList.filter(f => f.status !== 'overloaded');
    
    // Skip if there are no available faculty
    if (availableFaculty.length === 0) {
      return {
        success: false,
        message: 'No available faculty for assignment',
        assignedCount: 0,
        isLocal: true
      };
    }
    
    let assignedCount = 0;
    
    // Process each target course
    for (const course of coursesToProcess) {
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
      
      if (allowMultiple) {
        // For multiple assignments, consider adding faculty to courses that might benefit
        const currentFacultyList = course.facultyList || (course.faculty ? [course.faculty] : []);
        const totalHours = course.credits || course.weeklyHours || 0;
        
        // Only add if the course has high workload and could benefit from multiple faculty
        if (totalHours >= 4 && currentFacultyList.length < 2) {
          // Find faculty not already assigned to this course
          const unassignedMatchingFaculty = matchingFaculty.filter(f => 
            !currentFacultyList.includes(f.id)
          );
          
          if (unassignedMatchingFaculty.length > 0) {
            const selectedFaculty = unassignedMatchingFaculty[0];
            
            // Make the assignment (add to existing)
            const result = await assignFacultyToCourse(
              departmentId,
              course.id, 
              selectedFaculty.id,
              false // Don't replace existing faculty
            );
            
            if (result.success) {
              assignedCount++;
            }
          }
        }
      } else {
        // Single assignment mode - assign to unassigned courses only
        const selectedFaculty = matchingFaculty[0];
        
        // Make the assignment
        const result = await assignFacultyToCourse(
          departmentId,
          course.id, 
          selectedFaculty.id,
          true // Replace any existing faculty
        );
        
        if (result.success) {
          assignedCount++;
        }
      }
    }
    
    // Record the auto-assignment action for later Firebase update
    localAssignmentState.pendingChanges.push({
      type: 'AUTO_ASSIGN',
      departmentId,
      allowMultiple,
      assignedCount,
      timestamp: new Date(),
      description: `Auto-assigned ${assignedCount} ${allowMultiple ? 'additional faculty assignments' : 'courses to faculty'}`
    });
    
    return {
      success: true,
      message: allowMultiple 
        ? `Successfully added ${assignedCount} additional faculty assignments (unsaved)`
        : `Successfully assigned ${assignedCount} out of ${coursesToProcess.length} courses (unsaved)`,
      assignedCount,
      isLocal: true
    };
  } catch (error) {
    console.error('Error auto-assigning faculty (local):', error);
    return {
      success: false,
      message: 'Error during auto-assignment: ' + error.message,
      assignedCount: 0
    };
  }
};

/**
 * Save all pending faculty assignments to Firebase (batch operation)
 * @param {string} departmentName - Department name (e.g., "Computer Science")
 * @returns {Promise<Object>} - Result of the save operation
 */
export const saveAssignments = async (departmentId) => {
  try {
    if (!localAssignmentState.isInitialized) {
      throw new Error('Local state not initialized. Nothing to save.');
    }
    
    if (localAssignmentState.pendingChanges.length === 0) {
      return {
        success: true,
        message: 'No pending changes to save',
        assignmentCount: 0
      };
    }
    
    // Create a batch operation for all changes
    const batch = writeBatch(db);
    
    // Track all assignments for history
    const assignments = [];
    
    // Process all courses with faculty assignments
    for (const [courseId, course] of localAssignmentState.courses.entries()) {
      const originalCourse = localAssignmentState.originalCourses.get(courseId);
      const facultyList = course.facultyList || (course.faculty ? [course.faculty] : []);
      
      // Check if course assignments have changed
      const originalFacultyList = originalCourse?.facultyList || (originalCourse?.faculty ? [originalCourse.faculty] : []);
      const hasChanged = JSON.stringify(facultyList.sort()) !== JSON.stringify(originalFacultyList.sort());
      
      if (hasChanged) {
        // Update course document
        const courseRef = doc(db, COURSES_COLLECTION, courseId);
        batch.update(courseRef, {
          faculty: course.faculty,
          facultyList: course.facultyList,
          updatedAt: serverTimestamp()
        });
      }
      
      // Record assignments for history
      if (facultyList.length > 0) {
        facultyList.forEach(facultyId => {
          assignments.push({
            courseId: courseId,
            courseCode: course.code,
            facultyId: facultyId,
            isPrimary: facultyId === course.faculty,
            totalFacultyCount: facultyList.length
          });
        });
      }
    }
    
    // Process all faculty with load/assignment changes
    for (const [facultyId, faculty] of localAssignmentState.faculty.entries()) {
      const originalFaculty = localAssignmentState.originalFaculty.get(facultyId);
      
      // Check if faculty data has changed
      const hasLoadChanged = faculty.loadHours !== originalFaculty?.loadHours;
      const hasStatusChanged = faculty.status !== originalFaculty?.status;
      
      // Handle semester-aware assignedCourses comparison
      let hasAssignedCoursesChanged = false;
      
      // Convert both to strings for comparison, handling both object and array formats
      const currentAssignments = JSON.stringify(faculty.assignedCourses || {});
      const originalAssignments = JSON.stringify(originalFaculty?.assignedCourses || {});
      hasAssignedCoursesChanged = currentAssignments !== originalAssignments;
      
      console.log(`Faculty ${faculty.name} change check:`, {
        hasLoadChanged,
        hasStatusChanged,
        hasAssignedCoursesChanged,
        currentAssignments: faculty.assignedCourses,
        originalAssignments: originalFaculty?.assignedCourses
      });
      
      if (hasLoadChanged || hasStatusChanged || hasAssignedCoursesChanged) {
        // Update faculty document
        const facultyRef = doc(db, FACULTY_COLLECTION, facultyId);
        batch.update(facultyRef, {
          loadHours: faculty.loadHours,
          status: faculty.status,
          assignedCourses: faculty.assignedCourses,
          updatedAt: serverTimestamp()
        });
      }
    }
    
    // Create assignment history record
    const assignmentHistoryRef = collection(db, 'assignmentHistory');
    const historyDocRef = doc(assignmentHistoryRef);
    batch.set(historyDocRef, {
      departmentId,
      timestamp: serverTimestamp(),
      assignments,
      totalAssigned: assignments.length,
      changesSummary: localAssignmentState.pendingChanges.map(change => ({
        type: change.type,
        description: change.description,
        timestamp: change.timestamp
      }))
    });
    
    // Log activity
    const activityRef = collection(db, 'activityLogs');
    const activityDocRef = doc(activityRef);
    batch.set(activityDocRef, {
      departmentId,
      type: 'faculty',
      description: `Faculty assignments saved (${localAssignmentState.pendingChanges.length} changes)`,
      timestamp: serverTimestamp(),
      details: {
        totalAssignments: assignments.length,
        changeCount: localAssignmentState.pendingChanges.length
      }
    });
    
    // Execute the batch operation
    await batch.commit();
    
    // Update original state to match current state (reset dirty flag)
    localAssignmentState.originalCourses.clear();
    localAssignmentState.originalFaculty.clear();
    
    localAssignmentState.courses.forEach((course, id) => {
      localAssignmentState.originalCourses.set(id, { ...course });
    });
    
    localAssignmentState.faculty.forEach((faculty, id) => {
      localAssignmentState.originalFaculty.set(id, { ...faculty });
    });
    
    const changeCount = localAssignmentState.pendingChanges.length;
    localAssignmentState.pendingChanges = [];
    
    console.log(`Successfully saved ${assignments.length} faculty assignments with ${changeCount} changes`);
    
    return {
      success: true,
      message: `Successfully saved ${assignments.length} faculty assignments (${changeCount} changes applied)`,
      assignmentCount: assignments.length,
      changeCount: changeCount
    };
  } catch (error) {
    console.error('Error saving assignments to Firebase:', error);
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
      facultyList: [], // Initialize empty faculty list for multiple assignments
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      id: docRef.id,
      ...courseData,
      faculty: null,
      facultyList: []
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
      assignedCourses: {}, // Initialize as empty object for semester-aware assignments
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
 * Get faculty workload statistics (uses local state)
 * @param {Array} faculty - Array of faculty members (optional, uses local state if not provided)
 * @returns {Object} - Workload statistics
 */
export const getFacultyWorkloadStats = (faculty = null) => {
  // Use local state if faculty not provided
  const facultyToAnalyze = faculty || (localAssignmentState.isInitialized ? Array.from(localAssignmentState.faculty.values()) : []);
  
  if (facultyToAnalyze.length === 0) {
    return {
      available: 0,
      nearlyFull: 0,
      overloaded: 0,
      averageLoad: 0,
      totalHours: 0,
      hasUnsavedChanges: hasUnsavedChanges()
    };
  }

  const stats = facultyToAnalyze.reduce((acc, f) => {
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

  stats.averageLoad = Math.round(stats.totalHours / facultyToAnalyze.length);
  stats.hasUnsavedChanges = hasUnsavedChanges();
  
  return stats;
};

/**
 * Get course assignment statistics (updated for multiple faculty, uses local state)
 * @param {Array} courses - Array of courses (optional, uses local state if not provided)
 * @returns {Object} - Assignment statistics
 */
export const getCourseAssignmentStats = (courses = null) => {
  // Use local state if courses not provided
  const coursesToAnalyze = courses || (localAssignmentState.isInitialized ? Array.from(localAssignmentState.courses.values()) : []);
  
  if (coursesToAnalyze.length === 0) {
    return {
      assigned: 0,
      unassigned: 0,
      multipleAssigned: 0,
      totalCourses: 0,
      assignmentPercentage: 0,
      averageFacultyPerCourse: 0,
      hasUnsavedChanges: hasUnsavedChanges()
    };
  }

  let assigned = 0;
  let multipleAssigned = 0;
  let totalFacultyAssignments = 0;
  
  coursesToAnalyze.forEach(course => {
    const facultyList = course.facultyList || (course.faculty ? [course.faculty] : []);
    if (facultyList.length > 0) {
      assigned++;
      totalFacultyAssignments += facultyList.length;
      if (facultyList.length > 1) {
        multipleAssigned++;
      }
    }
  });
  
  const unassigned = coursesToAnalyze.length - assigned;
  const assignmentPercentage = Math.round((assigned / coursesToAnalyze.length) * 100);
  const averageFacultyPerCourse = assigned > 0 ? Math.round((totalFacultyAssignments / assigned) * 100) / 100 : 0;

  return {
    assigned,
    unassigned,
    multipleAssigned,
    totalCourses: coursesToAnalyze.length,
    assignmentPercentage,
    averageFacultyPerCourse,
    totalFacultyAssignments,
    hasUnsavedChanges: hasUnsavedChanges()
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
 * @param {string} departmentName - Department name or ID
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

/**
 * Get all faculty assigned to a specific course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} - Array of faculty members assigned to the course
 */
export const getFacultyForCourse = async (courseId) => {
  try {
    // Get course data
    const courseRef = doc(db, COURSES_COLLECTION, courseId);
    const courseSnapshot = await getDoc(courseRef);
    
    if (!courseSnapshot.exists()) {
      throw new Error(`Course with ID ${courseId} not found`);
    }
    
    const courseData = courseSnapshot.data();
    const facultyList = courseData.facultyList || (courseData.faculty ? [courseData.faculty] : []);
    
    if (facultyList.length === 0) {
      return [];
    }
    
    // Fetch faculty details
    const facultyPromises = facultyList.map(async (facultyId) => {
      const facultyRef = doc(db, FACULTY_COLLECTION, facultyId);
      const facultySnapshot = await getDoc(facultyRef);
      
      if (facultySnapshot.exists()) {
        const data = facultySnapshot.data();
        return {
          id: facultySnapshot.id,
          name: data.name || '',
          email: data.email || '',
          isPrimary: facultyId === courseData.faculty,
          ...data
        };
      }
      return null;
    });
    
    const facultyDetails = await Promise.all(facultyPromises);
    return facultyDetails.filter(faculty => faculty !== null);
  } catch (error) {
    console.error('Error fetching faculty for course:', error);
    throw error;
  }
};

/**
 * Get all courses assigned to a specific faculty member
 * @param {string} facultyId - Faculty ID
 * @returns {Promise<Array>} - Array of courses assigned to the faculty
 */
export const getCoursesForFaculty = async (facultyId) => {
  try {
    // Query courses where faculty is in facultyList or is the primary faculty
    const coursesRef = collection(db, COURSES_COLLECTION);
    
    // First, get courses where faculty is the primary faculty
    const primaryQuery = query(coursesRef, where('faculty', '==', facultyId));
    const primarySnapshot = await getDocs(primaryQuery);
    
    // Then, get courses where faculty is in facultyList
    const listQuery = query(coursesRef, where('facultyList', 'array-contains', facultyId));
    const listSnapshot = await getDocs(listQuery);
    
    // Combine and deduplicate results
    const courseMap = new Map();
    
    [primarySnapshot, listSnapshot].forEach(snapshot => {
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const facultyList = data.facultyList || (data.faculty ? [data.faculty] : []);
        
        courseMap.set(doc.id, {
          id: doc.id,
          code: data.code || '',
          title: data.title || '',
          semester: data.semester || '',
          weeklyHours: data.weeklyHours || '',
          department: data.department || '',
          isPrimary: data.faculty === facultyId,
          facultyCount: facultyList.length,
          ...data
        });
      });
    });
    
    return Array.from(courseMap.values());
  } catch (error) {
    console.error('Error fetching courses for faculty:', error);
    throw error;
  }
};

/**
 * Swap faculty assignments between two courses
 * @param {string} departmentName - Department name (e.g., "Computer Science")
 * @param {string} courseId1 - First course ID
 * @param {string} courseId2 - Second course ID
 * @returns {Promise<Object>} - Result of the swap operation
 */
export const swapFacultyAssignments = async (departmentId, courseId1, courseId2) => {
  try {
    // Get both course data
    const course1Ref = doc(db, COURSES_COLLECTION, courseId1);
    const course2Ref = doc(db, COURSES_COLLECTION, courseId2);
    
    const [course1Snapshot, course2Snapshot] = await Promise.all([
      getDoc(course1Ref),
      getDoc(course2Ref)
    ]);
    
    if (!course1Snapshot.exists() || !course2Snapshot.exists()) {
      throw new Error('One or both courses not found');
    }
    
    const course1Data = course1Snapshot.data();
    const course2Data = course2Snapshot.data();
    
    const course1Faculty = course1Data.facultyList || (course1Data.faculty ? [course1Data.faculty] : []);
    const course2Faculty = course2Data.facultyList || (course2Data.faculty ? [course2Data.faculty] : []);
    
    // Update courses with swapped faculty
    await Promise.all([
      updateDoc(course1Ref, {
        faculty: course2Faculty[0] || null,
        facultyList: course2Faculty,
        updatedAt: serverTimestamp()
      }),
      updateDoc(course2Ref, {
        faculty: course1Faculty[0] || null,
        facultyList: course1Faculty,
        updatedAt: serverTimestamp()
      })
    ]);
    
    // Update faculty assigned courses
    const allFaculty = [...new Set([...course1Faculty, ...course2Faculty])];
    
    for (const facultyId of allFaculty) {
      const facultyRef = doc(db, FACULTY_COLLECTION, facultyId);
      
      // Remove both courses and add back as appropriate
      await updateDoc(facultyRef, {
        assignedCourses: arrayRemove(courseId1, courseId2)
      });
      
      if (course2Faculty.includes(facultyId)) {
        await updateDoc(facultyRef, {
          assignedCourses: arrayUnion(courseId1)
        });
      }
      
      if (course1Faculty.includes(facultyId)) {
        await updateDoc(facultyRef, {
          assignedCourses: arrayUnion(courseId2)
        });
      }
    }
    
    // Log the activity
    await logActivity(
      departmentId, 
      'faculty', 
      `Faculty assignments swapped between courses ${course1Data.code} and ${course2Data.code}`
    );
    
    return {
      success: true,
      message: 'Faculty assignments swapped successfully',
      course1: { id: courseId1, facultyList: course2Faculty },
      course2: { id: courseId2, facultyList: course1Faculty }
    };
  } catch (error) {
    console.error('Error swapping faculty assignments:', error);
    return {
      success: false,
      message: 'Error swapping assignments: ' + error.message
    };
  }
};

/**
 * USAGE EXAMPLES FOR LOCAL STATE FACULTY ASSIGNMENTS:
 * 
 * 1. Initialize local state (call first):
 *    await initializeLocalState(departmentName)
 * 
 * 2. Get current data from local state:
 *    const { courses, faculty, hasUnsavedChanges } = getLocalState()
 * 
 * 3. Assign primary faculty to a course (local only):
 *    await assignFacultyToCourse(departmentName, courseId, facultyId, true)
 * 
 * 4. Add additional faculty to a course (local only):
 *    await assignFacultyToCourse(departmentName, courseId, facultyId, false)
 * 
 * 5. Remove specific faculty from a course (local only):
 *    await removeFacultyFromCourse(departmentName, courseId, facultyId)
 * 
 * 6. Auto-assign with multiple faculty support (local only):
 *    await autoAssignFaculty(departmentName, null, null, true)
 * 
 * 7. Check for unsaved changes:
 *    const hasChanges = hasUnsavedChanges()
 * 
 * 8. Get summary of pending changes:
 *    const summary = getPendingChangesSummary()
 * 
 * 9. Save all changes to Firebase:
 *    await saveAssignments(departmentName)
 * 
 * 10. Discard all changes and reset:
 *     await discardChanges(departmentName)
 * 
 * 11. Reset to original state:
 *     resetLocalState()
 * 
 * Note: All assignment operations work on local state until saveAssignments() is called
 */

/**
 * Initialize local state with data from Firebase
 * @param {string} departmentName - Department name (e.g., "Computer Science")
 * @returns {Promise<void>}
 */
export const initializeLocalState = async (departmentName) => {
  try {
    // Fetch fresh data from Firebase
    const [courses, faculty] = await Promise.all([
      fetchCoursesFromFirebase(departmentName),
      fetchFacultyFromFirebase(departmentName)
    ]);
    
    // Initialize local state
    localAssignmentState.courses.clear();
    localAssignmentState.faculty.clear();
    localAssignmentState.originalCourses.clear();
    localAssignmentState.originalFaculty.clear();
    localAssignmentState.pendingChanges = [];
    
    // Store original data for comparison
    courses.forEach(course => {
      localAssignmentState.courses.set(course.id, { ...course });
      localAssignmentState.originalCourses.set(course.id, { ...course });
    });
    
    faculty.forEach(f => {
      localAssignmentState.faculty.set(f.id, { ...f });
      localAssignmentState.originalFaculty.set(f.id, { ...f });
    });
    
    localAssignmentState.isInitialized = true;
    console.log('Local assignment state initialized');
  } catch (error) {
    console.error('Error initializing local state:', error);
    throw error;
  }
};

/**
 * Get current local state (courses and faculty with pending changes)
 * @returns {Object} - Current local state
 */
export const getLocalState = () => {
  if (!localAssignmentState.isInitialized) {
    throw new Error('Local state not initialized. Call initializeLocalState first.');
  }
  
  return {
    courses: Array.from(localAssignmentState.courses.values()),
    faculty: Array.from(localAssignmentState.faculty.values()),
    hasUnsavedChanges: localAssignmentState.pendingChanges.length > 0,
    pendingChangesCount: localAssignmentState.pendingChanges.length
  };
};

/**
 * Reset local state to original Firebase data
 * @returns {void}
 */
export const resetLocalState = () => {
  if (!localAssignmentState.isInitialized) {
    return;
  }
  
  // Reset to original state
  localAssignmentState.courses.clear();
  localAssignmentState.faculty.clear();
  
  localAssignmentState.originalCourses.forEach((course, id) => {
    localAssignmentState.courses.set(id, { ...course });
  });
  
  localAssignmentState.originalFaculty.forEach((faculty, id) => {
    localAssignmentState.faculty.set(id, { ...faculty });
  });
  
  localAssignmentState.pendingChanges = [];
  console.log('Local state reset to original');
};

/**
 * Discard all pending changes and reset to original Firebase state
 * @param {string} departmentName - Department name (e.g., "Computer Science")
 * @returns {Promise<void>}
 */
export const discardChanges = async (departmentName) => {
  try {
    // Re-initialize from Firebase to get fresh data
    await initializeLocalState(departmentName);
    console.log('All pending changes discarded, state reset to Firebase data');
  } catch (error) {
    console.error('Error discarding changes:', error);
    throw error;
  }
};

/**
 * Get summary of pending changes
 * @returns {Object} - Summary of pending changes
 */
export const getPendingChangesSummary = () => {
  if (!localAssignmentState.isInitialized) {
    return {
      hasChanges: false,
      changeCount: 0,
      changes: []
    };
  }
  
  return {
    hasChanges: localAssignmentState.pendingChanges.length > 0,
    changeCount: localAssignmentState.pendingChanges.length,
    changes: localAssignmentState.pendingChanges.map(change => ({
      type: change.type,
      description: change.description,
      timestamp: change.timestamp
    }))
  };
};

/**
 * Check if there are unsaved changes in local state
 * @returns {boolean} - True if there are unsaved changes
 */
export const hasUnsavedChanges = () => {
  return localAssignmentState.isInitialized && localAssignmentState.pendingChanges.length > 0;
};

/**
 * Update faculty load in local state
 * @param {string} facultyId - Faculty ID
 * @param {number} hoursChange - Change in hours
 * @returns {Object} - Updated faculty data
 */
const updateFacultyLoadLocal = (facultyId, hoursChange) => {
  const faculty = localAssignmentState.faculty.get(facultyId);
  if (!faculty) {
    throw new Error(`Faculty with ID ${facultyId} not found in local state`);
  }
  
  const currentLoadHours = faculty.loadHours || 0;
  const maxHours = faculty.maxHours || 40;
  const newLoadHours = Math.max(0, currentLoadHours + hoursChange);
  
  // Determine new status based on load percentage
  const loadPercentage = (newLoadHours / maxHours) * 100;
  let newStatus = 'available';
  
  if (loadPercentage > 90) {
    newStatus = 'overloaded';
  } else if (loadPercentage > 70) {
    newStatus = 'nearlyFull';
  }
  
  // Update local state
  const updatedFaculty = {
    ...faculty,
    loadHours: newLoadHours,
    status: newStatus
  };
  
  localAssignmentState.faculty.set(facultyId, updatedFaculty);
  
  return {
    id: facultyId,
    loadHours: newLoadHours,
    status: newStatus,
    loadPercentage
  };
};

/**
 * Clear all faculty assignments from all courses (operates on local state)
 * @param {string} departmentName - Department name (e.g., "Computer Science")
 * @returns {Promise<Object>} - Result of the clear operation
 */
export const clearAllAssignments = async (departmentName) => {
  try {
    if (!localAssignmentState.isInitialized) {
      await initializeLocalState(departmentName);
    }
    
    let clearedCount = 0;
    
    // Clear assignments from all courses
    for (const [courseId, course] of localAssignmentState.courses.entries()) {
      const currentFacultyList = course.facultyList || (course.faculty ? [course.faculty] : []);
      
      if (currentFacultyList.length > 0) {
        // Remove course from all assigned faculty (semester-aware)
        for (const facultyId of currentFacultyList) {
          const faculty = localAssignmentState.faculty.get(facultyId);
          if (faculty) {
            // Handle semester-aware assigned courses
            const updatedAssignedCourses = { ...faculty.assignedCourses };
            
            // Remove the course from all semesters
            Object.keys(updatedAssignedCourses).forEach(semester => {
              if (Array.isArray(updatedAssignedCourses[semester])) {
                updatedAssignedCourses[semester] = updatedAssignedCourses[semester].filter(id => id !== courseId);
                // Remove semester key if no courses left
                if (updatedAssignedCourses[semester].length === 0) {
                  delete updatedAssignedCourses[semester];
                }
              }
            });
            
            localAssignmentState.faculty.set(facultyId, {
              ...faculty,
              assignedCourses: updatedAssignedCourses
            });
            
            // Update faculty load (remove the hours from this course)
            const totalHours = course.credits || course.weeklyHours || 0;
            const hoursPerFaculty = Math.ceil(totalHours / currentFacultyList.length);
            updateFacultyLoadLocal(facultyId, -hoursPerFaculty);
          }
        }
        
        // Clear faculty assignments from course
        const updatedCourse = {
          ...course,
          faculty: null,
          facultyList: []
        };
        localAssignmentState.courses.set(courseId, updatedCourse);
        
        clearedCount++;
      }
    }
    
    // Record the change for later Firebase update
    localAssignmentState.pendingChanges.push({
      type: 'CLEAR_ALL_ASSIGNMENTS',
      departmentId,
      timestamp: new Date(),
      description: `Cleared all faculty assignments (${clearedCount} courses affected)`
    });
    
    return {
      success: true,
      message: `Successfully cleared all assignments (${clearedCount} courses affected, unsaved)`,
      clearedCount,
      isLocal: true
    };
  } catch (error) {
    console.error('Error clearing all assignments:', error);
    return {
      success: false,
      message: 'Error clearing assignments: ' + error.message
    };
  }
};