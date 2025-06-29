// RoomManagement.js - Firebase Integration
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  generateId
} from '../../../firebase/config';

// Collection name
const ROOMS_COLLECTION = 'rooms';

// Mock data for rooms
const dummyRooms = [
];

// Room types for dropdown
export const roomTypes = [
  'Classroom',
  'Lecture Hall',
  'Computer Lab',
  'Chemistry Lab',
  'Physics Lab',
  'Workshop',
  'Seminar Hall',
  'Conference Room'
];

// Building options
export const buildings = [
  'CSE Block',
  'Main Block',
  'IT Block',
  'Mechanical Block',
  'Electronics Block',
  'Civil Block',
  'Admin Block',
  'Library Building'
];

// Status options
export const statusOptions = [
  'Available',
  'Occupied',
  'Maintenance',
  'Reserved'
];

// Faculty options for dropdown (renamed from departmentOptions)
export const facultyOptions = [
  'Faculty of Engineering',
  'Faculty of Science',
  'Faculty of Social Science',
  'Faculty of Arts',
  'Faculty of Management',
  'Faculty of Law',
  'Faculty of Medicine',
  'Faculty of Education',
  'Common Facilities',
  'Technical College',
  'Faculty of Architecture',
  'Shatabdi Bhawan',
  'School of Education',
  'Department of English',
  'General'
];

// Feature options with name and id
export const featureOptions = [
  { id: 'Projector', name: 'Projector' },
  { id: 'SmartBoard', name: 'Smart Board' },
  { id: 'Computers', name: 'Computer System' },
  { id: 'AC', name: 'Air Conditioning' },
  { id: 'Wi-Fi', name: 'Wi-Fi' },
  { id: 'Audio System', name: 'Audio System' }
];

/**
 * Get faculty color class based on faculty name
 * @param {string} faculty - Faculty name
 * @returns {string} CSS class for color
 */
export const getFacultyColorClass = (faculty) => {
  const colorMap = {
    'Faculty of Engineering': 'bg-blue-100 text-blue-800',
    'Faculty of Science': 'bg-green-100 text-green-800',
    'Faculty of Social Science': 'bg-orange-100 text-orange-800',
    'Faculty of Arts': 'bg-purple-100 text-purple-800',
    'Faculty of Management': 'bg-yellow-100 text-yellow-800',
    'Faculty of Law': 'bg-indigo-100 text-indigo-800',
    'Faculty of Medicine': 'bg-red-100 text-red-800',
    'Faculty of Education': 'bg-teal-100 text-teal-800',
    'Common Facilities': 'bg-gray-100 text-gray-800',
    'Technical College': 'bg-pink-100 text-pink-800',
    'Faculty of Architecture': 'bg-cyan-100 text-cyan-800',
    'Shatabdi Bhawan': 'bg-lime-100 text-lime-800',
    'School of Education': 'bg-amber-100 text-amber-800',
    'Department of English': 'bg-violet-100 text-violet-800',
    'General': 'bg-slate-100 text-slate-800'
  };
  
  return colorMap[faculty] || 'bg-gray-100 text-gray-800';
};

/**
 * Get all rooms (synchronous version returning mock data)
 * @returns {Array} Array of room objects
 */
export const getRooms = () => {
  return dummyRooms;
};

/**
 * Add a new room (synchronous version for mock data)
 * @param {Object} roomData - Room data object
 * @returns {Object} Created room with ID
 */
export const addRoom = (roomData) => {
  const newRoom = {
    id: 'room_' + Date.now(),
    roomNumber: roomData.roomNumber,
    capacity: parseInt(roomData.capacity),
    features: [...roomData.features],
    faculty: roomData.faculty
  };
  
  dummyRooms.push(newRoom);
  return newRoom;
};

/**
 * Filter rooms based on criteria
 * @param {Array} rooms - Array of room objects
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered rooms
 */
export const filterRooms = (rooms, filters = {}) => {
  return rooms.filter(room => {
    // Filter by search term
    if (filters.searchTerm && 
        !room.roomNumber?.toLowerCase().includes(filters.searchTerm.toLowerCase()) && 
        !room.number?.toLowerCase().includes(filters.searchTerm.toLowerCase()) && 
        !room.faculty?.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by faculty
    if (filters.faculty && room.faculty !== filters.faculty) {
      return false;
    }
    
    // Filter by feature
    if (filters.feature && !room.features?.includes(filters.feature)) {
      return false;
    }
    
    return true;
  });
};

/**
 * Get example JSON dataset format
 * @returns {Object} Example dataset
 */
export const getExampleJSONDataset = () => {
  return {
    "rooms": [
      {
        "roomNumber": "CS101",
        "capacity": 60,
        "features": ["Projector", "AC", "Wi-Fi"],
        "faculty": "Faculty of Engineering",
        "allowOtherFaculties": true,
        "freeTimings": {
          "monday": ["8:00-9:00", "14:00-15:00", "15:00-16:00"],
          "tuesday": ["9:00-10:00", "15:00-16:00", "16:00-17:00"],
          "wednesday": ["10:00-11:00", "11:00-12:00"],
          "thursday": ["8:00-9:00", "16:00-17:00"],
          "friday": ["13:00-14:00", "14:00-15:00"],
          "saturday": ["8:00-9:00", "9:00-10:00", "10:00-11:00"]
        }
      },
      {
        "roomNumber": "LH201",
        "capacity": 120,
        "features": ["Projector", "SmartBoard", "Audio System", "AC"],
        "faculty": "Faculty of Science",
        "allowOtherFaculties": false,
        "freeTimings": {
          "monday": [],
          "tuesday": [],
          "wednesday": [],
          "thursday": [],
          "friday": [],
          "saturday": []
        }
      },
      {
        "roomNumber": "LAB305",
        "capacity": 30,
        "features": ["Computers", "AC", "Wi-Fi", "Projector"],
        "faculty": "Faculty of Engineering",
        "allowOtherFaculties": true,
        "freeTimings": {
          "monday": ["12:00-13:00", "13:00-14:00"],
          "tuesday": ["8:00-9:00", "11:00-12:00", "17:00-18:00"],
          "wednesday": ["9:00-10:00", "15:00-16:00"],
          "thursday": ["10:00-11:00", "12:00-13:00", "14:00-15:00"],
          "friday": ["8:00-9:00", "16:00-17:00"],
          "saturday": ["8:00-9:00", "9:00-10:00", "10:00-11:00", "11:00-12:00"]
        }
      },
      {
        "roomNumber": "AUD400",
        "capacity": 200,
        "features": ["Audio System", "Projector", "SmartBoard", "AC"],
        "faculty": "Faculty of Arts",
        "allowOtherFaculties": true,
        "freeTimings": {
          "monday": ["16:00-17:00", "17:00-18:00"],
          "tuesday": ["13:00-14:00", "14:00-15:00"],
          "wednesday": ["12:00-13:00", "16:00-17:00"],
          "thursday": ["15:00-16:00"],
          "friday": ["11:00-12:00", "12:00-13:00"],
          "saturday": []
        }
      },
      {
        "roomNumber": "SEM202",
        "capacity": 40,
        "features": ["Wi-Fi", "AC"],
        "faculty": "Faculty of Social Science",
        "allowOtherFaculties": false,
        "freeTimings": {
          "monday": [],
          "tuesday": [],
          "wednesday": [],
          "thursday": [],
          "friday": [],
          "saturday": []
        }
      }
    ],
    "_metadata": {
      "description": "Room Management Dataset Example",
      "version": "1.0",
      "availableFeatures": ["Projector", "SmartBoard", "Computers", "AC", "Wi-Fi", "Audio System"],
      "availableFaculties": [
        "Faculty of Engineering",
        "Faculty of Science", 
        "Faculty of Arts",
        "Faculty of Business",
        "Faculty of Medicine",
        "Faculty of Law"
      ],
      "timeSlotFormat": "HH:MM-HH:MM (24-hour format)",
      "availableTimeSlots": [
        "8:00-9:00", "9:00-10:00", "10:00-11:00", "11:00-12:00",
        "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00",
        "16:00-17:00", "17:00-18:00"
      ],
      "requiredFields": ["roomNumber", "capacity", "faculty"],
      "optionalFields": ["features", "allowOtherFaculties", "freeTimings"],
      "notes": [
        "allowOtherFaculties: true allows other faculties to book during free timings",
        "freeTimings: specify available time slots for each day when allowOtherFaculties is true",
        "features: array of available room features",
        "capacity: number of seats/people the room can accommodate"
      ]
    }
  };
};

/**
 * Process room data import from JSON
 * @param {Object} jsonData - Imported JSON data
 * @returns {Object} Import results
 */
export const processRoomImport = async (jsonData) => {
  try {
    if (!jsonData.rooms || !Array.isArray(jsonData.rooms)) {
      return { success: false, error: "Invalid JSON format. Expected 'rooms' array." };
    }
    
    const results = [];
    
    for (const roomData of jsonData.rooms) {
      try {
        // Validate required fields
        if (!roomData.roomNumber || !roomData.capacity || !roomData.faculty) {
          results.push({
            roomNumber: roomData.roomNumber || 'Unknown',
            success: false,
            error: "Missing required fields"
          });
          continue;
        }
        
        // Add room using the Firebase function
        const room = await createRoom({
          number: roomData.roomNumber,
          capacity: roomData.capacity,
          features: Array.isArray(roomData.features) ? roomData.features : [],
          faculty: roomData.faculty
        });
        
        results.push({
          roomNumber: room.number,
          success: true
        });
      } catch (err) {
        results.push({
          roomNumber: roomData.roomNumber || 'Unknown',
          success: false,
          error: err.message
        });
      }
    }
    
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error("Error processing room import:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Process a single room import (used for rate-limited uploads)
 * @param {Object} roomData - Single room data object
 * @returns {Promise<Object>} Result object with success status
 */
export const processSingleRoomImport = async (roomData) => {
  try {
    // Detailed validation with specific error messages
    const validationErrors = [];
    
    if (!roomData.roomNumber || roomData.roomNumber.trim() === '') {
      validationErrors.push('Room number is required');
    }
    
    if (!roomData.capacity && roomData.capacity !== 0) {
      validationErrors.push('Capacity is required');
    } else if (isNaN(parseInt(roomData.capacity)) || parseInt(roomData.capacity) < 0) {
      validationErrors.push('Capacity must be a valid positive number');
    }
    
    if (!roomData.faculty || roomData.faculty.trim() === '') {
      validationErrors.push('Faculty is required');
    } else if (!facultyOptions.includes(roomData.faculty)) {
      validationErrors.push(`Invalid faculty "${roomData.faculty}". Valid options: ${facultyOptions.join(', ')}`);
    }
    
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: validationErrors.join('; '),
        item: roomData
      };
    }

    // Prepare room data
    const roomDoc = {
      number: roomData.roomNumber.trim(),
      capacity: parseInt(roomData.capacity) || 0,
      features: Array.isArray(roomData.features) ? roomData.features : [],
      faculty: roomData.faculty.trim(),
      active: roomData.active !== false, // Default to true unless explicitly false
      building: roomData.building || '',
      floor: roomData.floor || '',
      description: roomData.description || '',
      freeTimings: roomData.freeTimings || {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: []
      },
      allowOtherFaculties: roomData.allowOtherFaculties || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Generate unique document ID
    const docId = `${roomData.faculty.replace(/[^a-zA-Z0-9]/g, '_')}_${roomData.roomNumber.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const roomRef = doc(db, ROOMS_COLLECTION, docId);
    
    // Check if room already exists
    const existingDoc = await getDoc(roomRef);
    if (existingDoc.exists()) {
      // Update existing room
      await updateDoc(roomRef, {
        ...roomDoc,
        createdAt: existingDoc.data().createdAt, // Keep original creation date
      });
      
      return {
        success: true,
        action: 'updated',
        roomNumber: roomData.roomNumber,
        item: roomData
      };
    } else {
      // Create new room
      await setDoc(roomRef, roomDoc);
      
      return {
        success: true,
        action: 'created',
        roomNumber: roomData.roomNumber,
        item: roomData
      };
    }

  } catch (error) {
    console.error('Error processing single room import:', error);
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Unknown error occurred';
    
    if (error.code === 'permission-denied') {
      errorMessage = 'Permission denied - please check your access rights';
    } else if (error.code === 'network-error') {
      errorMessage = 'Network error - please check your connection';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
      item: roomData
    };
  }
};

/**
 * Get all rooms from Firebase
 * @returns {Promise} Promise object with rooms data
 */
export const getAllRooms = async () => {
  try {
    const roomsRef = collection(db, ROOMS_COLLECTION);
    const querySnapshot = await getDocs(roomsRef);
    
    if (querySnapshot.empty) {
      console.warn("No rooms found in Firebase, using dummy data");
      return dummyRooms;
    }
    
    // Transform Firebase data format to match application needs
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        roomNumber: data.number, // for backward compatibility
        number: data.number,
        type: data.type,
        capacity: data.capacity,
        building: data.building,
        floor: data.floor,
        status: data.status || 'Available',
        faculty: data.faculty,
        features: data.features || [],
        freeTimings: data.freeTimings || {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: []
        },
        allowOtherFaculties: data.allowOtherFaculties || false
      };
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    // Fallback to dummy data
    return dummyRooms;
  }
};

/**
 * Filter rooms by search term and filters using Firebase
 * @param {string} searchTerm - Search term for filtering rooms
 * @param {Object} filters - Additional filters to apply
 * @returns {Promise} Promise object with filtered rooms
 */
export const filterRoomsAsync = async (searchTerm, filters = {}) => {
  try {
    // Get all rooms first and then filter client-side
    // In a real app with many rooms, you might use Firestore queries more specifically
    const allRooms = await getAllRooms();
    
    return allRooms.filter(room => {
      // Filter by search term
      if (searchTerm && !room.number.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !room.building?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by building
      if (filters.building && filters.building !== 'All' && room.building !== filters.building) {
        return false;
      }
      
      // Filter by type
      if (filters.type && filters.type !== 'All' && room.type !== filters.type) {
        return false;
      }
      
      // Filter by status
      if (filters.status && filters.status !== 'All' && room.status !== filters.status) {
        return false;
      }
      
      // Filter by faculty
      if (filters.faculty && filters.faculty !== 'All' && room.faculty !== filters.faculty) {
        return false;
      }
      
      return true;
    });
  } catch (error) {
    console.error("Error filtering rooms:", error);
    
    // Fallback to filtering dummy data
    return dummyRooms.filter(room => {
      // Apply filters to dummy data
      if (searchTerm && !room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      if (filters.faculty && filters.faculty !== 'All' && room.faculty !== filters.faculty) {
        return false;
      }
      
      return true;
    });
  }
};

/**
 * Create a new room in Firebase
 * @param {Object} roomData - Room data to create
 * @returns {Promise} Promise object with created room
 */
export const createRoom = async (roomData) => {
  try {
    // Generate a unique ID for the room
    const roomId = generateId();
    
    // Prepare room data
    const room = {
      number: roomData.number || roomData.roomNumber,
      type: roomData.type || 'Classroom',
      capacity: parseInt(roomData.capacity),
      building: roomData.building || 'Main Block',
      floor: parseInt(roomData.floor || '1'),
      status: roomData.status || 'Available',
      faculty: roomData.faculty,
      features: roomData.features || [],
      freeTimings: roomData.freeTimings || {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: []
      },
      allowOtherFaculties: roomData.allowOtherFaculties || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add the document to Firestore
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    await setDoc(roomRef, room);
    
    return {
      id: roomId,
      ...room
    };
  } catch (error) {
    console.error("Error creating room:", error);
    throw error;
  }
};

/**
 * Update an existing room in Firebase
 * @param {Object} roomData - Room data to update
 * @returns {Promise} Promise object with updated room
 */
export const updateRoom = async (roomData) => {
  try {
    const updatedData = {
      number: roomData.number || roomData.roomNumber,
      type: roomData.type || 'Classroom',
      capacity: parseInt(roomData.capacity),
      building: roomData.building || 'Main Block',
      floor: parseInt(roomData.floor || '1'),
      status: roomData.status || 'Available',
      faculty: roomData.faculty,
      features: roomData.features || [],
      freeTimings: roomData.freeTimings || {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: []
      },
      allowOtherFaculties: roomData.allowOtherFaculties || false,
      updatedAt: new Date().toISOString()
    };
    
    const roomRef = doc(db, ROOMS_COLLECTION, roomData.id);
    await updateDoc(roomRef, updatedData);
    
    return {
      id: roomData.id,
      ...updatedData
    };
  } catch (error) {
    console.error("Error updating room:", error);
    throw error;
  }
};

/**
 * Delete a room from Firebase
 * @param {string} id - ID of the room to delete
 * @returns {Promise} Promise object with result
 */
export const deleteRoom = async (id) => {
  try {
    const roomRef = doc(db, ROOMS_COLLECTION, id);
    await deleteDoc(roomRef);
    
    return { success: true, id };
  } catch (error) {
    console.error("Error deleting room:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get available rooms for a specific time slot and day
 * @param {Array} rooms - Array of all rooms
 * @param {string} day - Day of the week (monday, tuesday, etc.)
 * @param {string} timeSlot - Time slot ID (e.g., '9:00-10:00')
 * @param {string} requesterFaculty - Faculty requesting the room
 * @returns {Array} Available rooms for the specified time
 */
export const getAvailableRooms = (rooms, day, timeSlot, requesterFaculty) => {
  return rooms.filter(room => {
    // If it's the room's own faculty, they can always use it during non-occupied times
    if (room.faculty === requesterFaculty) {
      return true;
    }
    
    // For other faculties, check if room allows other faculties and has free timing
    return room.allowOtherFaculties && 
           room.freeTimings && 
           room.freeTimings[day] && 
           room.freeTimings[day].includes(timeSlot);
  });
};

/**
 * Get room availability summary for the week
 * @param {Object} room - Room object
 * @returns {Object} Summary of room availability
 */
export const getRoomAvailabilitySummary = (room) => {
  if (!room.allowOtherFaculties || !room.freeTimings) {
    return {
      totalFreeSlots: 0,
      daysAvailable: 0,
      peakAvailabilityDay: null,
      availableForOthers: false
    };
  }

  let totalFreeSlots = 0;
  let daysAvailable = 0;
  let peakDay = '';
  let maxSlotsInDay = 0;

  Object.entries(room.freeTimings).forEach(([day, slots]) => {
    if (slots.length > 0) {
      daysAvailable++;
      totalFreeSlots += slots.length;
      
      if (slots.length > maxSlotsInDay) {
        maxSlotsInDay = slots.length;
        peakDay = day;
      }
    }
  });

  return {
    totalFreeSlots,
    daysAvailable,
    peakAvailabilityDay: peakDay,
    availableForOthers: true
  };
};

/**
 * Generate room utilization report
 * @param {Array} rooms - Array of rooms
 * @returns {Object} Utilization statistics
 */
export const generateRoomUtilizationReport = (rooms) => {
  const totalRooms = rooms.length;
  const sharedRooms = rooms.filter(room => room.allowOtherFaculties).length;
  const facultyOnlyRooms = totalRooms - sharedRooms;
  
  let totalAvailableSlots = 0;
  let totalPossibleSlots = rooms.length * 6 * 10; // 6 days * 10 time slots per day
  
  rooms.forEach(room => {
    if (room.allowOtherFaculties && room.freeTimings) {
      Object.values(room.freeTimings).forEach(slots => {
        totalAvailableSlots += slots.length;
      });
    }
  });
  
  const utilizationRate = totalPossibleSlots > 0 ? 
    ((totalPossibleSlots - totalAvailableSlots) / totalPossibleSlots * 100) : 0;
  
  return {
    totalRooms,
    sharedRooms,
    facultyOnlyRooms,
    totalAvailableSlots,
    utilizationRate: Math.round(utilizationRate * 100) / 100,
    sharingRate: totalRooms > 0 ? Math.round((sharedRooms / totalRooms) * 100) : 0
  };
};

// Export all functions as a service object
const RoomManagementService = {
  getRooms,
  getAllRooms,
  filterRooms,
  createRoom,
  addRoom,
  updateRoom,
  deleteRoom,
  roomTypes,
  buildings,
  statusOptions,
  facultyOptions,
  featureOptions,
  getFacultyColorClass,
  getExampleJSONDataset,
  processRoomImport,
  processSingleRoomImport,
  getAvailableRooms,
  getRoomAvailabilitySummary,
  generateRoomUtilizationReport
};

export default RoomManagementService;