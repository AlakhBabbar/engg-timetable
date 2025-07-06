import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUsers, FiMapPin } from 'react-icons/fi';
import { BsBuilding } from 'react-icons/bs';
import { useToast } from '../../context/ToastContext';
import {
  getColleges,
  addCollege,
  updateCollege,
  deleteCollege,
  getCollegeStats
} from './services/CollegeManagement';

export default function CollegeManagement() {
  const [colleges, setColleges] = useState([]);
  const [filteredColleges, setFilteredColleges] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalColleges: 0,
    totalDepartments: 0,
    totalFaculty: 0
  });
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'Faculty',
    description: '',
    established: '',
    dean: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    status: 'Active'
  });

  const collegeTypes = [
    'Faculty',
    'College',
    'School',
    'Institute',
    'Department'
  ];

  const collegeStatuses = [
    'Active',
    'Inactive',
    'Under Development'
  ];

  // Load data on component mount
  useEffect(() => {
    loadColleges();
    loadStats();
  }, []);

  // Filter colleges based on search term
  useEffect(() => {
    const filtered = colleges.filter(college =>
      college.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      college.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      college.dean.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredColleges(filtered);
  }, [colleges, searchTerm]);

  const loadColleges = async () => {
    try {
      setIsLoading(true);
      const collegeData = await getColleges();
      setColleges(collegeData);
    } catch (error) {
      console.error('Error loading colleges:', error);
      showToast('Failed to load colleges', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getCollegeStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading college stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCollege) {
        await updateCollege(editingCollege.id, formData);
        showToast('College updated successfully', 'success');
      } else {
        await addCollege(formData);
        showToast('College added successfully', 'success');
      }
      
      resetForm();
      loadColleges();
      loadStats();
    } catch (error) {
      console.error('Error saving college:', error);
      showToast('Failed to save college', 'error');
    }
  };

  const handleEdit = (college) => {
    setEditingCollege(college);
    setFormData({
      name: college.name,
      code: college.code,
      type: college.type,
      description: college.description,
      established: college.established,
      dean: college.dean,
      contactEmail: college.contactEmail,
      contactPhone: college.contactPhone,
      address: college.address,
      status: college.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this college?')) {
      try {
        await deleteCollege(id);
        showToast('College deleted successfully', 'success');
        loadColleges();
        loadStats();
      } catch (error) {
        console.error('Error deleting college:', error);
        showToast('Failed to delete college', 'error');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: 'Faculty',
      description: '',
      established: '',
      dean: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      status: 'Active'
    });
    setEditingCollege(null);
    setIsModalOpen(false);
  };

  const getTypeColor = (type) => {
    const colors = {
      'Faculty': 'bg-blue-100 text-blue-800',
      'College': 'bg-green-100 text-green-800',
      'School': 'bg-purple-100 text-purple-800',
      'Institute': 'bg-orange-100 text-orange-800',
      'Department': 'bg-teal-100 text-teal-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Active': 'bg-green-100 text-green-800',
      'Inactive': 'bg-red-100 text-red-800',
      'Under Development': 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">College Management</h1>
          <p className="text-gray-600">Manage colleges and faculties under DEI University</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <FiPlus size={20} />
          Add College
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full mr-4">
              <BsBuilding className="text-blue-600 text-xl" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Colleges</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.totalColleges}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full mr-4">
              <BsBuilding className="text-green-600 text-xl" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Departments</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDepartments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full mr-4">
              <FiUsers className="text-purple-600 text-xl" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Faculty</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.totalFaculty}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search colleges..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Colleges Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-600">Loading colleges...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    College
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dean
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredColleges.map((college) => (
                  <tr key={college.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {college.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Code: {college.code}
                        </div>
                        {college.established && (
                          <div className="text-xs text-gray-400">
                            Est. {college.established}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(college.type)}`}>
                        {college.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {college.dean || 'Not assigned'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{college.contactEmail}</div>
                      {college.contactPhone && (
                        <div className="text-sm text-gray-500">{college.contactPhone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(college.status)}`}>
                        {college.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(college)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(college.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredColleges.length === 0 && !isLoading && (
              <div className="p-8 text-center text-gray-500">
                No colleges found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingCollege ? 'Edit College' : 'Add New College'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  College Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Faculty of Social Science"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  College Code *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., FSS"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {collegeTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the college..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Established Year
                </label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.established}
                  onChange={(e) => setFormData({ ...formData, established: e.target.value })}
                  placeholder="e.g., 1975"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dean/Head
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.dean}
                  onChange={(e) => setFormData({ ...formData, dean: e.target.value })}
                  placeholder="Name of Dean or Head"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="dean@dei.ac.in"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="+91-XXX-XXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Building/Location address within campus"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {collegeStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  {editingCollege ? 'Update' : 'Add'} College
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
