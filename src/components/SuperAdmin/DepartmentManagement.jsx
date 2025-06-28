import { useState, useEffect } from 'react';
import { FiBookOpen, FiUser, FiSearch, FiEdit, FiTrash2, FiBook, FiToggleRight } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import { 
  getAllDepartments, 
  getHODOptions, 
  searchDepartments, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment,
  departmentTypes 
} from './services/DepartmentManagement';

export default function DepartmentManagement() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: '', hod: '', description: '', status: 'Active' });
  const [searchTerm, setSearchTerm] = useState('');
  const [departments, setDepartments] = useState([]);
  const [hodOptions, setHodOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingDepartment, setEditingDepartment] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    // Load initial data
    const fetchData = async () => {
      const depts = await getAllDepartments();
      setDepartments(depts);
      
      const hods = await getHODOptions();
      setHodOptions(hods);
    };
    
    fetchData();
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && showModal) {
        closeModal();
      }
    };

    if (showModal) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  const openModal = () => {
    setFormData({ name: '', type: '', hod: '', description: '', status: 'Active' });
    setEditingDepartment(null);
    setError('');
    setShowModal(true);
  };
  
  const openEditModal = (department) => {
    setFormData({
      name: department.name,
      type: department.type,
      hod: department.hod === 'Not Assigned' ? '' : department.hod,
      description: department.description || '',
      status: department.status
    });
    setEditingDepartment(department);
    setError('');
    setShowModal(true);
  };
  
  const closeModal = () => {
    setShowModal(false);
    setFormData({ name: '', type: '', hod: '', description: '', status: 'Active' });
    setEditingDepartment(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Department name is required');
      return false;
    }
    if (!formData.type) {
      setError('Department type is required');
      return false;
    }
    if (formData.name.trim().length < 2) {
      setError('Department name must be at least 2 characters long');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      if (editingDepartment) {
        // Update existing department
        const updatedDepartment = await updateDepartment({
          ...formData,
          id: editingDepartment.id
        });
        setDepartments(departments.map(d => d.id === updatedDepartment.id ? updatedDepartment : d));
        addToast(`Department "${formData.name}" updated successfully!`, 'success');
      } else {
        // Create new department
        const newDepartment = await createDepartment(formData);
        setDepartments([...departments, newDepartment]);
        addToast(`Department "${formData.name}" created successfully!`, 'success');
      }
      
      setFormData({ name: '', type: '', hod: '', description: '', status: 'Active' });
      closeModal();
    } catch (err) {
      const errorMessage = err.message || `Failed to ${editingDepartment ? 'update' : 'create'} department`;
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    try {
      const filtered = await searchDepartments(term);
      setDepartments(filtered);
    } catch (err) {
      addToast('Search failed. Please try again.', 'error');
      console.error('Search error:', err);
    }
  };

  const handleEdit = (dept) => {
    openEditModal(dept);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
      return;
    }
    
    try {
      const result = await deleteDepartment(id);
      if (result.success) {
        setDepartments(departments.filter(dept => dept.id !== id));
        addToast('Department deleted successfully!', 'success');
      } else {
        addToast(result.error || 'Failed to delete department', 'error');
      }
    } catch (err) {
      addToast('Failed to delete department', 'error');
    }
  };

  return (
    <div className="p-6 relative">
      <h1 className="text-2xl font-bold mb-6">Departments</h1>

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-grow max-w-md">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search departments..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200 focus:ring-2 focus:ring-indigo-400 focus:border-transparent backdrop-blur-sm bg-white/30"
          />
        </div>

        <button
          onClick={openModal}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:scale-105 transition duration-300 flex items-center gap-2"
        >
          🏫 Add Department
        </button>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <div key={dept.id} className="rounded-xl backdrop-blur-lg bg-white/30 border border-white/20 shadow-lg p-6 transition-all hover:shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg">{dept.name}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${dept.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {dept.status}
              </span>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500">Type</span>
                <div className="mt-1">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-600">
                    {dept.type}
                  </span>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">HOD</span>
                <div className="flex items-center gap-2 mt-1">
                  <img src={dept.hodAvatar} alt={dept.hod} className="w-8 h-8 rounded-full" />
                  <span>{dept.hod}</span>
                </div>
              </div>

              <div>
                <span className="text-sm text-gray-500">Total Courses</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 p-2 bg-blue-50 rounded-lg">
                    <FiBook className="text-blue-500" />
                    <span className="font-semibold">{dept.totalCourses}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button 
                onClick={() => handleEdit(dept)}
                className="p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
              >
                <FiEdit size={18} />
              </button>
              <button 
                onClick={() => handleDelete(dept.id)}
                className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition"
              >
                <FiTrash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Empty state when no departments match search */}
      {departments.length === 0 && (
        <div className="text-center py-12 backdrop-blur-lg bg-white/20 rounded-xl">
          <p className="text-gray-500">No departments found matching your search.</p>
        </div>
      )}

      {/* Add Department Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50 p-4"
          onClick={(e) => {
            // Close modal when clicking outside
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in-up">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingDepartment ? 'Edit Department' : 'Add New Department'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Department Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department Name *
                  </label>
                  <div className="relative">
                    <FiBookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="e.g., Computer Science"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Department Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  >
                    <option value="">Select Department Type</option>
                    {departmentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* HOD Assignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Head of Department
                  </label>
                  <div className="space-y-3">
                    {/* Quick selection pills */}
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      <div
                        onClick={() => setFormData({...formData, hod: ''})}
                        className={`flex items-center gap-2 px-3 py-2 rounded-full border cursor-pointer transition-all ${
                          formData.hod === '' 
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <span className="text-sm font-medium">No HOD Assigned</span>
                      </div>
                      {hodOptions.map((hod) => (
                        <div 
                          key={hod.id}
                          onClick={() => setFormData({...formData, hod: hod.name})}
                          className={`flex items-center gap-2 px-3 py-2 rounded-full border cursor-pointer transition-all ${
                            formData.hod === hod.name 
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img src={hod.avatar} alt={hod.name} className="w-6 h-6 rounded-full" />
                          <span className="text-sm font-medium">{hod.name}</span>
                          {hod.department && (
                            <span className="text-xs text-gray-500">({hod.department})</span>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Alternative dropdown for easier searching */}
                    <select
                      name="hod"
                      value={formData.hod}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    >
                      <option value="">No HOD Assigned</option>
                      {hodOptions.map((hod) => (
                        <option key={hod.id} value={hod.name}>
                          {hod.name} {hod.department ? `- ${hod.department}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Brief description of the department..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        value="Active"
                        checked={formData.status === 'Active'}
                        onChange={handleChange}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Active</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        value="Inactive"
                        checked={formData.status === 'Inactive'}
                        onChange={handleChange}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Inactive</span>
                    </label>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !formData.name || !formData.type}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {editingDepartment ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <FiBookOpen className="w-4 h-4" />
                    {editingDepartment ? 'Update Department' : 'Create Department'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
