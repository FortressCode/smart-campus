import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Enrollment,
  StudentEnrollment,
  CourseEnrollment,
} from "../interfaces/Enrollment";
import { Course } from "../interfaces/Course";
import { User } from "../interfaces/User";

const EnrollmentManagement = () => {
  // State for enrollments, students, and courses
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // State for active views and selected items
  const [activeView, setActiveView] = useState("enrollments"); // 'enrollments' or 'students'
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<Enrollment | null>(null);

  // State for filters
  const [courseFilter, setCourseFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // State for forms
  const [isAddingEnrollment, setIsAddingEnrollment] = useState(false);
  const [isEditingEnrollment, setIsEditingEnrollment] = useState(false);

  // Form states for enrollments
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [enrollmentStatus, setEnrollmentStatus] =
    useState<Enrollment["status"]>("Active");
  const [currentSemester, setCurrentSemester] = useState(1);

  // Fetch enrollments, students, and courses on component mount
  useEffect(() => {
    fetchEnrollments();
    fetchStudents();
    fetchCourses();
  }, []);

  // Fetch enrollments from Firestore
  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const enrollmentsCollection = collection(db, "enrollments");
      const enrollmentSnapshot = await getDocs(enrollmentsCollection);
      const enrollmentList = enrollmentSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            enrollmentDate: doc.data().enrollmentDate?.toDate() || new Date(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          } as Enrollment)
      );

      setEnrollments(enrollmentList);
      setError("");
    } catch (err) {
      console.error("Error fetching enrollments:", err);
      setError("Failed to load enrollments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch students from Firestore
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const usersCollection = collection(db, "users");
      const userSnapshot = await getDocs(usersCollection);
      const studentList = userSnapshot.docs
        .map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate() || new Date(),
              updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            } as User)
        )
        .filter((user) => user.role === "student");

      setStudents(studentList);
      setError("");
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to load students. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch courses from Firestore
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const coursesCollection = collection(db, "courses");
      const courseSnapshot = await getDocs(coursesCollection);
      const courseList = courseSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Course)
      );

      setCourses(courseList);
      setError("");
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError("Failed to load courses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Reset enrollment form
  const resetEnrollmentForm = () => {
    setSelectedStudent("");
    setSelectedCourse("");
    setAcademicYear("");
    setEnrollmentStatus("Active");
    setCurrentSemester(1);
  };

  // Handle enrollment edit
  const handleEditEnrollment = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setSelectedStudent(enrollment.studentId);
    setSelectedCourse(enrollment.courseId);
    setAcademicYear(enrollment.academicYear);
    setEnrollmentStatus(enrollment.status);
    setCurrentSemester(enrollment.semester);
    setIsEditingEnrollment(true);
    setIsAddingEnrollment(true);
  };

  // Handle enrollment submission
  const handleEnrollmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const enrollmentData: Omit<Enrollment, "id"> = {
        studentId: selectedStudent,
        courseId: selectedCourse,
        enrollmentDate: new Date(),
        status: enrollmentStatus,
        academicYear: academicYear,
        semester: currentSemester,
        grade: [],
        attendance: [],
        fees: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (isEditingEnrollment && selectedEnrollment) {
        // Update existing enrollment
        const enrollmentRef = doc(db, "enrollments", selectedEnrollment.id);
        await updateDoc(enrollmentRef, {
          ...enrollmentData,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Add new enrollment
        await addDoc(collection(db, "enrollments"), {
          ...enrollmentData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Reset form and refresh enrollments
      resetEnrollmentForm();
      setIsAddingEnrollment(false);
      setIsEditingEnrollment(false);
      fetchEnrollments();
    } catch (err) {
      console.error("Error saving enrollment:", err);
      setError("Failed to save enrollment. Please try again.");
    }
  };

  // Handle enrollment deletion
  const handleDeleteEnrollment = async (enrollmentId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this enrollment? This action cannot be undone."
      )
    ) {
      try {
        await deleteDoc(doc(db, "enrollments", enrollmentId));
        fetchEnrollments();
      } catch (err) {
        console.error("Error deleting enrollment:", err);
        setError("Failed to delete enrollment. Please try again.");
      }
    }
  };

  // Filter enrollments based on selected filters and search query
  const filteredEnrollments = enrollments.filter((enrollment) => {
    const courseMatch =
      courseFilter === "All" || enrollment.courseId === courseFilter;
    const statusMatch =
      statusFilter === "All" || enrollment.status === statusFilter;
    const searchMatch =
      !searchQuery ||
      students
        .find((s) => s.id === enrollment.studentId)
        ?.name.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      courses
        .find((c) => c.id === enrollment.courseId)
        ?.title.toLowerCase()
        .includes(searchQuery.toLowerCase());

    return courseMatch && statusMatch && searchMatch;
  });

  // Get available courses for filter
  const availableCourses = ["All", ...courses.map((course) => course.id)];

  // Get enrollment statuses
  const enrollmentStatuses = [
    "All",
    "Active",
    "Completed",
    "Withdrawn",
    "On Hold",
  ];

  return (
    <div className="enrollment-management">
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Navigation tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${
              activeView === "enrollments" ? "active" : ""
            }`}
            onClick={() => setActiveView("enrollments")}
          >
            Enrollments
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeView === "students" ? "active" : ""}`}
            onClick={() => setActiveView("students")}
          >
            Students
          </button>
        </li>
      </ul>

      {/* Enrollments View */}
      {activeView === "enrollments" && (
        <div className="enrollments-view">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4>Enrollment Management</h4>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetEnrollmentForm();
                setIsAddingEnrollment(true);
                setIsEditingEnrollment(false);
              }}
            >
              <i className="bi bi-plus-circle me-2"></i>Add New Enrollment
            </button>
          </div>

          {/* Filters */}
          <div className="row mb-4">
            <div className="col-md-3">
              <select
                className="form-select"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
              >
                {availableCourses.map((courseId) => (
                  <option key={courseId} value={courseId}>
                    {courseId === "All"
                      ? "All Courses"
                      : courses.find((c) => c.id === courseId)?.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {enrollmentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search by student name or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Enrollment list */}
          {loading ? (
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Academic Year</th>
                    <th>Semester</th>
                    <th>Status</th>
                    <th>Enrollment Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnrollments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center">
                        No enrollments found.
                      </td>
                    </tr>
                  ) : (
                    filteredEnrollments.map((enrollment) => {
                      const student = students.find(
                        (s) => s.id === enrollment.studentId
                      );
                      const course = courses.find(
                        (c) => c.id === enrollment.courseId
                      );

                      return (
                        <tr key={enrollment.id}>
                          <td>{student?.name || "Unknown Student"}</td>
                          <td>{course?.title || "Unknown Course"}</td>
                          <td>{enrollment.academicYear}</td>
                          <td>{enrollment.semester}</td>
                          <td>
                            <span
                              className={`badge bg-${
                                enrollment.status === "Active"
                                  ? "success"
                                  : enrollment.status === "Completed"
                                  ? "info"
                                  : enrollment.status === "Withdrawn"
                                  ? "danger"
                                  : "warning"
                              }`}
                            >
                              {enrollment.status}
                            </span>
                          </td>
                          <td>
                            {enrollment.enrollmentDate.toLocaleDateString()}
                          </td>
                          <td>
                            <div className="btn-group">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEditEnrollment(enrollment)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() =>
                                  handleDeleteEnrollment(enrollment.id)
                                }
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Enrollment Form Modal */}
          {isAddingEnrollment && (
            <div
              className="modal show"
              style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {isEditingEnrollment
                        ? "Edit Enrollment"
                        : "Add New Enrollment"}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setIsAddingEnrollment(false)}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <form onSubmit={handleEnrollmentSubmit}>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label className="form-label">Student</label>
                          <select
                            className="form-select"
                            required
                            value={selectedStudent}
                            onChange={(e) => setSelectedStudent(e.target.value)}
                          >
                            <option value="">Select a student</option>
                            {students.map((student) => (
                              <option key={student.id} value={student.id}>
                                {student.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Course</label>
                          <select
                            className="form-select"
                            required
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                          >
                            <option value="">Select a course</option>
                            {courses.map((course) => (
                              <option key={course.id} value={course.id}>
                                {course.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-4">
                          <label className="form-label">Academic Year</label>
                          <input
                            type="text"
                            className="form-control"
                            required
                            placeholder="e.g., 2023-2024"
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Current Semester</label>
                          <input
                            type="number"
                            className="form-control"
                            required
                            min={1}
                            max={8}
                            value={currentSemester}
                            onChange={(e) =>
                              setCurrentSemester(Number(e.target.value))
                            }
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Status</label>
                          <select
                            className="form-select"
                            required
                            value={enrollmentStatus}
                            onChange={(e) =>
                              setEnrollmentStatus(
                                e.target.value as Enrollment["status"]
                              )
                            }
                          >
                            <option value="Active">Active</option>
                            <option value="Completed">Completed</option>
                            <option value="Withdrawn">Withdrawn</option>
                            <option value="On Hold">On Hold</option>
                          </select>
                        </div>
                      </div>
                      <div className="modal-footer">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setIsAddingEnrollment(false)}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                          {isEditingEnrollment
                            ? "Update Enrollment"
                            : "Add Enrollment"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Students View */}
      {activeView === "students" && (
        <div className="students-view">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4>Student Enrollments</h4>
          </div>

          {/* Student list with their enrollments */}
          {loading ? (
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="row">
              {students.length === 0 ? (
                <div className="col-12 text-center">
                  <p>No students found.</p>
                </div>
              ) : (
                students.map((student) => {
                  const studentEnrollments = enrollments.filter(
                    (e) => e.studentId === student.id
                  );

                  return (
                    <div className="col-md-6 col-lg-4 mb-4" key={student.id}>
                      <div className="card h-100">
                        <div className="card-header">
                          <h5 className="mb-0">{student.name}</h5>
                        </div>
                        <div className="card-body">
                          <p className="card-text small text-muted">
                            {student.email}
                          </p>
                          <h6 className="mt-3">Enrolled Courses:</h6>
                          {studentEnrollments.length === 0 ? (
                            <p className="text-muted small">No enrollments</p>
                          ) : (
                            <ul className="list-unstyled mb-0">
                              {studentEnrollments.map((enrollment) => {
                                const course = courses.find(
                                  (c) => c.id === enrollment.courseId
                                );
                                return (
                                  <li key={enrollment.id} className="mb-2">
                                    <small>
                                      <strong>
                                        {course?.title || "Unknown Course"}
                                      </strong>
                                      <br />
                                      Semester: {enrollment.semester} | Status:{" "}
                                      {enrollment.status}
                                    </small>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnrollmentManagement;
