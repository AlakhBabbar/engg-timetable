import { useState, useEffect, useContext } from 'react';
import { FiAlertCircle, FiCheck, FiRefreshCw, FiStar, FiUsers, FiLoader, FiDatabase, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { AuthContext } from '../../App'; // Import AuthContext from App.jsx
import { 
  fetchCourses,
  fetchFaculty,
  assignFacultyToCourse,
  removeFacultyFromCourse,
  autoAssignFaculty,
  saveAssignments,
  getTimeSlots, 
  filterFacultyBySearch,
  getFacultyWorkloadStats,
  getCourseAssignmentStats,
  checkFirebaseConnection,
  clearAllAssignments,
  discardChanges,
  hasUnsavedChanges,
  getPendingChangesSummary
} from './services/FacultyAssignment';
import { initializeAllSampleData, initializeSampleCoursesForSemester } from './services/SampleDataInitializer';
import { useToast } from '../../context/ToastContext';
import { useSemester } from '../../context/SemesterContext';

// Component for displaying a faculty card
const FacultyCard = ({ faculty, selectedCourse, onAssign, assignedCourses }) => {
  // Calculate load percentage
  const loadPercentage = Math.min(100, Math.round((faculty.loadHours / faculty.maxHours) * 100));
  
  // Count how many hours this faculty is assigned in current selection (including co-faculty assignments)
  const currentAssignedHours = assignedCourses
    .filter(course => {
      const facultyList = course.facultyList || (course.faculty ? [course.faculty] : []);
      return facultyList.includes(faculty.id);
    })
    .reduce((total, course) => {
      const facultyList = course.facultyList || (course.faculty ? [course.faculty] : []);
      const totalCourseHours = getTimeSlots(course.weeklyHours);
      // Distribute hours proportionally among all assigned faculty
      const hoursPerFaculty = Math.ceil(totalCourseHours / facultyList.length);
      return total + hoursPerFaculty;
    }, 0);
  
  // Determine if faculty is compatible with selected course
  const isCompatible = selectedCourse && (
    faculty.expertise.some(exp => selectedCourse.tags.includes(exp)) ||
    faculty.preferredCourses.includes(selectedCourse.code)
  );

  // Check if faculty is already assigned to the selected course
  const isAssignedToCourse = selectedCourse && (
    selectedCourse.faculty === faculty.id ||
    (selectedCourse.facultyList && selectedCourse.facultyList.includes(faculty.id))
  );

  // Check if this is the primary faculty for the course
  const isPrimaryFaculty = selectedCourse && selectedCourse.faculty === faculty.id;
  
  const statusColors = {
    available: 'bg-green-500',
    nearlyFull: 'bg-yellow-500',
    overloaded: 'bg-red-500'
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={`p-4 border rounded-xl transition-all duration-200 shadow-sm
                 ${selectedCourse && isCompatible ? 'ring-2 ring-teal-400 bg-teal-50' : 'bg-white'}
                 ${selectedCourse && !isCompatible ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <img 
            src={faculty.avatar} 
            alt={faculty.name} 
            className="w-12 h-12 rounded-full object-cover border-2 border-gray-100" 
          />
          <span 
            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${statusColors[faculty.status]}`}
          ></span>
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-800">{faculty.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="bg-gray-100 rounded-full h-1.5 flex-1">
              <div 
                className={`h-1.5 rounded-full ${
                  loadPercentage > 90 ? 'bg-red-500' : 
                  loadPercentage > 70 ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`} 
                style={{ width: `${loadPercentage}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {faculty.loadHours}/{faculty.maxHours}h
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-3 flex flex-wrap gap-1.5">
        {faculty.expertise.map((exp, index) => (
          <span 
            key={index} 
            className={`text-xs px-2 py-0.5 rounded-full 
                      ${selectedCourse && selectedCourse.tags.includes(exp) 
                        ? 'bg-teal-100 text-teal-700' 
                        : 'bg-gray-100 text-gray-600'}`}
          >
            {exp}
          </span>
        ))}
      </div>
      
      {selectedCourse && (
        <div className="mt-3 space-y-2">
          {/* Primary Assignment Button */}
          <button
            onClick={() => onAssign(faculty.id, true)} // true = replace/primary
            disabled={faculty.status === 'overloaded' && !isAssignedToCourse}
            className={`w-full py-1.5 px-3 rounded-lg text-sm text-center transition
                      ${isPrimaryFaculty 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200 font-medium' 
                        : faculty.status === 'overloaded'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white border border-gray-200 hover:bg-blue-50 text-gray-700'}`}
          >
            {isPrimaryFaculty ? '★ Primary Faculty' : 'Set as Primary'}
          </button>

          {/* Additional Assignment Button */}
          {!isPrimaryFaculty && (
            <button
              onClick={() => onAssign(faculty.id, false)} // false = add additional
              disabled={faculty.status === 'overloaded' && !isAssignedToCourse}
              className={`w-full py-1.5 px-3 rounded-lg text-sm text-center transition
                        ${isAssignedToCourse 
                          ? 'bg-teal-100 text-teal-700 border border-teal-200' 
                          : faculty.status === 'overloaded'
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white border border-gray-200 hover:bg-teal-50 text-gray-700'}`}
            >
              {isAssignedToCourse ? '+ Co-Faculty' : '+ Add as Co-Faculty'}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

// Component for displaying a course card
const CourseCard = ({ course, isSelected, onClick, faculty, onRemoveFaculty }) => {
  const handleRemoveClick = (e, facultyId) => {
    e.stopPropagation(); // Prevent triggering the card's onClick
    if (onRemoveFaculty) {
      onRemoveFaculty(course.id, facultyId);
    }
  };

  // Get all faculty assigned to this course
  const facultyList = course.facultyList || (course.faculty ? [course.faculty] : []);
  const assignedFaculty = faculty.filter(f => facultyList.includes(f.id));
  const primaryFaculty = faculty.find(f => f.id === course.faculty);

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 border rounded-xl cursor-pointer transition-all duration-200
                 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white hover:shadow-md'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-blue-700 font-medium">{course.code}</h3>
          <h4 className="font-medium text-gray-800 mt-1">{course.title}</h4>
          <p className="text-sm text-gray-500 mt-1">
            {course.semester} • {course.weeklyHours}
          </p>
        </div>
        {facultyList.length > 1 && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            {facultyList.length} Faculty
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {course.tags.map((tag, index) => (
          <span 
            key={index} 
            className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"
          >
            {tag}
          </span>
        ))}
      </div>
      
      {facultyList.length > 0 && (
        <div className="mt-3 border-t pt-2 space-y-2">
          {/* Primary Faculty */}
          {primaryFaculty && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img 
                  src={primaryFaculty.avatar || 'https://via.placeholder.com/32'} 
                  alt={primaryFaculty.name} 
                  className="w-6 h-6 rounded-full object-cover" 
                />
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-600 truncate">
                    {primaryFaculty.name}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                    ★ Primary
                  </span>
                </div>
              </div>
              {onRemoveFaculty && (
                <button
                  onClick={(e) => handleRemoveClick(e, primaryFaculty.id)}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                  title="Remove primary faculty"
                >
                  <FiX className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Co-Faculty */}
          {assignedFaculty
            .filter(f => f.id !== course.faculty)
            .map((coFaculty) => (
              <div key={coFaculty.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img 
                    src={coFaculty.avatar || 'https://via.placeholder.com/32'} 
                    alt={coFaculty.name} 
                    className="w-5 h-5 rounded-full object-cover" 
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-600 truncate">
                      {coFaculty.name}
                    </span>
                    <span className="text-xs bg-teal-100 text-teal-600 px-1.5 py-0.5 rounded">
                      Co-Faculty
                    </span>
                  </div>
                </div>
                {onRemoveFaculty && (
                  <button
                    onClick={(e) => handleRemoveClick(e, coFaculty.id)}
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                    title="Remove co-faculty"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
        </div>
      )}
    </motion.div>
  );
};

export default function FacultyAssignment() {
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [filteredFaculty, setFilteredFaculty] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [initializingData, setInitializingData] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [clearingAssignments, setClearingAssignments] = useState(false);
  const [discardingChanges, setDiscardingChanges] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  const { showSuccess, showError } = useToast();
  const { user } = useContext(AuthContext); // Get authenticated user data
  const { selectedSemester, availableSemesters, loading: loadingSemesters, selectSemester } = useSemester();
  
  // Get department from authenticated HOD user
  const departmentId = user?.department || 'Computer Science'; // Default fallback
  
  // Load data from Firebase on component mount
  useEffect(() => {
    const loadData = async () => {
      // Skip loading if user data is not available yet
      if (!user?.department) {
        console.log('Waiting for user authentication...');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setConnectionError(false);
        
        // Check Firebase connection first
        const isConnected = await checkFirebaseConnection();
        if (!isConnected) {
          setConnectionError(true);
          showError('Unable to connect to database. Please check your internet connection.');
          return;
        }
        
        // Fetch existing data from Firebase for HOD's department
        const [coursesData, facultyData] = await Promise.all([
          fetchCourses(departmentId),
          fetchFaculty(departmentId)
        ]);
        
        setCourses(coursesData);
        setFaculty(facultyData);
        setFilteredFaculty(facultyData);
        
        console.log(`Loaded ${coursesData.length} courses and ${facultyData.length} faculty members from Firebase for department: ${departmentId}`);
      } catch (error) {
        console.error('Error loading data:', error);
        setConnectionError(true);
        showError('Error loading data. Please try again.');
        // Set empty arrays to allow the user to manually add data
        setCourses([]);
        setFaculty([]);
        setFilteredFaculty([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [departmentId, user?.department, showError]);
  
  // Clear course selection when semester changes from context
  useEffect(() => {
    setSelectedCourse(null);
  }, [selectedSemester]);

  // Local function to calculate faculty load from courses
  const updateFacultyLoadFromCourses = (courses, facultyList) => {
    // Create a copy of the faculty array to avoid modifying the original
    const updatedFaculty = [...facultyList];
    
    // Reset load hours for all faculty members
    updatedFaculty.forEach(f => {
      f.loadHours = 0;
    });
    
    // Calculate load hours based on assigned courses (including co-faculty)
    courses.forEach(course => {
      const courseFacultyList = course.facultyList || (course.faculty ? [course.faculty] : []);
      
      if (courseFacultyList.length > 0) {
        const totalCourseHours = getTimeSlots(course.weeklyHours);
        // Distribute hours proportionally among all assigned faculty
        const hoursPerFaculty = Math.ceil(totalCourseHours / courseFacultyList.length);
        
        courseFacultyList.forEach(facultyId => {
          const facultyMember = updatedFaculty.find(f => f.id === facultyId);
          if (facultyMember) {
            facultyMember.loadHours += hoursPerFaculty;
          }
        });
      }
    });
    
    // Update status of all faculty members based on load percentage
    updatedFaculty.forEach(f => {
      const loadPercentage = (f.loadHours / f.maxHours) * 100;
      if (loadPercentage > 90) {
        f.status = 'overloaded';
      } else if (loadPercentage > 70) {
        f.status = 'nearlyFull';
      } else {
        f.status = 'available';
      }
    });
    
    return updatedFaculty;
  };
  
  // Update faculty load data whenever course assignments change
  useEffect(() => {
    if (faculty.length > 0) {
      const updatedFaculty = updateFacultyLoadFromCourses(courses, faculty);
      setFaculty(updatedFaculty);
    }
  }, [courses]);

  // Filter faculty based on search term
  useEffect(() => {
    const filtered = filterFacultyBySearch(faculty, searchTerm);
    setFilteredFaculty(filtered);
  }, [searchTerm, faculty]);

  // Monitor unsaved changes from the service
  useEffect(() => {
    const checkUnsavedChanges = () => {
      const serviceHasChanges = hasUnsavedChanges();
      if (serviceHasChanges !== unsavedChanges) {
        console.log('Syncing unsaved changes state:', serviceHasChanges);
        setUnsavedChanges(serviceHasChanges);
      }
    };

    // Check immediately
    checkUnsavedChanges();

    // Set up an interval to check for changes
    const interval = setInterval(checkUnsavedChanges, 500);

    return () => clearInterval(interval);
  }, [courses, faculty, unsavedChanges]); // Re-run when data changes

  const handleSelectCourse = (course) => {
    // If the course is already selected, deselect it by setting selectedCourse to null
    if (selectedCourse && selectedCourse.id === course.id) {
      setSelectedCourse(null);
    } else {
      setSelectedCourse(course);
    }
  };

  const handleAssignFaculty = async (facultyId, replace = true) => {
    if (!selectedCourse) return;
    
    try {
      const result = await assignFacultyToCourse(departmentId, selectedCourse.id, facultyId, replace);
      
      if (result.success) {
        // Get updated data from local state (no Firebase refetch needed)
        const [updatedCourses, updatedFaculty] = await Promise.all([
          fetchCourses(departmentId),
          fetchFaculty(departmentId)
        ]);
        setCourses(updatedCourses);
        setFaculty(updatedFaculty);
        
        // Update selected course
        const updatedSelectedCourse = updatedCourses.find(c => c.id === selectedCourse.id);
        setSelectedCourse(updatedSelectedCourse);
        
        // Sync unsaved changes state immediately
        setUnsavedChanges(hasUnsavedChanges());
        
        const assignmentType = replace ? 'Primary faculty assigned' : 'Co-faculty added';
        showSuccess(`${assignmentType} successfully! (Unsaved)`);
      } else {
        showError(result.message || 'Failed to assign faculty');
      }
    } catch (error) {
      console.error('Error assigning faculty:', error);
      showError('Error assigning faculty. Please try again.');
    }
  };

  const handleRemoveFaculty = async (courseId, facultyId) => {
    try {
      const result = await removeFacultyFromCourse(departmentId, courseId, facultyId);
      
      if (result.success) {
        // Get updated data from local state (no Firebase refetch needed)
        const [updatedCourses, updatedFaculty] = await Promise.all([
          fetchCourses(departmentId),
          fetchFaculty(departmentId)
        ]);
        setCourses(updatedCourses);
        setFaculty(updatedFaculty);
        
        // Update selected course if it was the one modified
        if (selectedCourse && selectedCourse.id === courseId) {
          const updatedSelectedCourse = updatedCourses.find(c => c.id === courseId);
          setSelectedCourse(updatedSelectedCourse);
        }
        
        // Sync unsaved changes state immediately
        setUnsavedChanges(hasUnsavedChanges());
        
        showSuccess(`${result.message} (Unsaved)`);
      } else {
        showError(result.message || 'Failed to remove faculty assignment');
      }
    } catch (error) {
      console.error('Error removing faculty assignment:', error);
      showError('Error removing faculty assignment. Please try again.');
    }
  };

  // Auto-assign faculty to courses based on expertise and availability
  const handleAutoAssign = async () => {
    try {
      setAutoAssigning(true);
      
      // Filter courses by selected semester for auto-assignment
      const semesterCourses = selectedSemester ? courses.filter(c => c.semester === selectedSemester) : courses;
      
      const result = await autoAssignFaculty(departmentId, semesterCourses, faculty);
      
      if (result.success) {
        // Get updated data from local state (no Firebase refetch needed)
        const [updatedCourses, updatedFaculty] = await Promise.all([
          fetchCourses(departmentId),
          fetchFaculty(departmentId)
        ]);
        setCourses(updatedCourses);
        setFaculty(updatedFaculty);
        
        // Update selected course if one was selected
        if (selectedCourse) {
          const updatedSelectedCourse = updatedCourses.find(c => c.id === selectedCourse.id);
          setSelectedCourse(updatedSelectedCourse);
        }
        
        // Sync unsaved changes state immediately
        setUnsavedChanges(hasUnsavedChanges());
        
        showSuccess(`${result.message} (for ${selectedSemester || 'all semesters'}) - Unsaved changes`);
      } else {
        showError(result.message || 'Auto-assignment failed');
      }
    } catch (error) {
      console.error('Error auto-assigning faculty:', error);
      showError('Error during auto-assignment. Please try again.');
    } finally {
      setAutoAssigning(false);
    }
  };

  // Save assignments
  const handleSaveAssignments = async () => {
    try {
      setSaving(true);
      const result = await saveAssignments(departmentId);
      
      if (result.success) {
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 3000);
        // Sync with service state after save
        setUnsavedChanges(hasUnsavedChanges());
        showSuccess(result.message);
      } else {
        showError(result.message || 'Failed to save assignments');
      }
    } catch (error) {
      console.error('Error saving assignments:', error);
      showError('Error saving assignments. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Manual sample data initialization
  const handleInitializeSampleData = async () => {
    try {
      setInitializingData(true);
      const initSuccess = await initializeAllSampleData(departmentId);
      
      if (initSuccess) {
        // Refetch data after initialization
        const [coursesData, facultyData] = await Promise.all([
          fetchCourses(departmentId),
          fetchFaculty(departmentId)
        ]);
        setCourses(coursesData);
        setFaculty(facultyData);
        setFilteredFaculty(facultyData);
        showSuccess('Sample data initialized successfully!');
      } else {
        showError('Failed to initialize sample data');
      }
    } catch (error) {
      console.error('Error initializing sample data:', error);
      showError('Error initializing sample data. Please try again.');
    } finally {
      setInitializingData(false);
    }
  };

  // Semester-specific sample course initialization
  const handleInitializeSampleCoursesForSemester = async () => {
    if (!selectedSemester) {
      showError('Please select a semester first');
      return;
    }
    
    try {
      setInitializingData(true);
      const initSuccess = await initializeSampleCoursesForSemester(departmentId, selectedSemester);
      
      if (initSuccess) {
        // Refetch data after initialization
        const [coursesData, facultyData] = await Promise.all([
          fetchCourses(departmentId),
          fetchFaculty(departmentId)
        ]);
        setCourses(coursesData);
        setFaculty(facultyData);
        setFilteredFaculty(facultyData);
        showSuccess(`Sample courses initialized for ${selectedSemester}!`);
      } else {
        showError('Failed to initialize sample courses');
      }
    } catch (error) {
      console.error('Error initializing sample courses:', error);
      showError('Error initializing sample courses. Please try again.');
    } finally {
      setInitializingData(false);
    }
  };

  // Refresh data function
  const handleRefreshData = async () => {
    if (!user?.department) {
      showError('User authentication required to refresh data.');
      return;
    }

    try {
      setLoading(true);
      setConnectionError(false);
      
      // Check connection first
      const isConnected = await checkFirebaseConnection();
      if (!isConnected) {
        setConnectionError(true);
        showError('Unable to connect to database. Please check your internet connection.');
        return;
      }
      
      const [coursesData, facultyData] = await Promise.all([
        fetchCourses(departmentId),
        fetchFaculty(departmentId)
      ]);
      
      setCourses(coursesData);
      setFaculty(facultyData);
      setFilteredFaculty(facultyData);
      setSelectedCourse(null); // Clear selection on refresh
      
      showSuccess(`Refreshed data: ${coursesData.length} courses, ${facultyData.length} faculty members`);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setConnectionError(true);
      showError('Error refreshing data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Clear all assignments
  const handleClearAllAssignments = async () => {
    // Confirm before clearing
    const confirmClear = window.confirm(
      'Are you sure you want to clear ALL faculty assignments? This will remove all faculty from all courses. This action can be undone by discarding changes if you haven\'t saved yet.'
    );
    
    if (!confirmClear) return;
    
    try {
      setClearingAssignments(true);
      const result = await clearAllAssignments(departmentId);
      
      if (result.success) {
        // Get updated data from local state (no Firebase refetch needed)
        const [updatedCourses, updatedFaculty] = await Promise.all([
          fetchCourses(departmentId),
          fetchFaculty(departmentId)
        ]);
        setCourses(updatedCourses);
        setFaculty(updatedFaculty);
        
        // Clear selected course
        setSelectedCourse(null);
        
        // Sync unsaved changes state immediately
        setUnsavedChanges(hasUnsavedChanges());
        
        showSuccess(`${result.message} (Unsaved)`);
      } else {
        showError(result.message || 'Failed to clear assignments');
      }
    } catch (error) {
      console.error('Error clearing assignments:', error);
      showError('Error clearing assignments. Please try again.');
    } finally {
      setClearingAssignments(false);
    }
  };

  // Discard unsaved changes
  const handleDiscardChanges = async () => {
    // Confirm before discarding
    const confirmDiscard = window.confirm(
      'Are you sure you want to discard all unsaved changes? This will revert all assignments back to the last saved state. This action cannot be undone.'
    );
    
    if (!confirmDiscard) return;
    
    try {
      setDiscardingChanges(true);
      await discardChanges(departmentId);
      
      // Get reverted data from local state (service handles the revert to original Firebase state)
      const [originalCourses, originalFaculty] = await Promise.all([
        fetchCourses(departmentId),
        fetchFaculty(departmentId)
      ]);
      setCourses(originalCourses);
      setFaculty(originalFaculty);
      
      // Clear selected course
      setSelectedCourse(null);
      // Sync with service state after discarding
      setUnsavedChanges(hasUnsavedChanges());
      
      showSuccess('All unsaved changes have been discarded');
    } catch (error) {
      console.error('Error discarding changes:', error);
      showError('Error discarding changes. Please try again.');
    } finally {
      setDiscardingChanges(false);
    }
  };

  // Calculate statistics for the selected semester
  const semesterCourses = selectedSemester ? courses.filter(c => c.semester === selectedSemester) : courses;
  const courseStats = getCourseAssignmentStats(semesterCourses);
  
  // For faculty stats, use the actual faculty load hours from the service
  // but filter the course assignments by semester for counting purposes
  const semesterAwareFaculty = faculty.map(f => {
    // Count courses assigned to this faculty in the selected semester
    const semesterAssignedCount = semesterCourses.filter(course => {
      const facultyList = course.facultyList || (course.faculty ? [course.faculty] : []);
      return facultyList.includes(f.id);
    }).length;
    
    // Calculate load hours for this semester only (for display purposes)
    const semesterLoadHours = semesterCourses
      .filter(course => {
        const facultyList = course.facultyList || (course.faculty ? [course.faculty] : []);
        return facultyList.includes(f.id);
      })
      .reduce((total, course) => {
        const facultyList = course.facultyList || (course.faculty ? [course.faculty] : []);
        const hoursPerFaculty = Math.ceil(getTimeSlots(course.weeklyHours) / facultyList.length);
        return total + hoursPerFaculty;
      }, 0);
    
    // Use the actual load hours from the service for overall stats
    // but show semester-specific hours in the display
    return {
      ...f,
      semesterLoadHours: semesterLoadHours, // Keep semester-specific for display
      semesterAssignedCount: semesterAssignedCount
      // Don't override loadHours - keep the actual hours from the service
    };
  });
  
  const facultyStats = getFacultyWorkloadStats(faculty); // Use actual faculty data, not modified
  
  // Show loading state
  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            {!user ? 'Authenticating...' : 'Loading faculty and courses...'}
          </p>
          <p className="text-sm text-gray-500">
            {!user ? 'Please wait while we verify your credentials' : 'This may take a moment if initializing sample data'}
          </p>
        </div>
      </div>
    );
  }

  // Show authentication required state
  if (!user?.department) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Authentication Required</h3>
          <p className="text-gray-500 mb-6">
            Please log in as an HOD to access faculty assignment features.
            <br />
            Your department information is required to load relevant data.
          </p>
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (courses.length === 0 && faculty.length === 0) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Faculty Assignment
        </h1>
        <div className="text-center py-12">
          <FiDatabase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Data Found</h3>
          <p className="text-gray-500 mb-6">
            No courses or faculty data found for this department.
            <br />
            You can either initialize sample data to get started or add data manually.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleInitializeSampleData}
              disabled={initializingData}
              className="px-6 py-3 rounded-lg bg-teal-600 text-white hover:bg-teal-700 
                       transition flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initializingData ? <FiLoader className="animate-spin" /> : <FiDatabase />}
              <span>{initializingData ? 'Initializing...' : '📊 Initialize Sample Data'}</span>
            </button>
            <p className="text-sm text-gray-400 self-center px-4">or</p>
            <button
              onClick={() => showSuccess('Manual data entry feature coming soon!')}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 
                       transition flex items-center gap-2 justify-center"
            >
              <span>➕ Add Data Manually</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 relative bg-gray-50 min-h-screen">
      <div className="flex items-center gap-4 mb-2">
        <h1 className="text-2xl font-bold text-gray-800">
          Faculty Assignment
        </h1>
        {unsavedChanges && (
          <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-lg">
            <FiAlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Unsaved Changes</span>
          </div>
        )}
      </div>
      
      {/* Data source indicator and stats */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 text-sm">
          <FiDatabase className="text-teal-600" />
          <span className="text-gray-600">
           Department: {departmentId}
          </span>
          {user?.name && (
            <span className="text-blue-600 font-medium">
              • HOD: {user.name}
            </span>
          )}
          {courses.length > 0 || faculty.length > 0 ? (
            <span className="text-green-600 font-medium">
              • {courses.length} courses, {faculty.length} faculty members
            </span>
          ) : null}
          <button
            onClick={handleRefreshData}
            disabled={loading}
            className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition"
            title="Refresh data"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* Partial data warnings */}
        {(courses.length === 0 && faculty.length > 0) && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">
            <FiAlertCircle />
            <span>No courses found. Add courses to enable assignments.</span>
          </div>
        )}
        {(faculty.length === 0 && courses.length > 0) && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">
            <FiAlertCircle />
            <span>No faculty found. Add faculty to enable assignments.</span>
          </div>
        )}
      </div>
      
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search faculty by name or expertise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      
      {/* Auto-assign and data management buttons */}
      <div className="mb-6 flex gap-4 flex-wrap items-center">
        <button
          onClick={handleAutoAssign}
          disabled={autoAssigning || semesterCourses.length === 0 || faculty.length === 0}
          className="px-6 py-2 rounded-lg border border-teal-500 text-teal-600 hover:bg-teal-50 
                   transition flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiRefreshCw className={`${autoAssigning ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
          <span>{autoAssigning ? 'Auto Assigning...' : `🔄 Auto Assign${selectedSemester ? ` (${selectedSemester})` : ''}`}</span>
        </button>
        
        {/* Clear All Assignments Button */}
        {semesterCourses.some(course => course.faculty || (course.facultyList && course.facultyList.length > 0)) && (
          <button
            onClick={handleClearAllAssignments}
            disabled={clearingAssignments}
            className="px-6 py-2 rounded-lg border border-red-500 text-red-600 hover:bg-red-50 
                     transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clearingAssignments ? <FiLoader className="animate-spin" /> : <FiAlertCircle />}
            <span>{clearingAssignments ? 'Clearing...' : `🗑️ Clear${selectedSemester ? ` ${selectedSemester}` : ' All'} Assignments`}</span>
          </button>
        )}
        
        {/* Discard Changes Button */}
        {unsavedChanges && (
          <button
            onClick={handleDiscardChanges}
            disabled={discardingChanges}
            className="px-6 py-2 rounded-lg border border-orange-500 text-orange-600 hover:bg-orange-50 
                     transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {discardingChanges ? <FiLoader className="animate-spin" /> : <FiRefreshCw />}
            <span>{discardingChanges ? 'Discarding...' : '↶ Discard Changes'}</span>
          </button>
        )}
        
        {(semesterCourses.length === 0 || faculty.length === 0) && (
          <button
            onClick={semesterCourses.length === 0 ? handleInitializeSampleCoursesForSemester : handleInitializeSampleData}
            disabled={initializingData}
            className="px-6 py-2 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 
                     transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initializingData ? <FiLoader className="animate-spin" /> : <FiDatabase />}
            <span>{initializingData ? 'Initializing...' : 
              semesterCourses.length === 0 && faculty.length === 0 ? '📊 Initialize Sample Data' :
              semesterCourses.length === 0 ? `📚 Add Sample Courses (${selectedSemester})` : '👥 Add Sample Faculty'}</span>
          </button>
        )}
        
        <div className="flex items-center text-sm text-gray-500">
          <FiAlertCircle className="inline-block mr-1" />
          <span>
            {semesterCourses.length === 0 || faculty.length === 0 
              ? `Both courses and faculty are required for auto-assignment${selectedSemester ? ` (${selectedSemester})` : ''}`
              : `Auto-assign matches faculty to ${selectedSemester ? `${selectedSemester} ` : ''}courses. Click a course, then use ★ Primary or + Co-Faculty buttons. Use ❌ to remove individual assignments. Changes are saved locally until you click Save.`
            }
          </span>
        </div>
      </div>
      
      {/* Statistics Dashboard */}
      {(courses.length > 0 || faculty.length > 0) && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Course Assignment Stats */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2 mb-2">
              <FiDatabase className="text-blue-600" />
              <h3 className="font-medium text-gray-700">Course Assignments</h3>
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {courseStats.assigned}/{courseStats.totalCourses}
            </div>
            <div className="text-sm text-gray-500">
              {courseStats.assignmentPercentage}% assigned
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${courseStats.assignmentPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Faculty Workload Stats */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2 mb-2">
              <FiUsers className="text-green-600" />
              <h3 className="font-medium text-gray-700">Faculty Load</h3>
            </div>
            <div className="text-2xl font-bold text-green-600 mb-1">
              {facultyStats.averageLoad}h
            </div>
            <div className="text-sm text-gray-500">
              avg per faculty
            </div>
            <div className="flex gap-1 mt-2">
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{facultyStats.available}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>{facultyStats.nearlyFull}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>{facultyStats.overloaded}</span>
              </div>
            </div>
          </div>

          {/* Unassigned Courses */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2 mb-2">
              <FiAlertCircle className="text-orange-600" />
              <h3 className="font-medium text-gray-700">Pending</h3>
            </div>
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {courseStats.unassigned}
            </div>
            <div className="text-sm text-gray-500">
              unassigned courses
            </div>
          </div>

          {/* Total Teaching Hours */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2 mb-2">
              <FiStar className="text-purple-600" />
              <h3 className="font-medium text-gray-700">Total Hours</h3>
            </div>
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {facultyStats.totalHours}h
            </div>
            <div className="text-sm text-gray-500">
              assigned
            </div>
          </div>
        </div>
      )}
      
      {/* Main content: 2-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Courses */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
            <h2 className="text-lg font-medium text-gray-700">
              Courses ({selectedSemester ? courses.filter(c => c.semester === selectedSemester).length : courses.length})
              {selectedCourse && (
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="ml-3 text-sm text-blue-600 hover:text-blue-800 font-normal"
                >
                  (Clear selection)
                </button>
              )}
            </h2>
            
            {/* Semester Info Display */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">
                Current Semester:
              </span>
              <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {selectedSemester || 'No semester selected'}
              </span>
              <span className="text-xs text-gray-500">
                (Managed from header dropdown)
              </span>
            </div>
          </div>
          
          {/* Show courses filtered by semester */}
          {selectedSemester && courses.filter(c => c.semester === selectedSemester).length === 0 ? (
            <div className="bg-white p-8 rounded-lg text-center border-2 border-dashed border-gray-300">
              <FiDatabase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Courses Found for {selectedSemester}</h3>
              <p className="text-gray-500 mb-4">
                No courses available for the selected semester
              </p>
              <button
                onClick={handleInitializeSampleCoursesForSemester}
                disabled={initializingData}
                className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 
                         transition disabled:opacity-50"
              >
                {initializingData ? 'Adding...' : `Add Sample Courses for ${selectedSemester}`}
              </button>
            </div>
          ) : courses.length === 0 ? (
            <div className="bg-white p-8 rounded-lg text-center border-2 border-dashed border-gray-300">
              <FiDatabase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Courses Found</h3>
              <p className="text-gray-500 mb-4">
                Add courses to start faculty assignments
              </p>
              <button
                onClick={handleInitializeSampleData}
                disabled={initializingData}
                className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 
                         transition disabled:opacity-50"
              >
                Add Sample Courses
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {courses
                .filter(course => !selectedSemester || course.semester === selectedSemester)
                .map(course => {
                  return (
                    <CourseCard 
                      key={course.id} 
                      course={course} 
                      isSelected={selectedCourse?.id === course.id}
                      onClick={() => handleSelectCourse(course)}
                      faculty={faculty} // Pass full faculty array for multiple faculty support
                      onRemoveFaculty={handleRemoveFaculty}
                    />
                  );
                })}
            </div>
          )}
        </div>
        
        {/* Right Column: Faculty */}
        <div>
          <h2 className="text-lg font-medium text-gray-700 mb-4">
            Faculty ({faculty.length})
            {selectedCourse && (
              <span className="ml-3 text-sm text-gray-500 font-normal">
                Assigning for: {selectedCourse.code}
              </span>
            )}
          </h2>
          
          {faculty.length === 0 ? (
            <div className="bg-white p-8 rounded-lg text-center border-2 border-dashed border-gray-300">
              <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Faculty Found</h3>
              <p className="text-gray-500 mb-4">
                Add faculty members to start course assignments
              </p>
              <button
                onClick={handleInitializeSampleData}
                disabled={initializingData}
                className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 
                         transition disabled:opacity-50"
              >
                Add Sample Faculty
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center mb-3 gap-6">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="text-xs text-gray-600">Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="text-xs text-gray-600">Nearly Full</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-xs text-gray-600">Overloaded</span>
                </div>
              </div>

              {selectedCourse && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FiUsers className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">
                      Multiple Faculty Assignment
                    </span>
                  </div>
                  <p className="text-xs text-blue-600">
                    • <strong>★ Primary Faculty:</strong> Sets the main instructor for the course<br/>
                    • <strong>+ Co-Faculty:</strong> Adds additional faculty to share teaching load<br/>
                    • Each faculty member gets a proportional share of course hours
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-4">
                {filteredFaculty.map(f => (
                  <FacultyCard 
                    key={f.id} 
                    faculty={f} 
                    selectedCourse={selectedCourse}
                    onAssign={handleAssignFaculty}
                    assignedCourses={courses}
                  />
                ))}
                
                {filteredFaculty.length === 0 && faculty.length > 0 && (
                  <div className="bg-white p-6 rounded-lg text-center text-gray-500">
                    No faculty found matching your search criteria
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Connection Error Banner */}
      {connectionError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <FiAlertCircle className="text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-red-800">Connection Error</h3>
              <p className="text-sm text-red-700 mt-1">
                Unable to connect to the database. Please check your internet connection and try refreshing.
              </p>
            </div>
            <button
              onClick={handleRefreshData}
              disabled={loading}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
            >
              {loading ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </div>
      )}
      
      {/* Floating Save Button - only show if there are unsaved changes */}
      {unsavedChanges && (
        <div className="fixed bottom-8 right-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSaveAssignments}
            disabled={saving}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-teal-500 to-blue-600 
                     text-white font-semibold hover:shadow-lg transition flex items-center gap-2
                     disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {saving ? <FiLoader className="animate-spin" /> : <FiCheck />}
            <span>{saving ? 'Saving...' : '✅ Save Assignments'}</span>
          </motion.button>
          
          {showSavedMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-0 right-0 transform -translate-y-full mb-2 px-4 py-2 
                       bg-green-100 text-green-700 rounded-lg text-sm whitespace-nowrap"
            >
              Assignments saved successfully!
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}