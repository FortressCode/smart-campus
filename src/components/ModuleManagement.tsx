import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { Module } from "../interfaces/Module";
import { Course } from "../interfaces/Course";

const ModuleManagement = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [isEditingModule, setIsEditingModule] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("All");

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [duration, setDuration] = useState(1);
  const [credits, setCredits] = useState(1);
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>([]);
  const [assessmentMethods, setAssessmentMethods] = useState<string[]>([]);

  useEffect(() => {
    fetchModules();
    fetchCourses();
  }, []);

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
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
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

  const fetchCourses = async () => {
    try {
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
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError("Failed to load courses. Please try again.");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCourseId("");
    setDuration(1);
    setCredits(1);
    setPrerequisites([]);
    setLearningOutcomes([]);
    setAssessmentMethods([]);
    setSelectedModule(null);
    setIsEditingModule(false);
  };

  const handleEditModule = (module: Module) => {
    setSelectedModule(module);
    setTitle(module.title);
    setDescription(module.description);
    setCourseId(module.courseId);
    setDuration(module.duration);
    setCredits(module.credits);
    setPrerequisites(module.prerequisites);
    setLearningOutcomes(module.learningOutcomes);
    setAssessmentMethods(module.assessmentMethods);
    setIsEditingModule(true);
    setIsAddingModule(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const moduleData = {
        title,
        description,
        courseId,
        duration,
        credits,
        prerequisites,
        learningOutcomes,
        assessmentMethods,
        updatedAt: new Date(),
      };

      if (isEditingModule && selectedModule) {
        // Update existing module
        const moduleRef = doc(db, "modules", selectedModule.id);
        await updateDoc(moduleRef, {
          ...moduleData,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Add new module
        await addDoc(collection(db, "modules"), {
          ...moduleData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      resetForm();
      setIsAddingModule(false);
      fetchModules();
    } catch (err) {
      console.error("Error saving module:", err);
      setError("Failed to save module. Please try again.");
    }
  };

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

  const handleArrayInput = (
    value: string,
    setter: (value: string[]) => void,
    currentValue: string[]
  ) => {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setter(items);
  };

  const filteredModules = modules.filter((module) => {
    const searchMatch =
      !searchQuery ||
      module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.description.toLowerCase().includes(searchQuery.toLowerCase());
    const courseMatch =
      courseFilter === "All" || module.courseId === courseFilter;

    return searchMatch && courseMatch;
  });

  return (
    <div className="module-management">
      <h2>Module Management</h2>
      {/* Module management UI would go here */}
    </div>
  );
};

export default ModuleManagement;
