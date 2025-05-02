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
  { 
    id: '1', 
    roomNumber: 'CS101', 
    capacity: 60,
    features: ['Projector', 'AC', 'Wi-Fi'],
    faculty: 'Faculty of Engineering'
  },
  { 
    id: '2', 
    roomNumber: 'LH201', 
    capacity: 120,
    features: ['Projector', 'SmartBoard', 'Audio System', 'AC', 'Wi-Fi'],
    faculty: 'Faculty of Engineering'
  },
  { 
    id: '3', 
    roomNumber: 'LAB302', 
    capacity: 40,
    features: ['Computers', 'Projector', 'AC', 'Wi-Fi'],
    faculty: 'Faculty of Science'
  },
  { 
    id: '4', 
    roomNumber: 'PH101', 
    capacity: 30,
    features: ['Audio System', 'Wi-Fi'],
    faculty: 'Faculty of Science'
  },
  { 
    id: '5', 
    roomNumber: 'CH202', 
    capacity: 35,
    features: ['Audio System', 'SmartBoard'],
    faculty: 'Faculty of Social Science'
  },
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
  'Common Facilities'
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
    'Common Facilities': 'bg-gray-100 text-gray-800'
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
        "faculty": "Faculty of Engineering"
      },
      {
        "roomNumber": "LH201",
        "capacity": 120,
        "features": ["Projector", "SmartBoard", "Audio System"],
        "faculty": "Faculty of Science"
      }
    ]
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
        features: data.features || []
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
  processRoomImport
};

export default RoomManagementService;