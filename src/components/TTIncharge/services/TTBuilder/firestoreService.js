/**
 * Firebase/Firestore Service Operations
 * Handles all database operations for timetable data
 */

import { initializeEmptyTimetable } from './timetableOperations.js';
import { replaceUndefinedWithNull } from './utils.js';

/**
 * Fetch teachers from Firestore and build a mapping with names and codes
 * @param {Object} db - Firestore database instance
 * @param {Function} collection - Firestore collection function
 * @param {Function} getDocs - Firestore getDocs function
 * @returns {Promise<Object>} Map of teacher IDs to teacher info (name, teacherCode)
 */
export const fetchTeachersMap = async (db, collection, getDocs) => {
  try {
    const snap = await getDocs(collection(db, 'teachers'));
    const map = {};
    snap.docs.forEach(doc => {
      const data = doc.data();
      const teacherId = data.id || doc.id;
      map[teacherId] = {
        name: data.name,
        teacherCode: data.teacherCode || data.name // Fallback to name if teacherCode is not available
      };
    });
    return map;
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return {};
  }
};

/**
 * Fetch courses from Firestore for a specific semester with common course support
 * @param {Object} db - Firestore database instance
 * @param {Function} collection - Firestore collection function
 * @param {Function} getDocs - Firestore getDocs function
 * @param {Function} query - Firestore query function
 * @param {Function} where - Firestore where function
 * @param {string} semester - Current semester
 * @param {string} departmentId - Department ID for filtering (optional)
 * @returns {Promise<Array>} Array of course data
 */
export const fetchCourses = async (db, collection, getDocs, query, where, semester, departmentId = null) => {
  try {
    if (!semester) return [];
    
    const coursesRef = collection(db, 'courses');
    const queries = [];
    
    if (departmentId) {
      // Query 1: Department-specific courses for the semester
      queries.push(getDocs(query(coursesRef, 
        where('semester', '==', semester),
        where('department', '==', departmentId)
      )));
      
      // Query 2: Common courses marked by SuperAdmin for the semester
      queries.push(getDocs(query(coursesRef,
        where('semester', '==', semester),
        where('isCommonCourse', '==', true)
      )));
      
      // Query 3: Legacy common courses for backward compatibility
      queries.push(getDocs(query(coursesRef,
        where('semester', '==', semester),
        where('department', '==', 'common')
      )));
    } else {
      // Fallback: Get all courses for the semester
      queries.push(getDocs(query(coursesRef, where('semester', '==', semester))));
    }
    
    const snapshots = await Promise.all(queries);
    
    // Combine and deduplicate courses
    const allCourses = new Map();
    
    snapshots.forEach(snapshot => {
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const courseId = doc.id;
        
        if (!allCourses.has(courseId)) {
          const isOwnedCourse = departmentId ? data.department === departmentId : true;
          const isCommonCourse = data.isCommonCourse === true || 
                                data.department === 'common' || 
                                data.department === 'Common' || 
                                data.department === 'COMMON';
          
          allCourses.set(courseId, {
            id: courseId,
            ...data,
            isOwnedCourse,
            isCommonCourse,
            canEdit: isOwnedCourse
          });
        }
      });
    });
    
    return Array.from(allCourses.values());
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
};

/**
 * Fetch rooms from Firestore
 * @param {Object} db - Firestore database instance
 * @param {Function} collection - Firestore collection function
 * @param {Function} getDocs - Firestore getDocs function
 * @returns {Promise<Array>} Array of room data
 */
export const fetchRooms = async (db, collection, getDocs) => {
  try {
    const snap = await getDocs(collection(db, 'rooms'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return [];
  }
};

/**
 * Set up real-time listener for timetable data
 * @param {Object} params - Parameters object
 * @param {Object} params.db - Firestore database instance
 * @param {Function} params.doc - Firestore doc function
 * @param {Function} params.onSnapshot - Firestore onSnapshot function
 * @param {string} params.currentSemester - Current semester
 * @param {string} params.selectedBranch - Selected branch
 * @param {string} params.selectedBatch - Selected batch
 * @param {string} params.selectedType - Selected type
 * @param {Function} params.callback - Callback function for data updates
 * @returns {Function} Unsubscribe function
 */
export const setupTimetableListener = ({
  db, doc, onSnapshot,
  currentSemester, selectedBranch, selectedBatch, selectedType,
  callback
}) => {
  if (!currentSemester || !selectedBranch || !selectedBatch || !selectedType) {
    return () => {}; // Return empty unsubscribe function
  }
  
  // Create document ID in the same format as saving
  const timetableDocId = `${currentSemester}-${selectedBranch}-${selectedBatch}-${selectedType}`;
  const timetableDocRef = doc(db, 'timetables', timetableDocId);
  
  console.log('Setting up listener for document:', timetableDocId);
  
  return onSnapshot(timetableDocRef, (docSnapshot) => {
    console.log('Document snapshot received:', {
      exists: docSnapshot.exists(),
      id: docSnapshot.id,
      data: docSnapshot.exists() ? docSnapshot.data() : null
    });
    
    if (docSnapshot.exists()) {
      const docData = docSnapshot.data();
      const scheduleData = docData.schedule || initializeEmptyTimetable();
      console.log('Loading existing timetable data:', scheduleData);
      callback(scheduleData);
    } else {
      // Document doesn't exist, initialize with empty timetable
      console.log('Document does not exist, initializing empty timetable');
      callback(initializeEmptyTimetable());
    }
  }, (error) => {
    console.error('Error listening to timetable document:', error);
    callback(initializeEmptyTimetable());
  });
};

/**
 * Save timetable data to Firestore
 * @param {Object} params - Parameters object
 * @param {Object} params.db - Firestore database instance
 * @param {Function} params.doc - Firestore doc function
 * @param {Function} params.setDoc - Firestore setDoc function
 * @param {string} params.currentSemester - Current semester
 * @param {string} params.selectedBranch - Selected branch
 * @param {string} params.selectedBatch - Selected batch
 * @param {string} params.selectedType - Selected type
 * @param {Object} params.scheduleData - Timetable schedule data
 * @returns {Promise<void>}
 */
export const saveTimetableToFirestore = async ({
  db, doc, setDoc,
  currentSemester, selectedBranch, selectedBatch, selectedType,
  scheduleData
}) => {
  if (!currentSemester || !selectedBranch || !selectedBatch || !selectedType || !scheduleData) {
    return;
  }
  
  const timetableDocId = `${currentSemester}-${selectedBranch}-${selectedBatch}-${selectedType}`;
  const safeSchedule = replaceUndefinedWithNull(scheduleData);
  
  console.log('Saving timetable to document:', timetableDocId);
  console.log('Schedule data:', safeSchedule);
  
  try {
    await setDoc(doc(db, 'timetables', timetableDocId), {
      semester: currentSemester,
      branch: selectedBranch,
      batch: selectedBatch,
      type: selectedType,
      schedule: safeSchedule
    }, { merge: true });
    console.log('Timetable saved successfully to:', timetableDocId);
  } catch (error) {
    console.error('Error saving timetable to Firestore:', error);
  }
};

/**
 * Publish timetable
 * @param {Object} params - Parameters for publishing
 * @returns {Promise<void>}
 */
export const publishTimetable = async (params) => {
  // Implementation for publishing timetable
  try {
    await saveTimetableToFirestore({
      ...params,
      published: true,
      publishedAt: new Date().toISOString()
    });
    console.log('Timetable published successfully');
  } catch (error) {
    console.error('Error publishing timetable:', error);
    throw error;
  }
};

// Alias for backward compatibility
export const saveTimetable = saveTimetableToFirestore;
