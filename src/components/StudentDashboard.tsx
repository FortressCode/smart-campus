import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import NavBar from "./NavBar";

export default function StudentDashboard() {
  const { userData } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <NavBar />
      <div className="dashboard-content">
        <div className="container">
          <div className="row mb-4">
            <div className="col-12">
              <h1 className="fw-bold">Student Dashboard</h1>
              <p className="text-muted">
                Welcome, {userData?.name || "Student"}! Manage your classes,
                access learning materials, and participate in campus activities.
              </p>
            </div>
          </div>

          {/* Student Dashboard Cards */}
          <div className="row g-4 mb-5">
            <div className="col-sm-6 col-lg-3">
              <div className="dashboard-card">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="mb-0">My Classes</h5>
                  <div className="bg-primary bg-opacity-10 rounded-circle p-2">
                    <i className="bi bi-calendar-check fs-4 text-primary"></i>
                  </div>
                </div>
                <p className="text-muted mb-0">View your class schedules</p>
              </div>
            </div>

            <div className="col-sm-6 col-lg-3">
              <div className="dashboard-card">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="mb-0">Events</h5>
                  <div className="bg-success bg-opacity-10 rounded-circle p-2">
                    <i className="bi bi-calendar-event fs-4 text-success"></i>
                  </div>
                </div>
                <p className="text-muted mb-0">Upcoming campus events</p>
              </div>
            </div>

            <div className="col-sm-6 col-lg-3">
              <div className="dashboard-card">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="mb-0">Resources</h5>
                  <div className="bg-warning bg-opacity-10 rounded-circle p-2">
                    <i className="bi bi-folder fs-4 text-warning"></i>
                  </div>
                </div>
                <p className="text-muted mb-0">Access study materials</p>
              </div>
            </div>

            <div className="col-sm-6 col-lg-3">
              <div className="dashboard-card">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="mb-0">Reservations</h5>
                  <div className="bg-danger bg-opacity-10 rounded-circle p-2">
                    <i className="bi bi-building fs-4 text-danger"></i>
                  </div>
                </div>
                <p className="text-muted mb-0">
                  Book study spaces and equipment
                </p>
              </div>
            </div>
          </div>

          {/* Student Schedule and Updates */}
          <div className="row">
            <div className="col-lg-7 mb-4 mb-lg-0">
              <div className="dashboard-card">
                <h5 className="mb-4">Today's Schedule</h5>
                <div className="mb-3 border-start border-primary border-3 ps-3">
                  <h6 className="mb-1">Introduction to Computer Science</h6>
                  <small className="text-muted d-block mb-2">
                    9:00 AM - 10:30 AM
                  </small>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="badge bg-primary">Room 302</span>
                    <button className="btn btn-sm btn-outline-primary">
                      Materials
                    </button>
                  </div>
                </div>

                <div className="mb-3 border-start border-primary border-3 ps-3">
                  <h6 className="mb-1">Mathematics for Engineers</h6>
                  <small className="text-muted d-block mb-2">
                    1:00 PM - 2:30 PM
                  </small>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="badge bg-primary">Room 201</span>
                    <button className="btn btn-sm btn-outline-primary">
                      Materials
                    </button>
                  </div>
                </div>

                <div className="mb-0 border-start border-success border-3 ps-3">
                  <h6 className="mb-1">Programming Club Meeting</h6>
                  <small className="text-muted d-block mb-2">
                    4:00 PM - 5:30 PM
                  </small>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="badge bg-success">Student Center</span>
                    <button className="btn btn-sm btn-outline-success">
                      Details
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="dashboard-card">
                <h5 className="mb-4">Latest Updates</h5>
                <div className="list-group">
                  <div className="list-group-item list-group-item-action border-0 px-0">
                    <div className="d-flex w-100 justify-content-between">
                      <h6 className="mb-1">Assignment Due: Data Structures</h6>
                      <small className="text-danger">Tomorrow</small>
                    </div>
                    <p className="mb-1">
                      Final submission for the binary tree implementation is due
                      tomorrow at 11:59 PM.
                    </p>
                    <button className="btn btn-sm btn-outline-primary">
                      View Assignment
                    </button>
                  </div>

                  <div className="list-group-item list-group-item-action border-0 px-0">
                    <div className="d-flex w-100 justify-content-between">
                      <h6 className="mb-1">New Learning Materials Available</h6>
                      <small className="text-muted">2 days ago</small>
                    </div>
                    <p className="mb-1">
                      Prof. Johnson has uploaded new lecture notes and practice
                      problems for CS202.
                    </p>
                    <button className="btn btn-sm btn-outline-primary">
                      Access Materials
                    </button>
                  </div>

                  <div className="list-group-item list-group-item-action border-0 px-0">
                    <div className="d-flex w-100 justify-content-between">
                      <h6 className="mb-1">Campus Career Fair</h6>
                      <small className="text-muted">5 days ago</small>
                    </div>
                    <p className="mb-1">
                      Annual Tech Career Fair will be held next month.
                      Registration is now open.
                    </p>
                    <button className="btn btn-sm btn-outline-primary">
                      Register Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
