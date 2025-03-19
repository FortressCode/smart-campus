import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, sendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for messages passed from other components
  useEffect(() => {
    if (location.state && location.state.message) {
      setMessage(location.state.message);
      // Clear the message from the location state
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  async function resendVerificationEmail() {
    try {
      // To resend verification email, we need to log in first to get the user object
      const userCredential = await login(email, password);
      if (userCredential.user) {
        await sendVerificationEmail(userCredential.user);
        alert("Verification email sent! Please check your inbox.");
      }
    } catch (err) {
      console.error("Failed to resend verification email", err);
      alert("Failed to resend verification email. Please try again.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setError("");
      setMessage("");
      setLoading(true);
      const userCredential = await login(email, password);

      // Skip email verification check for admin account
      if (email.toLowerCase() === "vertexcampusmain@gmail.com") {
        navigate("/dashboard");
        return;
      }

      // Check if email is verified for other accounts
      if (!userCredential.user.emailVerified) {
        setVerificationRequired(true);
        setLoading(false);
        return;
      }

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to log in");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        <div className="auth-header">
          <h2 className="mb-0">Sign In</h2>
          <p className="text-muted">
            Access your Smart Campus Management System account
          </p>
        </div>

        <div className="auth-body">
          {error && (
            <div className="alert alert-danger mb-4" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className="alert alert-warning mb-4" role="alert">
              {message}
            </div>
          )}

          {verificationRequired ? (
            <div className="text-center py-4">
              <div className="mb-3">
                <i className="bi bi-envelope-exclamation text-warning fs-1"></i>
              </div>
              <h4 className="mb-3">Email Verification Required</h4>
              <p className="mb-4">
                Your email address <strong>{email}</strong> has not been
                verified yet. Please check your inbox for a verification link.
              </p>
              <div className="d-flex justify-content-center">
                <button
                  onClick={resendVerificationEmail}
                  className="btn btn-primary me-2"
                >
                  Resend Verification Email
                </button>
                <button
                  onClick={() => setVerificationRequired(false)}
                  className="btn btn-outline-secondary"
                >
                  Back to Login
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="mb-3">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="form-control"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <Link to="/forgot-password" className="auth-link small">
                    Forgot Password?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="d-grid mb-4">
                <button
                  type="submit"
                  className="btn btn-primary py-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </div>

              <div className="text-center">
                <p className="mb-0">
                  Don't have an account?{" "}
                  <Link to="/signup" className="auth-link">
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
