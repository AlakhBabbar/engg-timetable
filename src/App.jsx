import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import ForgotPassword from './components/ForgotPassword'
import SuperAdminDashboard from './components/SuperAdmin/SuperAdminDashboard'
import UserManagement from './components/SuperAdmin/UserManagement'
import SuperAdminLayout from './components/SuperAdmin/SuperAdminLayout'
import DepartmentManagement from './components/SuperAdmin/DepartmentManagement'
import RoomManagement from './components/SuperAdmin/RoomManagement'
import ReportsAnalytics from './components/SuperAdmin/ReportsAnalytics'
import SettingsSemester from './components/SuperAdmin/SettingsSemester'
import HODDashboard from './components/HOD/HODDashboard'
import CourseManagement from './components/HOD/CourseManagement'
import HODLayout from './components/HOD/HODLayout'
import FacultyAssignment from './components/HOD/FacultyAssignment'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route element={<HODLayout />}>
          <Route path="/hod-dashboard" element={<HODDashboard />} />
          <Route path="/courses" element={<CourseManagement />} />
          <Route path="/faculty" element={<FacultyAssignment />} />
          <Route path="/hod-reports" element={<div>Reports</div>} />
          <Route path="/timetable" element={<div>Timetable</div>} />
        </Route>

        <Route path="/" element={<SuperAdminLayout />}>
          <Route path="admin-dashboard" element={<SuperAdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="departments" element={<DepartmentManagement />} />
          <Route path="rooms" element={<RoomManagement />} />
          <Route path="superadmin-reports" element={<ReportsAnalytics />} />
          <Route path="settings" element={<SettingsSemester />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
