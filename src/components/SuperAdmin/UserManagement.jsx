import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiUser, FiUsers, FiShield, FiMail, FiAlertCircle } from 'react-icons/fi';
import { 
  getUsers, 
  getDepartments, 
  getRoles,
  createUser, 
  updateUser, 
  deleteUser,
  toggleUserStatus,
  sendPasswordReset,
  getInitials,
  getAvatarBg,
  getRoleBadgeColor
} from './services/UserManagement';
import { toast } from 'react-hot-toast';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    role: 'hod',
    department: '',
    active: true,
    canEditCommonCourses: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Get users from Appwrite
        const usersData = await getUsers();
        setUsers(usersData);
        
        // Get departments and roles
        setDepartments(getDepartments());
        setRoles(getRoles());
      } catch (error) {
        console.error('Error loading users:', error);
        toast.error('Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const openModal = (user = null) => {
    if (user) {
      setFormData({ 
        name: user.name, 
        email: user.email, 
        role: user.role,
        department: user.department,
        active: user.active,
        canEditCommonCourses: user.canEditCommonCourses || false
      });
      setEditingId(user.id);
      setEditingUserId(user.userId);
    } else {
      setFormData({ 
        name: '', 
        email: '', 
        role: 'hod',
        department: '',
        active: true,
        canEditCommonCourses: false
      });
      setEditingId(null);
      setEditingUserId(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingId) {
        // Update existing user
        const updatedUser = await updateUser(editingId, formData);
        setUsers(users.map(user => user.id === editingId ? updatedUser : user));
        toast.success('User updated successfully');
      } else {
        // Create new user
        const newUser = await createUser(formData);
        setUsers([...users, newUser]);
        toast.success('User created successfully');
      }
      
      closeModal();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'Failed to save user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id, userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await deleteUser(id, userId);
      setUsers(users.filter(user => user.id !== id));
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (id, active) => {
    setIsLoading(true);
    try {
      await toggleUserStatus(id, !active);
      setUsers(users.map(user => user.id === id ? {...user, active: !active} : user));
      toast.success(`User ${!active ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error(error.message || 'Failed to update user status');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (email) => {
    if (!window.confirm('Send password reset email to this user?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await sendPasswordReset(email);
      toast.success('Password reset email sent successfully');
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error(error.message || 'Failed to send password reset');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'superadmin': return <FiShield className="mr-1" />;
      case 'hod': return <FiShield className="mr-1" />;
      case 'tt_incharge': return <FiUsers className="mr-1" />;
      default: return null;
    }
  };

  const getRoleDisplayName = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj ? roleObj.label : role;
  };

  return (
    <div className="p-6 relative">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      {/* User Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-indigo-100 to-purple-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden md:table-cell">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden lg:table-cell">Access</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && !users.length ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No users found. Add your first user with the button below.
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <tr key={user.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-xs ${getAvatarBg(user.name)}`}>
                          {getInitials(user.name)}
                        </div>
                        <div className="ml-2">
                          <span className="text-sm font-medium text-gray-900">{user.name}</span>
                          <div className="text-xs text-gray-500 sm:hidden">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="text-sm text-gray-900">{user.email}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        <span className="hidden sm:inline">{getRoleIcon(user.role)}</span>
                        {getRoleDisplayName(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-sm text-gray-900">{user.department}</span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggleStatus(user.id, user.active)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {user.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      {user.role === 'hod' ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.canEditCommonCourses ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {user.canEditCommonCourses ? 'Yes' : 'No'}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end space-x-1">
                        <button 
                          onClick={() => handlePasswordReset(user.email)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Send password reset"
                        >
                          <FiMail size={16} />
                        </button>
                        <button 
                          onClick={() => openModal(user)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Edit user"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id, user.userId)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete user"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => openModal()}
        className="fixed bottom-8 right-8 p-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:scale-105 transition flex items-center"
        disabled={isLoading}
      >
        <FiPlus size={24} className="mr-1" />
        <span>Add New User</span>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-11/12 max-w-md animate-fade-in-up">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              {editingId ? 'Edit User' : 'Add New User'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Input */}
              <div className="relative">
                <input
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-400 focus:outline-none peer pt-6"
                  placeholder=" "
                />
                <label 
                  htmlFor="name"
                  className="absolute left-4 top-3 text-gray-500 text-sm transition-all peer-focus:top-1 peer-focus:text-xs peer-focus:text-indigo-500 peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-xs"
                >
                  Name
                </label>
              </div>

              {/* Email Input */}
              <div className="relative">
                <input
                  name="email"
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-400 focus:outline-none peer pt-6"
                  placeholder=" "
                />
                <label 
                  htmlFor="email"
                  className="absolute left-4 top-3 text-gray-500 text-sm transition-all peer-focus:top-1 peer-focus:text-xs peer-focus:text-indigo-500 peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-xs"
                >
                  Email
                </label>
              </div>

              {/* Password Note for Edit Mode */}
              {editingId && (
                <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                  <FiAlertCircle className="text-yellow-500 mr-2 flex-shrink-0" />
                  <span className="text-gray-700">
                    Password changes are handled via the reset password option.
                  </span>
                </div>
              )}

              {/* Role Dropdown */}
              <div className="relative">
                <select
                  name="role"
                  id="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-400 focus:outline-none appearance-none pt-6"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
                <label 
                  htmlFor="role"
                  className="absolute left-4 top-1 text-xs text-indigo-500"
                >
                  Role
                </label>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  {getRoleIcon(formData.role)}
                </div>
              </div>

              {/* Department Dropdown */}
              <div className="relative">
                <select
                  name="department"
                  id="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-400 focus:outline-none appearance-none pt-6"
                >
                  <option value="" disabled>Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <label 
                  htmlFor="department"
                  className="absolute left-4 top-1 text-xs text-indigo-500"
                >
                  Department
                </label>
              </div>

              {/* Active Status Toggle */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-full">
                <span className="text-sm font-medium text-gray-700">User Status</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="active"
                    checked={formData.active}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {formData.active ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </div>

              {/* Common Course Access Permission (only for HODs) */}
              {formData.role === 'hod' && (
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-full">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">Common Course Access</span>
                    <span className="text-xs text-gray-500">Allow editing courses in Common Department</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="canEditCommonCourses"
                      checked={formData.canEditCommonCourses}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {formData.canEditCommonCourses ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-100 transition flex items-center"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 transition flex items-center"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
