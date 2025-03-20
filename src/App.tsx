import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ChatProvider } from "./contexts/ChatContext";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Dashboard from "./components/Dashboard";
import ProfileManagement from "./components/ProfileManagement";
import PrivateRoute from "./components/PrivateRoute";
import RoleBasedRoute from "./components/RoleBasedRoute";
import AdminDashboard from "./components/AdminDashboard";
import LecturerDashboard from "./components/LecturerDashboard";
import StudentDashboard from "./components/StudentDashboard";
import Unauthorized from "./components/Unauthorized";
import Notification from "./components/Notification";
import ConfirmDialog from "./components/ConfirmDialog";
import AutomatedNotification from "./components/AutomatedNotification";

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <ChatProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Role-based routes */}
              <Route
                path="/admin"
                element={
                  <RoleBasedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </RoleBasedRoute>
                }
              />

              <Route
                path="/lecturer"
                element={
                  <RoleBasedRoute allowedRoles={["lecturer"]}>
                    <LecturerDashboard />
                  </RoleBasedRoute>
                }
              />

              <Route
                path="/student"
                element={
                  <RoleBasedRoute allowedRoles={["student"]}>
                    <StudentDashboard />
                  </RoleBasedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <RoleBasedRoute allowedRoles={["admin", "lecturer", "student"]}>
                    <ProfileManagement />
                  </RoleBasedRoute>
                }
              />

              {/* Legacy dashboard route - will redirect based on role */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Default redirect to login */}
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
            <Notification />
            <ConfirmDialog />
            <AutomatedNotification />
          </ChatProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
