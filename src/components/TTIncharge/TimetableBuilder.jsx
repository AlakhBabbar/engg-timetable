import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSave, FiUpload, FiTrash2, FiFilter, FiChevronDown,
  FiCheck, FiX, FiAlertTriangle, FiCalendar, FiGrid,
  FiList, FiArrowLeft, FiArrowRight, FiRefreshCw,
  FiChevronLeft, FiChevronRight, FiPlus, FiEdit2, FiMaximize2, FiMinimize2
} from 'react-icons/fi';
import { db, collection, getDocs } from '../../firebase/config';

// Import services and data
import { 
  coursesData, facultyData, roomsData, timeSlots, weekDays,
  initializeEmptyTimetable, checkConflicts, addCourseToTimetable,
  saveTimetable, publishTimetable, getCourseColorClass, filterCourses,
  getCompactTimeFormat, getAbbreviatedDay, getCellHeight, 
  getResponsiveClasses, getCompactCourseDisplay, deleteCourse,
  updateTimetableOnDrop, filterConflictsAfterDeletion, filterConflictsAfterMove,
  createTab, updateTabsOnSwitch, deepCopy
} from './services/TimetableBuilder';

export default function TimetableBuilder() {
  // State for screen size detection
  const [isZoomed, setIsZoomed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);
  
  // State for multiple timetable tabs
  const [tabs, setTabs] = useState([
    { id: 1, name: "CSE Timetable", isActive: true }
  ]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [nextTabId, setNextTabId] = useState(2);
  const [isEditingTab, setIsEditingTab] = useState(null);
  const [editTabName, setEditTabName] = useState("");
  
  // State for filters
  const [selectedSemester, setSelectedSemester] = useState('Semester 7');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  
  // State for view mode
  const [viewMode, setViewMode] = useState('week'); 
  const [currentDay, setCurrentDay] = useState('Monday');
  
  // State for the timetable grid
  const [timetablesData, setTimetablesData] = useState({});
  
  // Selected room
  const [selectedRoom, setSelectedRoom] = useState(roomsData[0]);
  
  // Conflicts
  const [conflictsData, setConflictsData] = useState({});
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCourse, setDraggedCourse] = useState(null);
  const [dragSourceInfo, setDragSourceInfo] = useState(null);
  
  // History for undo/redo
  const [historyData, setHistoryData] = useState({});
  const [historyIndices, setHistoryIndices] = useState({});

  // Helper to get current tab's data
  const timetableData = timetablesData[activeTabId] || {};
  const conflicts = conflictsData[activeTabId] || [];
  const history = historyData[activeTabId] || [];
  const historyIndex = historyIndices[activeTabId] || -1;

  // Get responsive classes
  const responsive = getResponsiveClasses(isMobile);
  
  // Filter courses based on selected filters
  const filteredCourses = filterCourses(coursesData, { 
    selectedSemester, selectedDepartment, selectedFaculty 
  });

  // State for fetched and processed course blocks
  const [courseBlocks, setCourseBlocks] = useState([]);

  // Color palette for unique course colors
  const courseColors = [
    'blue', 'indigo', 'purple', 'green', 'amber', 'rose', 'teal', 'pink', 'orange', 'cyan', 'lime', 'red', 'yellow', 'violet', 'emerald', 'sky', 'fuchsia', 'gray'
  ];
  const courseColorMap = {};
  let colorIndex = 0;

  // Fetch and process courses from Firestore
  useEffect(() => {
    async function fetchCourses() {
      const snap = await getDocs(collection(db, 'courses'));
      const allCourses = snap.docs.map(doc => doc.data());
      // Assign unique color per course code
      allCourses.forEach(course => {
        if (!courseColorMap[course.code]) {
          courseColorMap[course.code] = courseColors[colorIndex % courseColors.length];
          colorIndex++;
        }
      });
      // Flatten courses by teacher
      const blocks = [];
      allCourses.forEach(course => {
        const color = courseColorMap[course.code];
        if (Array.isArray(course.teacher)) {
          course.teacher.forEach(teacherObj => {
            blocks.push({
              code: course.code,
              title: course.title,
              weeklyHours: course.weeklyHours,
              teacher: teacherObj,
              color,
              id: `${course.code}-${teacherObj.id}`,
              duration: course.duration || ''
            });
          });
        } else {
          blocks.push({
            code: course.code,
            title: course.title,
            weeklyHours: course.weeklyHours,
            teacher: course.teacher,
            color,
            id: `${course.code}-${course.teacher?.id || 'none'}`,
            duration: course.duration || ''
          });
        }
      });
      setCourseBlocks(blocks);
    }
    fetchCourses();
  }, []);

  // Initialize empty timetable data and check screen size on component mount
  useEffect(() => {
    const initialData = initializeEmptyTimetable();
    
    // Initialize data for the first tab
    setTimetablesData({ 1: initialData });
    setConflictsData({ 1: [] });
    
    // Initialize history for the first tab
    addToHistory(1, initialData);
    
    // Check screen size
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsCompactView(window.innerWidth < 1280);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // State for fetched rooms
  const [rooms, setRooms] = useState([]);

  // Fetch rooms from Firestore on mount
  useEffect(() => {
    async function fetchRooms() {
      const snap = await getDocs(collection(db, 'rooms'));
      const allRooms = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRooms(allRooms);
      // Always set selectedRoom to a valid room if not present or if the current selectedRoom is not in the new list
      if (!selectedRoom || !allRooms.find(r => r.id === selectedRoom.id)) {
        setSelectedRoom(allRooms[0] || null);
      }
    }
    fetchRooms();
  }, []);

  // Ensure selectedRoom is always valid when rooms change
  useEffect(() => {
    if (rooms.length > 0) {
      if (!selectedRoom || !rooms.find(r => r.id === selectedRoom.id)) {
        setSelectedRoom(rooms[0]);
      }
    }
  }, [rooms]);

  // Add a new tab
  const addNewTab = () => {
    const newTabId = nextTabId;
    const initialData = initializeEmptyTimetable();
    
    // Add new tab
    setTabs(prevTabs => [
      ...prevTabs.map(tab => ({ ...tab, isActive: false })),
      createTab(newTabId, `New Timetable ${newTabId}`)
    ]);
    
    // Set the new tab as active
    setActiveTabId(newTabId);
    
    // Initialize data for the new tab
    setTimetablesData(prev => ({ ...prev, [newTabId]: initialData }));
    setConflictsData(prev => ({ ...prev, [newTabId]: [] }));
    
    // Initialize history for the new tab
    addToHistory(newTabId, initialData);
    
    // Increment next tab id
    setNextTabId(prevId => prevId + 1);
  };

  // Switch to a tab
  const switchTab = (tabId) => {
    setTabs(prevTabs => updateTabsOnSwitch(prevTabs, tabId));
    setActiveTabId(tabId);
  };

  // Close a tab
  const closeTab = (tabId, event) => {
    event.stopPropagation();
    
    // Don't close if it's the only tab
    if (tabs.length === 1) return;
    
    // If closing the active tab, switch to another tab first
    if (tabId === activeTabId) {
      const activeIndex = tabs.findIndex(tab => tab.id === activeTabId);
      const newActiveIndex = activeIndex === 0 ? 1 : activeIndex - 1;
      const newActiveTabId = tabs[newActiveIndex].id;
      switchTab(newActiveTabId);
    }
    
    // Remove the tab
    setTabs(prevTabs => prevTabs.filter(tab => tab.id !== tabId));
    
    // Clean up data
    setTimetablesData(prev => {
      const newData = { ...prev };
      delete newData[tabId];
      return newData;
    });
    
    setConflictsData(prev => {
      const newData = { ...prev };
      delete newData[tabId];
      return newData;
    });
    
    setHistoryData(prev => {
      const newData = { ...prev };
      delete newData[tabId];
      return newData;
    });
    
    setHistoryIndices(prev => {
      const newData = { ...prev };
      delete newData[tabId];
      return newData;
    });
  };

  // Start editing tab name
  const startEditingTab = (tabId, event) => {
    event.stopPropagation();
    const tab = tabs.find(t => t.id === tabId);
    setIsEditingTab(tabId);
    setEditTabName(tab.name);
  };

  // Save tab name
  const saveTabName = () => {
    if (isEditingTab) {
      setTabs(prevTabs => prevTabs.map(tab => 
        tab.id === isEditingTab ? { ...tab, name: editTabName || tab.name } : tab
      ));
      setIsEditingTab(null);
      setEditTabName("");
    }
  };

  // Function to add current state to history
  const addToHistory = (tabId, data) => {
    const tabHistory = historyData[tabId] || [];
    const tabHistoryIndex = historyIndices[tabId] || -1;
    
    // Remove any future states if we're not at the end of the history
    const newHistory = tabHistory.slice(0, tabHistoryIndex + 1);
    newHistory.push(deepCopy(data));
    
    setHistoryData(prev => ({ ...prev, [tabId]: newHistory }));
    setHistoryIndices(prev => ({ ...prev, [tabId]: newHistory.length - 1 }));
  };

  // Handle undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndices(prev => ({ ...prev, [activeTabId]: newIndex }));
      setTimetablesData(prev => ({ 
        ...prev, 
        [activeTabId]: deepCopy(history[newIndex])
      }));
    }
  };

  // Handle redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndices(prev => ({ ...prev, [activeTabId]: newIndex }));
      setTimetablesData(prev => ({ 
        ...prev, 
        [activeTabId]: deepCopy(history[newIndex])
      }));
    }
  };

  // Handle drag start - from course list or timetable
  const handleDragStart = (course, fromTimetable = false, day = null, slot = null) => {
    setIsDragging(true);
    setDraggedCourse(course);
    
    if (fromTimetable) {
      setDragSourceInfo({ day, slot });
    } else {
      setDragSourceInfo(null);
    }
  };

  // Handle delete course from timetable
  const handleDeleteCourse = (day, slot, e) => {
    e.stopPropagation(); // Prevent drag events from triggering
    
    const newTimetable = deleteCourse(timetableData, day, slot);
    setTimetablesData(prev => ({ ...prev, [activeTabId]: newTimetable }));
    
    // Filter conflicts related to this cell if any
    const newConflicts = filterConflictsAfterDeletion(conflicts, day, slot);
    setConflictsData(prev => ({ ...prev, [activeTabId]: newConflicts }));
    
    // Add to history
    addToHistory(activeTabId, newTimetable);
  };

  // Handle drop on a timetable cell
  const handleDrop = (day, slot) => {
    if (draggedCourse) {
      // If dragging from the left panel, selectedRoom may be null
      let roomToAssign = selectedRoom;
      if (!roomToAssign || !roomToAssign.id) {
        // Assign a default/empty room if not set
        roomToAssign = { id: '', name: '', capacity: '', availability: '' };
      }
      // Update the timetable with the dropped course
      const newTimetable = updateTimetableOnDrop(
        timetableData, day, slot, draggedCourse, roomToAssign, dragSourceInfo
      );
      
      // If this is a re-drag from another cell, update conflicts related to source
      let updatedConflicts = conflicts;
      if (dragSourceInfo) {
        updatedConflicts = filterConflictsAfterMove(
          conflicts, dragSourceInfo.day, dragSourceInfo.slot
        );
      }
      
      // Check for conflicts at the destination
      const newConflicts = checkConflicts(newTimetable, day, slot, draggedCourse, roomToAssign);
      setConflictsData(prev => ({ 
        ...prev, 
        [activeTabId]: [...updatedConflicts.filter(
          c => !(c.day === day && c.slot === slot)
        ), ...newConflicts]
      }));
      
      // Update timetable data
      setTimetablesData(prev => ({ ...prev, [activeTabId]: newTimetable }));
      
      // Add to history
      addToHistory(activeTabId, newTimetable);
      
      // Reset dragging state
      setIsDragging(false);
      setDraggedCourse(null);
      setDragSourceInfo(null);
    }
  };

  // Handle clearing a week
  const handleClearWeek = () => {
    // Create a new empty timetable
    const newTimetable = initializeEmptyTimetable();
    
    setTimetablesData(prev => ({ ...prev, [activeTabId]: newTimetable }));
    setConflictsData(prev => ({ ...prev, [activeTabId]: [] }));
    
    // Add to history
    addToHistory(activeTabId, newTimetable);
  };

  // Handle resolving a conflict
  const handleResolveConflict = (conflictIndex) => {
    setConflictsData(prev => {
      const newConflicts = [...(prev[activeTabId] || [])];
      newConflicts.splice(conflictIndex, 1);
      return { ...prev, [activeTabId]: newConflicts };
    });
  };

  // Handle save timetable
  const handleSaveTimetable = async () => {
    try {
      const result = await saveTimetable(timetableData);
      alert(result.message);
    } catch (error) {
      alert('Error saving timetable');
    }
  };

  // Handle publish timetable
  const handlePublishTimetable = async () => {
    try {
      const result = await publishTimetable(timetableData, conflicts);
      alert(result.message);
    } catch (error) {
      alert(error.message);
    }
  };

  // Toggle zoom
  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  // For handling click outside the tab editing input
  const tabEditRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tabEditRef.current && !tabEditRef.current.contains(event.target)) {
        saveTabName();
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditingTab, editTabName]);

  return (
    <div className={`space-y-4 ${isZoomed ? 'scale-90 origin-top transition-all duration-300' : ''}`}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Timetable Builder</h1>
        
        {/* Undo/Redo and Zoom Buttons */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handleUndo} 
            disabled={historyIndex <= 0}
            className={`p-1 rounded-lg ${historyIndex <= 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
            title="Undo"
          >
            <FiArrowLeft size={18} />
          </button>
          <button 
            onClick={handleRedo} 
            disabled={historyIndex >= history.length - 1}
            className={`p-1 rounded-lg ${historyIndex >= history.length - 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
            title="Redo"
          >
            <FiArrowRight size={18} />
          </button>
          <button 
            onClick={toggleZoom} 
            className="p-1 rounded-lg text-gray-700 hover:bg-gray-100"
            title={isZoomed ? "Zoom In" : "Zoom Out"}
          >
            {isZoomed ? <FiMaximize2 size={18} /> : <FiMinimize2 size={18} />}
          </button>
        </div>
      </div>
      
      {/* Filters Row */}
      <div className="bg-white p-3 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Semester Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Semester</label>
            <div className="relative">
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="Semester 7">Semester 7</option>
                <option value="Semester 6">Semester 6</option>
              </select>
              <FiChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
            </div>
          </div>
          
          {/* Department Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Branch/Batch</label>
            <input
              type="text"
              value={selectedDepartment || ''}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-2 py-1 text-xs"
              placeholder="Enter branch or batch"
            />
          </div>
          
          {/* Faculty Filter */}
          <div className="hidden md:block">
            <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
            <input
              type="text"
              value={selectedFaculty || ''}
              onChange={e => setSelectedFaculty(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-2 py-1 text-xs"
              placeholder="Enter year"
            />
          </div>
          
          {/* View Toggle */}
          <div className="ml-auto">
            <label className="block text-xs font-medium text-gray-500 mb-1">View Mode</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                className={`px-2 py-1 flex items-center gap-1 ${viewMode === 'week' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setViewMode('week')}
              >
                <FiGrid size={14} />
                <span className="text-xs">Week</span>
              </button>
              <button
                className={`px-2 py-1 flex items-center gap-1 ${viewMode === 'day' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setViewMode('day')}
              >
                <FiList size={14} />
                <span className="text-xs">Day</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className={`flex ${responsive.gapSize}`}>
        {/* Left Panel: Course Blocks */}
        <div className={`${responsive.courseBlockWidth} flex-shrink-0 bg-white rounded-xl shadow-sm p-3 overflow-y-auto max-h-[calc(100vh-220px)]`}>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Course Blocks</h2>
          <div className="space-y-1">
            {courseBlocks.map((block) => (
              <motion.div
                key={block.id}
                className={`p-2 rounded-lg border ${getCourseColorClass(block)} cursor-grab hover:shadow-sm transition`}
                draggable
                onDragStart={() => handleDragStart(block)}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-xs">{block.code}</span>
                  <span className="text-xs px-1 py-0.5 rounded-full bg-white/50">
                    {block.duration || ''}h
                  </span>
                </div>
                <h3 className="text-xs mt-0.5 font-medium line-clamp-1">{isCompactView ? '' : block.title}</h3>
                <div className="text-xs mt-1 flex justify-between items-center">
                  <span className="truncate text-xs" title={block.teacher?.name || ''}>
                    {isCompactView
                      ? (block.teacher?.name ? (block.teacher.name.split(' ')[1] || block.teacher.name) : '')
                      : (block.teacher?.name || '')}
                  </span>
                  <span className="font-mono text-xs">{block.weeklyHours}</span>
                </div>
              </motion.div>
            ))}
            
            {courseBlocks.length === 0 && (
              <div className="text-center py-3 text-gray-500 text-xs">
                No courses match filters
              </div>
            )}
          </div>
        </div>
        
        {/* Center Panel: Timetable Grid */}
        <div className="flex-1 bg-white rounded-xl shadow-sm p-3 overflow-x-auto overflow-y-hidden min-w-[60%]">
          {/* Tabs */}
          <div className="mb-3 border-b pb-2 w-full">
            <div className="flex w-full overflow-hidden">
              <div className="flex flex-nowrap items-center gap-1 w-full">
                {tabs.map(tab => (
                  <div 
                    key={tab.id} 
                    className={`flex items-center gap-1 px-2 py-1 rounded-t-lg cursor-pointer text-xs
                      ${tab.isActive ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    style={{ 
                      maxWidth: isMobile ? '100px' : '130px',
                      flexGrow: 0,
                      flexShrink: 0
                    }}
                    onClick={() => switchTab(tab.id)}
                  >
                    {isEditingTab === tab.id ? (
                      <div ref={tabEditRef} className="flex items-center gap-1">
                        <input 
                          type="text" 
                          value={editTabName} 
                          onChange={(e) => setEditTabName(e.target.value)} 
                          className="px-1 py-0.5 rounded-lg border border-gray-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs w-16"
                        />
                        <button onClick={saveTabName} className="text-gray-700 hover:text-gray-900">
                          <FiCheck size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="truncate block flex-1 text-xs">{tab.name}</span>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                          <button 
                            onClick={(e) => startEditingTab(tab.id, e)} 
                            className="text-gray-400 hover:text-gray-600 hidden md:block"
                          >
                            <FiEdit2 size={12} />
                          </button>
                          <button 
                            onClick={(e) => closeTab(tab.id, e)} 
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <FiX size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <button 
                  onClick={addNewTab} 
                  className="px-2 py-1 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center gap-1 flex-shrink-0 ml-1 text-xs"
                >
                  <FiPlus size={12} />
                  <span className="hidden md:inline">New Tab</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold text-gray-700">
              {viewMode === 'week' ? 'Weekly Schedule' : `${currentDay}`}
            </h2>
            
            {/* Day selector for day view */}
            {viewMode === 'day' && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => {
                    const currentIndex = weekDays.indexOf(currentDay);
                    if (currentIndex > 0) {
                      setCurrentDay(weekDays[currentIndex - 1]);
                    }
                  }}
                  disabled={currentDay === weekDays[0]}
                  className={`p-1 rounded-full ${currentDay === weekDays[0] ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <FiChevronLeft size={16} />
                </button>
                
                <select 
                  value={currentDay}
                  onChange={(e) => setCurrentDay(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg border border-gray-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
                >
                  {weekDays.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                
                <button 
                  onClick={() => {
                    const currentIndex = weekDays.indexOf(currentDay);
                    if (currentIndex < weekDays.length - 1) {
                      setCurrentDay(weekDays[currentIndex + 1]);
                    }
                  }}
                  disabled={currentDay === weekDays[weekDays.length - 1]}
                  className={`p-1 rounded-full ${currentDay === weekDays[weekDays.length - 1] ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
          
          <div className="min-w-max">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-2 border-b border-gray-200 text-left font-medium">Time</th>
                  {viewMode === 'week' ? (
                    // Week view shows all days, with abbreviated names on mobile
                    weekDays.map(day => (
                      <th key={day} className="py-2 px-2 border-b border-gray-200 text-center font-medium">
                        {isMobile ? getAbbreviatedDay(day) : day}
                      </th>
                    ))
                  ) : (
                    // Day view shows just the selected day
                    <th className="py-2 px-2 border-b border-gray-200 text-center font-medium">
                      {currentDay}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, slotIndex) => (
                  <tr key={slot} className={slotIndex % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="py-1 px-2 border-b border-gray-100 font-medium text-gray-700 whitespace-nowrap">
                      {isMobile ? getCompactTimeFormat(slot) : slot}
                    </td>
                    
                    {viewMode === 'week' ? (
                      // Week view shows all days
                      weekDays.map(day => {
                        const courseInSlot = timetableData[day]?.[slot];
                        const hasConflict = conflicts.some(
                          c => c.day === day && c.slot === slot
                        );
                        return (
                          <td 
                            key={`${day}-${slot}`} 
                            className="py-1 px-1 border-b border-gray-100 text-center relative"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(day, slot)}
                          >
                            {courseInSlot && courseInSlot.code ? (
                              <div 
                                className={`p-1 rounded-lg ${getCourseColorClass(courseInSlot)} border cursor-grab relative 
                                          ${getCellHeight(viewMode)} max-w-[100px] mx-auto group
                                          ${hasConflict ? 'ring-1 ring-red-500 animate-pulse' : ''}`}
                                draggable
                                onDragStart={() => handleDragStart(courseInSlot, true, day, slot)}
                              >
                                <button 
                                  onClick={(e) => handleDeleteCourse(day, slot, e)}
                                  className="absolute top-0 right-0 -mt-1 -mr-1 text-gray-500 hover:text-red-600 transition opacity-0 group-hover:opacity-100 bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm"
                                  title="Remove course"
                                >
                                  <FiX size={10} />
                                </button>
                                <div className="flex justify-between items-start">
                                  <span className="font-semibold text-xs">{courseInSlot.code}</span>
                                  {hasConflict && (
                                    <FiAlertTriangle className="text-red-500 text-xs" />
                                  )}
                                </div>
                                <div className="text-xs mt-0.5 truncate" title={courseInSlot.teacher?.name || ''}>
                                  {isMobile ? (courseInSlot.teacher?.name?.split(' ')[1] || '') : (courseInSlot.teacher?.name || '')}
                                </div>
                                {!isCompactView && (
                                  <div className="text-xs mt-0.5">
                                    <span>{courseInSlot.room || ''}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div
                                className={`${getCellHeight(viewMode)} w-full max-w-[100px] mx-auto border border-dashed border-gray-200 rounded-lg flex items-center justify-center`}
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => handleDrop(day, slot)}
                                style={{ minHeight: '40px', minWidth: '80px' }}
                              >
                                {isDragging && (
                                  <div className="text-xs text-gray-400">+</div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })
                    ) : (
                      // Day view shows just the selected day
                      (() => {
                        const courseInSlot = timetableData[currentDay]?.[slot];
                        const hasConflict = conflicts.some(
                          c => c.day === currentDay && c.slot === slot
                        );
                        
                        return (
                          <td 
                            className="py-1 px-2 border-b border-gray-100 text-center relative"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(currentDay, slot)}
                          >
                            {courseInSlot ? (
                              <div 
                                className={`p-2 rounded-lg ${getCourseColorClass(courseInSlot)} border cursor-grab relative max-w-[280px] mx-auto group
                                          ${hasConflict ? 'ring-1 ring-red-500 animate-pulse' : ''}`}
                                draggable
                                onDragStart={() => handleDragStart(courseInSlot, true, currentDay, slot)}
                              >
                                <button 
                                  onClick={(e) => handleDeleteCourse(currentDay, slot, e)}
                                  className="absolute top-0 right-0 -mt-1 -mr-1 text-gray-600 hover:text-red-600 transition opacity-0 group-hover:opacity-100 bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm"
                                  title="Remove course"
                                >
                                  <FiX size={10} />
                                </button>
                                <div className="flex justify-between items-start">
                                  <span className="font-semibold text-xs">{courseInSlot.code}</span>
                                  {hasConflict && (
                                    <FiAlertTriangle className="text-red-500 text-xs" />
                                  )}
                                </div>
                                <h3 className="text-xs mt-0.5 font-medium line-clamp-1">{courseInSlot.title}</h3>
                                <div className="text-xs mt-1">
                                  <div className="flex justify-between">
                                    <span className="truncate text-xs">{courseInSlot.teacher.name}</span>
                                    <span className="text-xs">Room: {courseInSlot.room}</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="h-14 max-w-[280px] mx-auto border border-dashed border-gray-200 rounded-lg flex items-center justify-center"
                              >
                                {isDragging && (
                                  <div className="text-xs text-gray-400">Drop here</div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })()
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Right Panel: Faculty & Room Status */}
        <div className={`${responsive.roomSelectionWidth} flex-shrink-0 bg-white rounded-xl shadow-sm p-3 overflow-y-auto max-h-[calc(100vh-220px)]`}>
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Room Selection</h2>
            <div className="relative">
              <select
                value={selectedRoom?.id || ''}
                onChange={(e) => {
                  const roomId = e.target.value;
                  const foundRoom = rooms.find(r => r.id === roomId);
                  setSelectedRoom(foundRoom || rooms[0]);
                }}
                className="w-full appearance-none pl-3 pr-8 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>{room.number || room.id}</option>
                ))}
              </select>
              <FiChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
            </div>
            
            <div className="mt-3 p-2 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-xs text-gray-700">{selectedRoom?.number || selectedRoom?.id || 'Room'} Details</h3>
              <div className="text-xs mt-1 space-y-1">
                <div className="flex justify-between">
                  <span>Capacity:</span>
                  <span>{selectedRoom?.capacity ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span>{selectedRoom?.type ?? '-'}</span>
                </div>
                <div className="mt-1">
                  <span className="text-xs font-medium text-gray-500">Facilities:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(selectedRoom?.features || []).map(facility => (
                      <span 
                        key={facility} 
                        className="bg-gray-200 px-1 py-0.5 rounded-md text-xs text-gray-700"
                      >
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Conflicts Section */}
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Conflicts ({conflicts.length})</h2>
            {conflicts.length === 0 ? (
              <div className="p-2 bg-green-50 rounded-lg text-xs text-green-700 flex items-center gap-1">
                <FiCheck className="text-green-500" size={12} />
                No conflicts detected
              </div>
            ) : (
              <div className="space-y-1">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="p-2 bg-red-50 rounded-lg shadow-sm">
                    <div className="flex justify-between">
                      <div className="flex items-center gap-1">
                        <FiAlertTriangle className="text-red-500" size={12} />
                        <span className="text-xs font-medium text-red-700">
                          {conflict.type === 'room' ? 'Room Conflict' : 'Faculty Conflict'}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleResolveConflict(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FiX size={12} />
                      </button>
                    </div>
                    <p className="text-xs text-red-600 mt-1">{conflict.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap justify-between gap-2">
        <button 
          onClick={handleClearWeek}
          className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition flex items-center gap-1 text-xs"
        >
          <FiRefreshCw size={14} />
          <span>Clear Week</span>
        </button>
        
        <div className="flex gap-2">
          <button 
            onClick={handleSaveTimetable}
            className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-1 text-xs"
          >
            <FiSave size={14} />
            <span>Save</span>
          </button>
          
          <button 
            onClick={handlePublishTimetable}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1 text-xs ${
              conflicts.length > 0 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            disabled={conflicts.length > 0}
          >
            <FiUpload size={14} />
            <span>Publish</span>
          </button>
        </div>
      </div>
    </div>
  );
}