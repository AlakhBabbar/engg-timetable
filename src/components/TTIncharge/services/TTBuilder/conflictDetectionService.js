/**
 * Comprehensive Conflict Detection Service
 * Detects teacher and room conflicts across all timetables in the database
 */

import { db, collection, getDocs, query, where } from '../../../../firebase/config';

/**
 * Fetch all timetables from database
 * @returns {Promise<Array>} Array of timetable documents
 */
export const fetchAllTimetables = async () => {
  try {
    const timetablesRef = collection(db, 'timetables');
    const querySnapshot = await getDocs(timetablesRef);
    
    const timetables = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      timetables.push({
        id: doc.id,
        semester: data.semester,
        branch: data.branch,
        batch: data.batch,
        type: data.type,
        schedule: data.schedule || {}
      });
    });
    
    return timetables;
  } catch (error) {
    console.error('Error fetching timetables:', error);
    return [];
  }
};

/**
 * Check for teacher conflicts across all timetables
 * @param {string} teacherID - Teacher ID to check
 * @param {string} day - Day of the week
 * @param {string} timeSlot - Time slot
 * @param {string} excludeTimetableId - Current timetable ID to exclude from check
 * @returns {Promise<Array>} Array of conflict objects
 */
export const checkTeacherConflicts = async (teacherID, day, timeSlot, excludeTimetableId = null) => {
  const conflicts = [];
  
  try {
    const allTimetables = await fetchAllTimetables();
    
    for (const timetable of allTimetables) {
      // Skip the current timetable being edited
      if (timetable.id === excludeTimetableId) continue;
      
      const schedule = timetable.schedule;
      if (!schedule || !schedule[day] || !schedule[day][timeSlot]) continue;
      
      const slotData = schedule[day][timeSlot];
      if (!slotData) continue;
      
      // Check if teacher matches
      const slotTeacherID = slotData.teacherId;
      if (slotTeacherID === teacherID) {
        conflicts.push({
          type: 'teacher',
          timetableId: timetable.id,
          semester: timetable.semester,
          branch: timetable.branch,
          batch: timetable.batch,
          type: timetable.type,
          day: day,
          timeSlot: timeSlot,
          teacherId: slotTeacherID,
          teacherName: slotData.teacherName,
          teacherCode: slotData.teacherCode,
          courseCode: slotData.courseCode,
          courseName: slotData.courseName,
          roomNumber: slotData.roomNumber
        });
      }
    }
  } catch (error) {
    console.error('Error checking teacher conflicts:', error);
  }
  
  return conflicts;
};

/**
 * Check for room conflicts across all timetables
 * @param {string} roomID - Room ID to check
 * @param {string} day - Day of the week
 * @param {string} timeSlot - Time slot
 * @param {string} excludeTimetableId - Current timetable ID to exclude from check
 * @returns {Promise<Array>} Array of conflict objects
 */
export const checkRoomConflicts = async (roomID, day, timeSlot, excludeTimetableId = null) => {
  const conflicts = [];
  
  try {
    const allTimetables = await fetchAllTimetables();
    
    for (const timetable of allTimetables) {
      // Skip the current timetable being edited
      if (timetable.id === excludeTimetableId) continue;
      
      const schedule = timetable.schedule;
      if (!schedule || !schedule[day] || !schedule[day][timeSlot]) continue;
      
      const slotData = schedule[day][timeSlot];
      if (!slotData) continue;
      
      // Check if room matches
      const slotRoomID = slotData.roomId || slotData.roomNumber;
      if (slotRoomID === roomID) {
        conflicts.push({
          type: 'room',
          timetableId: timetable.id,
          semester: timetable.semester,
          branch: timetable.branch,
          batch: timetable.batch,
          type: timetable.type,
          day: day,
          timeSlot: timeSlot,
          roomId: slotRoomID,
          roomName: slotData.roomName,
          teacherId: slotData.teacherId,
          teacherName: slotData.teacherName,
          teacherCode: slotData.teacherCode,
          courseCode: slotData.courseCode,
          courseName: slotData.courseName
        });
      }
    }
  } catch (error) {
    console.error('Error checking room conflicts:', error);
  }
  
  return conflicts;
};

/**
 * Check for both teacher and room conflicts
 * @param {string} teacherID - Teacher ID to check
 * @param {string} roomID - Room ID to check
 * @param {string} day - Day of the week
 * @param {string} timeSlot - Time slot
 * @param {string} excludeTimetableId - Current timetable ID to exclude from check
 * @returns {Promise<Object>} Object containing teacher and room conflicts
 */
export const checkAllConflicts = async (teacherID, roomID, day, timeSlot, excludeTimetableId = null) => {
  const [teacherConflicts, roomConflicts] = await Promise.all([
    checkTeacherConflicts(teacherID, day, timeSlot, excludeTimetableId),
    checkRoomConflicts(roomID, day, timeSlot, excludeTimetableId)
  ]);
  
  return {
    teacherConflicts,
    roomConflicts,
    hasConflicts: teacherConflicts.length > 0 || roomConflicts.length > 0
  };
};

/**
 * Generate timetable document ID
 * @param {string} semester - Semester
 * @param {string} branch - Branch
 * @param {string} batch - Batch
 * @param {string} type - Type
 * @returns {string} Document ID
 */
export const generateTimetableId = (semester, branch, batch, type) => {
  return `${semester}-${branch}-${batch}-${type}`;
};

/**
 * Parse timetable document ID
 * @param {string} timetableId - Timetable document ID
 * @returns {Object} Parsed components
 */
export const parseTimetableId = (timetableId) => {
  const parts = timetableId.split('-');
  return {
    semester: parts[0],
    branch: parts[1],
    batch: parts[2],
    type: parts[3]
  };
};

/**
 * Format timetable display name
 * @param {Object} timetable - Timetable object
 * @returns {string} Formatted display name
 */
export const formatTimetableDisplayName = (timetable) => {
  return `${timetable.semester} - ${timetable.branch} - ${timetable.batch} - ${timetable.type}`;
};
