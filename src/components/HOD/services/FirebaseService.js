// Firebase service for HOD-related operations
import { 
  db, 
  collection, 
  doc,
  getDoc, 
  getDocs, 
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from '../../../firebase/config.js';

// Collection references
const COURSES_COLLECTION = 'courses';
const FACULTY_COLLECTION = 'faculty';
const DEPARTMENTS_COLLECTION = 'departments';
const SEMESTERS_COLLECTION = 'semesters';
const ASSIGNMENTS_COLLECTION = 'assignments';
const REPORTS_COLLECTION = 'reports';

/**
 * Get faculty members for the specified department
 * @param {string} departmentId - The department ID
 * @returns {Promise<Array>} - Promise resolving to faculty data array
 */
export const getFacultyByDepartment = async (departmentId) => {
  try {
    const facultyRef = collection(db, FACULTY_COLLECTION);
    const q = query(facultyRef, where('department', '==', departmentId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting faculty:', error);
    throw error;
  }
};

/**
 * Get all courses for a department
 * @param {string} departmentId - The department ID
 * @returns {Promise<Array>} - Promise resolving to courses data array
 */
export const getCoursesByDepartment = async (departmentId) => {
  try {
    const coursesRef = collection(db, COURSES_COLLECTION);
    const q = query(coursesRef, where('department', '==', departmentId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting courses:', error);
    throw error;
  }
};

/**
 * Get all available semesters
 * @returns {Promise<Array>} - Promise resolving to semesters data array
 */
export const getSemesters = async () => {
  try {
    const semesterRef = collection(db, SEMESTERS_COLLECTION);
    const querySnapshot = await getDocs(semesterRef);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting semesters:', error);
    throw error;
  }
};

/**
 * Create a new course
 * @param {Object} courseData - The course data
 * @returns {Promise<String>} - Promise resolving to the new course ID
 */
export const createCourse = async (courseData) => {
  try {
    const coursesRef = collection(db, COURSES_COLLECTION);
    const docRef = await addDoc(coursesRef, {
      ...courseData,
      createdAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

/**
 * Update an existing course
 * @param {string} courseId - The course ID
 * @param {Object} courseData - The updated course data
 * @returns {Promise<void>}
 */
export const updateCourse = async (courseId, courseData) => {
  try {
    const courseRef = doc(db, COURSES_COLLECTION, courseId);
    await updateDoc(courseRef, {
      ...courseData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
};

/**
 * Delete a course
 * @param {string} courseId - The course ID
 * @returns {Promise<void>}
 */
export const deleteCourse = async (courseId) => {
  try {
    const courseRef = doc(db, COURSES_COLLECTION, courseId);
    await deleteDoc(courseRef);
  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
};

/**
 * Assign faculty to a course
 * @param {string} courseId - The course ID
 * @param {string} facultyId - The faculty ID
 * @returns {Promise<void>}
 */
export const assignFacultyToCourse = async (courseId, facultyId) => {
  try {
    // Update the course with the faculty assignment
    const courseRef = doc(db, COURSES_COLLECTION, courseId);
    await updateDoc(courseRef, {
      facultyId: facultyId,
      assignedAt: serverTimestamp()
    });
    
    // Create an assignment record
    const assignmentRef = collection(db, ASSIGNMENTS_COLLECTION);
    await addDoc(assignmentRef, {
      courseId: courseId,
      facultyId: facultyId,
      assignedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error assigning faculty:', error);
    throw error;
  }
};

/**
 * Generate a faculty load report
 * @param {string} departmentId - The department ID
 * @param {string} semesterId - The semester ID
 * @returns {Promise<Object>} - Promise resolving to the report data
 */
export const generateFacultyLoadReport = async (departmentId, semesterId) => {
  try {
    // Get faculty members
    const faculty = await getFacultyByDepartment(departmentId);
    
    // Get course assignments
    const coursesRef = collection(db, COURSES_COLLECTION);
    const q = query(
      coursesRef, 
      where('department', '==', departmentId),
      where('semester', '==', semesterId)
    );
    const courseSnapshot = await getDocs(q);
    const courses = courseSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Create the report
    const reportRef = collection(db, REPORTS_COLLECTION);
    const reportDoc = await addDoc(reportRef, {
      departmentId,
      semesterId,
      generatedAt: serverTimestamp(),
      data: {
        faculty: faculty.length,
        courses: courses.length,
        // Add more report data as needed
      }
    });
    
    return {
      id: reportDoc.id,
      departmentId,
      semesterId,
      generatedAt: new Date().toISOString(),
      faculty,
      courses
    };
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
};

/**
 * Listen to real-time updates for courses
 * @param {string} departmentId - The department ID
 * @param {Function} callback - Function to call with updated data
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToCourses = (departmentId, callback) => {
  const coursesRef = collection(db, COURSES_COLLECTION);
  const q = query(
    coursesRef, 
    where('department', '==', departmentId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const courses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(courses);
  });
};

/**
 * Listen to real-time updates for faculty
 * @param {string} departmentId - The department ID
 * @param {Function} callback - Function to call with updated data
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToFaculty = (departmentId, callback) => {
  const facultyRef = collection(db, FACULTY_COLLECTION);
  const q = query(
    facultyRef, 
    where('department', '==', departmentId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const faculty = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(faculty);
  });
};

export default {
  getFacultyByDepartment,
  getCoursesByDepartment,
  getSemesters,
  createCourse,
  updateCourse,
  deleteCourse,
  assignFacultyToCourse,
  generateFacultyLoadReport,
  subscribeToCourses,
  subscribeToFaculty
};