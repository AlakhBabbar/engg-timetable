// Import data from TimetableBuilder service
import { facultyData, coursesData, roomsData, timeSlots, weekDays } from './TimetableBuilder';
import { db, collection, query, where, onSnapshot, getDocs } from '../../../firebase/config';

// Function to calculate weekly hours from string format (e.g., "3L+1T+2P")
export const calculateHoursFromString = (hoursString) => {
  // Extract numbers from strings like "3L+1T+2P"
  const lectureMatch = hoursString.match(/(\d+)L/);
  const tutorialMatch = hoursString.match(/(\d+)T/);
  const practicalMatch = hoursString.match(/(\d+)P/);
  
  const lectureHours = lectureMatch ? parseInt(lectureMatch[1]) : 0;
  const tutorialHours = tutorialMatch ? parseInt(tutorialMatch[1]) : 0;
  const practicalHours = practicalMatch ? parseInt(practicalMatch[1]) : 0;
  
  return lectureHours + tutorialHours + practicalHours;
};

// Create a timetable grid for a faculty based on their assigned courses
export const createFacultyTimetableGrid = (facultyCourses) => {
  const grid = {};
  
  // Initialize empty grid
  weekDays.forEach(day => {
    grid[day] = {};
    timeSlots.forEach(slot => {
      grid[day][slot] = null;
    });
  });
  
  // Randomly assign courses to time slots for demo purposes
  // In a real app, this would come from the actual timetable data
  facultyCourses.forEach(course => {
    // For demonstration purposes, assign each course to 1-3 random slots
    const slotsToAssign = Math.min(3, Math.floor(Math.random() * 3) + 1);
    let assigned = 0;
    
    while (assigned < slotsToAssign) {
      const randomDay = weekDays[Math.floor(Math.random() * weekDays.length)];
      const randomSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
      
      // Only assign if the slot is empty
      if (!grid[randomDay][randomSlot]) {
        // Find a random room for this slot
        const randomRoom = roomsData[Math.floor(Math.random() * roomsData.length)];
        
        grid[randomDay][randomSlot] = {
          ...course,
          room: randomRoom.id
        };
        assigned++;
      }
    }
  });
  
  return grid;
};

// Function to prepare faculty data with courses and time calculations
export const prepareFacultyData = () => {
  return facultyData.map(faculty => {
    // Get courses assigned to this faculty
    const assignedCourses = coursesData.filter(
      course => course.faculty.id === faculty.id
    );
    
    // Calculate weekly teaching hours
    const weeklyHours = assignedCourses.reduce((total, course) => {
      return total + calculateHoursFromString(course.weeklyHours);
    }, 0);
    
    // Create a timetable grid for the faculty
    const timetableGrid = createFacultyTimetableGrid(assignedCourses);
    
    // Calculate load percentage
    const maxHours = 20; // Assuming max hours is 20 per week
    const loadPercentage = Math.min(100, Math.round((weeklyHours / maxHours) * 100));
    
    // Determine status based on load
    let status = 'normal';
    if (loadPercentage > 90) {
      status = 'overloaded';
    } else if (loadPercentage > 75) {
      status = 'nearlyFull';
    }
    
    return {
      ...faculty,
      assignedCourses,
      weeklyHours,
      maxHours,
      loadPercentage,
      status,
      timetableGrid
    };
  });
};

// Get color class for faculty card based on their status
export const getStatusColorClass = (status) => {
  switch(status) {
    case 'overloaded':
      return 'bg-red-100 border-red-300';
    case 'nearlyFull':
      return 'bg-yellow-100 border-yellow-300';
    default:
      return 'bg-green-100 border-green-300';
  }
};

// Fetch timetable slots for a specific teacher from Firestore
export const fetchFacultyTimetableFromDB = (teacherId, callback) => {
  const timetableRef = collection(db, 'timetable');
  const q = query(timetableRef, where('teacher.id', '==', teacherId));
  return onSnapshot(q, async (snapshot) => {
    if (snapshot.empty) {
      // If timetable is empty, fetch only teacher info from teachers collection
      const teachersSnap = await getDocs(collection(db, 'teachers'));
      const teachers = teachersSnap.docs.map(doc => doc.data());
      // Find the teacher by id
      const teacher = teachers.find(t => t.id === teacherId);
      // Return an empty grid for this teacher
      const grid = {};
      weekDays.forEach(day => {
        grid[day] = {};
        timeSlots.forEach(slot => {
          grid[day][slot] = null;
        });
      });
      callback(grid, teacher);
      return;
    }
    const slots = snapshot.docs.map(doc => doc.data());
    // Build a grid: day -> time -> slotObj
    const grid = {};
    weekDays.forEach(day => {
      grid[day] = {};
      timeSlots.forEach(slot => {
        grid[day][slot] = null;
      });
    });
    slots.forEach(slot => {
      if (grid[slot.day] && grid[slot.day][slot.time] !== undefined) {
        grid[slot.day][slot.time] = slot;
      }
    });
    callback(grid);
  });
};

// Fetch faculty list from Firestore teachers collection (real-time)
export const fetchFacultyListFromDB = (callback) => {
  return onSnapshot(collection(db, 'teachers'), (snapshot) => {
    const facultyList = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id || doc.id,
        name: data.name,
        department: data.department
      };
    });
    callback(facultyList);
  });
};

// Export the data so the component can use it directly
export { facultyData, coursesData, roomsData, timeSlots, weekDays };