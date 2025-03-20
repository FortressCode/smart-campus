import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import NavBar from "./NavBar";

export default function ProfileManagement() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [address, setAddress] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isNewAccount, setIsNewAccount] = useState(false);
  const { currentUser, updateUserProfile, userData } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    async function fetchUserData() {
      try {
        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setName(userData.name || "");
            setPhone(userData.phone || "");
            setFaculty(userData.faculty || "");
            setDepartment(userData.department || "");
            setAddress(userData.address || "");
            setAge(userData.age || "");
            setIsNewAccount(
              !userData.phone && !userData.faculty && !userData.department
            );
          }
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setError("You must be logged in to update your profile");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Update user profile in Firestore using AuthContext method
      await updateUserProfile(name, phone, faculty, department, address, age);

      // Show notification through the notification system
      showNotification("Profile updated successfully");

      // If this is a new account, redirect to the appropriate dashboard
      if (isNewAccount) {
        const dashboardRoutes: Record<string, string> = {
          admin: "/admin",
          lecturer: "/lecturer",
          student: "/student",
        };

        // Default to student if no role is defined
        const role = userData?.role || "student";
        const route = dashboardRoutes[role] || "/student";

        navigate(route);
      }
    } catch (err) {
      console.error("Error updating profile", err);
      setError("Failed to update profile");
      showNotification("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      <NavBar />
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8">
            <div className="card shadow-sm border-0 rounded-3 fade-in">
              <div className="card-header bg-white py-3 border-bottom">
                <h3 className="mb-1 fs-4">
                  {isNewAccount
                    ? "Complete Your Profile"
                    : "Profile Management"}
                </h3>
                <p className="text-muted mb-0 small">
                  {isNewAccount
                    ? "Please provide some additional information to complete your profile"
                    : "Update your personal information"}
                </p>
              </div>

              <div className="card-body p-4">
                {error && (
                  <div className="alert alert-danger mb-4" role="alert">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="text-center my-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3 text-muted">Loading your profile...</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                      {/* Read-only section */}
                      <div className="col-12">
                        <h5 className="text-muted fs-6 mb-3">
                          Account Information
                        </h5>
                      </div>

                      {/* Display email (read-only) */}
                      <div className="col-12 col-md-6 mb-3">
                        <label htmlFor="profile-email" className="form-label">
                          Email (Cannot be changed)
                        </label>
                        <input
                          type="email"
                          id="profile-email"
                          className="form-control bg-light"
                          value={userData?.email || ""}
                          readOnly
                          disabled
                        />
                      </div>

                      {/* Display role (read-only) */}
                      <div className="col-12 col-md-6 mb-3">
                        <label htmlFor="profile-role" className="form-label">
                          Role (Cannot be changed)
                        </label>
                        <input
                          type="text"
                          id="profile-role"
                          className="form-control bg-light"
                          value={userData?.role || ""}
                          readOnly
                          disabled
                        />
                      </div>

                      <div className="col-12 mt-2">
                        <h5 className="text-muted fs-6 mb-3">
                          Personal Details
                        </h5>
                      </div>

                      <div className="col-12 col-md-8 mb-3">
                        <label htmlFor="profile-name" className="form-label">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="profile-name"
                          className="form-control"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="col-12 col-md-4 mb-3">
                        <label htmlFor="profile-age" className="form-label">
                          Age *
                        </label>
                        <input
                          type="number"
                          id="profile-age"
                          className="form-control"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          required
                          placeholder="Your age"
                          min="1"
                          max="120"
                        />
                      </div>

                      <div className="col-12 mb-3">
                        <label htmlFor="profile-address" className="form-label">
                          Address *
                        </label>
                        <textarea
                          id="profile-address"
                          className="form-control"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          required
                          placeholder="Your residential address"
                          rows={2}
                        />
                      </div>

                      <div className="col-12 col-md-6 mb-3">
                        <label htmlFor="profile-phone" className="form-label">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          id="profile-phone"
                          className="form-control"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          placeholder="+1234567890"
                        />
                      </div>

                      <div className="col-12 col-md-6 mb-3">
                        <label htmlFor="profile-faculty" className="form-label">
                          Faculty *
                        </label>
                        <select
                          id="profile-faculty"
                          className="form-select"
                          value={faculty}
                          onChange={(e) => setFaculty(e.target.value)}
                          required
                        >
                          <option value="" disabled>
                            Select your faculty
                          </option>
                          <option value="Engineering">Engineering</option>
                          <option value="Science">Science</option>
                          <option value="Business">Business</option>
                          <option value="Arts">Arts</option>
                          <option value="Medicine">Medicine</option>
                          <option value="Law">Law</option>
                          <option value="Education">Education</option>
                        </select>
                      </div>

                      <div className="col-12 mb-3">
                        <label
                          htmlFor="profile-department"
                          className="form-label"
                        >
                          Department *
                        </label>
                        <input
                          type="text"
                          id="profile-department"
                          className="form-control"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          required
                          placeholder="e.g. Computer Science"
                        />
                      </div>

                      <div className="col-12 mt-2">
                        <button
                          type="submit"
                          className="btn btn-primary w-100 py-2"
                          disabled={saving}
                        >
                          {saving ? (
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
                              {isNewAccount
                                ? "Complete Profile"
                                : "Update Profile"}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
