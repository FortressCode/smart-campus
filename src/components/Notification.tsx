import React from "react";
import {
  useNotification,
  Notification as NotificationType,
} from "../contexts/NotificationContext";
import "../styles/Notification.css";

const Notification: React.FC = () => {
  const { notifications } = useNotification();

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div key={notification.id} className="notification">
          <div className="notification-message">{notification.message}</div>
        </div>
      ))}
    </div>
  );
};

export default Notification;
