import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUser, FiFilter, FiSearch, FiX, FiClock, FiGrid, FiHome,
  FiCalendar, FiMail, FiEdit, FiChevronDown, FiChevronUp, FiBook,
  FiCheckCircle, FiAlertOctagon
} from 'react-icons/fi';

// Import business logic from service file
import {
  prepareFacultyData,
  getStatusColorClass,
  timeSlots,
  weekDays,
  fetchFacultyTimetableFromDB,
  fetchFacultyListFromDB // <-- new import
} from './services/FacultyTimetable';

export default function FacultyTimetable() {
  // State for faculty data with timetable information
  const [facultyList, setFacultyList] = useState([]); // <-- new state
  const [enhancedFacultyData, setEnhancedFacultyData] = useState([]);
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showOverloadedOnly, setShowOverloadedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // State for the modal
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // State for success message
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageType, setSuccessMessageType] = useState('');
  
  // State for faculty timetable grids
  const [facultyTimetables, setFacultyTimetables] = useState({});

  // Get unique departments from faculty data
  const departments = [...new Set(facultyList.map(faculty => faculty.department))];

  // Fetch faculty list from Firestore on mount
  useEffect(() => {
    const unsubscribe = fetchFacultyListFromDB((list) => {
      setFacultyList(list);
    });
    return () => unsubscribe();
  }, []);

  // Prepare the enhanced faculty data with their schedules when facultyList changes
  useEffect(() => {
    // You may want to fetch courses for each faculty here if needed
    // For now, just pass through the facultyList
    setEnhancedFacultyData(facultyList);
  }, [facultyList]);

  // Fetch timetable for each faculty in real time
  useEffect(() => {
    // For each faculty, subscribe to their timetable
    const unsubscribes = facultyList.map(faculty =>
      fetchFacultyTimetableFromDB(faculty.id, (grid) => {
        setFacultyTimetables(prev => ({ ...prev, [faculty.id]: grid }));
      })
    );
    return () => unsubscribes.forEach(unsub => unsub());
  }, [facultyList]);
  
  // Handle sending timetable to faculty
  const handleSendTimetable = (faculty) => {
    setSuccessMessageType('email');
    setShowSuccessMessage(true);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };
  
  // Handle opening modal to modify assignments
  const handleModifyAssignment = (faculty) => {
    setSelectedFaculty(faculty);
    setShowModal(true);
  };
  
  // Handle closing the modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedFaculty(null);
  };
  
  // Handle saving changes in the modal
  const handleSaveChanges = () => {
    setShowModal(false);
    setSelectedFaculty(null);
    setSuccessMessageType('update');
    setShowSuccessMessage(true);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };
  
  // Filter faculty data based on search term, department, and overloaded status
  const filteredFaculty = enhancedFacultyData.filter(faculty => {
    // Filter by search term
    if (searchTerm && !faculty.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by department
    if (selectedDepartment && faculty.department !== selectedDepartment) {
      return false;
    }
    
    // Filter by overloaded status
    if (showOverloadedOnly && faculty.status !== 'overloaded') {
      return false;
    }
    
    return true;
  });
  
  // Generate the timetable for the mini grid view
  const renderMiniTimetable = (timetableGrid) => {
    if (!timetableGrid) {
      return <div className="text-xs text-gray-400">No timetable</div>;
    }
    // Show only workdays (Monday to Friday) and limited hours
    const daysToShow = weekDays.slice(0, 5);
    const slotsToShow = timeSlots.slice(2, 8); // Show mid-day slots only

    return (
      <div className="grid grid-cols-5 gap-0.5 mt-2">
        {daysToShow.map(day => (
          slotsToShow.map(slot => {
            const cellData = timetableGrid?.[day]?.[slot] || null;
            return (
              <div 
                key={`${day}-${slot}`}
                className={`w-2 h-2 rounded-sm ${
                  cellData 
                    ? `bg-${cellData.color || 'gray'}-500` 
                    : 'bg-gray-200'
                }`}
                title={cellData ? `${cellData.id} - ${day} ${slot}` : 'Free'}
              />
            );
          })
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Faculty Timetable Viewer</h1>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg flex items-center gap-2 hover:bg-indigo-100"
          >
            <FiFilter size={18} />
            Filters
          </button>
        </div>
      </div>
      
      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-4 rounded-xl shadow-md"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">Filter Options</h3>
              <button 
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search by faculty name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Faculty</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FiX size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Department filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent py-2 pl-3 pr-10"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              {/* Overloaded filter checkbox */}
              <div className="flex items-end">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOverloadedOnly}
                    onChange={() => setShowOverloadedOnly(!showOverloadedOnly)}
                    className="h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Overloaded Faculty Only</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFaculty.map((faculty) => (
          <motion.div
            key={faculty.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`border rounded-xl p-5 shadow-md ${getStatusColorClass(faculty.status)} hover:shadow-lg transition cursor-pointer`}
            onClick={() => handleModifyAssignment(faculty)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <div className="relative">
                  {/* Using a placeholder avatar with initials since we don't have actual images */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium bg-${faculty.status === 'overloaded' ? 'red' : faculty.status === 'nearlyFull' ? 'yellow' : 'green'}-600`}>
                    {faculty.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  
                  {/* Status indicator */}
                  <span 
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                      faculty.status === 'overloaded' ? 'bg-red-500' : 
                      faculty.status === 'nearlyFull' ? 'bg-yellow-500' : 
                      'bg-green-500'
                    }`}
                  ></span>
                </div>
                
                <div className="ml-3">
                  <h3 className="font-medium text-gray-800">{faculty.name}</h3>
                  <p className="text-sm text-gray-600">{faculty.department}</p>
                </div>
              </div>
              
              {/* Badge indicator for status */}
              {faculty.status === 'overloaded' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <FiAlertOctagon className="mr-1" size={10} />
                  Overloaded
                </span>
              )}
            </div>
            
            {/* Teaching hours progress bar */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-600">Teaching Hours</span>
                <span className="text-sm text-gray-600">{faculty.weeklyHours}/{faculty.maxHours}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    faculty.status === 'overloaded' ? 'bg-red-500' : 
                    faculty.status === 'nearlyFull' ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`}
                  style={{ width: `${faculty.loadPercentage}%` }}
                ></div>
              </div>
            </div>
            
            {/* Assigned Courses */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Assigned Courses</h4>
              <div className="flex flex-wrap gap-1">
                {(faculty.assignedCourses || []).map(course => (
                  <span 
                    key={course.id}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-${course.color || 'gray'}-100 text-${course.color || 'gray'}-800`}
                  >
                    {course.id}
                  </span>
                ))}
                
                {(faculty.assignedCourses && faculty.assignedCourses.length === 0) && (
                  <span className="text-sm text-gray-500 italic">No courses assigned</span>
                )}
                
                {(!faculty.assignedCourses) && (
                  <span className="text-sm text-gray-500 italic">No courses assigned</span>
                )}
              </div>
            </div>
            
            {/* Mini Timetable Grid */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Weekly Schedule</h4>
              {facultyTimetables[faculty.id]
                ? renderMiniTimetable(facultyTimetables[faculty.id])
                : <div className="text-xs text-gray-400">No timetable</div>
              }
            </div>
            
            {/* Action Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleModifyAssignment(faculty);
                }}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-1"
              >
                <FiEdit size={14} />
                <span>✏ Modify Assignment</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendTimetable(faculty);
                }}
                className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition flex items-center justify-center gap-1"
              >
                <FiMail size={14} />
                <span>📤 Send Timetable</span>
              </button>
            </div>
          </motion.div>
        ))}
        
        {filteredFaculty.length === 0 && (
          <div className="col-span-full bg-white p-8 rounded-xl text-center text-gray-500 border border-gray-200">
            <FiUser size={40} className="mx-auto text-gray-300 mb-2" />
            <p>No faculty found matching your criteria.</p>
          </div>
        )}
      </div>
      
      {/* Success Message Toast */}
      <AnimatePresence>
        {showSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-lg flex items-center"
          >
            <FiCheckCircle className="text-green-500 mr-2" size={20} />
            <span>
              {successMessageType === 'email' 
                ? 'Timetable sent to faculty successfully!' 
                : 'Faculty assignment updated successfully!'}
            </span>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="ml-6 text-green-700 hover:text-green-900"
            >
              <FiX size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Detailed Faculty Modal */}
      <AnimatePresence>
        {showModal && selectedFaculty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="border-b p-5 flex justify-between items-center sticky top-0 bg-white">
                <h2 className="text-xl font-bold flex items-center">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium mr-3 bg-${
                    selectedFaculty.status === 'overloaded' ? 'red' : selectedFaculty.status === 'nearlyFull' ? 'yellow' : 'green'
                  }-600`}>
                    {selectedFaculty.name.split(' ').map(n => n[0]).join('')}
                  </span>
                  {selectedFaculty.name} - Faculty Schedule
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              {/* Modal Body */}
              <div className="p-5">
                {/* Faculty Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-500">Department</h3>
                    <p className="text-lg font-medium">{selectedFaculty.department}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-500">Teaching Load</h3>
                    <div className="flex items-center">
                      <p className="text-lg font-medium">{selectedFaculty.weeklyHours}/{selectedFaculty.maxHours} hours</p>
                      <span 
                        className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          selectedFaculty.status === 'overloaded' ? 'bg-red-100 text-red-800' : 
                          selectedFaculty.status === 'nearlyFull' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'
                        }`}
                      >
                        {selectedFaculty.status === 'overloaded' ? 'Overloaded' : 
                         selectedFaculty.status === 'nearlyFull' ? 'Nearly Full' : 
                         'Available'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-500">Assigned Courses</h3>
                    <p className="text-lg font-medium">{(selectedFaculty.assignedCourses ? selectedFaculty.assignedCourses.length : 0)} courses</p>
                  </div>
                </div>
                
                {/* Course List */}
                <h3 className="font-medium text-lg mb-4">Assigned Courses</h3>
                <div className="bg-white rounded-xl border overflow-hidden mb-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Slots</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Hours</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(selectedFaculty.assignedCourses || []).map(course => {
                        // Count unique time slots for this course
                        const slots = [];
                        Object.entries(selectedFaculty.timetableGrid || {}).forEach(([day, daySlots]) => {
                          Object.entries(daySlots || {}).forEach(([timeSlot, slotData]) => {
                            if (slotData && slotData.id === course.id) {
                              slots.push(`${day}, ${timeSlot}`);
                            }
                          });
                        });
                        
                        return (
                          <tr key={course.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`flex-shrink-0 h-8 w-8 rounded-full bg-${course.color}-100 flex items-center justify-center`}>
                                  <FiBook className={`text-${course.color}-600`} />
                                </div>
                                <div className="ml-4">
                                  <div className="font-medium text-gray-900">{course.id}</div>
                                  <div className="text-sm text-gray-500">{course.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {slots.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {slots.map((slot, index) => (
                                      <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        <FiClock size={10} className="mr-1" />
                                        {slot}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">Not scheduled</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {slots.map((slot, index) => {
                                  const day = slot.split(',')[0].trim();
                                  const time = slot.split(',')[1].trim();
                                  // Find the room used for this slot
                                  const slotData = selectedFaculty.timetableGrid[day][time];
                                  return (
                                    slotData && slotData.id === course.id && (
                                      <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-1 mb-1">
                                        <FiHome size={10} className="mr-1" />
                                        {slotData.room}
                                      </span>
                                    )
                                  );
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${course.color}-100 text-${course.color}-800`}>
                                {course.weeklyHours}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      
                      {(!selectedFaculty.assignedCourses || selectedFaculty.assignedCourses.length === 0) && (
                        <tr>
                          <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                            No courses assigned
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Weekly Timetable */}
                <h3 className="font-medium text-lg mb-4">Weekly Schedule</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Slot</th>
                        {weekDays.slice(0, 5).map(day => (
                          <th key={day} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {timeSlots.map((slot, idx) => (
                        <tr key={slot} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r">
                            {slot}
                          </td>
                          {weekDays.slice(0, 5).map(day => {
                            const cellData = selectedFaculty.timetableGrid[day][slot];
                            return (
                              <td key={`${day}-${slot}`} className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 border-r">
                                {cellData ? (
                                  <div className={`px-2 py-1 rounded bg-${cellData.color}-100 border border-${cellData.color}-200`}>
                                    <div className="font-medium text-gray-900">{cellData.id}</div>
                                    <div className="text-xs">{cellData.room}</div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400">Available</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="border-t p-5 flex justify-between items-center sticky bottom-0 bg-white">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Close
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSendTimetable(selectedFaculty)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center gap-2"
                  >
                    <FiMail size={16} />
                    <span>📤 Send Timetable</span>
                  </button>
                  
                  <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                  >
                    <FiEdit size={16} />
                    <span>✏ Modify Assignment</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}