import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUsers, FiMapPin } from 'react-icons/fi';
import { BsBuilding } from 'react-icons/bs';
import { useToast } from '../../context/ToastContext';
import {
  getColleges,
  addCollege,
  updateCollege,
  deleteCollege,
  getCollegeStats,
  getDetailedCollegeStats
} from './services/CollegeManagement';
import { clearCollegeCache } from '../../services/CollegeService';

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
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    established: '',
    dean: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    status: 'Active'
  });

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
      showError('Failed to load colleges');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Load basic stats (dynamic counts from actual database collections)
      const statsData = await getCollegeStats();
      setStats(statsData);
      
      // Optional: Use getDetailedCollegeStats() for more comprehensive analytics
      // const detailedStats = await getDetailedCollegeStats();
      // This includes averages, breakdowns by category, and more metrics
    } catch (error) {
      console.error('Error loading college stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Add 'Faculty' as the default type for all entries
      const facultyData = {
        ...formData,
        type: 'Faculty'
      };
      
      if (editingCollege) {
        await updateCollege(editingCollege.id, facultyData);
        showSuccess('Faculty updated successfully');
      } else {
        await addCollege(facultyData);
        showSuccess('Faculty added successfully');
      }
      
      resetForm();
      clearCollegeCache(); // Clear cache to ensure other components get fresh data
      loadColleges();
      loadStats();
    } catch (error) {
      console.error('Error saving faculty:', error);
      showError('Failed to save faculty');
    }
  };

  const handleEdit = (college) => {
    setEditingCollege(college);
    setFormData({
      name: college.name,
      code: college.code,
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
    if (window.confirm('Are you sure you want to delete this faculty?')) {
      try {
        await deleteCollege(id);
        showSuccess('Faculty deleted successfully');
        clearCollegeCache(); // Clear cache to ensure other components get fresh data
        loadColleges();
        loadStats();
      } catch (error) {
        console.error('Error deleting faculty:', error);
        showError('Failed to delete faculty');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
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
          <h1 className="text-2xl font-bold text-gray-900">Faculty Management</h1>
          <p className="text-gray-600">Manage faculties under DEI University (e.g., Faculty of Engineering, Faculty of Science)</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <FiPlus size={20} />
          Add Faculty
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
              <h3 className="text-sm font-medium text-gray-500">Total Faculties</h3>
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
              placeholder="Search faculties..."
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
                    Faculty
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
                {colleges.length === 0 ? (
                  <div>
                    <BsBuilding className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No faculties found</h3>
                    <p className="text-gray-500 mb-4">Get started by creating your first faculty (e.g., Faculty of Engineering).</p>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                    >
                      Add First Faculty
                    </button>
                  </div>
                ) : (
                  <div>
                    <p>No faculties match your search criteria.</p>
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-indigo-600 hover:text-indigo-800 mt-2"
                    >
                      Clear search
                    </button>
                  </div>
                )}
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
              {editingCollege ? 'Edit Faculty' : 'Add New Faculty'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Faculty Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Faculty of Engineering, Faculty of Science"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Faculty Code *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., FOE, FOS"
                />
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
                  placeholder="Brief description of the faculty..."
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
                  {editingCollege ? 'Update' : 'Add'} Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
