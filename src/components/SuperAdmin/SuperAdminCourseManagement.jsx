import React, { useState, useEffect, useRef, useContext } from 'react';
import { FiEdit, FiTrash2, FiSearch, FiFilter, FiX, FiBook, FiUser, FiClock, FiCalendar, FiHash, FiUpload, FiInfo, FiDownload, FiLayers, FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, FiAlertTriangle } from 'react-icons/fi';
import SuperAdminCourseManagementService, { processSuperAdminCourseImport } from './services/SuperAdminCourseManagement';
import { useRateLimitedUpload } from '../../hooks/useRateLimitedUpload';
import UploadProgressIndicator from '../common/UploadProgressIndicator';
import { useToast } from '../../context/ToastContext';
import { AuthContext } from '../../App';

export default function SuperAdminCourseManagement() {
  // Authentication context
  const { user } = useContext(AuthContext);
  
  // Toast notifications
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  
  // State variables
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('All Semesters');
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [targetDepartment, setTargetDepartment] = useState(null); // For uploads
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const fileInputRef = useRef(null);
  const tooltipRef = useRef(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Rate-limited upload hook
  const { uploadState, handleUpload, handleCancel, resetUploadState } = useRateLimitedUpload();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all courses from all departments
        const coursesData = await SuperAdminCourseManagementService.fetchAllCourses();
        setCourses(coursesData);
        
        // Fetch all departments
        const departmentsData = await SuperAdminCourseManagementService.fetchAllDepartments();
        setDepartments(departmentsData);
        
        // Fetch all faculty from all departments
        const facultyData = await SuperAdminCourseManagementService.fetchAllFaculty();
        setFaculty(facultyData);
        
        // Get semester options (this is static data)
        setSemesterOptions(SuperAdminCourseManagementService.getSemesterOptions({ includeAll: true }));
      } catch (error) {
        console.error('Error loading course data:', error);
        showError('Failed to load course data. Please refresh the page.', {
          duration: 8000
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [showError]);

  // Initial filtered courses setup and filtering logic
  useEffect(() => {
    const filtered = SuperAdminCourseManagementService.filterCourses(
      courses, 
      searchTerm, 
      selectedSemester, 
      selectedFaculty, 
      selectedDepartment
    );
    setFilteredCourses(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [courses, searchTerm, selectedSemester, selectedFaculty, selectedDepartment]);

  // Handle click outside for tooltip
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setShowInfoTooltip(false);
      }
    };

    if (showInfoTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInfoTooltip]);

  // Handle course deletion
  const handleDeleteCourse = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      setIsLoading(true);
      const updatedCourses = await SuperAdminCourseManagementService.deleteCourse(courses, id);
      setCourses(updatedCourses);
      showSuccess('Course deleted successfully!', {
        duration: 4000
      });
    } catch (error) {
      console.error('Error deleting course:', error);
      showError(`Failed to delete course: ${error.message}`, {
        duration: 6000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      showError('Please upload a valid JSON file.', {
        duration: 6000
      });
      return;
    }

    try {
      setIsLoading(true);
      showInfo('📁 Reading and validating JSON file...');

      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          
          // Validate that it's an array
          if (!Array.isArray(jsonData)) {
            showError('JSON file must contain an array of courses.', {
              duration: 6000
            });
            setIsLoading(false);
            return;
          }

          if (jsonData.length === 0) {
            showError('JSON file is empty. Please provide course data.', {
              duration: 6000
            });
            setIsLoading(false);
            return;
          }

          // Validate and show warnings for course data
          const validation = validateCourseData(jsonData, targetDepartment);
          let coursesArray = jsonData;

          if (validation.errors.length > 0) {
            showError(`❌ Found ${validation.errors.length} error(s) in your course data:\n\n${validation.errors.slice(0, 5).join('\n')}${validation.errors.length > 5 ? `\n... and ${validation.errors.length - 5} more errors` : ''}\n\nPlease fix these errors and try again.`, {
              duration: 15000
            });
            setIsLoading(false);
            return;
          }

          if (validation.warnings.length > 0) {
            const userConfirmed = window.confirm(
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
            const targetInfo = targetDepartment ? ` to ${targetDepartment.name}` : ' to their specified departments';
            const departmentInfo = validation.coursesWithoutDepartment > 0 
              ? ` (${validation.coursesWithoutDepartment} will use target department${targetInfo})`
              : '';
            
            showSuccess(`✅ Data validation passed! Ready to import ${validation.courseCount} courses${targetInfo}${departmentInfo}`, {
              duration: 5000
            });
          }

          // Check for duplicates before upload
          const duplicateCheck = await SuperAdminCourseManagementService.checkBatchDuplicates(
            coursesArray, 
            targetDepartment?.id || null, 
            departments
          );
          
          let shouldOverwriteExisting = false;
          
          if (duplicateCheck.duplicates.length > 0) {
            const duplicatesList = duplicateCheck.duplicates.slice(0, 5).map(dup => 
              `${dup.courseData.code} (${dup.courseData.semester})`
            ).join(', ');
            const moreDuplicates = duplicateCheck.duplicates.length > 5 ? 
              ` and ${duplicateCheck.duplicates.length - 5} more` : '';
            
            const userWantsToOverwrite = window.confirm(
              `⚠️ Found ${duplicateCheck.duplicates.length} duplicate course(s) that already exist:\n\n` +
              `${duplicatesList}${moreDuplicates}\n\n` +
              `Do you want to overwrite the existing courses?\n\n` +
              `• Click "OK" to overwrite existing courses\n` +
              `• Click "Cancel" to skip duplicates and only import new courses`
            );
            
            if (userWantsToOverwrite) {
              // Upload all courses with overwrite enabled
              showInfo(`🔄 User chose to overwrite duplicates. Starting import of all ${coursesArray.length} courses...`);
            } else {
              // Upload only unique courses
              if (duplicateCheck.uniqueCourses.length === 0) {
                showWarning('All courses already exist. Upload canceled.', {
                  duration: 6000
                });
                setIsLoading(false);
                return;
              }
              coursesArray = duplicateCheck.uniqueCourses;
              showInfo(`� Skipping ${duplicateCheck.duplicates.length} duplicates. Starting import of ${coursesArray.length} new courses...`);
            }
          }

          // Brief delay to let user see validation results
          setTimeout(() => {
            const uploadTarget = targetDepartment ? ` to ${targetDepartment.name}` : ' to their specified departments';

            // Start rate-limited upload
            handleUpload(coursesArray, {
              batchSize: 1, // Process one course at a time
              processor: async (courseBatch) => {
                const results = [];
                for (const course of courseBatch) {
                  try {
                    const result = await processSuperAdminCourseImport(
                      course, 
                      faculty, 
                      targetDepartment?.id || null,
                      departments,
                      shouldOverwriteExisting
                    );
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
                  const completionTarget = targetDepartment ? ` to ${targetDepartment.name}` : ' to their respective departments';
                  showSuccess(`✅ Successfully imported all ${successful} courses${completionTarget}! Page will reload in 3 seconds...`, {
                    duration: 3000
                  });
                } else if (successful > 0) {
                  const errorSummary = failedItems.slice(0, 5).map(item => 
                    `${item.item?.code || 'Unknown'}: ${item.error}`
                  ).join('\n');
                  const moreErrors = failedItems.length > 5 ? `\n... and ${failedItems.length - 5} more errors` : '';
                  
                  showWarning(`⚠️ Import completed: ${successful} successful, ${failed} failed. Page will reload in 5 seconds...`, {
                    details: errorSummary + moreErrors,
                    duration: 5000
                  });
                } else {
                  const errorSummary = failedItems.slice(0, 5).map(item => 
                    `${item.item?.code || 'Unknown'}: ${item.error}`
                  ).join('\n');
                  const moreErrors = failedItems.length > 5 ? `\n... and ${failedItems.length - 5} more errors` : '';
                  
                  showError(`❌ Import failed: All ${failed} courses failed to import`, {
                    details: errorSummary + moreErrors,
                    duration: 10000
                  });
                  setIsLoading(false);
                  return;
                }
                
                // Reload the page to show new courses
                setTimeout(() => {
                  window.location.reload();
                }, failed === 0 ? 3000 : 5000);
              },
              onError: (error) => {
                showError(`Upload failed: ${error}`, {
                  duration: 10000
                });
                setIsLoading(false);
              }
            });
          }, 1000);
          
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
    } catch (error) {
      console.error('Upload error:', error);
      showError(`Upload failed: ${error.message}`, {
        duration: 8000
      });
      setIsLoading(false);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validate course data
  const validateCourseData = (data, targetDept = null) => {
    const errors = [];
    const warnings = [];
    let courseCount = 0;
    let coursesWithoutDepartment = 0;

    if (!Array.isArray(data)) {
      errors.push('Data must be an array of courses');
      return { errors, warnings, courseCount, coursesWithoutDepartment };
    }

    data.forEach((course, index) => {
      const courseContext = `Course ${index + 1} (${course.code || 'Unknown Code'})`;
      courseCount++;

      // Required field validation
      if (!course.code || course.code.trim() === '') {
        errors.push(`${courseContext}: Missing or empty course code`);
      }

      if (!course.title || course.title.trim() === '') {
        errors.push(`${courseContext}: Missing or empty course title`);
      }

      if (!course.semester || course.semester.trim() === '') {
        errors.push(`${courseContext}: Missing or empty semester`);
      }

      // Department validation and counting
      if (!course.department || course.department.trim() === '') {
        coursesWithoutDepartment++;
        if (!targetDept) {
          errors.push(`${courseContext}: No department specified and no target department selected`);
        }
      } else {
        const dept = course.department.toString().trim();
        const validDeptIds = departments.map(d => d.id);
        const validDeptNames = departments.map(d => d.name);
        
        // Check if department exists by ID or name
        const foundById = validDeptIds.includes(dept);
        const foundByName = validDeptNames.includes(dept);
        
        if (!foundById && !foundByName) {
          const availableDepts = departments.map(d => `${d.name} (${d.id})`);
          warnings.push(`${courseContext}: Department "${dept}" not found in system. Available departments: ${availableDepts.slice(0, 3).join(', ')}, etc.`);
        }
      }

      // Hour validation
      const lectureHours = parseInt(course.lectureHours);
      const tutorialHours = parseInt(course.tutorialHours);
      const practicalHours = parseInt(course.practicalHours);

      if (isNaN(lectureHours) || lectureHours < 0) {
        warnings.push(`${courseContext}: Invalid lecture hours, defaulting to 0`);
      }

      if (isNaN(tutorialHours) || tutorialHours < 0) {
        warnings.push(`${courseContext}: Invalid tutorial hours, defaulting to 0`);
      }

      if (isNaN(practicalHours) || practicalHours < 0) {
        warnings.push(`${courseContext}: Invalid practical hours, defaulting to 0`);
      }

      // Check if all hours are zero
      if ((lectureHours || 0) + (tutorialHours || 0) + (practicalHours || 0) === 0) {
        warnings.push(`${courseContext}: All hours are zero, course might be incomplete`);
      }

      // Faculty validation
      if (course.faculty && course.faculty.trim() !== '') {
        const facultyExists = faculty.some(f => 
          f.name.toLowerCase().includes(course.faculty.toLowerCase()) ||
          f.email.toLowerCase() === course.faculty.toLowerCase()
        );
        if (!facultyExists) {
          warnings.push(`${courseContext}: Faculty "${course.faculty}" not found in system`);
        }
      }

      // Check for reasonable field lengths
      if (course.code && course.code.length > 10) {
        warnings.push(`${courseContext}: Course code seems unusually long (${course.code.length} characters)`);
      }

      if (course.title && course.title.length > 100) {
        warnings.push(`${courseContext}: Course title seems unusually long (${course.title.length} characters)`);
      }

      // Expected fields suggestion
      const expectedFields = ['code', 'title', 'semester', 'lectureHours', 'tutorialHours', 'practicalHours', 'faculty', 'department', 'type', 'credits'];
      const missingFields = expectedFields.filter(field => !(field in course));
      if (missingFields.length > 0) {
        warnings.push(`${courseContext}: Missing optional fields: ${missingFields.join(', ')}`);
      }
    });

    return { errors, warnings, courseCount, coursesWithoutDepartment };
  };

  // Download example JSON
  const downloadExampleJSON = () => {
    const exampleData = SuperAdminCourseManagementService.getExampleCourseData();
    const dataStr = JSON.stringify(exampleData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'superadmin_course_example.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showInfo('Example JSON file downloaded. Check your Downloads folder.', {
      duration: 4000
    });
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedSemester('All Semesters');
    setSelectedFaculty(null);
    setSelectedDepartment(null);
    showInfo('All filters cleared', { duration: 2000 });
  };

  // Pagination helper functions
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCourses = filteredCourses.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
          <p className="text-gray-600">Manage courses across all departments (SuperAdmin)</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiUpload className="text-blue-600" />
              Bulk Course Upload
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload courses in JSON format to any department
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={downloadExampleJSON}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-md transition-colors duration-200"
            >
              <FiDownload size={16} />
              Example JSON
            </button>
            
            <div className="relative" ref={tooltipRef}>
              <button
                onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md transition-colors duration-200"
              >
                <FiInfo size={16} />
                Upload Info
              </button>
              
              {showInfoTooltip && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
                  <h4 className="font-medium text-gray-900 mb-2">SuperAdmin Upload Features:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Can upload courses to any department</li>
                    <li>• Department field in JSON takes priority</li>
                    <li>• Target department used only as fallback</li>
                    <li>• Can assign faculty from any department</li>
                    <li>• Validates course data before upload</li>
                    <li>• Rate-limited processing (1 course/second)</li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Required fields: code, title, semester<br/>
                      Optional: department (or use target), faculty, hours, credits
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Target Department Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Department (optional)
          </label>
          <select
            value={targetDepartment?.id || ''}
            onChange={(e) => {
              const dept = departments.find(d => d.id === e.target.value);
              setTargetDepartment(dept || null);
            }}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">No target department (use departments from JSON)</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.category})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Only needed for courses that don't specify a department in the JSON file
          </p>
        </div>

        {/* Upload Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              disabled={isLoading || uploadState.isUploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          
          {uploadState.isUploading && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors duration-200"
            >
              Cancel Upload
            </button>
          )}
        </div>

        {/* Upload Progress */}
        {uploadState.isUploading && (
          <div className="mt-4">
            <UploadProgressIndicator 
              uploadState={uploadState}
              title="Uploading Courses"
              onCancel={handleCancel}
              showQueueInfo={true}
            />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FiFilter className="text-blue-600" />
            Filters & Search
          </h2>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-md transition-colors duration-200"
          >
            <FiX size={16} />
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by code, title, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select
              value={selectedDepartment?.id || ''}
              onChange={(e) => {
                const dept = departments.find(d => d.id === e.target.value);
                setSelectedDepartment(dept || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {semesterOptions.map(semester => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
            </select>
          </div>

          {/* Faculty Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Faculty</label>
            <select
              value={selectedFaculty?.id || ''}
              onChange={(e) => {
                const facultyMember = faculty.find(f => f.id === e.target.value);
                setSelectedFaculty(facultyMember || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Faculty</option>
              {faculty.map(facultyMember => (
                <option key={facultyMember.id} value={facultyMember.id}>
                  {facultyMember.name} {facultyMember.departmentName && `(${facultyMember.departmentName})`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <FiBook className="text-blue-600" />
            <span className="text-blue-800 font-medium">
              {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
              {selectedDepartment && ` in ${selectedDepartment.name}`}
              {selectedSemester !== 'All Semesters' && ` for ${selectedSemester}`}
              {selectedFaculty && ` taught by ${selectedFaculty.name}`}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {searchTerm && (
              <span className="text-blue-600 text-sm">
                Searching for: "{searchTerm}"
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Courses List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Loading courses...
            </div>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FiBook size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
            <p className="text-gray-600">
              {courses.length === 0 
                ? "No courses have been added yet. Upload a JSON file to get started."
                : "Try adjusting your search criteria or filters."
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Faculty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Semester
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <FiHash className="text-gray-400" size={16} />
                          <span className="text-sm font-medium text-gray-900">{course.code}</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{course.title}</div>
                        {course.type && (
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                            {course.type}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FiLayers className="text-gray-400" size={16} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {course.departmentName || course.department}
                          </div>
                          {course.credits && (
                            <div className="text-xs text-gray-500">{course.credits} credits</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {course.faculty ? (
                        <div className="flex items-center gap-2">
                          <img 
                            src={course.faculty.avatar} 
                            alt={course.faculty.name}
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{course.faculty.name}</div>
                            <div className="text-xs text-gray-500">{course.faculty.status}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="text-gray-400" size={16} />
                        <span className="text-sm text-gray-900">{course.semester}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FiClock className="text-gray-400" size={16} />
                        <div className="text-sm text-gray-900">
                          <div>{course.weeklyHours || 'Not specified'}</div>
                          <div className="text-xs text-gray-500">
                            L:{course.lectureHours} T:{course.tutorialHours} P:{course.practicalHours}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors duration-200"
                          title="Delete Course"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Results Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium text-gray-900">{startIndex + 1}</span> to{' '}
                      <span className="font-medium text-gray-900">{Math.min(endIndex, filteredCourses.length)}</span> of{' '}
                      <span className="font-medium text-gray-900">{filteredCourses.length}</span> results
                    </div>
                    
                    {/* Items Per Page */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-700 font-medium">Show:</label>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-sm text-gray-700">per page</span>
                    </div>
                  </div>

                  {/* Pagination Navigation */}
                  <div className="flex items-center justify-center lg:justify-end">
                    <nav className="flex items-center gap-1" aria-label="Pagination">
                      {/* First Page */}
                      <button
                        onClick={goToFirstPage}
                        disabled={currentPage === 1}
                        className="inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500 transition-colors duration-200"
                        title="First page"
                      >
                        <FiChevronsLeft size={16} />
                      </button>
                      
                      {/* Previous Page */}
                      <button
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border-t border-b border-gray-300 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500 transition-colors duration-200"
                        title="Previous page"
                      >
                        <FiChevronLeft size={16} />
                      </button>

                      {/* Page Numbers */}
                      {(() => {
                        const getPageNumbers = () => {
                          const pages = [];
                          const maxVisible = 7; // Maximum number of page buttons to show
                          
                          if (totalPages <= maxVisible) {
                            // Show all pages if total is small
                            for (let i = 1; i <= totalPages; i++) {
                              pages.push(i);
                            }
                          } else {
                            // Smart pagination logic
                            const startPage = Math.max(1, currentPage - 3);
                            const endPage = Math.min(totalPages, currentPage + 3);
                            
                            // Always show first page
                            if (startPage > 1) {
                              pages.push(1);
                              if (startPage > 2) {
                                pages.push('...');
                              }
                            }
                            
                            // Show pages around current page
                            for (let i = startPage; i <= endPage; i++) {
                              pages.push(i);
                            }
                            
                            // Always show last page
                            if (endPage < totalPages) {
                              if (endPage < totalPages - 1) {
                                pages.push('...');
                              }
                              pages.push(totalPages);
                            }
                          }
                          
                          return pages;
                        };

                        return getPageNumbers().map((page, index) => {
                          if (page === '...') {
                            return (
                              <span
                                key={`ellipsis-${index}`}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border-t border-b border-gray-300"
                              >
                                ...
                              </span>
                            );
                          }
                          
                          const isCurrentPage = page === currentPage;
                          return (
                            <button
                              key={page}
                              onClick={() => goToPage(page)}
                              className={`inline-flex items-center px-4 py-2 text-sm font-medium border-t border-b border-gray-300 transition-colors duration-200 ${
                                isCurrentPage
                                  ? 'bg-blue-50 border-blue-500 text-blue-600 z-10 relative'
                                  : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                              }`}
                              aria-current={isCurrentPage ? 'page' : undefined}
                            >
                              {page}
                            </button>
                          );
                        });
                      })()}

                      {/* Next Page */}
                      <button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border-t border-b border-gray-300 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500 transition-colors duration-200"
                        title="Next page"
                      >
                        <FiChevronRight size={16} />
                      </button>
                      
                      {/* Last Page */}
                      <button
                        onClick={goToLastPage}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500 transition-colors duration-200"
                        title="Last page"
                      >
                        <FiChevronsRight size={16} />
                      </button>
                    </nav>
                  </div>
                </div>

                {/* Mobile-friendly quick navigation */}
                <div className="lg:hidden mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <FiChevronLeft size={16} />
                      Previous
                    </button>
                    
                    <span className="text-sm text-gray-700 font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      Next
                      <FiChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
