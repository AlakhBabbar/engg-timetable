import React, { useState, useEffect, useRef, useContext } from 'react';
import { FiEdit, FiTrash2, FiSearch, FiFilter, FiX, FiBook, FiUser, FiClock, FiCalendar, FiHash, FiUpload, FiInfo, FiDownload } from 'react-icons/fi';
import CourseManagementService from './services/CourseManagement';
import { useRateLimitedUpload } from '../../hooks/useRateLimitedUpload';
import UploadProgressIndicator from '../common/UploadProgressIndicator';
import { useToast } from '../../context/ToastContext';
import { AuthContext } from '../../App';

export default function CourseManagement() {
  // Authentication context
  const { user } = useContext(AuthContext);
  
  // Toast notifications
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  
  // State variables
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('All Semesters');
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    faculty: '',
    semester: 'Fall 2024',
    weeklyHours: '',
    lectureHours: '3',
    tutorialHours: '1',
    practicalHours: '0'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const fileInputRef = useRef(null);
  const tooltipRef = useRef(null);

  // Rate-limited upload hook
  const { uploadState, handleUpload, handleCancel, resetUploadState } = useRateLimitedUpload();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.department) return;
      
      try {
        setIsLoading(true);
        
        // Fetch courses from Firebase using user's department
        const coursesData = await CourseManagementService.fetchCourses(user.department);
        setCourses(coursesData);
        
        // Fetch faculty from Firebase using user's department  
        const facultyData = await CourseManagementService.fetchFaculty(user.department);
        setFaculty(facultyData);
        
        // Get semester options (this is static data)
        setSemesterOptions(CourseManagementService.getSemesterOptions());
      } catch (error) {
        console.error('Error loading course data:', error);
        showError('Failed to load course data. Please refresh the page.', {
          duration: 8000
        });
        // Fallback to cached/dummy data
        setCourses(CourseManagementService.getCourses());
        setFaculty(CourseManagementService.getFaculty());
        setSemesterOptions(CourseManagementService.getSemesterOptions());
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user?.department, showError]);

  // Initial filtered courses setup
  useEffect(() => {
    setFilteredCourses(courses);
  }, [courses]);

  // Handle click outside for tooltip
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setShowInfoTooltip(false);
      }
    };

    // Add event listener only when tooltip is shown
    if (showInfoTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInfoTooltip]);

  // Filter courses whenever filter parameters change
  useEffect(() => {
    const filtered = CourseManagementService.filterCourses(
      courses,
      searchTerm,
      selectedSemester,
      selectedFaculty
    );
    setFilteredCourses(filtered);
  }, [courses, selectedSemester, selectedFaculty, searchTerm]);

  // Handle input changes in form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Format weekly hours when lecture, tutorial, or practical hours change
  useEffect(() => {
    const { lectureHours, tutorialHours, practicalHours } = formData;
    const weeklyHours = CourseManagementService.formatWeeklyHours(
      lectureHours,
      tutorialHours,
      practicalHours
    );
    setFormData(prev => ({ ...prev, weeklyHours }));
  }, [formData.lectureHours, formData.tutorialHours, formData.practicalHours]);

  // Open modal for new course
  const openNewCourseModal = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      code: '',
      faculty: '',
      semester: 'Semester 6',
      weeklyHours: '',
      lectureHours: '3',
      tutorialHours: '1',
      practicalHours: '0'
    });
    setShowModal(true);
  };

  // Open modal for editing an existing course
  const openEditCourseModal = (course) => {
    setEditingCourse(course);
    
    // Parse weekly hours into components
    const { lectureHours, tutorialHours, practicalHours } = CourseManagementService.parseWeeklyHours(course.weeklyHours);
    
    setFormData({
      title: course.title,
      code: course.code,
      faculty: course.faculty ? course.faculty.id : '',
      semester: course.semester,
      weeklyHours: course.weeklyHours,
      lectureHours,
      tutorialHours,
      practicalHours
    });
    setShowModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.department) {
      showError('Unable to save course: Department information not available', {
        duration: 8000
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      if (editingCourse) {
        // Update existing course
        const updatedCourses = await CourseManagementService.updateCourse(
          courses,
          editingCourse.id,
          formData,
          faculty,
          user.department
        );
        setCourses(updatedCourses);
        showSuccess(`Course ${formData.code} updated successfully`);
      } else {
        // Add new course
        const updatedCourses = await CourseManagementService.addCourse(
          courses,
          formData,
          faculty,
          user.department
        );
        setCourses(updatedCourses);
        showSuccess(`Course ${formData.code} created successfully`);
      }
      
      setShowModal(false);
    } catch (err) {
      showError(`Failed to save course: ${err.message}`, {
        duration: 8000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a course
  const handleDeleteCourse = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course?')) {
      return;
    }

    if (!user?.department) {
      showError('Unable to delete course: Department information not available', {
        duration: 8000
      });
      return;
    }

    try {
      setIsLoading(true);
      const courseToDelete = courses.find(c => c.id === id);
      
      const updatedCourses = await CourseManagementService.deleteCourse(courses, id, user.department);
      setCourses(updatedCourses);
      showSuccess(`Course ${courseToDelete?.code || ''} deleted successfully`);
    } catch (err) {
      showError(`Failed to delete course: ${err.message}`, {
        duration: 8000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedSemester('All Semesters');
    setSelectedFaculty(null);
    setSearchTerm('');
  };
  
  // Trigger the hidden file input
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file upload and JSON parsing with rate limiting
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.json')) {
      showError('Please select a valid JSON file', {
        duration: 5000
      });
      return;
    }
    
    try {
      setIsLoading(true);
      resetUploadState(); // Reset any previous upload state
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          
          // Handle both direct array and nested structure
          const coursesArray = Array.isArray(jsonData) ? jsonData : jsonData.courses;
          
          if (!Array.isArray(coursesArray)) {
            throw new Error('JSON data must be an array of courses or contain a "courses" array');
          }

          if (coursesArray.length === 0) {
            showWarning('The selected file contains no courses to import');
            setIsLoading(false);
            return;
          }

          // Validate the course data structure and content
          const validation = validateCourseData(coursesArray);
          
          if (!validation.isValid) {
            // Critical errors found - cannot proceed
            const errorDetails = validation.errors.slice(0, 10).join('\n') + 
              (validation.errors.length > 10 ? `\n... and ${validation.errors.length - 10} more errors` : '');
            
            showError(`❌ Data validation failed - cannot import`, {
              details: `Found ${validation.errors.length} error(s):\n\n${errorDetails}\n\nPlease fix these issues and try again.`,
              duration: 25000
            });
            setIsLoading(false);
            return;
          }
          
          // Show warnings if any and ask user for confirmation
          if (validation.warnings.length > 0) {
            const warningDetails = validation.warnings.slice(0, 8).join('\n') + 
              (validation.warnings.length > 8 ? `\n... and ${validation.warnings.length - 8} more warnings` : '');
            
            showWarning(`⚠️ Data validation completed with ${validation.warnings.length} warning(s)`, {
              details: `${warningDetails}`,
              duration: 15000
            });

            // Ask user for confirmation to proceed
            const userConfirmed = window.confirm(
              `⚠️ Data Validation Warnings Found\n\n` +
              `Found ${validation.warnings.length} warning(s) in your course data:\n\n` +
              `${validation.warnings.slice(0, 5).join('\n')}` +
              `${validation.warnings.length > 5 ? `\n... and ${validation.warnings.length - 5} more warnings` : ''}\n\n` +
              `These warnings won't prevent the upload, but you should review them.\n\n` +
              `Do you want to proceed with the upload anyway?`
            );

            if (!userConfirmed) {
              showInfo('Upload canceled by user due to data warnings.');
              setIsLoading(false);
              return;
            }

            showInfo('User confirmed to proceed despite warnings. Starting upload...');
          } else {
            // No errors or warnings
            showSuccess(`✅ Data validation passed! Ready to import ${validation.courseCount} courses`, {
              duration: 5000
            });
          }

          // Brief delay to let user see validation results
          setTimeout(() => {
            showInfo(`🚀 Starting import of ${coursesArray.length} courses...`);

            // Start rate-limited upload
            handleUpload(coursesArray, {
              batchSize: 1, // Process one course at a time
              processor: async (courseBatch) => {
                const results = [];
                for (const course of courseBatch) {
                  try {
                    const result = await CourseManagementService.processSingleCourseImport(course, faculty, user.department);
                    results.push(result);
                  } catch (error) {
                    results.push({
                      success: false,
                      error: error.message,
                      item: course
                    });
                  }
                }
                return results;
              },
              onComplete: (results) => {
                const successful = results.filter(r => r.success).length;
                const failed = results.filter(r => !r.success).length;
                const failedItems = results.filter(r => !r.success);
                
                // Show toasts immediately
                if (failed === 0) {
                  showSuccess(`✅ Successfully imported all ${successful} courses!`, {
                    duration: 8000
                  });
                } else if (successful > 0) {
                  // Format error details for display
                  const errorSummary = failedItems.slice(0, 5).map(item => 
                    `${item.item?.code || 'Unknown'}: ${item.error}`
                  ).join('\n');
                  const moreErrors = failedItems.length > 5 ? `\n... and ${failedItems.length - 5} more errors` : '';
                  
                  showWarning(`⚠️ Import completed: ${successful} successful, ${failed} failed`, {
                    details: errorSummary + moreErrors,
                    duration: 15000
                  });
                } else {
                  // Format error details for display
                  const errorSummary = failedItems.slice(0, 5).map(item => 
                    `${item.item?.code || 'Unknown'}: ${item.error}`
                  ).join('\n');
                  const moreErrors = failedItems.length > 5 ? `\n... and ${failedItems.length - 5} more errors` : '';
                  
                  showError(`❌ Import failed: All ${failed} courses failed to import`, {
                    details: errorSummary + moreErrors,
                    duration: 20000
                  });
                }
                
                // Refresh the courses list from Firebase after upload
                const refreshData = async () => {
                  try {
                    const refreshedCourses = await CourseManagementService.fetchCourses(user.department);
                    setCourses(refreshedCourses);
                  } catch (error) {
                    console.error('Error refreshing courses after upload:', error);
                    // Fallback to existing method if refresh fails
                    setCourses(CourseManagementService.getCourses());
                  }
                  setIsLoading(false);
                };
                
                refreshData();
                
                // Auto-dismiss upload indicator after a delay for successful imports
                if (failed === 0) {
                  setTimeout(() => {
                    resetUploadState();
                  }, 3000);
                }
              },
              onError: (error) => {
                showError(`Upload failed: ${error}`, {
                  duration: 10000
                });
                setIsLoading(false);
              }
            });
          }, 1000); // Standard delay since user has already confirmed
          
        } catch (err) {
          if (err.name === 'SyntaxError') {
            showError('Invalid JSON file format. Please check your file and try again.', {
              details: err.message,
              duration: 8000
            });
          } else {
            showError(`Error processing file: ${err.message}`, {
              duration: 8000
            });
          }
          // Log errors in development for debugging
          if (process.env.NODE_ENV === 'development') {
            console.error(err);
          }
          setIsLoading(false);
        }
      };
      
      reader.onerror = () => {
        showError('Error reading the file. Please try again.', {
          duration: 6000
        });
        setIsLoading(false);
      };
      
      reader.readAsText(file);
      
    } catch (err) {
      showError(`An error occurred during file upload: ${err.message}`, {
        duration: 8000
      });
      setIsLoading(false);
    }
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download example JSON dataset
  const downloadExampleJSON = () => {
    const exampleData = CourseManagementService.getExampleCourseData();
    
    const blob = new Blob([JSON.stringify(exampleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'courses_dataset_example.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Comprehensive JSON validation function for courses
  const validateCourseData = (coursesArray) => {
    const errors = [];
    const warnings = [];
    const courseCodes = new Set();
    
    if (!Array.isArray(coursesArray)) {
      errors.push('Data must be an array of courses');
      return { errors, warnings, isValid: false };
    }
    
    if (coursesArray.length === 0) {
      errors.push('No courses found in the data');
      return { errors, warnings, isValid: false };
    }
    
    if (coursesArray.length > 300) {
      warnings.push(`Large dataset detected (${coursesArray.length} courses). This may take a while to process.`);
    }
    
    coursesArray.forEach((course, index) => {
      const courseContext = `Course ${index + 1}${course.code ? ` (${course.code})` : ''}`;
      
      // Check if course is an object
      if (typeof course !== 'object' || course === null) {
        errors.push(`${courseContext}: Must be an object, found ${typeof course}`);
        return;
      }
      
      // Required field validation
      if (!course.code || course.code.toString().trim() === '') {
        errors.push(`${courseContext}: Missing or empty course code`);
      } else {
        const code = course.code.toString().trim().toUpperCase();
        if (courseCodes.has(code)) {
          errors.push(`${courseContext}: Duplicate course code "${code}"`);
        } else {
          courseCodes.add(code);
        }
        
        // Course code format validation
        if (code.length > 20) {
          warnings.push(`${courseContext}: Course code is very long (${code.length} characters)`);
        }
      }
      
      if (!course.title || course.title.toString().trim() === '') {
        errors.push(`${courseContext}: Missing or empty course title`);
      } else {
        const title = course.title.toString().trim();
        if (title.length > 200) {
          warnings.push(`${courseContext}: Course title is very long (${title.length} characters)`);
        }
      }
      
      if (!course.semester || course.semester.toString().trim() === '') {
        errors.push(`${courseContext}: Missing or empty semester`);
      } else {
        const semester = course.semester.toString().trim();
        const validSemesters = ['Fall 2024', 'Spring 2024', 'Summer 2024', 'Fall 2025', 'Spring 2025', 'Summer 2025'];
        if (!validSemesters.some(validSem => semester.toLowerCase().includes(validSem.toLowerCase()))) {
          warnings.push(`${courseContext}: Semester "${semester}" may not match expected format. Common formats: Fall 2024, Spring 2025, etc.`);
        }
      }
      
      // Hours validation
      const validateHours = (field, value, maxHours = 10) => {
        if (value !== undefined && value !== null && value !== '') {
          const hours = parseInt(value);
          if (isNaN(hours)) {
            warnings.push(`${courseContext}: ${field} should be a number, found "${value}". Will default to 0.`);
          } else if (hours < 0) {
            warnings.push(`${courseContext}: ${field} cannot be negative (${hours}). Will default to 0.`);
          } else if (hours > maxHours) {
            warnings.push(`${courseContext}: ${field} seems high (${hours} hours) - please verify`);
          }
        }
      };
      
      validateHours('Lecture hours', course.lectureHours);
      validateHours('Tutorial hours', course.tutorialHours);
      validateHours('Practical hours', course.practicalHours);
      
      // Credits validation
      if (course.credits !== undefined && course.credits !== null) {
        const credits = parseInt(course.credits);
        if (isNaN(credits)) {
          warnings.push(`${courseContext}: Credits should be a number, found "${course.credits}". Will be auto-calculated.`);
        } else if (credits < 0) {
          warnings.push(`${courseContext}: Credits cannot be negative (${credits}). Will be auto-calculated.`);
        } else if (credits > 20) {
          warnings.push(`${courseContext}: Very high credits (${credits}) - please verify`);
        }
      }
      
      // Department validation
      if (course.department) {
        const validDepts = ['Computer Science', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering'];
        const dept = course.department.toString().trim();
        if (!validDepts.some(validDept => validDept.toLowerCase().includes(dept.toLowerCase()))) {
          warnings.push(`${courseContext}: Unknown department "${dept}". Common departments: ${validDepts.slice(0, 3).join(', ')}, etc.`);
        }
      }
      
      // Course type validation
      if (course.type) {
        const validTypes = ['Core', 'Elective', 'Lab', 'Project', 'Seminar'];
        const type = course.type.toString().trim();
        if (!validTypes.includes(type)) {
          warnings.push(`${courseContext}: Unknown course type "${type}". Valid types: ${validTypes.join(', ')}`);
        }
      }
      
      // Prerequisites validation
      if (course.prerequisites !== undefined && !Array.isArray(course.prerequisites)) {
        warnings.push(`${courseContext}: Prerequisites should be an array, found ${typeof course.prerequisites}. Will be converted to empty array.`);
      }
      
      // Check for unexpected fields
      const expectedFields = ['code', 'title', 'semester', 'lectureHours', 'tutorialHours', 'practicalHours', 'weeklyHours', 'faculty', 'facultyId', 'credits', 'department', 'type', 'description', 'prerequisites', 'active'];
      const actualFields = Object.keys(course);
      const unexpectedFields = actualFields.filter(field => !expectedFields.includes(field));
      
      if (unexpectedFields.length > 0) {
        warnings.push(`${courseContext}: Unexpected fields found: ${unexpectedFields.join(', ')}. These will be ignored.`);
      }
    });
    
    return {
      errors,
      warnings,
      isValid: errors.length === 0,
      courseCount: coursesArray.length,
      duplicateCount: coursesArray.length - courseCodes.size
    };
  };

  // Early return if user is not authenticated or doesn't have department info
  if (!user) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500">Please log in to access course management.</div>
      </div>
    );
  }
  
  if (!user.department) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500">
          <p className="text-lg font-semibold mb-2">Department Access Required</p>
          <p>Your account is not associated with a department. Please contact an administrator to assign your account to a department.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 relative bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Course Management</h1>
      
      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-md mb-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="flex flex-1 flex-col md:flex-row gap-4 w-full lg:w-auto">
            {/* Semester Filter */}
            <div className="relative flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {semesterOptions.map((semester) => (
                  <option key={semester} value={semester}>{semester}</option>
                ))}
              </select>
            </div>
            
            {/* Faculty Filter */}
            <div className="relative flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Faculty</label>
              <select
                value={selectedFaculty ? selectedFaculty.id : ''}
                onChange={(e) => {
                  const facultyId = e.target.value;
                  setSelectedFaculty(facultyId ? faculty.find(f => f.id === parseInt(facultyId)) : null);
                }}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">All Faculty</option>
                {faculty.map((facultyMember) => (
                  <option key={facultyMember.id} value={facultyMember.id}>{facultyMember.name}</option>
                ))}
              </select>
            </div>
            
            {/* Search Bar */}
            <div className="relative flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Search</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by course code or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 w-full lg:w-auto justify-end">
            {/* Reset Filters Button */}
            {(selectedSemester !== 'All Semesters' || selectedFaculty || searchTerm) && (
              <button
                onClick={resetFilters}
                className="px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition flex items-center gap-2"
              >
                <FiX size={16} />
                <span>Clear Filters</span>
              </button>
            )}
            
            {/* Add New Course Button */}
            <button
              onClick={openNewCourseModal}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-white font-semibold hover:shadow-lg transition duration-300 flex items-center gap-2"
            >
              <span className="text-lg">➕</span>
              <span>Add New Course</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Buttons Group */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4">
        {/* Upload Course Dataset Button with Info Icon */}
        <div className="flex items-center relative group">
          <button
            onClick={handleUploadClick}
            className="p-4 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg hover:scale-105 transition flex items-center"
          >
            <FiUpload size={20} className="mr-2" />
            <span>Upload Course Dataset</span>
          </button>
          
          {/* Info Icon with Tooltip */}
          <div 
            className="relative ml-2"
            ref={tooltipRef}
            onClick={() => setShowInfoTooltip(!showInfoTooltip)}
          >
            <button
              className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-100"
            >
              <FiInfo size={16} className="text-teal-600" />
            </button>
            
            {/* Tooltip */}
            {showInfoTooltip && (
              <div className="absolute bottom-full right-0 mb-2 w-72 bg-white rounded-lg shadow-xl p-4 text-sm border border-gray-200 z-50">
                <p className="font-medium mb-2 text-gray-700">JSON Dataset Format</p>
                <p className="text-gray-600 mb-3">Upload a JSON file containing an array of courses with their details.</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadExampleJSON();
                  }}
                  className="flex items-center text-teal-600 hover:text-teal-800 font-medium"
                >
                  <FiDownload size={14} className="mr-1" />
                  Download Example Format
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      {/* Courses Table */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Course Code</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Course Title</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Faculty</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Semester</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Weekly Hours</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course, index) => (
                  <tr key={course.id} className={`hover:bg-gray-50 transition ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-teal-700">{course.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{course.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {course.faculty ? (
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <img src={course.faculty.avatar} alt={course.faculty.name} className="w-8 h-8 rounded-full" />
                            <span 
                              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                                course.faculty.status === 'available' ? 'bg-green-500' : 
                                course.faculty.status === 'busy' ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}
                            ></span>
                          </div>
                          <span className="text-sm text-gray-700">{course.faculty.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Not Assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{course.semester}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        {course.weeklyHours}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => openEditCourseModal(course)}
                          className="text-indigo-600 hover:text-indigo-900 transition"
                          aria-label="Edit course"
                        >
                          <FiEdit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCourse(course.id)}
                          className="text-red-500 hover:text-red-700 transition"
                          aria-label="Delete course"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                    No courses found with the current filters. Try adjusting your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Add/Edit Course Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-end bg-black bg-opacity-40 z-50 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-white shadow-xl rounded-l-3xl h-full animate-slide-left">
            {/* Close button */}
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            >
              <FiX size={24} />
            </button>
            
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Course Title */}
                <div className="relative">
                  <div className="flex items-center mb-1">
                    <FiBook size={16} className="text-teal-600 mr-2" />
                    <label className="block text-sm font-medium text-gray-600">Course Title</label>
                  </div>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    placeholder="Introduction to Computer Science"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                
                {/* Course Code */}
                <div className="relative">
                  <div className="flex items-center mb-1">
                    <FiHash size={16} className="text-teal-600 mr-2" />
                    <label className="block text-sm font-medium text-gray-600">Course Code</label>
                  </div>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    required
                    placeholder="CS101"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                
                {/* Weekly Hours */}
                <div>
                  <div className="flex items-center mb-1">
                    <FiClock size={16} className="text-teal-600 mr-2" />
                    <label className="block text-sm font-medium text-gray-600">Weekly Hours</label>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500">Lectures</label>
                      <div className="flex">
                        <input
                          type="number"
                          name="lectureHours"
                          value={formData.lectureHours}
                          onChange={handleChange}
                          min="0"
                          max="10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <span className="bg-gray-100 px-2 py-2 border border-l-0 border-gray-300 rounded-r-lg text-gray-500">L</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500">Tutorials</label>
                      <div className="flex">
                        <input
                          type="number"
                          name="tutorialHours"
                          value={formData.tutorialHours}
                          onChange={handleChange}
                          min="0"
                          max="10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <span className="bg-gray-100 px-2 py-2 border border-l-0 border-gray-300 rounded-r-lg text-gray-500">T</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500">Practicals</label>
                      <div className="flex">
                        <input
                          type="number"
                          name="practicalHours"
                          value={formData.practicalHours}
                          onChange={handleChange}
                          min="0"
                          max="10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <span className="bg-gray-100 px-2 py-2 border border-l-0 border-gray-300 rounded-r-lg text-gray-500">P</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Format: {formData.weeklyHours}</p>
                </div>
                
                {/* Semester */}
                <div className="relative">
                  <div className="flex items-center mb-1">
                    <FiCalendar size={16} className="text-teal-600 mr-2" />
                    <label className="block text-sm font-medium text-gray-600">Semester</label>
                  </div>
                  <select
                    name="semester"
                    value={formData.semester}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    {/* Filter out "All Semesters" from the options */}
                    {semesterOptions.filter(option => option !== 'All Semesters').map((semester) => (
                      <option key={semester} value={semester}>{semester}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.semester?.includes('1') || formData.semester?.includes('3') || 
                     formData.semester?.includes('5') || formData.semester?.includes('7') 
                      ? 'Odd semester (July - December)' 
                      : 'Even semester (January - May)'}
                  </p>
                </div>
                
                {/* Faculty Assignment */}
                <div className="relative">
                  <div className="flex items-center mb-1">
                    <FiUser size={16} className="text-teal-600 mr-2" />
                    <label className="block text-sm font-medium text-gray-600">Assigned Faculty</label>
                  </div>
                  <select
                    name="faculty"
                    value={formData.faculty}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">-- Not Assigned --</option>
                    {faculty.map((facultyMember) => (
                      <option key={facultyMember.id} value={facultyMember.id}>
                        {facultyMember.name} ({facultyMember.status === 'available' ? '🟢' : facultyMember.status === 'busy' ? '🟡' : '🔴'})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Faculty Avatars Quick Selection */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Quick Select:</label>
                  <div className="flex flex-wrap gap-2">
                    {faculty.map((facultyMember) => (
                      <button
                        type="button"
                        key={facultyMember.id}
                        onClick={() => setFormData(prev => ({ ...prev, faculty: facultyMember.id.toString() }))}
                        className={`relative p-1 border-2 rounded-full transition ${
                          parseInt(formData.faculty) === facultyMember.id 
                          ? 'border-teal-500 shadow-md' 
                          : 'border-transparent hover:border-gray-300'
                        }`}
                        title={facultyMember.name}
                      >
                        <img src={facultyMember.avatar} alt={facultyMember.name} className="w-10 h-10 rounded-full" />
                        <span 
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                            facultyMember.status === 'available' ? 'bg-green-500' : 
                            facultyMember.status === 'busy' ? 'bg-yellow-500' : 
                            'bg-red-500'
                          }`}
                        ></span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition flex items-center gap-2"
                  >
                    💾 Save Course
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Indicator */}
      <UploadProgressIndicator 
        uploadState={uploadState}
        onDismiss={resetUploadState}
        onCancel={handleCancel}
        showQueueInfo={true}
      />
    </div>
  );
}