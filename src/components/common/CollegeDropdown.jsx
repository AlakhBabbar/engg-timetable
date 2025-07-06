import React, { useState, useEffect } from 'react';
import { BsBuilding } from 'react-icons/bs';
import { FiChevronDown } from 'react-icons/fi';
import { getCollegeOptions, getCollegesByTypeShared } from '../../services/CollegeService';

/**
 * CollegeDropdown Component
 * Reusable dropdown component for selecting colleges across the application
 */
export default function CollegeDropdown({
  value = '',
  onChange,
  placeholder = 'Select College/Faculty',
  includeAll = false,
  filterByType = null, // Filter by specific type: 'Faculty', 'College', 'School', etc.
  required = false,
  disabled = false,
  className = '',
  showIcon = true,
  label = null,
  error = null
}) {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadColleges();
  }, [filterByType]);

  const loadColleges = async () => {
    try {
      setLoading(true);
      let collegeData;
      
      if (filterByType) {
        collegeData = await getCollegesByTypeShared(filterByType);
      } else {
        collegeData = await getCollegeOptions();
      }
      
      setColleges(collegeData);
    } catch (error) {
      console.error('Error loading colleges for dropdown:', error);
      setColleges([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const selectedValue = e.target.value;
    if (onChange) {
      // Find the full college object
      const selectedCollege = colleges.find(college => college.id === selectedValue);
      onChange(selectedValue, selectedCollege);
    }
  };

  const baseClasses = `
    w-full px-3 py-2 border border-gray-300 rounded-lg 
    focus:ring-2 focus:ring-indigo-500 focus:border-transparent
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
    ${error ? 'border-red-500' : ''}
    ${className}
  `.trim();

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {showIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <BsBuilding className="h-4 w-4 text-gray-400" />
          </div>
        )}
        
        <select
          value={value}
          onChange={handleChange}
          required={required}
          disabled={disabled || loading}
          className={`${baseClasses} ${showIcon ? 'pl-10' : ''} pr-10 appearance-none`}
        >
          <option value="">
            {loading ? 'Loading colleges...' : 
             colleges.length === 0 ? 'No colleges available' : 
             placeholder}
          </option>
          
          {includeAll && !loading && colleges.length > 0 && (
            <option value="all">All Colleges/Faculties</option>
          )}
          
          {!loading && colleges.map((college) => (
            <option key={college.id} value={college.id}>
              {college.name} ({college.code})
            </option>
          ))}
        </select>
        
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <FiChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {loading && (
        <p className="text-xs text-gray-500">Loading colleges...</p>
      )}
      
      {!loading && colleges.length === 0 && (
        <p className="text-xs text-gray-500">No colleges available. Please add colleges first.</p>
      )}
    </div>
  );
}
