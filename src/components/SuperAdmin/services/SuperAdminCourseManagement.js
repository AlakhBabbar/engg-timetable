// SuperAdmin Course Management Service using Firebase
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
import SuperAdminDashboardService from './SuperAdminDashboard';
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

/**
 * Fetch all courses from all departments (SuperAdmin view)
 * @returns {Promise<Array>} - Array of courses with department info
 */
export const fetchAllCourses = async () => {
  try {
    const coursesRef = collection(db, COURSES_COLLECTION);
    const snapshot = await getDocs(coursesRef);
    
    if (snapshot.empty) {
      console.log('No courses found');
      return [];
    }
    
    const courses = [];
    
    for (const courseDoc of snapshot.docs) {
      const courseData = courseDoc.data();
      let facultyData = null;
      let facultyList = [];
      let departmentName = '';
      
      // Get department name
      if (courseData.department) {
        try {
          const deptRef = doc(db, DEPARTMENTS_COLLECTION, courseData.department);
          const deptSnapshot = await getDoc(deptRef);
          if (deptSnapshot.exists()) {
            departmentName = deptSnapshot.data().name || courseData.department;
          }
        } catch (error) {
          console.error('Error fetching department name:', error);
          departmentName = courseData.department;
        }
      }
      
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
        weeklyHours: courseData.weeklyHours || '',
        department: courseData.department || '',
        departmentName: departmentName,
        isCommonCourse: courseData.isCommonCourse || false, // SuperAdmin flag for common courses
        credits: courseData.credits || 0,
        type: courseData.type || 'Core',
        description: courseData.description || '',
        active: courseData.active !== false
      });
    }
    
    return courses;
  } catch (error) {
    console.error('Error fetching all courses:', error);
    return [];
  }
};

/**
 * Fetch courses by department ID
 * @param {string} departmentId - Department ID 
 * @returns {Promise<Array>} - Array of courses
 */
export const fetchCoursesByDepartment = async (departmentId) => {
  try {
    const coursesRef = collection(db, COURSES_COLLECTION);
    const coursesQuery = query(coursesRef, where('department', '==', departmentId));
    
    const snapshot = await getDocs(coursesQuery);
    
    if (snapshot.empty) {
      console.log(`No courses found for department ${departmentId}`);
      return [];
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
        weeklyHours: courseData.weeklyHours || '',
        department: courseData.department || '',
        isCommonCourse: courseData.isCommonCourse || false, // SuperAdmin flag for common courses
        lectureHours: courseData.lectureHours || 0,
        tutorialHours: courseData.tutorialHours || 0,
        practicalHours: courseData.practicalHours || 0,
        credits: courseData.credits || 0,
        type: courseData.type || 'Core',
        description: courseData.description || '',
        active: courseData.active !== false
      });
    }
    
    return courses;
  } catch (error) {
    console.error('Error fetching courses by department:', error);
    return [];
  }
};

/**
 * Fetch courses for a department including common courses (for HOD/TTIncharge views)
 * @param {string} departmentId - Department ID 
 * @returns {Promise<Array>} - Array of courses (owned + common courses)
 */
export const fetchCoursesForDepartment = async (departmentId) => {
  try {
    const coursesRef = collection(db, COURSES_COLLECTION);
    
    // Query 1: Courses owned by this department
    const ownedCoursesQuery = query(coursesRef, where('department', '==', departmentId));
    const ownedSnapshot = await getDocs(ownedCoursesQuery);
    
    // Query 2: Common courses (marked by SuperAdmin)
    const commonCoursesQuery = query(coursesRef, where('isCommonCourse', '==', true));
    const commonSnapshot = await getDocs(commonCoursesQuery);
    
    // Combine results and remove duplicates
    const allCourseDocs = [...ownedSnapshot.docs];
    commonSnapshot.docs.forEach(doc => {
      // Don't add if it's already in owned courses (course can be both owned and common)
      if (!allCourseDocs.find(existing => existing.id === doc.id)) {
        allCourseDocs.push(doc);
      }
    });
    
    if (allCourseDocs.length === 0) {
      return [];
    }

    const courses = [];
    
    for (const courseDoc of allCourseDocs) {
      const courseData = courseDoc.data();
      let facultyData = null;
      let facultyList = [];
      let departmentName = '';
      
      // Get department name
      if (courseData.department) {
        try {
          const deptRef = doc(db, DEPARTMENTS_COLLECTION, courseData.department);
          const deptSnapshot = await getDoc(deptRef);
          if (deptSnapshot.exists()) {
            departmentName = deptSnapshot.data().name || courseData.department;
          }
        } catch (error) {
          console.error('Error fetching department name:', error);
          departmentName = courseData.department;
        }
      }

      // Handle faculty data (existing logic)
      const facultyIds = [];
      if (courseData.faculty) {
        facultyIds.push(courseData.faculty);
      }
      if (courseData.facultyList && Array.isArray(courseData.facultyList)) {
        facultyIds.push(...courseData.facultyList.filter(id => id && !facultyIds.includes(id)));
      }
      
      // Fetch faculty details
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
            
            if (!facultyData) {
              facultyData = facultyInfo;
            }
          }
        }
      }

      // Determine course relationship to current department
      const isOwnedCourse = courseData.department === departmentId;
      const isCommonCourse = courseData.isCommonCourse === true;

      courses.push({
        id: courseDoc.id,
        code: courseData.code || '',
        title: courseData.title || '',
        faculty: facultyData,
        facultyList: facultyList,
        semester: courseData.semester || '',
        weeklyHours: courseData.weeklyHours || '',
        department: courseData.department || '',
        departmentName: departmentName,
        isCommonCourse: isCommonCourse,
        isOwnedCourse: isOwnedCourse,
        canEdit: isOwnedCourse, // Only allow editing if department owns the course
        lectureHours: courseData.lectureHours || 0,
        tutorialHours: courseData.tutorialHours || 0,
        practicalHours: courseData.practicalHours || 0,
        credits: courseData.credits || 0,
        type: courseData.type || 'Core',
        description: courseData.description || '',
        active: courseData.active !== false
      });
    }
    
    return courses;
  } catch (error) {
    console.error('Error fetching courses for department:', error);
    return [];
  }
};

/**
 * Fetch all departments for dropdown options
 * @returns {Promise<Array>} - Array of departments
 */
export const fetchAllDepartments = async () => {
  try {
    const departmentsRef = collection(db, DEPARTMENTS_COLLECTION);
    const snapshot = await getDocs(departmentsRef);
    
    if (snapshot.empty) {
      console.log('No departments found');
      return [];
    }
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        category: data.category || '',
        status: data.status || 'Active'
      };
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
};

/**
 * Fetch all faculty from all departments
 * @returns {Promise<Array>} - Array of faculty members
 */
export const fetchAllFaculty = async () => {
  try {
    const facultyRef = collection(db, FACULTY_COLLECTION);
    const snapshot = await getDocs(facultyRef);
    
    if (snapshot.empty) {
      console.log('No faculty found');
      return [];
    }
    
    const faculty = [];
    
    for (const facultyDoc of snapshot.docs) {
      const data = facultyDoc.data();
      let departmentName = '';
      
      // Get department name
      if (data.department) {
        try {
          const deptRef = doc(db, DEPARTMENTS_COLLECTION, data.department);
          const deptSnapshot = await getDoc(deptRef);
          if (deptSnapshot.exists()) {
            departmentName = deptSnapshot.data().name || data.department;
          }
        } catch (error) {
          console.error('Error fetching department name for faculty:', error);
          departmentName = data.department;
        }
      }
      
      faculty.push({
        id: facultyDoc.id,
        name: data.name || '',
        email: data.email || '',
        avatar: data.avatar || 'https://via.placeholder.com/36',
        status: data.status || 'available',
        department: data.department || '',
        departmentName: departmentName
      });
    }
    
    return faculty;
  } catch (error) {
    console.error('Error fetching all faculty:', error);
    return [];
  }
};

/**
 * Fetch faculty by department
 * @param {string} departmentId - Department ID
 * @returns {Promise<Array>} - Array of faculty members
 */
export const fetchFacultyByDepartment = async (departmentId) => {
  try {
    const facultyRef = collection(db, FACULTY_COLLECTION);
    const facultyQuery = query(facultyRef, where('department', '==', departmentId));
    
    const snapshot = await getDocs(facultyQuery);
    
    if (snapshot.empty) {
      console.log(`No faculty found for department ${departmentId}`);
      return [];
    }
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        email: data.email || '',
        avatar: data.avatar || 'https://via.placeholder.com/36',
        status: data.status || 'available',
        department: data.department || ''
      };
    });
  } catch (error) {
    console.error('Error fetching faculty by department:', error);
    return [];
  }
};

/**
 * Check if a course already exists in the database
 * @param {string} code - Course code
 * @param {string} semester - Semester
 * @param {string} departmentId - Department ID
 * @returns {Promise<Object|null>} Existing course data or null
 */
export const checkCourseExists = async (code, semester, departmentId) => {
  try {
    const docId = `${code.toUpperCase()}_${semester.replace(/\s+/g, '_')}_${departmentId}`;
    const courseRef = doc(db, COURSES_COLLECTION, docId);
    const existingDoc = await getDoc(courseRef);
    
    if (existingDoc.exists()) {
      return {
        id: existingDoc.id,
        ...existingDoc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error checking course existence:', error);
    return null;
  }
};

/**
 * Check for duplicate courses in a batch
 * @param {Array} courseDataArray - Array of course data objects
 * @param {string} targetDepartmentId - Fallback department ID
 * @param {Array} departments - Available departments list
 * @returns {Promise<Object>} Result object with duplicates and unique courses
 */
export const checkBatchDuplicates = async (courseDataArray, targetDepartmentId, departments = []) => {
  try {
    const duplicates = [];
    const uniqueCourses = [];
    
    for (const courseData of courseDataArray) {
      // Determine department ID (same logic as in processSuperAdminCourseImport)
      let departmentId = courseData.department || targetDepartmentId;
      
      if (courseData.department && departments.length > 0) {
        const dept = courseData.department.toString().trim();
        const foundById = departments.find(d => d.id === dept);
        if (foundById) {
          departmentId = dept;
        } else {
          const foundByName = departments.find(d => d.name === dept);
          if (foundByName) {
            departmentId = foundByName.id;
          } else {
            departmentId = dept;
          }
        }
      }
      
      // Check if course exists
      const existingCourse = await checkCourseExists(
        courseData.code, 
        courseData.semester, 
        departmentId
      );
      
      if (existingCourse) {
        duplicates.push({
          courseData,
          existingCourse,
          departmentId
        });
      } else {
        uniqueCourses.push(courseData);
      }
    }
    
    return { duplicates, uniqueCourses };
  } catch (error) {
    console.error('Error checking batch duplicates:', error);
    return { duplicates: [], uniqueCourses: courseDataArray };
  }
};

/**
 * Process a single course import for SuperAdmin (with department override capability)
 * @param {Object} courseData - Single course data object
 * @param {Array} faculty - Available faculty list
 * @param {string} targetDepartmentId - Fallback department ID (used only if course doesn't specify department)
 * @param {Array} departments - Available departments list for name-to-ID conversion
 * @param {boolean} overwriteExisting - Whether to overwrite existing courses
 * @returns {Promise<Object>} Result object with success status
 */
export const processSuperAdminCourseImport = async (courseData, faculty, targetDepartmentId, departments = [], overwriteExisting = false) => {
  try {
    // Validate required fields
    if (!courseData.code || !courseData.title || !courseData.semester) {
      return {
        success: false,
        error: 'Missing required fields (code, title, or semester)',
        item: courseData
      };
    }

    // Prioritize department from JSON data, fallback to target department
    let departmentId = courseData.department || targetDepartmentId;
    
    // If courseData.department is provided, check if it's a name and convert to ID
    if (courseData.department && departments.length > 0) {
      const dept = courseData.department.toString().trim();
      
      // Check if it's already an ID
      const foundById = departments.find(d => d.id === dept);
      if (foundById) {
        departmentId = dept;
      } else {
        // Try to find by name
        const foundByName = departments.find(d => d.name === dept);
        if (foundByName) {
          departmentId = foundByName.id;
        } else {
          // Department not found, use as-is (will likely cause an error later, but that's expected)
          departmentId = dept;
        }
      }
    }
    
    if (!departmentId) {
      return {
        success: false,
        error: 'No department specified in course data and no target department provided',
        item: courseData
      };
    }

    // Check if course already exists and handle accordingly
    const existingCourse = await checkCourseExists(courseData.code, courseData.semester, departmentId);
    
    if (existingCourse && !overwriteExisting) {
      return {
        success: false,
        action: 'skipped',
        code: courseData.code,
        title: courseData.title,
        department: departmentId,
        error: 'Course already exists',
        item: courseData
      };
    }

    // Find faculty member if specified
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
      weeklyHours: courseData.weeklyHours || courseData.credits || 3,
      faculty: assignedFaculty ? assignedFaculty.name : courseData.faculty || '',
      facultyId: assignedFaculty ? assignedFaculty.id : null,
      facultyList: assignedFaculty ? [assignedFaculty.id] : [],
      credits: courseData.credits || 3,
      department: departmentId, // Use specified department (SuperAdmin privilege)
      isCommonCourse: courseData.isCommonCourse || false, // SuperAdmin can mark as common course
      type: courseData.type || 'Core',
      description: courseData.description || '',
      active: courseData.active !== false, // Default to true unless explicitly false
      createdAt: existingCourse ? existingCourse.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Generate unique document ID
    const docId = `${courseDoc.code}_${courseDoc.semester.replace(/\s+/g, '_')}_${departmentId}`;
    
    // Create or update course
    const courseRef = doc(db, COURSES_COLLECTION, docId);
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
      action: existingCourse ? 'updated' : 'created',
      code: courseData.code,
      title: courseData.title,
      department: departmentId,
      courseDoc: { id: docId, ...courseDoc },
      item: courseData
    };

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
 * Filter courses based on search and filters (SuperAdmin version)
 * @param {Array} courses - Array of courses
 * @param {string} searchTerm - Search term
 * @param {string} selectedSemester - Selected semester
 * @param {Object} selectedFaculty - Selected faculty
 * @param {Object} selectedDepartment - Selected department
 * @returns {Array} - Filtered courses
 */
export const filterCourses = (courses, searchTerm, selectedSemester, selectedFaculty, selectedDepartment) => {
  return courses.filter(course => {
    // Filter by department
    if (selectedDepartment && course.department !== selectedDepartment.id) {
      return false;
    }
    
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
      const matchesDepartment = course.departmentName && course.departmentName.toLowerCase().includes(term);
      
      if (!matchesCode && !matchesTitle && !matchesDepartment) {
        return false;
      }
    }
    
    return true;
  });
};

/**
 * Update an existing course in Firebase (SuperAdmin can edit any course)
 * @param {Array} courses - Current courses array
 * @param {string} courseId - Course ID to update
 * @param {Object} formData - Updated course data
 * @param {Array} faculty - Available faculty list
 * @param {Array} departments - Available departments list
 * @returns {Promise<Array>} - Updated courses array
 */
export const updateCourse = async (courses, courseId, formData, faculty = [], departments = []) => {
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
      weeklyHours: parseFloat(formData.weeklyHours) || 0,
      department: formData.department || existingCourse.department,
      isCommonCourse: formData.isCommonCourse || false,
      updatedAt: serverTimestamp(),
      // Additional fields
      credits: parseFloat(formData.credits || formData.weeklyHours) || 0,
      type: formData.type || 'Core',
      description: formData.description || ''
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
    await SuperAdminDashboardService.logActivity(
      'SuperAdmin',
      'course',
      `Updated course: ${formData.code} - ${formData.title} in ${formData.departmentName || formData.department}`
    );
    
    // Prepare faculty data for UI
    const facultyList = newFacultyIds.map(id => 
      faculty.find(f => f.id.toString() === id)
    ).filter(Boolean);
    
    // Get department name
    let departmentName = formData.departmentName || existingCourse.departmentName;
    if (!departmentName && formData.department) {
      const dept = departments.find(d => d.id === formData.department);
      departmentName = dept ? dept.name : formData.department;
    }
    
    // Create updated course object for UI
    const updatedCourse = {
      ...existingCourse,
      code: formData.code,
      title: formData.title,
      faculty: facultyList.length > 0 ? facultyList[0] : null, // Primary faculty
      facultyList: facultyList, // All assigned faculty
      semester: formData.semester,
      weeklyHours: parseFloat(formData.weeklyHours) || 0,
      department: formData.department || existingCourse.department,
      departmentName: departmentName,
      isCommonCourse: formData.isCommonCourse || false,
      credits: parseFloat(formData.credits || formData.weeklyHours) || 0,
      type: formData.type || 'Core',
      description: formData.description || ''
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
 * Delete a course from Firebase (SuperAdmin can delete any course)
 * @param {Array} courses - Current courses array
 * @param {string} courseId - Course ID to delete
 * @returns {Promise<Array>} - Updated courses array
 */
export const deleteCourse = async (courses, courseId) => {
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
    await SuperAdminDashboardService.logActivity(
      'SuperAdmin',
      'course',
      `Deleted course: ${courseToDelete.code} - ${courseToDelete.title} from ${courseToDelete.departmentName || courseToDelete.department}`
    );
    
    // Return updated courses array
    return courses.filter(c => c.id !== courseId);
  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
};

/**
 * Toggle common course status (SuperAdmin only)
 * @param {string} courseId - Course ID
 * @param {boolean} isCommon - Whether to mark as common course
 * @returns {Promise<Object>} - Result object
 */
export const toggleCommonCourseStatus = async (courseId, isCommon) => {
  try {
    const courseRef = doc(db, COURSES_COLLECTION, courseId);
    const courseSnapshot = await getDoc(courseRef);
    
    if (!courseSnapshot.exists()) {
      throw new Error('Course not found');
    }
    
    const courseData = courseSnapshot.data();
    
    // Update the common course status
    await updateDoc(courseRef, {
      isCommonCourse: isCommon,
      updatedAt: new Date().toISOString()
    });
    
    // Log activity
    const action = isCommon ? 'marked as common course' : 'removed from common courses';
    await SuperAdminDashboardService.logActivity(
      'SUPERADMIN',
      'course',
      `Course ${courseData.code} - ${courseData.title} ${action}`
    );
    
    return {
      success: true,
      message: `Course ${action} successfully`,
      courseId: courseId,
      isCommon: isCommon
    };
    
  } catch (error) {
    console.error('Error toggling common course status:', error);
    return {
      success: false,
      error: error.message || 'Failed to update course status'
    };
  }
};

/**
 * Get example course data with department specification (SuperAdmin)
 * @returns {Array} - Example course data with departments
 */
export const getExampleCourseData = () => {
  return [
    {
      code: "CHM181",
      title: "Chemistry for Engineers",
      faculty: "Dr. Alex Johnson",
      semester: "Semester 1",
      weeklyHours: 4,
      department: "Chemistry", // Belongs to Chemistry dept
      isCommonCourse: true, // But available to all departments
      type: "Core",
      credits: 4,
      description: "Fundamental concepts of chemistry for engineering applications."
    },
    {
      code: "MATH101",
      title: "Engineering Mathematics I",
      faculty: "Dr. Sarah Miller",
      semester: "Semester 1",
      weeklyHours: 5,
      department: "Mathematics", // Belongs to Mathematics dept
      isCommonCourse: true, // Available to all engineering departments
      type: "Core",
      credits: 5,
      description: "Calculus, linear algebra, and differential equations for engineering students."
    },
    {
      code: "CS101",
      title: "Introduction to Computer Science",
      faculty: "Dr. John Smith",
      semester: "Semester 1",
      weeklyHours: 5,
      department: "Computer Science", // Belongs to CS dept only
      isCommonCourse: false, // Not a common course
      type: "Core",
      credits: 4,
      description: "Fundamental concepts of computer science including programming basics."
    },
    {
      code: "ME301",
      title: "Thermodynamics",
      faculty: "Dr. Emily Chen",
      semester: "Semester 3",
      weeklyHours: 5,
      department: "Mechanical Engineering", // Belongs to ME dept only
      isCommonCourse: false, // Not a common course
      type: "Core",
      credits: 4,
      description: "Principles of thermodynamics, heat engines, and thermodynamic cycles."
    },
    {
      code: "CS202",
      title: "Data Structures and Algorithms",
      faculty: null,
      semester: "Semester 2",
      weeklyHours: 5,
      department: "Computer Science", // Belongs to CS dept
      isCommonCourse: true, // But taught to ECE and other depts too
      type: "Core",
      credits: 4,
      description: "Advanced data structures, algorithm analysis, and problem-solving techniques."
    }
  ];
};

// Export functions for use in the component
const SuperAdminCourseManagementService = {
  fetchAllCourses,
  fetchCoursesByDepartment,
  fetchCoursesForDepartment,
  fetchAllDepartments,
  fetchAllFaculty,
  fetchFacultyByDepartment,
  processSuperAdminCourseImport,
  checkCourseExists,
  checkBatchDuplicates,
  getSemesterOptions,
  filterCourses,
  deleteCourse,
  updateCourse,
  toggleCommonCourseStatus,
  getExampleCourseData
};

export default SuperAdminCourseManagementService;
