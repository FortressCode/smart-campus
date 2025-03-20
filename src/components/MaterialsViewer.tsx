import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Material } from "../interfaces/Material";
import { Module } from "../interfaces/Module";

// Props for the MaterialsViewer component
interface MaterialsViewerProps {
  role: "student" | "lecturer"; // The role of the current user
  courseId?: string; // Optional courseId to filter modules (for students)
}

export default function MaterialsViewer({
  role,
  courseId,
}: MaterialsViewerProps) {
  const { userData } = useAuth();
  const { showNotification } = useNotification();

  const [modules, setModules] = useState<Module[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string>("");

  // Get courseId from localStorage if not provided directly
  const [viewingCourseId, setViewingCourseId] = useState<string | undefined>(
    courseId
  );

  // Update viewingCourseId when localStorage changes
  useEffect(() => {
    if (role === "student" && !courseId) {
      const storedCourseId = localStorage.getItem("viewingCourseId");
      if (storedCourseId) {
        setViewingCourseId(storedCourseId);
      }
    }
  }, [role, courseId]);

  // Load modules when component mounts or viewingCourseId changes
  useEffect(() => {
    fetchModules();
  }, [viewingCourseId]);

  // Load materials when selected module changes
  useEffect(() => {
    if (selectedModule) {
      fetchMaterials(selectedModule);
    } else {
      setMaterials([]);
    }
  }, [selectedModule]);

  // Function to fetch modules from Firestore
  const fetchModules = async () => {
    try {
      setLoading(true);
      let modulesQuery;

      if (viewingCourseId) {
        // If viewingCourseId is provided, fetch only modules for that course
        modulesQuery = query(
          collection(db, "modules"),
          where("courseId", "==", viewingCourseId)
        );
        console.log("Fetching modules for course:", viewingCourseId);
      } else {
        // Otherwise fetch all modules (for lecturers)
        modulesQuery = collection(db, "modules");
        console.log("Fetching all modules");
      }

      const moduleSnapshot = await getDocs(modulesQuery);
      const moduleList = moduleSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Module[];

      console.log("Modules found:", moduleList.length);
      setModules(moduleList);
    } catch (error) {
      console.error("Error fetching modules:", error);
      showNotification("Failed to load modules");
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch materials for a specific module
  const fetchMaterials = async (moduleId: string) => {
    try {
      setLoading(true);
      setMaterials([]);

      const materialsQuery = query(
        collection(db, "materials"),
        where("moduleId", "==", moduleId)
      );
      const materialsSnapshot = await getDocs(materialsQuery);

      if (materialsSnapshot.empty) {
        console.log("No materials found for this module");
        setLoading(false);
        return;
      }

      const materialsList = materialsSnapshot.docs.map((doc) => {
        const data = doc.data();
        // Process timestamps
        const processTimestamp = (timestamp: any) => {
          if (!timestamp) return new Date();
          if (timestamp.toDate && typeof timestamp.toDate === "function") {
            return new Date(timestamp.toDate());
          }
          if (timestamp instanceof Date) return timestamp;
          if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000);
          }
          return new Date();
        };

        // Map Firebase field names to our component's expected field names
        return {
          id: doc.id,
          moduleId: data.moduleId || moduleId,
          title: data.title || data.name || "Untitled",
          description: data.description || "",
          fileUrl: data.fileUrl || "",
          fileName:
            data.fileName || data.name || data.fileUrl || "Unknown file",
          fileType: data.fileType || "application/octet-stream",
          fileSize: data.fileSize || data.size || 0,
          uploadedBy: data.uploadedBy || "",
          createdAt: processTimestamp(data.createdAt || data.uploadedAt),
          updatedAt: processTimestamp(data.updatedAt || data.uploadedAt),
        };
      }) as Material[];

      setMaterials(materialsList);
    } catch (error) {
      console.error("Error fetching materials:", error);
      showNotification("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  // Function to get file size in a readable format
  const formatFileSize = (bytes: number) => {
    if (!bytes || isNaN(bytes) || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Function to get file icon based on file type
  const getFileIcon = (fileType: string = "") => {
    if (!fileType) return "bi bi-file-earmark-text";

    if (fileType.includes("pdf")) {
      return "bi bi-file-earmark-pdf";
    } else if (fileType.includes("word") || fileType.includes("doc")) {
      return "bi bi-file-earmark-word";
    } else if (
      fileType.includes("excel") ||
      fileType.includes("sheet") ||
      fileType.includes("csv")
    ) {
      return "bi bi-file-earmark-excel";
    } else if (
      fileType.includes("presentation") ||
      fileType.includes("powerpoint")
    ) {
      return "bi bi-file-earmark-slides";
    } else if (fileType.includes("image")) {
      return "bi bi-file-earmark-image";
    } else if (fileType.includes("video")) {
      return "bi bi-file-earmark-play";
    } else if (fileType.includes("audio")) {
      return "bi bi-file-earmark-music";
    } else if (
      fileType.includes("zip") ||
      fileType.includes("rar") ||
      fileType.includes("tar")
    ) {
      return "bi bi-file-earmark-zip";
    } else {
      return "bi bi-file-earmark-text";
    }
  };

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-file-earmark-text me-2"></i>
                Course Materials
              </h5>
              <p className="text-muted">
                View and download educational materials for your modules.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-4 mb-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Select Module</h6>
            </div>
            <div className="card-body">
              {loading && modules.length === 0 ? (
                <div className="d-flex justify-content-center">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <select
                  className="form-select"
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                >
                  <option value="">Select a module</option>
                  {modules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Materials List</h6>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="d-flex justify-content-center">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : !selectedModule ? (
                <div className="text-center py-5">
                  <i className="bi bi-arrow-left-circle fs-1 text-muted"></i>
                  <p className="mt-3">Select a module to view its materials</p>
                </div>
              ) : materials.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-file-earmark-x fs-1 text-muted"></i>
                  <p className="mt-3">No materials found for this module</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>File Type</th>
                        <th>Size</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((material) => (
                        <tr key={material.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <i
                                className={`${getFileIcon(
                                  material.fileType
                                )} fs-4 me-2`}
                              ></i>
                              <div>
                                <div className="fw-medium">
                                  {material.title}
                                </div>
                                {material.description && (
                                  <small className="text-muted">
                                    {material.description}
                                  </small>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            {material.fileType
                              ? material.fileType
                                  .split("/")
                                  .pop()
                                  ?.toUpperCase()
                              : "Unknown"}
                          </td>
                          <td>{formatFileSize(material.fileSize)}</td>
                          <td>
                            <a
                              href={material.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-outline-primary"
                              title="Download"
                            >
                              <i className="bi bi-download"></i> Download
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
