import { useState, useEffect } from 'react';

/**
 * AvailabilityCalendar
 * ────────────────────
 * A visual grid calendar for property availability.
 * If readOnly is true (for tenants), dates are display-only and cannot be clicked or modified.
 * Only landlords (readOnly = false) can select dates and save changes.
 */
export default function AvailabilityCalendar({
  initialBookedDates = [],
  onSave,
  onCancel,
  readOnly = false,
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookedDates, setBookedDates] = useState(new Set(initialBookedDates || []));

  useEffect(() => {
    setBookedDates(new Set(initialBookedDates || []));
  }, [initialBookedDates]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper to format date as YYYY-MM-DD in local time
  const formatDateStr = (y, m, d) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  // Get days in month and start day
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  // Toggle booking status of a day (Only permitted for Landlords)
  const handleDateClick = (day) => {
    if (readOnly) return; // Strict gate: tenants cannot select/toggle dates

    const dateStr = formatDateStr(year, month, day);
    const updated = new Set(bookedDates);
    if (updated.has(dateStr)) {
      updated.delete(dateStr);
    } else {
      updated.add(dateStr);
    }
    setBookedDates(updated);
  };

  // Month navigation
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleSave = () => {
    if (readOnly) return;
    if (onSave) onSave(Array.from(bookedDates));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Construct calendar grid cells
  const cells = [];
  // Empty slots before start of month
  for (let i = 0; i < startDay; i++) {
    cells.push(<div key={`empty-${i}`} className="calendar-day empty" />);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateStr(year, month, day);
    const isBooked = bookedDates.has(dateStr);

    cells.push(
      <button
        key={`day-${day}`}
        type="button"
        disabled={readOnly}
        onClick={() => handleDateClick(day)}
        className={`calendar-day-btn ${isBooked ? 'booked' : 'available'}`}
        style={{
          cursor: readOnly ? 'default' : 'pointer',
          opacity: readOnly && isBooked ? 0.85 : 1,
        }}
        title={
          readOnly
            ? isBooked
              ? 'Booked / Unavailable'
              : 'Available Date'
            : isBooked
            ? 'Booked - Click to make available'
            : 'Available - Click to mark booked'
        }
      >
        <span className="day-number">{day}</span>
        <span className="status-indicator"></span>
      </button>
    );
  }

  return (
    <div className="calendar-wrapper">
      <div className="calendar-header">
        <button type="button" onClick={prevMonth} className="btn-icon">◀</button>
        <h3 className="calendar-month-title">{monthNames[month]} {year}</h3>
        <button type="button" onClick={nextMonth} className="btn-icon">▶</button>
      </div>

      <div className="calendar-weekdays">
        {weekdayNames.map((name) => (
          <div key={name} className="weekday-header">{name}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {cells}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot available"></span>
          <span>Available for Rental</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot booked"></span>
          <span>Booked / Blocked</span>
        </div>
      </div>

      {readOnly ? (
        <div className="calendar-actions" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Close Calendar View
          </button>
        </div>
      ) : (
        <div className="calendar-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            💾 Save Availability
          </button>
        </div>
      )}
    </div>
  );
}
