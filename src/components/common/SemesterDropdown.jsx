import React, { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useSemester } from '../../context/SemesterContext';

const SemesterDropdown = ({ 
  className = "", 
  showOnlyActive = false,
  variant = "default", // "default", "header", "compact"
  onSemesterChange = null 
}) => {
  const { 
    selectedSemester, 
    availableSemesters, 
    activeSemesters,
    selectSemester, 
    loading,
    isSemesterActive 
  } = useSemester();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const closeDropdown = (e) => {
      if (!e.target.closest('.semester-dropdown')) {
        setDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', closeDropdown);
    return () => document.removeEventListener('mousedown', closeDropdown);
  }, []);

  // Handle semester selection
  const handleSemesterSelect = (semester) => {
    selectSemester(semester);
    setDropdownOpen(false);
    
    // Call custom change handler if provided
    if (onSemesterChange) {
      onSemesterChange(semester);
    }
  };

  // Get semesters to show in dropdown
  const semestersToShow = showOnlyActive 
    ? activeSemesters.map(sem => sem.name)
    : availableSemesters;

  // Get variant-specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case "header":
        return {
          container: "relative semester-dropdown",
          trigger: "ml-4 flex items-center border rounded-lg px-3 py-1 cursor-pointer hover:bg-gray-50",
          text: "text-gray-600 mr-1",
          dropdown: "absolute top-full left-4 mt-1 w-48 bg-white rounded-lg shadow-lg py-1 z-20",
          item: "px-4 py-2 cursor-pointer hover:bg-gray-100",
          activeItem: "bg-indigo-50 text-indigo-600"
        };
      case "compact":
        return {
          container: "relative semester-dropdown",
          trigger: "flex items-center border rounded px-2 py-1 cursor-pointer hover:bg-gray-50 text-sm",
          text: "text-gray-600 mr-1",
          dropdown: "absolute top-full left-0 mt-1 w-40 bg-white rounded-lg shadow-lg py-1 z-20",
          item: "px-3 py-1 cursor-pointer hover:bg-gray-100 text-sm",
          activeItem: "bg-indigo-50 text-indigo-600"
        };
      default:
        return {
          container: "relative semester-dropdown",
          trigger: "flex items-center border rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50",
          text: "text-gray-700 mr-1",
          dropdown: "absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg py-1 z-20",
          item: "px-4 py-2 cursor-pointer hover:bg-gray-100",
          activeItem: "bg-indigo-50 text-indigo-600"
        };
    }
  };

  const styles = getVariantStyles();

  if (loading) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.trigger}>
          <span className={styles.text}>Loading...</span>
        </div>
      </div>
    );
  }

  if (semestersToShow.length === 0) {
    const message = showOnlyActive ? "No active semesters" : "No semesters";
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.trigger}>
          <span className={styles.text}>{message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <div 
        className={styles.trigger}
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        <span className={styles.text}>{selectedSemester}</span>
        {dropdownOpen ? 
          <FiChevronUp className="text-gray-500" /> : 
          <FiChevronDown className="text-gray-500" />
        }
      </div>
      
      {dropdownOpen && (
        <div className={styles.dropdown}>
          {semestersToShow.map((semester) => (
            <div
              key={semester}
              className={`${styles.item} ${
                selectedSemester === semester ? styles.activeItem : ''
              }`}
              onClick={() => handleSemesterSelect(semester)}
            >
              <span>{semester}</span>
              {showOnlyActive && (
                <span className="ml-2 text-xs text-green-600 font-medium">●</span>
              )}
            </div>
          ))}
          {showOnlyActive ? (
            <div className="border-t my-1">
              <div className="px-4 py-1 text-xs text-gray-500">
                Showing active semesters only
              </div>
            </div>
          ) : (
            <>
              <div className="border-t my-1"></div>
              <div className="px-4 py-1 text-xs text-gray-500">
                Active: {activeSemesters.length > 0 
                  ? activeSemesters.map(sem => sem.name).join(', ')
                  : 'None'
                }
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SemesterDropdown;
