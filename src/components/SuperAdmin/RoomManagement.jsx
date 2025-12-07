/**
 * Room Management Component with Comprehensive Pagination
 * 
 * Pagination Features Implemented:
 * - Page-based navigation with numbered pages
 * - Items per page selector (10, 25, 50, 100)
 * - First/Previous/Next/Last navigation buttons
 * - Page number indicators with ellipsis for large page counts
 * - Real-time pagination info display
 * - Automatic page reset when filters change
 * - Responsive design for mobile and desktop
 * - Visual feedback for disabled states
 * - Total items and filtered results display
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiX, FiHome, FiUsers, FiMonitor, FiWifi, FiThermometer, FiSave, FiUpload, FiInfo, FiDownload, FiClock, FiCheck, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useRateLimitedUpload } from '../../hooks/useRateLimitedUpload';
import UploadProgressIndicator from '../common/UploadProgressIndicator';
import { useToast } from '../../context/ToastContext';
import { 
  getAllRooms, 
  createRoom, 
  updateRoom, 
  deleteRoom, 
  filterRooms, 
  getAvailableFaculties,
  featureOptions as serviceFeatureOptions,
  getFacultyColorClass,
  getExampleJSONDataset,
  processRoomImport,
  processSingleRoomImport
} from './services/RoomManagement';
import CollegeDropdown from '../common/CollegeDropdown';

// Pagination constants
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_ITEMS_PER_PAGE = 25;

// Time slots for room allocation
const timeSlots = [
  { id: '8:00-9:00', label: '8:00 - 9:00 AM' },
  { id: '9:00-10:00', label: '9:00 - 10:00 AM' },
  { id: '10:00-11:00', label: '10:00 - 11:00 AM' },
  { id: '11:00-12:00', label: '11:00 AM - 12:00 PM' },
  { id: '12:00-13:00', label: '12:00 - 1:00 PM' },
  { id: '13:00-14:00', label: '1:00 - 2:00 PM' },
  { id: '14:00-15:00', label: '2:00 - 3:00 PM' },
  { id: '15:00-16:00', label: '3:00 - 4:00 PM' },
  { id: '16:00-17:00', label: '4:00 - 5:00 PM' },
  { id: '17:00-18:00', label: '5:00 - 6:00 PM' }
];

// Days of the week for scheduling
const daysOfWeek = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' }
];

// Feature options with icons
const featureOptions = serviceFeatureOptions.map(feature => {
  let icon;
  switch (feature.id) {
    case 'AC': 
      icon = <FiThermometer />;
      break;
    case 'Projector':
    case 'SmartBoard':
    case 'Computers':
      icon = <FiMonitor />;
      break;
    case 'Wi-Fi':
      icon = <FiWifi />;
      break;
    case 'Audio System':
      icon = <FiUsers />;
      break;
    default:
      icon = <FiHome size={12} />;
  }
  return { ...feature, icon };
});

export default function RoomManagement() {
  // Toast notifications
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  
  // State variables
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [facultyOptions, setFacultyOptions] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    roomNumber: '',
    capacity: '',
    features: [],
    faculty: 'Faculty of Engineering',
    freeTimings: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: []
    },
    allowOtherFaculties: false
  });
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRooms, setSelectedRooms] = useState(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // State for room statistics
  const [showUtilizationStats, setShowUtilizationStats] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  // Rate-limited upload hook
  const { uploadState, handleUpload, handleCancel, resetUploadState } = useRateLimitedUpload(
    // Processor function for room imports
    async (roomBatch) => {
      const results = [];
      for (const room of roomBatch) {
        try {
          const result = await processSingleRoomImport(room);
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            error: error.message,
            item: room
          });
        }
      }
      return results;
    }
  );

  const fileInputRef = useRef(null);
  const tooltipRef = useRef(null);

  // Initialize rooms and faculty options on component mount
  useEffect(() => {
    fetchRooms();
    fetchFacultyOptions();
  }, []);

  // Fetch rooms from Appwrite
  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const allRooms = await getAllRooms();
      setRooms(allRooms);
      setFilteredRooms(allRooms);
    } catch (err) {
      showError("Failed to fetch rooms", { 
        details: err.message,
        duration: 8000 
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available faculty options
  const fetchFacultyOptions = async () => {
    try {
      const faculties = await getAvailableFaculties();
      setFacultyOptions(faculties);
    } catch (err) {
      console.error('Failed to fetch faculty options:', err);
      // Set empty array instead of fallback options
      setFacultyOptions([]);
    }
  };

  // Handle outside clicks to close tooltip
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

  // Filter rooms whenever filter parameters change
  useEffect(() => {
    const filtered = filterRooms(rooms, {
      faculty: selectedFaculty,
      feature: selectedFeature,
      searchTerm: searchTerm
    });
    setFilteredRooms(filtered);
    // Clear selection when filters change to avoid confusion
    setSelectedRooms(new Set());
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [rooms, selectedFaculty, selectedFeature, searchTerm]);

  // Reset pagination when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

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

  // Handle time slot selection for a specific day
  const handleTimeSlotChange = (day, timeSlotId) => {
    setFormData(prev => {
      const dayTimings = prev.freeTimings[day] || [];
      let updatedTimings;
      
      if (dayTimings.includes(timeSlotId)) {
        // Remove time slot if already selected
        updatedTimings = dayTimings.filter(slot => slot !== timeSlotId);
      } else {
        // Add time slot if not selected
        updatedTimings = [...dayTimings, timeSlotId].sort();
      }
      
      return {
        ...prev,
        freeTimings: {
          ...prev.freeTimings,
          [day]: updatedTimings
        }
      };
    });
  };

  // Handle allow other faculties checkbox
  const handleAllowOtherFacultiesChange = (e) => {
    const { checked } = e.target;
    setFormData(prev => ({ ...prev, allowOtherFaculties: checked }));
  };

  // Select all time slots for a day
  const selectAllTimeSlotsForDay = (day) => {
    setFormData(prev => ({
      ...prev,
      freeTimings: {
        ...prev.freeTimings,
        [day]: timeSlots.map(slot => slot.id)
      }
    }));
  };

  // Clear all time slots for a day
  const clearAllTimeSlotsForDay = (day) => {
    setFormData(prev => ({
      ...prev,
      freeTimings: {
        ...prev.freeTimings,
        [day]: []
      }
    }));
  };

  // Open modal for new room
  const openNewRoomModal = () => {
    setEditingRoom(null);
    setFormData({
      roomNumber: '',
      capacity: '',
      features: [],
      faculty: 'Faculty of Engineering',
      freeTimings: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: []
      },
      allowOtherFaculties: false
    });
    setShowModal(true);
  };

  // Open modal for editing an existing room
  const openEditRoomModal = (room) => {
    setEditingRoom(room);
    setFormData({
      roomNumber: room.roomNumber || room.number,
      capacity: room.capacity,
      features: [...room.features],
      faculty: room.faculty,
      freeTimings: room.freeTimings || {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: []
      },
      allowOtherFaculties: room.allowOtherFaculties || false
    });
    setShowModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      if (editingRoom) {
        // Update existing room
        const roomData = {
          id: editingRoom.id,
          number: formData.roomNumber,
          capacity: parseInt(formData.capacity),
          features: [...formData.features],
          faculty: formData.faculty,
          freeTimings: formData.freeTimings,
          allowOtherFaculties: formData.allowOtherFaculties
        };
        
        await updateRoom(roomData);
        showSuccess(`Room ${formData.roomNumber} updated successfully`);
      } else {
        // Add new room
        const roomData = {
          number: formData.roomNumber,
          capacity: parseInt(formData.capacity),
          features: [...formData.features],
          faculty: formData.faculty,
          freeTimings: formData.freeTimings,
          allowOtherFaculties: formData.allowOtherFaculties
        };
        
        await createRoom(roomData);
        showSuccess(`Room ${formData.roomNumber} created successfully`);
      }
      
      // Refresh rooms after update
      await fetchRooms();
      setShowModal(false);
    } catch (err) {
      showError(`Failed to save room: ${err.message}`, {
        duration: 8000
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a room
  const handleDeleteRoom = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room?')) {
      return;
    }

    try {
      setIsLoading(true);
      
      const result = await deleteRoom(id);
      
      if (result.success) {
        showSuccess('Room deleted successfully');
        // Refresh rooms after deletion
        await fetchRooms();
      } else {
        showError(`Failed to delete room: ${result.error}`, {
          duration: 8000
        });
      }
    } catch (err) {
      showError(`Failed to delete room: ${err.message}`, {
        duration: 8000
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle selecting/deselecting individual rooms
  const handleRoomSelect = (roomId) => {
    setSelectedRooms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roomId)) {
        newSet.delete(roomId);
      } else {
        newSet.add(roomId);
      }
      return newSet;
    });
  };

  // Handle select all rooms (current page only)
  const handleSelectAll = () => {
    const currentPageRoomIds = paginatedRooms.map(room => room.id);
    const currentPageSelected = currentPageRoomIds.filter(id => selectedRooms.has(id));
    
    if (currentPageSelected.length === currentPageRoomIds.length) {
      // Deselect all rooms on current page
      setSelectedRooms(prev => {
        const newSet = new Set(prev);
        currentPageRoomIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all rooms on current page
      setSelectedRooms(prev => {
        const newSet = new Set(prev);
        currentPageRoomIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  // Check if all rooms on current page are selected
  const isCurrentPageFullySelected = () => {
    const currentPageRoomIds = paginatedRooms.map(room => room.id);
    return currentPageRoomIds.length > 0 && currentPageRoomIds.every(id => selectedRooms.has(id));
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedRooms.size === 0) {
      showWarning('Please select rooms to delete');
      return;
    }

    setShowBulkDeleteConfirm(true);
  };

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    try {
      setIsLoading(true);
      setShowBulkDeleteConfirm(false);

      const deletePromises = Array.from(selectedRooms).map(roomId => deleteRoom(roomId));
      const results = await Promise.allSettled(deletePromises);

      let successCount = 0;
      let failureCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
        } else {
          failureCount++;
        }
      });

      if (successCount > 0) {
        showSuccess(`Successfully deleted ${successCount} room${successCount > 1 ? 's' : ''}`);
      }

      if (failureCount > 0) {
        showError(`Failed to delete ${failureCount} room${failureCount > 1 ? 's' : ''}`);
      }

      // Clear selection and refresh rooms
      setSelectedRooms(new Set());
      await fetchRooms();

    } catch (err) {
      showError(`Failed to delete rooms: ${err.message}`, {
        duration: 8000
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedFaculty('');
    setSelectedFeature('');
    setSearchTerm('');
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedRooms(new Set());
  };

  // Trigger the hidden file input
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Comprehensive JSON validation function
  const validateRoomData = (roomsArray) => {
    const errors = [];
    const warnings = [];
    const roomNumbers = new Set();
    
    if (!Array.isArray(roomsArray)) {
      errors.push('Data must be an array of rooms');
      return { errors, warnings, isValid: false };
    }
    
    if (roomsArray.length === 0) {
      errors.push('No rooms found in the data');
      return { errors, warnings, isValid: false };
    }
    
    if (roomsArray.length > 1000) {
      warnings.push(`Large dataset detected (${roomsArray.length} rooms). This may take a while to process.`);
    }
    
    roomsArray.forEach((room, index) => {
      const roomContext = `Room ${index + 1}${room.roomNumber ? ` (${room.roomNumber})` : ''}`;
      
      // Check if room is an object
      if (typeof room !== 'object' || room === null) {
        errors.push(`${roomContext}: Must be an object, found ${typeof room}`);
        return;
      }
      
      // Required field validation
      if (!room.roomNumber || room.roomNumber.toString().trim() === '') {
        errors.push(`${roomContext}: Missing or empty room number`);
      } else {
        const roomNum = room.roomNumber.toString().trim();
        if (roomNumbers.has(roomNum)) {
          errors.push(`${roomContext}: Duplicate room number "${roomNum}"`);
        } else {
          roomNumbers.add(roomNum);
        }
        
        // Room number format validation
        if (roomNum.length > 20) {
          warnings.push(`${roomContext}: Room number is very long (${roomNum.length} characters)`);
        }
      }
      
      // Capacity validation
      if (room.capacity === null || room.capacity === undefined || room.capacity === '') {
        errors.push(`${roomContext}: Missing capacity`);
      } else {
        const capacity = parseInt(room.capacity);
        if (isNaN(capacity)) {
          errors.push(`${roomContext}: Capacity must be a number, found "${room.capacity}"`);
        } else if (capacity < 0) {
          errors.push(`${roomContext}: Capacity cannot be negative (${capacity})`);
        } else if (capacity === 0) {
          warnings.push(`${roomContext}: Capacity is 0 - is this intentional?`);
        } else if (capacity > 1000) {
          warnings.push(`${roomContext}: Very large capacity (${capacity}) - please verify`);
        }
      }
      
      // Faculty validation
      if (!room.faculty || room.faculty.toString().trim() === '') {
        errors.push(`${roomContext}: Missing faculty`);
      } else {
        const faculty = room.faculty.toString().trim();
        if (!facultyOptions.includes(faculty)) {
          errors.push(`${roomContext}: Invalid faculty "${faculty}". Valid options: ${facultyOptions.join(', ')}`);
        }
      }
      
      // Features validation
      if (room.features !== undefined) {
        if (!Array.isArray(room.features)) {
          warnings.push(`${roomContext}: Features should be an array, found ${typeof room.features}. Will be converted to empty array.`);
        } else {
          const validFeatures = featureOptions.map(f => f.id);
          room.features.forEach(feature => {
            if (!validFeatures.includes(feature)) {
              warnings.push(`${roomContext}: Unknown feature "${feature}". Valid features: ${validFeatures.join(', ')}`);
            }
          });
        }
      }
      
      // Check for unexpected fields
      const expectedFields = ['roomNumber', 'capacity', 'faculty', 'features', 'building', 'floor', 'description', 'active'];
      const actualFields = Object.keys(room);
      const unexpectedFields = actualFields.filter(field => !expectedFields.includes(field));
      
      if (unexpectedFields.length > 0) {
        warnings.push(`${roomContext}: Unexpected fields found: ${unexpectedFields.join(', ')}. These will be ignored.`);
      }
    });
    
    return {
      errors,
      warnings,
      isValid: errors.length === 0,
      roomCount: roomsArray.length,
      duplicateCount: roomsArray.length - roomNumbers.size
    };
  };

  // Handle file upload and JSON parsing with rate limiting
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.json')) {
      showError('Please select a valid JSON file', {
        duration: 5000
      });
      return;
    }
    
    try {
      setIsLoading(true);
      resetUploadState(); // Reset any previous upload state
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          
          // Handle both direct array and nested structure
          const roomsArray = Array.isArray(jsonData) ? jsonData : jsonData.rooms;
          
          if (!Array.isArray(roomsArray)) {
            throw new Error('JSON data must be an array of rooms or contain a "rooms" array');
          }

          if (roomsArray.length === 0) {
            showWarning('The selected file contains no rooms to import');
            setIsLoading(false);
            return;
          }

          // Validate the room data structure and content
          const validation = validateRoomData(roomsArray);
          
          if (!validation.isValid) {
            // Critical errors found - cannot proceed
            const errorDetails = validation.errors.slice(0, 10).join('\n') + 
              (validation.errors.length > 10 ? `\n... and ${validation.errors.length - 10} more errors` : '');
            
            showError(`❌ Data validation failed - cannot import`, {
              details: `Found ${validation.errors.length} error(s):\n\n${errorDetails}\n\nPlease fix these issues and try again.`,
              duration: 25000
            });
            setIsLoading(false);
            return;
          }
          
          // Show warnings if any and ask user for confirmation
          if (validation.warnings.length > 0) {
            const warningDetails = validation.warnings.slice(0, 8).join('\n') + 
              (validation.warnings.length > 8 ? `\n... and ${validation.warnings.length - 8} more warnings` : '');
            
            showWarning(`⚠️ Data validation completed with ${validation.warnings.length} warning(s)`, {
              details: `${warningDetails}`,
              duration: 15000
            });

            // Ask user for confirmation to proceed
            const userConfirmed = window.confirm(
              `⚠️ Data Validation Warnings Found\n\n` +
              `Found ${validation.warnings.length} warning(s) in your room data:\n\n` +
              `${validation.warnings.slice(0, 5).join('\n')}` +
              `${validation.warnings.length > 5 ? `\n... and ${validation.warnings.length - 5} more warnings` : ''}\n\n` +
              `These warnings won't prevent the upload, but you should review them.\n\n` +
              `Do you want to proceed with the upload anyway?`
            );

            if (!userConfirmed) {
              showInfo('Upload canceled by user due to data warnings.');
              setIsLoading(false);
              return;
            }

            showInfo('User confirmed to proceed despite warnings. Starting upload...');
          } else {
            // No errors or warnings
            showSuccess(`✅ Data validation passed! Ready to import ${validation.roomCount} rooms`, {
              duration: 5000
            });
          }

          // Brief delay to let user see validation results
          setTimeout(() => {
            showInfo(`🚀 Starting import of ${roomsArray.length} rooms...`);

            // Start rate-limited upload
            handleUpload(roomsArray, {
            batchSize: 1, // Process one room at a time
            onComplete: (results) => {
              const successful = results.filter(r => r.success).length;
              const failed = results.filter(r => !r.success).length;
              const failedItems = results.filter(r => !r.success);
              
              // Show toasts immediately - don't wait
              if (failed === 0) {
                showSuccess(`✅ Successfully imported all ${successful} rooms!`, {
                  duration: 8000
                });
              } else if (successful > 0) {
                // Format error details for display
                const errorSummary = failedItems.slice(0, 5).map(item => 
                  `${item.item?.roomNumber || 'Unknown'}: ${item.error}`
                ).join('\n');
                const moreErrors = failedItems.length > 5 ? `\n... and ${failedItems.length - 5} more errors` : '';
                
                showWarning(`⚠️ Import completed: ${successful} successful, ${failed} failed`, {
                  details: errorSummary + moreErrors,
                  duration: 15000
                });
              } else {
                // Format error details for display
                const errorSummary = failedItems.slice(0, 5).map(item => 
                  `${item.item?.roomNumber || 'Unknown'}: ${item.error}`
                ).join('\n');
                const moreErrors = failedItems.length > 5 ? `\n... and ${failedItems.length - 5} more errors` : '';
                
                showError(`❌ Import failed: All ${failed} rooms failed to import`, {
                  details: errorSummary + moreErrors,
                  duration: 20000 // Longer duration for error messages
                });
              }
              
              // Refresh the rooms list and update loading state
              fetchRooms();
              setIsLoading(false);
              
              // Auto-dismiss upload indicator after a delay for successful imports
              if (failed === 0) {
                setTimeout(() => {
                  resetUploadState();
                }, 3000);
              }
            },              onError: (error) => {
                showError(`Upload failed: ${error}`, {
                  duration: 10000
                });
                setIsLoading(false);
              }
            });
          }, 1000); // Standard delay since user has already confirmed
          
        } catch (err) {
          if (err.name === 'SyntaxError') {
            showError('Invalid JSON file format. Please check your file and try again.', {
              details: err.message,
              duration: 8000
            });
          } else {
            showError(`Error processing file: ${err.message}`, {
              duration: 8000
            });
          }
          // Log errors in development for debugging
          if (process.env.NODE_ENV === 'development') {
            console.error(err);
          }
          setIsLoading(false);
        }
      };
      
      reader.onerror = () => {
        showError('Error reading the file. Please try again.', {
          duration: 6000
        });
        setIsLoading(false);
      };
      
      reader.readAsText(file);
      
    } catch (err) {
      showError(`An error occurred during file upload: ${err.message}`, {
        duration: 8000
      });
      setIsLoading(false);
    }
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download example JSON dataset
  const downloadExampleJSON = () => {
    const exampleData = getExampleJSONDataset();
    
    const blob = new Blob([JSON.stringify(exampleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'room_dataset_example.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Calculate room utilization statistics
  const roomStats = useMemo(() => {
    if (rooms.length === 0) return null;
    
    const totalRooms = rooms.length;
    const sharedRooms = rooms.filter(room => room.allowOtherFaculties).length;
    const facultyOnlyRooms = totalRooms - sharedRooms;
    
    let totalAvailableSlots = 0;
    
    rooms.forEach(room => {
      if (room.allowOtherFaculties && room.freeTimings) {
        Object.values(room.freeTimings).forEach(slots => {
          totalAvailableSlots += slots ? slots.length : 0;
        });
      }
    });
    
    const sharingRate = totalRooms > 0 ? Math.round((sharedRooms / totalRooms) * 100) : 0;
    
    return {
      totalRooms,
      sharedRooms,
      facultyOnlyRooms,
      totalAvailableSlots,
      sharingRate
    };
  }, [rooms]);

  // Pagination logic
  const paginatedRooms = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredRooms.slice(start, end);
  }, [filteredRooms, currentPage, itemsPerPage]);

  // Pagination statistics
  const paginationStats = useMemo(() => {
    const totalPages = Math.ceil(filteredRooms.length / itemsPerPage);
    const startItem = filteredRooms.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredRooms.length);
    
    return {
      totalPages,
      startItem,
      endItem,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      isFirstPage: currentPage === 1,
      isLastPage: currentPage === totalPages
    };
  }, [filteredRooms.length, currentPage, itemsPerPage]);

  return (
    <div className="p-6 relative bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Room Management
      </h1>
      
      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-md mb-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="flex flex-1 flex-col md:flex-row gap-4 w-full lg:w-auto">
            {/* Faculty Filter */}
            <div className="relative flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Faculty</label>
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">All Faculties</option>
                {facultyOptions.map((faculty) => (
                  <option key={faculty} value={faculty}>{faculty}</option>
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
                  placeholder="Search by room number or faculty..."
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
            {(selectedFaculty || selectedFeature || searchTerm) && (
              <button
                onClick={resetFilters}
                className="px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition flex items-center gap-2"
              >
                <FiX size={16} />
                <span>Clear Filters</span>
              </button>
            )}
            
            {/* Bulk Delete Button */}
            {selectedRooms.size > 0 && (
              <>
                <button
                  onClick={() => setSelectedRooms(new Set(filteredRooms.map(room => room.id)))}
                  className="px-4 py-3 rounded-lg border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 transition flex items-center gap-2"
                  title="Select all filtered rooms across all pages"
                >
                  <FiCheck size={16} />
                  <span>Select All ({filteredRooms.length})</span>
                </button>
                <button
                  onClick={clearSelection}
                  className="px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition flex items-center gap-2"
                >
                  <FiX size={16} />
                  <span>Clear Selection</span>
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition flex items-center gap-2"
                >
                  <FiTrash2 size={16} />
                  <span>Delete Selected ({selectedRooms.size})</span>
                </button>
              </>
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
      
      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
        </div>
      )}
      
      {/* Rooms Table */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        {/* Table Header with Pagination Info */}
        {filteredRooms.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-medium text-gray-900">
                Room List ({filteredRooms.length} total)
              </h3>
              {selectedRooms.size > 0 && (
                <span className="text-xs px-2 py-1 bg-teal-100 text-teal-800 rounded-full">
                  {selectedRooms.size} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredRooms.length)} of {filteredRooms.length}
              </span>
              <span className="text-gray-300">|</span>
              <span>
                Page {currentPage} of {Math.ceil(filteredRooms.length / itemsPerPage)}
              </span>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={isCurrentPageFullySelected()}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    title="Select all rooms on current page"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Room Number</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Capacity</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Features</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Faculty</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Availability</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {paginatedRooms.length > 0 ? (
                paginatedRooms.map((room, index) => (
                  <tr key={room.id} className={`hover:bg-gray-50 transition ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRooms.has(room.id)}
                        onChange={() => handleRoomSelect(room.id)}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-teal-700">{room.roomNumber || room.number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{room.capacity} Seats</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {room.features && room.features.map((feature) => {
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
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getFacultyColorClass(room.faculty)}`}>
                        {room.faculty}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {room.allowOtherFaculties ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <FiCheck size={12} className="mr-1" />
                            Shared Access
                          </span>
                          {room.freeTimings && Object.values(room.freeTimings).some(slots => slots.length > 0) && (
                            <span className="text-xs text-gray-500">
                              {Object.entries(room.freeTimings)
                                .filter(([_, slots]) => slots.length > 0)
                                .length} days available
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <FiX size={12} className="mr-1" />
                          Faculty Only
                        </span>
                      )}
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
              ) : isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                    Loading rooms...
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                    No rooms found with the current filters. Try adjusting your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination Controls */}
      {filteredRooms.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-md p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Results Info */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredRooms.length)} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredRooms.length)} of {filteredRooms.length} rooms
                {filteredRooms.length !== rooms.length && (
                  <span className="text-gray-500"> (filtered from {rooms.length} total)</span>
                )}
              </div>
              
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-white"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Pagination Navigation */}
            <div className="flex items-center gap-2">
              {/* First Page Button */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="First page"
              >
                First
              </button>
              
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronLeft size={16} />
                Previous
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {(() => {
                  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage);
                  const maxVisiblePages = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }
                  
                  const pages = [];
                  
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm"
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(<span key="ellipsis1" className="px-2 text-gray-500">...</span>);
                    }
                  }
                  
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`px-3 py-2 rounded-lg transition text-sm ${
                          i === currentPage
                            ? 'bg-teal-600 text-white border border-teal-600'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(<span key="ellipsis2" className="px-2 text-gray-500">...</span>);
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm"
                      >
                        {totalPages}
                      </button>
                    );
                  }
                  
                  return pages;
                })()}
              </div>
              
              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage * itemsPerPage >= filteredRooms.length}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <FiChevronRight size={16} />
              </button>
              
              {/* Last Page Button */}
              <button
                onClick={() => setCurrentPage(Math.ceil(filteredRooms.length / itemsPerPage))}
                disabled={currentPage * itemsPerPage >= filteredRooms.length}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Last page"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add/Edit Room Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-start sm:items-center justify-center bg-black bg-opacity-40 z-50 backdrop-blur-sm overflow-y-auto p-4">
          <motion.div 
            className="relative w-full max-w-4xl bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl sm:rounded-3xl my-4 sm:my-8 max-h-[92vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 transition z-10 p-1"
            >
              <FiX size={20} className="sm:w-6 sm:h-6" />
            </button>
            
            <div className="p-4 sm:p-6 lg:p-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800 text-center pr-8">
                {editingRoom ? 'Edit Room' : 'Add New Room'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Room Number */}
                <div className="relative">
                  <div className="flex items-center mb-1 sm:mb-2">
                    <FiHome size={14} className="sm:w-4 sm:h-4 text-teal-600 mr-2" />
                    <label className="block text-sm font-medium text-gray-600">Room Number</label>
                  </div>
                  <input
                    type="text"
                    name="roomNumber"
                    value={formData.roomNumber}
                    onChange={handleChange}
                    required
                    placeholder="A101"
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>

                {/* Capacity */}
                <div className="relative">
                  <div className="flex items-center mb-1 sm:mb-2">
                    <FiUsers size={14} className="sm:w-4 sm:h-4 text-teal-600 mr-2" />
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
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                
                {/* Features */}
                <div className="relative">
                  <div className="flex items-center mb-1 sm:mb-2">
                    <FiMonitor size={14} className="sm:w-4 sm:h-4 text-teal-600 mr-2" />
                    <label className="block text-sm font-medium text-gray-600">Features</label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-2">
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
                          className="text-sm flex items-center gap-1 cursor-pointer flex-1"
                        >
                          <span>{feature.icon}</span>
                          <span>{feature.name}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Faculty */}
                <div className="relative">
                  <div className="flex items-center mb-1 sm:mb-2">
                    <FiUsers size={14} className="sm:w-4 sm:h-4 text-teal-600 mr-2" />
                    <label className="block text-sm font-medium text-gray-600">Faculty</label>
                  </div>
                  <select
                    name="faculty"
                    value={formData.faculty}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm sm:text-base"
                  >
                    {facultyOptions.map((faculty) => (
                      <option key={faculty} value={faculty}>{faculty}</option>
                    ))}
                  </select>
                </div>
                
                {/* Allow Other Faculties Checkbox */}
                <div className="relative">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="allowOtherFaculties"
                      checked={formData.allowOtherFaculties}
                      onChange={handleAllowOtherFacultiesChange}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded mt-0.5"
                    />
                    <label 
                      htmlFor="allowOtherFaculties"
                      className="text-sm font-medium text-gray-600 cursor-pointer leading-relaxed"
                    >
                      Allow other faculties to use this room during free timings
                    </label>
                  </div>
                </div>

                {/* Free Timings Section - Only show if allowing other faculties */}
                {formData.allowOtherFaculties && (
                  <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                      <div className="flex items-center">
                        <FiClock size={14} className="sm:w-4 sm:h-4 text-teal-600 mr-2" />
                        <label className="block text-sm font-medium text-gray-600">Free Time Slots for Other Faculties</label>
                      </div>
                      <div className="flex gap-1 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            // Select all time slots for all days
                            const allFreeTimings = {};
                            daysOfWeek.forEach(day => {
                              allFreeTimings[day.id] = timeSlots.map(slot => slot.id);
                            });
                            setFormData(prev => ({
                              ...prev,
                              freeTimings: allFreeTimings
                            }));
                          }}
                          className="text-xs px-2 py-1 bg-teal-100 text-teal-700 rounded hover:bg-teal-200 transition"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Clear all time slots for all days
                            const clearFreeTimings = {};
                            daysOfWeek.forEach(day => {
                              clearFreeTimings[day.id] = [];
                            });
                            setFormData(prev => ({
                              ...prev,
                              freeTimings: clearFreeTimings
                            }));
                          }}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    
                    {/* Timetable Format */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <div className="overflow-x-auto max-h-72 sm:max-h-96">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                                Time
                              </th>
                              {daysOfWeek.map((day) => (
                                <th 
                                  key={day.id} 
                                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px] sm:min-w-[80px]"
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="hidden sm:block">{day.label}</span>
                                    <span className="sm:hidden">{day.label.slice(0, 3)}</span>
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => selectAllTimeSlotsForDay(day.id)}
                                        className="text-xs px-1 py-0.5 bg-teal-100 text-teal-700 rounded hover:bg-teal-200 transition"
                                        title={`Select all slots for ${day.label}`}
                                      >
                                        All
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => clearAllTimeSlotsForDay(day.id)}
                                        className="text-xs px-1 py-0.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                                        title={`Clear all slots for ${day.label}`}
                                      >
                                        None
                                      </button>
                                    </div>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {timeSlots.map((slot, index) => (
                              <tr key={slot.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-700">
                                  <div className="flex flex-col">
                                    <span className="hidden sm:block">{slot.label}</span>
                                    <span className="sm:hidden text-xs">{slot.id}</span>
                                  </div>
                                </td>
                                {daysOfWeek.map((day) => {
                                  const isSelected = formData.freeTimings[day.id]?.includes(slot.id) || false;
                                  return (
                                    <td key={day.id} className="px-2 py-2 text-center">
                                      <div className="flex justify-center">
                                        <button
                                          type="button"
                                          onClick={() => handleTimeSlotChange(day.id, slot.id)}
                                          className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md border-2 transition-all duration-200 hover:scale-110 ${
                                            isSelected
                                              ? 'bg-teal-500 border-teal-500 text-white shadow-md'
                                              : 'bg-white border-gray-300 hover:border-teal-300 hover:bg-teal-50'
                                          }`}
                                          title={`${isSelected ? 'Remove' : 'Add'} ${slot.label} on ${day.label}`}
                                        >
                                          {isSelected && (
                                            <FiCheck size={12} className="sm:w-4 sm:h-4 mx-auto" />
                                          )}
                                        </button>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Summary and Legend */}
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-xs text-gray-500 leading-relaxed">
                        💡 Click on time slots to mark them as available for other faculties
                      </p>
                      <div className="text-xs text-gray-600">
                        Selected: {Object.values(formData.freeTimings).reduce((total, slots) => total + (slots?.length || 0), 0)} slots
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 sm:px-6 sm:py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 sm:px-6 sm:py-3 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-white font-semibold hover:shadow-lg transition duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <FiSave size={16} className="sm:w-5 sm:h-5" />
                    <span>{editingRoom ? 'Update Room' : 'Add Room'}</span>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 backdrop-blur-sm">
          <motion.div 
            className="relative w-full max-w-md bg-white/90 backdrop-blur-xl shadow-xl rounded-3xl mx-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <button 
              onClick={() => setShowBulkDeleteConfirm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            >
              <FiX size={24} />
            </button>
            
            <div className="p-8">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <FiTrash2 className="w-6 h-6 text-red-600" />
                </div>
              </div>
              
              <h2 className="text-xl font-bold mb-4 text-gray-800 text-center">
                Delete Selected Rooms
              </h2>
              
              <p className="text-gray-600 mb-6 text-center">
                Are you sure you want to delete <span className="font-semibold text-red-600">{selectedRooms.size}</span> selected room{selectedRooms.size > 1 ? 's' : ''}? This action cannot be undone.
              </p>
              
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkDelete}
                  className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-2"
                >
                  <FiTrash2 size={18} />
                  <span>Delete {selectedRooms.size} Room{selectedRooms.size > 1 ? 's' : ''}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Floating Buttons Group */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4">
        {/* Upload Room Dataset Button with Info Icon */}
        <div className="flex items-center relative group">
          <button
            onClick={handleUploadClick}
            className="p-4 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg hover:scale-105 transition flex items-center"
          >
            <FiUpload size={20} className="mr-2" />
            <span>Upload Room Dataset</span>
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
              <FiInfo size={16} className="text-teal-600" />
            </button>
            
            {/* Tooltip */}
            {showInfoTooltip && (
              <div className="absolute bottom-full right-0 mb-2 w-72 bg-white rounded-lg shadow-xl p-4 text-sm border border-gray-200 z-50">
                <p className="font-medium mb-2 text-gray-700">JSON Dataset Format</p>
                <p className="text-gray-600 mb-3">Upload a JSON file containing an array of rooms with their details.</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadExampleJSON();
                  }}
                  className="flex items-center text-teal-600 hover:text-teal-800 font-medium"
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
      </div>

      {/* Upload Progress Indicator */}
      <UploadProgressIndicator 
        uploadState={uploadState}
        onDismiss={resetUploadState}
        onCancel={handleCancel}
        showQueueInfo={true}
      />
    </div>
  );
}