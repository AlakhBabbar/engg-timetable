// Import Firebase configuration
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
  writeBatch
} from '../../../firebase/config.js';

// Collection references
const SEMESTERS_COLLECTION = 'semesters';
const SETTINGS_COLLECTION = 'settings';

/**
 * Fetch all semesters from Firebase
 * @returns {Promise<Array>} - Array of semesters
 */
export const fetchSemesters = async () => {
  try {
    const semestersRef = collection(db, SEMESTERS_COLLECTION);
    const semestersQuery = query(semestersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(semestersQuery);
    
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || '',
      status: doc.data().status || 'inactive',
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    }));
  } catch (error) {
    console.error('Error fetching semesters:', error);
    throw error;
  }
};

/**
 * Add a new semester to Firebase
 * @param {string} name - Semester name
 * @returns {Promise<Object>} - New semester object
 */
export const addSemester = async (name) => {
  try {
    // Prepare semester data
    const semesterData = {
      name: name.trim(),
      status: 'inactive', // New semesters are inactive by default
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Add semester to Firebase
    const docRef = await addDoc(collection(db, SEMESTERS_COLLECTION), semesterData);
    
    // Return new semester object with ID
    return {
      id: docRef.id,
      name: name.trim(),
      status: 'inactive',
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('Error adding semester:', error);
    throw error;
  }
};

/**
 * Update a semester in Firebase
 * @param {string} semesterId - Semester ID
 * @param {string} newName - New semester name
 * @returns {Promise<void>}
 */
export const updateSemester = async (semesterId, newName) => {
  try {
    const semesterRef = doc(db, SEMESTERS_COLLECTION, semesterId);
    
    await updateDoc(semesterRef, {
      name: newName.trim(),
      updatedAt: serverTimestamp(),
    });
    
  } catch (error) {
    console.error('Error updating semester:', error);
    throw error;
  }
};

/**
 * Delete a semester from Firebase
 * @param {string} semesterId - Semester ID
 * @returns {Promise<void>}
 */
export const deleteSemester = async (semesterId) => {
  try {
    // Check if semester is active first
    const semesterRef = doc(db, SEMESTERS_COLLECTION, semesterId);
    const semesterSnap = await getDoc(semesterRef);
    
    if (semesterSnap.exists() && semesterSnap.data().status === 'active') {
      throw new Error('Cannot delete the active semester');
    }
    
    // Delete the semester
    await deleteDoc(semesterRef);
  } catch (error) {
    console.error('Error deleting semester:', error);
    throw error;
  }
};

/**
 * Update the active semester in Firebase
 * @param {string} semesterId - Semester ID to set as active
 * @returns {Promise<void>}
 */
export const updateActiveSemester = async (semesterId) => {
  try {
    // Get a batch write operation
    const batch = writeBatch(db);
    
    // Get all semesters
    const semestersRef = collection(db, SEMESTERS_COLLECTION);
    const snapshot = await getDocs(semestersRef);
    
    // Set all semesters to inactive, and the selected one to active
    snapshot.docs.forEach(docSnapshot => {
      const semRef = doc(db, SEMESTERS_COLLECTION, docSnapshot.id);
      if (docSnapshot.id === semesterId) {
        batch.update(semRef, { 
          status: 'active',
          updatedAt: serverTimestamp()
        });
      } else {
        batch.update(semRef, { 
          status: 'inactive',
          updatedAt: serverTimestamp() 
        });
      }
    });
    
    // Also update the current settings document
    const settingsRef = collection(db, SETTINGS_COLLECTION);
    const settingsQuery = query(settingsRef, orderBy('createdAt', 'desc'), where('type', '==', 'global'));
    const settingsSnapshot = await getDocs(settingsQuery);
    
    if (!settingsSnapshot.empty) {
      const settingsDoc = settingsSnapshot.docs[0];
      batch.update(doc(db, SETTINGS_COLLECTION, settingsDoc.id), {
        currentSemester: semesterId,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new settings document if it doesn't exist
      const newSettingsRef = doc(collection(db, SETTINGS_COLLECTION));
      batch.set(newSettingsRef, {
        type: 'global',
        currentSemester: semesterId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    // Commit the batch
    await batch.commit();
    
  } catch (error) {
    console.error('Error updating active semester:', error);
    throw error;
  }
};

/**
 * Get the currently active semester
 * @returns {Promise<Object|null>} - Active semester or null
 */
export const getActiveSemester = async () => {
  try {
    const semestersRef = collection(db, SEMESTERS_COLLECTION);
    const semestersQuery = query(semestersRef, where('status', '==', 'active'));
    const snapshot = await getDocs(semestersQuery);
    
    if (snapshot.empty) {
      return null;
    }
    
    const activeDoc = snapshot.docs[0];
    return {
      id: activeDoc.id,
      name: activeDoc.data().name || '',
      status: 'active',
      createdAt: activeDoc.data().createdAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting active semester:', error);
    return null;
  }
};

/**
 * Format semester name for consistent display
 * @param {string} semesterName - Raw semester name
 * @returns {string} - Formatted semester name
 */
export const formatSemesterName = (semesterName) => {
  if (!semesterName) return '';
  
  // If it's already in a standard format, return as is
  if (semesterName.startsWith('Semester ')) {
    return semesterName;
  }
  
  // If it's in a term-year format (Fall 2025), return as is
  if (/^(Fall|Spring|Summer|Winter)\s\d{4}$/.test(semesterName)) {
    return semesterName;
  }
  
  // Otherwise, try to extract a semester number if present
  const semesterMatch = semesterName.match(/(\d+)/);
  if (semesterMatch) {
    return `Semester ${semesterMatch[1]}`;
  }
  
  // If all else fails, return original
  return semesterName;
};