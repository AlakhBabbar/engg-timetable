// Firebase implementation for faculty load reports
import { 
  db, 
  collection, 
  doc,
  getDoc, 
  getDocs, 
  addDoc,
  updateDoc,
  query,
  where, 
  orderBy, 
  limit,
  serverTimestamp
} from '../../../firebase/config.js';
import { logActivity } from './HODDashboard';

// Import centralized semester service
import { 
  getAllSemesters,
  getDefaultSemesters,
  getActiveSemester 
} from '../../../services/SemesterService.js';

// Collection references
const FACULTY_COLLECTION = 'teachers';
const COURSES_COLLECTION = 'courses';
const SEMESTERS_COLLECTION = 'semesters';
const REPORTS_COLLECTION = 'reports';

/**
 * Fetch available semesters using centralized semester service
 * @param {string} departmentId - Department ID (not used for semesters as they are global)
 * @returns {Promise<Array>} - Array of semester names
 */
export const fetchSemesters = async (departmentId) => {
  try {
    console.log('Fetching semesters using centralized service...');
    
    // Use centralized semester service
    const semestersData = await getAllSemesters();
    
    if (semestersData.length > 0) {
      const semesterNames = semestersData.map(sem => sem.name);
      console.log('Found semesters from Firebase:', semesterNames);
      return semesterNames;
    } else {
      console.log('No semesters found in Firebase, using defaults');
      const defaultSemesters = getDefaultSemesters();
      return defaultSemesters;
    }
  } catch (error) {
    console.error('Error fetching semesters:', error);
    console.log('Falling back to default semesters');
    const defaultSemesters = getDefaultSemesters();
    return defaultSemesters;
  }
};

/**
 * Fetch faculty data from Firebase
 * @param {string} departmentId - Department ID
 * @returns {Promise<Array>} - Array of faculty data
 */
export const fetchFaculty = async (departmentId) => {
  try {
    if (!departmentId) {
      console.warn('No department ID provided');
      return [];
    }

    const facultyRef = collection(db, FACULTY_COLLECTION);
    const facultyQuery = query(facultyRef, where('department', '==', departmentId));
      
    const snapshot = await getDocs(facultyQuery);
    
    if (snapshot.empty) {
      console.log('No faculty found for department');
      return [];
    }
    
    const faculty = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Handle backward compatibility for assignedCourses
      let assignedCourses = data.assignedCourses || [];
      
      // If assignedCourses is an array (old format), convert to semester-aware object
      if (Array.isArray(assignedCourses)) {
        console.log(`Converting faculty ${data.name} from old assignment format to semester-aware format`);
        // For now, we'll put all old assignments in a "Legacy" semester
        assignedCourses = assignedCourses.length > 0 ? { "Legacy": assignedCourses } : {};
      }
      
      return {
        id: doc.id,
        name: data.name || 'Unknown Faculty',
        avatar: data.avatar || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 20) + 1}`,
        department: data.department || departmentId,
        status: data.status || 'available',
        loadHours: data.loadHours || 0,
        maxHours: data.maxHours || 18,
        expertise: data.expertise || [],
        assignedCourses: assignedCourses // Now semester-aware object
      };
    });

    return faculty;
  } catch (error) {
    console.error('Error fetching faculty:', error);
    return [];
  }
};

/**
 * Fetch course data from Firebase
 * @param {string} departmentId - Department ID
 * @param {string} semester - Optional semester filter
 * @returns {Promise<Array>} - Array of course data
 */
export const fetchCourses = async (departmentId, semester = null) => {
  try {
    if (!departmentId) {
      console.warn('No department ID provided');
      return [];
    }

    const coursesRef = collection(db, COURSES_COLLECTION);
    let coursesQuery;
    
    if (semester) {
      coursesQuery = query(
        coursesRef, 
        where('department', '==', departmentId),
        where('semester', '==', semester)
      );
    } else {
      coursesQuery = query(coursesRef, where('department', '==', departmentId));
    }
    
    const snapshot = await getDocs(coursesQuery);
    
    if (snapshot.empty) {
      console.log('No courses found for department/semester');
      return [];
    }
    
    const courses = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        code: data.code || 'Unknown Code',
        title: data.title || 'Unknown Course',
        semester: data.semester || semester,
        weeklyHours: data.weeklyHours || '3L',
        faculty: data.faculty,
        tags: data.tags || []
      };
    });

    return courses;
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
};

// Helper function to calculate weekly hours as a number
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

// Calculate the faculty load data with course information
export const getFacultyWithLoadData = (faculty, courses, selectedSemester) => {
  // Filter courses based on selected semester (with trim to handle whitespace)
  const semesterCourses = courses.filter(course => 
    course.semester && course.semester.trim() === selectedSemester.trim()
  );
  
  console.log('Debug - getFacultyWithLoadData:', {
    selectedSemester,
    totalCourses: courses.length,
    semesterCourses: semesterCourses.length,
    facultyCount: faculty.length,
    allCourses: courses.map(c => ({ id: c.id, code: c.code, semester: c.semester })),
    semesterCoursesDetails: semesterCourses.map(c => ({ id: c.id, code: c.code, semester: c.semester }))
  });
  
  // Enhance faculty data with detailed course information
  const enhancedFacultyData = faculty.map(f => {
    console.log(`Debug - Faculty ${f.name}:`, {
      assignedCourses: f.assignedCourses,
      assignedCoursesType: typeof f.assignedCourses,
      isArray: Array.isArray(f.assignedCourses),
      isObject: typeof f.assignedCourses === 'object' && !Array.isArray(f.assignedCourses),
      assignedCoursesContent: f.assignedCourses
    });
    
    // Get courses assigned to this faculty member for the selected semester
    let facultyCourses = [];
    
    // Handle new semester-aware structure
    if (f.assignedCourses && typeof f.assignedCourses === 'object' && !Array.isArray(f.assignedCourses)) {
      // New format: { "Semester 1": ["course1", "course2"], "Semester 2": ["course3"] }
      const semesterAssignments = f.assignedCourses[selectedSemester] || [];
      
      console.log(`Debug - Faculty ${f.name} semester assignments:`, {
        selectedSemester,
        semesterAssignments,
        allSemesters: Object.keys(f.assignedCourses)
      });
      
      if (Array.isArray(semesterAssignments)) {
        // Find courses that match the assigned course IDs for this semester
        facultyCourses = courses.filter(course => {
          const courseIdStr = String(course.id).trim();
          const assignedCourseIds = semesterAssignments.map(id => String(id).trim());
          return assignedCourseIds.includes(courseIdStr);
        });
      }
    } else if (Array.isArray(f.assignedCourses)) {
      // Old format: ["course1", "course2", "course3"] - use fallback method
      console.log(`Debug - Faculty ${f.name} using old format fallback`);
      
      // First, find all assigned courses from the full course list
      const allAssignedCourses = courses.filter(course => {
        const courseIdStr = String(course.id).trim();
        const assignedCourseIds = f.assignedCourses.map(id => String(id).trim());
        return assignedCourseIds.includes(courseIdStr);
      });
      
      // Now filter by selected semester
      facultyCourses = allAssignedCourses.filter(course => 
        course.semester && course.semester.trim() === selectedSemester.trim()
      );
    }
    
    // Debug logging for the assignment results
    console.log(`Debug - Faculty ${f.name} assignment results:`, {
      facultyCoursesFound: facultyCourses.length,
      facultyCoursesDetails: facultyCourses.map(c => ({ 
        id: c.id, 
        code: c.code, 
        semester: c.semester 
      }))
    });
    
    console.log(`Debug - Faculty ${f.name} final result:`, {
      facultyCoursesCount: facultyCourses.length,
      facultyCourses: facultyCourses.map(c => ({ id: c.id, code: c.code }))
    });
    
    // Calculate total load hours for this semester
    const semesterLoadHours = facultyCourses.reduce((total, course) => 
      total + calculateHoursFromString(course.weeklyHours), 0);
    
    // Determine faculty status based on load
    const loadPercentage = (semesterLoadHours / f.maxHours) * 100;
    let status = 'available';
    if (loadPercentage > 90) {
      status = 'overloaded';
    } else if (loadPercentage > 70) {
      status = 'nearlyFull';
    }
    
    return {
      ...f,
      semesterLoadHours,
      loadPercentage,
      status,
      facultyCourses
    };
  });
  
  return enhancedFacultyData;
};

// Get filtered faculty data
export const getFilteredFacultyData = (faculty, courses, selectedSemester, showOverloadedOnly, searchQuery) => {
  const enhancedData = getFacultyWithLoadData(faculty, courses, selectedSemester);
  
  let filtered = enhancedData;
  
  // Apply overloaded filter if selected
  if (showOverloadedOnly) {
    filtered = filtered.filter(f => f.status === 'overloaded');
  }
  
  // Apply search filter if any
  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(f => 
      f.name.toLowerCase().includes(query) || 
      f.facultyCourses.some(c => 
        c.code.toLowerCase().includes(query) || 
        c.title.toLowerCase().includes(query)
      )
    );
  }
  
  return filtered;
};

/**
 * Generate a faculty load report and save it to Firebase
 * @param {string} departmentId - Department ID
 * @param {string} selectedSemester - Selected semester for the report
 * @param {Array} filteredFacultyData - Faculty data with load information
 * @returns {Promise<Object>} - Result of report generation
 */
export const generateReport = async (departmentId, selectedSemester, filteredFacultyData) => {
  try {
    // Prepare report data
    const reportData = {
      departmentId: departmentId,
      semester: selectedSemester,
      generatedAt: serverTimestamp(),
      facultyCount: filteredFacultyData.length,
      overloadedCount: filteredFacultyData.filter(f => f.status === 'overloaded').length,
      nearlyFullCount: filteredFacultyData.filter(f => f.status === 'nearlyFull').length,
      availableCount: filteredFacultyData.filter(f => f.status === 'available').length,
      facultyData: filteredFacultyData.map(f => ({
        id: f.id,
        name: f.name,
        loadPercentage: f.loadPercentage,
        status: f.status,
        semesterLoadHours: f.semesterLoadHours,
        maxHours: f.maxHours
      }))
    };
    
    // Save report to Firebase
    const reportsRef = collection(db, REPORTS_COLLECTION);
    const reportDocRef = await addDoc(reportsRef, reportData);
    
    // Log activity
    await logActivity(departmentId, 'report', `Faculty load report generated for ${selectedSemester}`);
    
    return { 
      success: true, 
      message: 'Report generated successfully',
      reportId: reportDocRef.id
    };
  } catch (error) {
    console.error('Error generating report:', error);
    return { 
      success: false, 
      message: 'Error generating report: ' + error.message
    };
  }
};

/**
 * Email faculty load report to department faculty
 * @param {string} departmentId - Department ID
 * @param {string} selectedSemester - Selected semester
 * @returns {Promise<Object>} - Result of email operation
 */
export const emailFacultyReport = async (departmentId, selectedSemester) => {
  try {
    // In a real implementation, this would connect to a Cloud Function
    // that sends emails. For now, we'll just log an activity.
    
    // Log activity
    await logActivity(departmentId, 'report', `Faculty load report for ${selectedSemester} emailed to faculty`);
    
    // In production, you'd call a Firebase Cloud Function here
    // await callCloudFunction('sendFacultyLoadReportEmails', { 
    //   departmentId, 
    //   semester: selectedSemester 
    // });
    
    // Simulate delay for demo purposes
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return { success: true, message: 'Report emailed to faculty successfully' };
  } catch (error) {
    console.error('Error emailing report:', error);
    return { 
      success: false, 
      message: 'Error emailing report: ' + error.message
    };
  }
};

/**
 * Export report in specified format
 * @param {string} format - Export format (PDF, Excel, CSV)
 * @param {string} reportId - ID of the report to export
 * @returns {Promise<Object>} - Result of export operation
 */
export const exportReportAs = async (format, reportId) => {
  try {
    // In a real implementation, this would generate a file in the specified format
    // For now we'll just log the action
    
    // Get report data if reportId is provided
    let reportData = null;
    if (reportId) {
      const reportRef = doc(db, REPORTS_COLLECTION, reportId);
      const reportSnapshot = await getDoc(reportRef);
      
      if (reportSnapshot.exists()) {
        reportData = reportSnapshot.data();
      }
    }
    
    // In production, you'd call a Firebase Cloud Function here
    // const downloadUrl = await callCloudFunction('generateReportFile', { 
    //   format, 
    //   reportId,
    //   reportData
    // });
    
    // Simulate delay for demo purposes
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return { 
      success: true, 
      message: `Report exported in ${format} format`,
      // downloadUrl: downloadUrl // In a real implementation
    };
  } catch (error) {
    console.error(`Error exporting report as ${format}:`, error);
    return { 
      success: false, 
      message: `Error exporting report as ${format}: ` + error.message
    };
  }
};