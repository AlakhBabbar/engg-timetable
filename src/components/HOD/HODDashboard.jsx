import React, { useState } from 'react';
import { FiBell, FiSearch, FiChevronDown, FiUsers, FiBook, FiCalendar } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { getSidebarItems, getDashboardMetrics, getRecentActivities, handleSidebarNavigation } from './services/HODDashboard';

export default function HODDashboard() {
  const [activeSidebarItem, setActiveSidebarItem] = useState('Dashboard');
  const navigate = useNavigate();
  
  // Get data from services
  const sidebarItems = getSidebarItems();
  const metrics = getDashboardMetrics();
  const recentActivities = getRecentActivities();

  const handleNavigation = (path, label) => {
    handleSidebarNavigation(navigate, path, label, setActiveSidebarItem);
  };

  // Render sidebar items with icon components (not JSX elements)
  const renderSidebarIcon = (item) => {
    const IconComponent = item.icon;
    return <IconComponent size={item.iconSize} />;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1 flex flex-col">
        {/* Main area */}
        <main className="flex-1 p-6 space-y-8">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl p-6 bg-white shadow-md hover:shadow-xl transition flex items-center space-x-4">
              <div className="bg-teal-100 p-3 rounded-full">
                <FiUsers size={24} className="text-teal-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-700">Faculty Assigned</h2>
                <p className="text-3xl font-bold text-teal-600">{metrics.faculty.total}</p>
                <p className="text-sm text-gray-500">{metrics.faculty.newThisWeek} new this week</p>
              </div>
            </div>

            <div className="rounded-2xl p-6 bg-white shadow-md hover:shadow-xl transition flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <FiBook size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-700">Total Courses</h2>
                <p className="text-3xl font-bold text-blue-600">{metrics.courses.total}</p>
                <p className="text-sm text-gray-500">{metrics.courses.pendingApproval} pending approval</p>
              </div>
            </div>

            <div className="rounded-2xl p-6 bg-white shadow-md hover:shadow-xl transition flex items-center space-x-4">
              <div className="bg-indigo-100 p-3 rounded-full">
                <FiCalendar size={24} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-700">Timetable Status</h2>
                <p className="text-xl font-bold text-indigo-600">{metrics.timetable.status}</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${metrics.timetable.completionPercentage}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button className="px-6 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-teal-700 text-white font-semibold hover:opacity-90 transition shadow-lg flex items-center justify-center gap-3 group">
                <span className="text-2xl group-hover:scale-110 transition">📘</span>
                <span>Assign Faculty</span>
              </button>

              <button
                onClick={() => navigate('/timetable')}
                className="px-6 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold hover:opacity-90 transition shadow-lg flex items-center justify-center gap-3 group"
              >
                <span className="text-2xl group-hover:scale-110 transition">🗂</span>
                <span>View Timetable</span>
              </button>

              <button className="px-6 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-semibold hover:opacity-90 transition shadow-lg flex items-center justify-center gap-3 group">
                <span className="text-2xl group-hover:scale-110 transition">➕</span>
                <span>Add Course</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Recent Activity</h2>
              <button className="text-sm text-teal-600 hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition">
                  <div className={`w-2 h-2 rounded-full ${activity.colorClass}`}></div>
                  <div className="flex-1">
                    <p className="text-gray-800">{activity.description}</p>
                    <p className="text-xs text-gray-500">{activity.timeAgo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}