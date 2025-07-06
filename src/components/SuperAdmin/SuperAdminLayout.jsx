import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { FiMenu, FiBell, FiSearch, FiUser, FiUsers, FiGrid, FiLayers, FiHome, FiFileText, FiSettings, FiBookOpen, FiLogOut, FiChevronDown, FiChevronUp, FiBook } from 'react-icons/fi';
import { BsBuilding } from 'react-icons/bs';
import { auth, signOut, onAuthStateChanged } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import RateLimitStatusMonitor from '../common/RateLimitStatusMonitor';
import SemesterDropdown from '../common/SemesterDropdown';

const navItems = [
  { label: 'Dashboard', icon: <FiGrid />, path: '/admin/dashboard' },
  { label: 'Users', icon: <FiUsers />, path: '/admin/users' },
  { label: 'Faculty', icon: <FiUser />, path: '/admin/faculty' },
  { label: 'Courses', icon: <FiBook />, path: '/admin/courses' },
  { label: 'Colleges', icon: <BsBuilding />, path: '/admin/colleges' },
  { label: 'Departments', icon: <FiLayers />, path: '/admin/departments' },
  { label: 'Rooms', icon: <FiHome />, path: '/admin/rooms' },
  { label: 'Reports', icon: <FiFileText />, path: '/admin/reports' },
  { label: 'Settings', icon: <FiSettings />, path: '/admin/settings' },
];

export default function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check authentication state on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Get profile data to get the name
        const userProfileRef = doc(db, 'profiles', currentUser.uid);
        try {
          const userProfileSnap = await getDoc(userProfileRef);
          if (userProfileSnap.exists()) {
            // Merge Firebase user with profile data
            setUser({
              ...currentUser,
              name: userProfileSnap.data().name
            });
          } else {
            setUser(currentUser);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUser(currentUser);
        }
      } else {
        // Redirect to login page if not authenticated
        navigate('/login');
      }
      setLoading(false);
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [navigate]);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Navigate will happen automatically due to the onAuthStateChanged listener
    } catch (error) {
      console.error('Logout failed:', error);
      // Show error message to user
      alert('Logout failed. Please try again.');
    }
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const closeDropdown = (e) => {
      if (!e.target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', closeDropdown);
    return () => document.removeEventListener('mousedown', closeDropdown);
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Fixed Sidebar */}
      <aside className={`transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-20'} bg-white shadow-xl flex flex-col rounded-tr-3xl rounded-br-3xl fixed left-0 top-0 h-full z-30`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className={`font-bold text-lg transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>Admin</h1>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            <FiMenu size={20} />
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition ${isActive ? 'bg-indigo-100 text-indigo-600 font-semibold' : 'hover:bg-indigo-50 text-gray-700'}`}
              >
                {item.icon}
                <span className={`${sidebarOpen ? 'block' : 'hidden'}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className={`flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-56' : 'ml-20'} flex-1 h-full`}>
        {/* Fixed Header */}
        <header className="flex items-center justify-between bg-white shadow p-4 rounded-bl-3xl fixed top-0 right-0 z-20 transition-all duration-300" style={{left: sidebarOpen ? '224px' : '80px'}}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-full">
              <FiSearch />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent outline-none w-32 md:w-64"
              />
            </div>
            <SemesterDropdown 
              variant="header" 
              showOnlyActive={true}
            />
          </div>
          <div className="flex items-center gap-4">
            <FiBell size={20} className="cursor-pointer" />
            <div className="relative profile-dropdown">
              <button 
                className="flex items-center gap-2"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <img src={user?.photoURL || "https://via.placeholder.com/30"} alt="avatar" className="rounded-full" />
                <span className="hidden md:block">{user?.name || user?.displayName || 'Admin'}</span>
                {profileDropdownOpen ? 
                  <FiChevronUp className="text-gray-500" /> : 
                  <FiChevronDown className="text-gray-500" />
                }
              </button>
              
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-30">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium">{user?.name || user?.displayName || 'Admin User'}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
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

        {/* Scrollable Main Content */}
        <main className="flex-1 p-6 mt-20 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      
      {/* Rate Limit Status Monitor */}
      <RateLimitStatusMonitor />
    </div>
  );
}
