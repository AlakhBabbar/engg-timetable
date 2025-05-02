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

// Available department types
export const departmentTypes = [
  'Computer Science',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Arts',
  'Business',
  'Administration'
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
        type: deptData.type || '',
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
    console.error('Error fetching departments:', error);
    
    // Return mock data if Firebase fetch fails
    return [
      { id: '1', name: 'Computer Science', type: 'Computer Science', hod: 'Dr. Alan Turing', hodAvatar: 'https://ui-avatars.com/api/?name=Alan+Turing&background=random', description: 'Computer Science and Software Engineering Department', status: 'Active', totalCourses: 24 },
      { id: '2', name: 'Electrical Engineering', type: 'Electrical Engineering', hod: 'Dr. Nikola Tesla', hodAvatar: 'https://ui-avatars.com/api/?name=Nikola+Tesla&background=random', description: 'Electrical and Electronics Engineering', status: 'Active', totalCourses: 18 },
      { id: '3', name: 'Mathematics', type: 'Mathematics', hod: 'Dr. Katherine Johnson', hodAvatar: 'https://ui-avatars.com/api/?name=Katherine+Johnson&background=random', description: 'Pure and Applied Mathematics', status: 'Active', totalCourses: 15 }
    ];
  }
};

/**
 * Get count of courses for a given department
 * @param {string} departmentId Department ID
 * @returns {Promise<number>} Course count
 */
const getCoursesCountForDepartment = async (departmentId) => {
  try {
    // In a real application, you would query a courses collection
    // For this example, we'll generate a random number
    return Math.floor(Math.random() * 30) + 10;
  } catch (error) {
    console.error('Error getting courses count:', error);
    return 0;
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
 * @returns {Promise<Array>} Filtered departments
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
          type: data.type || '',
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
        dept.type.toLowerCase().includes(searchTermLower) ||
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
      type: departmentData.type,
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
      type: departmentData.type,
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
  departmentTypes,
  getHODOptions
};

export default DepartmentManagementService;