// SuperAdminDashboard.js - Converted to use Firebase

// Import Firebase configuration
import { 
  db, 
  collection, 
  getDocs, 
  query,
  where, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp
} from '../../../firebase/config.js';
import { getActiveSemester } from '../../../services/SemesterService.js';

// Collection names
const DEPARTMENTS_COLLECTION = 'departments';
const TEACHERS_COLLECTION = 'teachers';
const ROOMS_COLLECTION = 'rooms';
const SETTINGS_COLLECTION = 'settings';
const USERS_COLLECTION = 'profiles'; // Using profiles for users
const CONFLICTS_COLLECTION = 'conflicts';
const SEMESTERS_COLLECTION = 'semesters';

/**
 * Get dashboard metrics for SuperAdmin dashboard
 * @returns {Object} Dashboard metrics
 */
export const getDashboardMetrics = () => {
  // This is a synchronous wrapper around the async fetchDashboardStats
  // We'll return mock data initially that will be updated when the real data loads
  return {
    totalUsers: 85,
    totalDepartments: 5,
    activeSemesters: 2,
    conflictsToday: 3
  };
};

/**
 * Fetch dashboard statistics from Firebase
 * @returns {Promise} Object containing dashboard statistics
 */
export const fetchDashboardStats = async () => {
  try {
    // Fetch departments count
    const departmentsRef = collection(db, DEPARTMENTS_COLLECTION);
    const departmentsSnap = await getDocs(departmentsRef);
    const departmentsCount = departmentsSnap.size;
    
    // Fetch teachers count
    const teachersRef = collection(db, TEACHERS_COLLECTION);
    const teachersSnap = await getDocs(teachersRef);
    const teachersCount = teachersSnap.size;
    
    // Fetch rooms count
    const roomsRef = collection(db, ROOMS_COLLECTION);
    const roomsSnap = await getDocs(roomsRef);
    const roomsCount = roomsSnap.size;
    
    // Fetch users count
    const usersRef = collection(db, USERS_COLLECTION);
    const usersSnap = await getDocs(usersRef);
    const usersCount = usersSnap.size;
    
    // Get active semesters from semesters collection (new approach using centralized service)
    const semestersRef = collection(db, SEMESTERS_COLLECTION);
    const semestersQuery = query(semestersRef, where('status', '==', 'active'));
    const semestersSnap = await getDocs(semestersQuery);
    const activeSemesterCount = semestersSnap.size;
    
    // Get active semester information
    let currentSemesterInfo = null;
    try {
      currentSemesterInfo = await getActiveSemester();
    } catch (error) {
      console.error('Error fetching active semester:', error);
    }
    
    // Get today's conflicts count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayString = today.toISOString().split('T')[0];
    const tomorrowString = tomorrow.toISOString().split('T')[0];
    
    const conflictsRef = collection(db, CONFLICTS_COLLECTION);
    const conflictsQuery = query(
      conflictsRef, 
      where('createdAt', '>=', todayString),
      where('createdAt', '<', tomorrowString)
    );
    
    const conflictsSnap = await getDocs(conflictsQuery);
    const conflictsCount = conflictsSnap.size;
    
    return {
      totalDepartments: departmentsCount,
      totalTeachers: teachersCount,
      totalRooms: roomsCount,
      totalUsers: usersCount,
      activeSemesters: activeSemesterCount,
      currentSemester: currentSemesterInfo ? currentSemesterInfo.name : 'No active semester',
      conflictsToday: conflictsCount
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return default metrics if there's an error
    return getDashboardMetrics();
  }
};

/**
 * Get recent activities for the admin dashboard
 * @param {number} limit Number of activities to return
 * @returns {Promise<Array>} Array of activity items
 */
export const getRecentActivities = async (limitCount = 5) => {
  try {
    // Fetch from activity logs collection
    const activitiesRef = collection(db, 'activityLogs');
    const activitiesQuery = query(
      activitiesRef,
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(activitiesQuery);
    
    if (snapshot.empty) {
      // Return mock data if no activities found
      return getMockActivities();
    }
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      const timestamp = data.timestamp?.toDate() || new Date();
      
      return {
        id: doc.id,
        type: data.type || 'general',
        description: data.description || 'System activity',
        user: data.user || 'System',
        timestamp,
        timeAgo: getTimeAgo(timestamp)
      };
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return getMockActivities();
  }
};

/**
 * Get mock activities for fallback
 * @returns {Array} Array of mock activity items
 */
const getMockActivities = () => {
  return [];
};

/**
 * Convert timestamp to human-readable time ago string
 * @param {Date} timestamp The timestamp to convert
 * @returns {string} Human readable time ago string
 */
const getTimeAgo = (timestamp) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
};

/**
 * Simple function for returning mock recent activity
 * @returns {Array} Array of activity items
 */
export const getRecentActivity = () => {
  return [
    { id: 1, user: 'John', action: 'Created new course CS301', time: '5m ago' },
    { id: 2, user: 'Sarah', action: 'Updated faculty schedule', time: '15m ago' },
    { id: 3, user: 'Mike', action: 'Assigned room B201 for CS101', time: '1h ago' },
    { id: 4, user: 'Jessica', action: 'Generated timetable report', time: '2h ago' }
  ];
};

/**
 * Simple function for returning mock semester progress
 * @returns {Array} Array of semester progress items
 */
export const getSemesterProgress = () => {
  return [
    { 
      id: 1, 
      name: 'Fall 2025', 
      progress: 75, 
      startDate: 'Aug 15, 2025', 
      endDate: 'Dec 15, 2025' 
    },
    { 
      id: 2, 
      name: 'Spring 2026', 
      progress: 10, 
      startDate: 'Jan 10, 2026', 
      endDate: 'May 15, 2026' 
    }
  ];
};

/**
 * Function to add a new user 
 * @returns {Promise<boolean>} Success state
 */
export const addNewUser = async () => {
  try {
    // Redirect to user management page
    window.location.href = '/superadmin/user-management';
    return true;
  } catch (error) {
    console.error('Error navigating to user management:', error);
    return false;
  }
};

/**
 * Generate a report with dashboard statistics
 * @returns {Promise<boolean>} Success state
 */
export const generateReport = async () => {
  try {
    alert('Report generation feature will be implemented soon.');
    
    // Log the report generation attempt
    const logsRef = collection(db, 'activityLogs');
    await addDoc(logsRef, {
      type: 'report',
      action: 'generate',
      user: 'SuperAdmin',
      timestamp: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error generating report:', error);
    return false;
  }
};

/**
 * Navigate to semester management
 * @returns {Promise<boolean>} Success state
 */
export const manageSemester = async () => {
  try {
    // Redirect to semester settings page
    window.location.href = '/superadmin/settings-semester';
    return true;
  } catch (error) {
    console.error('Error navigating to semester management:', error);
    return false;
  }
};

/**
 * Get department distribution data for charts
 * @returns {Promise<Array>} Department distribution data
 */
export const getDepartmentDistribution = async () => {
  try {
    // In a real implementation, this would fetch data from Firebase
    return [
      { name: 'Computer Science', count: 28 },
      { name: 'Mechanical Engineering', count: 23 },
      { name: 'Electrical Engineering', count: 19 },
      { name: 'Civil Engineering', count: 15 }
    ];
  } catch (error) {
    console.error('Error fetching department distribution:', error);
    return [];
  }
};

/**
 * Get room utilization data for charts
 * @returns {Promise<Array>} Room utilization data
 */
export const getRoomUtilization = async () => {
  try {
    // In a real implementation, this would fetch data from Firebase
    return [
      { name: 'A-Block', utilization: 85 },
      { name: 'B-Block', utilization: 72 },
      { name: 'C-Block', utilization: 63 },
      { name: 'D-Block', utilization: 45 }
    ];
  } catch (error) {
    console.error('Error fetching room utilization:', error);
    return [];
  }
};

/**
 * Log a new activity to Firebase (SuperAdmin version)
 * @param {string} contextId - Context ID (department ID or 'SUPERADMIN')
 * @param {string} type - Activity type
 * @param {string} description - Activity description
 * @returns {Promise<string>} ID of the created activity log
 */
export const logActivity = async (contextId, type, description) => {
  try {
    const activityRef = collection(db, 'activityLogs');
    const docRef = await addDoc(activityRef, {
      context: contextId, // Can be department ID or 'SUPERADMIN'
      type: type,
      description: description,
      timestamp: serverTimestamp(),
      userRole: 'superadmin'
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error logging SuperAdmin activity:', error);
    throw error;
  }
};

// Export all functions for use in components
export default {
  getDashboardMetrics,
  fetchDashboardStats,
  getRecentActivities,
  getRecentActivity,
  getSemesterProgress,
  addNewUser,
  generateReport,
  manageSemester,
  getDepartmentDistribution,
  getRoomUtilization,
  logActivity
};