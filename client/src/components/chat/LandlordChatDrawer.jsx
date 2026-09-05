import { useState, useEffect } from 'react';
import Modal from '../Modal';
import { getChats, sendMessage } from '../../services/chatApi';

export default function LandlordChatDrawer({
  isOpen = true,
  onClose,
  selectedListingId,
  preselectedListing,
}) {
  if (!isOpen) return null;

  const listingFilterId = selectedListingId || preselectedListing?._id || (typeof preselectedListing === 'string' ? preselectedListing : null);

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const res = await getChats();
      let allChats = res.data || [];
      if (listingFilterId) {
        allChats = allChats.filter((c) => c.listingId === listingFilterId || c.listingId?._id === listingFilterId);
      }
      setChats(allChats);
      // Auto-select first chat or keep current
      if (allChats.length > 0) {
        setActiveChat((prev) => (prev ? allChats.find((c) => c._id === prev._id) || allChats[0] : allChats[0]));
      } else {
        setActiveChat(null);
      }
    } catch (err) {
      console.error('Error fetching landlord chats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChats();
    }
  }, [listingFilterId, isOpen]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeChat) return;

    try {
      setSending(true);
      await sendMessage(activeChat._id, replyText.trim());
      setReplyText('');
      await fetchChats();
    } catch (err) {
      alert('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title="💬 Tenant Inquiries & Messages" onClose={onClose}>
      <div style={{ padding: '1rem', height: '560px', display: 'flex', gap: '1rem' }}>
        {/* ── LEFT SIDEBAR: THREAD LIST ───────────────────────────── */}
        <div
          style={{
            width: '240px',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            paddingRight: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
              CONVERSATIONS ({chats.length})
            </span>
            <button
              className="btn btn-sm btn-secondary"
              style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
              onClick={fetchChats}
            >
              🔄
            </button>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>Loading inquiries...</p>
          ) : chats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
              No messages from tenants yet. When tenants chat from your listings, they will appear here!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {chats.map((c) => {
                const isSelected = activeChat?._id === c._id;
                return (
                  <div
                    key={c._id}
                    onClick={() => setActiveChat(c)}
                    style={{
                      padding: '0.65rem 0.8rem',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isSelected ? 'var(--purple)' : 'rgba(255, 255, 255, 0.06)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>{c.tenantName}</strong>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                        {new Date(c.lastMessageAt || c.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#c084fc', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      🏠 {c.listingTitle}
                    </div>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.lastMessage || 'Chat thread initiated'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT MAIN PANEL: ACTIVE CONVERSATION ───────────────── */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {!activeChat ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
              Select an inquiry conversation on the left to view messages and reply.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Thread Header */}
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#f8fafc' }}>
                    Chat with: <span style={{ color: '#38bdf8' }}>{activeChat.tenantName}</span>
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Property: <strong>{activeChat.listingTitle}</strong>
                  </span>
                </div>
              </div>

              {/* Messages Body */}
              <div
                style={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  marginBottom: '0.75rem',
                }}
              >
                {activeChat.messages?.map((m, idx) => {
                  const isLandlord = m.senderRole === 'landlord';
                  const isSystem = m.senderRole === 'system';

                  if (isSystem) {
                    return (
                      <div
                        key={m._id || idx}
                        style={{
                          alignSelf: 'center',
                          padding: '0.4rem 0.75rem',
                          background: 'rgba(139, 92, 246, 0.1)',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                          borderRadius: '8px',
                          color: '#c084fc',
                          fontSize: '0.75rem',
                          textAlign: 'center',
                        }}
                      >
                        🔔 {m.text}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m._id || idx}
                      style={{
                        alignSelf: isLandlord ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isLandlord ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          background: isLandlord
                            ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                            : 'rgba(255, 255, 255, 0.08)',
                          border: isLandlord ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: isLandlord ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                          padding: '0.55rem 0.85rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', marginBottom: '0.15rem' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isLandlord ? '#f8fafc' : '#38bdf8' }}>
                            {m.senderName} ({isLandlord ? 'You' : 'Tenant'})
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: '#f8fafc', whiteSpace: 'pre-wrap' }}>
                          {m.text}
                        </p>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.15rem', padding: '0 0.2rem' }}>
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Reply Input */}
              <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`Reply to ${activeChat.tenantName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{ flexGrow: 1 }}
                />
                <button type="submit" className="btn btn-primary" disabled={sending || !replyText.trim()}>
                  {sending ? 'Sending...' : 'Reply 🚀'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
