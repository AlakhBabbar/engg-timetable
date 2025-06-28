import { useState, useEffect, useRef } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiUser, FiBookOpen, FiAward, FiLayers, FiUpload, FiInfo, FiDownload } from 'react-icons/fi';
import TeacherManagementService from './services/TeacherManagement';
import { useRateLimitedUpload } from '../../hooks/useRateLimitedUpload';
import UploadProgressIndicator from '../common/UploadProgressIndicator';

export default function TeacherManagement() {
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
  const [error, setError] = useState(null);
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
        setError(response.error || 'Failed to load teachers');
        // Use dummy data as fallback
        setTeachers(TeacherManagementService.dummyTeachers);
      }
    } catch (error) {
      setError('Failed to load teachers');
      console.error(error);
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
    setError(null);
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
    setError(null);
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
        fetchTeachers();
        closeModal();
      } else {
        setError(result.error || 'Failed to save teacher information');
      }
    } catch (err) {
      setError(err.message || 'Failed to save teacher information');
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
        } else {
          setError(result.error || 'Failed to delete teacher');
        }
      } catch (error) {
        setError('Failed to delete teacher');
        console.error(error);
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

  // Handle file upload and JSON parsing with rate limiting
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setIsLoading(true);
      setError(null);
      resetUploadState(); // Reset any previous upload state
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          
          // Handle both direct array format and object with teachers/faculty property
          let facultyArray;
          if (Array.isArray(jsonData)) {
            facultyArray = jsonData;
          } else if (jsonData.teachers && Array.isArray(jsonData.teachers)) {
            facultyArray = jsonData.teachers;
          } else if (jsonData.faculty && Array.isArray(jsonData.faculty)) {
            facultyArray = jsonData.faculty;
          } else {
            throw new Error('JSON data must be an array of faculty members or an object with "teachers" or "faculty" property containing an array');
          }

          // Start rate-limited upload
          await handleUpload(facultyArray, {
            batchSize: 1, // Process one faculty member at a time
            onComplete: (results) => {
              const successful = results.filter(r => r.success).length;
              const failed = results.filter(r => !r.success).length;
              
              if (failed === 0) {
                alert(`✅ Successfully imported ${successful} faculty members.`);
              } else {
                alert(`⚠️ Import completed: ${successful} successful, ${failed} failed. Check the progress indicator for details.`);
                console.table(results.filter(r => !r.success));
              }
              
              // Refresh the teachers list
              fetchTeachers();
              setIsLoading(false);
            },
            onError: (error) => {
              setError(`Upload failed: ${error}`);
              setIsLoading(false);
            }
          });
          
        } catch (err) {
          setError(`Error parsing JSON: ${err.message}`);
          console.error(err);
          setIsLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError('Error reading the file');
        setIsLoading(false);
      };
      
      reader.readAsText(file);
      
    } catch (err) {
      setError(err.message || 'An error occurred during file upload');
      setIsLoading(false);
    }
    
    // Reset the file input
    e.target.value = '';
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