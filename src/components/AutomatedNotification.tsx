import React, { useEffect, useState, useCallback, useRef } from "react";
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
  const { userData, currentUser, loading } = useAuth();
  const { showNotification } = useNotification();
  const [initialized, setInitialized] = useState(false);
  const [notificationStore, setNotificationStore] = useState<
    Record<string, NotificationEntry>
  >({});

  // Use a ref to track notifications that have been shown
  const notifiedEvents = useRef<Set<string>>(new Set());
  const notifiedSchedules = useRef<Set<string>>(new Set());
  const notifiedCourses = useRef<Set<string>>(new Set());

  // Keep track of all active unsubscribe functions
  const unsubscribeFunctions = useRef<(() => void)[]>([]);

  // Throttle notifications to prevent flooding
  const lastNotificationTime = useRef<number>(0);
  const queuedNotifications = useRef<string[]>([]);
  const processingQueue = useRef<boolean>(false);

  // Process the notification queue with throttling
  const processNotificationQueue = useCallback(() => {
    if (processingQueue.current) return;

    processingQueue.current = true;

    const processNext = () => {
      if (queuedNotifications.current.length === 0) {
        processingQueue.current = false;
        return;
      }

      const now = Date.now();
      // Ensure at least 1000ms between notifications
      const timeToWait = Math.max(0, lastNotificationTime.current + 1000 - now);

      setTimeout(() => {
        if (queuedNotifications.current.length > 0) {
          const message = queuedNotifications.current.shift()!;
          showNotification(message);
          lastNotificationTime.current = Date.now();
          processNext();
        } else {
          processingQueue.current = false;
        }
      }, timeToWait);
    };

    processNext();
  }, [showNotification]);

  // Queue a notification instead of showing immediately
  const queueNotification = useCallback(
    (message: string) => {
      queuedNotifications.current.push(message);
      processNotificationQueue();
    },
    [processNotificationQueue]
  );

  // Clean up old notification entries - run periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      // Clean up events that are more than a day old
      const eventIdsToRemove: string[] = [];
      notifiedEvents.current.forEach((eventId) => {
        // Only process IDs that have timestamps attached
        if (eventId.includes("|")) {
          const [id, timestamp] = eventId.split("|");
          if (Number(timestamp) < oneDayAgo) {
            eventIdsToRemove.push(eventId);
            // Also remove the base ID if it exists
            eventIdsToRemove.push(id);
          }
        }
      });

      eventIdsToRemove.forEach((id) => {
        notifiedEvents.current.delete(id);
      });

      // Similarly clean up schedules
      const scheduleIdsToRemove: string[] = [];
      notifiedSchedules.current.forEach((scheduleId) => {
        if (scheduleId.includes("|")) {
          const [id, timestamp] = scheduleId.split("|");
          if (Number(timestamp) < oneDayAgo) {
            scheduleIdsToRemove.push(scheduleId);
            scheduleIdsToRemove.push(id);
          }
        }
      });

      scheduleIdsToRemove.forEach((id) => {
        notifiedSchedules.current.delete(id);
      });

      // Clean up courses
      const courseIdsToRemove: string[] = [];
      notifiedCourses.current.forEach((courseId) => {
        if (courseId.includes("|")) {
          const [id, timestamp] = courseId.split("|");
          if (Number(timestamp) < oneDayAgo) {
            courseIdsToRemove.push(courseId);
            courseIdsToRemove.push(id);
          }
        }
      });

      courseIdsToRemove.forEach((id) => {
        notifiedCourses.current.delete(id);
      });

      // Also clean up the notificationEntries
      setNotificationStore((prevEntries) => {
        const newEntries = { ...prevEntries };
        Object.keys(newEntries).forEach((key) => {
          if (Date.now() - newEntries[key].timestamp > 24 * 60 * 60 * 1000) {
            delete newEntries[key];
          }
        });
        return newEntries;
      });
    }, 3600000); // Check every hour

    // Run the cleanup once immediately on component mount
    // to clean any leftover entries from previous sessions
    const initialCleanup = setTimeout(() => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      // Clear all old entries from the notification store
      setNotificationStore((prevEntries) => {
        const newEntries = { ...prevEntries };
        Object.keys(newEntries).forEach((key) => {
          if (Date.now() - newEntries[key].timestamp > 24 * 60 * 60 * 1000) {
            delete newEntries[key];
          }
        });
        return newEntries;
      });
    }, 1000); // Run after 1 second

    return () => {
      clearInterval(cleanupInterval);
      clearTimeout(initialCleanup);

      // Unsubscribe from all Firebase listeners when component unmounts
      unsubscribeFunctions.current.forEach((unsubscribe) => {
        unsubscribe();
      });
    };
  }, []);

  // Check if an event has already been notified
  const checkAndSetNotified = (
    type: "event" | "schedule" | "course",
    id: string
  ): boolean => {
    // Create a full ID that includes the type for better tracking
    const fullId = `${type}-${id}`;

    const notifiedSet =
      type === "event"
        ? notifiedEvents.current
        : type === "schedule"
        ? notifiedSchedules.current
        : notifiedCourses.current;

    // First check if we've already notified for this exact ID
    if (notifiedSet.has(fullId)) {
      return true; // Already notified
    }

    // Create a timestamp-based ID for cleaning up old notifications
    const timestampedId = `${fullId}|${Date.now()}`;

    // Add both the bare ID for checking and the timestamped ID for cleanup
    notifiedSet.add(fullId);
    notifiedSet.add(timestampedId);

    // Also update the old tracking mechanism for backward compatibility
    setNotificationStore((prev) => ({
      ...prev,
      [fullId]: { shown: true, timestamp: Date.now() },
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
    if (loading) return;

    if (!currentUser || !userData) {
      console.log("No user data available, skipping notifications");
      return;
    }

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

          if (
            isToday &&
            !checkAndSetNotified("event", notificationId + "-today")
          ) {
            showNotification(
              `Event today: "${event.title}" at ${event.startTime} in ${event.location}`
            );
          } else if (
            isSoon &&
            !checkAndSetNotified("event", notificationId + "-tomorrow")
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
              if (
                (isToday || isSoon) &&
                !checkAndSetNotified("event", notificationId)
              ) {
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
    if (loading || !userData) return;

    const schedulesCollection = collection(db, "schedules");
    let schedulesQuery:
      | Query<DocumentData>
      | CollectionReference<DocumentData> = schedulesCollection;

    // Filter schedules based on user role
    if (userData?.role === "student") {
      // For students, we need to first get their enrolled courses and modules
      const fetchStudentSchedules = async () => {
        try {
          // First, get student enrollments to find their courses
          const enrollmentsCollection = collection(db, "enrollments");

          // Check if userData.id exists before using it in where clause
          if (!userData?.id) {
            console.log("User ID is undefined, cannot fetch enrollments");
            return;
          }

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

            if (
              isToday &&
              !checkAndSetNotified("schedule", notificationId + "-today")
            ) {
              showNotification(
                `Class today: ${schedule.moduleTitle} at ${schedule.startTime} in Room ${schedule.classroomNumber}`
              );
            } else if (
              isSoon &&
              !checkAndSetNotified("schedule", notificationId + "-tomorrow")
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
    } else if (userData?.role === "teacher" || userData?.role === "lecturer") {
      // Check if userData.name exists before using it in where clause
      if (userData?.name) {
        // For teachers, filter by their name
        schedulesQuery = query(
          schedulesCollection,
          where("lecturerName", "==", userData.name)
        );
      } else {
        console.log("Lecturer name is undefined, cannot filter schedules");
      }
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

          if (
            isToday &&
            !checkAndSetNotified("schedule", notificationId + "-today")
          ) {
            showNotification(
              `Class today: ${schedule.moduleTitle} at ${schedule.startTime} in Room ${schedule.classroomNumber}`
            );
          } else if (
            isSoon &&
            !checkAndSetNotified("schedule", notificationId + "-tomorrow")
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

    // Only set up listeners if schedulesQuery is properly configured
    let unsubscribeSchedules = () => {};

    // Only subscribe if we have a valid userData with proper role and name
    if (
      (userData?.role === "teacher" || userData?.role === "lecturer") &&
      userData?.name
    ) {
      unsubscribeSchedules = onSnapshot(
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
                if (
                  (isToday || isSoon) &&
                  !checkAndSetNotified("schedule", notificationId)
                ) {
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

                if (!checkAndSetNotified("schedule", notificationId)) {
                  showNotification(
                    `Class cancelled: ${schedule.moduleTitle} on ${schedule.date}`
                  );
                }
              }
            });
        }
      );
    } else if (userData?.role !== "student") {
      // For admin or other roles, subscribe to all schedules
      unsubscribeSchedules = onSnapshot(
        schedulesCollection,
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
                if (
                  (isToday || isSoon) &&
                  !checkAndSetNotified("schedule", notificationId)
                ) {
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

                if (!checkAndSetNotified("schedule", notificationId)) {
                  showNotification(
                    `Class cancelled: ${schedule.moduleTitle} on ${schedule.date}`
                  );
                }
              }
            });
        }
      );
    }

    fetchRelevantSchedules();

    return () => {
      unsubscribeSchedules();
    };
  }, [currentUser, userData, showNotification, notificationStore]);

  // Listen for course changes (especially for students and teachers)
  useEffect(() => {
    if (loading || !currentUser || !userData) return;

    const coursesCollection = collection(db, "courses");

    // Set up real-time listener for courses only if we have valid userData
    let unsubscribeCourses = () => {};

    if (userData) {
      unsubscribeCourses = onSnapshot(
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

                if (!checkAndSetNotified("course", notificationId)) {
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

                if (!checkAndSetNotified("course", notificationId)) {
                  showNotification(
                    `Course updated: ${course.title} (${course.code})`
                  );
                }
              }
            });
        }
      );
    }

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
