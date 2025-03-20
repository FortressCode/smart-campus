import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { useConfirm } from "../contexts/ConfirmContext";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  addDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../firebase";
import { Material } from "../interfaces/Material";
import { Module } from "../interfaces/Module";

export default function MaterialManagement() {
  const { currentUser, userData } = useAuth();
  const { showNotification } = useNotification();
  const { showConfirm } = useConfirm();

  const [modules, setModules] = useState<Module[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string>("");

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Load modules when component mounts
  useEffect(() => {
    fetchModules();
  }, []);

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
      const modulesCollection = collection(db, "modules");
      const moduleSnapshot = await getDocs(modulesCollection);
      const moduleList = moduleSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Module[];
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
      // Clear previous materials first
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

      console.log(
        "Raw materials data:",
        materialsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );

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
      console.log("Processed materials:", materialsList);
    } catch (error) {
      console.error("Error fetching materials:", error);
      showNotification("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  // Function to handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Function to reset the form
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setFile(null);
    setCurrentMaterial(null);
    setIsAdding(false);
    setIsEditing(false);
    setUploadProgress(0);
  };

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted", { title, description, file, selectedModule });

    if (!selectedModule) {
      showNotification("Please select a module");
      return;
    }

    if (title.trim() === "") {
      showNotification("Please enter a title");
      return;
    }

    try {
      setIsUploading(true);

      if (isEditing && currentMaterial) {
        // If editing without changing the file
        if (!file) {
          const materialRef = doc(db, "materials", currentMaterial.id);
          await updateDoc(materialRef, {
            title,
            description,
            updatedAt: serverTimestamp(),
          });

          showNotification("Material updated successfully");
          resetForm();
          await fetchMaterials(selectedModule);
          setIsUploading(false);
        } else {
          // If editing and changing the file
          try {
            // First delete the old file
            const oldFileRef = ref(
              storage,
              `materials/${currentMaterial.id}/${currentMaterial.fileName}`
            );
            await deleteObject(oldFileRef).catch((err) => {
              console.warn("Could not delete old file, it may not exist:", err);
            });

            // Then upload the new file
            await uploadFileAndSaveData(currentMaterial.id, true);
          } catch (error) {
            console.error("Error during file replacement:", error);
            showNotification("Error replacing file");
            setIsUploading(false);
          }
        }
      } else {
        // If adding a new material
        if (!file) {
          showNotification("Please select a file to upload");
          setIsUploading(false);
          return;
        }

        try {
          console.log("Adding new material to module:", selectedModule);
          // Add a new document to Firestore with a generated ID
          const newMaterialRef = await addDoc(collection(db, "materials"), {
            moduleId: selectedModule,
            title: title,
            name: file.name, // Add file name to match the schema seen in the console
            description: description || "",
            fileName: "",
            fileUrl: "",
            fileType: file.type,
            fileSize: file.size,
            size: file.size, // Add size field to match the schema
            uploadedBy: currentUser?.uid || "",
            uploadedAt: serverTimestamp(), // Match existing schema
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          console.log(
            "Created new material document with ID:",
            newMaterialRef.id
          );

          // Upload the file and update the document with file details
          await uploadFileAndSaveData(newMaterialRef.id, false);
        } catch (error) {
          console.error("Error creating new material document:", error);
          showNotification("Error creating material record");
          setIsUploading(false);
        }
      }
    } catch (error) {
      console.error("Error saving material:", error);
      showNotification("Failed to save material");
      setIsUploading(false);
    }
  };

  // Function to upload file to Firebase Storage and save/update data in Firestore
  const uploadFileAndSaveData = async (
    materialId: string,
    isUpdate: boolean
  ) => {
    if (!file) return;
    console.log("Starting file upload for material:", materialId);

    try {
      // Create a unique filename to avoid collisions
      const fileName = `${Date.now()}_${file.name}`;
      console.log("Generated filename:", fileName);

      // Create a reference to the storage location
      const storageRef = ref(storage, `materials/${materialId}/${fileName}`);
      console.log("Storage reference created");

      // Start the upload
      const uploadTask = uploadBytesResumable(storageRef, file);
      console.log("Upload task started");

      // Handle upload states
      uploadTask.on(
        "state_changed",
        // Progress callback
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          console.log("Upload progress:", progress.toFixed(1) + "%");
        },
        // Error callback
        (error) => {
          console.error("Upload error:", error);
          showNotification("File upload failed");
          setIsUploading(false);
        },
        // Completion callback
        async () => {
          try {
            console.log("Upload completed, getting download URL...");
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("Download URL obtained:", downloadURL);

            // Prepare the data to save to Firestore
            const materialData = {
              title: title,
              description: description || "",
              fileName: fileName,
              name: file.name, // Additional field to match existing schema
              fileUrl: downloadURL,
              fileType: file.type,
              fileSize: file.size,
              size: file.size, // Additional field to match existing schema
              uploadedAt: serverTimestamp(), // Match existing schema
              updatedAt: serverTimestamp(),
              // Only add these fields if not an update
              ...(isUpdate
                ? {}
                : {
                    moduleId: selectedModule,
                    uploadedBy: currentUser?.uid || "",
                    createdAt: serverTimestamp(),
                  }),
            };

            console.log("Updating Firestore document with data:", materialData);
            const materialRef = doc(db, "materials", materialId);

            if (isUpdate) {
              await updateDoc(materialRef, materialData);
              showNotification("Material updated successfully");
            } else {
              await updateDoc(materialRef, materialData);
              showNotification("Material added successfully");
            }

            // Reset form and refresh material list
            resetForm();
            await fetchMaterials(selectedModule);
            setIsUploading(false);
          } catch (error) {
            console.error("Error in upload completion:", error);
            showNotification("Error saving material details");
            setIsUploading(false);
          }
        }
      );
    } catch (error) {
      console.error("Error in uploadFileAndSaveData:", error);
      showNotification("Error starting file upload");
      setIsUploading(false);
    }
  };

  // Function to handle editing a material
  const handleEdit = (material: Material) => {
    setCurrentMaterial(material);
    setTitle(material.title);
    setDescription(material.description || "");
    setIsEditing(true);
    setIsAdding(false);
  };

  // Function to handle deleting a material
  const handleDelete = (material: Material) => {
    showConfirm(
      {
        title: "Confirm Delete",
        message: `Are you sure you want to delete "${material.title}"?`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        variant: "danger",
      },
      async () => {
        try {
          // Delete the file from Storage
          const fileRef = ref(
            storage,
            `materials/${material.id}/${material.fileName}`
          );
          await deleteObject(fileRef);

          // Delete the document from Firestore
          await deleteDoc(doc(db, "materials", material.id));

          showNotification("Material deleted successfully");
          fetchMaterials(selectedModule);
        } catch (error) {
          console.error("Error deleting material:", error);
          showNotification("Failed to delete material");
        }
      }
    );
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

  // Function to clear all materials for the selected module
  const clearAllMaterials = () => {
    if (!selectedModule) {
      showNotification("Please select a module first");
      return;
    }

    showConfirm(
      {
        title: "Confirm Delete All",
        message:
          "Are you sure you want to delete ALL materials for this module? This cannot be undone.",
        confirmLabel: "Delete All",
        cancelLabel: "Cancel",
        variant: "danger",
      },
      async () => {
        try {
          setLoading(true);
          // Get all materials for this module
          const materialsQuery = query(
            collection(db, "materials"),
            where("moduleId", "==", selectedModule)
          );
          const materialsSnapshot = await getDocs(materialsQuery);

          if (materialsSnapshot.empty) {
            showNotification("No materials to delete");
            setLoading(false);
            return;
          }

          // Delete each material and its files
          const deletePromises = materialsSnapshot.docs.map(async (doc) => {
            const material = doc.data();
            const fileName = material.fileName || material.name;

            // Delete file from storage if it exists
            if (fileName) {
              try {
                const fileRef = ref(storage, `materials/${doc.id}/${fileName}`);
                await deleteObject(fileRef);
                console.log(`Deleted file: ${fileName}`);
              } catch (error) {
                console.error(`Error deleting file ${fileName}:`, error);
                // Continue with document deletion even if file deletion fails
              }
            }

            // Delete the document
            await deleteDoc(doc.ref);
            console.log(`Deleted material: ${doc.id}`);
          });

          await Promise.all(deletePromises);
          showNotification("All materials successfully deleted");
          setMaterials([]);
        } catch (error) {
          console.error("Error clearing materials:", error);
          showNotification("Failed to delete all materials");
        } finally {
          setLoading(false);
        }
      }
    );
  };

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-file-earmark-text me-2"></i>
                Material Management
              </h5>
              <p className="text-muted">
                Manage educational materials for each module. Add, update or
                delete PDFs, Word documents, and other educational resources.
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

              {selectedModule && (
                <div className="mt-3">
                  <button
                    className="btn btn-primary w-100"
                    onClick={(e) => {
                      e.preventDefault();
                      console.log("Add New Material button clicked");
                      resetForm();
                      setIsAdding(true);
                    }}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add New Material
                  </button>
                </div>
              )}
            </div>
          </div>

          {(isAdding || isEditing) && (
            <div className="card mt-4">
              <div className="card-header">
                <h6 className="mb-0">
                  {isAdding ? "Add New Material" : "Edit Material"}
                </h6>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="title" className="form-label">
                      Title *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="description" className="form-label">
                      Description
                    </label>
                    <textarea
                      className="form-control"
                      id="description"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="file" className="form-label">
                      {isEditing
                        ? "Replace File (leave empty to keep current file)"
                        : "Upload File *"}
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      id="file"
                      onChange={handleFileChange}
                      required={!isEditing}
                    />
                    {isEditing && currentMaterial && (
                      <small className="text-muted d-block mt-1">
                        Current file: {currentMaterial.fileName}
                      </small>
                    )}
                  </div>

                  {isUploading && (
                    <div className="mb-3">
                      <label className="form-label">Upload Progress</label>
                      <div className="progress">
                        <div
                          className="progress-bar progress-bar-striped progress-bar-animated"
                          role="progressbar"
                          style={{ width: `${uploadProgress}%` }}
                          aria-valuenow={uploadProgress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          {uploadProgress.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Uploading...
                        </>
                      ) : isEditing ? (
                        "Update Material"
                      ) : (
                        "Add Material"
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={resetForm}
                      disabled={isUploading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Materials List</h6>
                {materials.length > 0 && (
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={clearAllMaterials}
                    title="Clear all materials"
                  >
                    <i className="bi bi-trash me-1"></i>
                    Clear All
                  </button>
                )}
              </div>
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
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => {
                      resetForm();
                      setIsAdding(true);
                    }}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add Material
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>File Type</th>
                        <th>Size</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((material) => (
                        <tr key={material.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <i
                                className={`${getFileIcon(
                                  material.fileType ||
                                    "application/octet-stream"
                                )} fs-4 me-2`}
                              ></i>
                              <div>
                                <div className="fw-medium">
                                  {material.title || "Untitled"}
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
                            <div className="btn-group">
                              <a
                                href={material.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary"
                                title="Download"
                              >
                                <i className="bi bi-download"></i>
                              </a>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => handleEdit(material)}
                                title="Edit"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(material)}
                                title="Delete"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
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
