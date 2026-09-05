import React, { useState, useMemo } from 'react';

/**
 * BookingCalendarPicker
 * ─────────────────────
 * An intuitive interactive calendar for tenants to easily mark, select, and review
 * dates when booking a property.
 *
 * Features:
 * - Visual month grid with weekdays and navigation
 * - Automatic disabling and red-badging of already booked/unavailable dates
 * - Disabling of past dates (strictly enforces future bookings)
 * - Single-click date toggling + Shift-click / range selection
 * - 1-Click quick presets: "Tomorrow", "Next 3 Days", "Next 7 Days", "Next 14 Days", "Next 30 Days"
 * - Selected dates pill tags with (×) quick-remove
 * - Real-time estimated rent calculator based on selected days
 * - Synchronized comma-separated output
 */
export default function BookingCalendarPicker({
  alreadyBookedDates = [],
  selectedDates = [],
  onDatesChange,
  propertyPrice = 0,
}) {
  const [currentDate, setCurrentDate] = useState(() => {
    // Start calendar on current month, or the month of the first selected date
    if (selectedDates && selectedDates.length > 0) {
      const first = new Date(selectedDates[0]);
      if (!isNaN(first.getTime())) return first;
    }
    return new Date();
  });

  const [lastClickedDate, setLastClickedDate] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);

  // Set of already booked dates for O(1) lookup
  const bookedSet = useMemo(() => {
    return new Set(alreadyBookedDates || []);
  }, [alreadyBookedDates]);

  // Set of selected dates for O(1) lookup
  const selectedSet = useMemo(() => {
    return new Set(selectedDates || []);
  }, [selectedDates]);

  // Today formatted as YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const formatDateStr = (y, m, d) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay(); // 0 = Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Month navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Date selection logic
  const handleDateClick = (dateStr, isShiftKey = false) => {
    if (dateStr < todayStr || bookedSet.has(dateStr)) return;

    let updatedList = [...selectedDates];

    // If shift key held and we had a previous click, select range
    if (isShiftKey && lastClickedDate) {
      const [start, end] = [lastClickedDate, dateStr].sort();
      const cur = new Date(start);
      const stop = new Date(end);

      while (cur <= stop) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const s = `${y}-${m}-${d}`;
        if (s >= todayStr && !bookedSet.has(s) && !updatedList.includes(s)) {
          updatedList.push(s);
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      // Toggle single date
      if (selectedSet.has(dateStr)) {
        updatedList = updatedList.filter((d) => d !== dateStr);
      } else {
        updatedList.push(dateStr);
      }
    }

    // Sort chronologically
    updatedList.sort();
    setLastClickedDate(dateStr);
    onDatesChange(updatedList);
  };

  const removeDate = (dateStr) => {
    const updated = selectedDates.filter((d) => d !== dateStr);
    onDatesChange(updated);
  };

  const clearAllDates = () => {
    setLastClickedDate(null);
    onDatesChange([]);
  };

  // Quick Preset Handlers
  const applyPresetDays = (daysCount, startOffset = 1) => {
    const list = [];
    const cur = new Date();
    cur.setDate(cur.getDate() + startOffset);

    for (let i = 0; i < daysCount; i++) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const s = `${y}-${m}-${d}`;
      // Only include if not booked
      if (!bookedSet.has(s)) {
        list.push(s);
      }
      cur.setDate(cur.getDate() + 1);
    }

    list.sort();
    onDatesChange(list);
    if (list.length > 0) {
      setCurrentDate(new Date(list[0]));
    }
  };

  // Manual comma-separated text edit
  const handleManualTextChange = (text) => {
    const parsed = text
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !bookedSet.has(s) && s >= todayStr);
    // remove duplicates and sort
    const unique = Array.from(new Set(parsed)).sort();
    onDatesChange(unique);
  };

  // Estimated rent
  const estCost = useMemo(() => {
    if (!propertyPrice || selectedDates.length === 0) return null;
    const dailyRate = propertyPrice / 30;
    return Math.round(dailyRate * selectedDates.length);
  }, [propertyPrice, selectedDates]);

  // Construct Calendar Grid
  const cells = [];
  for (let i = 0; i < startDay; i++) {
    cells.push(<div key={`bcp-empty-${i}`} className="bcp-cell empty" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateStr(year, month, day);
    const isPast = dateStr < todayStr;
    const isBooked = bookedSet.has(dateStr);
    const isSelected = selectedSet.has(dateStr);
    const isToday = dateStr === todayStr;

    let cellClass = 'bcp-day-btn';
    if (isPast) cellClass += ' past disabled';
    else if (isBooked) cellClass += ' booked disabled';
    else if (isSelected) cellClass += ' selected';
    else cellClass += ' available';

    if (isToday) cellClass += ' today';

    let title = `${dateStr}`;
    if (isPast) title += ' (Past Date)';
    else if (isBooked) title += ' (Booked / Unavailable)';
    else if (isSelected) title += ' (Selected - Click to unselect)';
    else title += ' (Available - Click to select, Shift+Click for range)';

    cells.push(
      <button
        key={`bcp-day-${day}`}
        type="button"
        disabled={isPast || isBooked}
        onClick={(e) => handleDateClick(dateStr, e.shiftKey)}
        className={cellClass}
        title={title}
        aria-label={title}
      >
        <span className="bcp-day-num">{day}</span>
        {isSelected && <span className="bcp-check-badge">✓</span>}
        {isBooked && <span className="bcp-booked-dot" />}
      </button>
    );
  }

  return (
    <div className="bcp-container">
      {/* ── Top Bar: Month Title & Navigation ─────────────────── */}
      <div className="bcp-header">
        <div className="bcp-month-display">
          <span className="bcp-calendar-icon">📅</span>
          <span className="bcp-month-label">{monthNames[month]} {year}</span>
        </div>
        <div className="bcp-nav-btns">
          <button
            type="button"
            className="bcp-btn-nav"
            onClick={prevMonth}
            title="Previous Month"
          >
            ◀
          </button>
          <button
            type="button"
            className="bcp-btn-today"
            onClick={goToToday}
            title="Go to Today"
          >
            Today
          </button>
          <button
            type="button"
            className="bcp-btn-nav"
            onClick={nextMonth}
            title="Next Month"
          >
            ▶
          </button>
        </div>
      </div>

      {/* ── Quick Presets Bar ───────────────────────────────── */}
      <div className="bcp-presets-bar">
        <span className="bcp-presets-title">Quick Select:</span>
        <button
          type="button"
          className="bcp-preset-pill"
          onClick={() => applyPresetDays(1, 1)}
        >
          Tomorrow
        </button>
        <button
          type="button"
          className="bcp-preset-pill"
          onClick={() => applyPresetDays(3, 1)}
        >
          +3 Days
        </button>
        <button
          type="button"
          className="bcp-preset-pill"
          onClick={() => applyPresetDays(7, 1)}
        >
          Next 7 Days
        </button>
        <button
          type="button"
          className="bcp-preset-pill"
          onClick={() => applyPresetDays(14, 1)}
        >
          Next 14 Days
        </button>
        <button
          type="button"
          className="bcp-preset-pill"
          onClick={() => applyPresetDays(30, 1)}
        >
          Next 30 Days
        </button>
        {selectedDates.length > 0 && (
          <button
            type="button"
            className="bcp-preset-pill clear"
            onClick={clearAllDates}
            title="Clear all marked dates"
          >
            ✕ Clear ({selectedDates.length})
          </button>
        )}
      </div>

      {/* ── Weekdays Header ─────────────────────────────────── */}
      <div className="bcp-weekdays">
        {weekdayNames.map((w) => (
          <div key={w} className="bcp-weekday">{w}</div>
        ))}
      </div>

      {/* ── Calendar Days Grid ──────────────────────────────── */}
      <div className="bcp-grid">
        {cells}
      </div>

      {/* ── Color Legend ────────────────────────────────────── */}
      <div className="bcp-legend">
        <div className="bcp-legend-item">
          <span className="bcp-dot dot-available" />
          <span>Available (Click to mark)</span>
        </div>
        <div className="bcp-legend-item">
          <span className="bcp-dot dot-selected" />
          <span>Marked / Selected</span>
        </div>
        <div className="bcp-legend-item">
          <span className="bcp-dot dot-booked" />
          <span>Booked / Unavailable</span>
        </div>
        <div className="bcp-legend-item">
          <span className="bcp-dot dot-past" />
          <span>Past Date</span>
        </div>
      </div>

      {/* ── Selected Dates Chips & Financial Summary ────────── */}
      <div className="bcp-summary-card">
        <div className="bcp-summary-header">
          <div className="bcp-count-badge">
            <strong>{selectedDates.length}</strong> {selectedDates.length === 1 ? 'Date' : 'Dates'} Marked
          </div>
          {estCost !== null && selectedDates.length > 0 && (
            <div className="bcp-est-cost">
              Est. Rent: <strong>BDT {estCost.toLocaleString()}</strong>
              <span className="bcp-rate-sub"> (~BDT {Math.round(propertyPrice / 30).toLocaleString()}/day)</span>
            </div>
          )}
        </div>

        {selectedDates.length > 0 ? (
          <div className="bcp-chips-wrap">
            {selectedDates.map((date) => (
              <span key={date} className="bcp-date-chip">
                <span>{date}</span>
                <button
                  type="button"
                  className="bcp-chip-remove"
                  onClick={() => removeDate(date)}
                  title={`Remove ${date}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="bcp-empty-hint">
            💡 Click on any green calendar date above or use the quick buttons to mark your desired rental dates. Hold <kbd>Shift</kbd> to mark a date range!
          </p>
        )}
      </div>

      {/* ── Optional Manual Comma-separated Text Toggle ─────── */}
      <div className="bcp-manual-toggle-row">
        <button
          type="button"
          className="bcp-toggle-link"
          onClick={() => setShowManualInput((prev) => !prev)}
        >
          {showManualInput ? '▲ Hide raw comma-separated text' : '▼ View / Edit raw comma-separated text'}
        </button>

        {showManualInput && (
          <div style={{ marginTop: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 2026-09-15, 2026-09-16, 2026-09-17"
              value={selectedDates.join(', ')}
              onChange={(e) => handleManualTextChange(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '0.25rem' }}>
              Dates typed here will automatically synchronize with the calendar above.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
