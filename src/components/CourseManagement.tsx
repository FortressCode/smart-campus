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
} from "firebase/firestore";
import { db } from "../firebase";
import { Course, Module } from "../interfaces/Course";

const CourseManagement = () => {
  // State for courses and modules
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // State for active views and selected items
  const [activeView, setActiveView] = useState("courses"); // 'courses' or 'modules'
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  // State for filters
  const [levelFilter, setLevelFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // State for forms
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [isEditingModule, setIsEditingModule] = useState(false);

  // Form states for courses
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseLevel, setCourseLevel] =
    useState<Course["level"]>("Bachelor's Degree");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseDepartment, setCourseDepartment] = useState("");
  const [courseDuration, setCourseDuration] = useState(3);
  const [courseCredits, setCourseCredits] = useState(180);
  const [courseCoordinator, setCourseCoordinator] = useState("");
  const [courseStatus, setCourseStatus] = useState<Course["status"]>("Active");
  const [courseModules, setCourseModules] = useState<string[]>([]);

  // Form states for modules
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleCode, setModuleCode] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [moduleCredits, setModuleCredits] = useState(20);
  const [moduleSemester, setModuleSemester] = useState(1);
  const [modulePrerequisites, setModulePrerequisites] = useState<string[]>([]);
  const [moduleLecturers, setModuleLecturers] = useState<string[]>([]);
  const [moduleLearningOutcomes, setModuleLearningOutcomes] = useState<
    string[]
  >([""]);
  const [moduleAssessmentMethods, setModuleAssessmentMethods] = useState<
    { type: string; weight: number }[]
  >([
    { type: "Examination", weight: 60 },
    { type: "Coursework", weight: 40 },
  ]);

  // Fetch courses and modules on component mount
  useEffect(() => {
    fetchCourses();
    fetchModules();
  }, []);

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
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
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

  // Fetch modules from Firestore
  const fetchModules = async () => {
    try {
      setLoading(true);
      const modulesCollection = collection(db, "modules");
      const moduleSnapshot = await getDocs(modulesCollection);
      const moduleList = moduleSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Module)
      );

      setModules(moduleList);
      setError("");
    } catch (err) {
      console.error("Error fetching modules:", err);
      setError("Failed to load modules. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Reset course form
  const resetCourseForm = () => {
    setCourseTitle("");
    setCourseCode("");
    setCourseLevel("Bachelor's Degree");
    setCourseDescription("");
    setCourseDepartment("");
    setCourseDuration(3);
    setCourseCredits(180);
    setCourseCoordinator("");
    setCourseStatus("Active");
    setCourseModules([]);
  };

  // Reset module form
  const resetModuleForm = () => {
    setModuleTitle("");
    setModuleCode("");
    setModuleDescription("");
    setModuleCredits(20);
    setModuleSemester(1);
    setModulePrerequisites([]);
    setModuleLecturers([]);
    setModuleLearningOutcomes([""]);
    setModuleAssessmentMethods([
      { type: "Examination", weight: 60 },
      { type: "Coursework", weight: 40 },
    ]);
  };

  // Handle course edit
  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setCourseTitle(course.title);
    setCourseCode(course.code);
    setCourseLevel(course.level);
    setCourseDescription(course.description);
    setCourseDepartment(course.department);
    setCourseDuration(course.duration);
    setCourseCredits(course.credits);
    setCourseCoordinator(course.coordinator);
    setCourseStatus(course.status);
    setCourseModules(course.modules);
    setIsEditingCourse(true);
    setIsAddingCourse(true);
  };

  // Handle module edit
  const handleEditModule = (module: Module) => {
    setSelectedModule(module);
    setModuleTitle(module.title);
    setModuleCode(module.code);
    setModuleDescription(module.description);
    setModuleCredits(module.credits);
    setModuleSemester(module.semester);
    setModulePrerequisites(module.prerequisites);
    setModuleLecturers(module.lecturers);
    setModuleLearningOutcomes(module.learningOutcomes);
    setModuleAssessmentMethods(module.assessmentMethods);
    setIsEditingModule(true);
    setIsAddingModule(true);
  };

  // Handle course submission
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const courseData: Omit<Course, "id"> = {
        title: courseTitle,
        code: courseCode,
        level: courseLevel,
        description: courseDescription,
        department: courseDepartment,
        duration: courseDuration,
        credits: courseCredits,
        coordinator: courseCoordinator,
        status: courseStatus,
        modules: courseModules,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (isEditingCourse && selectedCourse) {
        // Update existing course
        const courseRef = doc(db, "courses", selectedCourse.id);
        await updateDoc(courseRef, {
          ...courseData,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Add new course
        await addDoc(collection(db, "courses"), {
          ...courseData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Reset form and refresh courses
      resetCourseForm();
      setIsAddingCourse(false);
      setIsEditingCourse(false);
      fetchCourses();
    } catch (err) {
      console.error("Error saving course:", err);
      setError("Failed to save course. Please try again.");
    }
  };

  // Handle module submission
  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const moduleData: Omit<Module, "id"> = {
        title: moduleTitle,
        code: moduleCode,
        description: moduleDescription,
        credits: moduleCredits,
        semester: moduleSemester,
        prerequisites: modulePrerequisites,
        lecturers: moduleLecturers,
        learningOutcomes: moduleLearningOutcomes,
        assessmentMethods: moduleAssessmentMethods,
      };

      if (isEditingModule && selectedModule) {
        // Update existing module
        const moduleRef = doc(db, "modules", selectedModule.id);
        await updateDoc(moduleRef, moduleData);
      } else {
        // Add new module
        await addDoc(collection(db, "modules"), moduleData);
      }

      // Reset form and refresh modules
      resetModuleForm();
      setIsAddingModule(false);
      setIsEditingModule(false);
      fetchModules();
    } catch (err) {
      console.error("Error saving module:", err);
      setError("Failed to save module. Please try again.");
    }
  };

  // Handle course deletion
  const handleDeleteCourse = async (courseId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this course? This action cannot be undone."
      )
    ) {
      try {
        await deleteDoc(doc(db, "courses", courseId));
        fetchCourses();
      } catch (err) {
        console.error("Error deleting course:", err);
        setError("Failed to delete course. Please try again.");
      }
    }
  };

  // Handle module deletion
  const handleDeleteModule = async (moduleId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this module? This action cannot be undone."
      )
    ) {
      try {
        await deleteDoc(doc(db, "modules", moduleId));
        fetchModules();
      } catch (err) {
        console.error("Error deleting module:", err);
        setError("Failed to delete module. Please try again.");
      }
    }
  };

  // Add learning outcome field
  const handleAddLearningOutcome = () => {
    setModuleLearningOutcomes([...moduleLearningOutcomes, ""]);
  };

  // Update learning outcome
  const handleUpdateLearningOutcome = (index: number, value: string) => {
    const updatedOutcomes = [...moduleLearningOutcomes];
    updatedOutcomes[index] = value;
    setModuleLearningOutcomes(updatedOutcomes);
  };

  // Remove learning outcome
  const handleRemoveLearningOutcome = (index: number) => {
    const updatedOutcomes = [...moduleLearningOutcomes];
    updatedOutcomes.splice(index, 1);
    setModuleLearningOutcomes(updatedOutcomes);
  };

  // Add assessment method
  const handleAddAssessmentMethod = () => {
    setModuleAssessmentMethods([
      ...moduleAssessmentMethods,
      { type: "", weight: 0 },
    ]);
  };

  // Update assessment method
  const handleUpdateAssessmentMethod = (
    index: number,
    field: "type" | "weight",
    value: string | number
  ) => {
    const updatedMethods = [...moduleAssessmentMethods];
    updatedMethods[index] = {
      ...updatedMethods[index],
      [field]: field === "weight" ? Number(value) : value,
    };
    setModuleAssessmentMethods(updatedMethods);
  };

  // Remove assessment method
  const handleRemoveAssessmentMethod = (index: number) => {
    const updatedMethods = [...moduleAssessmentMethods];
    updatedMethods.splice(index, 1);
    setModuleAssessmentMethods(updatedMethods);
  };

  // Filter courses based on selected filters and search query
  const filteredCourses = courses.filter((course) => {
    const levelMatch = levelFilter === "All" || course.level === levelFilter;
    const departmentMatch =
      departmentFilter === "All" || course.department === departmentFilter;
    const searchMatch =
      !searchQuery ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase());

    return levelMatch && departmentMatch && searchMatch;
  });

  // Get available departments from courses
  const departments = [
    "All",
    ...new Set(courses.map((course) => course.department)),
  ];

  // Get course levels
  const courseLevels = [
    "All",
    "Diploma",
    "Associate Degree",
    "Bachelor's Degree",
    "Top up Degree",
    "Postgraduate Diploma",
    "Master's Degree",
    "PhD",
  ];

  return (
    <div className="course-management">
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Navigation tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeView === "courses" ? "active" : ""}`}
            onClick={() => setActiveView("courses")}
          >
            Courses
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeView === "modules" ? "active" : ""}`}
            onClick={() => setActiveView("modules")}
          >
            Modules
          </button>
        </li>
      </ul>

      {/* Courses View */}
      {activeView === "courses" && (
        <div className="courses-view">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4>Course Management</h4>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetCourseForm();
                setIsAddingCourse(true);
                setIsEditingCourse(false);
              }}
            >
              <i className="bi bi-plus-circle me-2"></i>Add New Course
            </button>
          </div>

          {/* Filters */}
          <div className="row mb-4">
            <div className="col-md-3">
              <select
                className="form-select"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                {courseLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search by title or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Course list */}
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
                    <th>Code</th>
                    <th>Title</th>
                    <th>Level</th>
                    <th>Department</th>
                    <th>Duration</th>
                    <th>Credits</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center">
                        No courses found.
                      </td>
                    </tr>
                  ) : (
                    filteredCourses.map((course) => (
                      <tr key={course.id}>
                        <td>{course.code}</td>
                        <td>{course.title}</td>
                        <td>{course.level}</td>
                        <td>{course.department}</td>
                        <td>{course.duration} years</td>
                        <td>{course.credits}</td>
                        <td>
                          <span
                            className={`badge bg-${
                              course.status === "Active"
                                ? "success"
                                : course.status === "Inactive"
                                ? "danger"
                                : "warning"
                            }`}
                          >
                            {course.status}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleEditCourse(course)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteCourse(course.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Course Form Modal */}
          {isAddingCourse && (
            <div
              className="modal show"
              style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {isEditingCourse ? "Edit Course" : "Add New Course"}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setIsAddingCourse(false)}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <form onSubmit={handleCourseSubmit}>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label className="form-label">Course Title</label>
                          <input
                            type="text"
                            className="form-control"
                            required
                            value={courseTitle}
                            onChange={(e) => setCourseTitle(e.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Course Code</label>
                          <input
                            type="text"
                            className="form-control"
                            required
                            value={courseCode}
                            onChange={(e) => setCourseCode(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label className="form-label">Level</label>
                          <select
                            className="form-select"
                            value={courseLevel}
                            onChange={(e) =>
                              setCourseLevel(e.target.value as Course["level"])
                            }
                          >
                            <option value="Diploma">Diploma</option>
                            <option value="Associate Degree">
                              Associate Degree
                            </option>
                            <option value="Bachelor's Degree">
                              Bachelor's Degree
                            </option>
                            <option value="Top up Degree">Top up Degree</option>
                            <option value="Postgraduate Diploma">
                              Postgraduate Diploma
                            </option>
                            <option value="Master's Degree">
                              Master's Degree
                            </option>
                            <option value="PhD">PhD</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Department</label>
                          <input
                            type="text"
                            className="form-control"
                            required
                            value={courseDepartment}
                            onChange={(e) =>
                              setCourseDepartment(e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={courseDescription}
                          onChange={(e) => setCourseDescription(e.target.value)}
                        ></textarea>
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-4">
                          <label className="form-label">Duration (years)</label>
                          <input
                            type="number"
                            className="form-control"
                            required
                            min={1}
                            max={10}
                            value={courseDuration}
                            onChange={(e) =>
                              setCourseDuration(Number(e.target.value))
                            }
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Credits</label>
                          <input
                            type="number"
                            className="form-control"
                            required
                            min={1}
                            value={courseCredits}
                            onChange={(e) =>
                              setCourseCredits(Number(e.target.value))
                            }
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Status</label>
                          <select
                            className="form-select"
                            value={courseStatus}
                            onChange={(e) =>
                              setCourseStatus(
                                e.target.value as Course["status"]
                              )
                            }
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Pending Approval">
                              Pending Approval
                            </option>
                          </select>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Course Coordinator</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={courseCoordinator}
                          onChange={(e) => setCourseCoordinator(e.target.value)}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Modules</label>
                        <select
                          className="form-select"
                          multiple
                          value={courseModules}
                          onChange={(e) => {
                            const options = Array.from(
                              e.target.selectedOptions,
                              (option) => option.value
                            );
                            setCourseModules(options);
                          }}
                          style={{ height: "150px" }}
                        >
                          {modules.map((module) => (
                            <option key={module.id} value={module.id}>
                              {module.code} - {module.title}
                            </option>
                          ))}
                        </select>
                        <small className="form-text text-muted">
                          Hold Ctrl (or Cmd on Mac) to select multiple modules
                        </small>
                      </div>
                      <div className="modal-footer">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setIsAddingCourse(false)}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                          {isEditingCourse ? "Update Course" : "Add Course"}
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

      {/* Modules View */}
      {activeView === "modules" && (
        <div className="modules-view">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4>Module Management</h4>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetModuleForm();
                setIsAddingModule(true);
                setIsEditingModule(false);
              }}
            >
              <i className="bi bi-plus-circle me-2"></i>Add New Module
            </button>
          </div>

          {/* Module list */}
          {loading ? (
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="row">
              {modules.length === 0 ? (
                <div className="col-12 text-center">
                  <p>No modules found.</p>
                </div>
              ) : (
                modules.map((module) => (
                  <div className="col-md-6 col-lg-4 mb-4" key={module.id}>
                    <div className="card h-100">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">{module.code}</h5>
                        <div className="btn-group">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEditModule(module)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteModule(module.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                      <div className="card-body">
                        <h6 className="card-title">{module.title}</h6>
                        <p className="card-text small text-muted">
                          {module.description}
                        </p>
                        <div className="mb-2">
                          <small>
                            <strong>Credits:</strong> {module.credits}
                          </small>
                        </div>
                        <div className="mb-2">
                          <small>
                            <strong>Semester:</strong> {module.semester}
                          </small>
                        </div>
                        <div className="mb-2">
                          <small>
                            <strong>Assessment:</strong>
                          </small>
                          <ul className="list-unstyled ms-3 mb-0">
                            {module.assessmentMethods.map((method, index) => (
                              <li key={index}>
                                <small>
                                  {method.type}: {method.weight}%
                                </small>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Module Form Modal */}
          {isAddingModule && (
            <div
              className="modal show"
              style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {isEditingModule ? "Edit Module" : "Add New Module"}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setIsAddingModule(false)}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <form onSubmit={handleModuleSubmit}>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label className="form-label">Module Title</label>
                          <input
                            type="text"
                            className="form-control"
                            required
                            value={moduleTitle}
                            onChange={(e) => setModuleTitle(e.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Module Code</label>
                          <input
                            type="text"
                            className="form-control"
                            required
                            value={moduleCode}
                            onChange={(e) => setModuleCode(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={moduleDescription}
                          onChange={(e) => setModuleDescription(e.target.value)}
                        ></textarea>
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label className="form-label">Credits</label>
                          <input
                            type="number"
                            className="form-control"
                            required
                            min={1}
                            value={moduleCredits}
                            onChange={(e) =>
                              setModuleCredits(Number(e.target.value))
                            }
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Semester</label>
                          <input
                            type="number"
                            className="form-control"
                            required
                            min={1}
                            max={8}
                            value={moduleSemester}
                            onChange={(e) =>
                              setModuleSemester(Number(e.target.value))
                            }
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Lecturers</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Comma-separated list of lecturers"
                          value={moduleLecturers.join(", ")}
                          onChange={(e) =>
                            setModuleLecturers(
                              e.target.value
                                .split(",")
                                .map((item) => item.trim())
                            )
                          }
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Prerequisites</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Comma-separated list of prerequisites"
                          value={modulePrerequisites.join(", ")}
                          onChange={(e) =>
                            setModulePrerequisites(
                              e.target.value
                                .split(",")
                                .map((item) => item.trim())
                            )
                          }
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label d-flex justify-content-between align-items-center">
                          <span>Learning Outcomes</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={handleAddLearningOutcome}
                          >
                            <i className="bi bi-plus"></i> Add
                          </button>
                        </label>
                        {moduleLearningOutcomes.map((outcome, index) => (
                          <div className="input-group mb-2" key={index}>
                            <input
                              type="text"
                              className="form-control"
                              value={outcome}
                              onChange={(e) =>
                                handleUpdateLearningOutcome(
                                  index,
                                  e.target.value
                                )
                              }
                              placeholder={`Learning outcome ${index + 1}`}
                            />
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() => handleRemoveLearningOutcome(index)}
                              disabled={moduleLearningOutcomes.length <= 1}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="mb-3">
                        <label className="form-label d-flex justify-content-between align-items-center">
                          <span>Assessment Methods</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={handleAddAssessmentMethod}
                          >
                            <i className="bi bi-plus"></i> Add
                          </button>
                        </label>
                        {moduleAssessmentMethods.map((method, index) => (
                          <div className="row mb-2" key={index}>
                            <div className="col-md-8">
                              <input
                                type="text"
                                className="form-control"
                                value={method.type}
                                onChange={(e) =>
                                  handleUpdateAssessmentMethod(
                                    index,
                                    "type",
                                    e.target.value
                                  )
                                }
                                placeholder="Assessment type"
                              />
                            </div>
                            <div className="col-md-3">
                              <div className="input-group">
                                <input
                                  type="number"
                                  className="form-control"
                                  value={method.weight}
                                  onChange={(e) =>
                                    handleUpdateAssessmentMethod(
                                      index,
                                      "weight",
                                      e.target.value
                                    )
                                  }
                                  min={0}
                                  max={100}
                                />
                                <span className="input-group-text">%</span>
                              </div>
                            </div>
                            <div className="col-md-1">
                              <button
                                type="button"
                                className="btn btn-outline-danger w-100"
                                onClick={() =>
                                  handleRemoveAssessmentMethod(index)
                                }
                                disabled={moduleAssessmentMethods.length <= 1}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                        {/* Show total weight */}
                        <div className="text-end mt-2">
                          <small
                            className={`${
                              moduleAssessmentMethods.reduce(
                                (sum, m) => sum + m.weight,
                                0
                              ) === 100
                                ? "text-success"
                                : "text-danger"
                            }`}
                          >
                            Total:{" "}
                            {moduleAssessmentMethods.reduce(
                              (sum, m) => sum + m.weight,
                              0
                            )}
                            %
                            {moduleAssessmentMethods.reduce(
                              (sum, m) => sum + m.weight,
                              0
                            ) !== 100 && " (should be 100%)"}
                          </small>
                        </div>
                      </div>

                      <div className="modal-footer">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setIsAddingModule(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={
                            moduleAssessmentMethods.reduce(
                              (sum, m) => sum + m.weight,
                              0
                            ) !== 100
                          }
                        >
                          {isEditingModule ? "Update Module" : "Add Module"}
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
    </div>
  );
};

export default CourseManagement;
