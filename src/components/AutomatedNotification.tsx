import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp,
  orderBy,
  limit,
  doc,
  getDoc,
  DocumentData,
  QuerySnapshot,
  QueryDocumentSnapshot,
  DocumentChange,
  CollectionReference,
  Query,
} from "firebase/firestore";

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: string;
  category: string;
}

interface Schedule {
  id: string;
  moduleTitle: string;
  lecturerName: string;
  classroomNumber: string;
  floorNumber: string;
  branch: string;
  startTime: string;
  endTime: string;
  date: string;
  dayOfWeek: string;
  isRecurring: boolean;
}

interface Course {
  id: string;
  title: string;
  code: string;
  department: string;
  status: "Active" | "Inactive" | "Pending Approval";
}

// Keep track of notifications we've already shown to prevent duplicates
// Now with timestamps for cleanup
interface NotificationEntry {
  shown: boolean;
  timestamp: number;
}

const AutomatedNotification: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const { showNotification } = useNotification();
  const [initialized, setInitialized] = useState(false);
  const [notificationStore, setNotificationStore] = useState<
    Record<string, NotificationEntry>
  >({});

  // Clean up old notification entries - run periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      setNotificationStore((prevStore) => {
        const newStore = { ...prevStore };
        let hasChanges = false;

        // Remove entries older than 24 hours
        Object.keys(newStore).forEach((key) => {
          if (now - newStore[key].timestamp > ONE_DAY) {
            delete newStore[key];
            hasChanges = true;
          }
        });

        // Only update state if we actually removed something
        return hasChanges ? newStore : prevStore;
      });
    }, 60 * 60 * 1000); // Run cleanup every hour

    return () => clearInterval(cleanupInterval);
  }, []);

  // Use this function to check if we've already shown a specific notification
  const checkAndSetNotified = (id: string): boolean => {
    // Check if notification exists and has been shown
    if (notificationStore[id]?.shown) {
      return true; // Already notified
    }

    // Set the notification as shown with current timestamp
    setNotificationStore((prevStore) => ({
      ...prevStore,
      [id]: { shown: true, timestamp: Date.now() },
    }));

    return false; // Not previously notified
  };

  // Format date for comparison (YYYY-MM-DD)
  const formatDateForComparison = (dateString: string): string => {
    try {
      const [year, month, day] = dateString.split("-");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    } catch (error) {
      return dateString;
    }
  };

  // Check if a date is today or tomorrow
  const isDateSoonOrToday = (
    dateString: string
  ): { isSoon: boolean; isToday: boolean } => {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const formattedToday = formatDateForComparison(
        today.toISOString().split("T")[0]
      );
      const formattedTomorrow = formatDateForComparison(
        tomorrow.toISOString().split("T")[0]
      );
      const formattedDate = formatDateForComparison(dateString);

      return {
        isSoon: formattedDate === formattedTomorrow,
        isToday: formattedDate === formattedToday,
      };
    } catch (error) {
      console.error("Date parsing error:", error);
      return { isSoon: false, isToday: false };
    }
  };

  // Listen for upcoming events and notify
  useEffect(() => {
    if (!currentUser || !userData) return;

    const eventsCollection = collection(db, "events");
    const today = new Date().toISOString().split("T")[0];

    // Initial query for upcoming events
    const fetchUpcomingEvents = async () => {
      try {
        const eventsSnapshot = await getDocs(eventsCollection);
        const events = eventsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Event, "id">),
        }));

        // Notify about events happening today or tomorrow
        events.forEach((event) => {
          const { isSoon, isToday } = isDateSoonOrToday(event.startDate);
          const notificationId = `event-${event.id}-${event.startDate}`;

          if (isToday && !checkAndSetNotified(notificationId + "-today")) {
            showNotification(
              `Event today: "${event.title}" at ${event.startTime} in ${event.location}`
            );
          } else if (
            isSoon &&
            !checkAndSetNotified(notificationId + "-tomorrow")
          ) {
            showNotification(
              `Event tomorrow: "${event.title}" at ${event.startTime} in ${event.location}`
            );
          }
        });
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    // Set up real-time listener for events
    const unsubscribeEvents = onSnapshot(
      eventsCollection,
      (snapshot: QuerySnapshot<DocumentData>) => {
        snapshot
          .docChanges()
          .forEach((change: DocumentChange<DocumentData>) => {
            if (change.type === "added" || change.type === "modified") {
              const event = {
                id: change.doc.id,
                ...(change.doc.data() as Omit<Event, "id">),
              };
              const { isSoon, isToday } = isDateSoonOrToday(event.startDate);
              const notificationId = `event-${event.id}-${event.startDate}-${change.type}`;

              // For new events that are upcoming soon
              if ((isToday || isSoon) && !checkAndSetNotified(notificationId)) {
                const timeFrame = isToday ? "today" : "tomorrow";
                showNotification(
                  `New event ${timeFrame}: "${event.title}" at ${event.startTime} in ${event.location}`
                );
              }
            }
          });
      }
    );

    fetchUpcomingEvents();

    return () => {
      unsubscribeEvents();
    };
  }, [currentUser, userData, showNotification, notificationStore]);

  // Listen for schedules relevant to the user's role
  useEffect(() => {
    if (!currentUser || !userData) return;

    const schedulesCollection = collection(db, "schedules");
    let schedulesQuery:
      | Query<DocumentData>
      | CollectionReference<DocumentData> = schedulesCollection;

    // Filter schedules based on user role
    if (userData.role === "student") {
      // For students, we need to first get their enrolled courses and modules
      const fetchStudentSchedules = async () => {
        try {
          // First, get student enrollments to find their courses
          const enrollmentsCollection = collection(db, "enrollments");
          const enrollmentsQuery = query(
            enrollmentsCollection,
            where("studentId", "==", userData.id)
          );
          const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

          if (enrollmentsSnapshot.empty) {
            console.log("No enrollments found for this student");
            return;
          }

          // Get all course IDs the student is enrolled in
          const courseIds = enrollmentsSnapshot.docs.map(
            (doc) => doc.data().courseId as string
          );

          // Get the courses to find enrolled modules
          const coursesCollection = collection(db, "courses");
          const enrolledModuleIds: string[] = [];

          // For each course, get its modules
          for (const courseId of courseIds) {
            const courseRef = doc(coursesCollection, courseId);
            const courseSnapshot = await getDoc(courseRef);

            if (courseSnapshot.exists()) {
              const courseData = courseSnapshot.data();
              if (courseData.modules && Array.isArray(courseData.modules)) {
                enrolledModuleIds.push(...courseData.modules);
              }
            }
          }

          if (enrolledModuleIds.length === 0) {
            console.log("No modules found for enrolled courses");
            return;
          }

          // Get schedules for the enrolled modules
          const modulesCollection = collection(db, "modules");
          const moduleNames: string[] = [];

          // For each module ID, get the module title
          for (const moduleId of enrolledModuleIds) {
            const moduleRef = doc(modulesCollection, moduleId);
            const moduleSnapshot = await getDoc(moduleRef);

            if (moduleSnapshot.exists()) {
              moduleNames.push(moduleSnapshot.data().title as string);
            }
          }

          if (moduleNames.length === 0) {
            console.log("No module names found for enrolled modules");
            return;
          }

          // Now fetch schedules for these module titles
          const schedules: Schedule[] = [];

          for (const moduleName of moduleNames) {
            const moduleSchedulesQuery = query(
              schedulesCollection,
              where("moduleTitle", "==", moduleName)
            );
            const scheduleSnapshot = await getDocs(moduleSchedulesQuery);

            scheduleSnapshot.docs.forEach((doc) => {
              schedules.push({
                id: doc.id,
                ...(doc.data() as Omit<Schedule, "id">),
              });
            });
          }

          // Process the schedules - check for today's and tomorrow's classes
          schedules.forEach((schedule) => {
            const { isSoon, isToday } = isDateSoonOrToday(schedule.date);
            const notificationId = `schedule-${schedule.id}-${schedule.date}`;

            if (isToday && !checkAndSetNotified(notificationId + "-today")) {
              showNotification(
                `Class today: ${schedule.moduleTitle} at ${schedule.startTime} in Room ${schedule.classroomNumber}`
              );
            } else if (
              isSoon &&
              !checkAndSetNotified(notificationId + "-tomorrow")
            ) {
              showNotification(
                `Class tomorrow: ${schedule.moduleTitle} at ${schedule.startTime} in Room ${schedule.classroomNumber}`
              );
            }
          });
        } catch (error) {
          console.error("Error fetching student schedules:", error);
        }
      };

      fetchStudentSchedules();

      // For students, we don't need to set up a real-time listener for all schedules
      // as it would be too resource-intensive. Instead, we'll just listen for
      // any schedules that are about to occur
      return;
    } else if (userData.role === "teacher" || userData.role === "lecturer") {
      // For teachers, filter by their name
      schedulesQuery = query(
        schedulesCollection,
        where("lecturerName", "==", userData.name)
      );
    }

    const fetchRelevantSchedules = async () => {
      try {
        const schedulesSnapshot = await getDocs(schedulesQuery);
        const schedules = schedulesSnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Schedule)
        );

        // Check for today's and tomorrow's schedules
        schedules.forEach((schedule) => {
          const { isSoon, isToday } = isDateSoonOrToday(schedule.date);
          const notificationId = `schedule-${schedule.id}-${schedule.date}`;

          if (isToday && !checkAndSetNotified(notificationId + "-today")) {
            showNotification(
              `Class today: ${schedule.moduleTitle} at ${schedule.startTime} in Room ${schedule.classroomNumber}`
            );
          } else if (
            isSoon &&
            !checkAndSetNotified(notificationId + "-tomorrow")
          ) {
            showNotification(
              `Class tomorrow: ${schedule.moduleTitle} at ${schedule.startTime} in Room ${schedule.classroomNumber}`
            );
          }
        });
      } catch (error) {
        console.error("Error fetching schedules:", error);
      }
    };

    // Set up real-time listener for schedules
    const unsubscribeSchedules = onSnapshot(
      schedulesQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        snapshot
          .docChanges()
          .forEach((change: DocumentChange<DocumentData>) => {
            if (change.type === "added" || change.type === "modified") {
              const schedule = {
                id: change.doc.id,
                ...(change.doc.data() as Omit<Schedule, "id">),
              };
              const { isSoon, isToday } = isDateSoonOrToday(schedule.date);
              const notificationId = `schedule-${schedule.id}-${schedule.date}-${change.type}`;

              // For new or updated schedules
              if ((isToday || isSoon) && !checkAndSetNotified(notificationId)) {
                const timeFrame = isToday ? "today" : "tomorrow";
                showNotification(
                  `Schedule update ${timeFrame}: ${schedule.moduleTitle} at ${schedule.startTime} in Room ${schedule.classroomNumber}`
                );
              }
            } else if (change.type === "removed") {
              const schedule = {
                id: change.doc.id,
                ...(change.doc.data() as Omit<Schedule, "id">),
              };
              const notificationId = `schedule-removed-${schedule.id}`;

              if (!checkAndSetNotified(notificationId)) {
                showNotification(
                  `Class cancelled: ${schedule.moduleTitle} on ${schedule.date}`
                );
              }
            }
          });
      }
    );

    fetchRelevantSchedules();

    return () => {
      unsubscribeSchedules();
    };
  }, [currentUser, userData, showNotification, notificationStore]);

  // Listen for course changes (especially for students and teachers)
  useEffect(() => {
    if (!currentUser || !userData) return;

    const coursesCollection = collection(db, "courses");

    // Set up real-time listener for courses
    const unsubscribeCourses = onSnapshot(
      coursesCollection,
      (snapshot: QuerySnapshot<DocumentData>) => {
        snapshot
          .docChanges()
          .forEach((change: DocumentChange<DocumentData>) => {
            if (change.type === "added") {
              const course = {
                id: change.doc.id,
                ...(change.doc.data() as Omit<Course, "id">),
              };
              const notificationId = `course-added-${course.id}`;

              if (!checkAndSetNotified(notificationId)) {
                showNotification(
                  `New course available: ${course.title} (${course.code})`
                );
              }
            } else if (change.type === "modified") {
              const course = {
                id: change.doc.id,
                ...(change.doc.data() as Omit<Course, "id">),
              };
              const notificationId = `course-modified-${course.id}`;

              if (!checkAndSetNotified(notificationId)) {
                showNotification(
                  `Course updated: ${course.title} (${course.code})`
                );
              }
            }
          });
      }
    );

    // Set initialized to true after first run
    setInitialized(true);

    return () => {
      unsubscribeCourses();
    };
  }, [currentUser, userData, showNotification, notificationStore]);

  // Empty component as this works in the background
  return null;
};

export default AutomatedNotification;
