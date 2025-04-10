import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiFilter, FiX, FiHome, FiUsers, FiMonitor, FiWifi, FiThermometer, FiSave } from 'react-icons/fi';

// Dummy data for rooms
const dummyRooms = [
  { 
    id: 1, 
    roomNumber: 'A101', 
    capacity: 60, 
    features: ['AC', 'Projector', 'SmartBoard'], 
    department: 'Computer Science'
  },
  { 
    id: 2, 
    roomNumber: 'B201', 
    capacity: 40, 
    features: ['Projector', 'Wi-Fi'], 
    department: 'Mechanical Engineering'
  },
  { 
    id: 3, 
    roomNumber: 'C302', 
    capacity: 30, 
    features: ['AC', 'Computers', 'SmartBoard'], 
    department: 'Computer Science'
  },
  { 
    id: 4, 
    roomNumber: 'A105', 
    capacity: 60, 
    features: ['Projector', 'SmartBoard'], 
    department: 'Electrical Engineering'
  },
  { 
    id: 5, 
    roomNumber: 'D101', 
    capacity: 80, 
    features: ['AC', 'Projector', 'Audio System'], 
    department: 'Physics'
  },
];

// Department options
const departmentOptions = ['Computer Science', 'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Physics', 'Mathematics'];

// Feature options with icons
const featureOptions = [
  { id: 'AC', name: 'AC', icon: <FiThermometer /> },
  { id: 'Projector', name: 'Projector', icon: <FiMonitor /> },
  { id: 'SmartBoard', name: 'SmartBoard', icon: <FiMonitor /> },
  { id: 'Wi-Fi', name: 'Wi-Fi', icon: <FiWifi /> },
  { id: 'Computers', name: 'Computers', icon: <FiMonitor /> },
  { id: 'Audio System', name: 'Audio System', icon: <FiUsers /> }
];

export default function RoomManagement() {
  // State variables
  const [rooms, setRooms] = useState(dummyRooms);
  const [filteredRooms, setFilteredRooms] = useState(rooms);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    roomNumber: '',
    capacity: '',
    features: [],
    department: 'Computer Science'
  });

  // Filter rooms whenever filter parameters change
  useState(() => {
    let filtered = [...rooms];
    
    // Apply department filter
    if (selectedDepartment) {
      filtered = filtered.filter(room => room.department === selectedDepartment);
    }
    
    // Apply feature filter
    if (selectedFeature) {
      filtered = filtered.filter(room => room.features.includes(selectedFeature));
    }
    
    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(room => 
        room.roomNumber.toLowerCase().includes(term) || 
        room.department.toLowerCase().includes(term)
      );
    }
    
    setFilteredRooms(filtered);
  }, [rooms, selectedDepartment, selectedFeature, searchTerm]);

  // Handle input changes in form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle feature checkboxes
  const handleFeatureChange = (featureId) => {
    setFormData(prev => {
      if (prev.features.includes(featureId)) {
        return { ...prev, features: prev.features.filter(id => id !== featureId) };
      } else {
        return { ...prev, features: [...prev.features, featureId] };
      }
    });
  };

  // Open modal for new room
  const openNewRoomModal = () => {
    setEditingRoom(null);
    setFormData({
      roomNumber: '',
      capacity: '',
      features: [],
      department: 'Computer Science'
    });
    setShowModal(true);
  };

  // Open modal for editing an existing room
  const openEditRoomModal = (room) => {
    setEditingRoom(room);
    setFormData({
      roomNumber: room.roomNumber,
      capacity: room.capacity,
      features: [...room.features],
      department: room.department
    });
    setShowModal(true);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingRoom) {
      // Update existing room
      const updatedRooms = rooms.map(room => 
        room.id === editingRoom.id ? 
        {
          ...room,
          roomNumber: formData.roomNumber,
          capacity: parseInt(formData.capacity),
          features: formData.features,
          department: formData.department
        } : room
      );
      setRooms(updatedRooms);
    } else {
      // Add new room
      const newRoom = {
        id: rooms.length + 1,
        roomNumber: formData.roomNumber,
        capacity: parseInt(formData.capacity),
        features: formData.features,
        department: formData.department
      };
      setRooms([...rooms, newRoom]);
    }
    setShowModal(false);
  };

  // Delete a room
  const handleDeleteRoom = (id) => {
    const updatedRooms = rooms.filter(room => room.id !== id);
    setRooms(updatedRooms);
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedDepartment('');
    setSelectedFeature('');
    setSearchTerm('');
  };

  // Badge color mapping for departments
  const getDepartmentColorClass = (department) => {
    switch (department) {
      case 'Computer Science':
        return 'bg-blue-100 text-blue-800';
      case 'Mechanical Engineering':
        return 'bg-red-100 text-red-800';
      case 'Electrical Engineering':
        return 'bg-amber-100 text-amber-800';
      case 'Civil Engineering':
        return 'bg-green-100 text-green-800';
      case 'Physics':
        return 'bg-purple-100 text-purple-800';
      case 'Mathematics':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 relative bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Room Management</h1>
      
      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-md mb-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="flex flex-1 flex-col md:flex-row gap-4 w-full lg:w-auto">
            {/* Department Filter */}
            <div className="relative flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">All Departments</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>
            
            {/* Feature Filter */}
            <div className="relative flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Feature</label>
              <select
                value={selectedFeature}
                onChange={(e) => setSelectedFeature(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">All Features</option>
                {featureOptions.map((feature) => (
                  <option key={feature.id} value={feature.id}>{feature.name}</option>
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
                  placeholder="Search by room number or department..."
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
            {(selectedDepartment || selectedFeature || searchTerm) && (
              <button
                onClick={resetFilters}
                className="px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition flex items-center gap-2"
              >
                <FiX size={16} />
                <span>Clear Filters</span>
              </button>
            )}
            
            {/* Add New Room Button */}
            <button
              onClick={openNewRoomModal}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-white font-semibold hover:shadow-lg transition duration-300 flex items-center gap-2"
            >
              <span className="text-lg">➕</span>
              <span>Add Room</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Rooms Table */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Room Number</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Capacity</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Features</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredRooms.length > 0 ? (
                filteredRooms.map((room, index) => (
                  <tr key={room.id} className={`hover:bg-gray-50 transition ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-teal-700">{room.roomNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{room.capacity} Seats</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {room.features.map((feature) => {
                          const featureObj = featureOptions.find(f => f.id === feature);
                          return (
                            <span 
                              key={feature} 
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              <span className="mr-1">
                                {featureObj?.icon || <FiHome size={12} />}
                              </span>
                              {feature}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDepartmentColorClass(room.department)}`}>
                        {room.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => openEditRoomModal(room)}
                          className="text-indigo-600 hover:text-indigo-900 transition"
                          aria-label="Edit room"
                        >
                          <FiEdit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteRoom(room.id)}
                          className="text-red-500 hover:text-red-700 transition"
                          aria-label="Delete room"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                    No rooms found with the current filters. Try adjusting your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Add/Edit Room Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            className="relative w-full max-w-md bg-white/90 backdrop-blur-xl shadow-xl rounded-3xl mx-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Close button */}
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            >
              <FiX size={24} />
            </button>
            
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">
                {editingRoom ? 'Edit Room' : 'Add New Room'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Room Number */}
                <div className="relative">
                  <div className="flex items-center mb-1">
                    <FiHome size={16} className="text-teal-600 mr-2" />
                    <label className="block text-sm font-medium text-gray-600">Room Number</label>
                  </div>
                  <input
                    type="text"
                    name="roomNumber"
                    value={formData.roomNumber}
                    onChange={handleChange}
                    required
                    placeholder="A101"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                
                {/* Capacity */}
                <div className="relative">
                  <div className="flex items-center mb-1">
                    <FiUsers size={16} className="text-teal-600 mr-2" />
                    <label className="block text-sm font-medium text-gray-600">Capacity</label>
                  </div>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                    required
                    min="1"
                    placeholder="60"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                
                {/* Features */}
                <div className="relative">
                  <div className="flex items-center mb-1">
                    <FiMonitor size={16} className="text-teal-600 mr-2" />
                    <label className="block text-sm font-medium text-gray-600">Features</label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {featureOptions.map((feature) => (
                      <div key={feature.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`feature-${feature.id}`}
                          checked={formData.features.includes(feature.id)}
                          onChange={() => handleFeatureChange(feature.id)}
                          className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                        />
                        <label 
                          htmlFor={`feature-${feature.id}`}
                          className="text-sm flex items-center gap-1 cursor-pointer"
                        >
                          <span>{feature.icon}</span>
                          <span>{feature.name}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Department */}
                <div className="relative">
                  <div className="flex items-center mb-1">
                    <FiUsers size={16} className="text-teal-600 mr-2" />
                    <label className="block text-sm font-medium text-gray-600">Department</label>
                  </div>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    {departmentOptions.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
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
                    <FiSave size={18} />
                    <span>💾 Save Room</span>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Floating Add Button that glows on hover */}
      <button
        onClick={openNewRoomModal}
        className="fixed bottom-8 right-8 p-4 rounded-full bg-gradient-to-r from-teal-500 to-blue-500 text-white shadow-lg hover:shadow-teal-200/50 hover:scale-110 transition-all duration-300 flex items-center justify-center"
      >
        <span className="text-2xl">➕</span>
      </button>
    </div>
  );
}