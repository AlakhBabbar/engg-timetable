// Authentication service for login functionality
import { 
  auth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut
} from '../../../firebase/config.js';
import { db, doc, getDoc } from '../../../firebase/config.js';

// Session storage keys
const USER_DATA_KEY = 'userData';

/**
 * Attempts to authenticate a user with the provided credentials
 * @param {Object} credentials - User login credentials
 * @param {string} credentials.email - User's email
 * @param {string} credentials.password - User's password
 * @returns {Promise<Object>} - Promise resolving to user data on successful login
 * @throws {Error} - If authentication fails
 */
export const loginUser = async (credentials) => {
  try {
    // Sign in with Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    
    const user = userCredential.user;
    
    // Get user profile data from Firestore
    const userProfileRef = doc(db, 'profiles', user.uid);
    const userProfileSnap = await getDoc(userProfileRef);
    
    let role = 'faculty'; // Default role
    let department = null;
    let name = user.displayName || '';
    let canEditCommonCourses = false; // Default permission
    
    if (userProfileSnap.exists()) {
      // If profile exists in Firestore, use data from there
      const profileData = userProfileSnap.data();
      console.log('LOGIN DEBUG: Profile data from Firestore:', profileData);
      role = profileData.role;
      department = profileData.department;
      name = profileData.name || name;
      canEditCommonCourses = profileData.canEditCommonCourses || false;
      console.log('LOGIN DEBUG: Extracted canEditCommonCourses:', canEditCommonCourses);
    } else {
      console.log('LOGIN DEBUG: No profile found in Firestore for user:', user.uid);
    }
    
    const userObject = {
      id: user.uid,
      email: user.email,
      name: name,
      role: role,
      department: department,
      canEditCommonCourses: canEditCommonCourses,
      isAuthenticated: true
    };
    
    console.log('LOGIN DEBUG: Created user object:', userObject);
    
    // Store user data for quick access
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userObject));
    
    return userObject;
  } catch (error) {
    console.error('Authentication failed:', error);
    
    // Handle Firebase Auth errors
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        throw new Error('Invalid credentials. Please check your email and password.');
      case 'auth/too-many-requests':
        throw new Error('Too many attempts. Please try again later.');
      default:
        throw new Error('Login failed. ' + error.message);
    }
  }
};

/**
 * Logs out the current user
 * @returns {Promise<boolean>}
 */
export const logoutUser = async () => {
  try {
    // Sign out from Firebase
    await signOut(auth);
    
    // Clear local storage
    localStorage.removeItem(USER_DATA_KEY);
    
    return true;
  } catch (error) {
    console.error('Logout failed:', error);
    
    // Even if server logout fails, clear local storage
    localStorage.removeItem(USER_DATA_KEY);
    
    throw new Error('Logout failed: ' + error.message);
  }
};

/**
 * Gets the current user information
 * @returns {Promise<Object|null>} - Promise resolving to user data or null if not logged in
 */
export const getCurrentUser = async () => {
  try {
    // Try to get cached user data first
    const cachedUserData = localStorage.getItem(USER_DATA_KEY);
    if (cachedUserData) {
      // Return cached data to avoid unnecessary API calls
      return JSON.parse(cachedUserData);
    }
    
    // Check if user is authenticated with Firebase
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        
        if (!user) {
          resolve(null);
          return;
        }
        
        try {
          // Get user profile from Firestore
          const userProfileRef = doc(db, 'profiles', user.uid);
          const userProfileSnap = await getDoc(userProfileRef);
          
          let role = 'faculty'; // Default role
          let department = null;
          let name = user.displayName || '';
          let canEditCommonCourses = false; // Default permission
          
          if (userProfileSnap.exists()) {
            const profileData = userProfileSnap.data();
            console.log('GET_CURRENT_USER DEBUG: Profile data from Firestore:', profileData);
            role = profileData.role;
            department = profileData.department;
            name = profileData.name || name;
            canEditCommonCourses = profileData.canEditCommonCourses || false;
            console.log('GET_CURRENT_USER DEBUG: Extracted canEditCommonCourses:', canEditCommonCourses);
          } else {
            console.log('GET_CURRENT_USER DEBUG: No profile found in Firestore for user:', user.uid);
          }
          
          const userObject = {
            id: user.uid,
            email: user.email,
            name: name,
            role: role,
            department: department,
            canEditCommonCourses: canEditCommonCourses,
            isAuthenticated: true
          };
          
          console.log('GET_CURRENT_USER DEBUG: Created user object:', userObject);
          
          // Update cache
          localStorage.setItem(USER_DATA_KEY, JSON.stringify(userObject));
          
          resolve(userObject);
        } catch (error) {
          reject(error);
        }
      }, reject);
    });
  } catch (error) {
    // User is not logged in
    localStorage.removeItem(USER_DATA_KEY);
    return null;
  }
};

/**
 * Check if user session is valid
 * @returns {Promise<boolean>}
 */
export const checkSession = async () => {
  try {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(!!user);
      });
    });
  } catch (error) {
    // Session is invalid, clean up
    localStorage.removeItem(USER_DATA_KEY);
    return false;
  }
};

/**
 * Initialize client with Firebase Auth if available
 * Call this when the application starts
 */
export const initializeAuth = () => {
  // Firebase Auth will automatically restore authentication state
  // Nothing additional needed here
  return true;
};