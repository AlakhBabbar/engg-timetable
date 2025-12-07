import { FiGrid, FiBook, FiUsers, FiFileText, FiCalendar } from 'react-icons/fi';
import { 
  db, 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  addDoc, 
  query,
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp
} from '../../../firebase/config.js';

/**
 * Returns the sidebar navigation items for HOD dashboard
 * @returns {Array} Array of sidebar items with label, icon and path
 */
export const getSidebarItems = () => {
  return [
    { label: 'Dashboard', icon: FiGrid, iconSize: 18, path: '/hod/dashboard' },
    { label: 'Courses', icon: FiBook, iconSize: 18, path: '/hod/courses' },
    { label: 'Faculty', icon: FiUsers, iconSize: 18, path: '/hod/assign-faculty' },
    { label: 'Reports', icon: FiFileText, iconSize: 18, path: '/hod/reports' },
    { label: 'Timetable', icon: FiCalendar, iconSize: 18, path: '/hod/timetable' },
  ];
};

/**
 * Returns the metrics data for the dashboard from Firebase
 * @param {string} departmentId - The department ID
 * @returns {Promise<Object>} Object containing faculty, courses and timetable metrics
 */
export const getDashboardMetrics = async (departmentId) => {
  try {
    // Get faculty count
    const facultyRef = collection(db, 'faculty');
    const facultyQuery = query(facultyRef, where('department', '==', departmentId));
    const facultySnapshot = await getDocs(facultyQuery);
    const totalFaculty = facultySnapshot.size;
    
    // Get new faculty joined in the past week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const newFacultyQuery = query(
      facultyRef, 
      where('department', '==', departmentId),
      where('joinedAt', '>=', oneWeekAgo)
    );
    const newFacultySnapshot = await getDocs(newFacultyQuery);
    const newThisWeek = newFacultySnapshot.size;
    
    // Get courses count
    const coursesRef = collection(db, 'courses');
    const coursesQuery = query(coursesRef, where('department', '==', departmentId));
    const coursesSnapshot = await getDocs(coursesQuery);
    const totalCourses = coursesSnapshot.size;
    
    // Get pending approval courses
    const pendingCoursesQuery = query(
      coursesRef,
      where('department', '==', departmentId),
      where('status', '==', 'pending')
    );
    const pendingCoursesSnapshot = await getDocs(pendingCoursesQuery);
    const pendingApproval = pendingCoursesSnapshot.size;
    
    // Get timetable status
    const timetableRef = collection(db, 'timetables');
    const timetableQuery = query(
      timetableRef,
      where('department', '==', departmentId),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );
    const timetableSnapshot = await getDocs(timetableQuery);
    
    let timetableStatus = {
      status: 'Not Started',
      completionPercentage: 0
    };
    
    if (!timetableSnapshot.empty) {
      const timetableData = timetableSnapshot.docs[0].data();
      timetableStatus = {
        status: timetableData.status || 'In Progress',
        completionPercentage: timetableData.completionPercentage || 0
      };
    }
    
    return {
      faculty: {
        total: totalFaculty,
        newThisWeek: newThisWeek,
      },
      courses: {
        total: totalCourses,
        pendingApproval: pendingApproval,
      },
      timetable: timetableStatus,
    };
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    
    // Return default data if there's an error
    return {
      faculty: {
        total: 0,
        newThisWeek: 0,
      },
      courses: {
        total: 0,
        pendingApproval: 0,
      },
      timetable: {
        status: 'Error',
        completionPercentage: 0,
      },
    };
  }
};

/**
 * Returns recent activity data for the dashboard from Firebase
 * @param {string} departmentId - The department ID
 * @returns {Promise<Array>} Array of recent activities with type, description and time
 */
export const getRecentActivities = async (departmentId) => {
  try {
    // Get activities from activity log collection
    const activityRef = collection(db, 'activityLogs');
    const activityQuery = query(
      activityRef,
      where('department', '==', departmentId),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    
    const activitySnapshot = await getDocs(activityQuery);
    
    if (activitySnapshot.empty) {
      return getDefaultActivities(); // Return default activities if none found
    }
    
    return activitySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Calculate time ago
      const timestamp = data.timestamp?.toDate() || new Date();
      const timeAgo = getTimeAgo(timestamp);
      
      return {
        id: doc.id,
        type: data.type || 'general',
        description: data.description,
        timeAgo: timeAgo,
        colorClass: getColorClass(data.type),
      };
    });
  } catch (error) {
    console.error('Error getting recent activities:', error);
    return getDefaultActivities(); // Return default activities if there's an error
  }
};

/**
 * Returns default activities for fallback
 * @returns {Array} Array of default activities
 */
const getDefaultActivities = () => {
  return [
    {
      type: 'faculty',
      description: 'Dr. Alex Johnson assigned to CS301',
      timeAgo: '2 hours ago',
      colorClass: 'bg-teal-500',
    },
    {
      type: 'course',
      description: 'New course CS405 added',
      timeAgo: 'Yesterday',
      colorClass: 'bg-blue-500',
    },
    {
      type: 'timetable',
      description: 'Timetable draft updated',
      timeAgo: '2 days ago',
      colorClass: 'bg-indigo-500',
    },
  ];
};

/**
 * Calculate time ago from timestamp
 * @param {Date} timestamp - The timestamp to calculate from
 * @returns {string} Human-readable time ago
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
 * Get appropriate color class based on activity type
 * @param {string} type - The activity type
 * @returns {string} CSS class for the activity type
 */
const getColorClass = (type) => {
  switch (type) {
    case 'faculty':
      return 'bg-teal-500';
    case 'course':
      return 'bg-blue-500';
    case 'timetable':
      return 'bg-indigo-500';
    case 'assignment':
      return 'bg-amber-500';
    case 'report':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
};

/**
 * Log a new activity to Firebase
 * @param {string} departmentId - Department ID
 * @param {string} type - Activity type
 * @param {string} description - Activity description
 * @returns {Promise<string>} ID of the created activity log
 */
export const logActivity = async (departmentId, type, description) => {
  try {
    const activityRef = collection(db, 'activityLogs');
    const docRef = await addDoc(activityRef, {
      department: departmentId,
      type: type,
      description: description,
      timestamp: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time activity updates
 * @param {string} departmentId - Department ID
 * @param {Function} callback - Function to call with updated data
 * @returns {Function} Unsubscribe function
 */
export const subscribeToActivities = (departmentId, callback) => {
  const activityRef = collection(db, 'activityLogs');
  const q = query(
    activityRef,
    where('department', '==', departmentId),
    orderBy('timestamp', 'desc'),
    limit(10)
  );
  
  return onSnapshot(q, (snapshot) => {
    const activities = snapshot.docs.map(doc => {
      const data = doc.data();
      const timestamp = data.timestamp?.toDate() || new Date();
      const timeAgo = getTimeAgo(timestamp);
      
      return {
        id: doc.id,
        type: data.type || 'general',
        description: data.description,
        timeAgo: timeAgo,
        colorClass: getColorClass(data.type),
      };
    });
    
    callback(activities);
  });
};

/**
 * Navigation handler for sidebar items
 * @param {Object} navigate - React Router useNavigate hook
 * @param {string} path - Path to navigate to
 * @param {string} label - Label of the sidebar item
 * @param {Function} setActiveSidebarItem - State setter for active sidebar item
 */
export const handleSidebarNavigation = (navigate, path, label, setActiveSidebarItem) => {
  setActiveSidebarItem(label);
  navigate(path);
};