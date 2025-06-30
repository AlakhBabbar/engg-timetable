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

// Import semester utilities
import { 
  getCurrentSemesterPeriod,
  getSemesterNumbersForPeriod,
  parseSemesterString 
} from '../../../services/SemesterService.js';

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
 * Format semester name to standard format only
 * @param {string} semesterName - Raw semester name
 * @returns {string} - Formatted semester name (always "Semester X" format)
 */
export const formatSemesterName = (semesterName) => {
  if (!semesterName) return '';
  
  // If it's already in standard format, return as is
  if (/^Semester [1-8]$/.test(semesterName)) {
    return semesterName;
  }
  
  // Try to extract a semester number from any format
  const numberMatch = semesterName.match(/(\d+)/);
  if (numberMatch) {
    const number = parseInt(numberMatch[1]);
    if (number >= 1 && number <= 8) {
      return `Semester ${number}`;
    }
  }
  
  // If can't parse to valid semester number, return warning format
  console.warn(`Invalid semester format: "${semesterName}". Expected format: "Semester X" where X is 1-8`);
  return semesterName;
};

/**
 * Determine which semesters should be active based on current date
 * @param {Array} semesters - Array of available semesters
 * @returns {Array} - Array of semesters that should be active
 */
export const determineCurrentSemesters = (semesters) => {
  if (!semesters || semesters.length === 0) return [];
  
  const currentPeriod = getCurrentSemesterPeriod();
  const currentPeriodNumbers = getSemesterNumbersForPeriod(currentPeriod);
  
  // Find ALL semesters that match the current period
  const currentPeriodSemesters = semesters.filter(semester => {
    const parsed = parseSemesterString(semester.name);
    return parsed.isValid && currentPeriodNumbers.includes(parsed.number);
  });
  
  if (currentPeriodSemesters.length > 0) {
    // Return ALL current period semesters, not just one
    return currentPeriodSemesters;
  }
  
  // If no current period semesters exist, return the most recently created semester
  const sortedByDate = [...semesters].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  
  return sortedByDate.length > 0 ? [sortedByDate[0]] : [];
};

/**
 * Automatically update active semesters based on current date and available semesters
 * @returns {Promise<Array>} - Array of newly activated semesters
 */
export const autoUpdateActiveSemesters = async () => {
  try {
    // Get all semesters
    const allSemesters = await fetchSemesters();
    
    if (allSemesters.length === 0) {
      console.log('No semesters available for auto-activation');
      return [];
    }
    
    // Determine which semesters should be active
    const targetSemesters = determineCurrentSemesters(allSemesters);
    
    if (targetSemesters.length === 0) {
      console.log('Could not determine appropriate semesters for auto-activation');
      return [];
    }
    
    // Get currently active semesters
    const currentlyActive = allSemesters.filter(sem => sem.status === 'active');
    const targetIds = targetSemesters.map(sem => sem.id);
    const currentlyActiveIds = currentlyActive.map(sem => sem.id);
    
    // Check if the target semesters are already the same as currently active
    const sameActivation = targetIds.length === currentlyActiveIds.length && 
                          targetIds.every(id => currentlyActiveIds.includes(id));
    
    if (sameActivation) {
      const semesterNames = targetSemesters.map(sem => sem.name).join(', ');
      console.log(`Semesters "${semesterNames}" are already active`);
      return targetSemesters;
    }
    
    // Update active semesters using batch operation
    const batch = writeBatch(db);
    
    // Set all semesters to inactive first, then activate the target ones
    allSemesters.forEach(semester => {
      const semRef = doc(db, SEMESTERS_COLLECTION, semester.id);
      const shouldBeActive = targetIds.includes(semester.id);
      batch.update(semRef, { 
        status: shouldBeActive ? 'active' : 'inactive',
        updatedAt: serverTimestamp()
      });
    });
    
    // Update settings document with current semesters (use first one as primary)
    const settingsRef = collection(db, SETTINGS_COLLECTION);
    const settingsQuery = query(settingsRef, orderBy('createdAt', 'desc'), where('type', '==', 'global'));
    const settingsSnapshot = await getDocs(settingsQuery);
    
    if (!settingsSnapshot.empty) {
      const settingsDoc = settingsSnapshot.docs[0];
      batch.update(doc(db, SETTINGS_COLLECTION, settingsDoc.id), {
        currentSemester: targetSemesters[0].id, // Primary semester
        activeSemesters: targetIds, // All active semester IDs
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new settings document if it doesn't exist
      const newSettingsRef = doc(collection(db, SETTINGS_COLLECTION));
      batch.set(newSettingsRef, {
        type: 'global',
        currentSemester: targetSemesters[0].id,
        activeSemesters: targetIds,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    // Commit the batch
    await batch.commit();
    
    const semesterNames = targetSemesters.map(sem => sem.name).join(', ');
    console.log(`Auto-activated semesters: "${semesterNames}"`);
    return targetSemesters.map(sem => ({ ...sem, status: 'active' }));
    
  } catch (error) {
    console.error('Error in auto-updating active semesters:', error);
    throw error;
  }
};