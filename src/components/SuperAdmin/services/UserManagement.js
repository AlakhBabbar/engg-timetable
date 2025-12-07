// User Management Service with Firebase Integration
import { 
  auth, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut, // Import signOut function
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from '../../../firebase/config.js';
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
  generateId
} from '../../../firebase/config.js';

// Department data - would come from Database in production
const departments = [
  'Computer Science', 
  'Electrical Engineering', 
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Common'
];

// User roles
const roles = ['superadmin', 'hod', 'tt_incharge'];
const roleDisplayNames = {
  'superadmin': 'Admin',
  'hod': 'HOD',
  'tt_incharge': 'TT Incharge'
};

// Collection names
const PROFILES_COLLECTION = 'profiles';
const TEACHERS_COLLECTION = 'teachers';

/**
 * Fetch all users from the Firestore database
 * @returns {Promise<Array>} Array of user objects
 */
export const getUsers = async () => {
  try {
    const profilesRef = collection(db, PROFILES_COLLECTION);
    const querySnapshot = await getDocs(profilesRef);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId || doc.id,
        name: data.name,
        email: data.email,
        role: data.role,
        department: data.department,
        active: data.active !== false, // default to true if not specified
        canEditCommonCourses: data.canEditCommonCourses || false, // New permission field
        createdAt: data.createdAt
      };
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const getDepartments = () => {
  return departments;
};

export const getRoles = () => {
  return roles.map(role => ({
    value: role,
    label: roleDisplayNames[role] || role
  }));
};

// Helper function to generate a secure password
const generateSecurePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * Create a teacher record in Firestore for an HOD user
 * @param {Object} userData User data
 * @param {String} userId Firebase Auth User ID
 */
const createTeacherForHOD = async (userData, userId) => {
  try {
    // Generate a unique document ID for the teacher
    const teacherId = generateId(); // From Firebase config

    // Create teacher document in Firestore 'teachers' collection
    await setDoc(doc(db, TEACHERS_COLLECTION, teacherId), {
      userId: userId,
      name: userData.name,
      email: userData.email,
      department: userData.department,
      role: 'hod', // Set role as HOD
      expertise: [],
      qualification: 'PhD', // Default qualification for HOD
      experience: 0, // Default, can be updated later
      active: true,
      maxHours: 20, // Default max teaching hours per week for HOD
      createdAt: new Date().toISOString()
    });
    
    return teacherId;
  } catch (error) {
    console.error('Error creating teacher record for HOD:', error);
    throw error;
  }
};

/**
 * Create a new user in Firebase and add their profile
 * @param {Object} userData User data to create
 * @returns {Promise<Object>} Created user data
 */
export const createUser = async (userData) => {
  try {
    // Store the current user's email to sign them back in later
    let currentEmail = null;
    let currentPassword = null;
    
    // Check if we're currently authenticated and store the email
    await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          currentEmail = user.email;
        }
        unsubscribe();
        resolve();
      });
    });
    
    if (!currentEmail) {
      throw new Error('No authenticated user found. Please sign in again.');
    }
    
    // Prompt for current admin password before proceeding
    currentPassword = window.prompt('Please enter your password to confirm this action:');
    if (!currentPassword) {
      throw new Error('Password required to create new users.');
    }

    // Generate a random initial password
    const initialPassword = generateSecurePassword();
    
    // Create user in Firebase Authentication (requires admin SDK in a real app)
    // This example shows client-side approach, but in production you'd use Cloud Functions
    // for security reasons
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      initialPassword
    );
    
    const user = userCredential.user;
    
    // Create user profile in Firestore
    const userProfileRef = doc(db, PROFILES_COLLECTION, user.uid);
    await setDoc(userProfileRef, {
      userId: user.uid,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      department: userData.department,
      active: true,
      canEditCommonCourses: userData.canEditCommonCourses || false, // New permission field
      createdAt: new Date().toISOString()
    });
    
    // If user is an HOD, also create entry in teachers collection in Firestore
    if (userData.role === 'hod') {
      await createTeacherForHOD(userData, user.uid);
    }
    
    // Send password reset email so user can set their own password
    try {
      await sendPasswordResetEmail(auth, userData.email, {
        url: window.location.origin + '/login'
      });
    } catch (recoveryError) {
      console.warn('Could not send password reset email:', recoveryError);
    }
    
    // Sign out the newly created user
    await signOut(auth);
    
    // Sign back in as the original admin user
    try {
      await signInWithEmailAndPassword(auth, currentEmail, currentPassword);
    } catch (signInError) {
      console.error('Error signing back in as admin:', signInError);
      // At this point, the user needs to log back in manually
      throw new Error('User created successfully, but you have been signed out. Please sign in again.');
    }
    
    return {
      id: user.uid,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      department: userData.department,
      active: true
    };
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('A user with this email already exists.');
    }
    throw new Error('Failed to create user: ' + error.message);
  }
};

/**
 * Update a user profile in the database
 * @param {string} id The profile document ID
 * @param {Object} userData Updated user data
 * @returns {Promise<Object>} Updated user data
 */
export const updateUser = async (id, userData) => {
  try {
    // Update user profile in Firestore
    const userProfileRef = doc(db, PROFILES_COLLECTION, id);
    await updateDoc(userProfileRef, {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      department: userData.department,
      active: userData.active !== false,
      canEditCommonCourses: userData.canEditCommonCourses || false // Update permission field
    });
    
    // If the user is an HOD, update or create their record in the teachers collection
    if (userData.role === 'hod') {
      try {
        // Try to find if this user already has a teacher record in Firestore
        const teachersRef = collection(db, TEACHERS_COLLECTION);
        const q = query(teachersRef, where('userId', '==', id));
        const querySnapshot = await getDocs(q);
        
        // If a record exists, update it
        if (!querySnapshot.empty) {
          const teacherDoc = querySnapshot.docs[0];
          
          await updateDoc(doc(db, TEACHERS_COLLECTION, teacherDoc.id), {
            name: userData.name,
            email: userData.email,
            department: userData.department,
            active: userData.active !== false,
            updatedAt: new Date().toISOString()
          });
        } else {
          // If no record exists, create one
          await createTeacherForHOD(userData, id);
        }
      } catch (firestoreError) {
        console.error('Error updating HOD in teachers collection:', firestoreError);
        // Continue with the user update even if the Firestore operation fails
      }
    }
    
    return {
      id,
      ...userData,
      active: userData.active !== false
    };
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error('Failed to update user: ' + error.message);
  }
};

/**
 * Delete a user from the database
 * @param {string} id The user's document ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteUser = async (id) => {
  try {
    // In production, you would delete the Firebase Auth user using the Admin SDK in a Cloud Function
    
    // Delete user profile from Firestore
    await deleteDoc(doc(db, PROFILES_COLLECTION, id));
    
    // Check if user has a teacher record and delete it if exists
    const teachersRef = collection(db, TEACHERS_COLLECTION);
    const q = query(teachersRef, where('userId', '==', id));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const teacherDoc = querySnapshot.docs[0];
      await deleteDoc(doc(db, TEACHERS_COLLECTION, teacherDoc.id));
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user: ' + error.message);
  }
};

/**
 * Get a single user by ID
 * @param {string} id User ID
 * @returns {Promise<Object>} User data
 */
export const getUserById = async (id) => {
  try {
    const userRef = doc(db, PROFILES_COLLECTION, id);
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data
      };
    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

/**
 * Toggle a user's active status
 * @param {string} id The user's document ID
 * @param {boolean} active New active status 
 * @returns {Promise<boolean>} Success status
 */
export const toggleUserStatus = async (id, active) => {
  try {
    // Update user profile in Firestore
    const userProfileRef = doc(db, PROFILES_COLLECTION, id);
    await updateDoc(userProfileRef, {
      active: active,
      updatedAt: new Date().toISOString()
    });
    
    // Also update teacher record if exists
    const teachersRef = collection(db, TEACHERS_COLLECTION);
    const q = query(teachersRef, where('userId', '==', id));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const teacherDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, TEACHERS_COLLECTION, teacherDoc.id), {
        active: active,
        updatedAt: new Date().toISOString()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error toggling user status:', error);
    throw new Error('Failed to update user status: ' + error.message);
  }
};

/**
 * Send a password reset email to a user
 * @param {string} email User's email address
 * @returns {Promise<boolean>} Success status
 */
export const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: window.location.origin + '/login'
    });
    return true;
  } catch (error) {
    console.error('Error sending password reset:', error);
    throw new Error('Failed to send password reset email: ' + error.message);
  }
};

/**
 * Generate initials from a name
 * @param {string} name Full name
 * @returns {string} Initials (up to 2 characters)
 */
export const getInitials = (name) => {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

/**
 * Generate a background color class based on name
 * @param {string} name User's name
 * @returns {string} CSS class for background color
 */
export const getAvatarBg = (name) => {
  if (!name) return 'bg-gray-400';
  
  const colors = [
    'bg-teal-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-violet-500',
    'bg-fuchsia-500',
    'bg-rose-500'
  ];
  
  // Create a simple hash from the name to get consistent colors
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

/**
 * Get role badge color based on user role
 * @param {string} role User role
 * @returns {string} CSS class for badge color
 */
export const getRoleBadgeColor = (role) => {
  switch (role) {
    case 'superadmin':
      return 'bg-purple-100 text-purple-800';
    case 'hod':
      return 'bg-blue-100 text-blue-800';
    case 'tt_incharge':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};