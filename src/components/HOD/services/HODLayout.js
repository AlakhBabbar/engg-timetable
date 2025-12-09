import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logoutUser } from '../../Auth/services/Login';
import { FiGrid, FiBook, FiUsers, FiFileText, FiCalendar } from 'react-icons/fi';

export const useHODLayout = (user, setUser) => {
  const [activeSidebarItem, setActiveSidebarItem] = useState('Dashboard');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Remove semester loading since it's now handled by context
  // All semester-related state and logic is moved to SemesterContext
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logoutUser();
      // Update auth context
      setUser(null);
      // Redirect to login page after successful logout
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      // Show error message to user
      alert('Logout failed. Please try again.');
    }
  };
  
  // Set active item based on current path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/hod/dashboard')) {
      setActiveSidebarItem('Dashboard');
    } else if (path.includes('/hod/courses')) {
      setActiveSidebarItem('Courses');
    } else if (path.includes('/hod/assign-faculty')) {
      setActiveSidebarItem('Assign-Course');
    } else if (path.includes('/hod/reports')) {
      setActiveSidebarItem('Reports');
    } else if (path.includes('/hod/timetable')) {
      setActiveSidebarItem('Timetable');
    }
  }, [location]);
  
  const sidebarItems = [
    { label: 'Courses', icon: FiBook, iconSize: 18, path: '/hod/courses' },
    { label: 'Assign-Course', icon: FiUsers, iconSize: 18, path: '/hod/assign-faculty' },
  ];

  const handleNavigation = (path, label) => {
    setActiveSidebarItem(label);
    navigate(path);
  };

  return {
    activeSidebarItem,
    sidebarItems,
    handleNavigation,
    handleLogout
  };
};