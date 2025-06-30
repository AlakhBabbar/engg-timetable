/**
 * Constants and Sample Data for Timetable Builder
 * Contains all static data and configuration constants
 */

// Sample courses data
export const coursesData = [
  { 
    id: 'CS101', 
    name: 'Introduction to Computer Science', 
    faculty: { id: 1, name: 'Dr. Alex Johnson' }, 
    duration: 1, // in hours
    department: 'Computer Science',
    semester: 'Semester 7',
    color: 'blue',
    weeklyHours: '3L+1T+0P'  // 3 lectures, 1 tutorial, 0 practical
  },
  { 
    id: 'CS202', 
    name: 'Data Structures and Algorithms', 
    faculty: { id: 2, name: 'Dr. Sarah Miller' }, 
    duration: 2, 
    department: 'Computer Science',
    semester: 'Semester 7',
    color: 'indigo',
    weeklyHours: '3L+0T+2P'
  },
  { 
    id: 'CS303', 
    name: 'Database Systems', 
    faculty: { id: 3, name: 'Prof. Robert Chen' }, 
    duration: 1, 
    department: 'Computer Science',
    semester: 'Semester 7',
    color: 'purple',
    weeklyHours: '3L+1T+2P'
  },
  { 
    id: 'CS405', 
    name: 'Artificial Intelligence', 
    faculty: { id: 4, name: 'Dr. Emily Zhang' }, 
    duration: 2, 
    department: 'Computer Science',
    semester: 'Semester 7',
    color: 'green',
    weeklyHours: '4L+0T+2P'
  },
  { 
    id: 'EE201', 
    name: 'Circuit Theory', 
    faculty: { id: 5, name: 'Prof. Maria Garcia' }, 
    duration: 1, 
    department: 'Electrical Engineering',
    semester: 'Semester 7',
    color: 'amber',
    weeklyHours: '3L+1T+1P'
  },
  { 
    id: 'ME101', 
    name: 'Engineering Mechanics', 
    faculty: { id: 6, name: 'Dr. John Smith' }, 
    duration: 1, 
    department: 'Mechanical Engineering',
    semester: 'Semester 7',
    color: 'rose',
    weeklyHours: '3L+1T+0P'
  },
];

// Faculty data
export const facultyData = [
  { id: 1, name: 'Dr. Alex Johnson', department: 'Computer Science', availableSlots: ['Monday-09:00', 'Tuesday-11:00'] },
  { id: 2, name: 'Dr. Sarah Miller', department: 'Computer Science', availableSlots: ['Wednesday-10:00', 'Friday-09:00'] },
  { id: 3, name: 'Prof. Robert Chen', department: 'Computer Science', availableSlots: ['Monday-14:00', 'Thursday-11:00'] },
  { id: 4, name: 'Dr. Emily Zhang', department: 'Computer Science', availableSlots: ['Tuesday-09:00', 'Friday-14:00'] },
  { id: 5, name: 'Prof. Maria Garcia', department: 'Electrical Engineering', availableSlots: ['Wednesday-14:00', 'Thursday-09:00'] },
  { id: 6, name: 'Dr. John Smith', department: 'Mechanical Engineering', availableSlots: ['Monday-11:00', 'Thursday-14:00'] }
];

// Room data
export const roomsData = [
  { id: 'A101', capacity: 60, type: 'Lecture Hall', facilities: ['Projector', 'Smart Board'] },
  { id: 'B201', capacity: 40, type: 'Classroom', facilities: ['Projector'] },
  { id: 'C302', capacity: 30, type: 'Computer Lab', facilities: ['Computers', 'Projector'] },
  { id: 'A105', capacity: 60, type: 'Lecture Hall', facilities: ['Projector', 'Smart Board'] },
  { id: 'B204', capacity: 40, type: 'Classroom', facilities: ['Projector'] },
  { id: 'D101', capacity: 80, type: 'Lecture Hall', facilities: ['Projector', 'Smart Board', 'Audio System'] },
];

// Time slots (reduced for better fit)
export const timeSlots = [
  '7:00-7:55',
  '7:55-8:50',
  '8:50-9:45',
  '10:30-11:25',
  '11:25-12:20',
  '12:20-1:15',
  '1:15-2:10',
  '2:10-3:05',
  '3:05-4:00',
  '4:00-5:00'
];

// Days of the week (reduced for better fit)
export const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Available course colors
export const courseColors = [
  'blue', 'indigo', 'purple', 'green', 'amber', 'rose', 'red', 'orange', 
  'yellow', 'emerald', 'teal', 'cyan', 'sky', 'violet', 'fuchsia', 'pink'
];

// Color class mappings
export const colorClassMap = {
  blue: 'bg-blue-100 border-blue-500 text-blue-800',
  indigo: 'bg-indigo-100 border-indigo-500 text-indigo-800',
  purple: 'bg-purple-100 border-purple-500 text-purple-800',
  green: 'bg-green-100 border-green-500 text-green-800',
  amber: 'bg-amber-100 border-amber-500 text-amber-800',
  rose: 'bg-rose-100 border-rose-500 text-rose-800',
  red: 'bg-red-100 border-red-500 text-red-800',
  orange: 'bg-orange-100 border-orange-500 text-orange-800',
  yellow: 'bg-yellow-100 border-yellow-500 text-yellow-800',
  emerald: 'bg-emerald-100 border-emerald-500 text-emerald-800',
  teal: 'bg-teal-100 border-teal-500 text-teal-800',
  cyan: 'bg-cyan-100 border-cyan-500 text-cyan-800',
  sky: 'bg-sky-100 border-sky-500 text-sky-800',
  violet: 'bg-violet-100 border-violet-500 text-violet-800',
  fuchsia: 'bg-fuchsia-100 border-fuchsia-500 text-fuchsia-800',
  pink: 'bg-pink-100 border-pink-500 text-pink-800'
};

// Day name abbreviations
export const dayAbbreviations = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun'
};

// Configuration constants
export const CONFIG = {
  MIN_BREAK_MINUTES: 15,
  TIME_SLOT_DURATION: 55, // minutes
  ROOM_CAPACITY_MARGIN: 0.9, // 90% capacity utilization
  MAX_AUDIT_LOGS: 1000,
  MAX_HISTORY_ENTRIES: 50
};
