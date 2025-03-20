import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { useConfirm } from "../contexts/ConfirmContext";
import NavBar from "./NavBar";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import MaterialsViewer from "./MaterialsViewer";
import ChatInterface from "./ChatInterface";
import ChatManagement from "./ChatManagement";
import EmailService from "./EmailService";

// Define Schedule interface
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

export default function LecturerDashboard() {
  const { userData, logout, currentUser } = useAuth();
  const { showNotification } = useNotification();
  const { showConfirm } = useConfirm();
  const navigate = useNavigate();

  // Redirect to login if not logged in
  useEffect(() => {
    if (!userData) {
      navigate("/login");
    }
  }, [userData, navigate]);

  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Schedule state
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);

  // Profile management state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Additional lecturer profile fields
  const [branch, setBranch] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [experience, setExperience] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Logo URL for collapsed sidebar
  const logoUrl =
    "https://png.pngtree.com/png-vector/20220922/ourmid/pngtree-letter-v-icon-png-image_6210719.png";

  // Function to toggle sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Function to toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
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

  // Load profile data when component mounts or activeSection changes to profile
  useEffect(() => {
    if (activeSection === "profile" && userData) {
      setName(userData.name || "");
      setEmail(userData.email || "");
      setRole(userData.role || "");
      setAge(userData.age || "");
      setAddress(userData.address || "");
      setPhone(userData.phone || "");

      // Load additional lecturer profile data
      setBranch(userData.branch || "");
      setSpecialization(userData.specialization || "");
      setQualifications(userData.qualifications || "");
      setExperience(userData.experience || "");
      setBio(userData.bio || "");
      setProfileImage(userData.profileImage || "");
    }
  }, [activeSection, userData]);

  // Load schedules when component mounts
  useEffect(() => {
    async function fetchLecturerSchedules() {
      if (!userData) {
        console.log("No user data found");
        return;
      }

      console.log("Fetching schedules for lecturer:", userData.name);

      try {
        setSchedulesLoading(true);
        const schedulesCollection = collection(db, "schedules");

        // Log all schedules first to see what's in the collection
        const allSchedulesSnapshot = await getDocs(schedulesCollection);
        const allSchedules = allSchedulesSnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Schedule)
        );
        console.log("All schedules in collection (with lecturer names):");
        allSchedules.forEach((schedule) => {
          console.log(`- Schedule ID: ${schedule.id}`);
          console.log(`  Module: ${schedule.moduleTitle}`);
          console.log(`  Lecturer: "${schedule.lecturerName}"`);
          console.log(`  Branch: ${schedule.branch}`);
          console.log("---");
        });

        // Filter schedules by lecturer name
        const q = query(
          schedulesCollection,
          where("lecturerName", "==", userData.name)
        );

        console.log(
          "Executing Firestore query for lecturer name:",
          userData.name
        );
        const scheduleSnapshot = await getDocs(q);
        console.log("Query results:", scheduleSnapshot.size, "documents found");

        if (scheduleSnapshot.empty) {
          console.log("No schedules found for this lecturer name");
          console.log("Current user's name:", userData.name);
          console.log("Available lecturer names in schedules:");
          allSchedules.forEach((schedule) => {
            console.log(`- ${schedule.lecturerName}`);
          });
        }

        const scheduleList = scheduleSnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Schedule)
        );
        setSchedules(scheduleList);
      } catch (err) {
        console.error("Error fetching schedules:", err);
        showNotification("Failed to load schedules. Please try again.");
      } finally {
        setSchedulesLoading(false);
      }
    }

    fetchLecturerSchedules();
  }, [userData, showNotification]);

  // Update profile function
  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log("Current userData:", userData);
    console.log("Current user:", currentUser);

    if (!userData) {
      showNotification("User data is missing. Please try logging in again.");
      return;
    }

    // Try to get UID from userData or currentUser
    const uid = userData.uid || (currentUser && currentUser.uid);

    console.log("Using UID:", uid);

    if (!uid) {
      showNotification("User ID is missing. Please try logging in again.");
      return;
    }

    try {
      setProfileLoading(true);

      console.log("Checking if user document exists...");
      // First check if the document exists
      const userRef = doc(db, "users", uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        console.error("User document does not exist in Firestore");
        showNotification("User profile not found. Please contact support.");
        setProfileLoading(false);
        return;
      }

      console.log("Updating profile for user ID:", uid);

      // Update Firestore document
      await updateDoc(userRef, {
        name,
        age,
        address,
        phone,
        branch,
        specialization,
        qualifications,
        experience,
        bio,
        updatedAt: new Date(),
      });

      console.log("Profile updated successfully");
      showNotification("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      showNotification(
        `Failed to update profile: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setProfileLoading(false);
    }
  };

  // Render different sections based on activeSection
  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return renderDashboardSection();
      case "classes":
        return renderClassesSection();
      case "materials":
        return renderMaterialsSection();
      case "bookings":
        return renderBookingsSection();
      case "students":
        return renderStudentsSection();
      case "chat":
        return renderChatSection();
      case "profile":
        return renderProfileSection();
      case "email":
        return renderEmailSection();
      default:
        return renderDashboardSection();
    }
  };

  // Profile Management Section
  const renderProfileSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-person-circle"></i>
        Profile Management
      </div>

      {profileLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading your profile...</p>
        </div>
      ) : isEditing ? (
        <form
          onSubmit={handleUpdateProfile}
          className="profile-edit-form"
          style={{
            width: "100%",
            maxHeight: "calc(100vh - 180px)",
            overflowY: "auto",
            paddingRight: "10px",
          }}
        >
          <div className="row">
            <div className="col-md-4 mb-4 text-center">
              <div
                className="position-relative mx-auto"
                style={{ width: "150px", height: "150px" }}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="rounded-circle img-thumbnail"
                    style={{
                      width: "150px",
                      height: "150px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center"
                    style={{ width: "150px", height: "150px" }}
                  >
                    <i
                      className="bi bi-person-fill text-primary"
                      style={{ fontSize: "4rem" }}
                    ></i>
                  </div>
                )}
                <div className="position-absolute bottom-0 end-0">
                  <label
                    htmlFor="profile-image-upload"
                    className="btn btn-sm btn-primary rounded-circle"
                  >
                    <i className="bi bi-camera"></i>
                  </label>
                  <input
                    type="file"
                    id="profile-image-upload"
                    className="d-none"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        // In a real app, you would upload this to storage
                        // and get back a URL. For now, we'll use a placeholder.
                        const file = e.target.files[0];
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          if (e.target && e.target.result) {
                            setProfileImage(e.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>
              <h5 className="mt-3">{name || "Your Name"}</h5>
              <p className="text-muted mb-3">{email || "email@example.com"}</p>
            </div>

            <div className="col-md-8">
              <div className="card mb-4 border-0 bg-light">
                <div className="card-body p-3">
                  <h6 className="card-title mb-3">
                    <i className="bi bi-person-badge me-2 text-primary"></i>
                    Personal Information
                  </h6>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-muted">
                        Full Name
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-muted">
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="form-control bg-light"
                        value={email}
                        disabled
                        readOnly
                      />
                      <small className="text-muted">
                        Email cannot be changed
                      </small>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-muted">Age</label>
                      <input
                        type="number"
                        className="form-control"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        min="18"
                        max="100"
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-muted">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        className="form-control"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g., +1 (123) 456-7890"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small text-muted">
                      Address
                    </label>
                    <textarea
                      className="form-control"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={2}
                      placeholder="Your full address"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="card mb-4 border-0 bg-light">
                <div className="card-body p-3">
                  <h6 className="card-title mb-3">
                    <i className="bi bi-building me-2 text-primary"></i>
                    Campus Information
                  </h6>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-muted">
                        Role
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-primary text-white">
                          <i className="bi bi-person-badge"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control bg-light"
                          value={role}
                          disabled
                          readOnly
                        />
                      </div>
                      <small className="text-muted">
                        Role cannot be changed
                      </small>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-muted">
                        Branch
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-primary text-white">
                          <i className="bi bi-geo-alt"></i>
                        </span>
                        <select
                          className="form-select"
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                        >
                          <option value="">Select Branch</option>
                          <option value="Colombo">Colombo</option>
                          <option value="Kandy">Kandy</option>
                          <option value="Gampaha">Gampaha</option>
                          <option value="Negombo">Negombo</option>
                          <option value="Kurunegala">Kurunegala</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-4 border-0 bg-light">
            <div className="card-body p-3">
              <h6 className="card-title mb-3">
                <i className="bi bi-mortarboard me-2 text-primary"></i>
                Academic Information
              </h6>

              <div className="mb-3">
                <label className="form-label small text-muted">
                  Specialization
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-primary text-white">
                    <i className="bi bi-book"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g., Computer Science, Data Science, Artificial Intelligence"
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small text-muted">
                  Qualifications
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-primary text-white">
                    <i className="bi bi-award"></i>
                  </span>
                  <textarea
                    className="form-control"
                    value={qualifications}
                    onChange={(e) => setQualifications(e.target.value)}
                    rows={2}
                    placeholder="e.g., PhD in Computer Science, MSc in Data Science"
                  ></textarea>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small text-muted">
                  Teaching Experience
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-primary text-white">
                    <i className="bi bi-briefcase"></i>
                  </span>
                  <textarea
                    className="form-control"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    rows={2}
                    placeholder="Briefly describe your teaching experience"
                  ></textarea>
                </div>
              </div>

              <div className="mb-0">
                <label className="form-label small text-muted">Bio</label>
                <div className="input-group">
                  <span className="input-group-text bg-primary text-white">
                    <i className="bi bi-person-vcard"></i>
                  </span>
                  <textarea
                    className="form-control"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                    placeholder="Short bio for your profile page"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2 mt-4 mb-3">
            <button
              type="submit"
              className="btn btn-primary btn-lg flex-fill"
              disabled={profileLoading}
            >
              {profileLoading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  Save Changes
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-lg flex-fill"
              onClick={() => setIsEditing(false)}
              disabled={profileLoading}
            >
              <i className="bi bi-x-circle me-2"></i>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-0">Profile Information</h5>
            <button
              className="btn btn-primary"
              onClick={() => setIsEditing(true)}
            >
              <i className="bi bi-pencil me-2"></i> Edit Profile
            </button>
          </div>

          <div className="row">
            <div className="col-lg-4 col-md-5 text-center mb-4 mb-md-0">
              <div className="profile-image-container mx-auto mb-3">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="rounded-circle img-thumbnail shadow"
                    style={{
                      width: "180px",
                      height: "180px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center shadow"
                    style={{
                      width: "180px",
                      height: "180px",
                      margin: "0 auto",
                    }}
                  >
                    <i
                      className="bi bi-person-fill text-primary"
                      style={{ fontSize: "5rem" }}
                    ></i>
                  </div>
                )}
              </div>

              <div className="card border-0 bg-light mb-4">
                <div className="card-body">
                  <h4 className="mb-1">{name || "Not set"}</h4>
                  <p className="text-muted mb-2">{email || "Not set"}</p>
                  <div className="d-flex gap-2 justify-content-center mb-2">
                    <span className="badge bg-primary">{role}</span>
                    {branch && (
                      <span className="badge bg-secondary">
                        {branch} Branch
                      </span>
                    )}
                  </div>
                  {specialization && (
                    <p className="text-muted mb-0 mt-2 small">
                      <i className="bi bi-book me-1"></i> {specialization}
                    </p>
                  )}
                </div>
              </div>

              {/* Profile Completion */}
              <div className="card border-0 bg-light">
                <div className="card-body">
                  <h6 className="mb-3">Profile Completion</h6>
                  <div className="progress mb-2" style={{ height: "10px" }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{
                        width: `${
                          ([
                            name,
                            email,
                            role,
                            branch,
                            age,
                            phone,
                            address,
                            specialization,
                            qualifications,
                            experience,
                            bio,
                            profileImage,
                          ].filter(Boolean).length *
                            100) /
                          12
                        }%`,
                      }}
                    ></div>
                  </div>
                  <p className="small text-muted mb-0">
                    Complete your profile to improve visibility among students
                  </p>
                </div>
              </div>
            </div>

            <div className="col-lg-8 col-md-7">
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <h5 className="card-title mb-3">
                    <i className="bi bi-person text-primary me-2"></i>
                    Contact Information
                  </h5>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <p className="mb-1 text-muted">
                        <i className="bi bi-telephone me-2"></i>Phone
                      </p>
                      <p className="mb-3 fw-medium">{phone || "Not set"}</p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-1 text-muted">
                        <i className="bi bi-geo-alt me-2"></i>Address
                      </p>
                      <p className="mb-3 fw-medium">{address || "Not set"}</p>
                    </div>
                  </div>
                  <div className="mb-0">
                    <p className="mb-1 text-muted">
                      <i className="bi bi-calendar me-2"></i>Age
                    </p>
                    <p className="mb-0 fw-medium">{age || "Not set"}</p>
                  </div>
                </div>
              </div>

              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title mb-3">
                    <i className="bi bi-mortarboard text-primary me-2"></i>
                    Academic Information
                  </h5>

                  <div className="mb-3">
                    <p className="mb-1 text-muted">
                      <i className="bi bi-book me-2"></i>Specialization
                    </p>
                    <p className="mb-3 fw-medium">
                      {specialization || "Not set"}
                    </p>
                  </div>

                  <div className="mb-3">
                    <p className="mb-1 text-muted">
                      <i className="bi bi-award me-2"></i>Qualifications
                    </p>
                    <p className="mb-3 fw-medium">
                      {qualifications || "Not set"}
                    </p>
                  </div>

                  <div className="mb-3">
                    <p className="mb-1 text-muted">
                      <i className="bi bi-briefcase me-2"></i>Teaching
                      Experience
                    </p>
                    <p className="mb-3 fw-medium">{experience || "Not set"}</p>
                  </div>

                  {bio && (
                    <div className="mb-0">
                      <p className="mb-1 text-muted">
                        <i className="bi bi-person-badge me-2"></i>Bio
                      </p>
                      <p className="mb-0 fw-medium">{bio}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Email section
  const renderEmailSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-envelope"></i>
        Email Students
      </div>
      
      <EmailService />
    </div>
  );

  // Dashboard section (overview)
  const renderDashboardSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-speedometer2"></i>
        Dashboard Overview
      </div>

      {/* Lecturer Dashboard Cards */}
      <div className="row g-4 mb-5">
        <div className="col-sm-6 col-lg-3">
          <div className="dashboard-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">My Classes</h5>
              <div className="bg-primary bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-mortarboard fs-4 text-primary"></i>
              </div>
            </div>
            <p className="text-muted mb-0">Manage your class schedules</p>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="dashboard-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Materials</h5>
              <div className="bg-success bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-file-earmark-text fs-4 text-success"></i>
              </div>
            </div>
            <p className="text-muted mb-0">
              Share learning materials and files
            </p>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="dashboard-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Bookings</h5>
              <div className="bg-warning bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-calendar2-plus fs-4 text-warning"></i>
              </div>
            </div>
            <p className="text-muted mb-0">Reserve rooms and equipment</p>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="dashboard-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="mb-0">Student Groups</h5>
              <div className="bg-danger bg-opacity-10 rounded-circle p-2">
                <i className="bi bi-people fs-4 text-danger"></i>
              </div>
            </div>
            <p className="text-muted mb-0">
              Manage student projects and groups
            </p>
          </div>
        </div>
      </div>

      {/* Lecturer Schedule and Communications */}
      <div className="row">
        <div className="col-lg-7 mb-4 mb-lg-0">
          <div className="dashboard-card">
            <h5 className="mb-4">Today's Schedule</h5>
            <div className="mb-3 border-start border-primary border-3 ps-3">
              <h6 className="mb-1">Introduction to Computer Science (CS101)</h6>
              <small className="text-muted d-block mb-2">
                9:00 AM - 10:30 AM
              </small>
              <div className="d-flex justify-content-between align-items-center">
                <span className="badge bg-primary">Room 302</span>
                <div>
                  <button className="btn btn-sm btn-outline-primary me-2">
                    Materials
                  </button>
                  <button className="btn btn-sm btn-outline-secondary">
                    Attendance
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-3 border-start border-primary border-3 ps-3">
              <h6 className="mb-1">Data Structures and Algorithms (CS202)</h6>
              <small className="text-muted d-block mb-2">
                1:00 PM - 2:30 PM
              </small>
              <div className="d-flex justify-content-between align-items-center">
                <span className="badge bg-primary">Room 201</span>
                <div>
                  <button className="btn btn-sm btn-outline-primary me-2">
                    Materials
                  </button>
                  <button className="btn btn-sm btn-outline-secondary">
                    Attendance
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-0 border-start border-primary border-3 ps-3">
              <h6 className="mb-1">Project Supervision (Final Year)</h6>
              <small className="text-muted d-block mb-2">
                3:30 PM - 5:00 PM
              </small>
              <div className="d-flex justify-content-between align-items-center">
                <span className="badge bg-primary">Lab 105</span>
                <div>
                  <button className="btn btn-sm btn-outline-primary me-2">
                    Materials
                  </button>
                  <button className="btn btn-sm btn-outline-secondary">
                    Attendance
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="dashboard-card">
            <h5 className="mb-4">Student Communication</h5>
            <div className="list-group">
              <div className="list-group-item border-0 px-0">
                <div className="d-flex align-items-center mb-2">
                  <div
                    className="me-2 d-flex align-items-center justify-content-center bg-primary rounded-circle text-white"
                    style={{ width: "36px", height: "36px" }}
                  >
                    JS
                  </div>
                  <div>
                    <h6 className="mb-0">John Smith</h6>
                    <small className="text-muted">CS101 Student</small>
                  </div>
                </div>
                <p className="mb-1 ps-5">
                  I have a question about today's assignment. Can I schedule a
                  meeting?
                </p>
                <div className="d-flex justify-content-end">
                  <button className="btn btn-sm btn-primary me-2">Reply</button>
                  <button className="btn btn-sm btn-outline-primary">
                    Schedule
                  </button>
                </div>
              </div>

              <div className="list-group-item border-0 px-0">
                <div className="d-flex align-items-center mb-2">
                  <div
                    className="me-2 d-flex align-items-center justify-content-center bg-primary rounded-circle text-white"
                    style={{ width: "36px", height: "36px" }}
                  >
                    AJ
                  </div>
                  <div>
                    <h6 className="mb-0">Alice Johnson</h6>
                    <small className="text-muted">CS202 Student</small>
                  </div>
                </div>
                <p className="mb-1 ps-5">
                  My team would like to present our project progress next week.
                </p>
                <div className="d-flex justify-content-end">
                  <button className="btn btn-sm btn-primary me-2">Reply</button>
                  <button className="btn btn-sm btn-outline-primary">
                    Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Classes section
  const renderClassesSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-mortarboard"></i>
        My Classes
      </div>

      <div className="row">
        <div className="col-12 mb-4">
          <div className="dashboard-card">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0">Current Classes</h5>
            </div>

            {schedulesLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted">Loading schedules...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-calendar-x fs-1 text-muted"></i>
                <p className="mt-3 text-muted">
                  No classes scheduled at the moment.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Module Title</th>
                      <th>Schedule</th>
                      <th>Room</th>
                      <th>Branch</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((schedule) => (
                      <tr key={schedule.id}>
                        <td>{schedule.moduleTitle}</td>
                        <td>
                          {schedule.isRecurring ? (
                            <span>
                              Every {schedule.dayOfWeek}, {schedule.startTime} -{" "}
                              {schedule.endTime}
                            </span>
                          ) : (
                            <span>
                              {new Date(schedule.date).toLocaleDateString()},{" "}
                              {schedule.startTime} - {schedule.endTime}
                            </span>
                          )}
                        </td>
                        <td>
                          Floor {schedule.floorNumber}, Room{" "}
                          {schedule.classroomNumber}
                        </td>
                        <td>{schedule.branch}</td>
                        <td>
                          {schedule.isRecurring ? (
                            <span className="badge bg-success">Recurring</span>
                          ) : (
                            <span className="badge bg-primary">One-time</span>
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
    </div>
  );

  // Materials section
  const renderMaterialsSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-file-earmark-text"></i>
        Course Materials
      </div>

      <MaterialsViewer role="lecturer" />
    </div>
  );

  // Bookings section
  const renderBookingsSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-calendar2-plus"></i>
        Room & Resource Bookings
      </div>

      <div className="row mb-4">
        <div className="col-lg-6 mb-4 mb-lg-0">
          <div className="dashboard-card h-100">
            <h5 className="mb-4">Make a Booking</h5>

            <div className="mb-3">
              <label className="form-label">Resource Type</label>
              <select className="form-select">
                <option>Classroom</option>
                <option>Lab</option>
                <option>Equipment</option>
                <option>Meeting Room</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Date</label>
              <input type="date" className="form-control" />
            </div>

            <div className="row mb-3">
              <div className="col-6">
                <label className="form-label">Start Time</label>
                <input type="time" className="form-control" />
              </div>
              <div className="col-6">
                <label className="form-label">End Time</label>
                <input type="time" className="form-control" />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Purpose</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Describe the purpose of this booking..."
              ></textarea>
            </div>

            <button className="btn btn-primary">
              <i className="bi bi-check-circle me-1"></i> Confirm Booking
            </button>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="dashboard-card h-100">
            <h5 className="mb-4">Your Upcoming Bookings</h5>

            <div className="mb-3 border-start border-primary border-3 ps-3">
              <h6 className="mb-1">Room 302 - Lecture</h6>
              <small className="text-muted d-block mb-2">
                Tomorrow, 9:00 AM - 10:30 AM
              </small>
              <div className="d-flex justify-content-between align-items-center">
                <span className="badge bg-success">Confirmed</span>
                <button className="btn btn-sm btn-outline-danger">
                  <i className="bi bi-x-circle me-1"></i> Cancel
                </button>
              </div>
            </div>

            <div className="mb-3 border-start border-primary border-3 ps-3">
              <h6 className="mb-1">Lab 105 - Project Supervision</h6>
              <small className="text-muted d-block mb-2">
                May 15, 3:30 PM - 5:00 PM
              </small>
              <div className="d-flex justify-content-between align-items-center">
                <span className="badge bg-success">Confirmed</span>
                <button className="btn btn-sm btn-outline-danger">
                  <i className="bi bi-x-circle me-1"></i> Cancel
                </button>
              </div>
            </div>

            <div className="mb-0 border-start border-warning border-3 ps-3">
              <h6 className="mb-1">Projector - Class Presentation</h6>
              <small className="text-muted d-block mb-2">
                May 18, 1:00 PM - 2:30 PM
              </small>
              <div className="d-flex justify-content-between align-items-center">
                <span className="badge bg-warning text-dark">Pending</span>
                <button className="btn btn-sm btn-outline-danger">
                  <i className="bi bi-x-circle me-1"></i> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Chat Section
  const renderChatSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-chat-dots"></i>
        Course Chat
      </div>
      <div className="row">
        <div className="col-md-12 mb-4">
          <ChatManagement />
        </div>
        <div className="col-md-12">
          <div className="card">
            <div className="card-body p-0">
              <ChatInterface />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Students section
  const renderStudentsSection = () => (
    <div className="slide-in section-content">
      <div className="section-title mb-4">
        <i className="bi bi-people"></i>
        Student Management
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <div className="dashboard-card">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0">Student Groups</h5>
              <div>
                <select className="form-select form-select-sm">
                  <option>All Classes</option>
                  <option>CS101</option>
                  <option>CS202</option>
                  <option>CS405</option>
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Group Name</th>
                    <th>Members</th>
                    <th>Project</th>
                    <th>Progress</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Team Alpha</td>
                    <td>4</td>
                    <td>Web Application Development</td>
                    <td>
                      <div className="progress" style={{ height: "6px" }}>
                        <div
                          className="progress-bar bg-success"
                          role="progressbar"
                          style={{ width: "75%" }}
                        ></div>
                      </div>
                      <small className="text-muted">75%</small>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-primary">
                          <i className="bi bi-eye"></i>
                        </button>
                        <button className="btn btn-outline-success">
                          <i className="bi bi-chat"></i>
                        </button>
                        <button className="btn btn-outline-secondary">
                          <i className="bi bi-pencil"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>Team Beta</td>
                    <td>3</td>
                    <td>Mobile App Development</td>
                    <td>
                      <div className="progress" style={{ height: "6px" }}>
                        <div
                          className="progress-bar bg-primary"
                          role="progressbar"
                          style={{ width: "45%" }}
                        ></div>
                      </div>
                      <small className="text-muted">45%</small>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-primary">
                          <i className="bi bi-eye"></i>
                        </button>
                        <button className="btn btn-outline-success">
                          <i className="bi bi-chat"></i>
                        </button>
                        <button className="btn btn-outline-secondary">
                          <i className="bi bi-pencil"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>Team Gamma</td>
                    <td>5</td>
                    <td>Database Implementation</td>
                    <td>
                      <div className="progress" style={{ height: "6px" }}>
                        <div
                          className="progress-bar bg-warning"
                          role="progressbar"
                          style={{ width: "30%" }}
                        ></div>
                      </div>
                      <small className="text-muted">30%</small>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-primary">
                          <i className="bi bi-eye"></i>
                        </button>
                        <button className="btn btn-outline-success">
                          <i className="bi bi-chat"></i>
                        </button>
                        <button className="btn btn-outline-secondary">
                          <i className="bi bi-pencil"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
          <div className="admin-menu">
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
                activeSection === "classes" ? "active" : ""
              }`}
              onClick={() => setActiveSection("classes")}
            >
              <i className="bi bi-mortarboard"></i>
              <span>My Classes</span>
            </div>
            <div
              className={`admin-menu-item ${
                activeSection === "materials" ? "active" : ""
              }`}
              onClick={() => setActiveSection("materials")}
            >
              <i className="bi bi-file-earmark-text"></i>
              <span>Materials</span>
            </div>
            <div
              className={`admin-menu-item ${
                activeSection === "bookings" ? "active" : ""
              }`}
              onClick={() => setActiveSection("bookings")}
            >
              <i className="bi bi-calendar2-plus"></i>
              <span>Bookings</span>
            </div>
            <div
              className={`admin-menu-item ${
                activeSection === "students" ? "active" : ""
              }`}
              onClick={() => setActiveSection("students")}
            >
              <i className="bi bi-people"></i>
              <span>Students</span>
            </div>
            <div
              className={`admin-menu-item ${
                activeSection === "chat" ? "active" : ""
              }`}
              onClick={() => setActiveSection("chat")}
            >
              <i className="bi bi-chat-dots"></i>
              <span>Course Chat</span>
            </div>
            <div
              className={`admin-menu-item ${
                activeSection === "email" ? "active" : ""
              }`}
              onClick={() => setActiveSection("email")}
            >
              <i className="bi bi-envelope"></i>
              <span>Email</span>
            </div>
            <div
              className={`admin-menu-item ${
                activeSection === "profile" ? "active" : ""
              }`}
              onClick={() => setActiveSection("profile")}
            >
              <i className="bi bi-person-circle"></i>
              <span>Profile</span>
            </div>
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
                <button
                  className="dropdown-item"
                  onClick={() => setActiveSection("profile")}
                >
                  Profile
                </button>
              </li>
              <li>
                <button className="dropdown-item" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Welcome header */}
        <div className="mb-4">
          <h1 className="h3 fw-bold">
            Welcome, {userData?.name || "Lecturer"}
          </h1>
          <p className="text-muted">
            Manage your classes, academic resources, and student interactions.
          </p>
        </div>

        {/* Container for dynamic content */}
        <div className="content-container">
          <div className="section-wrapper">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}
