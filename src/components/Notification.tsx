import React from "react";
import {
  useNotification,
  Notification as NotificationType,
} from "../contexts/NotificationContext";
import "../styles/Notification.css";

const Notification: React.FC = () => {
  const { notifications, dismissNotification } = useNotification();

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div key={notification.id} className="notification">
          <div className="notification-content">
            <div className="notification-message">{notification.message}</div>
            <button
              className="notification-close"
              onClick={() => dismissNotification(notification.id)}
              aria-label="Close notification"
            >
              <i className="bi bi-x"></i>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Notification;
