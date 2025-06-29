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
 * Process a single course import for SuperAdmin (with department override capability)
 * @param {Object} courseData - Single course data object
 * @param {Array} faculty - Available faculty list
 * @param {string} targetDepartmentId - Fallback department ID (used only if course doesn't specify department)
 * @param {Array} departments - Available departments list for name-to-ID conversion
 * @returns {Promise<Object>} Result object with success status
 */
export const processSuperAdminCourseImport = async (courseData, faculty, targetDepartmentId, departments = []) => {
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
      department: departmentId, // Use specified department (SuperAdmin privilege)
      type: courseData.type || 'Core',
      description: courseData.description || '',
      prerequisites: Array.isArray(courseData.prerequisites) ? courseData.prerequisites : [],
      active: courseData.active !== false, // Default to true unless explicitly false
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Generate unique document ID
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
 * Delete a course from Firebase (SuperAdmin)
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
    
    // Log activity (SuperAdmin context)
    await SuperAdminDashboardService.logActivity(
      'SUPERADMIN',
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
      lectureHours: 3,
      tutorialHours: 1,
      practicalHours: 0,
      department: "Common", // Using department name
      type: "Core",
      credits: 4,
      description: "Fundamental concepts of chemistry for engineering applications."
    },
    {
      code: "MATH101",
      title: "Engineering Mathematics I",
      faculty: "Dr. Sarah Miller",
      semester: "Semester 1",
      lectureHours: 4,
      tutorialHours: 1,
      practicalHours: 0,
      department: "Mathematics", // Using department name
      type: "Core",
      credits: 5,
      description: "Calculus, linear algebra, and differential equations for engineering students."
    },
    {
      code: "CS101",
      title: "Introduction to Computer Science",
      faculty: "Dr. John Smith",
      semester: "Semester 1",
      lectureHours: 3,
      tutorialHours: 0,
      practicalHours: 2,
      department: "Computer Science", // Using department name
      type: "Core",
      credits: 4,
      description: "Fundamental concepts of computer science including programming basics."
    },
    {
      code: "ME301",
      title: "Thermodynamics",
      faculty: "Dr. Emily Chen",
      semester: "Semester 3",
      lectureHours: 3,
      tutorialHours: 1,
      practicalHours: 1,
      department: "Mechanical Engineering", // Using department name
      type: "Core",
      credits: 4,
      description: "Principles of thermodynamics, heat engines, and thermodynamic cycles."
    },
    {
      code: "CS202",
      title: "Data Structures and Algorithms",
      faculty: null,
      semester: "Semester 2",
      lectureHours: 3,
      tutorialHours: 0,
      practicalHours: 2,
      // No department specified - will use target department if selected
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
  fetchAllDepartments,
  fetchAllFaculty,
  fetchFacultyByDepartment,
  processSuperAdminCourseImport,
  getSemesterOptions,
  filterCourses,
  deleteCourse,
  getExampleCourseData
};

export default SuperAdminCourseManagementService;
