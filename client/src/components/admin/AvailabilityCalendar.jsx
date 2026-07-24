import { useState } from 'react';

/**
 * AvailabilityCalendar
 * ────────────────────
 * A custom visual grid calendar for the current and selected months.
 * Landlords can click individual dates to toggle them between Available and Booked.
 */
export default function AvailabilityCalendar({ initialBookedDates, onSave, onCancel }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookedDates, setBookedDates] = useState(new Set(initialBookedDates || []));

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

  // Toggle booking status of a day
  const handleDateClick = (day) => {
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
    onSave(Array.from(bookedDates));
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
        onClick={() => handleDateClick(day)}
        className={`calendar-day-btn ${isBooked ? 'booked' : 'available'}`}
        title={isBooked ? 'Booked - Click to make available' : 'Available - Click to mark booked'}
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
        {weekdayNames.map(name => (
          <div key={name} className="weekday-header">{name}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {cells}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot available"></span>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot booked"></span>
          <span>Booked / Blocked</span>
        </div>
      </div>

      <div className="calendar-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          Save Availability
        </button>
      </div>
    </div>
  );
}
