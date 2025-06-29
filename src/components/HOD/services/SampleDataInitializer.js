// Sample data initializer for Faculty Assignment functionality
import { 
  db, 
  collection, 
  doc,
  setDoc,
  getDocs,
  query,
  where
} from '../../../firebase/config.js';

// Use same collection as TeacherManagement for consistency
const FACULTY_COLLECTION = 'teachers';

// Sample courses data
const sampleCourses = [
  {
    id: 'course_cs101',
    code: 'CS101',
    title: 'Introduction to Computer Science',
    semester: 'Semester 6',
    weeklyHours: '3L+1T',
    department: 'dept_computer_science',
    faculty: null,
    tags: ['programming', 'introductory'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'course_cs202',
    code: 'CS202',
    title: 'Data Structures and Algorithms',
    semester: 'Semester 7',
    weeklyHours: '3L+2P',
    department: 'dept_computer_science',
    faculty: null,
    tags: ['algorithms', 'data structures'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'course_cs303',
    code: 'CS303',
    title: 'Database Systems',
    semester: 'Semester 6',
    weeklyHours: '3L+1T+2P',
    department: 'dept_computer_science',
    faculty: null,
    tags: ['databases', 'SQL'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'course_cs405',
    code: 'CS405',
    title: 'Artificial Intelligence',
    semester: 'Semester 7',
    weeklyHours: '4L+2P',
    department: 'dept_computer_science',
    faculty: null,
    tags: ['AI', 'machine learning'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'course_cs301',
    code: 'CS301',
    title: 'Software Engineering',
    semester: 'Semester 6',
    weeklyHours: '3L+1T',
    department: 'dept_computer_science',
    faculty: null,
    tags: ['software', 'project management'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'course_cs210',
    code: 'CS210',
    title: 'Computer Networks',
    semester: 'Semester 7',
    weeklyHours: '3L+1T+1P',
    department: 'dept_computer_science',
    faculty: null,
    tags: ['networking', 'protocols'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Sample faculty data
const sampleFaculty = [
  {
    id: 'faculty_alex_johnson',
    name: 'Dr. Alex Johnson',
    avatar: 'https://i.pravatar.cc/150?img=11',
    status: 'available',
    loadHours: 6,
    maxHours: 18,
    department: 'dept_computer_science',
    expertise: ['programming', 'algorithms', 'theory'],
    preferredCourses: ['CS101', 'CS202'],
    assignedCourses: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'faculty_sarah_miller',
    name: 'Dr. Sarah Miller',
    avatar: 'https://i.pravatar.cc/150?img=5',
    status: 'nearlyFull',
    loadHours: 14,
    maxHours: 18,
    department: 'dept_computer_science',
    expertise: ['databases', 'data mining', 'big data'],
    preferredCourses: ['CS303'],
    assignedCourses: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'faculty_robert_chen',
    name: 'Prof. Robert Chen',
    avatar: 'https://i.pravatar.cc/150?img=12',
    status: 'available',
    loadHours: 10,
    maxHours: 20,
    department: 'dept_computer_science',
    expertise: ['software engineering', 'project management'],
    preferredCourses: ['CS301'],
    assignedCourses: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'faculty_emily_zhang',
    name: 'Dr. Emily Zhang',
    avatar: 'https://i.pravatar.cc/150?img=9',
    status: 'available',
    loadHours: 8,
    maxHours: 18,
    department: 'dept_computer_science',
    expertise: ['AI', 'machine learning', 'neural networks'],
    preferredCourses: ['CS405'],
    assignedCourses: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'faculty_david_wilson',
    name: 'Prof. David Wilson',
    avatar: 'https://i.pravatar.cc/150?img=15',
    status: 'overloaded',
    loadHours: 21,
    maxHours: 20,
    department: 'dept_computer_science',
    expertise: ['networking', 'security', 'protocols'],
    preferredCourses: ['CS210'],
    assignedCourses: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'faculty_lisa_kumar',
    name: 'Dr. Lisa Kumar',
    avatar: 'https://i.pravatar.cc/150?img=3',
    status: 'available',
    loadHours: 12,
    maxHours: 18,
    department: 'dept_computer_science',
    expertise: ['theory', 'algorithms', 'computational logic'],
    preferredCourses: ['CS202'],
    assignedCourses: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'faculty_michael_brown',
    name: 'Prof. Michael Brown',
    avatar: 'https://i.pravatar.cc/150?img=13',
    status: 'nearlyFull',
    loadHours: 15,
    maxHours: 18,
    department: 'dept_computer_science',
    expertise: ['databases', 'SQL', 'data warehousing'],
    preferredCourses: ['CS303'],
    assignedCourses: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

/**
 * Initialize sample courses in Firebase
 * @param {string} departmentId - Department ID to initialize data for
 * @returns {Promise<boolean>} Success status
 */
export const initializeSampleCourses = async (departmentId = 'dept_computer_science') => {
  try {
    // Check if courses already exist
    const coursesRef = collection(db, 'courses');
    const existingCoursesQuery = query(coursesRef, where('department', '==', departmentId));
    const existingCoursesSnapshot = await getDocs(existingCoursesQuery);
    
    if (!existingCoursesSnapshot.empty) {
      console.log('Sample courses already exist for department:', departmentId);
      return true;
    }
    
    // Add sample courses
    for (const course of sampleCourses) {
      const courseData = { ...course, department: departmentId };
      delete courseData.id; // Remove id field, Firestore will generate it
      
      const courseDoc = doc(db, 'courses', course.id);
      await setDoc(courseDoc, courseData);
    }
    
    console.log('Sample courses initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing sample courses:', error);
    return false;
  }
};

/**
 * Initialize sample faculty in Firebase
 * @param {string} departmentId - Department ID to initialize data for
 * @returns {Promise<boolean>} Success status
 */
export const initializeSampleFaculty = async (departmentId = 'dept_computer_science') => {
  try {
    // Map department ID to full name for compatibility
    const departmentMap = {
      'dept_computer_science': 'Computer Science',
      'dept_electrical_engineering': 'Electrical Engineering',
      'dept_mechanical_engineering': 'Mechanical Engineering',
      'dept_civil_engineering': 'Civil Engineering',
      'dept_chemical_engineering': 'Chemical Engineering',
      'dept_agricultural_engineering': 'Agricultural Engineering'
    };
    
    const fullDepartmentName = departmentMap[departmentId] || departmentId;
    
    // Check if faculty already exist
    const facultyRef = collection(db, FACULTY_COLLECTION);
    const existingFacultyQuery = query(facultyRef, where('department', '==', fullDepartmentName));
    const existingFacultySnapshot = await getDocs(existingFacultyQuery);
    
    if (!existingFacultySnapshot.empty) {
      console.log('Sample faculty already exist for department:', fullDepartmentName);
      return true;
    }
    
    // Add sample faculty with TeacherManagement compatible structure
    for (const faculty of sampleFaculty) {
      const facultyData = { 
        ...faculty, 
        department: fullDepartmentName,
        // Add TeacherManagement fields
        email: `${faculty.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@university.edu`,
        qualification: 'Ph.D Computer Science',
        experience: Math.floor(Math.random() * 15) + 5, // Random experience 5-20 years
        active: true,
        role: 'Faculty'
      };
      delete facultyData.id; // Remove id field, Firestore will generate it
      
      const facultyDoc = doc(db, FACULTY_COLLECTION, faculty.id);
      await setDoc(facultyDoc, facultyData);
    }
    
    console.log('Sample faculty initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing sample faculty:', error);
    return false;
  }
};

/**
 * Initialize both sample courses and faculty
 * @param {string} departmentId - Department ID to initialize data for
 * @returns {Promise<boolean>} Success status
 */
export const initializeAllSampleData = async (departmentId = 'dept_computer_science') => {
  try {
    const coursesSuccess = await initializeSampleCourses(departmentId);
    const facultySuccess = await initializeSampleFaculty(departmentId);
    
    return coursesSuccess && facultySuccess;
  } catch (error) {
    console.error('Error initializing sample data:', error);
    return false;
  }
};

/**
 * Clear all sample data (for testing purposes)
 * @param {string} departmentId - Department ID to clear data for
 * @returns {Promise<boolean>} Success status
 */
export const clearSampleData = async (departmentId = 'dept_computer_science') => {
  try {
    // This would require admin SDK in a real app
    // For now, just log the intent
    console.log('To clear data, use Firebase Admin SDK or Firebase Console');
    return true;
  } catch (error) {
    console.error('Error clearing sample data:', error);
    return false;
  }
};

/**
 * Initialize sample courses for a specific semester
 * @param {string} departmentId - Department ID to initialize data for
 * @param {string} semester - Specific semester to create courses for
 * @returns {Promise<boolean>} Success status
 */
export const initializeSampleCoursesForSemester = async (departmentId = 'dept_computer_science', semester = 'Semester 6') => {
  try {
    // Check if courses already exist for this semester and department
    const coursesRef = collection(db, 'courses');
    const existingCoursesQuery = query(
      coursesRef, 
      where('department', '==', departmentId),
      where('semester', '==', semester)
    );
    const existingCoursesSnapshot = await getDocs(existingCoursesQuery);
    
    if (!existingCoursesSnapshot.empty) {
      console.log(`Sample courses already exist for department: ${departmentId}, semester: ${semester}`);
      return true;
    }
    
    // Filter sample courses for the specified semester
    const semesterCourses = sampleCourses.filter(course => course.semester === semester);
    
    if (semesterCourses.length === 0) {
      // If no sample courses exist for this semester, create some generic ones
      const genericCourses = [
        {
          id: `course_${semester.toLowerCase().replace(' ', '_')}_1`,
          code: `${departmentId.split('_')[1]?.toUpperCase() || 'CS'}${Math.floor(Math.random() * 900) + 100}`,
          title: `${semester} Course 1`,
          semester: semester,
          weeklyHours: '3L+1T',
          department: departmentId,
          faculty: null,
          tags: ['core', 'theory'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: `course_${semester.toLowerCase().replace(' ', '_')}_2`,
          code: `${departmentId.split('_')[1]?.toUpperCase() || 'CS'}${Math.floor(Math.random() * 900) + 100}`,
          title: `${semester} Course 2`,
          semester: semester,
          weeklyHours: '2L+2P',
          department: departmentId,
          faculty: null,
          tags: ['practical', 'lab'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: `course_${semester.toLowerCase().replace(' ', '_')}_3`,
          code: `${departmentId.split('_')[1]?.toUpperCase() || 'CS'}${Math.floor(Math.random() * 900) + 100}`,
          title: `${semester} Course 3`,
          semester: semester,
          weeklyHours: '3L+1T+2P',
          department: departmentId,
          faculty: null,
          tags: ['core', 'combined'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Add generic courses for this semester
      for (const course of genericCourses) {
        const courseData = { ...course, department: departmentId };
        delete courseData.id; // Remove id field, Firestore will generate it
        
        const courseDoc = doc(db, 'courses', course.id);
        await setDoc(courseDoc, courseData);
      }
      
      console.log(`Generic sample courses created for ${semester}`);
    } else {
      // Add existing sample courses for this semester
      for (const course of semesterCourses) {
        const courseData = { ...course, department: departmentId };
        delete courseData.id; // Remove id field, Firestore will generate it
        
        const courseDoc = doc(db, 'courses', course.id);
        await setDoc(courseDoc, courseData);
      }
      
      console.log(`Sample courses initialized for ${semester}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error initializing sample courses for ${semester}:`, error);
    return false;
  }
};
