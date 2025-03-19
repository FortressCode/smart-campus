import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("student"); // Default role
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== passwordConfirm) {
      return setError("Passwords do not match");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    try {
      setError("");
      setLoading(true);
      const userCredential = await signup(email, password, name, role);
      // Show verification message instead of redirecting
      setVerificationSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to create an account");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        <div className="auth-header">
          <h2>Create an Account</h2>
          <p className="text-muted">Join the Smart Campus Management System</p>
        </div>

        {error && (
          <div className="alert alert-danger mb-4" role="alert">
            {error}
          </div>
        )}

        {verificationSent ? (
          <div className="text-center py-4">
            <div className="mb-3">
              <i className="bi bi-envelope-check text-success fs-1"></i>
            </div>
            <h4 className="mb-3">Verify Your Email</h4>
            <p className="mb-4">
              A verification email has been sent to <strong>{email}</strong>.
              Please check your inbox and click the verification link to
              activate your account.
            </p>
            <div className="d-flex justify-content-center">
              <Link to="/login" className="btn btn-primary me-2">
                Go to Login
              </Link>
              <button
                onClick={() => navigate("/login")}
                className="btn btn-outline-secondary"
              >
                I'll verify later
              </button>
            </div>
            <p className="text-muted mt-3 small">
              Didn't receive the email? Check your spam folder or
              <button
                onClick={async () => {
                  try {
                    // Re-signup will fail, but we just want to trigger another verification email
                    await signup(email, password, name, role);
                  } catch (err) {
                    // The error is expected, so we don't show it to the user
                  }
                }}
                className="btn btn-link p-0 m-0 align-baseline text-decoration-none"
              >
                <small> click here to resend</small>
              </button>
            </p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="form-control"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label htmlFor="email-address" className="form-label">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="form-control"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="form-text">
                You'll need to verify this email address.
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="role" className="form-label">
                Role
              </label>
              <select
                id="role"
                name="role"
                required
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="lecturer">Lecturer</option>
              </select>
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="form-text">
                Password must be at least 6 characters.
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="password-confirm" className="form-label">
                Confirm Password
              </label>
              <input
                id="password-confirm"
                name="password-confirm"
                type="password"
                autoComplete="new-password"
                required
                className="form-control"
                placeholder="••••••••"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
            </div>

            <div className="d-grid mb-4">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="mb-0">
                Already have an account?{" "}
                <Link to="/login" className="auth-link">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
