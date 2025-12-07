// Business logic for TTInchargeDashboard component

/**
 * Get the initial state for the timetable status
 * @returns {string} Initial timetable status
 */
export const getInitialTimetableStatus = () => {
  return 'Draft'; // Default is draft
};

/**
 * Get the initial number of conflicts
 * @returns {number} Initial number of conflicts
 */
export const getInitialConflicts = () => {
  return 3; // Default number of conflicts
};

/**
 * Calculate semester progress based on start, end, and current dates
 * @returns {Object} Progress information including percentage and week counts
 */
export const calculateSemesterProgress = () => {
  const startDate = new Date('2025-01-15');
  const endDate = new Date('2025-05-15');
  const currentDate = new Date(); // Use current date
  
  const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
  const progressPercentage = Math.min(100, Math.round((daysElapsed / totalDays) * 100));
  
  return {
    progressPercentage,
    daysElapsed,
    totalDays,
    currentWeek: Math.ceil(daysElapsed / 7),
    totalWeeks: Math.ceil(totalDays / 7)
  };
};

/**
 * Get navigation paths for TTIncharge routes
 * @returns {Object} Object containing navigation paths
 */
export const getNavigationPaths = () => {
  return {
    builder: '/tt/timetable-builder',
    conflicts: '/tt/conflicts',
    rooms: '/tt/rooms',
    facultyTimetable: '/tt/faculty-timetable',
    batchManagement: '/tt/batch-management'
  };
};

/**
 * Update timetable status to published
 * @param {function} setTimetableStatus - State setter function for timetable status
 */
export const publishTimetable = (setTimetableStatus) => {
  setTimetableStatus('Published');
};

/**
 * Get card hover animation properties for framer-motion
 * @returns {Object} Animation variants object
 */
export const getCardHoverAnimation = () => {
  return {
    rest: { scale: 1, boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)' },
    hover: { scale: 1.03, boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.15)' }
  };
};

/**
 * Get recent updates for dashboard
 * @returns {Array} Array of recent update objects
 */
export const getRecentUpdates = () => {
  return [
    {
      id: 1,
      text: 'Room B201 scheduling conflict resolved',
      time: '30 minutes ago',
      color: 'bg-indigo-500'
    },
    {
      id: 2,
      text: 'Faculty workload balancing completed',
      time: '2 hours ago',
      color: 'bg-green-500'
    },
    {
      id: 3,
      text: 'New course CS480 added to timetable',
      time: 'Yesterday',
      color: 'bg-amber-500'
    }
  ];
};