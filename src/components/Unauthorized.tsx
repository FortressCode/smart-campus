import React from "react";
import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();

  const goBack = () => {
    navigate(-1);
  };

  return (
    <div className="container d-flex flex-column justify-content-center align-items-center min-vh-100">
      <div className="text-center">
        <div className="mb-4">
          <i className="bi bi-exclamation-triangle-fill text-warning display-1"></i>
        </div>
        <h1 className="fw-bold mb-3">Access Denied</h1>
        <p className="text-muted mb-4">
          You don't have permission to access this page. Please contact your
          system administrator if you believe this is an error.
        </p>
        <div className="d-flex justify-content-center gap-3">
          <button onClick={goBack} className="btn btn-primary">
            Go Back
          </button>
          <button
            onClick={() => navigate("/login")}
            className="btn btn-outline-primary"
          >
            Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
