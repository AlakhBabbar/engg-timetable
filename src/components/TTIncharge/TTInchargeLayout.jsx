import React, { useContext } from 'react';
import { Outlet } from 'react-router-dom';
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
  FiLogOut
} from 'react-icons/fi';
import { AuthContext } from '../../App';
import { useTTInchargeLayout } from './services/TTInchargeLayout';
import SemesterDropdown from '../common/SemesterDropdown';

export default function TTInchargeLayout() {
  const { user, setUser } = useContext(AuthContext);
  
  const {
    activeSidebarItem,
    profileDropdownOpen,
    setProfileDropdownOpen,
    sidebarCollapsed,
    handleLogout,
    toggleSidebar,
    sidebarItems,
    handleNavigation,
    getLayoutClasses
  } = useTTInchargeLayout(setUser);

  // Get layout classes
  const { sidebarWidthClass, mainMarginClass, headerLeftClass } = getLayoutClasses();

  // Map icon strings to actual icon components
  const getIconComponent = (iconName, size = 18) => {
    switch(iconName) {
      case 'FiGrid': return <FiGrid size={size} />;
      case 'FiCalendar': return <FiCalendar size={size} />;
      case 'FiAlertCircle': return <FiAlertCircle size={size} />;
      case 'FiHome': return <FiHome size={size} />;
      case 'FiUsers': return <FiUsers size={size} />;
      default: return <FiGrid size={size} />;
    }
  };

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
              <div>{getIconComponent(item.icon)}</div>
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
            <SemesterDropdown 
              variant="header" 
              showOnlyActive={true}
            />
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
                  <p className="text-sm font-medium">{user?.name || 'TT Incharge'}</p>
                  <p className="text-xs text-gray-500">{user?.department || 'Department'}</p>
                </div>
                {profileDropdownOpen ? 
                  <FiChevronUp className="text-gray-500" /> : 
                  <FiChevronDown className="text-gray-500" />
                }
              </div>
              
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-20">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium">{user?.name || 'TT Incharge'}</p>
                    <p className="text-xs text-gray-500">{user?.email || 'tt.incharge@example.com'}</p>
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}