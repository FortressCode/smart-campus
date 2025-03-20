import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { useConfirm } from "../contexts/ConfirmContext";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  setDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
// Comment out the Chart.js imports temporarily to isolate the issue
// import { Chart } from 'chart.js/auto';
// import { Bar, Pie, Line } from 'react-chartjs-2';

// Add import for the chart components
import {
  DepartmentChart,
  TimelineChart,
  RoleChart,
  FeedbackChart,
} from "./EventCharts";

// Add import for ChartWrapper
import ChartWrapper from "./ChartWrapper";

// Add import for the new ScheduleCalendar component
import ScheduleCalendar from "./ScheduleCalendar";

// Import CourseManagement component
import CourseManagement from "./CourseManagement";

// Import the Schedule interface instead of defining it locally
import { Schedule } from "../interfaces/Schedule";

// Import EnrollmentManagement component
import EnrollmentManagement from "./EnrollmentManagement";

// Import UserManagement component
import UserManagement from "./UserManagement";

// Import ModuleManagement component
import ModuleManagement from "./ModuleManagement";

// Import Course interface
import { Course } from "../interfaces/Course";

// Import Module interface
import { Module } from "../interfaces/Module";

// Import User interface
import { User } from "../interfaces/User";

export default function AdminDashboard() {
  const {
    currentUser,
    userData,
    logout,
    adminCreateUser,
    updateSecuritySettings,
    getSessionTimeout,
    validatePasswordStrength,
  } = useAuth();
  const { showNotification } = useNotification();
  const { showConfirm } = useConfirm();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [roleUpdated, setRoleUpdated] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Schedule management state
  const [scheduleView, setScheduleView] = useState("table"); // "table" or "calendar"
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);

  // Form states for adding/editing schedules
  const [moduleTitle, setModuleTitle] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [classroomNumber, setClassroomNumber] = useState("");
  const [lecturerName, setLecturerName] = useState("");
  const [branch, setBranch] = useState("Colombo");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("Monday");
  const [isRecurring, setIsRecurring] = useState(false);

  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("student");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState("");

  // Delete User Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Logo URL for collapsed sidebar
  const logoUrl =
    "https://png.pngtree.com/png-vector/20220922/ourmid/pngtree-letter-v-icon-png-image_6210719.png";

  // Add security settings state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [strongPasswordEnabled, setStrongPasswordEnabled] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(30);

  // Event management state
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);

  // Form states for adding/editing events
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventOrganizer, setEventOrganizer] = useState("");
  const [eventPartnership, setEventPartnership] = useState("");
  const [eventCategory, setEventCategory] = useState("Academic");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventExpectedParticipants, setEventExpectedParticipants] = useState(0);
  const [eventActualParticipants, setEventActualParticipants] = useState(0);
  const [eventSuccessRate, setEventSuccessRate] = useState(0);
  const [eventStatus, setEventStatus] = useState("Upcoming");

  // Add new state for demographics modal
  const [showDemographicsModal, setShowDemographicsModal] = useState(false);
  const [selectedEventForDemographics, setSelectedEventForDemographics] =
    useState<any>(null);

  // Academic planning state
  const [activeAcademicTab, setActiveAcademicTab] = useState("dashboard");

  // Function to fetch users from Firestore
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersCollection = collection(db, "users");
      const userSnapshot = await getDocs(usersCollection);
      const userList = userSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(userList);
      setError("");
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Load existing security settings on component mount
  useEffect(() => {
    async function loadSecuritySettings() {
      try {
        // Get session timeout from AuthContext
        const timeout = await getSessionTimeout();
        setSessionTimeout(timeout);

        // Get other security settings from Firestore
        const securitySettingsRef = doc(db, "settings", "security");
        const unsubscribe = onSnapshot(securitySettingsRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setTwoFactorEnabled(data.enableTwoFactor !== false);
            setStrongPasswordEnabled(data.enforceStrongPassword !== false);
            setSessionTimeout(data.sessionTimeoutMinutes || 30);
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error loading security settings:", error);
      }
    }

    loadSecuritySettings();
  }, [getSessionTimeout]);

  // Handle role change
  const handleRoleChange = async (userId: string, role: string) => {
    try {
      setError("");
      setSuccess("");

      // Update role in Firestore
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { role });

      // Update local state
      setUsers(
        users.map((user) => (user.id === userId ? { ...user, role } : user))
      );

      showNotification(`User role updated successfully to ${role}`);

      // Reset editing state after successful update
      setEditingUser(null);
    } catch (err) {
      console.error("Error updating user role:", err);
      showNotification("Failed to update user role");
    }
  };

  const handleLogout = async () => {
    showConfirm(
      {
        title: "Confirm Logout",
        message: "Are you sure you want to log out?",
        confirmLabel: "Logout",
        cancelLabel: "Cancel",
        variant: "warning",
        icon: "bi-box-arrow-right",
      },
      async () => {
        try {
          await logout();
          showNotification("Successfully logged out");
          navigate("/login");
        } catch (err) {
          console.error("Error logging out:", err);
          showNotification("Failed to log out. Please try again.");
        }
      }
    );
  };

  // Function to toggle sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Function to toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
  };

  // Render different sections based on activeSection
  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return renderDashboardSection();
      case "users":
        return renderUserManagementSection();
      case "academic":
        return renderAcademicSection();
      case "resources":
        return renderResourcesSection();
      case "settings":
        return renderSettingsSection();
      case "schedules":
        return renderSchedulesSection();
      case "events":
        return renderEventsSection();
      default:
        return renderDashboardSection();
    }
  };

  // Dashboard section (system overview)
  const renderDashboardSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-speedometer2"></i>
        Dashboard Overview
      </div>

      {/* System Overview Section */}
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="dashboard-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Total Users</h5>
              <div className="bg-primary bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-people fs-4 text-primary"></i>
              </div>
            </div>
            <h2 className="display-5 fw-bold mb-0">{users.length}</h2>
            <p className="text-muted mt-2">Registered accounts</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="dashboard-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Lecturers</h5>
              <div className="bg-success bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-mortarboard fs-4 text-success"></i>
              </div>
            </div>
            <h2 className="display-5 fw-bold mb-0">
              {users.filter((user) => user.role === "lecturer").length}
            </h2>
            <p className="text-muted mt-2">Teaching staff</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="dashboard-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Students</h5>
              <div className="bg-warning bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-person-badge fs-4 text-warning"></i>
              </div>
            </div>
            <h2 className="display-5 fw-bold mb-0">
              {users.filter((user) => user.role === "student").length}
            </h2>
            <p className="text-muted mt-2">Enrolled students</p>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="dashboard-card h-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0">Recent Activities</h5>
              <div>
                <select className="form-select form-select-sm">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>This semester</option>
                </select>
              </div>
            </div>

            <div className="list-group">
              <div className="list-group-item list-group-item-action border-0 px-0">
                <div className="d-flex w-100 justify-content-between">
                  <h6 className="mb-1">User Registration Spike</h6>
                  <small className="text-muted">2 hours ago</small>
                </div>
                <p className="mb-1">
                  15 new users registered in the last hour. Unusual activity
                  detected.
                </p>
              </div>
              <div className="list-group-item list-group-item-action border-0 px-0">
                <div className="d-flex w-100 justify-content-between">
                  <h6 className="mb-1">System Maintenance Scheduled</h6>
                  <small className="text-muted">1 day ago</small>
                </div>
                <p className="mb-1">
                  Maintenance scheduled for May 12th at 2:00 AM. Expected
                  downtime: 30 minutes.
                </p>
              </div>
              <div className="list-group-item list-group-item-action border-0 px-0">
                <div className="d-flex w-100 justify-content-between">
                  <h6 className="mb-1">New Course Materials Uploaded</h6>
                  <small className="text-muted">3 days ago</small>
                </div>
                <p className="mb-1">
                  12 new course materials were uploaded by lecturers.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="dashboard-card h-100">
            <h5 className="mb-4">Quick Actions</h5>
            <div className="list-group">
              <button
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                onClick={() => setActiveSection("users")}
              >
                <div>
                  <i className="bi bi-person-plus me-2 text-primary"></i>
                  Manage Users
                </div>
                <i className="bi bi-chevron-right"></i>
              </button>
              <button
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                onClick={() => setActiveSection("settings")}
              >
                <div>
                  <i className="bi bi-gear me-2 text-primary"></i>
                  System Settings
                </div>
                <i className="bi bi-chevron-right"></i>
              </button>
              <button className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <div>
                  <i className="bi bi-shield-lock me-2 text-primary"></i>
                  Security Controls
                </div>
                <i className="bi bi-chevron-right"></i>
              </button>
              <button className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <div>
                  <i className="bi bi-envelope me-2 text-primary"></i>
                  Send Announcement
                </div>
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // User Management Section
  const renderUserManagementSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-people"></i>
        User Management
      </div>

      {/* Success message */}
      {success && (
        <div
          className="alert alert-success alert-dismissible fade show"
          role="alert"
        >
          {success}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccess("")}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          className="alert alert-danger alert-dismissible fade show"
          role="alert"
        >
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* User Management Section */}
      <div className="row">
        <div className="col-12">
          <div className="dashboard-card">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0">All Users</h5>
              <div>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setShowAddUserModal(true)}
                >
                  <i className="bi bi-person-plus me-1"></i> Add New User
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted">Loading users...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Email</th>
                      <th scope="col">Role</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>
                          {editingUser === user.id ? (
                            <select
                              className="form-select form-select-sm"
                              value={selectedRole}
                              onChange={(e) => setSelectedRole(e.target.value)}
                            >
                              <option value="student">Student</option>
                              <option value="lecturer">Lecturer</option>
                              <option value="admin">Administrator</option>
                            </select>
                          ) : (
                            <span
                              className={`badge ${
                                user.role === "admin"
                                  ? "bg-danger"
                                  : user.role === "lecturer"
                                  ? "bg-success"
                                  : "bg-primary"
                              }`}
                            >
                              {user.role === "admin"
                                ? "Administrator"
                                : user.role === "lecturer"
                                ? "Lecturer"
                                : "Student"}
                            </span>
                          )}
                        </td>
                        <td>
                          {editingUser === user.id ? (
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-primary"
                                onClick={() =>
                                  handleRoleChange(user.id, selectedRole)
                                }
                              >
                                Save
                              </button>
                              <button
                                className="btn btn-outline-secondary"
                                onClick={() => setEditingUser(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => {
                                  setEditingUser(user.id);
                                  setSelectedRole(user.role);
                                }}
                              >
                                <i className="bi bi-pencil me-1"></i> Edit
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => handleDeleteUser(user)}
                              >
                                <i className="bi bi-trash me-1"></i> Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New User</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowAddUserModal(false);
                    setAddUserError("");
                  }}
                  aria-label="Close"
                ></button>
              </div>
              <form onSubmit={handleAddUser}>
                <div className="modal-body">
                  {addUserError && (
                    <div className="alert alert-danger" role="alert">
                      {addUserError}
                    </div>
                  )}
                  <div className="mb-3">
                    <label htmlFor="newUserName" className="form-label">
                      Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="newUserName"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newUserEmail" className="form-label">
                      Email
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="newUserEmail"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newUserPassword" className="form-label">
                      Password
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="newUserPassword"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      required
                    />
                    <div className="form-text">
                      {strongPasswordEnabled
                        ? "Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters."
                        : "Password must be at least 6 characters."}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newUserRole" className="form-label">
                      Role
                    </label>
                    <select
                      className="form-select"
                      id="newUserRole"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      required
                    >
                      <option value="student">Student</option>
                      <option value="lecturer">Lecturer</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddUserModal(false);
                      setAddUserError("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isAddingUser}
                  >
                    {isAddingUser ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Adding...
                      </>
                    ) : (
                      "Add User"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete the user:{" "}
                  <strong>{userToDelete.name}</strong>?
                </p>
                <p className="text-danger">
                  <small>This action cannot be undone.</small>
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteUserConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Deleting...
                    </>
                  ) : (
                    "Delete User"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Academic Planning Section
  const renderAcademicSection = () => {
    // Check if we're showing course management
    if (activeAcademicTab === "courses") {
      return (
        <div className="slide-in section-content">
          <div className="section-title mb-4 d-flex justify-content-between align-items-center">
            <div>
              <i className="bi bi-book"></i>
              Course Management
            </div>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setActiveAcademicTab("dashboard")}
            >
              <i className="bi bi-arrow-left me-1"></i>
              Back to Academic Planning
            </button>
          </div>
          <CourseManagement />
        </div>
      );
    }

    // Check if we're showing enrollment management
    if (activeAcademicTab === "enrollments") {
      return (
        <div className="slide-in section-content">
          <div className="section-title mb-4 d-flex justify-content-between align-items-center">
            <div>
              <i className="bi bi-person-check"></i>
              Student Enrollment Management
            </div>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setActiveAcademicTab("dashboard")}
            >
              <i className="bi bi-arrow-left me-1"></i>
              Back to Academic Planning
            </button>
          </div>
          <EnrollmentManagement />
        </div>
      );
    }

    // Default academic section view with cards
    return (
      <div className="slide-in section-content">
        <div className="section-title mb-4">
          <i className="bi bi-calendar-check"></i>
          Academic Planning
        </div>

        <div className="row g-4">
          <div className="col-md-6">
            <div className="dashboard-card">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="mb-0">Course Management</h5>
                <div className="bg-primary bg-opacity-10 rounded-circle p-2">
                  <i className="bi bi-book fs-4 text-primary"></i>
                </div>
              </div>
              <p className="text-muted mb-3">
                Manage courses, syllabi, and academic content.
              </p>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setActiveAcademicTab("courses")}
              >
                Manage Courses
              </button>
            </div>
          </div>

          <div className="col-md-6">
            <div className="dashboard-card">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="mb-0">Student Enrollments</h5>
                <div className="bg-info bg-opacity-10 rounded-circle p-2">
                  <i className="bi bi-person-check fs-4 text-info"></i>
                </div>
              </div>
              <p className="text-muted mb-3">
                Manage student enrollments in courses.
              </p>
              <button
                className="btn btn-sm btn-outline-info"
                onClick={() => setActiveAcademicTab("enrollments")}
              >
                Manage Enrollments
              </button>
            </div>
          </div>

          <div className="col-md-6">
            <div className="dashboard-card">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="mb-0">Exams</h5>
                <div className="bg-warning bg-opacity-10 rounded-circle p-2">
                  <i className="bi bi-journal-check fs-4 text-warning"></i>
                </div>
              </div>
              <p className="text-muted mb-3">
                Schedule and manage examinations.
              </p>
              <button className="btn btn-sm btn-outline-warning">
                Exam Schedule
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Resources Section
  const renderResourcesSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-building"></i>
        Resource Management
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="dashboard-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Classrooms</h5>
              <div className="bg-primary bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-door-open fs-4 text-primary"></i>
              </div>
            </div>
            <p className="text-muted mb-3">
              Manage classroom availability and assignments.
            </p>
            <button className="btn btn-sm btn-outline-primary">
              View Classrooms
            </button>
          </div>
        </div>

        <div className="col-md-6">
          <div className="dashboard-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Equipment</h5>
              <div className="bg-success bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-laptop fs-4 text-success"></i>
              </div>
            </div>
            <p className="text-muted mb-3">
              Track and manage educational equipment.
            </p>
            <button className="btn btn-sm btn-outline-success">
              Equipment Inventory
            </button>
          </div>
        </div>

        <div className="col-md-6">
          <div className="dashboard-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Libraries</h5>
              <div className="bg-warning bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-book-half fs-4 text-warning"></i>
              </div>
            </div>
            <p className="text-muted mb-3">
              Manage library resources and materials.
            </p>
            <button className="btn btn-sm btn-outline-warning">
              Library Management
            </button>
          </div>
        </div>

        <div className="col-md-6">
          <div className="dashboard-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Facilities</h5>
              <div className="bg-danger bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-house-door fs-4 text-danger"></i>
              </div>
            </div>
            <p className="text-muted mb-3">
              Campus facilities management and maintenance.
            </p>
            <button className="btn btn-sm btn-outline-danger">
              Facility Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Settings Section
  const renderSettingsSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-gear"></i>
        System Settings
      </div>

      <div className="dashboard-card mb-4">
        <h5 className="mb-4">General Settings</h5>
        <div className="mb-3">
          <label className="form-label">System Name</label>
          <input
            type="text"
            className="form-control"
            defaultValue="Smart Campus Management System"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Institution Name</label>
          <input
            type="text"
            className="form-control"
            defaultValue="Vertex University"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Academic Year</label>
          <select className="form-select">
            <option>2023-2024</option>
            <option>2024-2025</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">System Theme</label>
          <select className="form-select">
            <option>Light</option>
            <option>Dark</option>
            <option>System Default</option>
          </select>
        </div>
        <button className="btn btn-primary">Save Settings</button>
      </div>

      <div className="dashboard-card">
        <h5 className="mb-4">Security Settings</h5>
        <div className="mb-3">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="twoFactorAuth"
              checked={twoFactorEnabled}
              onChange={(e) => setTwoFactorEnabled(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="twoFactorAuth">
              Enable Two-Factor Authentication
            </label>
          </div>
        </div>
        <div className="mb-3">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="passwordPolicy"
              checked={strongPasswordEnabled}
              onChange={(e) => setStrongPasswordEnabled(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="passwordPolicy">
              Enforce Strong Password Policy
            </label>
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label">Session Timeout (minutes)</label>
          <input
            type="number"
            className="form-control"
            value={sessionTimeout}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              // Ensure timeout is at least 1 minute
              setSessionTimeout(value < 1 ? 1 : value);
            }}
            min="1"
            max="480"
          />
          <small className="text-muted">
            User will be automatically logged out after this period of
            inactivity (minimum 1 minute).
          </small>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleUpdateSecuritySettings}
        >
          Update Security Settings
        </button>
      </div>
    </div>
  );

  // Schedules Section
  const renderSchedulesSection = () => {
    const daysOfWeek = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    return (
      <div className="slide-in section-content">
        <div className="section-title mb-4">
          <i className="bi bi-calendar3"></i>
          Class Schedules Management
        </div>

        <div className="row mb-4">
          <div className="col-12">
            <div className="dashboard-card">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="mb-0">Class Schedules</h5>
                  <p className="text-muted mb-0">
                    Manage classroom schedules across all branches
                  </p>
                </div>
                <div className="d-flex">
                  <div className="btn-group me-2">
                    <button
                      className={`btn ${
                        scheduleView === "table"
                          ? "btn-primary"
                          : "btn-outline-primary"
                      }`}
                      onClick={() => setScheduleView("table")}
                    >
                      <i className="bi bi-table me-2"></i>
                      Table
                    </button>
                    <button
                      className={`btn ${
                        scheduleView === "calendar"
                          ? "btn-primary"
                          : "btn-outline-primary"
                      }`}
                      onClick={() => setScheduleView("calendar")}
                    >
                      <i className="bi bi-calendar3 me-2"></i>
                      Calendar
                    </button>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsAddingSchedule(true)}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add Schedule
                  </button>
                </div>
              </div>

              {isAddingSchedule && (
                <div className="card mb-4">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      {editingSchedule ? "Edit Schedule" : "Add New Schedule"}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={resetScheduleForm}
                    ></button>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleScheduleFormSubmit}>
                      <div className="row mb-3">
                        <div className="col-md-6 mb-3 mb-md-0">
                          <label className="form-label">Module Title</label>
                          <input
                            type="text"
                            className="form-control"
                            value={moduleTitle}
                            onChange={(e) => setModuleTitle(e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Lecturer Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={lecturerName}
                            onChange={(e) => setLecturerName(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="row mb-3">
                        <div className="col-md-4 mb-3 mb-md-0">
                          <label className="form-label">Floor Number</label>
                          <input
                            type="text"
                            className="form-control"
                            value={floorNumber}
                            onChange={(e) => setFloorNumber(e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-md-4 mb-3 mb-md-0">
                          <label className="form-label">Classroom Number</label>
                          <input
                            type="text"
                            className="form-control"
                            value={classroomNumber}
                            onChange={(e) => setClassroomNumber(e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Branch</label>
                          <select
                            className="form-select"
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            required
                          >
                            <option value="Colombo">Colombo</option>
                            <option value="Kandy">Kandy</option>
                            <option value="Gampaha">Gampaha</option>
                            <option value="Negombo">Negombo</option>
                            <option value="Kurunegala">Kurunegala</option>
                          </select>
                        </div>
                      </div>

                      <div className="row mb-3">
                        <div className="col-md-4 mb-3 mb-md-0">
                          <label className="form-label">Start Time</label>
                          <input
                            type="time"
                            className="form-control"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            required
                          />
                          <small className="text-muted">
                            Format: HH:MM (24-hour)
                          </small>
                        </div>
                        <div className="col-md-4 mb-3 mb-md-0">
                          <label className="form-label">End Time</label>
                          <input
                            type="time"
                            className="form-control"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            required
                          />
                          <small className="text-muted">
                            Format: HH:MM (24-hour)
                          </small>
                        </div>
                        <div className="col-md-4">
                          <div className="form-check form-switch mt-4">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="recurringSwitch"
                              checked={isRecurring}
                              onChange={(e) => setIsRecurring(e.target.checked)}
                            />
                            <label
                              className="form-check-label"
                              htmlFor="recurringSwitch"
                            >
                              Recurring Schedule
                            </label>
                          </div>
                        </div>
                      </div>

                      {isRecurring ? (
                        <div className="mb-3">
                          <label className="form-label">Day of Week</label>
                          <select
                            className="form-select"
                            value={dayOfWeek}
                            onChange={(e) => setDayOfWeek(e.target.value)}
                            required
                          >
                            {daysOfWeek.map((day) => (
                              <option key={day} value={day}>
                                {day}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="mb-3">
                          <label className="form-label">Date</label>
                          <input
                            type="date"
                            className="form-control"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            required
                          />
                        </div>
                      )}

                      <div className="d-flex justify-content-end gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={resetScheduleForm}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                          {editingSchedule ? "Update Schedule" : "Add Schedule"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {schedulesLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading schedules...</p>
                </div>
              ) : scheduleView === "table" ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Module Title</th>
                        <th>Lecturer</th>
                        <th>Location</th>
                        <th>Branch</th>
                        <th>Time</th>
                        <th>Date/Recurring</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-4 text-muted"
                          >
                            No schedules found. Click "Add Schedule" to create
                            one.
                          </td>
                        </tr>
                      ) : (
                        schedules.map((schedule) => (
                          <tr key={schedule.id}>
                            <td>{schedule.moduleTitle}</td>
                            <td>{schedule.lecturerName}</td>
                            <td>
                              Floor {schedule.floorNumber}, Room{" "}
                              {schedule.classroomNumber}
                            </td>
                            <td>{schedule.branch}</td>
                            <td>
                              {schedule.startTime} - {schedule.endTime}
                            </td>
                            <td>
                              {schedule.isRecurring
                                ? `Every ${schedule.dayOfWeek}`
                                : new Date(schedule.date).toLocaleDateString()}
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button
                                  className="btn btn-outline-primary"
                                  onClick={() => handleEditSchedule(schedule)}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button
                                  className="btn btn-outline-danger"
                                  onClick={() =>
                                    handleDeleteSchedule(schedule.id)
                                  }
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                // Replace the custom calendar view with the new ScheduleCalendar component
                <ScheduleCalendar
                  schedules={schedules}
                  onEditSchedule={handleEditSchedule}
                  onDeleteSchedule={handleDeleteSchedule}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Reset schedule form
  const resetScheduleForm = () => {
    setModuleTitle("");
    setFloorNumber("");
    setClassroomNumber("");
    setLecturerName("");
    setBranch("Colombo");
    setStartTime("");
    setEndTime("");
    setScheduleDate("");
    setDayOfWeek("Monday");
    setIsRecurring(false);
    setEditingSchedule(null);
    setIsAddingSchedule(false);
  };

  // Handle edit schedule
  const handleEditSchedule = (schedule: Schedule) => {
    setModuleTitle(schedule.moduleTitle);
    setFloorNumber(schedule.floorNumber);
    setClassroomNumber(schedule.classroomNumber);
    setLecturerName(schedule.lecturerName);
    setBranch(schedule.branch);
    setStartTime(schedule.startTime);
    setEndTime(schedule.endTime);
    setScheduleDate(schedule.date);
    setDayOfWeek(schedule.dayOfWeek);
    setIsRecurring(schedule.isRecurring);
    setEditingSchedule(schedule.id);
    setIsAddingSchedule(true);
  };

  // Handle delete schedule
  const handleDeleteSchedule = async (scheduleId: string) => {
    showConfirm(
      {
        title: "Delete Schedule",
        message:
          "Are you sure you want to delete this schedule? This action cannot be undone.",
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        variant: "danger",
        icon: "bi-trash",
      },
      async () => {
        try {
          setSchedulesLoading(true);

          // Delete from Firestore
          const scheduleRef = doc(db, "schedules", scheduleId);
          await deleteDoc(scheduleRef);

          // Update UI
          setSchedules(
            schedules.filter((schedule) => schedule.id !== scheduleId)
          );
          showNotification("Schedule deleted successfully!");
        } catch (err) {
          console.error("Error deleting schedule:", err);
          showNotification("Failed to delete schedule. Please try again.");
        } finally {
          setSchedulesLoading(false);
        }
      }
    );
  };

  // Handle form submit for schedule
  const handleScheduleFormSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    // Show loading state
    setSchedulesLoading(true);
    setError("");
    setSuccess("");

    try {
      const currentTimestamp = new Date().toISOString();

      const scheduleData: Omit<Schedule, "id"> = {
        moduleTitle,
        floorNumber,
        classroomNumber,
        lecturerName,
        branch,
        startTime,
        endTime,
        date: scheduleDate,
        dayOfWeek,
        isRecurring,
        // Add createdAt and updatedAt fields for the Schedule interface
        createdAt: editingSchedule
          ? schedules.find((s) => s.id === editingSchedule)?.createdAt ||
            currentTimestamp
          : currentTimestamp,
        updatedAt: currentTimestamp,
      };

      if (editingSchedule) {
        // Update existing schedule in Firestore
        const scheduleRef = doc(db, "schedules", editingSchedule);
        await updateDoc(scheduleRef, {
          ...scheduleData,
          updatedAt: currentTimestamp, // Ensure updatedAt is set on Firestore update
        });

        // Update UI
        setSchedules(
          schedules.map((schedule) =>
            schedule.id === editingSchedule
              ? { ...scheduleData, id: editingSchedule }
              : schedule
          )
        );

        showNotification("Schedule updated successfully!");
      } else {
        // Add new schedule to Firestore
        const schedulesCollection = collection(db, "schedules");
        const docRef = await addDoc(schedulesCollection, {
          ...scheduleData,
          createdAt: currentTimestamp,
          updatedAt: currentTimestamp,
          createdBy: userData?.uid || "unknown",
        });

        // Update UI
        const newSchedule: Schedule = {
          ...scheduleData,
          id: docRef.id,
        };
        setSchedules([...schedules, newSchedule]);

        showNotification("New schedule added successfully!");
      }

      // Reset form
      resetScheduleForm();
    } catch (err) {
      console.error("Error saving schedule:", err);
      showNotification("Failed to save schedule. Please try again.");
    } finally {
      setSchedulesLoading(false);
    }
  };

  // Load schedules data from Firestore
  useEffect(() => {
    async function fetchSchedules() {
      try {
        setSchedulesLoading(true);
        const schedulesCollection = collection(db, "schedules");
        const scheduleSnapshot = await getDocs(schedulesCollection);

        const scheduleList: Schedule[] = scheduleSnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Schedule)
        );

        setSchedules(scheduleList);
      } catch (err) {
        console.error("Error fetching schedules:", err);
        setError("Failed to load schedules. Please try again.");
      } finally {
        setSchedulesLoading(false);
      }
    }

    fetchSchedules();
  }, []);

  // Handle adding a new user from admin dashboard
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (!newUserName || !newUserEmail || !newUserPassword) {
      setAddUserError("All fields are required");
      return;
    }

    // Validate password based on policy
    if (strongPasswordEnabled) {
      const passwordValidation = validatePasswordStrength(newUserPassword);
      if (!passwordValidation.isValid) {
        setAddUserError(passwordValidation.message);
        return;
      }
    } else if (newUserPassword.length < 6) {
      setAddUserError("Password must be at least 6 characters");
      return;
    }

    try {
      setIsAddingUser(true);
      setAddUserError("");

      // Call adminCreateUser function from AuthContext
      const result = await adminCreateUser(
        newUserEmail,
        newUserPassword,
        newUserName,
        newUserRole
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Refresh user list
      const usersCollection = collection(db, "users");
      const userSnapshot = await getDocs(usersCollection);
      const userList = userSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(userList);

      // Reset form and close modal
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("student");
      setShowAddUserModal(false);

      // Show success message
      setSuccess(`User ${newUserName} added successfully`);
      showNotification(`User ${newUserName} added successfully`);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err: any) {
      setAddUserError(err.message || "Failed to add user");
      console.error(err);
    } finally {
      setIsAddingUser(false);
    }
  };

  // Open delete confirmation modal
  const confirmDelete = (user: any) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  // Handle user deletion
  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    setError("");
    setSuccess("");

    try {
      // Delete user from Firestore
      await deleteDoc(doc(db, "users", userToDelete.id));

      // Update UI
      setUsers(users.filter((user) => user.id !== userToDelete.id));
      setShowDeleteModal(false);
      setUserToDelete(null);

      showNotification("User deleted successfully");
    } catch (err) {
      console.error("Error deleting user:", err);
      showNotification("Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler for updating security settings
  const handleUpdateSecuritySettings = async () => {
    try {
      await updateSecuritySettings(
        twoFactorEnabled,
        strongPasswordEnabled,
        sessionTimeout
      );

      // Only use notification, not both
      showNotification("Security settings updated successfully");

      // Scroll to top to make sure user sees the message
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error updating security settings:", error);
      showNotification("Error updating security settings");

      // Scroll to top to make sure user sees the error
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Event Management Section
  const renderEventsSection = () => {
    // Event categories
    const eventCategories = [
      "Academic",
      "Career Fair",
      "Conference",
      "Cultural",
      "Exhibition",
      "Fundraising",
      "Guest Lecture",
      "Orientation",
      "Sports",
      "Student Club",
      "Webinar",
      "Workshop",
      "Other",
    ];

    // Event status options
    const statusOptions = ["Upcoming", "Ongoing", "Completed", "Cancelled"];

    // Calculate event statistics
    const eventStats = {
      total: events.length,
      byStatus: {
        upcoming: events.filter((e) => e.status === "Upcoming").length,
        ongoing: events.filter((e) => e.status === "Ongoing").length,
        completed: events.filter((e) => e.status === "Completed").length,
        cancelled: events.filter((e) => e.status === "Cancelled").length,
      },
      byCategory: {} as Record<string, number>,
      participationRate: 0,
      upcomingCount: 0,
    };

    // Calculate events by category
    events.forEach((event) => {
      const category = event.category || "Other";
      eventStats.byCategory[category] =
        (eventStats.byCategory[category] || 0) + 1;
    });

    // Calculate average participation rate
    const completedEvents = events.filter((e) => e.status === "Completed");
    if (completedEvents.length > 0) {
      const totalExpected = completedEvents.reduce(
        (sum, event) => sum + (event.expectedParticipants || 0),
        0
      );
      const totalActual = completedEvents.reduce(
        (sum, event) => sum + (event.actualParticipants || 0),
        0
      );
      eventStats.participationRate =
        totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;
    }

    // Get upcoming events count
    eventStats.upcomingCount = events.filter(
      (e) => e.status === "Upcoming" && new Date(e.startDate) > new Date()
    ).length;

    // Get top 5 categories by event count
    const topCategories = Object.entries(eventStats.byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Add a function to handle demographics button click
    const handleShowDemographics = (event: any) => {
      setSelectedEventForDemographics(event);
      setShowDemographicsModal(true);
    };

    return (
      <div className="slide-in section-content">
        <div className="section-title mb-4">
          <i className="bi bi-calendar-event"></i>
          Event Management
        </div>

        {eventsLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading events...</p>
          </div>
        ) : (
          <>
            {/* Event Statistics Panel */}
            <div className="dashboard-card mb-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="mb-1">Event Analytics</h5>
                  <p className="text-muted small mb-0">
                    Overview of campus events and performance metrics
                  </p>
                </div>
                <div className="btn-group">
                  <button className="btn btn-light btn-sm">
                    <i className="bi bi-calendar-week me-1"></i>Week
                  </button>
                  <button className="btn btn-primary btn-sm">
                    <i className="bi bi-calendar-month me-1"></i>Month
                  </button>
                  <button className="btn btn-light btn-sm">
                    <i className="bi bi-calendar3 me-1"></i>Year
                  </button>
                </div>
              </div>

              <div className="row g-4">
                {/* Key Metrics Cards */}
                <div className="col-md-3">
                  <div className="card border-0 bg-white shadow-sm h-100">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center mb-3">
                        <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                          <i className="bi bi-calendar-check fs-4 text-primary"></i>
                        </div>
                        <div>
                          <h6 className="text-muted small mb-1">
                            Total Events
                          </h6>
                          <h3 className="mb-0 fw-bold">{eventStats.total}</h3>
                        </div>
                      </div>
                      <div className="progress" style={{ height: "4px" }}>
                        <div
                          className="progress-bar bg-primary"
                          style={{ width: "100%" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card border-0 bg-white shadow-sm h-100">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center mb-3">
                        <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                          <i className="bi bi-calendar-date fs-4 text-success"></i>
                        </div>
                        <div>
                          <h6 className="text-muted small mb-1">Upcoming</h6>
                          <h3 className="mb-0 fw-bold">
                            {eventStats.byStatus.upcoming}
                          </h3>
                        </div>
                      </div>
                      <div className="progress" style={{ height: "4px" }}>
                        <div
                          className="progress-bar bg-success"
                          style={{
                            width: `${
                              (eventStats.byStatus.upcoming /
                                eventStats.total) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card border-0 bg-white shadow-sm h-100">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center mb-3">
                        <div className="bg-info bg-opacity-10 rounded-circle p-3 me-3">
                          <i className="bi bi-calendar-event fs-4 text-info"></i>
                        </div>
                        <div>
                          <h6 className="text-muted small mb-1">Ongoing</h6>
                          <h3 className="mb-0 fw-bold">
                            {eventStats.byStatus.ongoing}
                          </h3>
                        </div>
                      </div>
                      <div className="progress" style={{ height: "4px" }}>
                        <div
                          className="progress-bar bg-info"
                          style={{
                            width: `${
                              (eventStats.byStatus.ongoing / eventStats.total) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card border-0 bg-white shadow-sm h-100">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center mb-3">
                        <div className="bg-secondary bg-opacity-10 rounded-circle p-3 me-3">
                          <i className="bi bi-calendar2-check fs-4 text-secondary"></i>
                        </div>
                        <div>
                          <h6 className="text-muted small mb-1">Completed</h6>
                          <h3 className="mb-0 fw-bold">
                            {eventStats.byStatus.completed}
                          </h3>
                        </div>
                      </div>
                      <div className="progress" style={{ height: "4px" }}>
                        <div
                          className="progress-bar bg-secondary"
                          style={{
                            width: `${
                              (eventStats.byStatus.completed /
                                eventStats.total) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="col-md-6">
                  <div className="card border-0 bg-white shadow-sm h-100">
                    <div className="card-body p-4">
                      <h6 className="text-muted mb-4">Performance Metrics</h6>
                      <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-muted">Attendance Rate</span>
                          <span className="fw-bold text-success">
                            {eventStats.participationRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="progress" style={{ height: "8px" }}>
                          <div
                            className="progress-bar bg-success"
                            role="progressbar"
                            style={{
                              width: `${Math.min(
                                eventStats.participationRate,
                                100
                              )}%`,
                            }}
                            aria-valuenow={Math.min(
                              eventStats.participationRate,
                              100
                            )}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-muted">Completion Rate</span>
                          <span className="fw-bold text-info">
                            {eventStats.total > 0
                              ? (
                                  (eventStats.byStatus.completed /
                                    eventStats.total) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="progress" style={{ height: "8px" }}>
                          <div
                            className="progress-bar bg-info"
                            role="progressbar"
                            style={{
                              width: `${
                                eventStats.total > 0
                                  ? (eventStats.byStatus.completed /
                                      eventStats.total) *
                                    100
                                  : 0
                              }%`,
                            }}
                            aria-valuenow={
                              eventStats.total > 0
                                ? (eventStats.byStatus.completed /
                                    eventStats.total) *
                                  100
                                : 0
                            }
                            aria-valuemin={0}
                            aria-valuemax={100}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Categories */}
                <div className="col-md-6">
                  <div className="card border-0 bg-white shadow-sm h-100">
                    <div className="card-body p-4">
                      <h6 className="text-muted mb-4">Top Event Categories</h6>
                      <div className="row">
                        {topCategories.map(([category, count]) => (
                          <div key={category} className="col-6 mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="text-muted small">
                                {category}
                              </span>
                              <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-2 py-1">
                                {count}
                              </span>
                            </div>
                            <div className="progress" style={{ height: "6px" }}>
                              <div
                                className="progress-bar bg-primary"
                                role="progressbar"
                                style={{
                                  width: `${(count / eventStats.total) * 100}%`,
                                }}
                                aria-valuenow={(count / eventStats.total) * 100}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Form - When Adding/Editing */}
            {isAddingEvent && (
              <div className="dashboard-card mb-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="mb-0">
                    {editingEvent ? "Edit Event" : "Create New Event"}
                  </h5>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={resetEventForm}
                  >
                    <i className="bi bi-x-lg"></i> Cancel
                  </button>
                </div>
                <form onSubmit={handleEventFormSubmit}>
                  <div className="row mb-3">
                    <div className="col-md-6 mb-3 mb-md-0">
                      <label className="form-label">Event Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Event Category *</label>
                      <select
                        className="form-select"
                        value={eventCategory}
                        onChange={(e) => setEventCategory(e.target.value)}
                        required
                      >
                        {eventCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6 mb-3 mb-md-0">
                      <label className="form-label">Location *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Organizer *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={eventOrganizer}
                        onChange={(e) => setEventOrganizer(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Partnership (if any)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={eventPartnership}
                      onChange={(e) => setEventPartnership(e.target.value)}
                      placeholder="External partners, sponsors, collaborators"
                    />
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-3 mb-3 mb-md-0">
                      <label className="form-label">Start Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={eventStartDate}
                        onChange={(e) => setEventStartDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-3 mb-3 mb-md-0">
                      <label className="form-label">End Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={eventEndDate}
                        onChange={(e) => setEventEndDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-3 mb-3 mb-md-0">
                      <label className="form-label">Start Time *</label>
                      <input
                        type="time"
                        className="form-control"
                        value={eventStartTime}
                        onChange={(e) => setEventStartTime(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">End Time *</label>
                      <input
                        type="time"
                        className="form-control"
                        value={eventEndTime}
                        onChange={(e) => setEventEndTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-4 mb-3 mb-md-0">
                      <label className="form-label">
                        Expected Participants
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={eventExpectedParticipants}
                        onChange={(e) =>
                          setEventExpectedParticipants(
                            parseInt(e.target.value) || 0
                          )
                        }
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="col-md-4 mb-3 mb-md-0">
                      <label className="form-label">Actual Participants</label>
                      <input
                        type="number"
                        className="form-control"
                        value={eventActualParticipants}
                        onChange={(e) =>
                          setEventActualParticipants(
                            parseInt(e.target.value) || 0
                          )
                        }
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={eventStatus}
                        onChange={(e) => setEventStatus(e.target.value)}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-12">
                      <label className="form-label">
                        Success Rate {eventSuccessRate}%
                      </label>
                      <input
                        type="range"
                        className="form-range"
                        min="0"
                        max="100"
                        step="1"
                        value={eventSuccessRate}
                        onChange={(e) =>
                          setEventSuccessRate(parseInt(e.target.value))
                        }
                      />
                      <div className="d-flex justify-content-between small text-muted">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-end mt-4">
                    <button
                      type="button"
                      className="btn btn-outline-secondary me-2"
                      onClick={resetEventForm}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingEvent ? "Update Event" : "Create Event"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Events List Table */}
            <div className="dashboard-card">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="mb-0">Campus Events</h5>
                  <p className="text-muted mb-0">
                    Manage all campus events and activities
                  </p>
                </div>
                {!isAddingEvent && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsAddingEvent(true)}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Create New Event
                  </button>
                )}
              </div>

              {events.length === 0 ? (
                <div className="alert alert-info text-center">
                  <i className="bi bi-info-circle-fill me-2"></i>
                  No events found. Click "Create New Event" to add one.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Event Title</th>
                        <th>Category</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => (
                        <tr key={event.id}>
                          <td>{event.title}</td>
                          <td>
                            <span className="badge bg-info bg-opacity-10 text-info">
                              {event.category}
                            </span>
                          </td>
                          <td>
                            {event.startDate === event.endDate
                              ? new Date(event.startDate).toLocaleDateString()
                              : `${new Date(
                                  event.startDate
                                ).toLocaleDateString()} - ${new Date(
                                  event.endDate
                                ).toLocaleDateString()}`}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                event.status === "Upcoming"
                                  ? "bg-primary"
                                  : event.status === "Ongoing"
                                  ? "bg-success"
                                  : event.status === "Completed"
                                  ? "bg-secondary"
                                  : "bg-danger"
                              }`}
                            >
                              {event.status}
                            </span>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => handleEditEvent(event)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-outline-info"
                                onClick={() => handleShowDemographics(event)}
                              >
                                <i className="bi bi-bar-chart"></i>
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => handleDeleteEvent(event.id)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Add demographics modal */}
        {showDemographicsModal && selectedEventForDemographics && (
          <div
            className="modal d-block"
            tabIndex={-1}
            role="dialog"
            style={{
              backgroundColor: "rgba(0,0,0,0.7)",
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1050,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <div
              className="modal-dialog modal-xl"
              role="document"
              style={{
                width: "90%",
                maxWidth: "1400px",
                margin: "30px auto",
              }}
            >
              <div
                className="modal-content"
                style={{
                  borderRadius: "8px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                }}
              >
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">
                    Event Demographics Analysis:{" "}
                    {selectedEventForDemographics.title || "Untitled Event"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => {
                      setShowDemographicsModal(false);
                      setSelectedEventForDemographics(null);
                    }}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body bg-light">
                  <div className="container-fluid py-4">
                    <div className="row mb-4">
                      <div className="col-12">
                        <div className="card border-0 shadow-sm">
                          <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h5 className="card-title mb-0">
                                {selectedEventForDemographics.title ||
                                  "Untitled Event"}
                              </h5>
                              <span
                                className={`badge ${
                                  (selectedEventForDemographics.status ||
                                    "Upcoming") === "Upcoming"
                                    ? "bg-primary"
                                    : (selectedEventForDemographics.status ||
                                        "Upcoming") === "Ongoing"
                                    ? "bg-success"
                                    : (selectedEventForDemographics.status ||
                                        "Upcoming") === "Completed"
                                    ? "bg-secondary"
                                    : "bg-danger"
                                }`}
                              >
                                {selectedEventForDemographics.status ||
                                  "Upcoming"}
                              </span>
                            </div>
                            <div className="row g-4">
                              <div className="col-md-3">
                                <div className="d-flex align-items-center">
                                  <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                                    <i className="bi bi-calendar-date text-primary"></i>
                                  </div>
                                  <div>
                                    <small className="text-muted d-block">
                                      Date
                                    </small>
                                    <strong>
                                      {(selectedEventForDemographics.startDate ||
                                        "") ===
                                      (selectedEventForDemographics.endDate ||
                                        "")
                                        ? new Date(
                                            selectedEventForDemographics.startDate ||
                                              new Date()
                                          ).toLocaleDateString()
                                        : `${new Date(
                                            selectedEventForDemographics.startDate ||
                                              new Date()
                                          ).toLocaleDateString()} - 
                                          ${new Date(
                                            selectedEventForDemographics.endDate ||
                                              new Date()
                                          ).toLocaleDateString()}`}
                                    </strong>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="d-flex align-items-center">
                                  <div className="bg-success bg-opacity-10 rounded-circle p-2 me-3">
                                    <i className="bi bi-geo-alt text-success"></i>
                                  </div>
                                  <div>
                                    <small className="text-muted d-block">
                                      Location
                                    </small>
                                    <strong>
                                      {selectedEventForDemographics.location ||
                                        "No location specified"}
                                    </strong>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="d-flex align-items-center">
                                  <div className="bg-info bg-opacity-10 rounded-circle p-2 me-3">
                                    <i className="bi bi-tag text-info"></i>
                                  </div>
                                  <div>
                                    <small className="text-muted d-block">
                                      Category
                                    </small>
                                    <strong>
                                      {selectedEventForDemographics.category ||
                                        "Uncategorized"}
                                    </strong>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="d-flex align-items-center">
                                  <div className="bg-warning bg-opacity-10 rounded-circle p-2 me-3">
                                    <i className="bi bi-person text-warning"></i>
                                  </div>
                                  <div>
                                    <small className="text-muted d-block">
                                      Organizer
                                    </small>
                                    <strong>
                                      {selectedEventForDemographics.organizer ||
                                        "Not specified"}
                                    </strong>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="row mb-4">
                      <div className="col-12">
                        <div className="card border-0 shadow-sm">
                          <div className="card-body p-4">
                            <h6 className="card-title mb-3">
                              Participation Overview
                            </h6>
                            <div className="d-flex align-items-center mb-3">
                              <div
                                className="progress flex-grow-1 me-3"
                                style={{ height: "16px" }}
                              >
                                <div
                                  className="progress-bar bg-success"
                                  style={{
                                    width: `${
                                      (selectedEventForDemographics.expectedParticipants ||
                                        0) > 0
                                        ? ((selectedEventForDemographics.actualParticipants ||
                                            0) /
                                            (selectedEventForDemographics.expectedParticipants ||
                                              1)) *
                                          100
                                        : 0
                                    }%`,
                                  }}
                                ></div>
                              </div>
                              <div className="text-success fw-bold fs-4">
                                {(selectedEventForDemographics.expectedParticipants ||
                                  0) > 0
                                  ? (
                                      ((selectedEventForDemographics.actualParticipants ||
                                        0) /
                                        (selectedEventForDemographics.expectedParticipants ||
                                          1)) *
                                      100
                                    ).toFixed(1)
                                  : 0}
                                %
                              </div>
                            </div>
                            <div className="row text-center">
                              <div className="col-6">
                                <div className="p-3 bg-light rounded">
                                  <div className="small text-muted mb-1">
                                    Actual Participants
                                  </div>
                                  <div className="fw-bold fs-4">
                                    {selectedEventForDemographics.actualParticipants ||
                                      0}
                                  </div>
                                </div>
                              </div>
                              <div className="col-6">
                                <div className="p-3 bg-light rounded">
                                  <div className="small text-muted mb-1">
                                    Expected Participants
                                  </div>
                                  <div className="fw-bold fs-4">
                                    {selectedEventForDemographics.expectedParticipants ||
                                      0}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="row mb-4">
                      <div className="col-12">
                        <div className="card border-0 shadow-sm">
                          <div className="card-header bg-white">
                            <h5 className="card-title mb-0">
                              Demographics Analysis
                            </h5>
                          </div>
                          <div className="card-body p-4">
                            <ChartWrapper>
                              <div className="row g-4">
                                <div className="col-lg-6">
                                  <DepartmentChart
                                    participants={
                                      selectedEventForDemographics.actualParticipants ||
                                      0
                                    }
                                    category={
                                      selectedEventForDemographics.category ||
                                      "General"
                                    }
                                    key={`dept-chart-${
                                      selectedEventForDemographics.id ||
                                      "unknown"
                                    }`}
                                  />
                                </div>

                                <div className="col-lg-6">
                                  <TimelineChart
                                    actualParticipants={
                                      selectedEventForDemographics.actualParticipants ||
                                      0
                                    }
                                    expectedParticipants={
                                      selectedEventForDemographics.expectedParticipants ||
                                      0
                                    }
                                    startDate={
                                      selectedEventForDemographics.startDate ||
                                      new Date().toISOString()
                                    }
                                    status={
                                      selectedEventForDemographics.status ||
                                      "Upcoming"
                                    }
                                    key={`timeline-chart-${
                                      selectedEventForDemographics.id ||
                                      "unknown"
                                    }`}
                                  />
                                </div>

                                <div className="col-lg-6">
                                  <RoleChart
                                    actualParticipants={
                                      selectedEventForDemographics.actualParticipants ||
                                      0
                                    }
                                    expectedParticipants={
                                      selectedEventForDemographics.expectedParticipants ||
                                      0
                                    }
                                    key={`role-chart-${
                                      selectedEventForDemographics.id ||
                                      "unknown"
                                    }`}
                                  />
                                </div>

                                <div className="col-lg-6">
                                  <FeedbackChart
                                    successRate={
                                      selectedEventForDemographics.successRate ||
                                      0
                                    }
                                    status={
                                      selectedEventForDemographics.status ||
                                      "Upcoming"
                                    }
                                    key={`feedback-chart-${
                                      selectedEventForDemographics.id ||
                                      "unknown"
                                    }`}
                                  />
                                </div>
                              </div>
                            </ChartWrapper>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-12">
                        <div className="card border-0 shadow-sm">
                          <div className="card-header bg-white">
                            <h5 className="card-title mb-0">
                              Key Event Metrics
                            </h5>
                          </div>
                          <div className="card-body p-4">
                            <div className="row row-cols-1 row-cols-md-4 g-4">
                              <div className="col">
                                <div className="p-3 bg-light rounded">
                                  <div className="small text-muted mb-1">
                                    Time
                                  </div>
                                  <div className="fw-bold">
                                    {selectedEventForDemographics.startTime ||
                                      "--:--"}{" "}
                                    -{" "}
                                    {selectedEventForDemographics.endTime ||
                                      "--:--"}
                                  </div>
                                </div>
                              </div>
                              <div className="col">
                                <div className="p-3 bg-light rounded">
                                  <div className="small text-muted mb-1">
                                    Success Rate
                                  </div>
                                  <div className="fw-bold text-success">
                                    {selectedEventForDemographics.successRate ||
                                      0}
                                    %
                                  </div>
                                </div>
                              </div>
                              <div className="col">
                                <div className="p-3 bg-light rounded">
                                  <div className="small text-muted mb-1">
                                    Partnerships
                                  </div>
                                  <div className="fw-bold text-truncate">
                                    {selectedEventForDemographics.partnership ||
                                      "None"}
                                  </div>
                                </div>
                              </div>
                              <div className="col">
                                <div className="p-3 bg-light rounded">
                                  <div className="small text-muted mb-1">
                                    Created By
                                  </div>
                                  <div className="fw-bold text-truncate">
                                    {selectedEventForDemographics.createdBy ||
                                      "Unknown"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-primary px-4"
                    onClick={() => {
                      setShowDemographicsModal(false);
                      setSelectedEventForDemographics(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Fetch all users when component mounts
  useEffect(() => {
    fetchUsers();
  }, []);

  // Load events data from Firestore
  useEffect(() => {
    async function fetchEvents() {
      try {
        setEventsLoading(true);
        const eventsCollection = collection(db, "events");
        const eventSnapshot = await getDocs(eventsCollection);

        const eventList = eventSnapshot.docs.map((doc) => {
          const data = doc.data();

          // Process createdAt
          let createdAtDate = new Date();
          if (typeof data.createdAt === "string") {
            createdAtDate = new Date(data.createdAt);
          } else if (
            data.createdAt?.toDate &&
            typeof data.createdAt.toDate === "function"
          ) {
            createdAtDate = data.createdAt.toDate();
          }

          // Return a properly typed event with fallbacks for undefined values
          return {
            id: doc.id,
            title: data.title || "",
            description: data.description || "",
            location: data.location || "",
            organizer: data.organizer || "",
            partnership: data.partnership || "",
            category: data.category || "Academic",
            startDate: data.startDate || "",
            endDate: data.endDate || "",
            startTime: data.startTime || "",
            endTime: data.endTime || "",
            expectedParticipants: Number(data.expectedParticipants) || 0,
            actualParticipants: Number(data.actualParticipants) || 0,
            successRate: Number(data.successRate) || 0,
            status: data.status || "Upcoming",
            createdAt: createdAtDate,
            createdBy: data.createdBy || "unknown",
          };
        });

        setEvents(eventList);
        setEventsLoaded(true);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("Failed to load events. Please try again.");
      } finally {
        setEventsLoading(false);
      }
    }

    if (activeSection === "events" && !eventsLoaded) {
      fetchEvents();
    } else if (activeSection === "events") {
      // Just clear the loading state if data is already loaded
      setEventsLoading(false);
    }
  }, [activeSection, eventsLoaded]);

  // Reset event form
  const resetEventForm = () => {
    setEventTitle("");
    setEventDescription("");
    setEventLocation("");
    setEventOrganizer("");
    setEventPartnership("");
    setEventCategory("Academic");
    setEventStartDate("");
    setEventEndDate("");
    setEventStartTime("");
    setEventEndTime("");
    setEventExpectedParticipants(0);
    setEventActualParticipants(0);
    setEventSuccessRate(0);
    setEventStatus("Upcoming");
    setEditingEvent(null);
    setIsAddingEvent(false);
  };

  // Handle edit event
  const handleEditEvent = (event: any) => {
    // Convert undefined values to defaults
    setEventTitle(event.title || "");
    setEventDescription(event.description || "");
    setEventLocation(event.location || "");
    setEventOrganizer(event.organizer || "");
    setEventPartnership(event.partnership || "");
    setEventCategory(event.category || "Academic");
    setEventStartDate(event.startDate || "");
    setEventEndDate(event.endDate || "");
    setEventStartTime(event.startTime || "");
    setEventEndTime(event.endTime || "");
    setEventExpectedParticipants(
      typeof event.expectedParticipants === "number"
        ? event.expectedParticipants
        : 0
    );
    setEventActualParticipants(
      typeof event.actualParticipants === "number"
        ? event.actualParticipants
        : 0
    );
    setEventSuccessRate(
      typeof event.successRate === "number" ? event.successRate : 0
    );
    setEventStatus(event.status || "Upcoming");
    setEditingEvent(event.id);
    setIsAddingEvent(true);
    showNotification("Event loaded for editing");
  };

  // Handle delete event
  const handleDeleteEvent = async (eventId: string) => {
    showConfirm(
      {
        title: "Delete Event",
        message:
          "Are you sure you want to delete this event? This action cannot be undone.",
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        variant: "danger",
        icon: "bi-trash",
      },
      async () => {
        // Confirm callback
        try {
          setEventsLoading(true);

          // Delete from Firestore
          const eventRef = doc(db, "events", eventId);
          await deleteDoc(eventRef);

          // Update UI
          setEvents(events.filter((event) => event.id !== eventId));
          showNotification("Event deleted successfully");
        } catch (err) {
          console.error("Error deleting event:", err);
          showNotification("Failed to delete event. Please try again.");
        } finally {
          setEventsLoading(false);
        }
      }
    );
  };

  // Add a function to manually refresh events data
  const refreshEvents = async () => {
    try {
      setEventsLoading(true);
      const eventsCollection = collection(db, "events");
      const eventSnapshot = await getDocs(eventsCollection);

      const eventList = eventSnapshot.docs.map((doc) => {
        const data = doc.data();

        // Process createdAt
        let createdAtDate = new Date();
        if (typeof data.createdAt === "string") {
          createdAtDate = new Date(data.createdAt);
        } else if (
          data.createdAt?.toDate &&
          typeof data.createdAt.toDate === "function"
        ) {
          createdAtDate = data.createdAt.toDate();
        }

        return {
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          location: data.location || "",
          organizer: data.organizer || "",
          partnership: data.partnership || "",
          category: data.category || "Academic",
          startDate: data.startDate || "",
          endDate: data.endDate || "",
          startTime: data.startTime || "",
          endTime: data.endTime || "",
          expectedParticipants: Number(data.expectedParticipants) || 0,
          actualParticipants: Number(data.actualParticipants) || 0,
          successRate: Number(data.successRate) || 0,
          status: data.status || "Upcoming",
          createdAt: createdAtDate,
          createdBy: data.createdBy || "unknown",
        };
      });

      setEvents(eventList);
    } catch (err) {
      console.error("Error refreshing events:", err);
      showNotification("Failed to refresh events data");
    } finally {
      setEventsLoading(false);
    }
  };

  // Handle form submit for event
  const handleEventFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Show loading state
    setEventsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Ensure all fields have non-undefined values and use proper types
      const eventData = {
        title: eventTitle || "",
        description: eventDescription || "",
        location: eventLocation || "",
        organizer: eventOrganizer || "",
        partnership: eventPartnership || "",
        category: eventCategory || "Academic",
        startDate: eventStartDate || "",
        endDate: eventEndDate || "",
        startTime: eventStartTime || "",
        endTime: eventEndTime || "",
        expectedParticipants: Number(eventExpectedParticipants) || 0,
        actualParticipants: Number(eventActualParticipants) || 0,
        successRate: Number(eventSuccessRate) || 0,
        status: eventStatus || "Upcoming",
      };

      if (editingEvent) {
        // Update existing event in Firestore
        const eventRef = doc(db, "events", editingEvent);
        await updateDoc(eventRef, eventData);

        // Update UI
        setEvents(
          events.map((event) =>
            event.id === editingEvent
              ? {
                  ...eventData,
                  id: editingEvent,
                  createdAt: event.createdAt,
                  createdBy: event.createdBy,
                }
              : event
          )
        );

        showNotification("Event updated successfully");
      } else {
        // Add new event to Firestore
        const eventsCollection = collection(db, "events");
        const docRef = await addDoc(eventsCollection, {
          ...eventData,
          createdAt: new Date(),
          createdBy: userData?.uid || "unknown",
        });

        // Update UI
        const newEvent = {
          ...eventData,
          id: docRef.id,
          createdAt: new Date(),
          createdBy: userData?.uid || "unknown",
        };
        setEvents([...events, newEvent]);

        showNotification("New event added successfully");
      }

      // Reset form
      resetEventForm();
    } catch (err) {
      console.error("Error saving event:", err);
      showNotification("Failed to save event. Please try again.");
    } finally {
      setEventsLoading(false);
    }
  };

  // Handle direct user deletion with confirm dialog
  const handleDeleteUser = (user: any) => {
    showConfirm(
      {
        title: "Delete User",
        message: `Are you sure you want to delete ${
          user.name || user.email
        }? This action cannot be undone.`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        variant: "danger",
        icon: "bi-trash",
      },
      async () => {
        setIsDeleting(true);
        setError("");
        setSuccess("");

        try {
          // Delete user from Firestore
          await deleteDoc(doc(db, "users", user.id));

          // Update UI
          setUsers(users.filter((u) => u.id !== user.id));
          showNotification("User deleted successfully");
        } catch (err) {
          console.error("Error deleting user:", err);
          showNotification("Failed to delete user");
        } finally {
          setIsDeleting(false);
        }
      }
    );
  };

  // Actually return the UI for this component
  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <div
        className={`admin-sidebar ${
          sidebarCollapsed ? "admin-sidebar-collapsed" : ""
        } ${mobileOpen ? "admin-sidebar-visible" : ""}`}
      >
        <div className="admin-sidebar-header">
          <div className="admin-logo-container">
            <img src={logoUrl} alt="SCMS Logo" className="admin-logo-image" />
            <div className="admin-logo-text">SCMS</div>
          </div>
          {/* Mobile only close button */}
          <button
            className="toggle-sidebar d-block d-lg-none"
            onClick={toggleMobileSidebar}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="admin-sidebar-body">
          <div
            className={`admin-menu-item ${
              activeSection === "dashboard" ? "active" : ""
            }`}
            onClick={() => setActiveSection("dashboard")}
          >
            <i className="bi bi-speedometer2"></i>
            <span>Dashboard</span>
          </div>
          <div
            className={`admin-menu-item ${
              activeSection === "academic" ? "active" : ""
            }`}
            onClick={() => {
              setActiveSection("academic");
              setActiveAcademicTab("dashboard"); // Reset to default academic view
            }}
          >
            <i className="bi bi-mortarboard"></i>
            <span>Academic Planning</span>
          </div>
          <div
            className={`admin-menu-item ${
              activeSection === "users" ? "active" : ""
            }`}
            onClick={() => setActiveSection("users")}
          >
            <i className="bi bi-people"></i>
            <span>User Management</span>
          </div>
          <div
            className={`admin-menu-item ${
              activeSection === "resources" ? "active" : ""
            }`}
            onClick={() => setActiveSection("resources")}
          >
            <i className="bi bi-building"></i>
            <span>Resource Management</span>
          </div>
          <div
            className={`admin-menu-item ${
              activeSection === "settings" ? "active" : ""
            }`}
            onClick={() => setActiveSection("settings")}
          >
            <i className="bi bi-gear"></i>
            <span>Settings</span>
          </div>
          <div
            className={`admin-menu-item ${
              activeSection === "schedules" ? "active" : ""
            }`}
            onClick={() => setActiveSection("schedules")}
          >
            <i className="bi bi-calendar3"></i>
            <span>Class Schedules</span>
          </div>
          <div
            className={`admin-menu-item ${
              activeSection === "events" ? "active" : ""
            }`}
            onClick={() => setActiveSection("events")}
          >
            <i className="bi bi-calendar-event"></i>
            <span>Event Management</span>
          </div>
        </div>

        <div className="admin-sidebar-footer">
          {/* Toggle button above logout */}
          <div className="toggle-button-footer" onClick={toggleSidebar}>
            <i
              className={`bi ${
                sidebarCollapsed ? "bi-chevron-right" : "bi-chevron-left"
              }`}
            ></i>
            <span>Collapse Menu</span>
          </div>

          <div className="admin-menu-item logout-button" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`admin-content ${
          sidebarCollapsed ? "admin-content-expanded" : ""
        }`}
      >
        {/* Mobile Header */}
        <div className="d-lg-none mb-3 d-flex justify-content-between align-items-center">
          <button
            className="btn btn-outline-primary"
            onClick={toggleMobileSidebar}
          >
            <i className="bi bi-list"></i>
          </button>
          <div className="dashboard-logo">SCMS</div>
          <div className="dropdown">
            <button
              className="btn btn-outline-secondary dropdown-toggle"
              type="button"
              id="userDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="bi bi-person-circle"></i>
            </button>
            <ul
              className="dropdown-menu dropdown-menu-end"
              aria-labelledby="userDropdown"
            >
              <li>
                <a className="dropdown-item" href="#profile">
                  Profile
                </a>
              </li>
              <li>
                <button className="dropdown-item" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Success/Error Alerts */}
        {error && (
          <div
            className="alert alert-danger mb-4 alert-dismissible fade show"
            role="alert"
          >
            {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError("")}
            ></button>
          </div>
        )}

        {success && (
          <div
            className="alert alert-success mb-4 alert-dismissible fade show"
            role="alert"
          >
            {success}
            <button
              type="button"
              className="btn-close"
              onClick={() => setSuccess("")}
            ></button>
          </div>
        )}

        {/* Welcome header */}
        <div className="mb-4">
          <h1 className="h3 fw-bold">
            Welcome, {userData?.name || "Administrator"}
          </h1>
          <p className="text-muted">
            Manage your school's resources, users, and settings from this
            control panel.
          </p>
        </div>

        {/* Container for dynamic content */}
        <div className="content-container">{renderContent()}</div>
      </div>
    </div>
  );
}
