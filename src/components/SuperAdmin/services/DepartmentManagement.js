/**
 * DepartmentManagement.js - Firebase Integration
 * 
 * This service now provides real-time course counting from the Firebase 'courses' collection.
 * 
 * Usage examples:
 * - getCoursesCountForDepartment('dept-id') returns count of active courses
 * - getCourseStatisticsForDepartment('dept-id') returns detailed statistics
 * 
 * The totalCourses field in department objects now reflects actual course data from Firebase.
 */

// DepartmentManagement.js - Firebase Integration
import {
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  generateId
} from '../../../firebase/config.js';

// Collection names
const DEPARTMENTS_COLLECTION = 'departments';
const TEACHERS_COLLECTION = 'teachers';
const PROFILES_COLLECTION = 'profiles';
const COURSES_COLLECTION = 'courses';

// Available department categories
export const departmentCategories = [
  'Engineering',
  'Sciences',
  'Mathematics & Statistics',
  'Business & Management',
  'Arts & Humanities',
  'Medical & Health Sciences',
  'Education',
  'Administration',
  'Research',
  'Other'
];

/**
 * Get all departments from Firebase
 * @returns {Promise<Array>} Array of departments
 */
export const getAllDepartments = async () => {
  try {
    const departmentsRef = collection(db, DEPARTMENTS_COLLECTION);
    const querySnapshot = await getDocs(departmentsRef);
    
    const departments = [];
    
    for (const deptDoc of querySnapshot.docs) {
      const deptData = deptDoc.data();
      
      // Get count of courses for this department
      const coursesCount = await getCoursesCountForDepartment(deptDoc.id);
      
      departments.push({
        id: deptDoc.id,
        name: deptData.name || '',
        category: deptData.category || '',
        hod: deptData.hodName || 'Not Assigned',
        hodId: deptData.hodId || null,
        hodAvatar: deptData.hodAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(deptData.hodName || 'NA')}&background=random`,
        description: deptData.description || '',
        status: deptData.active ? 'Active' : 'Inactive',
        totalCourses: coursesCount
      });
    }
    
    return departments;
  } catch (error) {
    console.error('Error fetching departments:', error);      // Return mock data if Firebase fetch fails
      return [
        { id: '1', name: 'Computer Science & Engineering', category: 'Engineering', hod: 'Dr. Alan Turing', hodAvatar: 'https://ui-avatars.com/api/?name=Alan+Turing&background=random', description: 'Computer Science and Software Engineering Department', status: 'Active', totalCourses: 24 },
        { id: '2', name: 'Electrical & Electronics Engineering', category: 'Engineering', hod: 'Dr. Nikola Tesla', hodAvatar: 'https://ui-avatars.com/api/?name=Nikola+Tesla&background=random', description: 'Electrical and Electronics Engineering', status: 'Active', totalCourses: 18 },
        { id: '3', name: 'Applied Mathematics', category: 'Mathematics & Statistics', hod: 'Dr. Katherine Johnson', hodAvatar: 'https://ui-avatars.com/api/?name=Katherine+Johnson&background=random', description: 'Pure and Applied Mathematics', status: 'Active', totalCourses: 15 }
      ];
  }
};

/**
 * Get count of active courses for a given department
 * @param {string} departmentId Department ID
 * @returns {Promise<number>} Count of active courses only
 */
export const getCoursesCountForDepartment = async (departmentId) => {
  try {
    // Query the courses collection for active courses belonging to this department
    const coursesRef = collection(db, COURSES_COLLECTION);
    const q = query(
      coursesRef, 
      where('department', '==', departmentId),
      where('active', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    // Return the count of matching documents
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting courses count:', error);
    return 0;
  }
};

/**
 * Get detailed course statistics for a given department
 * @param {string} departmentId Department ID
 * @returns {Promise<Object>} Course statistics
 */
export const getCourseStatisticsForDepartment = async (departmentId) => {
  try {
    const coursesRef = collection(db, COURSES_COLLECTION);
    const allCoursesQuery = query(coursesRef, where('department', '==', departmentId));
    const querySnapshot = await getDocs(allCoursesQuery);
    
    let activeCourses = 0;
    let inactiveCourses = 0;
    let totalCredits = 0;
    const courseTypes = {
      'Core': 0,
      'Elective': 0,
      'Laboratory': 0,
      'Other': 0
    };
    
    querySnapshot.docs.forEach(doc => {
      const courseData = doc.data();
      const isActive = courseData.active !== false;
      
      if (isActive) {
        activeCourses++;
        totalCredits += courseData.credits || 0;
      } else {
        inactiveCourses++;
      }
      
      const courseType = courseData.type || 'Other';
      if (courseTypes.hasOwnProperty(courseType)) {
        courseTypes[courseType]++;
      } else {
        courseTypes['Other']++;
      }
    });
    
    return {
      totalCourses: querySnapshot.size,
      activeCourses,
      inactiveCourses,
      totalCredits,
      courseTypes
    };
  } catch (error) {
    console.error('Error getting course statistics:', error);
    return {
      totalCourses: 0,
      activeCourses: 0,
      inactiveCourses: 0,
      totalCredits: 0,
      courseTypes: { 'Core': 0, 'Elective': 0, 'Laboratory': 0, 'Other': 0 }
    };
  }
};

/**
 * Get available HOD options from teachers
 * @returns {Promise<Array>} Array of HOD candidates
 */
export const getHODOptions = async () => {
  try {
    const teachersRef = collection(db, TEACHERS_COLLECTION);
    // Query for teachers with appropriate qualifications to be HOD
    // For simplicity, we'll just get all teachers here
    const querySnapshot = await getDocs(teachersRef);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'Faculty')}&background=random`,
        department: data.department || '',
        qualification: data.qualification || ''
      };
    });
  } catch (error) {
    console.error('Error fetching HOD options:', error);
    
    // Return mock data if Firebase fetch fails
    return [
      { id: '1', name: 'Dr. Alan Turing', avatar: 'https://ui-avatars.com/api/?name=Alan+Turing&background=0D8ABC', department: 'Computer Science', qualification: 'PhD' },
      { id: '2', name: 'Dr. Ada Lovelace', avatar: 'https://ui-avatars.com/api/?name=Ada+Lovelace&background=FF6B6B', department: 'Computer Science', qualification: 'PhD' },
      { id: '3', name: 'Dr. Nikola Tesla', avatar: 'https://ui-avatars.com/api/?name=Nikola+Tesla&background=59C173', department: 'Electrical Engineering', qualification: 'PhD' },
      { id: '4', name: 'Dr. Grace Hopper', avatar: 'https://ui-avatars.com/api/?name=Grace+Hopper&background=BA8B02', department: 'Computer Science', qualification: 'PhD' }
    ];
  }
};

/**
 * Search departments by name, type, or HOD
 * @param {string} searchTerm Search term
 * @returns {Promise<Array} Filtered departments
 */
export const searchDepartments = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.trim() === '') {
      // If no search term, return all departments
      return await getAllDepartments();
    }
    
    const departmentsRef = collection(db, DEPARTMENTS_COLLECTION);
    const querySnapshot = await getDocs(departmentsRef);
    
    const searchTermLower = searchTerm.toLowerCase().trim();
    
    // Client-side filtering because Firestore doesn't support comprehensive text search
    const allDepartments = await Promise.all(
      querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const coursesCount = await getCoursesCountForDepartment(doc.id);
        
        return {
          id: doc.id,
          name: data.name || '',
          category: data.category || '',
          hod: data.hodName || 'Not Assigned',
          hodId: data.hodId || null,
          hodAvatar: data.hodAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.hodName || 'NA')}&background=random`,
          description: data.description || '',
          status: data.active ? 'Active' : 'Inactive',
          totalCourses: coursesCount
        };
      })
    );
    
    return allDepartments.filter(dept => {
      return (
        dept.name.toLowerCase().includes(searchTermLower) ||
        dept.category.toLowerCase().includes(searchTermLower) ||
        dept.hod.toLowerCase().includes(searchTermLower) ||
        (dept.description && dept.description.toLowerCase().includes(searchTermLower))
      );
    });
  } catch (error) {
    console.error('Error searching departments:', error);
    return [];
  }
};

/**
 * Create a new department
 * @param {Object} departmentData Department data
 * @returns {Promise<Object>} Created department
 */
export const createDepartment = async (departmentData) => {
  try {
    // Generate an ID for the new department
    const departmentId = generateId();
    
    const departmentRef = doc(db, DEPARTMENTS_COLLECTION, departmentId);
    
    // Get HOD details if one was specified
    let hodId = null;
    let hodAvatar = null;
    
    if (departmentData.hod) {
      const teachersRef = collection(db, TEACHERS_COLLECTION);
      const q = query(teachersRef, where('name', '==', departmentData.hod));
      const teacherSnap = await getDocs(q);
      
      if (!teacherSnap.empty) {
        const hodDoc = teacherSnap.docs[0];
        const hodData = hodDoc.data();
        hodId = hodDoc.id;
        hodAvatar = hodData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(departmentData.hod)}&background=random`;
      }
    }
    
    // Create the department document
    const newDepartment = {
      name: departmentData.name,
      category: departmentData.category,
      hodName: departmentData.hod || 'Not Assigned',
      hodId: hodId,
      hodAvatar: hodAvatar,
      description: departmentData.description || '',
      active: departmentData.status === 'Active',
      createdAt: new Date().toISOString()
    };
    
    await setDoc(departmentRef, newDepartment);
    
    // Update HOD record if one was assigned
    if (hodId) {
      // Update teacher record to mark as HOD
      const teacherRef = doc(db, TEACHERS_COLLECTION, hodId);
      await updateDoc(teacherRef, {
        role: 'hod',
        departmentHead: departmentData.name
      });
      
      // Update user profile if it exists
      try {
        const userProfileRef = doc(db, PROFILES_COLLECTION, hodId);
        const profileSnap = await getDoc(userProfileRef);
        
        if (profileSnap.exists()) {
          await updateDoc(userProfileRef, {
            role: 'hod'
          });
        }
      } catch (profileErr) {
        // Continue even if profile update fails
        console.warn('Could not update user profile:', profileErr);
      }
    }
    
    return {
      id: departmentId,
      ...newDepartment,
      totalCourses: 0,
      status: newDepartment.active ? 'Active' : 'Inactive'
    };
  } catch (error) {
    console.error('Error creating department:', error);
    throw new Error('Failed to create department: ' + error.message);
  }
};

/**
 * Update an existing department
 * @param {Object} departmentData Updated department data
 * @returns {Promise<Object>} Updated department
 */
export const updateDepartment = async (departmentData) => {
  try {
    const departmentId = departmentData.id;
    
    // Get the department document
    const departmentRef = doc(db, DEPARTMENTS_COLLECTION, departmentId);
    const departmentSnap = await getDoc(departmentRef);
    
    if (!departmentSnap.exists()) {
      throw new Error('Department not found');
    }
    
    const currentDeptData = departmentSnap.data();
    
    // Check if HOD changed
    let hodId = currentDeptData.hodId;
    let hodAvatar = currentDeptData.hodAvatar;
    
    if (departmentData.hod !== currentDeptData.hodName) {
      // Reset old HOD if applicable
      if (currentDeptData.hodId) {
        // Remove HOD role from previous teacher
        try {
          const oldHodRef = doc(db, TEACHERS_COLLECTION, currentDeptData.hodId);
          const oldHodSnap = await getDoc(oldHodRef);
          
          if (oldHodSnap.exists()) {
            // Reset to regular faculty
            await updateDoc(oldHodRef, {
              role: 'Faculty',
              departmentHead: null
            });
          }
          
          // Update profile if exists
          const oldProfileRef = doc(db, PROFILES_COLLECTION, currentDeptData.hodId);
          const oldProfileSnap = await getDoc(oldProfileRef);
          
          if (oldProfileSnap.exists()) {
            await updateDoc(oldProfileRef, {
              role: 'Faculty'
            });
          }
        } catch (oldHodErr) {
          console.warn('Could not update previous HOD:', oldHodErr);
        }
      }
      
      // Set new HOD
      if (departmentData.hod && departmentData.hod !== 'Not Assigned') {
        // Find the teacher by name
        const teachersRef = collection(db, TEACHERS_COLLECTION);
        const q = query(teachersRef, where('name', '==', departmentData.hod));
        const teacherSnap = await getDocs(q);
        
        if (!teacherSnap.empty) {
          const hodDoc = teacherSnap.docs[0];
          const hodData = hodDoc.data();
          hodId = hodDoc.id;
          hodAvatar = hodData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(departmentData.hod)}&background=random`;
          
          // Update teacher to HOD role
          await updateDoc(doc(db, TEACHERS_COLLECTION, hodId), {
            role: 'hod',
            departmentHead: departmentData.name
          });
          
          // Update profile if it exists
          try {
            const profileRef = doc(db, PROFILES_COLLECTION, hodId);
            const profileSnap = await getDoc(profileRef);
            
            if (profileSnap.exists()) {
              await updateDoc(profileRef, {
                role: 'hod'
              });
            }
          } catch (profileErr) {
            console.warn('Could not update user profile for new HOD:', profileErr);
          }
        } else {
          hodId = null;
          hodAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(departmentData.hod)}&background=random`;
        }
      } else {
        hodId = null;
        hodAvatar = null;
      }
    }
    
    // Update the department
    const updateData = {
      name: departmentData.name,
      category: departmentData.category,
      hodName: departmentData.hod || 'Not Assigned',
      hodId: hodId,
      hodAvatar: hodAvatar,
      description: departmentData.description || '',
      active: departmentData.status === 'Active',
      updatedAt: new Date().toISOString()
    };
    
    await updateDoc(departmentRef, updateData);
    
    // Get updated course count
    const coursesCount = await getCoursesCountForDepartment(departmentId);
    
    return {
      id: departmentId,
      ...updateData,
      totalCourses: coursesCount,
      status: updateData.active ? 'Active' : 'Inactive'
    };
  } catch (error) {
    console.error('Error updating department:', error);
    throw new Error('Failed to update department: ' + error.message);
  }
};

/**
 * Delete a department
 * @param {string} departmentId Department ID to delete
 * @returns {Promise<Object>} Result with success status
 */
export const deleteDepartment = async (departmentId) => {
  try {
    // Get department data to check for HOD
    const departmentRef = doc(db, DEPARTMENTS_COLLECTION, departmentId);
    const departmentSnap = await getDoc(departmentRef);
    
    if (!departmentSnap.exists()) {
      return { success: false, error: 'Department not found' };
    }
    
    const departmentData = departmentSnap.data();
    
    // If this department has an assigned HOD, update their role
    if (departmentData.hodId) {
      try {
        // Reset HOD role to regular faculty
        const hodRef = doc(db, TEACHERS_COLLECTION, departmentData.hodId);
        await updateDoc(hodRef, {
          role: 'Faculty',
          departmentHead: null
        });
        
        // Update profile if exists
        const profileRef = doc(db, PROFILES_COLLECTION, departmentData.hodId);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          await updateDoc(profileRef, {
            role: 'Faculty'
          });
        }
      } catch (hodUpdateErr) {
        console.warn('Could not update HOD after department deletion:', hodUpdateErr);
        // Continue with department deletion even if HOD update fails
      }
    }
    
    // Delete the department
    await deleteDoc(departmentRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting department:', error);
    return { success: false, error: error.message };
  }
};

// Export all functions as a service object
const DepartmentManagementService = {
  getAllDepartments,
  searchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  departmentCategories,
  getHODOptions,
  getCoursesCountForDepartment,
  getCourseStatisticsForDepartment
};

export default DepartmentManagementService;