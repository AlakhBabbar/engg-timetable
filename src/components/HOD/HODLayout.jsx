// filepath: /Users/nihalsarandasduggirala/Downloads/engg-timetable/src/components/HODLayout.jsx
import React, { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { FiBell, FiSearch, FiChevronDown, FiChevronUp, FiLogOut } from 'react-icons/fi';
import { AuthContext } from '../../App';
import { useHODLayout } from './services/HODLayout';
import RateLimitStatusMonitor from '../common/RateLimitStatusMonitor';

export default function HODLayout() {
  const { user, setUser } = useContext(AuthContext);
  const {
    activeSidebarItem,
    semesterDropdownOpen,
    profileDropdownOpen,
    selectedSemester,
    availableSemesters,
    sidebarItems,
    handleNavigation,
    handleLogout,
    toggleSemesterDropdown,
    toggleProfileDropdown,
    selectSemester
  } = useHODLayout(user, setUser);

  // Render sidebar icon component
  const renderIcon = (item) => {
    const IconComponent = item.icon;
    return <IconComponent size={item.iconSize} />;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left sidebar - Fixed */}
      <aside className="w-20 lg:w-64 bg-gradient-to-b from-teal-800 to-blue-900 text-white flex flex-col fixed h-full transition-all duration-300 z-10">
        <div className="flex items-center justify-center h-16 border-b border-teal-700">
          <h1 className="font-bold text-lg hidden lg:block">HOD Portal</h1>
          <span className="block lg:hidden font-bold text-xl">H</span>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.path, item.label)}
              className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left mb-2 transition
                ${activeSidebarItem === item.label 
                  ? 'bg-white/10 font-semibold' 
                  : 'hover:bg-white/5'}`}
            >
              <div>{renderIcon(item)}</div>
              <span className="hidden lg:block">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col ml-20 lg:ml-64">
        {/* Top bar - Fixed */}
        <header className="bg-white shadow flex items-center justify-between p-4 fixed top-0 right-0 left-20 lg:left-64 z-10">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-800">{user?.department || 'Department'}</h2>
            <div className="relative semester-dropdown">
              <div 
                className="ml-4 flex items-center border rounded-lg px-3 py-1 cursor-pointer hover:bg-gray-50"
                onClick={toggleSemesterDropdown}
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
                        selectedSemester === semester ? 'bg-teal-50 text-teal-600' : ''
                      }`}
                      onClick={() => selectSemester(semester)}
                    >
                      {semester}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 rounded-full bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-48"
              />
            </div>
            <div className="relative">
              <FiBell size={20} className="text-gray-500 cursor-pointer" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                3
              </span>
            </div>
            <div className="relative profile-dropdown">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={toggleProfileDropdown}
              >
                <img
                  src="https://via.placeholder.com/40"
                  alt="Profile"
                  className="rounded-full h-10 w-10 object-cover border-2 border-teal-500"
                />
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{user?.name || 'HOD'}</p>
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
                    <p className="text-sm font-medium">{user?.name || 'HOD'}</p>
                    <p className="text-xs text-gray-500">{user?.email || 'hod@example.com'}</p>
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

        {/* Main content area with padding for fixed header */}
        <main className="flex-1 p-6 mt-16">
          <Outlet />
        </main>
      </div>
      
      {/* Rate Limit Status Monitor */}
      <RateLimitStatusMonitor />
    </div>
  );
}