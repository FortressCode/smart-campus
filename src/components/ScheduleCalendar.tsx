// @ts-nocheck
import React, { useState, useMemo } from "react";
import moment from "moment";
import { Schedule } from "../interfaces/Schedule";

interface ScheduleCalendarProps {
  schedules: Schedule[];
  onEditSchedule: (schedule: Schedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  schedules,
  onEditSchedule,
  onDeleteSchedule,
}) => {
  const [currentDate, setCurrentDate] = useState(moment());
  const [currentView, setCurrentView] = useState<"month" | "week" | "day">(
    "month"
  );

  // Get days in month/week view
  const days = useMemo(() => {
    const daysArray = [];
    let startDate;
    let endDate;

    if (currentView === "month") {
      startDate = moment(currentDate).startOf("month").startOf("week");
      endDate = moment(currentDate).endOf("month").endOf("week");
    } else if (currentView === "week") {
      startDate = moment(currentDate).startOf("week");
      endDate = moment(currentDate).endOf("week");
    } else {
      // Day view
      startDate = moment(currentDate).startOf("day");
      endDate = moment(currentDate).endOf("day");
      // For day view, just return the current day
      return [moment(currentDate)];
    }

    let day = startDate.clone();
    while (day.isSameOrBefore(endDate)) {
      daysArray.push(day.clone());
      day.add(1, "day");
    }

    return daysArray;
  }, [currentDate, currentView]);

  // Get events for a specific day
  const getEventsForDay = (day: moment.Moment) => {
    return schedules.filter((schedule) => {
      // For one-time events, check the date
      if (!schedule.isRecurring) {
        // Parse the date string in YYYY-MM-DD format
        const scheduleDate = schedule.date;
        const isSameDay = moment(scheduleDate).isSame(day, "day");
        return isSameDay;
      }

      // For recurring events, check the day of week
      const dayName = day.format("dddd"); // Monday, Tuesday, etc.

      // Make sure we're doing a case-insensitive comparison
      // Also trim any whitespace that might be in the data
      const scheduleDayOfWeek = schedule.dayOfWeek.trim();
      const currentDayOfWeek = dayName.trim();

      const isMatchingDay =
        scheduleDayOfWeek.toLowerCase() === currentDayOfWeek.toLowerCase();

      // console.log('Day check:', {
      //   dayName,
      //   scheduleDayOfWeek,
      //   isMatchingDay,
      //   moduleTitle: schedule.moduleTitle
      // });

      return isMatchingDay;
    });
  };

  // Calculate hours for day view
  const hours = useMemo(() => {
    const hoursArray = [];
    for (let i = 8; i <= 20; i++) {
      hoursArray.push(i);
    }
    return hoursArray;
  }, []);

  // Navigation functions
  const goToToday = () => setCurrentDate(moment());

  const goToPrev = () => {
    if (currentView === "month") {
      setCurrentDate(moment(currentDate).subtract(1, "month"));
    } else if (currentView === "week") {
      setCurrentDate(moment(currentDate).subtract(1, "week"));
    } else {
      setCurrentDate(moment(currentDate).subtract(1, "day"));
    }
  };

  const goToNext = () => {
    if (currentView === "month") {
      setCurrentDate(moment(currentDate).add(1, "month"));
    } else if (currentView === "week") {
      setCurrentDate(moment(currentDate).add(1, "week"));
    } else {
      setCurrentDate(moment(currentDate).add(1, "day"));
    }
  };

  // Render event
  const renderEvent = (schedule: Schedule) => {
    const timeDisplay = `${schedule.startTime} - ${schedule.endTime}`;

    // Use different styles for recurring vs one-time events
    const bgColor = schedule.isRecurring
      ? "var(--primary-color)"
      : "var(--bs-success)";

    return (
      <div
        key={schedule.id}
        className="p-1 mb-1 rounded"
        style={{
          backgroundColor: bgColor,
          color: "white",
          cursor: "pointer",
          fontSize: "0.8rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        onClick={() => onEditSchedule(schedule)}
        title={`${schedule.moduleTitle} - ${
          schedule.isRecurring
            ? "Recurring every " + schedule.dayOfWeek
            : "One-time on " + schedule.date
        }`}
      >
        <div className="fw-bold">
          {schedule.moduleTitle}
          {schedule.isRecurring && <span className="ms-1">🔄</span>}
        </div>
        <div>
          {timeDisplay} • Room {schedule.classroomNumber}
        </div>
        <div>{schedule.lecturerName}</div>
      </div>
    );
  };

  // Render month view
  const renderMonthView = () => {
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return (
      <div className="calendar-container">
        <div className="calendar-header d-flex">
          {daysOfWeek.map((day) => (
            <div key={day} className="flex-grow-1 text-center fw-bold p-2">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-body">
          <div className="row row-cols-7 g-0">
            {days.map((day) => {
              const eventsForDay = getEventsForDay(day);
              const isCurrentMonth = day.month() === currentDate.month();
              const isToday = day.isSame(moment(), "day");

              return (
                <div
                  key={day.format("YYYY-MM-DD")}
                  className={`col border p-0 ${
                    isCurrentMonth ? "" : "text-muted"
                  }`}
                  style={{
                    minHeight: "100px",
                    backgroundColor: isToday
                      ? "rgba(var(--bs-primary-rgb), 0.1)"
                      : "",
                  }}
                >
                  <div className="p-1 d-flex justify-content-between">
                    <span className={isToday ? "fw-bold text-primary" : ""}>
                      {day.date()}
                    </span>
                    {eventsForDay.length > 0 && (
                      <span className="badge bg-primary rounded-pill">
                        {eventsForDay.length}
                      </span>
                    )}
                  </div>
                  <div
                    className="event-container p-1"
                    style={{ maxHeight: "80px", overflowY: "auto" }}
                  >
                    {eventsForDay
                      .slice(0, 3)
                      .map((schedule) => renderEvent(schedule))}
                    {eventsForDay.length > 3 && (
                      <div className="text-primary small">
                        +{eventsForDay.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    return (
      <div className="calendar-container">
        <div className="calendar-body">
          <div className="row row-cols-7 g-0">
            {days.map((day) => {
              const eventsForDay = getEventsForDay(day);
              const isToday = day.isSame(moment(), "day");

              return (
                <div
                  key={day.format("YYYY-MM-DD")}
                  className="col border p-2"
                  style={{
                    minHeight: "200px",
                    backgroundColor: isToday
                      ? "rgba(var(--bs-primary-rgb), 0.1)"
                      : "",
                  }}
                >
                  <div className="p-1 d-flex justify-content-between">
                    <div>
                      <div
                        className={isToday ? "fw-bold text-primary" : "fw-bold"}
                      >
                        {day.format("ddd")}
                      </div>
                      <div className={isToday ? "fw-bold text-primary" : ""}>
                        {day.format("MMM D")}
                      </div>
                    </div>
                    {eventsForDay.length > 0 && (
                      <span className="badge bg-primary rounded-pill">
                        {eventsForDay.length}
                      </span>
                    )}
                  </div>
                  <div
                    className="event-container mt-2"
                    style={{ overflowY: "auto" }}
                  >
                    {eventsForDay.map((schedule) => renderEvent(schedule))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const day = currentDate;
    const eventsForDay = getEventsForDay(day);
    const eventsByHour: Record<number, Schedule[]> = {};

    // Group events by hour
    eventsForDay.forEach((schedule) => {
      const startHour = parseInt(schedule.startTime.split(":")[0]);
      if (!eventsByHour[startHour]) {
        eventsByHour[startHour] = [];
      }
      eventsByHour[startHour].push(schedule);
    });

    return (
      <div className="calendar-container">
        <div className="p-2 fw-bold text-center">
          {day.format("dddd, MMMM D, YYYY")}
        </div>
        <div className="calendar-body">
          {hours.map((hour) => {
            const eventsThisHour = eventsByHour[hour] || [];
            const timeLabel = `${hour}:00`;

            return (
              <div key={hour} className="row border-bottom g-0">
                <div className="col-1 p-2 text-end text-muted">{timeLabel}</div>
                <div className="col-11 border-start p-1">
                  {eventsThisHour.map((schedule) => renderEvent(schedule))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="schedule-calendar" style={{ height: "650px" }}>
      {/* Toolbar */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <span className="fw-bold">
            {currentView === "month" && currentDate.format("MMMM YYYY")}
            {currentView === "week" &&
              `Week of ${currentDate
                .startOf("week")
                .format("MMM D")} - ${currentDate
                .endOf("week")
                .format("MMM D, YYYY")}`}
            {currentView === "day" && currentDate.format("MMMM D, YYYY")}
          </span>
        </div>
        <div className="btn-group">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={goToPrev}
          >
            <i className="bi bi-chevron-left"></i>
          </button>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={goToToday}
          >
            Today
          </button>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={goToNext}
          >
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
        <div className="btn-group">
          <button
            type="button"
            className={`btn ${
              currentView === "month" ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={() => setCurrentView("month")}
          >
            Month
          </button>
          <button
            type="button"
            className={`btn ${
              currentView === "week" ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={() => setCurrentView("week")}
          >
            Week
          </button>
          <button
            type="button"
            className={`btn ${
              currentView === "day" ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={() => setCurrentView("day")}
          >
            Day
          </button>
        </div>
      </div>

      {/* Calendar Views */}
      <div
        className="calendar-wrapper"
        style={{ height: "calc(650px - 60px)", overflowY: "auto" }}
      >
        {currentView === "month" && renderMonthView()}
        {currentView === "week" && renderWeekView()}
        {currentView === "day" && renderDayView()}
      </div>
    </div>
  );
};

export default ScheduleCalendar;
