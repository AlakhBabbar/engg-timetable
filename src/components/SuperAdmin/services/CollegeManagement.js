import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../../firebase/config';

// Collection name
const COLLECTION_NAME = 'colleges';

// Sample/Mock data for initial development (kept for reference/seeding)
const sampleColleges = [
  // Data kept for potential seeding functionality
  // but not used as fallback data anymore
];

/**
 * Get all colleges from Firestore or return sample data
 * @returns {Promise<Array>} Array of college objects
 */
export const getColleges = async () => {
  try {
    const collegesRef = collection(db, COLLECTION_NAME);
    const q = query(collegesRef, orderBy('name'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Return sample data if no colleges exist in Firestore
      console.log('No colleges found in Firestore, returning sample data');
      return sampleColleges;
    }
    
    const colleges = [];
    querySnapshot.forEach((doc) => {
      colleges.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      });
    });
    
    return colleges;
  } catch (error) {
    console.error('Error fetching colleges from Firestore:', error);
    // Return empty array instead of sample data as fallback
    return [];
  }
};

/**
 * Add a new college to Firestore
 * @param {Object} collegeData - College data object
 * @returns {Promise<Object>} Created college with ID
 */
export const addCollege = async (collegeData) => {
  try {
    const collegesRef = collection(db, COLLECTION_NAME);
    const newCollege = {
      ...collegeData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collegesRef, newCollege);
    
    return {
      id: docRef.id,
      ...newCollege,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error adding college to Firestore:', error);
    // Re-throw error instead of using sample data fallback
    throw new Error('Failed to add college. Please try again.');
  }
};

/**
 * Update an existing college in Firestore
 * @param {string} collegeId - ID of the college to update
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated college object
 */
export const updateCollege = async (collegeId, updateData) => {
  try {
    const collegeRef = doc(db, COLLECTION_NAME, collegeId);
    const updatedData = {
      ...updateData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(collegeRef, updatedData);
    
    return {
      id: collegeId,
      ...updatedData,
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error updating college in Firestore:', error);
    // Re-throw error instead of using sample data fallback
    throw new Error('Failed to update college. Please try again.');
  }
};

/**
 * Delete a college from Firestore
 * @param {string} collegeId - ID of the college to delete
 * @returns {Promise<boolean>} Success status
 */
export const deleteCollege = async (collegeId) => {
  try {
    const collegeRef = doc(db, COLLECTION_NAME, collegeId);
    await deleteDoc(collegeRef);
    return true;
  } catch (error) {
    console.error('Error deleting college from Firestore:', error);
    // Re-throw error instead of using sample data fallback
    throw new Error('Failed to delete college. Please try again.');
  }
};

/**
 * Get college statistics
 * @returns {Promise<Object>} College statistics
 */
export const getCollegeStats = async () => {
  try {
    const colleges = await getColleges();
    
    // Calculate basic stats
    const totalColleges = colleges.length;
    const activeColleges = colleges.filter(college => college.status === 'Active').length;
    
    // Mock department and faculty counts (would come from respective collections in real app)
    const totalDepartments = colleges.reduce((acc, college) => {
      switch (college.type) {
        case 'Faculty': return acc + 8; // Average departments per faculty
        case 'College': return acc + 5;
        case 'School': return acc + 3;
        case 'Institute': return acc + 6;
        default: return acc + 2;
      }
    }, 0);
    
    const totalFaculty = totalDepartments * 12; // Estimated faculty per department
    
    return {
      totalColleges,
      activeColleges,
      totalDepartments,
      totalFaculty,
      collegesByType: colleges.reduce((acc, college) => {
        acc[college.type] = (acc[college.type] || 0) + 1;
        return acc;
      }, {}),
      collegesByStatus: colleges.reduce((acc, college) => {
        acc[college.status] = (acc[college.status] || 0) + 1;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Error calculating college stats:', error);
    return {
      totalColleges: 0,
      activeColleges: 0,
      totalDepartments: 0,
      totalFaculty: 0,
      collegesByType: {},
      collegesByStatus: {}
    };
  }
};

/**
 * Get colleges by type
 * @param {string} type - College type to filter by
 * @returns {Promise<Array>} Filtered colleges
 */
export const getCollegesByType = async (type) => {
  try {
    const colleges = await getColleges();
    return colleges.filter(college => college.type === type);
  } catch (error) {
    console.error('Error filtering colleges by type:', error);
    return [];
  }
};

/**
 * Get colleges by status
 * @param {string} status - College status to filter by
 * @returns {Promise<Array>} Filtered colleges
 */
export const getCollegesByStatus = async (status) => {
  try {
    const colleges = await getColleges();
    return colleges.filter(college => college.status === status);
  } catch (error) {
    console.error('Error filtering colleges by status:', error);
    return [];
  }
};

/**
 * Search colleges by name or code
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Matching colleges
 */
export const searchColleges = async (searchTerm) => {
  try {
    const colleges = await getColleges();
    const term = searchTerm.toLowerCase();
    return colleges.filter(college => 
      college.name.toLowerCase().includes(term) ||
      college.code.toLowerCase().includes(term) ||
      college.dean.toLowerCase().includes(term)
    );
  } catch (error) {
    console.error('Error searching colleges:', error);
    return [];
  }
};

/**
 * Get college by ID
 * @param {string} collegeId - College ID
 * @returns {Promise<Object|null>} College object or null
 */
export const getCollegeById = async (collegeId) => {
  try {
    const colleges = await getColleges();
    return colleges.find(college => college.id === collegeId) || null;
  } catch (error) {
    console.error('Error getting college by ID:', error);
    return null;
  }
};

/**
 * Initialize sample colleges in Firestore (for first-time setup)
 * @returns {Promise<boolean>} Success status
 */
export const initializeSampleColleges = async () => {
  try {
    const existingColleges = await getColleges();
    if (existingColleges.length > 0) {
      console.log('Colleges already exist in Firestore');
      return false;
    }
    
    const collegesRef = collection(db, COLLECTION_NAME);
    
    for (const college of sampleColleges) {
      const { id, ...collegeData } = college; // Remove the mock ID
      await addDoc(collegesRef, {
        ...collegeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    console.log('Sample colleges initialized in Firestore');
    return true;
  } catch (error) {
    console.error('Error initializing sample colleges:', error);
    return false;
  }
};

// Export sample data for other components that might need it
export { sampleColleges };

// Default export for the main service functions
export default {
  getColleges,
  addCollege,
  updateCollege,
  deleteCollege,
  getCollegeStats,
  getCollegesByType,
  getCollegesByStatus,
  searchColleges,
  getCollegeById,
  initializeSampleColleges
};
