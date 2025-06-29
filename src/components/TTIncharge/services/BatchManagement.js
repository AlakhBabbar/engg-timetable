// Business logic for BatchManagement component
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
  onSnapshot,
  serverTimestamp,
  generateId 
} from '../../../firebase/config';

// Collection name for batches in Firestore
const BATCHES_COLLECTION = 'batches';

// Local storage cache helper functions
const getCacheKey = (branchId, semester) => `batches_${branchId}_${semester}`;
const getAllCacheKeys = () => Object.keys(localStorage).filter(key => key.startsWith('batches_'));

// Cache management functions
const getCachedBatches = (branchId, semester) => {
  try {
    const cached = localStorage.getItem(getCacheKey(branchId, semester));
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Error reading cache:', error);
    return [];
  }
};

const setCachedBatches = (branchId, semester, batches) => {
  try {
    localStorage.setItem(getCacheKey(branchId, semester), JSON.stringify(batches));
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

const removeCachedBatch = (branchId, semester, batchId) => {
  try {
    const batches = getCachedBatches(branchId, semester);
    const filteredBatches = batches.filter(batch => batch.id !== batchId);
    setCachedBatches(branchId, semester, filteredBatches);
  } catch (error) {
    console.error('Error removing from cache:', error);
  }
};

// Firestore helper functions
const getBatchDocRef = (batchId) => doc(db, BATCHES_COLLECTION, batchId);
const getBatchesQuery = (branchId, semester) => query(
  collection(db, BATCHES_COLLECTION),
  where('branchId', '==', branchId),
  where('semester', '==', semester),
  orderBy('createdAt', 'asc')
);

// Sync cache with Firestore
const syncWithFirestore = async (branchId, semester) => {
  try {
    const q = getBatchesQuery(branchId, semester);
    const querySnapshot = await getDocs(q);
    const firestoreBatches = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      firestoreBatches.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      });
    });
    
    // Update cache with Firestore data
    setCachedBatches(branchId, semester, firestoreBatches);
    return firestoreBatches;
  } catch (error) {
    console.error('Error syncing with Firestore:', error);
    // Return cached data if Firestore fails
    return getCachedBatches(branchId, semester);
  }
};

/**
 * Get list of available branches
 * @returns {Array} Array of branch objects
 */
export const getBranches = () => {
  return [
    { id: 'cse', name: 'Computer Science & Engineering' },
    { id: 'ece', name: 'Electronics & Communication Engineering' },
    { id: 'me', name: 'Mechanical Engineering' },
    { id: 'ce', name: 'Civil Engineering' },
    { id: 'ee', name: 'Electrical Engineering' },
    { id: 'it', name: 'Information Technology' }
  ];
};

/**
 * Get list of available semesters
 * @returns {Array} Array of semester strings
 */
export const getSemesters = () => {
  return [
    'Semester 1',
    'Semester 2', 
    'Semester 3',
    'Semester 4',
    'Semester 5',
    'Semester 6',
    'Semester 7',
    'Semester 8'
  ];
};

/**
 * Get batches for a specific branch and semester (Hybrid: Cache + Firestore)
 * @param {string} branchId - Branch identifier
 * @param {string} semester - Semester name
 * @param {boolean} forceSync - Force sync with Firestore
 * @returns {Promise<Array>} Promise resolving to array of batch objects
 */
export const getBatches = async (branchId, semester, forceSync = false) => {
  try {
    // If force sync or no cached data, sync with Firestore
    const cachedBatches = getCachedBatches(branchId, semester);
    
    if (forceSync || cachedBatches.length === 0) {
      return await syncWithFirestore(branchId, semester);
    }
    
    // Return cached data immediately and sync in background
    syncWithFirestore(branchId, semester).catch(console.error);
    return cachedBatches;
    
  } catch (error) {
    console.error('Error getting batches:', error);
    // Fallback to cache if available
    return getCachedBatches(branchId, semester);
  }
};

/**
 * Create a new batch (Hybrid: Cache + Firestore)
 * @param {string} branchId - Branch identifier
 * @param {string} semester - Semester name
 * @param {string} batchName - Name of the batch
 * @returns {Promise<Object>} Promise resolving to the created batch object
 */
export const createBatch = async (branchId, semester, batchName) => {
  try {
    // Check if batch name already exists in cache first (faster)
    const existingBatches = getCachedBatches(branchId, semester);
    const batchExists = existingBatches.some(batch => 
      batch.name.toLowerCase() === batchName.toLowerCase()
    );
    
    if (batchExists) {
      throw new Error('Batch with this name already exists');
    }
    
    // Create batch object
    const batchId = generateId();
    const newBatch = {
      id: batchId,
      name: batchName,
      branchId,
      semester,
      studentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Update cache immediately (optimistic update)
    const updatedBatches = [...existingBatches, newBatch];
    setCachedBatches(branchId, semester, updatedBatches);
    
    // Save to Firestore in background
    try {
      const batchDoc = getBatchDocRef(batchId);
      await setDoc(batchDoc, {
        ...newBatch,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (firestoreError) {
      console.error('Error saving to Firestore:', firestoreError);
      // Note: We keep the cache update even if Firestore fails
      // The next sync will attempt to reconcile
    }
    
    return newBatch;
    
  } catch (error) {
    console.error('Error creating batch:', error);
    throw error;
  }
};

/**
 * Update an existing batch (Hybrid: Cache + Firestore)
 * @param {string} batchId - Batch identifier
 * @param {string} newName - New name for the batch
 * @returns {Promise<Object>} Promise resolving to the updated batch object
 */
export const updateBatch = async (batchId, newName) => {
  try {
    // Find the batch across all cached data
    const allKeys = getAllCacheKeys();
    let foundBatch = null;
    let branchId = null;
    let semester = null;
    
    for (const key of allKeys) {
      const batches = getCachedBatches(...key.split('_').slice(1));
      const batch = batches.find(b => b.id === batchId);
      if (batch) {
        foundBatch = batch;
        [, branchId, semester] = key.split('_');
        break;
      }
    }
    
    if (!foundBatch) {
      throw new Error('Batch not found');
    }
    
    // Check if new name conflicts with existing batches (excluding current batch)
    const existingBatches = getCachedBatches(branchId, semester);
    const nameExists = existingBatches.some(batch => 
      batch.id !== batchId && batch.name.toLowerCase() === newName.toLowerCase()
    );
    
    if (nameExists) {
      throw new Error('Batch with this name already exists');
    }
    
    // Update batch object
    const updatedBatch = {
      ...foundBatch,
      name: newName,
      updatedAt: new Date().toISOString()
    };
    
    // Update cache immediately (optimistic update)
    const updatedBatches = existingBatches.map(batch => 
      batch.id === batchId ? updatedBatch : batch
    );
    setCachedBatches(branchId, semester, updatedBatches);
    
    // Update Firestore in background
    try {
      const batchDoc = getBatchDocRef(batchId);
      await updateDoc(batchDoc, {
        name: newName,
        updatedAt: serverTimestamp()
      });
    } catch (firestoreError) {
      console.error('Error updating in Firestore:', firestoreError);
      // Note: We keep the cache update even if Firestore fails
    }
    
    return updatedBatch;
    
  } catch (error) {
    console.error('Error updating batch:', error);
    throw error;
  }
};

/**
 * Delete a batch (Hybrid: Cache + Firestore)
 * @param {string} batchId - Batch identifier
 * @returns {Promise<boolean>} Promise resolving to success status
 */
export const deleteBatch = async (batchId) => {
  try {
    // Find and remove the batch from cache
    const allKeys = getAllCacheKeys();
    let branchId = null;
    let semester = null;
    let found = false;
    
    for (const key of allKeys) {
      const [, branch, sem] = key.split('_');
      const batches = getCachedBatches(branch, sem);
      const batchExists = batches.some(batch => batch.id === batchId);
      
      if (batchExists) {
        branchId = branch;
        semester = sem;
        found = true;
        // Remove from cache immediately (optimistic update)
        removeCachedBatch(branch, sem, batchId);
        break;
      }
    }
    
    if (!found) {
      throw new Error('Batch not found');
    }
    
    // Delete from Firestore in background
    try {
      const batchDoc = getBatchDocRef(batchId);
      await deleteDoc(batchDoc);
    } catch (firestoreError) {
      console.error('Error deleting from Firestore:', firestoreError);
      // Note: We keep the cache deletion even if Firestore fails
    }
    
    return true;
    
  } catch (error) {
    console.error('Error deleting batch:', error);
    throw error;
  }
};

/**
 * Get batch statistics for dashboard (Hybrid: Cache + Firestore)
 * @returns {Promise<Object>} Promise resolving to batch statistics
 */
export const getBatchStatistics = async () => {
  try {
    const allKeys = getAllCacheKeys();
    let totalBatches = 0;
    let totalStudents = 0;
    const branchStats = {};
    
    for (const key of allKeys) {
      const [, branchId, semester] = key.split('_');
      const batches = getCachedBatches(branchId, semester);
      totalBatches += batches.length;
      
      batches.forEach(batch => {
        totalStudents += batch.studentCount || 0;
        
        if (!branchStats[batch.branchId]) {
          branchStats[batch.branchId] = 0;
        }
        branchStats[batch.branchId]++;
      });
    }
    
    return {
      totalBatches,
      totalStudents,
      branchStats
    };
  } catch (error) {
    console.error('Error getting batch statistics:', error);
    return {
      totalBatches: 0,
      totalStudents: 0,
      branchStats: {}
    };
  }
};

/**
 * Set up real-time listener for batches (Firestore)
 * @param {string} branchId - Branch identifier
 * @param {string} semester - Semester name
 * @param {function} callback - Callback function to handle updates
 * @returns {function} Unsubscribe function
 */
export const subscribeToBatches = (branchId, semester, callback) => {
  try {
    const q = getBatchesQuery(branchId, semester);
    
    return onSnapshot(q, (querySnapshot) => {
      const batches = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        batches.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        });
      });
      
      // Update cache with real-time data
      setCachedBatches(branchId, semester, batches);
      
      // Call the callback with updated data
      callback(batches);
    }, (error) => {
      console.error('Error in real-time listener:', error);
      // Fallback to cached data if real-time fails
      callback(getCachedBatches(branchId, semester));
    });
  } catch (error) {
    console.error('Error setting up real-time listener:', error);
    // Return cached data immediately if listener setup fails
    callback(getCachedBatches(branchId, semester));
    return () => {}; // Return empty unsubscribe function
  }
};

/**
 * Force sync all cached data with Firestore
 * @returns {Promise<boolean>} Success status
 */
export const syncAllBatches = async () => {
  try {
    const allKeys = getAllCacheKeys();
    const syncPromises = [];
    
    for (const key of allKeys) {
      const [, branchId, semester] = key.split('_');
      syncPromises.push(syncWithFirestore(branchId, semester));
    }
    
    await Promise.all(syncPromises);
    return true;
  } catch (error) {
    console.error('Error syncing all batches:', error);
    return false;
  }
};
