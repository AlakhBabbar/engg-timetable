import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { 
  FiGrid, 
  FiCalendar, 
  FiAlertCircle, 
  FiHome, 
  FiUsers, 
  FiBell, 
  FiSearch, 
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
  FiMenu,
  FiLayers,
  FiLogOut
} from 'react-icons/fi';
import { logoutUser } from '../Auth/services/Login';

import TTInchargeDashboard from './TTInchargeDashboard';
import TimetableBuilder from './TimetableBuilder';
import Conflicts from './Conflicts';
import RoomAvailability from './RoomAvailability';
import FacultyTimetable from './FacultyTimetable';

export default function TTInchargeLayout() {
  const [activeSidebarItem, setActiveSidebarItem] = useState('Dashboard');
  const [semesterDropdownOpen, setSemesterDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('Semester 7');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // List of available semesters
  const availableSemesters = [
    'Semester 7',
    'Semester 6',
    'Semester 5',
    'Semester 4'
  ];
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const closeDropdowns = (e) => {
      if (!e.target.closest('.semester-dropdown')) {
        setSemesterDropdownOpen(false);
      }
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
      // Redirect to login page after successful logout
      navigate('/login');
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
    } else if (path.includes('/tt/rooms')) {
      setActiveSidebarItem('Rooms');
    } else if (path.includes('/tt/faculty-view')) {
      setActiveSidebarItem('Faculty View');
    } else if (path.includes('/tt/faculty-timetable')) {
      setActiveSidebarItem('Faculty Timetable');
    }
  }, [location]);
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  const sidebarItems = [
    { label: 'Dashboard', icon: <FiGrid size={18} />, path: '/tt/dashboard' },
    { label: 'Timetable Builder', icon: <FiCalendar size={18} />, path: '/tt/timetable-builder' },
    { label: 'Conflicts', icon: <FiAlertCircle size={18} />, path: '/tt/conflicts' },
    { label: 'Rooms', icon: <FiHome size={18} />, path: '/tt/rooms' },
    { label: 'Faculty View', icon: <FiUsers size={18} />, path: '/tt/faculty-timetable' },
  ];

  const handleNavigation = (path, label) => {
    setActiveSidebarItem(label);
    navigate(path);
  };

  // Determine sidebar width class based on collapsed state and screen size
  const sidebarWidthClass = sidebarCollapsed 
    ? "w-16" 
    : "w-20 lg:w-64";
  
  // Determine main content margin based on collapsed state and screen size
  const mainMarginClass = sidebarCollapsed 
    ? "ml-16" 
    : "ml-20 lg:ml-64";

  // Determine header left position based on collapsed state and screen size
  const headerLeftClass = sidebarCollapsed 
    ? "left-16" 
    : "left-20 lg:left-64";

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left sidebar - Fixed position */}
      <aside className={`fixed top-0 left-0 h-screen ${sidebarWidthClass} bg-gradient-to-b from-blue-800 to-indigo-900 text-white flex flex-col z-10 transition-all duration-300 ease-in-out`}>
        <div className="flex items-center justify-between h-16 border-b border-blue-700 px-3">
          {!sidebarCollapsed && (
            <h1 className="font-bold text-lg hidden lg:block">TT Incharge Portal</h1>
          )}
          {(sidebarCollapsed || window.innerWidth < 1024) && (
            <span className="font-bold text-xl mx-auto">TT</span>
          )}
          <button 
            onClick={toggleSidebar} 
            className="p-1 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white/50"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
          </button>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.path, item.label)}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start gap-3'} w-full px-3 py-3 rounded-lg text-left mb-2 transition
                ${activeSidebarItem === item.label 
                  ? 'bg-white/10 font-semibold' 
                  : 'hover:bg-white/5'}`}
              title={item.label}
            >
              <div>{item.icon}</div>
              {!sidebarCollapsed && <span className="hidden lg:block">{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content with margin to account for fixed sidebar */}
      <div className={`flex-1 flex flex-col ${mainMarginClass} transition-all duration-300 ease-in-out`}>
        {/* Top bar - Fixed position */}
        <header className={`fixed top-0 right-0 ${headerLeftClass} bg-white shadow flex items-center justify-between p-4 z-10 transition-all duration-300 ease-in-out`}>
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar}
              className="mr-2 md:hidden p-1 rounded hover:bg-gray-100"
              aria-label="Toggle sidebar"
            >
              <FiMenu size={20} />
            </button>
            <h2 className="text-xl font-semibold text-gray-800">Timetable Management</h2>
            <div className="relative semester-dropdown">
              <div 
                className="ml-4 flex items-center border rounded-lg px-3 py-1 cursor-pointer hover:bg-gray-50"
                onClick={() => setSemesterDropdownOpen(!semesterDropdownOpen)}
              >
                <span className="text-gray-600 mr-1">{selectedSemester}</span>
                {semesterDropdownOpen ? 
                  <FiChevronUp className="text-gray-500" /> : 
                  <FiChevronDown className="text-gray-500" />
                }
              </div>
              
              {semesterDropdownOpen && (
                <div className="absolute top-full left-4 mt-1 w-48 bg-white rounded-lg shadow-lg py-1 z-20">
                  {availableSemesters.map((semester) => (
                    <div
                      key={semester}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                        selectedSemester === semester ? 'bg-indigo-50 text-indigo-600' : ''
                      }`}
                      onClick={() => {
                        setSelectedSemester(semester);
                        setSemesterDropdownOpen(false);
                      }}
                    >
                      {semester}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Rest of the header content */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 rounded-full bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
              />
            </div>
            <div className="relative">
              <FiBell size={20} className="text-gray-500 cursor-pointer" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                5
              </span>
            </div>
            <div className="relative profile-dropdown">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <img
                  src="https://via.placeholder.com/40"
                  alt="Profile"
                  className="rounded-full h-10 w-10 object-cover border-2 border-indigo-500"
                />
                <div className="hidden md:block">
                  <p className="text-sm font-medium">Prof. James Wilson</p>
                  <p className="text-xs text-gray-500">TT Incharge, Computer Science</p>
                </div>
                {profileDropdownOpen ? 
                  <FiChevronUp className="text-gray-500" /> : 
                  <FiChevronDown className="text-gray-500" />
                }
              </div>
              
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-20">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium">Prof. James Wilson</p>
                    <p className="text-xs text-gray-500">james.wilson@example.com</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50"
                    >
                      <FiLogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content area with padding top to account for fixed header */}
        <main className="flex-1 p-6 pt-24">
          <Routes>
            <Route path="dashboard" element={<TTInchargeDashboard />} />
            <Route path="timetable-builder" element={<TimetableBuilder />} />
            <Route path="conflicts" element={<Conflicts />} />
            <Route path="rooms" element={<RoomAvailability />} />
            <Route path="faculty-timetable" element={<FacultyTimetable />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}