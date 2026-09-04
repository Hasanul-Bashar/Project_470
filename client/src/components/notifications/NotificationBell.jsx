import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearReadNotifications,
} from '../../services/notificationApi';

const TYPE_ICON = {
  rent_due:               '💳',
  rent_overdue:           '🚨',
  rent_paid:              '✅',
  maintenance_submitted:  '🛠️',
  maintenance_updated:    '🔧',
  maintenance_resolved:   '✅',
  booking_approved:       '🏠',
  booking_rejected:       '❌',
  booking_request:        '📋',
  complaint_updated:      '📣',
  system:                 'ℹ️',
};

const TYPE_COLOR = {
  rent_due:               '#3b82f6',
  rent_overdue:           '#ef4444',
  rent_paid:              '#10b981',
  maintenance_submitted:  '#8b5cf6',
  maintenance_updated:    '#f97316',
  maintenance_resolved:   '#10b981',
  booking_approved:       '#10b981',
  booking_rejected:       '#ef4444',
  booking_request:        '#3b82f6',
  complaint_updated:      '#f59e0b',
  system:                 '#64748b',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const pollRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (_) {}
  }, [user]);

  // Initial fetch + poll every 30s
  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) fetchNotifications();
  };

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (_) {}
    setLoading(false);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setUnreadCount((c) => {
        const deleted = notifications.find((n) => n._id === id);
        return deleted && !deleted.isRead ? Math.max(0, c - 1) : c;
      });
    } catch (_) {}
  };

  const handleClearRead = async () => {
    setLoading(true);
    try {
      await clearReadNotifications();
      setNotifications((prev) => prev.filter((n) => !n.isRead));
    } catch (_) {}
    setLoading(false);
  };

  const handleClickNotification = async (notif) => {
    if (!notif.isRead) {
      await markNotificationRead(notif._id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (notif.link) {
      navigate(notif.link);
      setIsOpen(false);
    }
  };

  if (!user) return null;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* ── Bell Button ──────────────────────────────────────── */}
      <button
        id="btn-notification-bell"
        onClick={handleToggle}
        title="Notifications"
        style={{
          background: isOpen ? 'rgba(99,102,241,0.15)' : 'transparent',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          cursor: 'pointer',
          padding: '6px 10px',
          position: 'relative',
          fontSize: '1.2rem',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          color: '#f8fafc',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              fontSize: '0.68rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #0f1117',
              animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ───────────────────────────────────── */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '380px',
            maxHeight: '520px',
            background: '#13151f',
            border: '1px solid #272a37',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1rem 1.2rem 0.8rem',
              borderBottom: '1px solid #1e2130',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 700 }}>
                🔔 Notifications
              </h4>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {unreadCount > 0 && (
                <button
                  className="btn btn-sm btn-outline"
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                >
                  ✓ All Read
                </button>
              )}
              <button
                className="btn btn-sm btn-outline"
                onClick={handleClearRead}
                disabled={loading}
                style={{ fontSize: '0.7rem', padding: '3px 8px' }}
              >
                🗑 Clear Read
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '3rem 1rem',
                  textAlign: 'center',
                  color: '#4b5563',
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔕</div>
                <div style={{ fontSize: '0.9rem' }}>No notifications yet</div>
              </div>
            ) : (
              notifications.map((notif) => {
                const icon = TYPE_ICON[notif.type] || 'ℹ️';
                const color = TYPE_COLOR[notif.type] || '#64748b';
                return (
                  <div
                    key={notif._id}
                    onClick={() => handleClickNotification(notif)}
                    style={{
                      padding: '0.9rem 1.2rem',
                      borderBottom: '1px solid #1a1d28',
                      background: notif.isRead ? 'transparent' : 'rgba(99,102,241,0.04)',
                      cursor: notif.link ? 'pointer' : 'default',
                      display: 'flex',
                      gap: '0.8rem',
                      alignItems: 'flex-start',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = notif.isRead
                        ? 'transparent'
                        : 'rgba(99,102,241,0.04)';
                    }}
                  >
                    {/* Icon circle */}
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: `${color}22`,
                        border: `1px solid ${color}44`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        flexShrink: 0,
                      }}
                    >
                      {icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: notif.isRead ? 500 : 700,
                          color: notif.isRead ? '#94a3b8' : '#f1f5f9',
                          marginBottom: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {notif.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: '#64748b',
                          lineHeight: 1.4,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {notif.message}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '4px' }}>
                        {timeAgo(notif.createdAt)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div
                      style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}
                    >
                      {!notif.isRead && (
                        <button
                          title="Mark as read"
                          onClick={(e) => handleMarkRead(notif._id, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#6366f1',
                            fontSize: '0.75rem',
                            padding: '2px',
                          }}
                        >
                          ✓
                        </button>
                      )}
                      <button
                        title="Delete"
                        onClick={(e) => handleDelete(notif._id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#475569',
                          fontSize: '0.75rem',
                          padding: '2px',
                        }}
                        onMouseEnter={(e) => (e.target.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.target.style.color = '#475569')}
                      >
                        ×
                      </button>
                    </div>

                    {/* Unread dot */}
                    {!notif.isRead && (
                      <div
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: color,
                          flexShrink: 0,
                          marginTop: '4px',
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '0.7rem 1.2rem',
              borderTop: '1px solid #1e2130',
              textAlign: 'center',
            }}
          >
            <button
              className="text-link-btn"
              onClick={() => {
                setIsOpen(false);
                fetchNotifications();
              }}
              style={{ fontSize: '0.75rem', color: '#94a3b8' }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
