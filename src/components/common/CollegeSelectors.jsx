import React from 'react';
import CollegeDropdown from './CollegeDropdown';

/**
 * College Selector Component
 * A higher-level component that wraps CollegeDropdown with common use cases
 */

/**
 * Department College Selector - for assigning departments to colleges
 */
export function DepartmentCollegeSelector({ value, onChange, error, required = true }) {
  return (
    <CollegeDropdown
      value={value}
      onChange={onChange}
      label="College/Faculty"
      placeholder="Select College or Faculty"
      required={required}
      error={error}
      filterByType="Faculty" // Only show faculties for department assignment
      className="w-full"
    />
  );
}

/**
 * Room College Selector - for assigning rooms to colleges
 */
export function RoomCollegeSelector({ value, onChange, error, required = false }) {
  return (
    <CollegeDropdown
      value={value}
      onChange={onChange}
      label="College/Faculty (Optional)"
      placeholder="Select College or Faculty"
      required={required}
      error={error}
      includeAll={true}
      className="w-full"
    />
  );
}

/**
 * Faculty College Selector - for assigning faculty members to colleges
 */
export function FacultyCollegeSelector({ value, onChange, error, required = true }) {
  return (
    <CollegeDropdown
      value={value}
      onChange={onChange}
      label="Primary College/Faculty"
      placeholder="Select Primary College"
      required={required}
      error={error}
      className="w-full"
    />
  );
}

/**
 * Course College Selector - for assigning courses to colleges
 */
export function CourseCollegeSelector({ value, onChange, error, required = true }) {
  return (
    <CollegeDropdown
      value={value}
      onChange={onChange}
      label="Offering College/Faculty"
      placeholder="Select Offering College"
      required={required}
      error={error}
      className="w-full"
    />
  );
}

/**
 * Generic College Filter - for filtering views by college
 */
export function CollegeFilter({ value, onChange, includeAll = true, label = "Filter by College" }) {
  return (
    <CollegeDropdown
      value={value}
      onChange={onChange}
      label={label}
      placeholder="All Colleges"
      required={false}
      includeAll={includeAll}
      showIcon={false}
      className="min-w-48"
    />
  );
}

/**
 * Compact College Selector - for space-constrained areas
 */
export function CompactCollegeSelector({ value, onChange, placeholder = "College" }) {
  return (
    <CollegeDropdown
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={false}
      showIcon={false}
      className="text-sm"
    />
  );
}

export default {
  DepartmentCollegeSelector,
  RoomCollegeSelector,
  FacultyCollegeSelector,
  CourseCollegeSelector,
  CollegeFilter,
  CompactCollegeSelector
};
