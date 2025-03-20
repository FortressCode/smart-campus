import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useNotification } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";
import {
  Classroom,
  ClassroomAvailability,
  TimeSlot,
} from "../interfaces/Classroom";
import { Booking } from "../interfaces/Booking";
import { User } from "../interfaces/User";

const ClassroomManagement: React.FC = () => {
  // State variables
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<"list" | "add" | "bookings">(
    "list"
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [bookingTitle, setBookingTitle] = useState<string>("");
  const [bookingDescription, setBookingDescription] = useState<string>("");
  const [bookingType, setBookingType] = useState<
    "class" | "meeting" | "event" | "other"
  >("class");
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("10:00");
  const [selectedLecturer, setSelectedLecturer] = useState<string>("");

  // New classroom form
  const [newClassroom, setNewClassroom] = useState<{
    building: string;
    floor: number;
    roomNumber: string;
    capacity: number;
    resources: string[];
  }>({
    building: "",
    floor: 1,
    roomNumber: "",
    capacity: 0,
    resources: [],
  });

  // Resource options (checkbox management) - Added more options
  const resourceOptions = [
    "Projector",
    "Whiteboard",
    "Smart Board",
    "Computer",
    "Audio System",
    "Video Conferencing",
    "Air Conditioning",
    "Wheelchair Access",
    "Document Camera",
    "USB Charging Ports",
    "High-Speed Internet",
    "Adjustable Lighting",
    "Standing Desks",
    "Interactive Displays",
    "Microphones",
    "HDMI Connections",
    "Podium/Lectern",
    "Video Recording Equipment",
    "Ergonomic Chairs",
    "Collaborative Workstations",
  ];

  // Context hooks
  const { showNotification } = useNotification();
  const { currentUser } = useAuth();

  // Fetch classrooms, bookings, and lecturers on component mount
  useEffect(() => {
    fetchClassrooms();
    fetchBookings();
    fetchLecturers();
  }, []);

  // Fetch classrooms from Firestore
  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const classroomCollection = collection(db, "classrooms");
      const classroomSnapshot = await getDocs(classroomCollection);
      const classroomList = classroomSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Classroom[];

      setClassrooms(classroomList);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching classrooms:", err);
      setError("Failed to load classrooms. Please try again later.");
      setLoading(false);
    }
  };

  // Fetch bookings from Firestore
  const fetchBookings = async () => {
    try {
      const bookingCollection = collection(db, "bookings");
      const bookingSnapshot = await getDocs(bookingCollection);
      const bookingList = bookingSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];

      setBookings(bookingList);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      showNotification("Failed to load bookings. Please try again later.");
    }
  };

  // Fetch lecturers from Firestore
  const fetchLecturers = async () => {
    try {
      const userCollection = collection(db, "users");
      const q = query(userCollection, where("role", "==", "lecturer"));
      const userSnapshot = await getDocs(q);
      const lecturerList = userSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];

      setLecturers(lecturerList);
    } catch (err) {
      console.error("Error fetching lecturers:", err);
      showNotification("Failed to load lecturers. Please try again later.");
    }
  };

  // Check if a classroom is available at the given time - Improved to prevent double booking
  const isClassroomAvailable = (
    classroomId: string,
    date: string,
    start: string,
    end: string
  ): boolean => {
    // Find all active bookings for this classroom on the specified date
    const classroomBookings = bookings.filter(
      (booking) => booking.classroomId === classroomId && booking.date === date
    );

    // Convert string times to comparable numbers for easier comparison
    const startTimeMinutes = convertTimeToMinutes(start);
    const endTimeMinutes = convertTimeToMinutes(end);

    // Check for time overlap with existing bookings
    for (const booking of classroomBookings) {
      const bookingStartMinutes = convertTimeToMinutes(booking.startTime);
      const bookingEndMinutes = convertTimeToMinutes(booking.endTime);

      // Check for overlap
      // A booking overlaps if:
      // 1. New booking starts during an existing booking
      // 2. New booking ends during an existing booking
      // 3. New booking completely encapsulates an existing booking
      if (
        (startTimeMinutes >= bookingStartMinutes &&
          startTimeMinutes < bookingEndMinutes) || // New start time is within existing booking
        (endTimeMinutes > bookingStartMinutes &&
          endTimeMinutes <= bookingEndMinutes) || // New end time is within existing booking
        (startTimeMinutes <= bookingStartMinutes &&
          endTimeMinutes >= bookingEndMinutes) // New booking completely covers existing booking
      ) {
        return false;
      }
    }

    return true;
  };

  // Helper function to convert time string (HH:MM) to minutes for easier comparison
  const convertTimeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString
      .split(":")
      .map((num) => parseInt(num, 10));
    return hours * 60 + minutes;
  };

  // Add a new classroom
  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Generate classroom name from building and room number
      const name = `${newClassroom.building} ${newClassroom.roomNumber}`;

      const classroomData = {
        ...newClassroom,
        name, // Add generated name
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "classrooms"), classroomData);

      // Add the new classroom to the state
      setClassrooms([
        ...classrooms,
        {
          id: docRef.id,
          ...classroomData,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Classroom,
      ]);

      // Reset the form
      setNewClassroom({
        building: "",
        floor: 1,
        roomNumber: "",
        capacity: 0,
        resources: [],
      });

      showNotification("Classroom added successfully!");
      setActiveTab("list");
      setLoading(false);
    } catch (err) {
      console.error("Error adding classroom:", err);
      showNotification("Failed to add classroom. Please try again.");
      setLoading(false);
    }
  };

  // Book a classroom
  const handleBookClassroom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClassroom) {
      showNotification("Please select a classroom");
      return;
    }

    // Validate the form
    if (!bookingTitle || !selectedDate || !startTime || !endTime) {
      showNotification("Please fill all required fields");
      return;
    }

    // Check if selected time range is valid
    if (startTime >= endTime) {
      showNotification("End time must be after start time");
      return;
    }

    // Check if the classroom is available
    if (
      !isClassroomAvailable(
        selectedClassroom.id,
        selectedDate,
        startTime,
        endTime
      )
    ) {
      showNotification("This classroom is not available at the selected time");
      return;
    }

    try {
      setLoading(true);

      const bookingData: Omit<Booking, "id" | "createdAt" | "updatedAt"> = {
        classroomId: selectedClassroom.id,
        title: bookingTitle,
        description: bookingDescription,
        bookingType,
        date: selectedDate,
        startTime,
        endTime,
        bookedBy: currentUser?.uid || "",
        bookedFor: selectedLecturer || currentUser?.uid || "",
        status: "confirmed",
      };

      const docRef = await addDoc(collection(db, "bookings"), {
        ...bookingData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Add the new booking to the state
      setBookings([
        ...bookings,
        {
          id: docRef.id,
          ...bookingData,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Booking,
      ]);

      // Send notification to the lecturer if applicable
      if (selectedLecturer) {
        try {
          // Get lecturer information
          const lecturerRef = doc(db, "users", selectedLecturer);
          const lecturerDoc = await getDoc(lecturerRef);
          const lecturerData = lecturerDoc.data();

          if (lecturerDoc.exists() && lecturerData) {
            // Create notification for the lecturer
            await addDoc(collection(db, "notifications"), {
              userId: selectedLecturer,
              title: "Classroom Booking",
              message: `A classroom has been booked for you: ${
                selectedClassroom.name
              } on ${new Date(
                selectedDate
              ).toLocaleDateString()} from ${startTime} to ${endTime} for "${bookingTitle}".`,
              isRead: false,
              createdAt: Timestamp.now(),
            });

            showNotification(
              `Lecturer ${
                lecturerData.name || "Unknown"
              } has been notified of this booking.`
            );
          }
        } catch (notifErr) {
          console.error("Error sending notification to lecturer:", notifErr);
          // Don't show error to user as the main booking was successful
        }
      }

      // Reset the form
      setBookingTitle("");
      setBookingDescription("");
      setBookingType("class");
      setStartTime("09:00");
      setEndTime("10:00");
      setSelectedLecturer("");

      showNotification("Classroom booked successfully!");
      setActiveTab("bookings");
      setLoading(false);
    } catch (err) {
      console.error("Error booking classroom:", err);
      showNotification("Failed to book classroom. Please try again.");
      setLoading(false);
    }
  };

  // Cancel a booking - Modified to delete the booking entirely
  const handleCancelBooking = async (bookingId: string) => {
    try {
      setLoading(true);

      // Delete the booking instead of marking as cancelled
      const bookingRef = doc(db, "bookings", bookingId);
      await deleteDoc(bookingRef);

      // Remove the booking from state
      setBookings(bookings.filter((booking) => booking.id !== bookingId));

      showNotification("Booking cancelled and removed successfully!");
      setLoading(false);
    } catch (err) {
      console.error("Error cancelling booking:", err);
      showNotification("Failed to cancel booking. Please try again.");
      setLoading(false);
    }
  };

  // Handle resource checkbox change
  const handleResourceChange = (resource: string) => {
    const resources = [...newClassroom.resources];

    if (resources.includes(resource)) {
      // Remove the resource if it's already selected
      setNewClassroom({
        ...newClassroom,
        resources: resources.filter((r) => r !== resource),
      });
    } else {
      // Add the resource if it's not selected
      setNewClassroom({
        ...newClassroom,
        resources: [...resources, resource],
      });
    }
  };

  // Filter bookings for current/future dates only
  const filteredBookings = bookings.filter(
    (booking) =>
      new Date(booking.date) >= new Date(new Date().toISOString().split("T")[0])
  );

  // Render classroom list tab
  const renderClassroomList = () => {
    if (loading && classrooms.length === 0) {
      return (
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      );
    }

    if (classrooms.length === 0) {
      return (
        <div className="alert alert-info">
          No classrooms found. Click "Add Classroom" to create a new one.
        </div>
      );
    }

    return (
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-light">
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Capacity</th>
              <th>Resources</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classrooms.map((classroom) => (
              <tr key={classroom.id}>
                <td>{classroom.name}</td>
                <td>
                  {classroom.building}, Floor {classroom.floor}, Room{" "}
                  {classroom.roomNumber}
                </td>
                <td>{classroom.capacity} people</td>
                <td>
                  {classroom.resources.map((resource, index) => (
                    <span key={index} className="badge bg-info me-1">
                      {resource}
                    </span>
                  ))}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-primary me-2"
                    onClick={() => {
                      setSelectedClassroom(classroom);
                      setActiveTab("bookings");
                    }}
                  >
                    <i className="bi bi-calendar-plus"></i> Book
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render add classroom form
  const renderAddClassroomForm = () => {
    return (
      <form onSubmit={handleAddClassroom}>
        <div className="row g-3">
          {/* Removed name field as requested */}
          <div className="col-md-6">
            <label htmlFor="building" className="form-label">
              Building
            </label>
            <input
              type="text"
              className="form-control"
              id="building"
              value={newClassroom.building}
              onChange={(e) =>
                setNewClassroom({ ...newClassroom, building: e.target.value })
              }
              required
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="floor" className="form-label">
              Floor
            </label>
            <input
              type="number"
              className="form-control"
              id="floor"
              min="0"
              value={newClassroom.floor}
              onChange={(e) =>
                setNewClassroom({
                  ...newClassroom,
                  floor: parseInt(e.target.value),
                })
              }
              required
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="roomNumber" className="form-label">
              Room Number
            </label>
            <input
              type="text"
              className="form-control"
              id="roomNumber"
              value={newClassroom.roomNumber}
              onChange={(e) =>
                setNewClassroom({ ...newClassroom, roomNumber: e.target.value })
              }
              required
            />
            <small className="text-muted">
              The classroom name will be generated automatically as "Building
              RoomNumber"
            </small>
          </div>

          <div className="col-md-6">
            <label htmlFor="capacity" className="form-label">
              Capacity
            </label>
            <input
              type="number"
              className="form-control"
              id="capacity"
              min="1"
              value={newClassroom.capacity}
              onChange={(e) =>
                setNewClassroom({
                  ...newClassroom,
                  capacity: parseInt(e.target.value),
                })
              }
              required
            />
          </div>

          <div className="col-12">
            <label className="form-label">Resources</label>
            <div className="row">
              {resourceOptions.map((resource, index) => (
                <div className="col-md-3 mb-2" key={index}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`resource-${index}`}
                      checked={newClassroom.resources.includes(resource)}
                      onChange={() => handleResourceChange(resource)}
                    />
                    <label
                      className="form-check-label"
                      htmlFor={`resource-${index}`}
                    >
                      {resource}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-12 mt-4">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Saving...
                </>
              ) : (
                "Add Classroom"
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary ms-2"
              onClick={() => setActiveTab("list")}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    );
  };

  // Render booking form and bookings list
  const renderBookingsTab = () => {
    return (
      <div className="row">
        <div className="col-md-5">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="card-title mb-0">Book a Classroom</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleBookClassroom}>
                <div className="mb-3">
                  <label htmlFor="classroom" className="form-label">
                    Select Classroom
                  </label>
                  <select
                    className="form-select"
                    id="classroom"
                    value={selectedClassroom?.id || ""}
                    onChange={(e) => {
                      const classroom = classrooms.find(
                        (c) => c.id === e.target.value
                      );
                      setSelectedClassroom(classroom || null);
                    }}
                    required
                  >
                    <option value="">Choose a classroom...</option>
                    {classrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name} - {classroom.building}, Room{" "}
                        {classroom.roomNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="bookingTitle" className="form-label">
                    Booking Title
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="bookingTitle"
                    value={bookingTitle}
                    onChange={(e) => setBookingTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="bookingDescription" className="form-label">
                    Description
                  </label>
                  <textarea
                    className="form-control"
                    id="bookingDescription"
                    rows={3}
                    value={bookingDescription}
                    onChange={(e) => setBookingDescription(e.target.value)}
                  ></textarea>
                </div>

                <div className="mb-3">
                  <label htmlFor="bookingType" className="form-label">
                    Booking Type
                  </label>
                  <select
                    className="form-select"
                    id="bookingType"
                    value={bookingType}
                    onChange={(e) => setBookingType(e.target.value as any)}
                    required
                  >
                    <option value="class">Class/Lecture</option>
                    <option value="meeting">Meeting</option>
                    <option value="event">Event</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="bookingDate" className="form-label">
                    Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    id="bookingDate"
                    min={new Date().toISOString().split("T")[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="startTime" className="form-label">
                      Start Time
                    </label>
                    <input
                      type="time"
                      className="form-control"
                      id="startTime"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label htmlFor="endTime" className="form-label">
                      End Time
                    </label>
                    <input
                      type="time"
                      className="form-control"
                      id="endTime"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="lecturer" className="form-label">
                    Book for Lecturer
                  </label>
                  <select
                    className="form-select"
                    id="lecturer"
                    value={selectedLecturer}
                    onChange={(e) => setSelectedLecturer(e.target.value)}
                  >
                    <option value="">Select a lecturer (optional)</option>
                    {lecturers.map((lecturer) => (
                      <option key={lecturer.id} value={lecturer.id}>
                        {lecturer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="d-grid mt-4">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Booking...
                      </>
                    ) : (
                      "Book Classroom"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-7">
          <div className="card shadow-sm">
            <div className="card-header bg-info text-white">
              <h5 className="card-title mb-0">Upcoming Bookings</h5>
            </div>
            <div className="card-body">
              {filteredBookings.length === 0 ? (
                <div className="alert alert-info">
                  No upcoming bookings found.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Title</th>
                        <th>Classroom</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((booking) => {
                        const classroom = classrooms.find(
                          (c) => c.id === booking.classroomId
                        );
                        return (
                          <tr key={booking.id}>
                            <td>{booking.title}</td>
                            <td>{classroom?.name || "Unknown"}</td>
                            <td>
                              {new Date(booking.date).toLocaleDateString()}
                            </td>
                            <td>
                              {booking.startTime} - {booking.endTime}
                            </td>
                            <td>
                              <span className="badge bg-success">
                                Confirmed
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleCancelBooking(booking.id)}
                              >
                                Cancel
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="classroom-management">
      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "list" ? "active" : ""}`}
            onClick={() => setActiveTab("list")}
          >
            <i className="bi bi-list-ul me-1"></i>
            Classrooms
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "add" ? "active" : ""}`}
            onClick={() => setActiveTab("add")}
          >
            <i className="bi bi-plus-circle me-1"></i>
            Add Classroom
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "bookings" ? "active" : ""}`}
            onClick={() => setActiveTab("bookings")}
          >
            <i className="bi bi-calendar-week me-1"></i>
            Bookings
          </button>
        </li>
      </ul>

      <div className="tab-content">
        {activeTab === "list" && renderClassroomList()}
        {activeTab === "add" && renderAddClassroomForm()}
        {activeTab === "bookings" && renderBookingsTab()}
      </div>
    </div>
  );
};

export default ClassroomManagement;
