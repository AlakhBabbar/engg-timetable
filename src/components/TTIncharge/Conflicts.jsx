import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiHome,
  FiUser,
  FiLayers,
  FiTool,
  FiSearch,
  FiCheckCircle,
  FiRefreshCw,
  FiGitMerge,
  FiShield
} from 'react-icons/fi';

// Import services and data from the service file
import {
  roomConflictsData,
  facultyConflictsData,
  overlappingCoursesData,
  availableRooms,
  availableFaculty,
  availableTimeSlots,
  markAsResolved,
  changeRoom,
  swapTime,
  reassignFaculty,
  autoResolveConflicts,
  calculateSummary,
  markAllAsResolved
} from './services/Conflicts';

export default function Conflicts() {
  // State for active tab
  const [activeTab, setActiveTab] = useState('faculty');
  
  // State for conflicts data
  const [roomConflicts, setRoomConflicts] = useState(roomConflictsData);
  const [facultyConflicts, setFacultyConflicts] = useState(facultyConflictsData);
  const [overlappingCourses, setOverlappingCourses] = useState(overlappingCoursesData);
  
  // State for expanded card
  const [expandedCards, setExpandedCards] = useState({});
  
  // State for summary data
  const [summary, setSummary] = useState({
    total: 0,
    critical: 0,
    minor: 0,
    resolvedToday: 0
  });
  
  // Auto resolution in progress state
  const [autoResolving, setAutoResolving] = useState(false);
  
  // Calculate summary on component mount and when conflicts change
  useEffect(() => {
    setSummary(calculateSummary(roomConflicts, facultyConflicts, overlappingCourses));
  }, [roomConflicts, facultyConflicts, overlappingCourses]);
  
  // Toggle expanded card
  const toggleExpand = (id) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Mark conflict as resolved
  const handleMarkAsResolved = (id, type) => {
    switch (type) {
      case 'room':
        setRoomConflicts(prev => markAsResolved(prev, id));
        break;
      case 'faculty':
        setFacultyConflicts(prev => markAsResolved(prev, id));
        break;
      case 'overlapping':
        setOverlappingCourses(prev => markAsResolved(prev, id));
        break;
      default:
        break;
    }
  };
  
  // Change room for a conflict
  const handleChangeRoom = (id, type, courseIndex, newRoom) => {
    switch (type) {
      case 'room':
        setRoomConflicts(prev => changeRoom(prev, id, courseIndex, newRoom));
        break;
      case 'overlapping':
        setOverlappingCourses(prev => changeRoom(prev, id, courseIndex, newRoom));
        break;
      default:
        break;
    }
  };
  
  // Swap time for a conflict
  const handleSwapTime = (id, type, courseIndex, newTime) => {
    switch (type) {
      case 'room':
        setRoomConflicts(prev => swapTime(prev, id, courseIndex, newTime));
        break;
      case 'faculty':
        setFacultyConflicts(prev => swapTime(prev, id, courseIndex, newTime));
        break;
      case 'overlapping':
        setOverlappingCourses(prev => swapTime(prev, id, courseIndex, newTime));
        break;
      default:
        break;
    }
  };
  
  // Reassign faculty for a conflict
  const handleReassignFaculty = (id, courseIndex, newFaculty) => {
    setFacultyConflicts(prev => reassignFaculty(prev, id, courseIndex, newFaculty));
  };
  
  // Auto resolve all conflicts
  const handleAutoResolve = () => {
    setAutoResolving(true);
    
    // Simulate auto-resolution with a delay to show progress
    setTimeout(() => {
      const result = autoResolveConflicts(roomConflicts, facultyConflicts, overlappingCourses);
      setRoomConflicts(result.roomConflicts);
      setFacultyConflicts(result.facultyConflicts);
      setOverlappingCourses(result.overlappingCourses);
      setAutoResolving(false);
    }, 1500);
  };
  
  // Handle marking all conflicts as resolved
  const handleMarkAllAsResolved = () => {
    const result = markAllAsResolved(roomConflicts, facultyConflicts, overlappingCourses);
    setRoomConflicts(result.roomConflicts);
    setFacultyConflicts(result.facultyConflicts);
    setOverlappingCourses(result.overlappingCourses);
  };
  
  // Render conflict card for room conflicts
  const renderRoomConflictCard = (conflict) => {
    const isExpanded = expandedCards[conflict.id] || false;
    
    return (
      <motion.div
        layout
        key={conflict.id}
        className={`border rounded-xl overflow-hidden shadow-sm transition-colors ${
          conflict.resolved ? 'bg-green-50 border-green-200' : 
          conflict.isCritical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="p-4 cursor-pointer flex justify-between items-center"
          onClick={() => toggleExpand(conflict.id)}
        >
          <div className="flex items-center space-x-3">
            {conflict.resolved ? (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <FiCheckCircle className="text-green-600" size={18} />
              </div>
            ) : conflict.isCritical ? (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <FiAlertTriangle className="text-red-600" size={18} />
              </div>
            ) : (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <FiAlertTriangle className="text-amber-600" size={18} />
              </div>
            )}
            
            <div>
              <h3 className="font-medium">
                Room <span className="font-semibold text-red-600">{conflict.course1.room}</span> Conflict
              </h3>
              <p className="text-sm text-gray-600">
                {conflict.course1.time}
              </p>
            </div>
          </div>
          
          {isExpanded ? (
            <FiChevronUp className="text-gray-600" />
          ) : (
            <FiChevronDown className="text-gray-600" />
          )}
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 pb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Course 1</span>
                      <span className="text-xs font-semibold">{conflict.course1.id}</span>
                    </div>
                    <h4 className="font-semibold mt-1">{conflict.course1.name}</h4>
                    
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <FiUser className="text-gray-400" size={14} />
                        <span>{conflict.course1.faculty.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="text-gray-400" size={14} />
                        <span>{conflict.course1.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiHome className="text-red-500" size={14} />
                        <span className="text-red-600 font-medium">{conflict.course1.room}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Course 2</span>
                      <span className="text-xs font-semibold">{conflict.course2.id}</span>
                    </div>
                    <h4 className="font-semibold mt-1">{conflict.course2.name}</h4>
                    
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <FiUser className="text-gray-400" size={14} />
                        <span>{conflict.course2.faculty.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="text-gray-400" size={14} />
                        <span>{conflict.course2.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiHome className="text-red-500" size={14} />
                        <span className="text-red-600 font-medium">{conflict.course2.room}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {!conflict.resolved && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">Quick Fix Options</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Change Room for {conflict.course2.id}
                        </label>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                            defaultValue=""
                          >
                            <option value="" disabled>Select Room</option>
                            {availableRooms.filter(r => r !== conflict.course1.room).map(room => (
                              <option key={room} value={room}>{room}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleChangeRoom(
                              conflict.id, 
                              'room', 
                              2, 
                              document.querySelector('select').value
                            )}
                            className="px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Swap Time for {conflict.course2.id}
                        </label>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                            defaultValue=""
                          >
                            <option value="" disabled>Select Time</option>
                            {availableTimeSlots.filter(t => t !== conflict.course1.time).map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleSwapTime(
                              conflict.id, 
                              'room', 
                              2, 
                              document.querySelectorAll('select')[1].value
                            )}
                            className="px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <button
                        onClick={() => handleMarkAsResolved(conflict.id, 'room')}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <FiCheckCircle size={16} />
                        Mark as Resolved
                      </button>
                    </div>
                  </div>
                )}
                
                {conflict.resolved && (
                  <div className="bg-green-100 p-3 rounded-md flex items-center gap-2 text-green-800">
                    <FiCheckCircle className="text-green-600" />
                    <span className="text-sm">Resolved on {new Date(conflict.resolvedDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };
  
  // Render conflict card for faculty conflicts
  const renderFacultyConflictCard = (conflict) => {
    const isExpanded = expandedCards[conflict.id] || false;
    
    return (
      <motion.div
        layout
        key={conflict.id}
        className={`border rounded-xl overflow-hidden shadow-sm transition-colors ${
          conflict.resolved ? 'bg-green-50 border-green-200' : 
          conflict.isCritical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="p-4 cursor-pointer flex justify-between items-center"
          onClick={() => toggleExpand(conflict.id)}
        >
          <div className="flex items-center space-x-3">
            {conflict.resolved ? (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <FiCheckCircle className="text-green-600" size={18} />
              </div>
            ) : conflict.isCritical ? (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <FiAlertTriangle className="text-red-600" size={18} />
              </div>
            ) : (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <FiAlertTriangle className="text-amber-600" size={18} />
              </div>
            )}
            
            <div>
              <h3 className="font-medium">
                <span className="font-semibold text-red-600">{conflict.faculty.name}</span> Conflict
              </h3>
              <p className="text-sm text-gray-600">
                {conflict.course1.time}
              </p>
            </div>
          </div>
          
          {isExpanded ? (
            <FiChevronUp className="text-gray-600" />
          ) : (
            <FiChevronDown className="text-gray-600" />
          )}
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 pb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Course 1</span>
                      <span className="text-xs font-semibold">{conflict.course1.id}</span>
                    </div>
                    <h4 className="font-semibold mt-1">{conflict.course1.name}</h4>
                    
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <FiUser className="text-red-500" size={14} />
                        <span className="text-red-600 font-medium">{conflict.faculty.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="text-gray-400" size={14} />
                        <span>{conflict.course1.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiHome className="text-gray-400" size={14} />
                        <span>{conflict.course1.room}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Course 2</span>
                      <span className="text-xs font-semibold">{conflict.course2.id}</span>
                    </div>
                    <h4 className="font-semibold mt-1">{conflict.course2.name}</h4>
                    
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <FiUser className="text-red-500" size={14} />
                        <span className="text-red-600 font-medium">{conflict.faculty.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="text-gray-400" size={14} />
                        <span>{conflict.course2.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiHome className="text-gray-400" size={14} />
                        <span>{conflict.course2.room}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {!conflict.resolved && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">Quick Fix Options</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Reassign Faculty for {conflict.course2.id}
                        </label>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                            defaultValue=""
                          >
                            <option value="" disabled>Select Faculty</option>
                            {availableFaculty.filter(f => f.id !== conflict.faculty.id).map(faculty => (
                              <option key={faculty.id} value={faculty.id}>{faculty.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleReassignFaculty(
                              conflict.id, 
                              2, 
                              availableFaculty.find(f => f.id === parseInt(document.querySelectorAll('select')[0].value))
                            )}
                            className="px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Swap Time for {conflict.course2.id}
                        </label>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                            defaultValue=""
                          >
                            <option value="" disabled>Select Time</option>
                            {availableTimeSlots.filter(t => t !== conflict.course1.time).map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleSwapTime(
                              conflict.id, 
                              'faculty', 
                              2, 
                              document.querySelectorAll('select')[1].value
                            )}
                            className="px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <button
                        onClick={() => handleMarkAsResolved(conflict.id, 'faculty')}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <FiCheckCircle size={16} />
                        Mark as Resolved
                      </button>
                    </div>
                  </div>
                )}
                
                {conflict.resolved && (
                  <div className="bg-green-100 p-3 rounded-md flex items-center gap-2 text-green-800">
                    <FiCheckCircle className="text-green-600" />
                    <span className="text-sm">Resolved on {new Date(conflict.resolvedDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };
  
  // Render conflict card for overlapping courses
  const renderOverlappingCourseCard = (conflict) => {
    const isExpanded = expandedCards[conflict.id] || false;
    
    return (
      <motion.div
        layout
        key={conflict.id}
        className={`border rounded-xl overflow-hidden shadow-sm transition-colors ${
          conflict.resolved ? 'bg-green-50 border-green-200' : 
          conflict.isCritical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="p-4 cursor-pointer flex justify-between items-center"
          onClick={() => toggleExpand(conflict.id)}
        >
          <div className="flex items-center space-x-3">
            {conflict.resolved ? (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <FiCheckCircle className="text-green-600" size={18} />
              </div>
            ) : conflict.isCritical ? (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <FiAlertTriangle className="text-red-600" size={18} />
              </div>
            ) : (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <FiAlertTriangle className="text-amber-600" size={18} />
              </div>
            )}
            
            <div>
              <h3 className="font-medium">
                Overlapping Courses - Semester <span className="font-semibold text-red-600">{conflict.course1.semester}</span>
              </h3>
              <p className="text-sm text-gray-600">
                {conflict.course1.time}
              </p>
            </div>
          </div>
          
          {isExpanded ? (
            <FiChevronUp className="text-gray-600" />
          ) : (
            <FiChevronDown className="text-gray-600" />
          )}
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 pb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Course 1</span>
                      <span className="text-xs font-semibold">{conflict.course1.id}</span>
                    </div>
                    <h4 className="font-semibold mt-1">{conflict.course1.name}</h4>
                    
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <FiUser className="text-gray-400" size={14} />
                        <span>{conflict.course1.faculty.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="text-red-500" size={14} />
                        <span className="text-red-600 font-medium">{conflict.course1.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiHome className="text-gray-400" size={14} />
                        <span>{conflict.course1.room}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiLayers className="text-gray-400" size={14} />
                        <span>{conflict.course1.program} - Sem {conflict.course1.semester}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Course 2</span>
                      <span className="text-xs font-semibold">{conflict.course2.id}</span>
                    </div>
                    <h4 className="font-semibold mt-1">{conflict.course2.name}</h4>
                    
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <FiUser className="text-gray-400" size={14} />
                        <span>{conflict.course2.faculty.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="text-red-500" size={14} />
                        <span className="text-red-600 font-medium">{conflict.course2.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiHome className="text-gray-400" size={14} />
                        <span>{conflict.course2.room}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiLayers className="text-gray-400" size={14} />
                        <span>{conflict.course2.program} - Sem {conflict.course2.semester}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {!conflict.resolved && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">Quick Fix Options</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Change Room for {conflict.course2.id}
                        </label>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                            defaultValue=""
                          >
                            <option value="" disabled>Select Room</option>
                            {availableRooms.filter(r => r !== conflict.course1.room).map(room => (
                              <option key={room} value={room}>{room}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleChangeRoom(
                              conflict.id, 
                              'overlapping', 
                              2, 
                              document.querySelectorAll('select')[0].value
                            )}
                            className="px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Swap Time for {conflict.course2.id}
                        </label>
                        <div className="flex space-x-2">
                          <select 
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                            defaultValue=""
                          >
                            <option value="" disabled>Select Time</option>
                            {availableTimeSlots.filter(t => t !== conflict.course1.time).map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleSwapTime(
                              conflict.id, 
                              'overlapping', 
                              2, 
                              document.querySelectorAll('select')[1].value
                            )}
                            className="px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <button
                        onClick={() => handleMarkAsResolved(conflict.id, 'overlapping')}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <FiCheckCircle size={16} />
                        Mark as Resolved
                      </button>
                    </div>
                  </div>
                )}
                
                {conflict.resolved && (
                  <div className="bg-green-100 p-3 rounded-md flex items-center gap-2 text-green-800">
                    <FiCheckCircle className="text-green-600" />
                    <span className="text-sm">Resolved on {new Date(conflict.resolvedDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Conflict Detection & Resolution</h1>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
      
      {/* Summary Card */}
      <div className="bg-white rounded-xl shadow-md p-5">
        <div className="flex flex-wrap justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Conflict Summary</h2>
          
          <div className="flex space-x-4">
            <button
              onClick={handleAutoResolve}
              disabled={autoResolving || summary.total === 0}
              className={`px-4 py-2 rounded-lg ${
                autoResolving ? 'bg-gray-200 cursor-wait' : 
                summary.total === 0 ? 'bg-gray-200 cursor-not-allowed text-gray-500' :
                'bg-amber-100 text-amber-800 hover:bg-amber-200'
              } flex items-center gap-2 transition-colors`}
            >
              {autoResolving ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  Auto Resolving...
                </>
              ) : (
                <>
                  <FiTool />
                  🛠 Auto Resolve
                </>
              )}
            </button>
            
            <button 
              className="px-4 py-2 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-2 transition-colors"
            >
              <FiSearch />
              🔍 Review Manually
            </button>
            
            <button 
              className="px-4 py-2 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 flex items-center gap-2 transition-colors"
              onClick={handleMarkAllAsResolved}
            >
              <FiCheckCircle />
              ✅ Mark All as Resolved
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-500">TOTAL CONFLICTS</span>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold text-gray-900">{summary.total}</span>
                <span className="ml-2 text-sm text-gray-600">items</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-red-500">CRITICAL CONFLICTS</span>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold text-red-700">{summary.critical}</span>
                <span className="ml-2 text-sm text-red-600">issues</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-amber-500">MINOR CONFLICTS</span>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold text-amber-700">{summary.minor}</span>
                <span className="ml-2 text-sm text-amber-600">issues</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-green-500">RESOLVED TODAY</span>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold text-green-700">{summary.resolvedToday}</span>
                <span className="ml-2 text-sm text-green-600">conflicts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="border-b">
          <nav className="flex">
            <button 
              onClick={() => setActiveTab('faculty')}
              className={`px-5 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'faculty' ? 
                'border-indigo-600 text-indigo-600' : 
                'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex items-center gap-2`}
            >
              <FiUser size={16} />
              Faculty Conflicts
            </button>
            
            <button 
              onClick={() => setActiveTab('room')}
              className={`px-5 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'room' ? 
                'border-indigo-600 text-indigo-600' : 
                'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex items-center gap-2`}
            >
              <FiHome size={16} />
              Room Conflicts
            </button>
            
            <button 
              onClick={() => setActiveTab('overlapping')}
              className={`px-5 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'overlapping' ? 
                'border-indigo-600 text-indigo-600' : 
                'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex items-center gap-2`}
            >
              <FiGitMerge size={16} />
              Overlapping Courses
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'faculty' && (
            <AnimatePresence>
              <div className="space-y-4">
                {facultyConflicts.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                      <FiCheckCircle className="text-green-600" size={28} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No Faculty Conflicts</h3>
                    <p className="mt-2 text-sm text-gray-500">All faculty schedules are conflict-free!</p>
                  </div>
                ) : (
                  facultyConflicts.map(conflict => renderFacultyConflictCard(conflict))
                )}
              </div>
            </AnimatePresence>
          )}
          
          {activeTab === 'room' && (
            <AnimatePresence>
              <div className="space-y-4">
                {roomConflicts.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                      <FiCheckCircle className="text-green-600" size={28} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No Room Conflicts</h3>
                    <p className="mt-2 text-sm text-gray-500">All rooms are properly scheduled without overlaps!</p>
                  </div>
                ) : (
                  roomConflicts.map(conflict => renderRoomConflictCard(conflict))
                )}
              </div>
            </AnimatePresence>
          )}
          
          {activeTab === 'overlapping' && (
            <AnimatePresence>
              <div className="space-y-4">
                {overlappingCourses.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                      <FiCheckCircle className="text-green-600" size={28} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No Overlapping Courses</h3>
                    <p className="mt-2 text-sm text-gray-500">All courses are scheduled without overlaps for each semester!</p>
                  </div>
                ) : (
                  overlappingCourses.map(conflict => renderOverlappingCourseCard(conflict))
                )}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}