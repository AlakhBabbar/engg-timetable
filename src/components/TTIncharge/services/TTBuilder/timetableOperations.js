/**
 * Core Timetable Operations
 * Basic CRUD operations for timetable management
 */

import { weekDays, timeSlots } from './constants.js';
import { deepCopy } from './utils.js';

/**
 * Initialize empty timetable structure with all days and time slots
 * @returns {Object} Empty timetable data structure
 */
export const initializeEmptyTimetable = () => {
  const initialData = {};
  weekDays.forEach(day => {
    initialData[day] = {};
    timeSlots.forEach(slot => {
      initialData[day][slot] = null;
    });
  });
  return initialData;
};

/**
 * Add course to timetable
 * @param {Object} timetableData - Current timetable data
 * @param {string} day - Day of the week
 * @param {string} slot - Time slot
 * @param {Object} course - Course to add
 * @param {Object} room - Room assignment
 * @returns {Object} Updated timetable data
 */
export const addCourseToTimetable = (timetableData, day, slot, course, room) => {
  const newTimetable = deepCopy(timetableData);
  
  if (!newTimetable[day]) {
    newTimetable[day] = {};
  }
  
  newTimetable[day][slot] = {
    ...course,
    teacher: {
      id: course.teacherId,
      name: course.teacherName,
      teacherCode: course.teacherCode
    },
    faculty: {
      id: course.teacherId,
      name: course.teacherName,
      teacherCode: course.teacherCode
    },
    room: room?.id || room?.number || '',
    roomName: room?.name || room?.type || '',
    roomNumber: room?.id || room?.number || '',
    timeSlot: slot,
    dayOfWeek: day
  };
  
  return newTimetable;
};

/**
 * Delete course from timetable
 * @param {Object} timetableData - Current timetable data
 * @param {string} day - Day of the week
 * @param {string} slot - Time slot
 * @returns {Object} Updated timetable data
 */
export const deleteCourse = (timetableData, day, slot) => {
  const newTimetable = deepCopy(timetableData);
  
  if (newTimetable[day] && newTimetable[day][slot]) {
    newTimetable[day][slot] = null;
  }
  
  return newTimetable;
};

/**
 * Update timetable when course is dropped
 * @param {Object} timetableData - Current timetable data
 * @param {string} day - Target day
 * @param {string} slot - Target slot
 * @param {Object} course - Course being dropped
 * @param {Object} room - Room assignment
 * @param {Object} dragSourceInfo - Information about drag source
 * @returns {Object} Updated timetable data
 */
export const updateTimetableOnDrop = (timetableData, day, slot, course, room, dragSourceInfo) => {
  let newTimetable = deepCopy(timetableData);
  
  // Remove course from source location if it was moved
  if (dragSourceInfo && dragSourceInfo.day && dragSourceInfo.slot) {
    newTimetable = deleteCourse(newTimetable, dragSourceInfo.day, dragSourceInfo.slot);
  }
  
  // Add course to new location
  newTimetable = addCourseToTimetable(newTimetable, day, slot, course, room);
  
  return newTimetable;
};

/**
 * Map courses to course blocks with teacher information
 * @param {Array} allCourses - Raw course data from Firestore
 * @param {Object} teacherMap - Map of teacher IDs to teacher info objects
 * @param {Array} courseColors - Available color palette
 * @returns {Array} Processed course blocks
 */
export const mapCoursesToBlocks = (allCourses, teacherMap, courseColors) => {
  const courseColorMap = {};
  let colorIndex = 0;
  
  // Assign unique color per course code
  allCourses.forEach(course => {
    if (!courseColorMap[course.code]) {
      courseColorMap[course.code] = courseColors[colorIndex % courseColors.length];
      colorIndex++;
    }
  });
  
  // Flatten courses by teacher
  const blocks = [];
  allCourses.forEach(course => {
    const color = courseColorMap[course.code];
    if (Array.isArray(course.facultyList)) {
      course.facultyList.forEach(teacherId => {
        const teacherInfo = teacherMap[teacherId] || { name: teacherId, teacherCode: teacherId };
        blocks.push({
          code: course.code,
          title: course.title,
          weeklyHours: course.weeklyHours,
          teacherId,
          teacherName: teacherInfo.name,
          teacherCode: teacherInfo.teacherCode,
          color,
          id: `${course.code}-${teacherId}`,
          duration: course.duration || ''
        });
      });
    } else if (course.facultyList) {
      const teacherInfo = teacherMap[course.facultyList] || { name: course.facultyList, teacherCode: course.facultyList };
      blocks.push({
        code: course.code,
        title: course.title,
        weeklyHours: course.weeklyHours,
        teacherId: course.facultyList,
        teacherName: teacherInfo.name,
        teacherCode: teacherInfo.teacherCode,
        color,
        id: `${course.code}-${course.facultyList}`,
        duration: course.duration || ''
      });
    }
  });
  
  return blocks;
};

/**
 * Group course blocks by course for UI display
 * @param {Array} allCourses - Raw course data
 * @param {Object} teacherMap - Map of teacher IDs to teacher info objects
 * @param {Array} courseColors - Available color palette
 * @returns {Array} Grouped course blocks
 */
export const groupCourseBlocks = (allCourses, teacherMap, courseColors) => {
  const courseColorMap = {};
  let colorIndex = 0;
  
  return allCourses.map(course => {
    const color = courseColorMap[course.code] || courseColors[colorIndex++ % courseColors.length];
    courseColorMap[course.code] = color;
    
    return {
      code: course.code,
      title: course.title,
      weeklyHours: course.weeklyHours,
      duration: course.duration || '',
      blocks: Array.isArray(course.facultyList)
        ? course.facultyList.map(teacherId => {
            const teacherInfo = teacherMap[teacherId] || { name: teacherId, teacherCode: teacherId };
            return {
              teacherId,
              teacherName: teacherInfo.name,
              teacherCode: teacherInfo.teacherCode,
              color,
              id: `${course.code}-${teacherId}`
            };
          })
        : course.facultyList
          ? [{
              teacherId: course.facultyList,
              teacherName: (teacherMap[course.facultyList] || { name: course.facultyList, teacherCode: course.facultyList }).name,
              teacherCode: (teacherMap[course.facultyList] || { name: course.facultyList, teacherCode: course.facultyList }).teacherCode,
              color,
              id: `${course.code}-${course.facultyList}`
            }]
          : []
    };
  });
};

/**
 * Filter courses based on search criteria
 * @param {Array} courses - Array of courses
 * @param {Object|string} criteria - Filter criteria object or search term string
 * @param {string} [filterDepartment] - Department filter (if using string params)
 * @returns {Array} Filtered courses
 */
export const filterCourses = (courses, criteria = {}, filterDepartment = '') => {
  if (!Array.isArray(courses)) return [];
  
  // Handle both object and string parameter formats for backward compatibility
  let searchTerm = '';
  let departmentFilter = '';
  let semesterFilter = '';
  let facultyFilter = '';
  
  if (typeof criteria === 'string') {
    // Legacy format: filterCourses(courses, searchTerm, filterDepartment)
    searchTerm = criteria || '';
    departmentFilter = filterDepartment || '';
  } else if (typeof criteria === 'object' && criteria !== null) {
    // New format: filterCourses(courses, { searchTerm, selectedDepartment, selectedSemester, selectedFaculty })
    searchTerm = criteria.searchTerm || '';
    departmentFilter = criteria.selectedDepartment || criteria.filterDepartment || '';
    semesterFilter = criteria.selectedSemester || '';
    facultyFilter = criteria.selectedFaculty || '';
  }
  
  return courses.filter(course => {
    // Search term matching
    const matchesSearch = !searchTerm || 
      course.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Department matching
    const matchesDepartment = !departmentFilter || 
      course.department === departmentFilter;
    
    // Semester matching
    const matchesSemester = !semesterFilter || 
      course.semester === semesterFilter;
    
    // Faculty matching (check if faculty is in the course's faculty list)
    const matchesFaculty = !facultyFilter || 
      (Array.isArray(course.facultyList) && course.facultyList.includes(facultyFilter)) ||
      course.facultyList === facultyFilter ||
      course.faculty?.id === facultyFilter ||
      course.teacher?.id === facultyFilter;
    
    return matchesSearch && matchesDepartment && matchesSemester && matchesFaculty;
  });
};
