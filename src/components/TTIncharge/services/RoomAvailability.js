  import { roomsData, weekDays, timeSlots, coursesData } from './TimetableBuilder';
import { db, collection, onSnapshot } from '../../../firebase/config';

// Department list derived from rooms
export const departments = ['Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Footwear Engineering', 'Agricultural Engineering'];

// Room types
export const roomTypes = ['Lecture Hall', 'Classroom', 'Laboratory', 'Conference Room', 'Seminar Hall', 'Workshop'];

// Function to generate room availability data
export const generateRoomAvailabilityData = () => {
  // Start with base room data and add availability
  const roomsWithAvailability = roomsData.map(room => {
    // Generate mock availability data for each room
    const availability = {};
    weekDays.forEach(day => {
      availability[day] = {};
      timeSlots.forEach(slot => {
        // Random status: 0 = free, 1 = occupied, 2 = tentative
        const randStatus = Math.random();
        const status = randStatus > 0.7 ? 0 : randStatus > 0.2 ? 1 : 2;
        
        let course = null;
        if (status === 1 || status === 2) {
          // Assign a random course if slot is occupied or tentative
          const randomCourse = coursesData[Math.floor(Math.random() * coursesData.length)];
          course = {
            id: randomCourse.id,
            name: randomCourse.name,
            faculty: randomCourse.faculty
          };
        }
        
        availability[day][slot] = {
          status,
          course
        };
      });
    });
    
    // Add random department allocations for filtering
    const departments = [];
    if (Math.random() > 0.5) departments.push('Electrical Engineering');
    if (Math.random() > 0.6) departments.push('Mechanical Engineering');
    if (Math.random() > 0.7) departments.push('Civil Engineering');
    if (Math.random() > 0.8) departments.push('Footwear Engineering');
    if (Math.random() > 0.9) departments.push('Agricultural Engineering');
    
    return {
      ...room,
      availability,
      departments: departments.length ? departments : ['General']
    };
  });
  
  return roomsWithAvailability;
};

// Function to fetch and process room availability data from Firestore timetable collection in real-time
export const fetchRoomAvailabilityFromDB = (callback) => {
  // Listen to rooms collection
  const roomsUnsub = onSnapshot(collection(db, 'rooms'), (roomsSnap) => {
    const rooms = roomsSnap.docs.map(doc => doc.data());
    // Listen to timetable collection
    const timetableUnsub = onSnapshot(collection(db, 'timetable'), (timetableSnap) => {
      const slots = timetableSnap.docs.map(doc => doc.data());
      const roomsWithAvailability = rooms.map(room => {
        const availability = {};
        weekDays.forEach(day => {
          availability[day] = {};
          timeSlots.forEach(slot => {
            // Find a timetable slot for this room, day, and time
            const found = slots.find(s => s.roomID?.id === room.id && s.day === day && s.time === slot);
            if (found) {
              availability[day][slot] = {
                status: found.status ?? 1, // 1 = occupied by default if not set
                course: found.courseID || null,
                booking: found
              };
            } else {
              availability[day][slot] = { status: 0, course: null };
            }
          });
        });
        return {
          ...room,
          availability,
          departments: room.departments || [],
          type: room.type || ''
        };
      });
      callback(roomsWithAvailability);
    });
    // Return unsubscribe for timetable
    fetchRoomAvailabilityFromDB.timetableUnsub = timetableUnsub;
  });
  // Return a function to unsubscribe both listeners
  return () => {
    if (fetchRoomAvailabilityFromDB.timetableUnsub) fetchRoomAvailabilityFromDB.timetableUnsub();
    roomsUnsub();
  };
};

// Function to filter rooms based on department and room type
export const filterRooms = (rooms, selectedDepartment, selectedRoomType) => {
  return rooms.filter(room => {
    if (selectedDepartment && !room.departments.includes(selectedDepartment)) return false;
    if (selectedRoomType && room.type !== selectedRoomType) return false;
    return true;
  });
};

// Function to get visible time slots based on time range filter
export const getVisibleTimeSlots = (allTimeSlots, timeRange) => {
  return allTimeSlots.filter(slot => {
    const slotStart = slot.split(' - ')[0];
    const slotEnd = slot.split(' - ')[1];
    return slotStart >= timeRange.start && slotEnd <= timeRange.end;
  });
};

// Function to get visible days based on view mode
export const getVisibleDays = (allDays, viewMode, selectedDay) => {
  return viewMode === 'week' ? allDays : [selectedDay];
};

// Function to get status color class
export const getStatusColorClass = (status) => {
  switch(status) {
    case 0:
      return 'bg-green-100 border-green-300 hover:bg-green-200';
    case 1:
      return 'bg-red-100 border-red-300 hover:bg-red-200';
    case 2:
      return 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200';
    default:
      return 'bg-gray-100';
  }
};

// Function to get status text
export const getStatusText = (status) => {
  switch(status) {
    case 0:
      return 'Available';
    case 1:
      return 'Occupied';
    case 2:
      return 'Tentative';
    default:
      return 'Unknown';
  }
};