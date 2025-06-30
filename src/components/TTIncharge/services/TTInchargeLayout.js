import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logoutUser } from '../../Auth/services/Login';

export const useTTInchargeLayout = (setUser) => {
  const [activeSidebarItem, setActiveSidebarItem] = useState('Dashboard');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Remove hardcoded semester logic - now handled by context
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const closeDropdowns = (e) => {
      if (!e.target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', closeDropdowns);
    return () => document.removeEventListener('mousedown', closeDropdowns);
  }, []);
  
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
    if (path.includes('/tt/dashboard')) {
      setActiveSidebarItem('Dashboard');
    } else if (path.includes('/tt/timetable-builder')) {
      setActiveSidebarItem('Timetable Builder');
    } else if (path.includes('/tt/conflicts')) {
      setActiveSidebarItem('Conflicts');
    } else if (path.includes('/tt/rooms') || path.includes('/tt/room-availability')) {
      setActiveSidebarItem('Rooms');
    } else if (path.includes('/tt/faculty-timetable')) {
      setActiveSidebarItem('Faculty View');
    } else if (path.includes('/tt/batch-management')) {
      setActiveSidebarItem('Batch Management');
    }
  }, [location]);
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  const sidebarItems = [
    { label: 'Dashboard', icon: 'FiGrid', path: '/tt/dashboard' },
    { label: 'Batch Management', icon: 'FiUsers', path: '/tt/batch-management' },
    { label: 'Timetable Builder', icon: 'FiCalendar', path: '/tt/timetable-builder' },
    { label: 'Conflicts', icon: 'FiAlertCircle', path: '/tt/conflicts' },
    { label: 'Rooms', icon: 'FiHome', path: '/tt/rooms' },
    { label: 'Faculty View', icon: 'FiUsers', path: '/tt/faculty-timetable' },
  ];

  const handleNavigation = (path, label) => {
    setActiveSidebarItem(label);
    navigate(path);
  };

  // Calculate CSS classes based on state
  const getLayoutClasses = () => {
    // Determine sidebar width class based on collapsed state and screen size
    const sidebarWidthClass = sidebarCollapsed 
      ? "w-16" 
      : "w-20 lg:w-52";
    
    // Determine main content margin based on collapsed state and screen size
    const mainMarginClass = sidebarCollapsed 
      ? "ml-16" 
      : "ml-20 lg:ml-52";

    // Determine header left position based on collapsed state and screen size
    const headerLeftClass = sidebarCollapsed 
      ? "left-16" 
      : "left-20 lg:left-52";
      
    return {
      sidebarWidthClass,
      mainMarginClass,
      headerLeftClass
    };
  };

  return {
    activeSidebarItem,
    profileDropdownOpen,
    setProfileDropdownOpen,
    sidebarCollapsed,
    handleLogout,
    toggleSidebar,
    sidebarItems,
    handleNavigation,
    getLayoutClasses
  };
};