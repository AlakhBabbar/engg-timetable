import { useState, useEffect, useRef } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiUser, FiBookOpen, FiAward, FiLayers, FiUpload, FiInfo, FiDownload, FiX, FiAlertTriangle, FiCheckCircle, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import TeacherManagementService from './services/TeacherManagement';
import { useRateLimitedUpload } from '../../hooks/useRateLimitedUpload';
import UploadProgressIndicator from '../common/UploadProgressIndicator';
import { useToast } from '../../context/ToastContext';

export default function TeacherManagement() {
  // Toast notifications
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  
  const [teachers, setTeachers] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
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

  // Upload confirmation states
  const [showUploadConfirmation, setShowUploadConfirmation] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [pendingUploadData, setPendingUploadData] = useState(null);
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Rate-limited upload hook
  const { uploadState, handleUpload, handleCancel, resetUploadState } = useRateLimitedUpload(
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

  // Clear selections when teachers list changes
  useEffect(() => {
    setSelectedTeachers(new Set());
    setShowBulkActions(false);
    setCurrentPage(1); // Reset to first page when data changes
  }, [teachers]);

  // Pagination calculations
  const totalPages = Math.ceil(teachers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTeachers = teachers.slice(startIndex, endIndex);

  // Pagination helper functions
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing page size
  };

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

  // Handle individual teacher selection
  const handleTeacherSelect = (teacherId) => {
    const newSelected = new Set(selectedTeachers);
    if (newSelected.has(teacherId)) {
      newSelected.delete(teacherId);
    } else {
      newSelected.add(teacherId);
    }
    setSelectedTeachers(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  // Handle select all toggle
  const handleSelectAll = () => {
    const currentTeacherIds = currentTeachers.map(teacher => teacher.id);
    const currentlySelectedOnPage = currentTeacherIds.filter(id => selectedTeachers.has(id));
    
    if (currentlySelectedOnPage.length === currentTeachers.length) {
      // Deselect all on current page
      const newSelected = new Set(selectedTeachers);
      currentTeacherIds.forEach(id => newSelected.delete(id));
      setSelectedTeachers(newSelected);
      setShowBulkActions(newSelected.size > 0);
    } else {
      // Select all on current page
      const newSelected = new Set(selectedTeachers);
      currentTeacherIds.forEach(id => newSelected.add(id));
      setSelectedTeachers(newSelected);
      setShowBulkActions(true);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const selectedCount = selectedTeachers.size;
    const confirmMessage = `Are you sure you want to delete ${selectedCount} teacher${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        setIsLoading(true);
        const teacherIds = Array.from(selectedTeachers);
        const result = await TeacherManagementService.bulkDeleteTeachers(teacherIds);
        
        if (result.success) {
          showSuccess(`Successfully deleted ${result.summary.successful} teacher${result.summary.successful > 1 ? 's' : ''}`, {
            duration: 5000
          });
          await fetchTeachers();
          setSelectedTeachers(new Set());
          setShowBulkActions(false);
        } else {
          const { successful, failed } = result.summary;
          if (successful > 0) {
            showWarning(`Deleted ${successful} teacher${successful > 1 ? 's' : ''}, but ${failed} failed`, {
              details: result.error,
              duration: 8000
            });
            await fetchTeachers();
            setSelectedTeachers(new Set());
            setShowBulkActions(false);
          } else {
            showError('Failed to delete teachers', {
              details: result.error,
              duration: 8000
            });
          }
        }
      } catch (error) {
        showError('Bulk delete operation failed', {
          details: error.message,
          duration: 8000
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

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
          showSuccess('Teacher deleted successfully');
          fetchTeachers();
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
          errors.push(`${teacherContext}: Duplicate email address: ${email}`);
        } else {
          emails.add(email);
        }
        
        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push(`${teacherContext}: Invalid email format: ${email}`);
        }
      } else {
        warnings.push(`${teacherContext}: No email provided`);
      }
      
      // Department validation
      if (teacher.department) {
        const dept = teacher.department.toString().trim();
        if (dept.length > 100) {
          warnings.push(`${teacherContext}: Department name is very long`);
        }
      } else {
        warnings.push(`${teacherContext}: No department specified`);
      }
      
      // Experience validation
      if (teacher.experience !== undefined && teacher.experience !== null) {
        const exp = parseInt(teacher.experience);
        if (isNaN(exp) || exp < 0) {
          warnings.push(`${teacherContext}: Invalid experience value: ${teacher.experience}`);
        } else if (exp > 50) {
          warnings.push(`${teacherContext}: Unusually high experience: ${exp} years`);
        }
      }
      
      // Expertise validation
      if (teacher.expertise !== undefined) {
        if (!Array.isArray(teacher.expertise) && typeof teacher.expertise !== 'string') {
          warnings.push(`${teacherContext}: Expertise should be an array or string`);
        }
      }
      
      // Employee ID validation
      if (teacher.employeeId || teacher.id) {
        const empId = (teacher.employeeId || teacher.id).toString();
        if (employeeIds.has(empId)) {
          errors.push(`${teacherContext}: Duplicate employee ID: ${empId}`);
        } else {
          employeeIds.add(empId);
        }
      }
      
      // Check for unexpected fields
      const expectedFields = ['name', 'email', 'department', 'expertise', 'qualification', 'experience', 'active', 'employeeId', 'id', 'phoneNumber', 'phone', 'address', 'joiningDate', 'designation'];
      const actualFields = Object.keys(teacher);
      const unexpectedFields = actualFields.filter(field => !expectedFields.includes(field));
      
      if (unexpectedFields.length > 0) {
        warnings.push(`${teacherContext}: Unexpected fields found: ${unexpectedFields.join(', ')}`);
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
        details: 'Only .json files are supported for faculty data import',
        duration: 5000
      });
      return;
    }
    
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      // Extract teachers array from different possible formats
      let teachersArray;
      if (Array.isArray(jsonData)) {
        teachersArray = jsonData;
      } else if (jsonData.teachers && Array.isArray(jsonData.teachers)) {
        teachersArray = jsonData.teachers;
      } else if (jsonData.faculty && Array.isArray(jsonData.faculty)) {
        teachersArray = jsonData.faculty;
      } else {
        showError('Invalid JSON format', {
          details: 'Expected an array of teachers or an object with "teachers" or "faculty" property',
          duration: 6000
        });
        return;
      }
      
      // Validate the data
      const validation = validateTeacherData(teachersArray);
      
      // Always show validation results and require confirmation
      setValidationResults(validation);
      setPendingUploadData(teachersArray);
      setWarningsAcknowledged(false);
      setShowUploadConfirmation(true);
      
    } catch (err) {
      if (err instanceof SyntaxError) {
        showError('Invalid JSON format', {
          details: 'Please check your JSON file for syntax errors',
          duration: 6000
        });
      } else {
        showError('Error reading file', {
          details: err.message,
          duration: 6000
        });
      }
    }
    
    // Reset the file input
    if (e.target) {
      e.target.value = '';
    }
  };

  // Handle upload confirmation after validation
  const handleConfirmUpload = async () => {
    if (!pendingUploadData || !validationResults) {
      showError('No data to upload');
      return;
    }

    // Check if warnings exist and are not acknowledged
    if (validationResults.warnings.length > 0 && !warningsAcknowledged) {
      showWarning('Please acknowledge all warnings before proceeding', {
        details: 'Review and check the warnings acknowledgment to continue',
        duration: 5000
      });
      return;
    }

    // Check for validation errors
    if (!validationResults.isValid) {
      showError('Cannot proceed with upload due to validation errors', {
        details: 'Please fix the errors in your data before uploading',
        duration: 6000
      });
      return;
    }

    try {
      setShowUploadConfirmation(false);
      
      showInfo(`Starting upload of ${pendingUploadData.length} faculty records...`, {
        duration: 3000
      });
      
      // Start the rate-limited upload
      await handleUpload(pendingUploadData);
      
      // Show success message and reload page after successful upload
      showSuccess('Upload completed successfully! Reloading page...', {
        duration: 2000
      });
      
      // Reload the page after a short delay to show the success message
      setTimeout(() => {
        window.location.reload();
      }, 2500);
      
    } catch (error) {
      showError('Failed to start upload', {
        details: error.message,
        duration: 8000
      });
    } finally {
      // Clean up pending data
      setPendingUploadData(null);
      setValidationResults(null);
      setWarningsAcknowledged(false);
    }
  };

  // Handle upload cancellation
  const handleCancelUpload = () => {
    setShowUploadConfirmation(false);
    setPendingUploadData(null);
    setValidationResults(null);
    setWarningsAcknowledged(false);
    showInfo('Upload cancelled');
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
      {/* Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Faculty Management</h1>
        
        {/* Action Buttons Group */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Upload Faculty Dataset Button with Info Icon */}
          <div className="flex items-center relative group">
            <button
              onClick={handleUploadClick}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg hover:scale-105 transition flex items-center"
            >
              <FiUpload size={18} className="mr-2" />
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
            className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:scale-105 transition flex items-center"
          >
            <FiPlus size={20} className="mr-2" />
            <span>Add New Teacher</span>
          </button>
        </div>
      </div>
      
      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-sm font-medium text-blue-800">
              {selectedTeachers.size} teacher{selectedTeachers.size > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedTeachers(new Set());
                setShowBulkActions(false);
              }}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition"
            >
              Clear Selection
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <FiTrash2 size={16} />
              Delete Selected ({selectedTeachers.size})
            </button>
          </div>
        </div>
      )}
      
      {/* Teachers Table */}
      <div className="overflow-x-auto rounded-2xl shadow-xl">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-indigo-100 to-purple-100">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={currentTeachers.length > 0 && currentTeachers.every(teacher => selectedTeachers.has(teacher.id))}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                />
              </th>
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
            {currentTeachers.map((teacher, idx) => (
              <tr key={teacher.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedTeachers.has(teacher.id)}
                    onChange={() => handleTeacherSelect(teacher.id)}
                    className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                  />
                </td>
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

      {/* Pagination Controls */}
      {teachers.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center text-sm text-gray-700 gap-4">
            <span>
              Showing {teachers.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, teachers.length)} of {teachers.length} teachers
            </span>
            
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="itemsPerPage" className="text-sm text-gray-600">
                Show:
              </label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600">per page</span>
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              {/* Previous Page Button */}
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <FiChevronLeft size={16} className="mr-1" />
                Previous
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg ${
                        currentPage === page
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              
              {/* Next Page Button */}
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                Next
                <FiChevronRight size={16} className="ml-1" />
              </button>
            </div>
          )}
        </div>
      )}

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

      {/* Upload Confirmation Modal */}
      {showUploadConfirmation && validationResults && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-11/12 max-w-4xl animate-fade-in-up overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                <FiUpload className="mr-3 text-blue-600" />
                Upload Confirmation
              </h2>
              <button
                onClick={handleCancelUpload}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Validation Summary */}
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-medium text-blue-800 mb-2">Upload Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{validationResults.teacherCount}</div>
                    <div className="text-gray-600">Total Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{validationResults.errors.length}</div>
                    <div className="text-gray-600">Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{validationResults.warnings.length}</div>
                    <div className="text-gray-600">Warnings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {validationResults.teacherCount - validationResults.errors.length}
                    </div>
                    <div className="text-gray-600">Valid Records</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Errors */}
            {validationResults.errors.length > 0 && (
              <div className="mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-red-800 mb-3 flex items-center">
                    <FiAlertTriangle className="mr-2" />
                    Validation Errors ({validationResults.errors.length})
                  </h3>
                  <div className="max-h-40 overflow-y-auto">
                    <ul className="space-y-1 text-sm text-red-700">
                      {validationResults.errors.slice(0, 10).map((error, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{error}</span>
                        </li>
                      ))}
                      {validationResults.errors.length > 10 && (
                        <li className="text-red-600 font-medium">
                          ... and {validationResults.errors.length - 10} more errors
                        </li>
                      )}
                    </ul>
                  </div>
                  <div className="mt-3 p-3 bg-red-100 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">
                      ⚠️ Upload cannot proceed with validation errors. Please fix the data and try again.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Warnings */}
            {validationResults.warnings.length > 0 && (
              <div className="mb-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-amber-800 mb-3 flex items-center">
                    <FiAlertTriangle className="mr-2" />
                    Validation Warnings ({validationResults.warnings.length})
                  </h3>
                  <div className="max-h-40 overflow-y-auto">
                    <ul className="space-y-1 text-sm text-amber-700">
                      {validationResults.warnings.slice(0, 10).map((warning, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                      {validationResults.warnings.length > 10 && (
                        <li className="text-amber-600 font-medium">
                          ... and {validationResults.warnings.length - 10} more warnings
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  {/* Warning Acknowledgment */}
                  <div className="mt-4 p-3 bg-amber-100 rounded-lg">
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="checkbox"
                        checked={warningsAcknowledged}
                        onChange={(e) => setWarningsAcknowledged(e.target.checked)}
                        className="mt-1 mr-3 w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                      />
                      <span className="text-sm text-amber-800">
                        <strong>I acknowledge these warnings</strong> and understand that the upload will proceed with the data as-is. 
                        Some records may be processed with default values or may need manual review after import.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {validationResults.isValid && validationResults.warnings.length === 0 && (
              <div className="mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-green-800 mb-2 flex items-center">
                    <FiCheckCircle className="mr-2" />
                    Validation Successful
                  </h3>
                  <p className="text-sm text-green-700">
                    All records passed validation. The upload is ready to proceed.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleCancelUpload}
                className="px-6 py-3 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition flex items-center"
              >
                <FiX className="mr-2" size={16} />
                Cancel
              </button>
              
              <button
                onClick={handleConfirmUpload}
                disabled={
                  !validationResults.isValid || 
                  (validationResults.warnings.length > 0 && !warningsAcknowledged)
                }
                className={`px-6 py-3 rounded-full text-white transition flex items-center ${
                  validationResults.isValid && 
                  (validationResults.warnings.length === 0 || warningsAcknowledged)
                    ? 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                <FiUpload className="mr-2" size={16} />
                {validationResults.warnings.length > 0 && !warningsAcknowledged 
                  ? 'Acknowledge Warnings to Proceed'
                  : !validationResults.isValid 
                  ? 'Fix Errors to Proceed'
                  : `Start Upload (${validationResults.teacherCount} records)`
                }
              </button>
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
