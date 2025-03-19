import React, { useEffect } from "react";
import {
  Chart,
  Chart as ChartJS,
  registerables,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  RadialLinearScale,
} from "chart.js";
import { Pie, Line, Bar } from "react-chartjs-2";
import "chartjs-adapter-date-fns";

// Register ALL Chart.js components
Chart.register(...registerables);

// Also register individual components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  RadialLinearScale
);

// Component for attendance visualization based on actual/expected participants
export const DepartmentChart = ({
  participants,
  category,
}: {
  participants: number;
  category: string;
}) => {
  useEffect(() => {
    // Re-register components when the component mounts
    ChartJS.register(ArcElement, Tooltip, Legend);

    // Cleanup
    return () => {
      // Force destroy chart instance when component unmounts
      const chartInstance = ChartJS.getChart("department-chart");
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [participants, category]);

  // Use only real data from Firestore
  const data = {
    labels: [category, "Other Events"],
    datasets: [
      {
        label: "Event Participation",
        data: [participants, 0], // Only show actual participants count
        backgroundColor: [
          "rgba(54, 162, 235, 0.7)",
          "rgba(220, 220, 220, 0.7)",
        ],
        borderColor: ["rgba(54, 162, 235, 1)", "rgba(220, 220, 220, 1)"],
        borderWidth: 1,
        hoverOffset: 10,
      },
    ],
  };

  return (
    <div className="chart-container p-3 bg-white rounded shadow-sm h-100">
      <h3>Category: {category}</h3>
      <h5>{participants} Total Participants</h5>
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "320px" }}
      >
        <Pie
          id="department-chart"
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: "30%",
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  padding: 20,
                  font: {
                    size: 12,
                  },
                },
              },
              tooltip: {
                backgroundColor: "rgba(0,0,0,0.8)",
                titleFont: {
                  size: 14,
                  weight: "bold",
                },
                bodyFont: {
                  size: 13,
                },
                padding: 15,
                caretSize: 10,
                callbacks: {
                  label: function (context) {
                    return `${context.label}: ${Number(
                      context.raw
                    )} participants`;
                  },
                },
              },
            },
            animation: {
              animateScale: true,
              animateRotate: true,
              duration: 2000,
            },
          }}
          redraw={true}
        />
      </div>
    </div>
  );
};

// Component for participation rate over time
export const TimelineChart = ({
  actualParticipants,
  expectedParticipants,
  startDate,
  status,
}: {
  actualParticipants: number;
  expectedParticipants: number;
  startDate: string;
  status: string;
}) => {
  useEffect(() => {
    // Re-register components when the component mounts
    ChartJS.register(
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      Title,
      Tooltip,
      Legend
    );

    // Cleanup
    return () => {
      // Force destroy chart instance when component unmounts
      const chartInstance = ChartJS.getChart("timeline-chart");
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [actualParticipants, expectedParticipants, startDate, status]);

  // Use only real data from Firestore
  const data = {
    labels: ["Expected", "Actual"],
    datasets: [
      {
        label: "Participants",
        data: [expectedParticipants, actualParticipants],
        backgroundColor: ["rgba(54, 162, 235, 0.7)", "rgba(255, 99, 132, 0.7)"],
        borderColor: ["rgba(54, 162, 235, 1)", "rgba(255, 99, 132, 1)"],
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className="chart-container p-3 bg-white rounded shadow-sm h-100">
      <h3>Participation Metrics</h3>
      <h5>Expected vs. Actual</h5>
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "320px" }}
      >
        <Bar
          id="timeline-chart"
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: "Number of Participants",
                  font: {
                    weight: "bold",
                  },
                },
                grid: {
                  display: true,
                  color: "rgba(0, 0, 0, 0.05)",
                },
              },
              x: {
                grid: {
                  display: false,
                },
              },
            },
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                backgroundColor: "rgba(0,0,0,0.8)",
                titleFont: {
                  size: 14,
                  weight: "bold",
                },
                bodyFont: {
                  size: 13,
                },
                padding: 15,
                caretSize: 10,
                callbacks: {
                  label: function (context) {
                    return `${context.label}: ${Number(
                      context.raw
                    )} participants`;
                  },
                },
              },
            },
            animation: {
              duration: 2000,
            },
          }}
          redraw={true}
        />
      </div>
    </div>
  );
};

// Component for participation rate visualization
export const RoleChart = ({
  actualParticipants,
  expectedParticipants,
}: {
  actualParticipants: number;
  expectedParticipants: number;
}) => {
  useEffect(() => {
    // Re-register components when the component mounts
    ChartJS.register(
      CategoryScale,
      LinearScale,
      BarElement,
      Title,
      Tooltip,
      Legend
    );

    // Cleanup
    return () => {
      // Force destroy chart instance when component unmounts
      const chartInstance = ChartJS.getChart("role-chart");
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [actualParticipants, expectedParticipants]);

  // Use real data from Firestore - actual vs expected completion rate
  const completionRate =
    expectedParticipants > 0
      ? Math.round((actualParticipants / expectedParticipants) * 100)
      : 0;

  const data = {
    labels: ["Completion Rate"],
    datasets: [
      {
        label: "Completion",
        data: [completionRate],
        backgroundColor:
          completionRate >= 75
            ? "rgba(75, 192, 192, 0.7)"
            : completionRate >= 50
            ? "rgba(255, 206, 86, 0.7)"
            : "rgba(255, 99, 132, 0.7)",
        borderColor:
          completionRate >= 75
            ? "rgba(75, 192, 192, 1)"
            : completionRate >= 50
            ? "rgba(255, 206, 86, 1)"
            : "rgba(255, 99, 132, 1)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="chart-container p-3 bg-white rounded shadow-sm h-100">
      <h3>Completion Rate</h3>
      <h5>{completionRate}% of Expected Turnout</h5>
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "320px" }}
      >
        <Bar
          id="role-chart"
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            scales: {
              x: {
                beginAtZero: true,
                max: 100,
                title: {
                  display: true,
                  text: "Completion Rate (%)",
                  font: {
                    weight: "bold",
                  },
                },
                grid: {
                  display: true,
                  color: "rgba(0, 0, 0, 0.05)",
                },
              },
              y: {
                grid: {
                  display: false,
                },
              },
            },
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                backgroundColor: "rgba(0,0,0,0.8)",
                callbacks: {
                  label: function (context) {
                    return `${Number(context.raw)}% completion rate`;
                  },
                },
              },
            },
            animation: {
              duration: 1000,
            },
          }}
          redraw={true}
        />
      </div>
    </div>
  );
};

// Component for success rate visualization
export const FeedbackChart = ({
  successRate,
  status,
}: {
  successRate: number;
  status: string;
}) => {
  useEffect(() => {
    // Re-register components when the component mounts
    ChartJS.register(
      CategoryScale,
      LinearScale,
      BarElement,
      Title,
      Tooltip,
      Legend
    );

    // Cleanup
    return () => {
      // Force destroy chart instance when component unmounts
      const chartInstance = ChartJS.getChart("feedback-chart");
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [successRate, status]);

  // Ensure successRate is a valid number between 0 and 100
  const validSuccessRate =
    typeof successRate === "number" && !isNaN(successRate)
      ? Math.min(Math.max(successRate, 0), 100)
      : 0;

  // Only show success rate data for completed events
  const isCompleted = status === "Completed";

  // Use real data from Firestore - only successRate
  const data = {
    labels: ["Success Rate"],
    datasets: [
      {
        label: "Success",
        data: [validSuccessRate],
        backgroundColor:
          validSuccessRate >= 75
            ? "rgba(75, 192, 192, 0.7)"
            : validSuccessRate >= 50
            ? "rgba(255, 206, 86, 0.7)"
            : "rgba(255, 99, 132, 0.7)",
        borderColor:
          validSuccessRate >= 75
            ? "rgba(75, 192, 192, 1)"
            : validSuccessRate >= 50
            ? "rgba(255, 206, 86, 1)"
            : "rgba(255, 99, 132, 1)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="chart-container p-3 bg-white rounded shadow-sm h-100">
      <h3>Success Rate</h3>
      <h5>
        {isCompleted
          ? `${validSuccessRate}% Overall Success`
          : "No data available"}
      </h5>
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "320px" }}
      >
        {isCompleted ? (
          <Bar
            id="feedback-chart"
            data={data}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: "y",
              scales: {
                x: {
                  beginAtZero: true,
                  max: 100,
                  title: {
                    display: true,
                    text: "Success Rate (%)",
                    font: {
                      weight: "bold",
                    },
                  },
                  grid: {
                    display: true,
                    color: "rgba(0, 0, 0, 0.05)",
                  },
                },
                y: {
                  grid: {
                    display: false,
                  },
                },
              },
              plugins: {
                legend: {
                  display: false,
                },
                tooltip: {
                  backgroundColor: "rgba(0,0,0,0.8)",
                  callbacks: {
                    label: function (context) {
                      return `${Number(context.raw)}% success rate`;
                    },
                  },
                },
              },
              animation: {
                duration: 1000,
              },
            }}
            redraw={true}
          />
        ) : (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-info-circle fs-1"></i>
            <p className="mt-3">
              Data will be available after the event is completed
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
