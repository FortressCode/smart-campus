import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

// Define interface for schedule data
interface Schedule {
  id: string;
  moduleTitle: string;
  floorNumber: string;
  classroomNumber: string;
  lecturerName: string;
  branch: string;
  startTime: string;
  endTime: string;
  date: string;
  dayOfWeek: string;
  isRecurring: boolean;
}

export default function AdminDashboard() {
  const {
    userData,
    logout,
    adminCreateUser,
    updateSecuritySettings,
    getSessionTimeout,
  } = useAuth();
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

  // Fetch all users when component mounts
  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const usersCollection = collection(db, "users");
        const userSnapshot = await getDocs(usersCollection);
        const userList = userSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(userList);
      } catch (err) {
        setError("Failed to fetch users");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

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

      setSuccess(`User role updated successfully to ${role}`);
      setEditingUser(null);
    } catch (err) {
      setError("Failed to update user role");
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Error logging out:", err);
    }
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
        <div className="alert alert-success alert-dismissible fade show" role="alert">
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
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
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
                                onClick={() => confirmDelete(user)}
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
        <div className="modal d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
                    <label htmlFor="newUserName" className="form-label">Name</label>
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
                    <label htmlFor="newUserEmail" className="form-label">Email</label>
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
                    <label htmlFor="newUserPassword" className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="newUserPassword"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newUserRole" className="form-label">Role</label>
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
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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
        <div className="modal d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
                <p>Are you sure you want to delete the user: <strong>{userToDelete.name}</strong>?</p>
                <p className="text-danger"><small>This action cannot be undone.</small></p>
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
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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
  const renderAcademicSection = () => (
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
            <button className="btn btn-sm btn-outline-primary">
              Manage Courses
            </button>
          </div>
        </div>

        <div className="col-md-6">
          <div className="dashboard-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Schedules</h5>
              <div className="bg-success bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-calendar-week fs-4 text-success"></i>
              </div>
            </div>
            <p className="text-muted mb-3">
              Organize timetables and academic calendars.
            </p>
            <button className="btn btn-sm btn-outline-success">
              View Calendar
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
            <p className="text-muted mb-3">Schedule and manage examinations.</p>
            <button className="btn btn-sm btn-outline-warning">
              Exam Schedule
            </button>
          </div>
        </div>

        <div className="col-md-6">
          <div className="dashboard-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Academic Reports</h5>
              <div className="bg-info bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-file-earmark-text fs-4 text-info"></i>
              </div>
            </div>
            <p className="text-muted mb-3">
              Generate and analyze academic performance reports.
            </p>
            <button className="btn btn-sm btn-outline-info">
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );

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
            User will be automatically logged out after this period of inactivity (minimum 1 minute).
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

    // Calendar view functions
    const groupSchedulesByDate = () => {
      const grouped: Record<string, Schedule[]> = {};

      schedules.forEach((schedule) => {
        const date = schedule.date;
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(schedule);
      });

      return grouped;
    };

    const generateCalendarDays = () => {
      // This is a simplified calendar view
      // In a real app, you'd use a library like FullCalendar or react-big-calendar
      const today = new Date();
      const days = [];
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      for (let day = 1; day <= monthEnd.getDate(); day++) {
        const date = new Date(today.getFullYear(), today.getMonth(), day);
        const dateString = date.toISOString().split("T")[0]; // Format: YYYY-MM-DD

        days.push({
          date: dateString,
          day: day,
          isToday: date.getDate() === today.getDate(),
          schedules: schedules.filter((s) => s.date === dateString),
        });
      }

      return days;
    };

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
                        <th>Room</th>
                        <th>Branch</th>
                        <th>Time</th>
                        <th>Day/Date</th>
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
                <div className="calendar-view">
                  <div className="row mb-4">
                    <div className="col-12">
                      <h5 className="text-center mb-3">October 2023</h5>
                      <div className="calendar-grid">
                        <div className="row mb-2">
                          {daysOfWeek.map((day) => (
                            <div key={day} className="col text-center">
                              <div className="p-2 fw-bold">
                                {day.substring(0, 3)}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="row row-cols-7">
                          {generateCalendarDays().map((day) => (
                            <div key={day.date} className="col mb-3">
                              <div
                                className={`calendar-day p-2 ${
                                  day.isToday
                                    ? "bg-primary bg-opacity-10 border-primary"
                                    : ""
                                }`}
                              >
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span
                                    className={`${
                                      day.isToday ? "fw-bold text-primary" : ""
                                    }`}
                                  >
                                    {day.day}
                                  </span>
                                  {day.schedules.length > 0 && (
                                    <span className="badge bg-primary rounded-pill">
                                      {day.schedules.length}
                                    </span>
                                  )}
                                </div>

                                {day.schedules.map((schedule) => (
                                  <div
                                    key={schedule.id}
                                    className="calendar-event p-1 mb-1 rounded"
                                    style={{
                                      backgroundColor: "rgba(67, 97, 238, 0.1)",
                                      borderLeft:
                                        "3px solid var(--primary-color)",
                                      fontSize: "0.8rem",
                                    }}
                                    title={`${schedule.moduleTitle} - ${schedule.lecturerName}`}
                                  >
                                    <div className="fw-medium text-truncate">
                                      {schedule.moduleTitle}
                                    </div>
                                    <div className="text-muted small">
                                      {schedule.startTime} - {schedule.endTime}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
    if (!confirm("Are you sure you want to delete this schedule?")) {
      return;
    }

    try {
      setSchedulesLoading(true);

      // Delete from Firestore
      const scheduleRef = doc(db, "schedules", scheduleId);
      await deleteDoc(scheduleRef);

      // Update UI
      setSchedules(schedules.filter((schedule) => schedule.id !== scheduleId));
      setSuccess("Schedule deleted successfully!");
    } catch (err) {
      console.error("Error deleting schedule:", err);
      setError("Failed to delete schedule. Please try again.");
    } finally {
      setSchedulesLoading(false);
    }
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
      };

      if (editingSchedule) {
        // Update existing schedule in Firestore
        const scheduleRef = doc(db, "schedules", editingSchedule);
        await updateDoc(scheduleRef, scheduleData);

        // Update UI
        setSchedules(
          schedules.map((schedule) =>
            schedule.id === editingSchedule
              ? { ...scheduleData, id: editingSchedule }
              : schedule
          )
        );

        setSuccess("Schedule updated successfully!");
      } else {
        // Add new schedule to Firestore
        const schedulesCollection = collection(db, "schedules");
        const docRef = await addDoc(schedulesCollection, {
          ...scheduleData,
          createdAt: new Date(),
          createdBy: userData?.uid || "unknown",
        });

        // Update UI
        const newSchedule: Schedule = {
          ...scheduleData,
          id: docRef.id,
        };
        setSchedules([...schedules, newSchedule]);

        setSuccess("New schedule added successfully!");
      }

      // Reset form
      resetScheduleForm();
    } catch (err) {
      console.error("Error saving schedule:", err);
      setError("Failed to save schedule. Please try again.");
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

  // Add new user function
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!newUserName || !newUserEmail || !newUserPassword) {
      setAddUserError("All fields are required");
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

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setIsDeleting(true);
      setError("");
      
      // Delete user from Firestore
      const userDocRef = doc(db, "users", userToDelete.id);
      await deleteDoc(userDocRef);
      
      // Update the users state by filtering out the deleted user
      setUsers(users.filter(user => user.id !== userToDelete.id));
      
      // Show success message
      setSuccess(`User ${userToDelete.name} deleted successfully`);
      
      // Reset state and close modal
      setUserToDelete(null);
      setShowDeleteModal(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError("Failed to delete user");
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Open delete confirmation modal
  const confirmDelete = (user: any) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  // Handler for updating security settings
  const handleUpdateSecuritySettings = async () => {
    try {
      await updateSecuritySettings(
        twoFactorEnabled,
        strongPasswordEnabled,
        sessionTimeout
      );
      
      // Show success message
      setSuccess("Security settings updated successfully");
      
      // Scroll to top to make sure user sees the message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Error updating security settings:", error);
      setError("Error updating security settings");
      
      // Scroll to top to make sure user sees the error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };

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
              activeSection === "users" ? "active" : ""
            }`}
            onClick={() => setActiveSection("users")}
          >
            <i className="bi bi-people"></i>
            <span>User Management</span>
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
              activeSection === "academic" ? "active" : ""
            }`}
            onClick={() => setActiveSection("academic")}
          >
            <i className="bi bi-calendar-check"></i>
            <span>Academic Planning</span>
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
