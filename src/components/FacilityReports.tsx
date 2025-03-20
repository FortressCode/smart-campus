import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { Booking } from "../interfaces/Booking";
import { Classroom } from "../interfaces/Classroom";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";

// Register required Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const FacilityReports: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<"week" | "month" | "year">(
    "month"
  );
  const [resourceUsageData, setResourceUsageData] = useState<any>(null);
  const [roomUsageData, setRoomUsageData] = useState<any>(null);
  const [mostBookedClassrooms, setMostBookedClassrooms] = useState<any[]>([]);
  const [bookingsByType, setBookingsByType] = useState<any>(null);
  const [timeSlotData, setTimeSlotData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);

    try {
      // Get date range for filtering
      const startDate = getStartDateForRange();

      // Fetch all classrooms
      const classroomsCollection = collection(db, "classrooms");
      const classroomSnapshot = await getDocs(classroomsCollection);
      const classroomList = classroomSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Classroom[];
      setClassrooms(classroomList);

      // Fetch bookings within date range
      const bookingsCollection = collection(db, "bookings");
      const bookingSnapshot = await getDocs(bookingsCollection);
      const bookingList = bookingSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];

      // Filter bookings by date
      const filteredBookings = bookingList.filter(
        (booking) =>
          new Date(booking.date) >= startDate &&
          new Date(booking.date) <= new Date()
      );

      setBookings(filteredBookings);

      // Generate report data
      generateReportData(filteredBookings, classroomList);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const getStartDateForRange = (): Date => {
    const now = new Date();
    const startDate = new Date();

    if (dateRange === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (dateRange === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (dateRange === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    return startDate;
  };

  const generateReportData = (
    bookingData: Booking[],
    classroomData: Classroom[]
  ) => {
    if (bookingData.length === 0 || classroomData.length === 0) return;

    // Calculate room usage frequency
    const roomUsage: Record<string, number> = {};
    classroomData.forEach((classroom) => {
      roomUsage[classroom.id] = 0;
    });

    bookingData.forEach((booking) => {
      if (roomUsage[booking.classroomId] !== undefined) {
        roomUsage[booking.classroomId]++;
      }
    });

    // Sort rooms by booking frequency
    const sortedRooms = Object.entries(roomUsage)
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => {
        const classroom = classroomData.find((room) => room.id === id);
        return {
          id,
          name: classroom?.name || "Unknown Room",
          count,
        };
      });

    setMostBookedClassrooms(sortedRooms.slice(0, 5));

    // Room usage chart data
    const topRooms = sortedRooms.slice(0, 10);
    setRoomUsageData({
      labels: topRooms.map((room) => room.name),
      datasets: [
        {
          label: "Number of Bookings",
          data: topRooms.map((room) => room.count),
          backgroundColor: [
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 99, 132, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(75, 192, 192, 0.6)",
            "rgba(153, 102, 255, 0.6)",
            "rgba(255, 159, 64, 0.6)",
            "rgba(199, 199, 199, 0.6)",
            "rgba(83, 102, 255, 0.6)",
            "rgba(40, 159, 64, 0.6)",
            "rgba(210, 199, 199, 0.6)",
          ],
          borderColor: [
            "rgba(54, 162, 235, 1)",
            "rgba(255, 99, 132, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(153, 102, 255, 1)",
            "rgba(255, 159, 64, 1)",
            "rgba(199, 199, 199, 1)",
            "rgba(83, 102, 255, 1)",
            "rgba(40, 159, 64, 1)",
            "rgba(210, 199, 199, 1)",
          ],
          borderWidth: 1,
        },
      ],
    });

    // Calculate resource usage
    const resourceUsage: Record<string, number> = {};

    // Initialize all resources with zero count
    const allResources = new Set<string>();
    classroomData.forEach((classroom) => {
      classroom.resources.forEach((resource) => {
        allResources.add(resource);
      });
    });

    allResources.forEach((resource) => {
      resourceUsage[resource] = 0;
    });

    // Count each resource usage
    bookingData.forEach((booking) => {
      const classroom = classroomData.find(
        (room) => room.id === booking.classroomId
      );
      if (classroom) {
        classroom.resources.forEach((resource) => {
          resourceUsage[resource]++;
        });
      }
    });

    // Resource usage chart data
    setResourceUsageData({
      labels: Object.keys(resourceUsage),
      datasets: [
        {
          label: "Resource Usage",
          data: Object.values(resourceUsage),
          backgroundColor: [
            "rgba(255, 99, 132, 0.6)",
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(75, 192, 192, 0.6)",
            "rgba(153, 102, 255, 0.6)",
            "rgba(255, 159, 64, 0.6)",
            "rgba(199, 199, 199, 0.6)",
            "rgba(83, 102, 255, 0.6)",
          ],
          borderColor: [
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(153, 102, 255, 1)",
            "rgba(255, 159, 64, 1)",
            "rgba(199, 199, 199, 1)",
            "rgba(83, 102, 255, 1)",
          ],
          borderWidth: 1,
        },
      ],
    });

    // Booking type distribution
    const bookingTypeCount: Record<string, number> = {
      class: 0,
      meeting: 0,
      event: 0,
      other: 0,
    };

    bookingData.forEach((booking) => {
      bookingTypeCount[booking.bookingType]++;
    });

    setBookingsByType({
      labels: ["Class/Lecture", "Meeting", "Event", "Other"],
      datasets: [
        {
          label: "Booking Types",
          data: [
            bookingTypeCount.class,
            bookingTypeCount.meeting,
            bookingTypeCount.event,
            bookingTypeCount.other,
          ],
          backgroundColor: [
            "rgba(75, 192, 192, 0.6)",
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(255, 99, 132, 0.6)",
          ],
          borderColor: [
            "rgba(75, 192, 192, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(255, 99, 132, 1)",
          ],
          borderWidth: 1,
        },
      ],
    });

    // Time slot usage analysis
    const timeSlots: Record<string, number> = {
      "Early Morning (6-9)": 0,
      "Morning (9-12)": 0,
      "Afternoon (12-15)": 0,
      "Late Afternoon (15-18)": 0,
      "Evening (18-21)": 0,
      "Night (21-23)": 0,
    };

    bookingData.forEach((booking) => {
      const startHour = parseInt(booking.startTime.split(":")[0]);

      if (startHour >= 6 && startHour < 9) {
        timeSlots["Early Morning (6-9)"]++;
      } else if (startHour >= 9 && startHour < 12) {
        timeSlots["Morning (9-12)"]++;
      } else if (startHour >= 12 && startHour < 15) {
        timeSlots["Afternoon (12-15)"]++;
      } else if (startHour >= 15 && startHour < 18) {
        timeSlots["Late Afternoon (15-18)"]++;
      } else if (startHour >= 18 && startHour < 21) {
        timeSlots["Evening (18-21)"]++;
      } else if (startHour >= 21 && startHour < 24) {
        timeSlots["Night (21-23)"]++;
      }
    });

    setTimeSlotData({
      labels: Object.keys(timeSlots),
      datasets: [
        {
          label: "Bookings by Time Slot",
          data: Object.values(timeSlots),
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    });
  };

  return (
    <div className="facility-reports">
      {loading ? (
        <div className="d-flex justify-content-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Facility Usage Reports</h5>
              <div className="btn-group">
                <button
                  className={`btn btn-sm ${
                    dateRange === "week" ? "btn-primary" : "btn-outline-primary"
                  }`}
                  onClick={() => setDateRange("week")}
                >
                  Last Week
                </button>
                <button
                  className={`btn btn-sm ${
                    dateRange === "month"
                      ? "btn-primary"
                      : "btn-outline-primary"
                  }`}
                  onClick={() => setDateRange("month")}
                >
                  Last Month
                </button>
                <button
                  className={`btn btn-sm ${
                    dateRange === "year" ? "btn-primary" : "btn-outline-primary"
                  }`}
                  onClick={() => setDateRange("year")}
                >
                  Last Year
                </button>
              </div>
            </div>
            <p className="text-muted">
              Showing facility usage data for the{" "}
              {dateRange === "week"
                ? "past week"
                : dateRange === "month"
                ? "past month"
                : "past year"}
              .{bookings.length === 0 && " No bookings found for this period."}
            </p>
          </div>

          {bookings.length === 0 ? (
            <div className="alert alert-info">
              No booking data available for the selected time period. Try
              changing the date range or check back when more bookings have been
              made.
            </div>
          ) : (
            <>
              <div className="row g-4 mb-4">
                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-header bg-white">
                      <h5 className="card-title mb-0">Most Used Classrooms</h5>
                    </div>
                    <div className="card-body">
                      {roomUsageData ? (
                        <Bar
                          data={roomUsageData}
                          options={{
                            responsive: true,
                            plugins: {
                              legend: {
                                display: false,
                              },
                              title: {
                                display: false,
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: "Number of Bookings",
                                },
                              },
                            },
                          }}
                        />
                      ) : (
                        <p className="text-center text-muted">
                          No data available
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-header bg-white">
                      <h5 className="card-title mb-0">Resource Usage</h5>
                    </div>
                    <div className="card-body d-flex justify-content-center">
                      {resourceUsageData ? (
                        <div style={{ maxHeight: "300px", maxWidth: "300px" }}>
                          <Pie
                            data={resourceUsageData}
                            options={{
                              responsive: true,
                              plugins: {
                                legend: {
                                  position: "right",
                                },
                              },
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-center text-muted">
                          No data available
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-4 mb-4">
                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-header bg-white">
                      <h5 className="card-title mb-0">Booking Types</h5>
                    </div>
                    <div className="card-body d-flex justify-content-center">
                      {bookingsByType ? (
                        <div style={{ maxHeight: "300px", maxWidth: "300px" }}>
                          <Pie
                            data={bookingsByType}
                            options={{
                              responsive: true,
                              plugins: {
                                legend: {
                                  position: "right",
                                },
                              },
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-center text-muted">
                          No data available
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-header bg-white">
                      <h5 className="card-title mb-0">Popular Booking Times</h5>
                    </div>
                    <div className="card-body">
                      {timeSlotData ? (
                        <Bar
                          data={timeSlotData}
                          options={{
                            responsive: true,
                            plugins: {
                              legend: {
                                display: false,
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: "Number of Bookings",
                                },
                              },
                            },
                          }}
                        />
                      ) : (
                        <p className="text-center text-muted">
                          No data available
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header bg-white">
                  <h5 className="card-title mb-0">
                    Top 5 Most Booked Classrooms
                  </h5>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Rank</th>
                          <th>Classroom</th>
                          <th>Number of Bookings</th>
                          <th>Utilization Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mostBookedClassrooms.map((room, index) => {
                          // Calculate utilization rate: bookings / total possible bookings in the period
                          const daysInPeriod =
                            dateRange === "week"
                              ? 7
                              : dateRange === "month"
                              ? 30
                              : 365;
                          // Assuming 12 hours of possible booking time per day (8am-8pm)
                          const possibleBookingsPerDay = 6; // Assuming 2-hour slots
                          const totalPossibleBookings =
                            daysInPeriod * possibleBookingsPerDay;
                          const utilizationRate =
                            (room.count / totalPossibleBookings) * 100;

                          return (
                            <tr key={room.id}>
                              <td>{index + 1}</td>
                              <td>{room.name}</td>
                              <td>{room.count}</td>
                              <td>
                                <div
                                  className="progress"
                                  style={{ height: "6px" }}
                                >
                                  <div
                                    className={`progress-bar ${
                                      utilizationRate > 70
                                        ? "bg-success"
                                        : utilizationRate > 30
                                        ? "bg-warning"
                                        : "bg-danger"
                                    }`}
                                    role="progressbar"
                                    style={{ width: `${utilizationRate}%` }}
                                    aria-valuenow={utilizationRate}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                  ></div>
                                </div>
                                <small className="text-muted">
                                  {utilizationRate.toFixed(1)}%
                                </small>
                              </td>
                            </tr>
                          );
                        })}
                        {mostBookedClassrooms.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center">
                              No data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default FacilityReports;
