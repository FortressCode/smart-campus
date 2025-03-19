import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
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

// Initialize Chart.js
const initializeChartJS = () => {
  try {
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
    console.log("ChartJS registered successfully");
    return true;
  } catch (e) {
    console.error("Failed to register Chart.js components:", e);
    return false;
  }
};

interface ChartWrapperProps {
  children: React.ReactNode;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const success = initializeChartJS();
    setIsInitialized(success);

    return () => {
      // Cleanup existing chart instances
      const chartInstances = ChartJS.instances;
      Object.keys(chartInstances).forEach((key) => {
        try {
          chartInstances[key].destroy();
        } catch (e) {
          console.error(`Failed to destroy chart instance ${key}:`, e);
        }
      });
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="p-3 bg-white rounded shadow-sm">
        Chart initialization failed. Please try refreshing the page.
      </div>
    );
  }

  return <>{children}</>;
};

export default ChartWrapper;
