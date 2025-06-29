// Import Firebase configuration
import { 
  db, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from '../firebase/config.js';

// Collection references
const SEMESTERS_COLLECTION = 'semesters';
const SETTINGS_COLLECTION = 'settings';

/**
 * Global service to fetch and manage semester data across the application
 */

/**
 * Determine the current academic year based on date
 * Academic year starts in July and ends in June of next year
 * @param {Date} date - Date to check (defaults to current date)
 * @returns {string} Academic year in format "2024-25"
 */
export const getCurrentAcademicYear = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based (0 = January, 11 = December)
  
  // If month is July (6) or later, academic year starts this year
  if (month >= 6) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    // If month is before July, academic year started last year
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
};

/**
 * Determine if current date is in odd or even semester period
 * Odd semesters (1,3,5,7): July to December
 * Even semesters (2,4,6,8): January to June
 * @param {Date} date - Date to check (defaults to current date)
 * @returns {string} 'odd' or 'even'
 */
export const getCurrentSemesterPeriod = (date = new Date()) => {
  const month = date.getMonth(); // 0-based (0 = January, 11 = December)
  
  // July (6) to December (11) is odd semester period
  if (month >= 6 && month <= 11) {
    return 'odd';
  } 
  // January (0) to June (5) is even semester period
  else {
    return 'even';
  }
};

/**
 * Get the list of semester numbers for the current period
 * @param {string} period - 'odd' or 'even'
 * @returns {Array} Array of semester numbers
 */
export const getSemesterNumbersForPeriod = (period) => {
  if (period === 'odd') {
    return [1, 3, 5, 7];
  } else {
    return [2, 4, 6, 8];
  }
};

/**
 * Get all semester numbers (1-8) for a complete academic program
 * @returns {Array} Array of all semester numbers
 */
export const getAllSemesterNumbers = () => {
  return [1, 2, 3, 4, 5, 6, 7, 8];
};

/**
 * Get the appropriate semester numbers based on current date
 * @returns {Array} Array of semester numbers
 */
export const getCurrentSemesterNumbers = () => {
  const period = getCurrentSemesterPeriod();
  return getSemesterNumbersForPeriod(period);
};

/**
 * Get the active semester from Firebase
 * @returns {Promise<Object|null>} Active semester or null
 */
export const getActiveSemester = async () => {
  try {
    // First try to get from active status
    const semestersRef = collection(db, SEMESTERS_COLLECTION);
    const activeSemesterQuery = query(semestersRef, where('status', '==', 'active'));
    const activeSemesterSnapshot = await getDocs(activeSemesterQuery);
    
    if (!activeSemesterSnapshot.empty) {
      const doc = activeSemesterSnapshot.docs[0];
      return {
        id: doc.id,
        name: doc.data().name,
        status: 'active'
      };
    }
    
    // If no active semester found, get the most recent one
    const semestersQuery = query(semestersRef, orderBy('createdAt', 'desc'), limit(1));
    const semestersSnapshot = await getDocs(semestersQuery);
    
    if (!semestersSnapshot.empty) {
      const doc = semestersSnapshot.docs[0];
      return {
        id: doc.id,
        name: doc.data().name,
        status: doc.data().status || 'inactive'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching active semester:', error);
    return null;
  }
};

/**
 * Get all semesters from Firebase
 * @returns {Promise<Array>} Array of semester objects
 */
export const getAllSemesters = async () => {
  try {
    const semestersRef = collection(db, SEMESTERS_COLLECTION);
    const semestersQuery = query(semestersRef, orderBy('createdAt', 'desc'));
    const semesterSnapshot = await getDocs(semestersQuery);
    
    if (semesterSnapshot.empty) {
      return [];
    }
    
    return semesterSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      status: doc.data().status || 'inactive'
    }));
  } catch (error) {
    console.error('Error fetching all semesters:', error);
    return [];
  }
};

/**
 * Get default semesters when no semesters are available in the database
 * @param {boolean} includeAll - Whether to include all semesters or just current period
 * @returns {Array} Default semesters array
 */
export const getDefaultSemesters = (includeAll = false) => {
  if (includeAll) {
    // Return all 8 semesters
    const allNumbers = getAllSemesterNumbers();
    return allNumbers.map(num => `Semester ${num}`);
  }
  
  // Return semesters for current period only
  const currentPeriod = getCurrentSemesterPeriod();
  const semesterNumbers = getSemesterNumbersForPeriod(currentPeriod);
  
  return semesterNumbers.map(num => `Semester ${num}`);
};

/**
 * Generate semester options in standard format
 * @param {boolean} includeAll - Whether to include all semesters or just current period
 * @returns {Array} Array of semester options
 */
export const generateSemesterOptions = (includeAll = false) => {
  const semesterNumbers = includeAll ? getAllSemesterNumbers() : getCurrentSemesterNumbers();
  return semesterNumbers.map(num => `Semester ${num}`);
};

/**
 * Parse semester string to extract number (only accepts standard format)
 * @param {string} semesterString - Semester string to parse
 * @returns {Object} Parsed semester info { number, isValid, type }
 */
export const parseSemesterString = (semesterString) => {
  if (!semesterString) {
    return { number: null, isValid: false };
  }
  
  // Only accept "Semester X" format where X is 1-8
  const match = semesterString.match(/^Semester\s+([1-8])$/);
  
  if (match) {
    const number = parseInt(match[1]);
    return {
      number,
      isValid: true,
      type: (number % 2 === 1) ? 'odd' : 'even'
    };
  }
  
  return { number: null, isValid: false };
};

/**
 * Format semester name to standard format
 * @param {string} semesterString - Input semester string
 * @returns {string} Formatted semester name (always "Semester X" format)
 */
export const formatSemesterName = (semesterString) => {
  const parsed = parseSemesterString(semesterString);
  
  if (parsed.isValid) {
    return `Semester ${parsed.number}`;
  }
  
  // Try to extract number from non-standard formats for backward compatibility
  const numberMatch = semesterString.match(/(\d+)/);
  if (numberMatch) {
    const number = parseInt(numberMatch[1]);
    if (number >= 1 && number <= 8) {
      return `Semester ${number}`;
    }
  }
  
  // If can't parse, return original but warn about invalid format
  console.warn(`Invalid semester format: "${semesterString}". Expected format: "Semester X" where X is 1-8`);
  return semesterString;
};

/**
 * Store selected semester in local storage
 * @param {string} semesterName - Name of the semester to store
 */
export const storeSelectedSemester = (semesterName) => {
  try {
    localStorage.setItem('selectedSemester', semesterName);
  } catch (error) {
    console.error('Error storing selected semester:', error);
  }
};

/**
 * Get selected semester from local storage
 * @returns {string|null} Selected semester name or null
 */
export const getSelectedSemesterFromStorage = () => {
  try {
    return localStorage.getItem('selectedSemester');
  } catch (error) {
    console.error('Error getting selected semester from storage:', error);
    return null;
  }
};