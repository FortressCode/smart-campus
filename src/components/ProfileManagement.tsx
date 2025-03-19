import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import NavBar from "./NavBar";

export default function ProfileManagement() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUserData() {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setName(userData.name || "");
          setEmail(userData.email || "");
          setRole(userData.role || "");
          setAge(userData.age || "");
          setAddress(userData.address || "");
          setPhone(userData.phone || "");
        }
      } catch (err) {
        setError("Failed to load profile data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [currentUser, navigate]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();

    if (!currentUser) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      setUpdating(true);

      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        name,
        age,
        address,
        phone,
        // Not updating email or role as these are more sensitive fields
      });

      setSuccess("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      setError("Failed to update profile");
      console.error(err);
    } finally {
      setUpdating(false);
    }
  }

  function handleContinueToDashboard() {
    navigate("/dashboard");
  }

  // For newly created accounts, show the welcome screen
  const isNewAccount = !age && !address && !phone;

  return (
    <div className="dashboard-container">
      <NavBar />
      <div className="auth-container">
        <div className="profile-card fade-in" style={{ maxWidth: "650px" }}>
          <div className="profile-header">
            <h3 className="mb-0">
              {isNewAccount ? "Welcome to SCMS" : "Profile Management"}
            </h3>
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
              <>
                {isNewAccount && (
                  <div className="mb-4">
                    <h4>Your Account has been Created!</h4>
                    <p className="text-muted">
                      Your Smart Campus Management System account has been
                      successfully created. You can now complete your profile
                      and access all the features available for your role.
                    </p>
                  </div>
                )}

                {isEditing ? (
                  <form onSubmit={handleUpdateProfile}>
                    <div className="mb-3">
                      <label htmlFor="profile-name" className="form-label">
                        Full Name
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
                      <label htmlFor="profile-email" className="form-label">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="profile-email"
                        className="form-control"
                        value={email}
                        disabled
                        readOnly
                      />
                      <div className="form-text">Email cannot be changed.</div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="profile-role" className="form-label">
                        Account Type
                      </label>
                      <input
                        type="text"
                        id="profile-role"
                        className="form-control"
                        value={role}
                        disabled
                        readOnly
                      />
                      <div className="form-text">Role cannot be changed.</div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="profile-age" className="form-label">
                        Age
                      </label>
                      <input
                        type="number"
                        id="profile-age"
                        className="form-control"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        min="10"
                        max="100"
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="profile-phone" className="form-label">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="profile-phone"
                        className="form-control"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g., +1 (123) 456-7890"
                      />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="profile-address" className="form-label">
                        Address
                      </label>
                      <textarea
                        id="profile-address"
                        className="form-control"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={3}
                        placeholder="Full address"
                      ></textarea>
                    </div>

                    <div className="d-flex gap-2 mt-4">
                      <button
                        type="submit"
                        className="btn btn-primary flex-fill"
                        disabled={updating}
                      >
                        {updating ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              role="status"
                              aria-hidden="true"
                            ></span>
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary flex-fill"
                        onClick={() => setIsEditing(false)}
                        disabled={updating}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="mb-0">Personal Information</h5>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setIsEditing(true)}
                      >
                        <i className="bi bi-pencil me-1"></i> Edit Profile
                      </button>
                    </div>

                    <div className="profile-field">
                      <label>Full Name</label>
                      <p>{name || "Not set"}</p>
                    </div>

                    <div className="profile-field">
                      <label>Email Address</label>
                      <p>{email || "Not set"}</p>
                    </div>

                    <div className="profile-field">
                      <label>Account Type</label>
                      <p className="text-capitalize">
                        <span className="badge bg-primary">{role}</span>
                      </p>
                    </div>

                    <div className="profile-field">
                      <label>Age</label>
                      <p>{age || "Not set"}</p>
                    </div>

                    <div className="profile-field">
                      <label>Phone Number</label>
                      <p>{phone || "Not set"}</p>
                    </div>

                    <div className="profile-field">
                      <label>Address</label>
                      <p>{address || "Not set"}</p>
                    </div>

                    <div className="d-grid mt-4">
                      <button
                        className="btn-continue"
                        onClick={handleContinueToDashboard}
                      >
                        {isNewAccount
                          ? "Continue to Dashboard"
                          : "Back to Dashboard"}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
