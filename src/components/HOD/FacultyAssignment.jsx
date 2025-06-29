import { useState, useEffect } from 'react';
import { FiAlertCircle, FiCheck, FiRefreshCw, FiStar, FiUsers, FiLoader, FiDatabase } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { 
  fetchCourses,
  fetchFaculty,
  assignFacultyToCourse,
  autoAssignFaculty,
  saveAssignments,
  getTimeSlots, 
  filterFacultyBySearch 
} from './services/FacultyAssignment';
import { initializeAllSampleData } from './services/SampleDataInitializer';
import { useToast } from '../../context/ToastContext';

// Component for displaying a faculty card
const FacultyCard = ({ faculty, selectedCourse, onAssign, assignedCourses }) => {
  // Calculate load percentage
  const loadPercentage = Math.min(100, Math.round((faculty.loadHours / faculty.maxHours) * 100));
  
  // Count how many hours this faculty is assigned in current selection
  const currentAssignedHours = assignedCourses
    .filter(course => course.faculty === faculty.id)
    .reduce((total, course) => total + getTimeSlots(course.weeklyHours), 0);
  
  // Determine if faculty is compatible with selected course
  const isCompatible = selectedCourse && (
    faculty.expertise.some(exp => selectedCourse.tags.includes(exp)) ||
    faculty.preferredCourses.includes(selectedCourse.code)
  );
  
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
        <div className="mt-3">
          <button
            onClick={() => onAssign(faculty.id)}
            disabled={faculty.status === 'overloaded' && selectedCourse.faculty !== faculty.id}
            className={`w-full py-1.5 px-3 rounded-lg text-sm text-center transition
                      ${selectedCourse.faculty === faculty.id 
                        ? 'bg-teal-100 text-teal-700 border border-teal-200' 
                        : faculty.status === 'overloaded'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white border border-gray-200 hover:bg-teal-50 text-gray-700'}`}
          >
            {selectedCourse.faculty === faculty.id ? 'Assigned' : 'Assign'}
          </button>
        </div>
      )}
    </motion.div>
  );
};

// Component for displaying a course card
const CourseCard = ({ course, isSelected, onClick, faculty }) => {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 border rounded-xl cursor-pointer transition-all duration-200
                 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white hover:shadow-md'}`}
    >
      <h3 className="text-blue-700 font-medium">{course.code}</h3>
      <h4 className="font-medium text-gray-800 mt-1">{course.title}</h4>
      <p className="text-sm text-gray-500 mt-1">
        {course.semester} • {course.weeklyHours}
      </p>
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
      
      {course.faculty && (
        <div className="mt-3 flex items-center gap-2 border-t pt-2">
          <img 
            src={faculty?.avatar || 'https://via.placeholder.com/32'} 
            alt={faculty?.name || 'Faculty'} 
            className="w-6 h-6 rounded-full object-cover" 
          />
          <span className="text-sm text-gray-600 truncate">
            {faculty?.name || 'Loading...'}
          </span>
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
  const { showSuccess, showError } = useToast();
  
  // For demo purposes, using a static department ID
  // In a real app, this would come from user context or route params
  const departmentId = 'dept_computer_science';
  
  // Load data from Firebase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Try to fetch existing data
        let [coursesData, facultyData] = await Promise.all([
          fetchCourses(departmentId),
          fetchFaculty(departmentId)
        ]);
        
        // If no data found, initialize sample data
        if ((coursesData.length === 0 || coursesData.some(c => c.id <= 10)) && 
            (facultyData.length === 0 || facultyData.some(f => f.id <= 10))) {
          console.log('No Firebase data found, initializing sample data...');
          const initSuccess = await initializeAllSampleData(departmentId);
          
          if (initSuccess) {
            // Refetch data after initialization
            [coursesData, facultyData] = await Promise.all([
              fetchCourses(departmentId),
              fetchFaculty(departmentId)
            ]);
          }
        }
        
        setCourses(coursesData);
        setFaculty(facultyData);
        setFilteredFaculty(facultyData);
      } catch (error) {
        console.error('Error loading data:', error);
        showError('Error loading data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [departmentId, showError]);
  
  // Local function to calculate faculty load from courses
  const updateFacultyLoadFromCourses = (courses, facultyList) => {
    // Create a copy of the faculty array to avoid modifying the original
    const updatedFaculty = [...facultyList];
    
    // Reset load hours for all faculty members
    updatedFaculty.forEach(f => {
      f.loadHours = 0;
    });
    
    // Calculate load hours based on assigned courses
    courses.forEach(course => {
      if (course.faculty) {
        const facultyMember = updatedFaculty.find(f => f.id === course.faculty);
        if (facultyMember) {
          // Add course hours to faculty's load
          const courseHours = getTimeSlots(course.weeklyHours);
          facultyMember.loadHours += courseHours;
        }
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

  const handleSelectCourse = (course) => {
    // If the course is already selected, deselect it by setting selectedCourse to null
    if (selectedCourse && selectedCourse.id === course.id) {
      setSelectedCourse(null);
    } else {
      setSelectedCourse(course);
    }
  };

  const handleAssignFaculty = async (facultyId) => {
    if (!selectedCourse) return;
    
    try {
      const result = await assignFacultyToCourse(departmentId, selectedCourse.id, facultyId);
      
      if (result.success) {
        // Update local state
        const updatedCourses = courses.map(course => 
          course.id === selectedCourse.id 
            ? { ...course, faculty: facultyId }
            : course
        );
        setCourses(updatedCourses);
        
        // Update selected course
        const updatedSelectedCourse = updatedCourses.find(c => c.id === selectedCourse.id);
        setSelectedCourse(updatedSelectedCourse);
        
        showSuccess('Faculty assigned successfully!');
      } else {
        showError(result.message || 'Failed to assign faculty');
      }
    } catch (error) {
      console.error('Error assigning faculty:', error);
      showError('Error assigning faculty. Please try again.');
    }
  };

  // Auto-assign faculty to courses based on expertise and availability
  const handleAutoAssign = async () => {
    try {
      setAutoAssigning(true);
      const result = await autoAssignFaculty(departmentId, courses, faculty);
      
      if (result.success) {
        // Refresh the data to get updated assignments
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
        
        showSuccess(result.message);
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

  // Show loading state
  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Loading faculty and courses...</p>
          <p className="text-sm text-gray-500">This may take a moment if initializing sample data</p>
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
            It looks like you don't have any courses or faculty data yet.
            <br />
            Click the button below to get started with sample data.
          </p>
          <button
            onClick={handleInitializeSampleData}
            disabled={initializingData}
            className="px-6 py-3 rounded-lg bg-teal-600 text-white hover:bg-teal-700 
                     transition flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initializingData ? <FiLoader className="animate-spin" /> : <FiDatabase />}
            <span>{initializingData ? 'Initializing...' : '📊 Initialize Sample Data'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 relative bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Faculty Assignment
      </h1>
      
      {/* Data source indicator */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <FiDatabase className="text-teal-600" />
        <span className="text-gray-600">
          Using Firebase data • Department: {departmentId}
        </span>
        {courses.length > 0 && faculty.length > 0 && (
          <span className="text-green-600 font-medium">
            • {courses.length} courses, {faculty.length} faculty members
          </span>
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
      <div className="mb-6 flex gap-4 flex-wrap">
        <button
          onClick={handleAutoAssign}
          disabled={autoAssigning || courses.length === 0}
          className="px-6 py-2 rounded-lg border border-teal-500 text-teal-600 hover:bg-teal-50 
                   transition flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiRefreshCw className={`${autoAssigning ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
          <span>{autoAssigning ? 'Auto Assigning...' : '🔄 Auto Assign'}</span>
        </button>
        
        {(courses.length === 0 || faculty.length === 0) && (
          <button
            onClick={handleInitializeSampleData}
            disabled={initializingData}
            className="px-6 py-2 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 
                     transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initializingData ? <FiLoader className="animate-spin" /> : <FiDatabase />}
            <span>{initializingData ? 'Initializing...' : '📊 Initialize Sample Data'}</span>
          </button>
        )}
        
        <div className="flex items-center text-sm text-gray-500">
          <FiAlertCircle className="inline-block mr-1" />
          <span>Auto-assign will match faculty to compatible courses based on expertise and workload</span>
        </div>
      </div>
      
      {/* Main content: 2-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Courses */}
        <div>
          <h2 className="text-lg font-medium text-gray-700 mb-4">
            Courses 
            {selectedCourse && (
              <button
                onClick={() => setSelectedCourse(null)}
                className="ml-3 text-sm text-blue-600 hover:text-blue-800 font-normal"
              >
                (Clear selection)
              </button>
            )}
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {courses.map(course => {
              const assignedFaculty = faculty.find(f => f.id === course.faculty);
              return (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  isSelected={selectedCourse?.id === course.id}
                  onClick={() => handleSelectCourse(course)}
                  faculty={assignedFaculty}
                />
              );
            })}
          </div>
        </div>
        
        {/* Right Column: Faculty */}
        <div>
          <h2 className="text-lg font-medium text-gray-700 mb-4">
            Faculty
            {selectedCourse && (
              <span className="ml-3 text-sm text-gray-500 font-normal">
                Assigning for: {selectedCourse.code}
              </span>
            )}
          </h2>
          
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
            
            {filteredFaculty.length === 0 && (
              <div className="bg-white p-6 rounded-lg text-center text-gray-500">
                No faculty found matching your search criteria
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Floating Save Button */}
      <div className="fixed bottom-8 right-8">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSaveAssignments}
          disabled={saving}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-teal-500 to-blue-600 
                   text-white font-semibold hover:shadow-lg transition flex items-center gap-2
                   disabled:opacity-50 disabled:cursor-not-allowed"
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
                     bg-green-100 text-green-700 rounded-lg text-sm"
          >
            Assignments saved successfully!
          </motion.div>
        )}
      </div>
    </div>
  );
}