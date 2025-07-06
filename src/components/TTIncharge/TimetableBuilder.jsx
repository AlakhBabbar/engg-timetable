import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSave, FiUpload, FiTrash2, FiFilter, FiChevronDown,
  FiCheck, FiX, FiAlertTriangle, FiCalendar, FiGrid,
  FiList, FiArrowLeft, FiArrowRight, FiRefreshCw,
  FiChevronLeft, FiChevronRight, FiPlus, FiEdit2, FiMaximize2, FiMinimize2
} from 'react-icons/fi';
import { db, collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, where } from '../../firebase/config';
import { useSemester } from '../../context/SemesterContext';
import { useToast } from '../../context/ToastContext';

// Import services and data
import { 
  coursesData, facultyData, roomsData, timeSlots, weekDays,
  initializeEmptyTimetable, checkConflictsProduction, addCourseToTimetable,
  saveTimetable, publishTimetable, getCourseColorClass, filterCourses,
  getCompactTimeFormat, getAbbreviatedDay, getCellHeight, 
  getResponsiveClasses, getCompactCourseDisplay, deleteCourse,
  updateTimetableOnDrop, filterConflictsAfterDeletion, filterConflictsAfterMove,
  createTab, updateTabsOnSwitch, deepCopy, getCompactCellDisplay,
  // New business logic imports
  fetchTeachersMap, fetchCourses, mapCoursesToBlocks, fetchRooms,
  setupTimetableListener, saveTimetableToFirestore, groupCourseBlocks,
  tabOperations, historyManager, dragDropOperations, validateCoursePlacement,
  getAllTimetableConflicts, auditLogger, TimetableIndex, conflictResolver,
  resourceValidator
} from './services/TimetableBuilder';

// Import batch management functions
import { 
  getBranches, 
  getBatches, 
  subscribeToBatches 
} from './services/BatchManagement';

export default function TimetableBuilder() {
  // Get current semester from context
  const { selectedSemester: currentSemester } = useSemester();
  const { showError, showInfo } = useToast();
  
  // State for screen size detection
  const [isZoomed, setIsZoomed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);
  
  // State for multiple timetable tabs
  const [tabs, setTabs] = useState([
    { id: 1, name: "New Tab", isActive: true }
  ]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [nextTabId, setNextTabId] = useState(2);
  const [isEditingTab, setIsEditingTab] = useState(null);
  const [editTabName, setEditTabName] = useState("");
  
  // Per-tab state for filters and configurations
  const [tabConfigs, setTabConfigs] = useState({
    1: {
      selectedBranch: '',
      selectedBatch: '',
      selectedType: '',
      selectedDepartment: null,
      selectedFaculty: null,
      selectedRoom: roomsData[0] || null
    }
  });
  
  // State for view mode
  const [viewMode, setViewMode] = useState('week'); 
  const [currentDay, setCurrentDay] = useState('Monday');
  
  // State for the timetable grid
  const [timetablesData, setTimetablesData] = useState({});
  
  // Conflicts
  const [conflictsData, setConflictsData] = useState({});
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCourse, setDraggedCourse] = useState(null);
  const [dragSourceInfo, setDragSourceInfo] = useState(null);
  
  // History for undo/redo
  const [historyData, setHistoryData] = useState({});
  const [historyIndices, setHistoryIndices] = useState({});

  // Helper to get current tab's data and configuration
  const currentTabConfig = tabConfigs[activeTabId] || {
    selectedBranch: '',
    selectedBatch: '',
    selectedType: '',
    selectedDepartment: null,
    selectedFaculty: null,
    selectedRoom: null
  };
  
  const {
    selectedBranch,
    selectedBatch,
    selectedType,
    selectedDepartment,
    selectedFaculty,
    selectedRoom
  } = currentTabConfig;
  
  const timetableData = timetablesData[activeTabId] || {};
  const conflicts = conflictsData[activeTabId] || [];
  const history = historyData[activeTabId] || [];
  const historyIndex = historyIndices[activeTabId] || -1;

  // Get responsive classes
  const responsive = getResponsiveClasses(isMobile);
  
  // Filter courses based on selected filters
  const filteredCourses = filterCourses(coursesData, { 
    selectedSemester: currentSemester, selectedDepartment, selectedFaculty 
  });

  // State for fetched and processed course blocks
  const [courseBlocks, setCourseBlocks] = useState([]);

  // Color palette for unique course colors
  const courseColors = [
    'blue', 'indigo', 'purple', 'green', 'amber', 'rose', 'teal', 'pink', 'orange', 'cyan', 'lime', 'red', 'yellow', 'violet', 'emerald', 'sky', 'fuchsia', 'gray'
  ];
  const courseColorMap = {};
  let colorIndex = 0;


  // State for branches and batches from Firestore
  const [branches, setBranches] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  
  const type=['Full-Time', 'Part-Time']

  // Validation for required fields (memoized to prevent infinite loops)
  const isRequiredFieldsSelected = useCallback(() => {
    return selectedBranch && selectedBatch && selectedType && currentSemester;
  }, [selectedBranch, selectedBatch, selectedType, currentSemester]);

  const isTimetableDisabled = !isRequiredFieldsSelected();

  // Helper functions to update tab configurations (memoized to prevent infinite loops)
  const updateTabConfig = useCallback((tabId, updates) => {
    setTabConfigs(prev => ({
      ...prev,
      [tabId]: {
        ...prev[tabId],
        ...updates
      }
    }));
  }, []);

  const setSelectedBranch = useCallback((value) => updateTabConfig(activeTabId, { selectedBranch: value }), [updateTabConfig, activeTabId]);
  const setSelectedBatch = useCallback((value) => updateTabConfig(activeTabId, { selectedBatch: value }), [updateTabConfig, activeTabId]);
  const setSelectedType = useCallback((value) => updateTabConfig(activeTabId, { selectedType: value }), [updateTabConfig, activeTabId]);
  const setSelectedDepartment = useCallback((value) => updateTabConfig(activeTabId, { selectedDepartment: value }), [updateTabConfig, activeTabId]);
  const setSelectedFaculty = useCallback((value) => updateTabConfig(activeTabId, { selectedFaculty: value }), [updateTabConfig, activeTabId]);
  const setSelectedRoom = useCallback((value) => updateTabConfig(activeTabId, { selectedRoom: value }), [updateTabConfig, activeTabId]);

  // State for all teachers (id -> name)
  const [teacherMap, setTeacherMap] = useState({});
  // State for all fetched courses
  const [allCourses, setAllCourses] = useState([]);
  // State for timetable loading
  const [timetableLoading, setTimetableLoading] = useState(false);

  // State for drop validation and visual feedback
  const [dropValidation, setDropValidation] = useState({});
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [previewConflicts, setPreviewConflicts] = useState([]);

  // Helper function to validate drop before allowing it with comprehensive checks
  const validateDrop = (day, slot, course, room) => {
    if (!course || !room) return { canDrop: false, conflicts: [], warnings: [] };
    
    // Basic conflict validation
    const validation = validateCoursePlacement(timetableData, day, slot, course, room);
    
    // Get current batch info (you would get this from your batch management system)
    const currentBatchInfo = {
      id: selectedBatch,
      size: availableBatches.find(b => b.name === selectedBatch)?.size || 30 // Default size
    };
    
    // Comprehensive resource validation
    const resourceValidation = resourceValidator.validateAllResources(
      timetableData, day, slot, course, room, currentBatchInfo
    );
    
    // Combine all validations
    const allConflicts = [
      ...validation.criticalConflicts,
      ...resourceValidation.overall.conflicts
    ];
    
    const allWarnings = [
      ...validation.warnings,
      ...resourceValidation.overall.warnings
    ];
    
    return {
      canDrop: allConflicts.length === 0,
      conflicts: allConflicts,
      warnings: allWarnings,
      allConflicts: [...allConflicts, ...allWarnings],
      resourceValidation
    };
  };

  // Build performance indexes when timetable data changes
  useEffect(() => {
    if (timetableData && Object.keys(timetableData).length > 0) {
      TimetableIndex.buildIndexes(timetableData);
    }
  }, [timetableData]);

  // Fetch branches on component mount
  useEffect(() => {
    const branchesData = getBranches();
    setBranches(branchesData);
  }, []);

  // Fetch batches when branch and semester change for current tab
  useEffect(() => {
    let unsubscribe = null;

    if (selectedBranch && currentSemester) {
      setBatchesLoading(true);
      
      // Set up real-time listener for batches
      unsubscribe = subscribeToBatches(selectedBranch, currentSemester, (batchData) => {
        setAvailableBatches(batchData);
        setBatchesLoading(false);
      });

      // Also load initial data
      loadBatches();
    } else {
      setAvailableBatches([]);
    }

    // Cleanup listener on unmount or when dependencies change
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedBranch, currentSemester]);

  // Memoized loadBatches function to prevent infinite loops
  const loadBatches = useCallback(async () => {
    try {
      const batchData = await getBatches(selectedBranch, currentSemester, true); // Force sync
      setAvailableBatches(batchData);
      
      if (batchData.length === 0) {
        showInfo(`No batches found for the selected branch and semester. You may need to create batches first.`);
      }
    } catch (error) {
      console.error('Failed to load batches:', error);
      showError('Failed to load batches. Please try again.');
    } finally {
      setBatchesLoading(false);
    }
  }, [selectedBranch, currentSemester, showInfo, showError]);

  // Fetch all teachers and build a map (id -> name)
  useEffect(() => {
    async function loadTeachers() {
      const teacherMap = await fetchTeachersMap(db, collection, getDocs);
      setTeacherMap(teacherMap);
    }
    loadTeachers();
  }, []);

  // Fetch all courses from Firestore (store raw)
  useEffect(() => {
    async function loadCourses() {
      const courses = await fetchCourses(db, collection, getDocs, query, where, currentSemester);
      setAllCourses(courses);
    }
    loadCourses();
  }, [currentSemester]);

  // Map courses to courseBlocks whenever teacherMap or allCourses changes
  useEffect(() => {
    const blocks = mapCoursesToBlocks(allCourses, teacherMap, courseColors);
    setCourseBlocks(blocks);
  }, [allCourses, teacherMap]);

  // Initialize empty timetable data and check screen size on component mount
  useEffect(() => {
    const initialData = initializeEmptyTimetable();
    
    // Initialize data for the first tab only if not already initialized
    setTimetablesData(prev => {
      if (!prev[1]) {
        return { ...prev, 1: initialData };
      }
      return prev;
    });
    
    setConflictsData(prev => {
      if (!prev[1]) {
        return { ...prev, 1: [] };
      }
      return prev;
    });
    
    // Initialize history for the first tab only if not already initialized  
    setHistoryData(prevHistory => {
      if (!prevHistory[1]) {
        const result = historyManager.addToHistory([], -1, initialData);
        setHistoryIndices(prevIndices => ({ ...prevIndices, 1: result.historyIndex }));
        return { ...prevHistory, 1: result.history };
      }
      return prevHistory;
    });
    
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
    async function loadRooms() {
      const roomsData = await fetchRooms(db, collection, getDocs);
      setRooms(roomsData);
    }
    loadRooms();
  }, []);

  // Set initial selected room for tabs when rooms change
  useEffect(() => {
    if (rooms.length > 0) {
      const defaultRoom = rooms[0];
      setTabConfigs(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        Object.keys(updated).forEach(tabId => {
          if (!updated[tabId].selectedRoom || !rooms.find(r => r.id === updated[tabId].selectedRoom.id)) {
            updated[tabId] = { ...updated[tabId], selectedRoom: defaultRoom };
            hasChanges = true;
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }
  }, [rooms]);

  // Effect to clear selected batch when no batches are available
  useEffect(() => {
    if (selectedBranch && currentSemester && !batchesLoading && availableBatches.length === 0) {
      // Clear batch selection if no batches are available for the selected branch/semester
      updateTabConfig(activeTabId, { selectedBatch: '' });
    }
  }, [selectedBranch, currentSemester, batchesLoading, availableBatches, activeTabId, updateTabConfig]);

  // Reset selected batch when branch changes to avoid invalid combinations
  useEffect(() => {
    if (selectedBranch && availableBatches.length > 0) {
      // If current batch is not in the new batch list, reset it
      if (selectedBatch && !availableBatches.find(batch => batch.name === selectedBatch)) {
        updateTabConfig(activeTabId, { selectedBatch: '' });
      }
    }
  }, [selectedBranch, availableBatches, selectedBatch, activeTabId, updateTabConfig]);

  // Debug: Log when all required fields are selected
  useEffect(() => {
    if (isRequiredFieldsSelected()) {
      const documentId = `${currentSemester}-${selectedBranch}-${selectedBatch}-${selectedType}`;
      console.log('All required fields selected. Document ID:', documentId);
      console.log('Setting up listener for timetable:', {
        currentSemester,
        selectedBranch,
        selectedBatch,
        selectedType
      });
    }
  }, [currentSemester, selectedBranch, selectedBatch, selectedType]);

  // State for managing per-tab Firestore listeners
  const [activeListeners, setActiveListeners] = useState({});

  // Firestore real-time listener for timetable (per tab)
  useEffect(() => {
    // Clean up existing listener for this tab
    const existingUnsubscribe = activeListeners[activeTabId];
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    if (!isRequiredFieldsSelected()) {
      // Clear timetable data if required fields are not selected
      setTimetablesData(prev => ({ ...prev, [activeTabId]: initializeEmptyTimetable() }));
      setTimetableLoading(false);
      return;
    }

    setTimetableLoading(true);
    
    const unsubscribe = setupTimetableListener({
      db, doc, onSnapshot,
      currentSemester, selectedBranch, selectedBatch, selectedType,
      callback: (scheduleData) => {
        setTimetablesData(prev => ({ ...prev, [activeTabId]: scheduleData }));
        setTimetableLoading(false);
        
        // Initialize history for this tab with the loaded data (first time only)
        setHistoryData(prevHistory => {
          if (!prevHistory[activeTabId] || prevHistory[activeTabId].length === 0) {
            const result = historyManager.addToHistory([], -1, scheduleData);
            setHistoryIndices(prevIndices => ({ ...prevIndices, [activeTabId]: result.historyIndex }));
            return { ...prevHistory, [activeTabId]: result.history };
          }
          return prevHistory;
        });
      }
    });
    
    // Store the unsubscribe function
    setActiveListeners(prev => ({ ...prev, [activeTabId]: unsubscribe }));
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentSemester, selectedBranch, selectedBatch, selectedType, activeTabId, isRequiredFieldsSelected]);

  // Cleanup all listeners on component unmount
  useEffect(() => {
    return () => {
      Object.values(activeListeners).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, []);

  // Write timetable changes to Firestore (only when data changes, not when loading)
  useEffect(() => {
    const currentSchedule = timetablesData[activeTabId];
    // Only save if we have data and all required fields are selected
    if (currentSchedule && isRequiredFieldsSelected() && Object.keys(currentSchedule).length > 0) {
      // Check if this is not just an empty initialization
      const hasActualData = Object.values(currentSchedule).some(dayData => 
        Object.values(dayData || {}).some(slotData => slotData && slotData.code)
      );
      
      if (hasActualData) {
        saveTimetableToFirestore({
          db, doc, setDoc,
          currentSemester, selectedBranch, selectedBatch, selectedType,
          scheduleData: currentSchedule
        });
      }
    }
  }, [timetablesData, currentSemester, selectedBranch, selectedBatch, selectedType, activeTabId, isRequiredFieldsSelected]);

  // Add a new tab
  const addNewTab = () => {
    const initialData = initializeEmptyTimetable();
    const defaultRoom = rooms[0] || null;
    const tabConfig = tabOperations.createNewTab(nextTabId, initialData, defaultRoom);
    
    // Add new tab
    setTabs(prevTabs => [
      ...prevTabs.map(tab => ({ ...tab, isActive: false })),
      tabConfig.newTab
    ]);
    
    // Set the new tab as active
    setActiveTabId(nextTabId);
    
    // Initialize data for the new tab
    setTimetablesData(prev => ({ ...prev, [nextTabId]: initialData }));
    setConflictsData(prev => ({ ...prev, [nextTabId]: [] }));
    
    // Initialize tab configuration
    setTabConfigs(prev => ({
      ...prev,
      [nextTabId]: tabConfig.tabConfig
    }));
    
    // Initialize history for the new tab
    addToHistory(nextTabId, initialData);
    
    // Increment next tab id
    setNextTabId(prevId => prevId + 1);
  };

  // Helper function to mark tab as modified
  const markTabAsModified = (tabId, isModified = true) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, isModified }
        : tab
    ));
  };

  // Function to save current tab
  const saveCurrentTab = () => {
    if (isRequiredFieldsSelected() && timetableData) {
      markTabAsModified(activeTabId, false);
      showInfo('Timetable saved successfully');
      
      // The actual save to Firestore happens automatically through the useEffect
      // This is just for user feedback and marking the tab as saved
    }
  };

  // Monitor timetable data changes to mark tabs as modified
  useEffect(() => {
    const currentData = timetablesData[activeTabId];
    if (currentData && Object.keys(currentData).length > 0) {
      // Check if there's actual course data (not just empty slots)
      const hasData = Object.values(currentData).some(dayData => 
        Object.values(dayData || {}).some(slotData => slotData && slotData.code)
      );
      
      if (hasData) {
        markTabAsModified(activeTabId, true);
      }
    }
  }, [timetablesData, activeTabId]);

  const switchTab = (tabId) => {
    setTabs(prevTabs => tabOperations.switchTab(prevTabs, tabId));
    setActiveTabId(tabId);
    
    // Ensure tab config exists for the switched tab
    if (!tabConfigs[tabId]) {
      setTabConfigs(prev => ({
        ...prev,
        [tabId]: {
          selectedBranch: '',
          selectedBatch: '',
          selectedType: '',
          selectedDepartment: null,
          selectedFaculty: null,
          selectedRoom: rooms[0] || null
        }
      }));
    }
  };

  // Close a tab
  const closeTab = (tabId, event) => {
    event.stopPropagation();
    
    const tabToClose = tabs.find(tab => tab.id === tabId);
    
    // Check if tab has unsaved changes
    if (tabToClose?.isModified) {
      const confirmClose = window.confirm(
        `Tab "${tabToClose.name}" has unsaved changes. Are you sure you want to close it?`
      );
      if (!confirmClose) {
        return;
      }
    }
    
    const result = tabOperations.closeTab(tabs, tabId, activeTabId);
    if (!result) return; // Don't close if it's the only tab
    
    // If closing the active tab, switch to another tab first
    if (result.newActiveTabId !== activeTabId) {
      setActiveTabId(result.newActiveTabId);
    }
    
    // Remove the tab
    setTabs(result.tabs);
    
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
    
    setTabConfigs(prev => {
      const newData = { ...prev };
      delete newData[tabId];
      return newData;
    });
    
    // Clean up any active listeners for this tab
    if (activeListeners[tabId]) {
      activeListeners[tabId]();
      setActiveListeners(prev => {
        const updated = { ...prev };
        delete updated[tabId];
        return updated;
      });
    }
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

  // Function to add current state to history (memoized)
  const addToHistory = useCallback((tabId, data) => {
    setHistoryData(prev => {
      const tabHistory = prev[tabId] || [];
      const tabHistoryIndex = historyIndices[tabId] || -1;
      
      const result = historyManager.addToHistory(tabHistory, tabHistoryIndex, data);
      setHistoryIndices(prevIndices => ({ ...prevIndices, [tabId]: result.historyIndex }));
      
      return { ...prev, [tabId]: result.history };
    });
  }, [historyIndices]);

  // Handle undo
  const handleUndo = () => {
    const result = historyManager.undo(history, historyIndex);
    if (result) {
      setHistoryIndices(prev => ({ ...prev, [activeTabId]: result.historyIndex }));
      setTimetablesData(prev => ({ 
        ...prev, 
        [activeTabId]: result.data
      }));
    }
  };

  // Handle redo
  const handleRedo = () => {
    const result = historyManager.redo(history, historyIndex);
    if (result) {
      setHistoryIndices(prev => ({ ...prev, [activeTabId]: result.historyIndex }));
      setTimetablesData(prev => ({ 
        ...prev, 
        [activeTabId]: result.data
      }));
    }
  };

  // Handle drag start - from course list or timetable
  const handleDragStart = (e, course, fromTimetable = false, day = null, slot = null) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Required for some browsers
    
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
    
    const courseToDelete = timetableData[day]?.[slot];
    
    const result = dragDropOperations.deleteCourse(timetableData, day, slot, conflicts);
    setTimetablesData(prev => ({ ...prev, [activeTabId]: result.timetable }));
    setConflictsData(prev => ({ ...prev, [activeTabId]: result.conflicts }));
    
    // Add to history
    addToHistory(activeTabId, result.timetable);
    
    // Log the deletion
    auditLogger.logAction('course_deleted', {
      course: courseToDelete?.code,
      courseName: courseToDelete?.name,
      day,
      slot,
      room: courseToDelete?.room,
      semester: currentSemester,
      branch: selectedBranch,
      batch: selectedBatch,
      type: selectedType,
      tabId: activeTabId
    });
  };

  // Handle drop on a timetable cell with pre-validation
  const handleDrop = (e, day, slot) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedCourse) {
      // Pre-validate the drop
      const validation = validateDrop(day, slot, draggedCourse, selectedRoom);
      
      // Prevent drop if there are critical conflicts
      if (!validation.canDrop) {
        showError(`Cannot place course: ${validation.conflicts[0]?.message || 'Critical conflict detected'}`);
        
        // Reset dragging state
        setIsDragging(false);
        setDraggedCourse(null);
        setDragSourceInfo(null);
        setHoveredSlot(null);
        setPreviewConflicts([]);
        return;
      }
      
      // Show warnings but allow placement
      if (validation.warnings.length > 0) {
        showInfo(`Course placed with warnings: ${validation.warnings[0]?.message}`);
      }
      
      const result = dragDropOperations.handleDrop({
        timetableData, day, slot, draggedCourse, selectedRoom,
        dragSourceInfo, conflicts
      });
      
      // Update timetable and conflicts
      setTimetablesData(prev => ({ ...prev, [activeTabId]: result.timetable }));
      setConflictsData(prev => ({ ...prev, [activeTabId]: result.conflicts }));
      
      // Add to history
      addToHistory(activeTabId, result.timetable);
      
      // Log the action for audit trail
      auditLogger.logAction('course_placed', {
        course: draggedCourse.code,
        courseName: draggedCourse.title || draggedCourse.name,
        day,
        slot,
        room: selectedRoom?.id,
        conflicts: result.conflicts.length,
        warnings: validation.warnings.length,
        semester: currentSemester,
        branch: selectedBranch,
        batch: selectedBatch,
        type: selectedType,
        tabId: activeTabId
      });
      
      // Reset dragging state
      setIsDragging(false);
      setDraggedCourse(null);
      setDragSourceInfo(null);
      setHoveredSlot(null);
      setPreviewConflicts([]);
    }
  };

  // Handle drag over (required for drop to work) with conflict preview
  const handleDragOver = (e, day, slot) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Show preview of conflicts if dragging a course
    if (draggedCourse && selectedRoom) {
      const currentHovered = `${day}-${slot}`;
      if (hoveredSlot !== currentHovered) {
        setHoveredSlot(currentHovered);
        
        // Get validation for preview
        const validation = validateDrop(day, slot, draggedCourse, selectedRoom);
        setPreviewConflicts(validation.allConflicts || []);
      }
    }
  };

  // Handle drag leave to clear preview
  const handleDragLeave = (e) => {
    // Only clear if we're leaving the cell entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setHoveredSlot(null);
      setPreviewConflicts([]);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedCourse(null);
    setDragSourceInfo(null);
    setHoveredSlot(null);
    setPreviewConflicts([]);
  };

  // Handle clearing a week
  const handleClearWeek = () => {
    // Create a new empty timetable
    const newTimetable = initializeEmptyTimetable();
    
    setTimetablesData(prev => ({ ...prev, [activeTabId]: newTimetable }));
    setConflictsData(prev => ({ ...prev, [activeTabId]: [] }));
    
    // Add to history
    addToHistory(activeTabId, newTimetable);
    
    // Log the action
    auditLogger.logAction('week_cleared', {
      semester: currentSemester,
      branch: selectedBranch,
      batch: selectedBatch,
      type: selectedType,
      tabId: activeTabId
    });
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
      saveCurrentTab();
      const result = await saveTimetable(timetableData);
      // Don't show alert since saveCurrentTab already shows success message
    } catch (error) {
      showError('Error saving timetable');
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

  // Grouped course blocks by course
  const groupedCourseBlocks = groupCourseBlocks(allCourses, teacherMap, courseColors);

  return (
    <div className={`space-y-4 ${isZoomed ? 'scale-90 origin-top transition-all duration-300' : ''}`}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Timetable Builder</h1>
        
        {/* Undo/Redo and Zoom Buttons */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => !isTimetableDisabled && handleUndo()} 
            disabled={historyIndex <= 0 || isTimetableDisabled}
            className={`p-1 rounded-lg ${
              historyIndex <= 0 || isTimetableDisabled 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            title="Undo"
          >
            <FiArrowLeft size={18} />
          </button>
          <button 
            onClick={() => !isTimetableDisabled && handleRedo()} 
            disabled={historyIndex >= history.length - 1 || isTimetableDisabled}
            className={`p-1 rounded-lg ${
              historyIndex >= history.length - 1 || isTimetableDisabled 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
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
          {/* Current Semester Display */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Current Semester</label>
            <div className="px-3 py-1 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium">
              {currentSemester || 'No semester selected'}
            </div>
          </div>
          
          {/* Department Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Branch/Section</label>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-2 py-1 text-xs"
            >
              <option value="">Select branch</option>
              {branches.map(branchItem => (
                <option key={branchItem.id} value={branchItem.id}>
                  {branchItem.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Batch Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Batch
              {batchesLoading && (
                <span className="ml-1 text-xs text-blue-500">(Loading...)</span>
              )}
              {!batchesLoading && selectedBranch && currentSemester && availableBatches.length === 0 && (
                <span className="ml-1 text-xs text-amber-600">(No batches available)</span>
              )}
            </label>
            <select
              value={selectedBatch}
              onChange={e => setSelectedBatch(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-2 py-1 text-xs"
              disabled={!selectedBranch || batchesLoading}
            >
              <option value="">
                {!selectedBranch 
                  ? 'Select branch first' 
                  : batchesLoading 
                    ? 'Loading batches...'
                    : availableBatches.length === 0
                      ? 'No batches available'
                      : 'Select batch'
                }
              </option>
              {availableBatches.map(batchItem => (
                <option key={batchItem.id} value={batchItem.name}>
                  {batchItem.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-2 py-1 text-xs"
            >
              <option value="">Select type</option>
              {type.map(typeItem => <option key={typeItem} value={typeItem}>{typeItem}</option>)}
            </select>
          </div>
          
          {/* View Toggle */}
          <div className="ml-auto">
            <label className="block text-xs font-medium text-gray-500 mb-1">View Mode</label>
            <div className={`flex rounded-lg border border-gray-300 overflow-hidden ${isTimetableDisabled ? 'opacity-60' : ''}`}>
              <button
                className={`px-2 py-1 flex items-center gap-1 ${
                  isTimetableDisabled
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : viewMode === 'week' 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => !isTimetableDisabled && setViewMode('week')}
                disabled={isTimetableDisabled}
              >
                <FiGrid size={14} />
                <span className="text-xs">Week</span>
              </button>
              <button
                className={`px-2 py-1 flex items-center gap-1 ${
                  isTimetableDisabled
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : viewMode === 'day' 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => !isTimetableDisabled && setViewMode('day')}
                disabled={isTimetableDisabled}
              >
                <FiList size={14} />
                <span className="text-xs">Day</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Information Panel for Empty Batches */}
      {selectedBranch && currentSemester && !batchesLoading && availableBatches.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-full">
              <FiAlertTriangle className="text-amber-600" size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-800 mb-1">
                No Batches Available
              </h3>
              <p className="text-sm text-amber-700">
                No batches have been created for <strong>{branches.find(b => b.id === selectedBranch)?.name}</strong> in <strong>{currentSemester}</strong>.
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Please create batches in the <strong>Batch Management</strong> section before building timetables.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content Area */}
      <div className={`flex ${responsive.gapSize}`}>
        {/* Left Panel: Course Blocks */}
        <div className={`${responsive.courseBlockWidth} flex-shrink-0 bg-white rounded-xl shadow-sm p-3 overflow-y-auto max-h-[calc(100vh-220px)] ${isTimetableDisabled ? 'opacity-60' : ''}`}>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Course Blocks</h2>
          <div className="space-y-1">
            {groupedCourseBlocks.map(course => (
              <div key={course.code} className="mb-2">
                <div className="font-semibold text-xs text-gray-700 mb-1">{course.title} ({course.code})</div>
                {course.blocks.length > 0 ? course.blocks.map(block => (
                  <motion.div
                    key={block.id}
                    className={`p-2 rounded-lg border ${getCourseColorClass(block)} transition mb-1 ${
                      isTimetableDisabled 
                        ? 'cursor-not-allowed opacity-60' 
                        : 'cursor-grab hover:shadow-sm'
                    }`}
                    draggable={!isTimetableDisabled}
                    onDragStart={!isTimetableDisabled ? (e) => handleDragStart(e, { ...course, teacherId: block.teacherId, teacherName: block.teacherName, teacherCode: block.teacherCode }) : undefined}
                    onDragEnd={!isTimetableDisabled ? handleDragEnd : undefined}
                    whileHover={!isTimetableDisabled ? { scale: 1.01 } : undefined}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-xs">{course.code}</span>
                      <span className="text-xs px-1 py-0.5 rounded-full bg-white/50">{course.duration || ''}h</span>
                    </div>
                    <div className="text-xs flex justify-between items-center">
                      <span className="truncate flex-1 mr-1" title={block.teacherName || 'No teacher assigned'}>
                        {(block.teacherCode || block.teacherName)?.length > 12 
                          ? (block.teacherCode || block.teacherName).substring(0, 12) + '...' 
                          : (block.teacherCode || block.teacherName) || 'No teacher'
                        }
                      </span>
                      <span className="font-mono text-xs text-gray-600">{course.weeklyHours}h</span>
                    </div>
                  </motion.div>
                )) : (
                  <div className="text-xs text-gray-400 mb-2">No teachers assigned</div>
                )}
              </div>
            ))}
            
            {groupedCourseBlocks.length === 0 && (
              <div className="text-center py-3 text-gray-500 text-xs">
                No courses found
              </div>
            )}
          </div>
        </div>
        
        {/* Center Panel: Timetable Grid */}
        <div className={`flex-1 bg-white rounded-xl shadow-sm p-3 overflow-x-auto overflow-y-hidden min-w-[60%] relative ${isTimetableDisabled ? 'opacity-50' : ''}`}>
          {/* Disabled Overlay */}
          {isTimetableDisabled && (
            <div className="absolute inset-0 bg-gray-50/80 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
              <div className="text-center p-4 bg-white rounded-lg shadow-md border max-w-sm">
                <FiAlertTriangle className="mx-auto text-amber-500 mb-2" size={24} />
                <h3 className="font-semibold text-gray-800 mb-2">Timetable Builder Disabled</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Please select all required fields to enable the timetable builder:
                </p>
                <div className="text-xs text-left space-y-1 text-gray-700">
                  <div className={`flex items-center gap-2 ${currentSemester ? 'text-green-600' : 'text-amber-600'}`}>
                    {currentSemester ? <FiCheck size={12} /> : <FiX size={12} />}
                    <span>Current Semester</span>
                  </div>
                  <div className={`flex items-center gap-2 ${selectedBranch ? 'text-green-600' : 'text-amber-600'}`}>
                    {selectedBranch ? <FiCheck size={12} /> : <FiX size={12} />}
                    <span>Branch/Section</span>
                  </div>
                  <div className={`flex items-center gap-2 ${selectedBatch ? 'text-green-600' : 'text-amber-600'}`}>
                    {selectedBatch ? <FiCheck size={12} /> : <FiX size={12} />}
                    <span>Batch</span>
                  </div>
                  <div className={`flex items-center gap-2 ${selectedType ? 'text-green-600' : 'text-amber-600'}`}>
                    {selectedType ? <FiCheck size={12} /> : <FiX size={12} />}
                    <span>Type</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Tabs */}
          <div className="mb-3 border-b pb-2 w-full">
            <div className="flex w-full overflow-hidden">
              <div className="flex flex-nowrap items-center gap-1 w-full">
                {tabs.map(tab => (
                  <div 
                    key={tab.id} 
                    className={`flex items-center gap-1 px-2 py-1 rounded-t-lg text-xs
                      ${isTimetableDisabled 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : tab.isActive 
                          ? 'bg-indigo-500 text-white cursor-pointer' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer'
                      }`}
                    style={{ 
                      maxWidth: isMobile ? '100px' : '130px',
                      flexGrow: 0,
                      flexShrink: 0
                    }}
                    onClick={() => !isTimetableDisabled && switchTab(tab.id)}
                  >
                    {isEditingTab === tab.id ? (
                      <div ref={tabEditRef} className="flex items-center gap-1">
                        <input 
                          type="text" 
                          value={editTabName} 
                          onChange={(e) => setEditTabName(e.target.value)} 
                          className="px-1 py-0.5 rounded-lg border border-gray-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs w-16"
                          disabled={isTimetableDisabled}
                        />
                        <button 
                          onClick={saveTabName} 
                          className={`${isTimetableDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:text-gray-900'}`}
                          disabled={isTimetableDisabled}
                        >
                          <FiCheck size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="truncate block flex-1 text-xs">
                          {tab.name}
                          {tab.isModified && <span className="ml-1 text-yellow-300">*</span>}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                          <button 
                            onClick={(e) => !isTimetableDisabled && startEditingTab(tab.id, e)} 
                            className={`hidden md:block ${isTimetableDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600'}`}
                            disabled={isTimetableDisabled}
                            title="Edit tab name"
                          >
                            <FiEdit2 size={12} />
                          </button>
                          <button 
                            onClick={(e) => !isTimetableDisabled && closeTab(tab.id, e)} 
                            className={`${isTimetableDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600'}`}
                            disabled={isTimetableDisabled}
                            title={tab.isModified ? "Close tab (unsaved changes)" : "Close tab"}
                          >
                            <FiX size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => !isTimetableDisabled && addNewTab()} 
                  className={`px-2 py-1 rounded-lg flex items-center gap-1 flex-shrink-0 ml-1 text-xs ${
                    isTimetableDisabled 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={isTimetableDisabled}
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
              {timetableLoading && (
                <span className="ml-2 text-xs text-blue-500">(Loading...)</span>
              )}
            </h2>
            
            {/* Day selector for day view */}
            {viewMode === 'day' && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => {
                    if (!isTimetableDisabled) {
                      const currentIndex = weekDays.indexOf(currentDay);
                      if (currentIndex > 0) {
                        setCurrentDay(weekDays[currentIndex - 1]);
                      }
                    }
                  }}
                  disabled={currentDay === weekDays[0] || isTimetableDisabled}
                  className={`p-1 rounded-full ${
                    currentDay === weekDays[0] || isTimetableDisabled 
                      ? 'text-gray-300' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FiChevronLeft size={16} />
                </button>
                
                <select 
                  value={currentDay}
                  onChange={(e) => !isTimetableDisabled && setCurrentDay(e.target.value)}
                  className={`px-2 py-1 text-xs rounded-lg border border-gray-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white ${
                    isTimetableDisabled ? 'text-gray-400 cursor-not-allowed' : ''
                  }`}
                  disabled={isTimetableDisabled}
                >
                  {weekDays.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                
                <button 
                  onClick={() => {
                    if (!isTimetableDisabled) {
                      const currentIndex = weekDays.indexOf(currentDay);
                      if (currentIndex < weekDays.length - 1) {
                        setCurrentDay(weekDays[currentIndex + 1]);
                      }
                    }
                  }}
                  disabled={currentDay === weekDays[weekDays.length - 1] || isTimetableDisabled}
                  className={`p-1 rounded-full ${
                    currentDay === weekDays[weekDays.length - 1] || isTimetableDisabled 
                      ? 'text-gray-300' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
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
                        
                        // Check if this slot is being hovered during drag
                        const isHovered = hoveredSlot === `${day}-${slot}`;
                        const hasPreviewConflict = previewConflicts.some(
                          c => c.day === day && c.slot === slot
                        );
                        
                        // Determine visual feedback for drop validation
                        let dropFeedbackClass = '';
                        if (isDragging && isHovered) {
                          const validation = validateDrop(day, slot, draggedCourse, selectedRoom);
                          if (!validation.canDrop) {
                            dropFeedbackClass = 'ring-2 ring-red-500 bg-red-50/50';
                          } else if (validation.warnings.length > 0) {
                            dropFeedbackClass = 'ring-2 ring-amber-500 bg-amber-50/50';
                          } else {
                            dropFeedbackClass = 'ring-2 ring-green-500 bg-green-50/50';
                          }
                        }
                        
                        return (
                          <td key={`${day}-${slot}`} className={`py-1 px-1 border-b border-gray-100 text-center relative ${dropFeedbackClass}`}
                              onDragOver={!isTimetableDisabled ? (e) => handleDragOver(e, day, slot) : undefined} 
                              onDragLeave={!isTimetableDisabled ? handleDragLeave : undefined}
                              onDrop={!isTimetableDisabled ? (e) => handleDrop(e, day, slot) : undefined}>
                            {courseInSlot && courseInSlot.code ? (
                              (() => {
                                const compactData = getCompactCellDisplay(courseInSlot, isMobile);
                                return (
                                  <div 
                                    className={`p-1 rounded-lg ${getCourseColorClass(courseInSlot)} border relative 
                                              ${getCellHeight(viewMode)} max-w-[100px] mx-auto group
                                              ${hasConflict ? 'ring-1 ring-red-500 animate-pulse' : ''}
                                              ${isTimetableDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-grab'}`}
                                    draggable={!isTimetableDisabled}
                                    onDragStart={!isTimetableDisabled ? (e) => handleDragStart(e, courseInSlot, true, day, slot) : undefined}
                                    onDragEnd={!isTimetableDisabled ? handleDragEnd : undefined}
                                  >
                                    <button 
                                      onClick={(e) => !isTimetableDisabled && handleDeleteCourse(day, slot, e)}
                                      className={`absolute top-0 right-0 -mt-1 -mr-1 transition opacity-0 group-hover:opacity-100 bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm ${
                                        isTimetableDisabled 
                                          ? 'text-gray-400 cursor-not-allowed' 
                                          : 'text-gray-500 hover:text-red-600'
                                      }`}
                                      title="Remove course"
                                      disabled={isTimetableDisabled}
                                    >
                                      <FiX size={10} />
                                    </button>
                                    
                                    {/* Compact layout with all info in short form */}
                                    <div className="space-y-0.5">
                                      {/* Course code and conflict indicator */}
                                      <div className="flex justify-between items-center">
                                        <span className="font-semibold text-xs leading-tight">{compactData.code}</span>
                                        {hasConflict && <FiAlertTriangle className="text-red-500" size={10} />}
                                      </div>
                                      
                                      {/* Teacher name */}
                                      <div className="text-xs leading-tight text-gray-700" title={compactData.teacherFull}>
                                        {compactData.teacher}
                                      </div>
                                      
                                      {/* Room (always show in compact format) */}
                                      <div className="text-xs leading-tight text-gray-600" title={compactData.roomFull}>
                                        {compactData.room}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <div
                                className={`${getCellHeight(viewMode)} w-full max-w-[100px] mx-auto border border-dashed border-gray-200 rounded-lg flex items-center justify-center`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, day, slot)}
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
                          <td className="py-1 px-2 border-b border-gray-100 text-center relative" 
                              onDragOver={!isTimetableDisabled ? handleDragOver : undefined} 
                              onDrop={!isTimetableDisabled ? (e) => handleDrop(e, currentDay, slot) : undefined}>
                            {courseInSlot ? (
                              (() => {
                                const compactData = getCompactCellDisplay(courseInSlot, isMobile);
                                return (
                                  <div 
                                    className={`p-2 rounded-lg ${getCourseColorClass(courseInSlot)} border relative max-w-[280px] mx-auto group
                                              ${hasConflict ? 'ring-1 ring-red-500 animate-pulse' : ''}
                                              ${isTimetableDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-grab'}`}
                                    draggable={!isTimetableDisabled}
                                    onDragStart={!isTimetableDisabled ? (e) => handleDragStart(e, courseInSlot, true, currentDay, slot) : undefined}
                                    onDragEnd={!isTimetableDisabled ? handleDragEnd : undefined}
                                  >
                                    <button 
                                      onClick={(e) => !isTimetableDisabled && handleDeleteCourse(currentDay, slot, e)}
                                      className={`absolute top-0 right-0 -mt-1 -mr-1 transition opacity-0 group-hover:opacity-100 bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm ${
                                        isTimetableDisabled 
                                          ? 'text-gray-400 cursor-not-allowed' 
                                          : 'text-gray-600 hover:text-red-600'
                                      }`}
                                      title="Remove course"
                                      disabled={isTimetableDisabled}
                                    >
                                      <FiX size={10} />
                                    </button>
                                    
                                    {/* Compact layout for day view */}
                                    <div className="space-y-1">
                                      {/* Course code and conflict indicator */}
                                      <div className="flex justify-between items-center">
                                        <span className="font-semibold text-sm">{compactData.code}</span>
                                        {hasConflict && <FiAlertTriangle className="text-red-500" size={12} />}
                                      </div>
                                      
                                      {/* Course title */}
                                      <div className="text-xs font-medium text-gray-800 leading-tight" title={compactData.titleFull}>
                                        {compactData.title}
                                      </div>
                                      
                                      {/* Teacher and room in a compact row */}
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-700 truncate flex-1 mr-2" title={compactData.teacherFull}>
                                          {compactData.teacher}
                                        </span>
                                        <span className="text-gray-600 font-mono" title={compactData.roomFull}>
                                          {compactData.room}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <div 
                                className={`h-14 max-w-[280px] mx-auto border border-dashed rounded-lg flex items-center justify-center ${
                                  isTimetableDisabled 
                                    ? 'border-gray-100 cursor-not-allowed' 
                                    : 'border-gray-200'
                                }`}
                                onDragOver={!isTimetableDisabled ? handleDragOver : undefined}
                                onDrop={!isTimetableDisabled ? (e) => handleDrop(e, currentDay, slot) : undefined}
                              >
                                {isDragging && !isTimetableDisabled && (
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
              <div className="space-y-2">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div className="p-2 bg-red-50">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1">
                          <FiAlertTriangle className="text-red-500" size={12} />
                          <span className="text-xs font-medium text-red-700">
                            {conflict.type === 'room' ? 'Room Conflict' : 
                             conflict.type === 'faculty' ? 'Faculty Conflict' :
                             conflict.type === 'batch' ? 'Batch Conflict' : 'Conflict'}
                          </span>
                          {conflict.severity && (
                            <span className={`text-xs px-1 py-0.5 rounded-full ${
                              conflict.severity === 'critical' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                            }`}>
                              {conflict.severity}
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => handleResolveConflict(index)}
                          className="text-red-500 hover:text-red-700"
                          title="Dismiss conflict"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                      <p className="text-xs text-red-600 mt-1">{conflict.message}</p>
                      
                      {/* Conflict Resolution Suggestions */}
                      {conflict.suggestedActions && conflict.suggestedActions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-600 mb-1">Suggested Actions:</p>
                          <div className="space-y-1">
                            {conflict.suggestedActions.slice(0, 2).map((action, actionIndex) => (
                              <button
                                key={actionIndex}
                                className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded"
                                onClick={() => {
                                  // Generate and apply suggestions
                                  const suggestions = conflictResolver.generateSuggestions(
                                    timetableData, conflict, rooms, teacherMap
                                  );
                                  if (suggestions.length > actionIndex) {
                                    const newTimetable = conflictResolver.applySuggestion(
                                      timetableData, suggestions[actionIndex]
                                    );
                                    setTimetablesData(prev => ({ ...prev, [activeTabId]: newTimetable }));
                                    addToHistory(activeTabId, newTimetable);
                                    
                                    // Log the resolution
                                    auditLogger.logAction('conflict_resolved', {
                                      conflictType: conflict.type,
                                      resolution: suggestions[actionIndex].type,
                                      day: conflict.day,
                                      slot: conflict.slot
                                    });
                                  }
                                }}
                              >
                                • {action}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
          onClick={() => !isTimetableDisabled && handleClearWeek()}
          className={`px-3 py-2 rounded-lg transition flex items-center gap-1 text-xs ${
            isTimetableDisabled 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          disabled={isTimetableDisabled}
        >
          <FiRefreshCw size={14} />
          <span>Clear Week</span>
        </button>
        
        <div className="flex gap-2">
          <button 
            onClick={() => !isTimetableDisabled && handleSaveTimetable()}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1 text-xs ${
              isTimetableDisabled 
                ? 'bg-gray-400 text-gray-300 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
            disabled={isTimetableDisabled}
          >
            <FiSave size={14} />
            <span>Save</span>
          </button>
          
          <button 
            onClick={() => !isTimetableDisabled && handlePublishTimetable()}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1 text-xs ${
              isTimetableDisabled 
                ? 'bg-gray-400 text-gray-300 cursor-not-allowed'
                : conflicts.length > 0 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            disabled={isTimetableDisabled || conflicts.length > 0}
          >
            <FiUpload size={14} />
            <span>Publish</span>
          </button>
        </div>
      </div>
    </div>
  );
}