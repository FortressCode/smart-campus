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
      // Update user profile in Firestore
      await updateUserProfile(name, phone, faculty, department);

      setSuccess("Profile updated successfully");
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
      <div className="auth-container">
        <div className="profile-card fade-in" style={{ maxWidth: "650px" }}>
          <div className="profile-header">
            <h3 className="mb-0">
              {isNewAccount ? "Complete Your Profile" : "Profile Management"}
            </h3>
            <p className="text-muted">
              {isNewAccount
                ? "Please provide some additional information to complete your profile"
                : "Update your personal information"}
            </p>
          </div>

          <div className="profile-body">
            {error && (
              <div className="alert alert-danger mb-4" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success mb-4" role="alert">
                {success}
              </div>
            )}

            {loading ? (
              <div className="spinner-container">
                <div className="spinner-border spinner-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3 text-muted">Loading your profile...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
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

                <div className="mb-3">
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

                <div className="mb-3">
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

                <div className="mb-3">
                  <label htmlFor="profile-department" className="form-label">
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

                <div className="d-grid mt-4">
                  <button
                    type="submit"
                    className="btn btn-primary"
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
                        {isNewAccount ? "Complete Profile" : "Update Profile"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
