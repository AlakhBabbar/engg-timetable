// TeacherManagement.js - Firebase Integration
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
  limit 
} from '../../../firebase/config.js';

// Collection names
const TEACHERS_COLLECTION = 'teachers';

// Subject areas that teachers can specialize in
export const subjectAreas = [
  'Power Systems',
  'Control Engineering',
  'Electronics',
  'Electrical Machines',
  'Thermodynamics',
  'Heat Transfer',
  'Machine Design',
  'Manufacturing',
  'Structural Analysis',
  'Construction Management',
  'Transportation Engineering',
  'Environmental Engineering',
  'Footwear Design',
  'Leather Technology',
  'Manufacturing Processes',
  'Quality Control',
  'Agricultural Machinery',
  'Irrigation Engineering',
  'Soil Science',
  'Farm Mechanization',
  'Food Processing',
  'Renewable Energy'
];

// Department options
export const departments = [
  'Electrical Engineering', 
  'Mechanical Engineering',
  'Civil Engineering',
  'Footwear Engineering',
  'Agricultural Engineering'
];

// Sample teachers data for fallback
export const dummyTeachers = [
  { id: 1, name: 'Dr. Jane Smith', email: 'jane@univ.edu', department: 'Electrical Engineering', expertise: ['Power Systems', 'Control Engineering'], qualification: 'Ph.D Electrical Engineering', experience: 8, active: true },
  { id: 2, name: 'Prof. Michael Johnson', email: 'michael@univ.edu', department: 'Mechanical Engineering', expertise: ['Thermodynamics', 'Heat Transfer'], qualification: 'Ph.D Mechanical Engineering', experience: 12, active: true },
  { id: 3, name: 'Dr. Sarah Williams', email: 'sarah@univ.edu', department: 'Civil Engineering', expertise: ['Structural Analysis', 'Construction Management'], qualification: 'Ph.D Civil Engineering', experience: 6, active: false },
];

/**
 * Fetch all teachers from Firestore database
 * @returns {Promise<Object>} Object with success status and teachers array
 */
export const fetchTeachers = async () => {
  try {
    const teachersRef = collection(db, TEACHERS_COLLECTION);
    const querySnapshot = await getDocs(teachersRef);
    
    const teachers = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        department: data.department,
        expertise: data.expertise || [],
        qualification: data.qualification,
        experience: data.experience || 0,
        active: data.active !== false, // default to true if not specified
        userId: data.userId
      };
    });

    return {
      success: true,
      teachers,
      error: null
    };
  } catch (error) {
    console.error('Error fetching teachers from Firebase:', error);
    return {
      success: false,
      teachers: [],
      error: 'Failed to load teachers'
    };
  }
};

/**
 * Create a new teacher record in Firestore (without creating an auth account)
 * @param {Object} teacherData - The teacher data to create
 * @returns {Promise} Promise object with result
 */
export const createTeacher = async (teacherData) => {
  try {
    // Generate a unique ID for the teacher
    const teacherId = crypto.randomUUID();
    
    // Create teacher document in Firestore
    const teacherRef = doc(db, TEACHERS_COLLECTION, teacherId);
    const facultyData = {
      teacherId,
      name: teacherData.name,
      email: teacherData.email,
      department: teacherData.department,
      expertise: teacherData.expertise || [],
      qualification: teacherData.qualification || '',
      experience: parseInt(teacherData.experience) || 0,
      active: teacherData.active !== false,
      role: 'Faculty',
      maxHours: 40, // Default max teaching hours per week
      status: 'available',
      createdAt: new Date().toISOString()
    };
    
    await setDoc(teacherRef, facultyData);
    
    return {
      success: true,
      faculty: {
        id: teacherId,
        ...facultyData
      },
      error: null
    };
  } catch (error) {
    console.error('Error creating teacher in Firebase:', error);
    
    let errorMessage = 'Failed to create faculty record';
    
    return {
      success: false,
      faculty: null,
      error: errorMessage
    };
  }
};

/**
 * Update an existing teacher's information
 * @param {Object} teacherData - Updated teacher data
 * @returns {Promise} Promise object with result
 */
export const updateTeacher = async (teacherData) => {
  try {
    const teacherId = teacherData.id;
    
    // Update the teacher document in Firestore
    const teacherRef = doc(db, TEACHERS_COLLECTION, teacherId);
    const teacherDocSnap = await getDoc(teacherRef);
    
    if (!teacherDocSnap.exists()) {
      throw new Error('Teacher not found');
    }
    
    const updateData = {
      name: teacherData.name,
      department: teacherData.department,
      expertise: teacherData.expertise || [],
      qualification: teacherData.qualification || '',
      experience: parseInt(teacherData.experience) || 0,
      active: teacherData.active !== false,
      updatedAt: new Date().toISOString()
    };
    
    await updateDoc(teacherRef, updateData);
    
    const existingData = teacherDocSnap.data();
    
    return {
      success: true,
      faculty: {
        id: teacherId,
        ...existingData,
        ...updateData
      },
      error: null
    };
  } catch (error) {
    console.error('Error updating teacher in Firebase:', error);
    return {
      success: false,
      faculty: null,
      error: 'Failed to update faculty information'
    };
  }
};

/**
 * Delete a teacher by ID
 * @param {string} teacherId - ID of the teacher to delete
 * @returns {Promise} Promise object with result
 */
export const deleteTeacher = async (teacherId) => {
  try {
    // Get the teacher document
    const teacherRef = doc(db, TEACHERS_COLLECTION, teacherId);
    const teacherSnap = await getDoc(teacherRef);
    
    if (!teacherSnap.exists()) {
      throw new Error('Teacher not found');
    }
    
    // Delete the teacher document
    await deleteDoc(teacherRef);
    
    return {
      success: true,
      error: null
    };
  } catch (error) {
    console.error('Error deleting teacher from Firebase:', error);
    return {
      success: false,
      error: 'Failed to delete faculty member'
    };
  }
};

/**
 * Delete multiple teachers by their IDs
 * @param {Array<string>} teacherIds - Array of teacher IDs to delete
 * @returns {Promise<Object>} Object with success status and results
 */
export const bulkDeleteTeachers = async (teacherIds) => {
  try {
    if (!Array.isArray(teacherIds) || teacherIds.length === 0) {
      return {
        success: false,
        error: 'No teachers selected for deletion',
        results: []
      };
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Process deletions sequentially to avoid overwhelming the database
    for (const teacherId of teacherIds) {
      try {
        const result = await deleteTeacher(teacherId);
        if (result.success) {
          successCount++;
          results.push({
            teacherId,
            success: true
          });
        } else {
          failureCount++;
          results.push({
            teacherId,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        failureCount++;
        results.push({
          teacherId,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: failureCount === 0,
      results,
      summary: {
        total: teacherIds.length,
        successful: successCount,
        failed: failureCount
      },
      error: failureCount > 0 ? `${failureCount} out of ${teacherIds.length} deletions failed` : null
    };
  } catch (error) {
    console.error('Error in bulk delete operation:', error);
    return {
      success: false,
      error: 'Bulk delete operation failed',
      results: [],
      summary: {
        total: teacherIds.length,
        successful: 0,
        failed: teacherIds.length
      }
    };
  }
};

/**
 * Get a teacher by ID
 * @param {string} teacherId - ID of the teacher to fetch
 * @returns {Promise<Object>} Teacher data
 */
export const getTeacherById = async (teacherId) => {
  try {
    const teacherRef = doc(db, TEACHERS_COLLECTION, teacherId);
    const docSnap = await getDoc(teacherRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data
      };
    } else {
      throw new Error('Teacher not found');
    }
  } catch (error) {
    console.error('Error fetching teacher:', error);
    throw error;
  }
};

/**
 * Search teachers by name, department, or expertise
 * @param {string} searchTerm - Term to search for
 * @returns {Promise<Array>} Matching teachers
 */
export const searchTeachers = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.trim() === '') {
      return await fetchTeachers();
    }
    
    const searchTermLower = searchTerm.toLowerCase().trim();
    const teachersRef = collection(db, TEACHERS_COLLECTION);
    const querySnapshot = await getDocs(teachersRef);
    
    // Client-side filtering since Firestore doesn't support complex text search
    const filteredTeachers = querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        };
      })
      .filter(teacher => 
        (teacher.name && teacher.name.toLowerCase().includes(searchTermLower)) ||
        (teacher.department && teacher.department.toLowerCase().includes(searchTermLower)) ||
        (teacher.expertise && teacher.expertise.some(exp => 
          exp.toLowerCase().includes(searchTermLower)
        ))
      );
    
    return {
      success: true,
      teachers: filteredTeachers,
      error: null
    };
  } catch (error) {
    console.error('Error searching teachers:', error);
    return {
      success: false,
      teachers: [],
      error: 'Failed to search teachers'
    };
  }
};

/**
 * Get example JSON dataset format
 * @returns {Object} Example dataset
 */
export const getExampleJSONDataset = () => {
  return {
    "teachers": [
      {
        "name": "Dr. John Smith",
        "email": "john.smith@university.edu",
        "department": "Electrical Engineering",
        "expertise": ["Power Systems", "Control Engineering"],
        "qualification": "Ph.D Electrical Engineering",
        "experience": 10,
        "active": true
      },
      {
        "name": "Prof. Maria Garcia",
        "email": "maria.garcia@university.edu",
        "department": "Mechanical Engineering",
        "expertise": ["Thermodynamics", "Heat Transfer"],
        "qualification": "Ph.D Mechanical Engineering",
        "experience": 8,
        "active": true
      }
    ]
  };
};

/**
 * Process faculty data import from JSON
 * @param {Object} jsonData - Imported JSON data
 * @returns {Object} Import results
 */
export const processFacultyImport = async (jsonData) => {
  try {
    // Handle both "teachers" and "faculty" root keys
    const teacherArray = jsonData.teachers || jsonData.faculty;
    
    if (!teacherArray || !Array.isArray(teacherArray)) {
      return { success: false, error: "Invalid JSON format. Expected 'teachers' or 'faculty' array." };
    }
    
    const results = [];
    const departmentMap = {
      "Mechanical": "Mechanical Engineering",
      "Electrical": "Electrical Engineering",
      "Civil": "Civil Engineering",
      "Agricultural": "Agricultural Engineering",
      "Footwear": "Footwear Technology",
      // Add more mappings as needed
    };
    
    for (const teacherData of teacherArray) {
      try {
        // Validate required fields
        if (!teacherData.name) {
          results.push({
            name: teacherData.name || 'Unknown',
            success: false,
            error: "Missing name field"
          });
          continue;
        }
        
        // Map department names if needed
        let department = teacherData.department || '';
        if (departmentMap[department]) {
          department = departmentMap[department];
        }
        
        // Generate a default email if not provided
        const email = teacherData.email || 
          `${teacherData.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@university.edu`;
        
        // Add teacher using the existing create function
        const result = await createTeacher({
          name: teacherData.name,
          email: email,
          department: department,
          expertise: Array.isArray(teacherData.expertise) ? teacherData.expertise : [],
          qualification: teacherData.qualification || '',
          experience: teacherData.experience || 0,
          active: teacherData.active !== false
        });
        
        if (result.success) {
          results.push({
            name: teacherData.name,
            success: true
          });
        } else {
          results.push({
            name: teacherData.name,
            success: false,
            error: result.error
          });
        }
      } catch (err) {
        results.push({
          name: teacherData.name || 'Unknown',
          success: false,
          error: err.message
        });
      }
    }
    
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error("Error processing faculty import:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Process a single faculty member import (used for rate-limited uploads)
 * @param {Object} teacherData - Single teacher data object
 * @returns {Promise<Object>} Result object with success status
 */
export const processSingleFacultyImport = async (teacherData) => {
  try {
    // Validate required fields
    if (!teacherData.name) {
      return {
        success: false,
        error: "Missing name field",
        item: teacherData
      };
    }

    const departmentMap = {
      "Mechanical": "Mechanical Engineering",
      "Electrical": "Electrical Engineering", 
      "Civil": "Civil Engineering",
      "Agricultural": "Agricultural Engineering",
      "Footwear": "Footwear Technology",
      // Add more mappings as needed
    };

    // Map department names if needed
    let department = teacherData.department || '';
    if (departmentMap[department]) {
      department = departmentMap[department];
    }

    // Generate a default email if not provided
    const email = teacherData.email || 
      `${teacherData.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@university.edu`;

    // Prepare teacher document
    const teacherDoc = {
      name: teacherData.name,
      email: email,
      department: department,
      expertise: Array.isArray(teacherData.expertise) ? teacherData.expertise : 
                  typeof teacherData.expertise === 'string' ? [teacherData.expertise] : [],
      qualification: teacherData.qualification || 'Not specified',
      experience: parseInt(teacherData.experience) || 0,
      active: teacherData.active !== false, // Default to true unless explicitly false
      employeeId: teacherData.employeeId || teacherData.id || null,
      phoneNumber: teacherData.phoneNumber || teacherData.phone || '',
      address: teacherData.address || '',
      joiningDate: teacherData.joiningDate || new Date().toISOString().split('T')[0],
      designation: teacherData.designation || 'Faculty',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create unique document ID based on email
    const docId = email.replace(/[@.]/g, '_');
    const teacherRef = doc(db, TEACHERS_COLLECTION, docId);
    
    // Check if teacher already exists
    const existingDoc = await getDoc(teacherRef);
    if (existingDoc.exists()) {
      // Update existing teacher
      await updateDoc(teacherRef, {
        ...teacherDoc,
        createdAt: existingDoc.data().createdAt, // Keep original creation date
      });
      
      return {
        success: true,
        action: 'updated',
        name: teacherData.name,
        item: teacherData
      };
    } else {
      // Create new teacher
      await setDoc(teacherRef, teacherDoc);
      
      return {
        success: true,
        action: 'created',
        name: teacherData.name,
        item: teacherData
      };
    }

  } catch (error) {
    console.error('Error processing single faculty import:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      item: teacherData
    };
  }
};

/**
 * Generate avatar initials from name
 * @param {string} name - Full name
 * @returns {string} Initials (up to 2 characters)
 */
export const getInitials = (name) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

/**
 * Generate background color for avatar based on name
 * @param {string} name - User's name
 * @returns {string} CSS class for background color
 */
export const getAvatarBg = (name) => {
  const colors = [
    'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 
    'bg-red-500', 'bg-orange-500', 'bg-amber-500',
    'bg-yellow-500', 'bg-lime-500', 'bg-green-500',
    'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500',
    'bg-sky-500', 'bg-blue-500', 'bg-violet-500'
  ];
  
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};



// Export all functions as a service object
const TeacherManagementService = {
  fetchTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  bulkDeleteTeachers,
  getTeacherById,
  searchTeachers,
  getExampleJSONDataset,
  processFacultyImport,
  processSingleFacultyImport,
  getInitials,
  getAvatarBg,
  subjectAreas,
  departments,
  dummyTeachers,
};

export default TeacherManagementService;