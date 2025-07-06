/**
 * Utility Functions
 * Common utility functions used across the timetable builder
 */

import { colorClassMap, dayAbbreviations, timeSlots } from './constants.js';

/**
 * Deep copy utility function
 * @param {*} obj - Object to deep copy
 * @returns {*} Deep copied object
 */
export const deepCopy = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepCopy(item));
  if (typeof obj === 'object') {
    const copy = {};
    Object.keys(obj).forEach(key => {
      copy[key] = deepCopy(obj[key]);
    });
    return copy;
  }
};

/**
 * Utility to deeply replace undefined with null in an object
 * @param {*} obj - Object to process
 * @returns {*} Processed object with undefined replaced by null
 */
export const replaceUndefinedWithNull = (obj) => {
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      if (obj[key] === undefined) {
        obj[key] = null;
      } else {
        replaceUndefinedWithNull(obj[key]);
      }
    });
  }
  return obj;
};

/**
 * Get course color class based on course color
 * @param {string} color - Course color
 * @returns {string} CSS class name
 */
export const getCourseColorClass = (color) => {
  return colorClassMap[color] || 'bg-gray-100 border-gray-500 text-gray-800';
};

/**
 * Get compact time format for display
 * @param {string} timeSlot - Time slot (e.g., "7:00-7:55")
 * @returns {string} Compact time format
 */
export const getCompactTimeFormat = (timeSlot) => {
  if (!timeSlot) return '';
  
  const [start] = timeSlot.split('-');
  return start;
};

/**
 * Get abbreviated day name
 * @param {string} day - Full day name
 * @returns {string} Abbreviated day name
 */
export const getAbbreviatedDay = (day) => {
  return dayAbbreviations[day] || day;
};

/**
 * Get cell height based on screen size
 * @param {boolean} isCompact - Whether to use compact mode
 * @returns {string} CSS height class
 */
export const getCellHeight = (isCompact = false) => {
  return isCompact ? 'h-14' : 'h-18'; // Slightly increased to accommodate 3 lines of compact data
};

/**
 * Get responsive classes for timetable layout
 * @param {boolean} isMobile - Whether device is mobile
 * @returns {Object} CSS classes for different parts of the layout
 */
export const getResponsiveClasses = (isMobile = false) => {
  return {
    // Layout widths - significantly reduced course blocks width to maximize timetable space
    courseBlockWidth: isMobile ? 'w-44' : 'w-52', // Further reduced for more timetable space
    roomSelectionWidth: isMobile ? 'w-48' : 'w-64',
    gapSize: isMobile ? 'gap-2' : 'gap-3', // Slightly reduced gap for more space
    
    // Cell styling
    cellClasses: isMobile 
      ? 'text-xs p-1 min-h-8'
      : 'text-sm p-2 min-h-12'
  };
};

/**
 * Get compact course display information
 * @param {Object} course - Course object
 * @param {boolean} isCompact - Whether to use compact mode
 * @returns {Object} Display information
 */
export const getCompactCourseDisplay = (course, isCompact = false) => {
  if (!course) return { title: '', subtitle: '' };
  
  const courseCode = course.code || course.id;
  const courseName = course.title || course.name;
  const facultyInfo = course.teacher || course.faculty || {};
  // Use teacher code if available, fallback to name if no code
  const facultyDisplay = facultyInfo.teacherCode || facultyInfo.name || '';
  const room = course.room || '';
  
  if (isCompact) {
    return {
      title: courseCode,
      subtitle: room ? `Room: ${room}` : facultyDisplay
    };
  }
  
  return {
    title: `${courseCode} - ${courseName}`,
    subtitle: `${facultyDisplay}${room ? ` | Room: ${room}` : ''}`
  };
};

/**
 * Format time for display
 * @param {string} timeSlot - Time slot string
 * @param {string} format - Format type ('12h', '24h', 'compact')
 * @returns {string} Formatted time
 */
export const formatTime = (timeSlot, format = '24h') => {
  if (!timeSlot) return '';
  
  try {
    const [start, end] = timeSlot.split('-');
    
    if (format === 'compact') {
      return start;
    }
    
    if (format === '12h') {
      const formatTo12h = (time) => {
        const [hour, minute] = time.split(':').map(Number);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
      };
      
      return `${formatTo12h(start)} - ${formatTo12h(end)}`;
    }
    
    return timeSlot; // Default 24h format
  } catch (error) {
    console.warn('Error formatting time:', error);
    return timeSlot;
  }
};

/**
 * Calculate duration between time slots
 * @param {string} startSlot - Start time slot
 * @param {string} endSlot - End time slot
 * @returns {number} Duration in minutes
 */
export const calculateDuration = (startSlot, endSlot) => {
  try {
    const parseTime = (timeStr) => {
      const [time] = timeStr.split('-');
      const [hour, minute] = time.split(':').map(Number);
      return hour * 60 + minute;
    };
    
    const startMinutes = parseTime(startSlot);
    const endMinutes = parseTime(endSlot);
    
    return endMinutes - startMinutes;
  } catch (error) {
    console.warn('Error calculating duration:', error);
    return 0;
  }
};

/**
 * Generate unique ID
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
export const generateId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate time format
 * @param {string} time - Time string to validate
 * @returns {boolean} True if valid time format
 */
export const isValidTimeFormat = (time) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Sanitize string for safe display
 * @param {string} str - String to sanitize
 * @param {number} maxLength - Maximum length
 * @returns {string} Sanitized string
 */
export const sanitizeString = (str, maxLength = 100) => {
  if (!str || typeof str !== 'string') return '';
  
  // Remove HTML tags and limit length
  const cleaned = str.replace(/<[^>]*>/g, '').trim();
  return cleaned.length > maxLength ? `${cleaned.substring(0, maxLength)}...` : cleaned;
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Check if object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean} True if empty
 */
export const isEmpty = (obj) => {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  return Object.keys(obj).length === 0;
};

/**
 * Get nested object property safely
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot notation path
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Value at path or default value
 */
export const getNestedValue = (obj, path, defaultValue = null) => {
  try {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Set nested object property safely
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot notation path
 * @param {*} value - Value to set
 * @returns {Object} Modified object
 */
export const setNestedValue = (obj, path, value) => {
  const keys = path.split('.');
  const target = deepCopy(obj);
  let current = target;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return target;
};

/**
 * Compare two objects for equality
 * @param {*} obj1 - First object
 * @param {*} obj2 - Second object
 * @returns {boolean} True if objects are equal
 */
export const isEqual = (obj1, obj2) => {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!isEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
};

/**
 * Convert string to title case
 * @param {string} str - String to convert
 * @returns {string} Title cased string
 */
export const toTitleCase = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

/**
 * Generate color based on string hash
 * @param {string} str - String to hash
 * @returns {string} Hex color code
 */
export const stringToColor = (str) => {
  if (!str) return '#666666';
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const color = Math.abs(hash).toString(16).substring(0, 6);
  return '#' + '000000'.substring(0, 6 - color.length) + color;
};

/**
 * Check if browser supports specific features
 * @param {string} feature - Feature to check
 * @returns {boolean} True if supported
 */
export const isFeatureSupported = (feature) => {
  switch (feature) {
    case 'localStorage':
      try {
        return typeof Storage !== 'undefined' && localStorage !== undefined;
      } catch {
        return false;
      }
    case 'dragAndDrop':
      return 'draggable' in document.createElement('div');
    case 'touch':
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    default:
      return false;
  }
};

/**
 * Get browser information
 * @returns {Object} Browser information
 */
export const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  const browsers = {
    chrome: /chrome/i.test(ua) && !/edge/i.test(ua),
    firefox: /firefox/i.test(ua),
    safari: /safari/i.test(ua) && !/chrome/i.test(ua),
    edge: /edge/i.test(ua),
    ie: /msie|trident/i.test(ua)
  };
  
  const activeBrowser = Object.keys(browsers).find(browser => browsers[browser]) || 'unknown';
  
  return {
    name: activeBrowser,
    userAgent: ua,
    isMobile: /mobile|android|iphone|ipad/i.test(ua),
    isTablet: /tablet|ipad/i.test(ua),
    isDesktop: !/mobile|android|iphone|ipad|tablet/i.test(ua)
  };
};

/**
 * Abbreviate teacher name to a compact format
 * @param {string} teacherName - Full teacher name
 * @param {number} maxLength - Maximum length for the abbreviated name
 * @returns {string} Abbreviated teacher name
 */
export const abbreviateTeacherName = (teacherName, maxLength = 8) => {
  if (!teacherName || teacherName === 'No teacher') return 'No T';
  
  const nameParts = teacherName.trim().split(' ');
  if (nameParts.length === 1) {
    // Single name, truncate if too long
    return nameParts[0].length > maxLength 
      ? nameParts[0].substring(0, maxLength - 1) + '.'
      : nameParts[0];
  }
  
  // Multiple parts: First name + last initial
  const firstName = nameParts[0];
  const lastInitial = nameParts[nameParts.length - 1]?.charAt(0)?.toUpperCase() || '';
  
  const abbreviated = `${firstName} ${lastInitial}.`;
  
  // If still too long, truncate first name
  if (abbreviated.length > maxLength) {
    const truncatedFirst = firstName.substring(0, maxLength - 3);
    return `${truncatedFirst} ${lastInitial}.`;
  }
  
  return abbreviated;
};

/**
 * Abbreviate room name/number to a compact format
 * @param {string} roomName - Room name or number
 * @param {number} maxLength - Maximum length for room abbreviation
 * @returns {string} Abbreviated room name
 */
export const abbreviateRoomName = (roomName, maxLength = 6) => {
  if (!roomName || roomName === 'No room') return 'NR';
  
  // If it's a number-based room (e.g., "Room 101", "Lab-205")
  const numberMatch = roomName.match(/(\d+)/);
  if (numberMatch) {
    const roomNumber = numberMatch[1];
    
    // Check for common prefixes
    if (roomName.toLowerCase().includes('lab')) {
      return `L${roomNumber}`;
    } else if (roomName.toLowerCase().includes('room')) {
      return `R${roomNumber}`;
    } else if (roomName.toLowerCase().includes('hall')) {
      return `H${roomNumber}`;
    } else {
      return roomNumber;
    }
  }
  
  // For non-numeric rooms, use initials or truncate
  const words = roomName.split(/[\s-_]/);
  if (words.length > 1) {
    // Use initials from multiple words
    const initials = words.map(word => word.charAt(0).toUpperCase()).join('');
    return initials.length <= maxLength ? initials : initials.substring(0, maxLength);
  }
  
  // Single word, truncate if needed
  return roomName.length > maxLength 
    ? roomName.substring(0, maxLength - 1) + '.'
    : roomName;
};

/**
 * Abbreviate course title to a compact format
 * @param {string} courseTitle - Full course title
 * @param {number} maxLength - Maximum length for course title
 * @returns {string} Abbreviated course title
 */
export const abbreviateCourseTitle = (courseTitle, maxLength = 12) => {
  if (!courseTitle) return '';
  
  if (courseTitle.length <= maxLength) return courseTitle;
  
  // Try to use initials from words
  const words = courseTitle.split(' ');
  if (words.length > 1) {
    const initials = words.map(word => word.charAt(0).toUpperCase()).join('');
    if (initials.length <= maxLength) return initials;
  }
  
  // Fallback to truncation
  return courseTitle.substring(0, maxLength - 1) + '.';
};

/**
 * Get compact display format for timetable cell data
 * @param {Object} course - Course data object
 * @param {boolean} isMobile - Whether to use mobile-specific formatting
 * @returns {Object} Formatted display data
 */
export const getCompactCellDisplay = (course, isMobile = false) => {
  if (!course) return null;
  
  const maxTeacherLength = isMobile ? 6 : 8;
  const maxRoomLength = isMobile ? 4 : 6;
  const maxTitleLength = isMobile ? 8 : 12;
  
  // Use teacher code if available, fallback to name
  const teacherDisplay = course.teacher?.teacherCode || course.teacherCode || 
                        course.teacher?.name || course.teacherName || 'No teacher';
  const teacherFullDisplay = course.teacher?.name || course.teacherName || 'No teacher assigned';
  
  return {
    code: course.code || 'N/A',
    teacher: abbreviateTeacherName(teacherDisplay, maxTeacherLength),
    teacherFull: teacherFullDisplay,
    room: abbreviateRoomName(course.roomNumber || course.room, maxRoomLength),
    roomFull: course.roomNumber || course.room || 'No room assigned',
    title: abbreviateCourseTitle(course.title, maxTitleLength),
    titleFull: course.title || 'No title'
  };
};
