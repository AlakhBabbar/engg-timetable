import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCalendar,
  FiFilter,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiHome,
  FiGrid,
  FiClock,
  FiUser,
  FiBookOpen,
  FiInfo,
  FiChevronDown,
  FiX
} from 'react-icons/fi';
import { weekDays, timeSlots } from './services/TimetableBuilder';
import {
  departments,
  roomTypes,
  fetchRoomAvailabilityFromDB, // <-- use new Firestore fetch
  filterRooms,
  getVisibleTimeSlots,
  getVisibleDays,
  getStatusColorClass,
  getStatusText
} from './services/RoomAvailability';

export default function RoomAvailability() {
  // States for filters
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [timeRange, setTimeRange] = useState({ start: '08:00', end: '18:00' });
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'day'
  const [selectedDay, setSelectedDay] = useState(weekDays[0]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState(null);

  // Enhanced room data with availability status
  const [enhancedRoomsData, setEnhancedRoomsData] = useState([]);

  // Fetch room data from Firestore on mount (real-time)
  useEffect(() => {
    const unsubscribe = fetchRoomAvailabilityFromDB((roomsWithAvailability) => {
      setEnhancedRoomsData(roomsWithAvailability);
      if (!selectedRoom && roomsWithAvailability.length > 0) {
        setSelectedRoom(roomsWithAvailability[0]);
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Filtered rooms using the service function
  const filteredRooms = filterRooms(enhancedRoomsData, selectedDepartment, selectedRoomType);

  // Function to refresh data with animation
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // Function to handle print schedule
  const handlePrint = () => {
    window.print();
  };

  // Get visible time slots based on time range filter
  const visibleTimeSlots = getVisibleTimeSlots(timeSlots, timeRange);

  // Get visible days based on view mode
  const visibleDays = getVisibleDays(weekDays, viewMode, selectedDay);

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:max-w-full">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-gray-800">Room Availability Viewer</h1>
        
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg flex items-center gap-2 hover:bg-indigo-100"
          >
            <FiFilter size={18} />
            Filters
          </button>
          
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg flex items-center gap-2 hover:bg-blue-100"
            disabled={isRefreshing}
          >
            <FiRefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh Status
          </button>
          
          <button 
            onClick={handlePrint}
            className="px-4 py-2 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 hover:bg-green-100"
          >
            <FiPrinter size={18} />
            Print Schedule
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
            className="bg-white p-4 rounded-xl shadow-md print:hidden"
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
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select 
                  value={selectedDepartment} 
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                <select 
                  value={selectedRoomType} 
                  onChange={(e) => setSelectedRoomType(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All Types</option>
                  {roomTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <select 
                  value={timeRange.start} 
                  onChange={(e) => setTimeRange({...timeRange, start: e.target.value})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="08:00">8:00 AM</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="16:00">4:00 PM</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <select 
                  value={timeRange.end} 
                  onChange={(e) => setTimeRange({...timeRange, end: e.target.value})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="16:00">4:00 PM</option>
                  <option value="17:00">5:00 PM</option>
                  <option value="18:00">6:00 PM</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Room Selection */}
      <div className="bg-white p-4 rounded-xl shadow-md">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Select Room</h3>
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            {filteredRooms.map(room => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0 min-w-[120px] max-w-xs text-ellipsis overflow-hidden
                  ${selectedRoom?.id === room.id 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
              >
                <div className="flex items-center gap-1">
                  <span>{room.number || room.id}</span>
                  <span className="text-xs">({room.capacity})</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(room.facilities || []).includes('AC') && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      AC
                    </span>
                  )}
                  {(room.facilities || []).includes('Smart Board') && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Smart
                    </span>
                  )}
                  {(room.facilities || []).includes('Projector') && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Proj
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedRoom && (
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-gray-800">{selectedRoom.number || selectedRoom.id} - {selectedRoom.type}</h4>
                <p className="text-sm text-gray-600">Capacity: {selectedRoom.capacity} | Facilities: {(selectedRoom.features || []).join(', ')}</p>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    viewMode === 'day' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Day View
                </button>
                
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    viewMode === 'week' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Week View
                </button>
              </div>
            </div>
            
            {viewMode === 'day' && (
              <div className="flex justify-center space-x-1 mt-3">
                {weekDays.map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      selectedDay === day ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Availability Grid */}
        {selectedRoom && (
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden shadow-md border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r"
                      >
                        Time Slot
                      </th>
                      {visibleDays.map(day => (
                        <th 
                          key={day} 
                          scope="col" 
                          className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {visibleTimeSlots.map((slot, idx) => (
                      <tr key={slot} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r">
                          {slot}
                        </td>
                        {visibleDays.map(day => {
                          const slotData =
                            selectedRoom &&
                            selectedRoom.availability &&
                            selectedRoom.availability[day] &&
                            selectedRoom.availability[day][slot]
                              ? selectedRoom.availability[day][slot]
                              : {};
                          return (
                            <td 
                              key={`${day}-${slot}`}
                              className="relative p-2 border-r text-center"
                              onMouseEnter={() => setHoveredSlot(`${day}-${slot}`)}
                              onMouseLeave={() => setHoveredSlot(null)}
                            >
                              <div 
                                className={`
                                  h-full min-h-[50px] p-2 rounded-md border cursor-pointer transition-colors
                                  ${getStatusColorClass(slotData.status)}
                                `}
                              >
                                {slotData.course ? (
                                  <>
                                    <div className="font-semibold text-sm">{slotData.course.id}</div>
                                    <div className="text-xs">{slotData.course.faculty?.name}</div>
                                  </>
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <span className="text-sm font-medium text-green-700">Available</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Tooltip */}
                              {hoveredSlot === `${day}-${slot}` && slotData.course && (
                                <div className="absolute z-10 w-56 p-3 bg-white rounded-lg shadow-lg border border-gray-200 text-left top-full left-1/2 transform -translate-x-1/2 mt-1">
                                  <div className="font-semibold">{slotData.course.name}</div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    <div className="flex items-center gap-1">
                                      <FiBookOpen className="text-gray-400" size={12} />
                                      <span>{slotData.course.id}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <FiUser className="text-gray-400" size={12} />
                                      <span>{slotData.course.faculty.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <FiClock className="text-gray-400" size={12} />
                                      <span>{slot}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                      <span className={`
                                        inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium
                                        ${slotData.status === 0 ? 'bg-green-100 text-green-800' :
                                          slotData.status === 1 ? 'bg-red-100 text-red-800' :
                                          'bg-yellow-100 text-yellow-800'}
                                      `}>
                                        {getStatusText(slotData.status)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
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
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white p-4 rounded-xl shadow-md print:mt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Color Legend</h3>
        <div className="flex space-x-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-1"></div>
            <span className="text-xs text-gray-600">Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-1"></div>
            <span className="text-xs text-gray-600">Occupied</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-1"></div>
            <span className="text-xs text-gray-600">Tentative</span>
          </div>
        </div>
      </div>
    </div>
  );
}