import { getColleges, getCollegeById, getCollegesByType } from '../components/SuperAdmin/services/CollegeManagement';

/**
 * Shared College Service
 * This service provides college data to all components across the project
 */

// Cache for college data to avoid repeated API calls
let collegeCache = null;
let lastFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all colleges with caching
 * @returns {Promise<Array>} Array of college objects
 */
export const getAllColleges = async () => {
  const now = Date.now();
  
  // Return cached data if it's still fresh
  if (collegeCache && lastFetchTime && (now - lastFetchTime) < CACHE_DURATION) {
    return collegeCache;
  }
  
  try {
    const colleges = await getColleges();
    collegeCache = colleges;
    lastFetchTime = now;
    return colleges;
  } catch (error) {
    console.error('Error fetching colleges in shared service:', error);
    return []; // Return empty array instead of cached data
  }
};

/**
 * Get college names for dropdowns
 * @returns {Promise<Array>} Array of {id, name, code} objects
 */
export const getCollegeOptions = async () => {
  try {
    const colleges = await getAllColleges();
    return colleges.map(college => ({
      id: college.id,
      name: college.name,
      code: college.code,
      type: college.type
    }));
  } catch (error) {
    console.error('Error getting college options:', error);
    return [];
  }
};

/**
 * Get active colleges only
 * @returns {Promise<Array>} Array of active college objects
 */
export const getActiveColleges = async () => {
  try {
    const colleges = await getAllColleges();
    return colleges.filter(college => college.status === 'Active');
  } catch (error) {
    console.error('Error getting active colleges:', error);
    return [];
  }
};

/**
 * Get colleges by specific type
 * @param {string} type - College type ('Faculty', 'College', 'School', etc.)
 * @returns {Promise<Array>} Filtered colleges
 */
export const getCollegesByTypeShared = async (type) => {
  try {
    return await getCollegesByType(type);
  } catch (error) {
    console.error('Error getting colleges by type:', error);
    return [];
  }
};

/**
 * Get college by ID
 * @param {string} collegeId - College ID
 * @returns {Promise<Object|null>} College object or null
 */
export const getCollegeByIdShared = async (collegeId) => {
  try {
    return await getCollegeById(collegeId);
  } catch (error) {
    console.error('Error getting college by ID:', error);
    return null;
  }
};

/**
 * Clear college cache (call after adding/updating/deleting colleges)
 */
export const clearCollegeCache = () => {
  collegeCache = null;
  lastFetchTime = null;
};

/**
 * Get faculty color class for UI consistency
 * @param {string} collegeName - College/Faculty name
 * @returns {string} CSS class for color
 */
export const getCollegeColorClass = (collegeName) => {
  const colorMap = {
    'Faculty of Engineering': 'bg-blue-100 text-blue-800',
    'Faculty of Science': 'bg-green-100 text-green-800',
    'Faculty of Social Science': 'bg-orange-100 text-orange-800',
    'Faculty of Arts': 'bg-purple-100 text-purple-800',
    'Faculty of Management': 'bg-yellow-100 text-yellow-800',
    'Faculty of Law': 'bg-indigo-100 text-indigo-800',
    'Faculty of Medicine': 'bg-red-100 text-red-800',
    'Faculty of Education': 'bg-teal-100 text-teal-800',
    'Common Facilities': 'bg-gray-100 text-gray-800',
    'Technical College': 'bg-pink-100 text-pink-800',
    'Faculty of Architecture': 'bg-cyan-100 text-cyan-800',
    'Shatabdi Bhawan': 'bg-lime-100 text-lime-800',
    'School of Education': 'bg-amber-100 text-amber-800',
    'Department of English': 'bg-violet-100 text-violet-800',
    'General': 'bg-slate-100 text-slate-800'
  };
  
  return colorMap[collegeName] || 'bg-gray-100 text-gray-800';
};

/**
 * Get college hierarchy data for dropdowns and displays
 * @returns {Promise<Object>} Organized college hierarchy
 */
export const getCollegeHierarchy = async () => {
  try {
    const colleges = await getAllColleges();
    
    const hierarchy = {
      faculties: [],
      colleges: [],
      schools: [],
      institutes: [],
      departments: []
    };
    
    colleges.forEach(college => {
      switch (college.type) {
        case 'Faculty':
          hierarchy.faculties.push(college);
          break;
        case 'College':
          hierarchy.colleges.push(college);
          break;
        case 'School':
          hierarchy.schools.push(college);
          break;
        case 'Institute':
          hierarchy.institutes.push(college);
          break;
        case 'Department':
          hierarchy.departments.push(college);
          break;
        default:
          hierarchy.departments.push(college);
      }
    });
    
    return hierarchy;
  } catch (error) {
    console.error('Error getting college hierarchy:', error);
    return {
      faculties: [],
      colleges: [],
      schools: [],
      institutes: [],
      departments: []
    };
  }
};

export default {
  getAllColleges,
  getCollegeOptions,
  getActiveColleges,
  getCollegesByTypeShared,
  getCollegeByIdShared,
  clearCollegeCache,
  getCollegeColorClass,
  getCollegeHierarchy
};
