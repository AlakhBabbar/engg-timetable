import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  getAllSemesters, 
  getActiveSemester,
  getDefaultSemesters,
  storeSelectedSemester,
  getSelectedSemesterFromStorage 
} from '../services/SemesterService.js';

// Create the semester context
const SemesterContext = createContext();

// Hook to use semester context
export const useSemester = () => {
  const context = useContext(SemesterContext);
  if (!context) {
    throw new Error('useSemester must be used within a SemesterProvider');
  }
  return context;
};

// Semester provider component
export const SemesterProvider = ({ children }) => {
  const [selectedSemester, setSelectedSemester] = useState('');
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [activeSemesters, setActiveSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load semesters from Firebase and set initial state
  const loadSemesters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all semesters from Firebase
      const semestersData = await getAllSemesters();
      
      if (semestersData.length > 0) {
        // Extract semester names from data
        const semesterNames = semestersData.map(sem => sem.name);
        const activeSems = semestersData.filter(sem => sem.status === 'active');
        
        setAvailableSemesters(semesterNames);
        setActiveSemesters(activeSems);
        
        // Try to use the stored semester if it exists and is valid
        const storedSemester = getSelectedSemesterFromStorage();
        
        if (storedSemester && semesterNames.includes(storedSemester)) {
          // Check if the stored semester is still active
          const isStoredSemesterActive = activeSems.some(sem => sem.name === storedSemester);
          
          if (isStoredSemesterActive || activeSems.length === 0) {
            // Use stored semester if it's still active, or if there are no active semesters
            setSelectedSemester(storedSemester);
          } else {
            // Switch to the first active semester if stored one is no longer active
            setSelectedSemester(activeSems[0].name);
            storeSelectedSemester(activeSems[0].name);
          }
        } else {
          // Otherwise use the first active semester
          if (activeSems.length > 0) {
            setSelectedSemester(activeSems[0].name);
            storeSelectedSemester(activeSems[0].name);
          } else {
            // Fallback to the first semester in the list
            setSelectedSemester(semesterNames[0]);
            storeSelectedSemester(semesterNames[0]);
          }
        }
      } else {
        // Fallback to default semesters if none found in database
        const defaultSemesters = getDefaultSemesters();
        setAvailableSemesters(defaultSemesters);
        setActiveSemesters([]);
        setSelectedSemester(defaultSemesters[0]);
        storeSelectedSemester(defaultSemesters[0]);
      }
    } catch (err) {
      console.error('Error loading semesters:', err);
      setError(err.message);
      
      // Fallback to defaults on error
      const defaultSemesters = getDefaultSemesters();
      setAvailableSemesters(defaultSemesters);
      setActiveSemesters([]);
      setSelectedSemester(defaultSemesters[0]);
      storeSelectedSemester(defaultSemesters[0]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    loadSemesters();
  }, []);

  // Function to manually refresh semesters (useful after SuperAdmin changes)
  const refreshSemesters = async () => {
    await loadSemesters();
  };

  // Function to select a semester
  const selectSemester = (semester) => {
    if (availableSemesters.includes(semester)) {
      setSelectedSemester(semester);
      storeSelectedSemester(semester);
    } else {
      console.warn(`Semester "${semester}" not found in available semesters`);
    }
  };

  // Function to get only active semester names
  const getActiveSemesterNames = () => {
    return activeSemesters.map(sem => sem.name);
  };

  // Function to check if a semester is active
  const isSemesterActive = (semesterName) => {
    return activeSemesters.some(sem => sem.name === semesterName);
  };

  // Context value
  const value = {
    selectedSemester,
    availableSemesters,
    activeSemesters,
    loading,
    error,
    selectSemester,
    refreshSemesters,
    getActiveSemesterNames,
    isSemesterActive
  };

  return (
    <SemesterContext.Provider value={value}>
      {children}
    </SemesterContext.Provider>
  );
};

export default SemesterProvider;
