import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { currentUser, logout, userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Set loading to false after a short delay to ensure auth context has loaded
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Check if user email is verified, but skip for admin account
    if (
      currentUser &&
      !currentUser.emailVerified &&
      currentUser.email?.toLowerCase() !== "vertexcampusmain@gmail.com"
    ) {
      // Log the user out and redirect to login page with a message
      logout().then(() => {
        navigate("/login", {
          state: {
            message: "Please verify your email before accessing the dashboard.",
          },
        });
      });
      return;
    }

    if (userData && !loading) {
      // Redirect based on user role
      switch (userData.role) {
        case "admin":
          navigate("/admin");
          break;
        case "lecturer":
          navigate("/lecturer");
          break;
        case "student":
          navigate("/student");
          break;
        default:
          // If role is not set or is invalid, default to student view
          navigate("/student");
      }
    }
  }, [userData, navigate, loading, currentUser, logout]);

  async function handleLogout() {
    setError("");

    try {
      await logout();
      navigate("/login");
    } catch {
      setError("Failed to log out");
    }
  }

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="text-center">
        {error && (
          <div className="alert alert-danger mb-4" role="alert">
            {error}
          </div>
        )}
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
