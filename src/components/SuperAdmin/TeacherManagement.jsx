import { useState, useEffect, useRef } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiUser, FiBookOpen, FiAward, FiLayers, FiUpload, FiInfo, FiDownload } from 'react-icons/fi';
import TeacherManagementService from './services/TeacherManagement';
import { useRateLimitedUpload } from '../../hooks/useRateLimitedUpload';
import UploadProgressIndicator from '../common/UploadProgressIndicator';
import { useToast } from '../../context/ToastContext';

export default function TeacherManagement() {
  // Toast notifications
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  
  const [teachers, setTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    expertise: [],
    qualification: '',
    experience: 0,
    active: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const fileInputRef = useRef(null);
  const tooltipRef = useRef(null);

  // Rate-limited upload hook
  const { uploadState, handleUpload, resetUploadState } = useRateLimitedUpload(
    // Processor function for faculty imports
    async (facultyBatch) => {
      const results = [];
      for (const faculty of facultyBatch) {
        try {
          const result = await TeacherManagementService.processSingleFacultyImport(faculty);
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            error: error.message,
            item: faculty
          });
        }
      }
      return results;
    }
  );

  // Function to fetch all teachers on component mount
  useEffect(() => {
    fetchTeachers();
  }, []);

  // Handle clicks outside tooltip
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

  const fetchTeachers = async () => {
    try {
      setIsLoading(true);
      const response = await TeacherManagementService.fetchTeachers();
      if (response.success) {
        setTeachers(response.teachers);
      } else {
        showError('Failed to load teachers', {
          details: response.error,
          duration: 8000
        });
        // Use dummy data as fallback
        setTeachers(TeacherManagementService.dummyTeachers);
      }
    } catch (error) {
      showError('Failed to load teachers', {
        details: error.message,
        duration: 8000
      });
      // Log errors in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error(error);
      }
      // Use dummy data as fallback
      setTeachers(TeacherManagementService.dummyTeachers);
    } finally {
      setIsLoading(false);
    }
  };

  // Open modal for creating or editing a teacher
  const openModal = (teacher = null) => {
    if (teacher) {
      setFormData({
        name: teacher.name,
        email: teacher.email,
        password: '', // Don't populate password for security
        department: teacher.department,
        expertise: teacher.expertise || [],
        qualification: teacher.qualification || '',
        experience: teacher.experience || 0,
        active: teacher.active
      });
      setEditingId(teacher.id);
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        department: '',
        expertise: [],
        qualification: '',
        experience: 0,
        active: true
      });
      setEditingId(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setShowPassword(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleExpertiseChange = (subject) => {
    // Toggle expertise selection
    if (formData.expertise.includes(subject)) {
      setFormData({
        ...formData,
        expertise: formData.expertise.filter(item => item !== subject)
      });
    } else {
      setFormData({
        ...formData,
        expertise: [...formData.expertise, subject]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      let result;
      
      if (!editingId) {
        // Create new teacher
        result = await TeacherManagementService.createTeacher(formData);
      } else {
        // Update existing teacher
        result = await TeacherManagementService.updateTeacher({
          ...formData,
          id: editingId
        });
      }
      
      if (result.success) {
        showSuccess(`Teacher ${formData.name} ${editingId ? 'updated' : 'created'} successfully`);
        fetchTeachers();
        closeModal();
      } else {
        showError(`Failed to ${editingId ? 'update' : 'create'} teacher`, {
          details: result.error,
          duration: 8000
        });
      }
    } catch (err) {
      showError(`Failed to ${editingId ? 'update' : 'create'} teacher`, {
        details: err.message,
        duration: 8000
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        setIsLoading(true);
        const result = await TeacherManagementService.deleteTeacher(id);
        
        if (result.success) {
          setTeachers(teachers.filter(teacher => teacher.id !== id));
          showSuccess('Teacher deleted successfully');
        } else {
          showError('Failed to delete teacher', {
            details: result.error,
            duration: 8000
          });
        }
      } catch (error) {
        showError('Failed to delete teacher', {
          details: error.message,
          duration: 8000
        });
        // Log errors in development for debugging
        if (process.env.NODE_ENV === 'development') {
          console.error(error);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Trigger the hidden file input
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Comprehensive JSON validation function for teachers
  const validateTeacherData = (teachersArray) => {
    const errors = [];
    const warnings = [];
    const emails = new Set();
    const employeeIds = new Set();
    
    if (!Array.isArray(teachersArray)) {
      errors.push('Data must be an array of teachers');
      return { errors, warnings, isValid: false };
    }
    
    if (teachersArray.length === 0) {
      errors.push('No teachers found in the data');
      return { errors, warnings, isValid: false };
    }
    
    if (teachersArray.length > 500) {
      warnings.push(`Large dataset detected (${teachersArray.length} teachers). This may take a while to process.`);
    }
    
    teachersArray.forEach((teacher, index) => {
      const teacherContext = `Teacher ${index + 1}${teacher.name ? ` (${teacher.name})` : ''}`;
      
      // Check if teacher is an object
      if (typeof teacher !== 'object' || teacher === null) {
        errors.push(`${teacherContext}: Must be an object, found ${typeof teacher}`);
        return;
      }
      
      // Required field validation
      if (!teacher.name || teacher.name.toString().trim() === '') {
        errors.push(`${teacherContext}: Missing or empty name`);
      } else {
        const name = teacher.name.toString().trim();
        if (name.length > 100) {
          warnings.push(`${teacherContext}: Name is very long (${name.length} characters)`);
        }
      }
      
      // Email validation
      if (teacher.email) {
        const email = teacher.email.toString().trim().toLowerCase();
        if (emails.has(email)) {
          errors.push(`${teacherContext}: Duplicate email "${email}"`);
        } else {
          emails.add(email);
        }
        
        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          warnings.push(`${teacherContext}: Email format appears invalid "${email}"`);
        }
      } else {
        warnings.push(`${teacherContext}: No email provided - will generate default email`);
      }
      
      // Department validation
      if (teacher.department) {
        const validDepts = ['Computer Science', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering', 'Agricultural Engineering', 'Footwear Technology'];
        const dept = teacher.department.toString().trim();
        if (!validDepts.some(validDept => validDept.toLowerCase().includes(dept.toLowerCase()) || dept.toLowerCase().includes(validDept.toLowerCase()))) {
          warnings.push(`${teacherContext}: Unknown department "${dept}". Common departments: ${validDepts.slice(0, 3).join(', ')}, etc.`);
        }
      } else {
        warnings.push(`${teacherContext}: No department specified`);
      }
      
      // Experience validation
      if (teacher.experience !== undefined && teacher.experience !== null) {
        const experience = parseInt(teacher.experience);
        if (isNaN(experience)) {
          warnings.push(`${teacherContext}: Experience should be a number, found "${teacher.experience}". Will default to 0.`);
        } else if (experience < 0) {
          warnings.push(`${teacherContext}: Experience cannot be negative (${experience}). Will default to 0.`);
        } else if (experience > 50) {
          warnings.push(`${teacherContext}: Very high experience (${experience} years) - please verify`);
        }
      }
      
      // Expertise validation
      if (teacher.expertise !== undefined) {
        if (typeof teacher.expertise === 'string') {
          warnings.push(`${teacherContext}: Expertise should be an array, found string. Will be converted to array.`);
        } else if (!Array.isArray(teacher.expertise)) {
          warnings.push(`${teacherContext}: Expertise should be an array, found ${typeof teacher.expertise}. Will be converted to empty array.`);
        }
      }
      
      // Employee ID validation
      if (teacher.employeeId || teacher.id) {
        const empId = (teacher.employeeId || teacher.id).toString().trim();
        if (employeeIds.has(empId)) {
          errors.push(`${teacherContext}: Duplicate employee ID "${empId}"`);
        } else {
          employeeIds.add(empId);
        }
      }
      
      // Check for unexpected fields
      const expectedFields = ['name', 'email', 'department', 'expertise', 'qualification', 'experience', 'active', 'employeeId', 'id', 'phoneNumber', 'phone', 'address', 'joiningDate', 'designation'];
      const actualFields = Object.keys(teacher);
      const unexpectedFields = actualFields.filter(field => !expectedFields.includes(field));
      
      if (unexpectedFields.length > 0) {
        warnings.push(`${teacherContext}: Unexpected fields found: ${unexpectedFields.join(', ')}. These will be ignored.`);
      }
    });
    
    return {
      errors,
      warnings,
      isValid: errors.length === 0,
      teacherCount: teachersArray.length,
      duplicateEmails: teachersArray.length - emails.size,
      duplicateIds: teachersArray.length - employeeIds.size
    };
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
          
          // Handle both direct array format and object with teachers/faculty property
          let teachersArray;
          if (Array.isArray(jsonData)) {
            teachersArray = jsonData;
          } else if (jsonData.teachers && Array.isArray(jsonData.teachers)) {
            teachersArray = jsonData.teachers;
          } else if (jsonData.faculty && Array.isArray(jsonData.faculty)) {
            teachersArray = jsonData.faculty;
          } else {
            throw new Error('JSON data must be an array of teachers/faculty or contain a "teachers" or "faculty" array');
          }

          if (teachersArray.length === 0) {
            showWarning('The selected file contains no teachers to import');
            setIsLoading(false);
            return;
          }

          // Validate the teacher data structure and content
          const validation = validateTeacherData(teachersArray);
          
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
          
          // Show warnings if any, but allow upload to proceed
          if (validation.warnings.length > 0) {
            const warningDetails = validation.warnings.slice(0, 8).join('\n') + 
              (validation.warnings.length > 8 ? `\n... and ${validation.warnings.length - 8} more warnings` : '');
            
            showWarning(`⚠️ Data validation completed with ${validation.warnings.length} warning(s)`, {
              details: `${warningDetails}\n\nYou can proceed with the upload, but please review these warnings.`,
              duration: 15000
            });
          } else {
            // No errors or warnings
            showSuccess(`✅ Data validation passed! Ready to import ${validation.teacherCount} teachers`, {
              duration: 5000
            });
          }

          // Brief delay to let user see validation results
          setTimeout(() => {
            showInfo(`🚀 Starting import of ${teachersArray.length} teachers...`);

            // Start rate-limited upload
            handleUpload(teachersArray, {
              batchSize: 1, // Process one teacher at a time
              onComplete: (results) => {
                const successful = results.filter(r => r.success).length;
                const failed = results.filter(r => !r.success).length;
                const failedItems = results.filter(r => !r.success);
                
                // Show toasts immediately
                if (failed === 0) {
                  showSuccess(`✅ Successfully imported all ${successful} teachers!`, {
                    duration: 8000
                  });
                } else if (successful > 0) {
                  // Format error details for display
                  const errorSummary = failedItems.slice(0, 5).map(item => 
                    `${item.item?.name || 'Unknown'}: ${item.error}`
                  ).join('\n');
                  const moreErrors = failedItems.length > 5 ? `\n... and ${failedItems.length - 5} more errors` : '';
                  
                  showWarning(`⚠️ Import completed: ${successful} successful, ${failed} failed`, {
                    details: errorSummary + moreErrors,
                    duration: 15000
                  });
                } else {
                  // Format error details for display
                  const errorSummary = failedItems.slice(0, 5).map(item => 
                    `${item.item?.name || 'Unknown'}: ${item.error}`
                  ).join('\n');
                  const moreErrors = failedItems.length > 5 ? `\n... and ${failedItems.length - 5} more errors` : '';
                  
                  showError(`❌ Import failed: All ${failed} teachers failed to import`, {
                    details: errorSummary + moreErrors,
                    duration: 20000
                  });
                }
                
                // Refresh the teachers list and update loading state
                fetchTeachers();
                setIsLoading(false);
                
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
          }, validation.warnings.length > 0 ? 3000 : 1000); // Longer delay if there are warnings
          
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
    if (e.target) {
      e.target.value = '';
    }
  };

  // Download example JSON dataset
  const downloadExampleJSON = () => {
    const exampleData = TeacherManagementService.getExampleJSONDataset();
    
    const blob = new Blob([JSON.stringify(exampleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'faculty_dataset_example.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 relative">
      <h1 className="text-2xl font-bold mb-6">Faculty Management</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <span>{error}</span>
        </div>
      )}
      
      {/* Teachers Table */}
      <div className="overflow-x-auto rounded-2xl shadow-xl">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-indigo-100 to-purple-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Expertise</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Qualification</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Experience (Years)</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {teachers.map((teacher, idx) => (
              <tr key={teacher.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-medium ${TeacherManagementService.getAvatarBg(teacher.name)}`}>
                      {TeacherManagementService.getInitials(teacher.name)}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                      <div className="text-sm text-gray-500">{teacher.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiLayers className="text-gray-500 mr-2" />
                    <span>{teacher.department}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {teacher.expertise && teacher.expertise.map((item) => (
                      <span 
                        key={item}
                        className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiAward className="text-amber-500 mr-2" />
                    <span>{teacher.qualification}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {teacher.experience} years
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${teacher.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {teacher.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button 
                    onClick={() => openModal(teacher)}
                    className="text-indigo-600 hover:text-indigo-900 mx-1"
                  >
                    <FiEdit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(teacher.id)}
                    className="text-red-600 hover:text-red-900 mx-1"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating Buttons Group */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4">
        {/* Upload Faculty Dataset Button with Info Icon */}
        <div className="flex items-center relative group">
          <button
            onClick={handleUploadClick}
            className="p-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg hover:scale-105 transition flex items-center"
          >
            <FiUpload size={20} className="mr-2" />
            <span>Upload Faculty Dataset</span>
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
              <FiInfo size={16} className="text-blue-600" />
            </button>
            
            {/* Tooltip */}
            {showInfoTooltip && (
              <div className="absolute bottom-full right-0 mb-2 w-72 bg-white rounded-lg shadow-xl p-4 text-sm border border-gray-200 z-50">
                <p className="font-medium mb-2 text-gray-700">JSON Dataset Format</p>
                <p className="text-gray-600 mb-3">Upload a JSON file containing faculty data. Supports:</p>
                <ul className="text-gray-600 mb-3 text-xs space-y-1">
                  <li>• Direct array format</li>
                  <li>• Object with "teachers" property</li>
                  <li>• Object with "faculty" property</li>
                </ul>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadExampleJSON();
                  }}
                  className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
                >
                  <FiDownload size={14} className="mr-1" />
                  Download Example Format
                </button>
              </div>
            )}
          </div>
          
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        
        {/* Add New Teacher Button */}
        <button
          onClick={() => openModal()}
          className="p-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:scale-105 transition flex items-center"
        >
          <FiPlus size={24} className="mr-1" />
          <span>Add New Teacher</span>
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-11/12 max-w-3xl animate-fade-in-up overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <FiBookOpen className="mr-2 text-indigo-600" />
              {editingId ? 'Edit Teacher' : 'Add New Teacher'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information Section */}
              <div className="bg-indigo-50 p-4 rounded-xl mb-4">
                <h3 className="text-lg font-medium text-indigo-800 mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name Input */}
                  <div className="relative">
                    <input
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-400 focus:outline-none peer pt-6"
                      placeholder=" "
                    />
                    <label 
                      htmlFor="name"
                      className="absolute left-4 top-3 text-gray-500 text-sm transition-all peer-focus:top-1 peer-focus:text-xs peer-focus:text-indigo-500 peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-xs"
                    >
                      Full Name
                    </label>
                  </div>

                  {/* Email Input */}
                  <div className="relative">
                    <input
                      name="email"
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-400 focus:outline-none peer pt-6"
                      placeholder=" "
                    />
                    <label 
                      htmlFor="email"
                      className="absolute left-4 top-3 text-gray-500 text-sm transition-all peer-focus:top-1 peer-focus:text-xs peer-focus:text-indigo-500 peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-xs"
                    >
                      Email Address
                    </label>
                  </div>

                  {/* Password Input with Toggle */}
                  <div className="relative">
                    <input
                      name="password"
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      required={!editingId}
                      className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-400 focus:outline-none peer pt-6 pr-12"
                      placeholder=" "
                    />
                    <label 
                      htmlFor="password"
                      className="absolute left-4 top-3 text-gray-500 text-sm transition-all peer-focus:top-1 peer-focus:text-xs peer-focus:text-indigo-500 peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-xs"
                    >
                      Password {editingId && '(leave blank to keep current)'}
                    </label>
                    <button 
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>

                  {/* Department Dropdown */}
                  <div className="relative">
                    <select
                      name="department"
                      id="department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-400 focus:outline-none appearance-none pt-6"
                    >
                      <option value="" disabled>Select Department</option>
                      {TeacherManagementService.departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <label 
                      htmlFor="department"
                      className="absolute left-4 top-1 text-xs text-indigo-500"
                    >
                      Department
                    </label>
                  </div>
                </div>
              </div>

              {/* Professional Details Section */}
              <div className="bg-purple-50 p-4 rounded-xl mb-4">
                <h3 className="text-lg font-medium text-purple-800 mb-3">Professional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Qualification Input */}
                  <div className="relative">
                    <input
                      name="qualification"
                      id="qualification"
                      value={formData.qualification}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-purple-400 focus:outline-none peer pt-6"
                      placeholder=" "
                    />
                    <label 
                      htmlFor="qualification"
                      className="absolute left-4 top-3 text-gray-500 text-sm transition-all peer-focus:top-1 peer-focus:text-xs peer-focus:text-purple-500 peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-xs"
                    >
                      Highest Qualification
                    </label>
                  </div>

                  {/* Experience Input */}
                  <div className="relative">
                    <input
                      name="experience"
                      id="experience"
                      type="number"
                      min="0"
                      value={formData.experience}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-purple-400 focus:outline-none peer pt-6"
                      placeholder=" "
                    />
                    <label 
                      htmlFor="experience"
                      className="absolute left-4 top-3 text-gray-500 text-sm transition-all peer-focus:top-1 peer-focus:text-xs peer-focus:text-purple-500 peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-xs"
                    >
                      Years of Experience
                    </label>
                  </div>
                </div>
              
                {/* Areas of Expertise */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Areas of Expertise (Select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TeacherManagementService.subjectAreas.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => handleExpertiseChange(subject)}
                        className={`text-sm px-3 py-1 rounded-full border ${
                          formData.expertise.includes(subject)
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Status Toggle */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-full">
                <span className="text-sm font-medium text-gray-700">Teacher Status</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="active"
                    checked={formData.active}
                    onChange={handleChange}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {formData.active ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-100 transition flex items-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 transition flex items-center"
                >
                  {isLoading ? 'Saving...' : editingId ? 'Update Teacher' : 'Create Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Progress Indicator */}
      <UploadProgressIndicator 
        uploadState={uploadState}
        onDismiss={resetUploadState}
        showQueueInfo={true}
      />
    </div>
  );
}