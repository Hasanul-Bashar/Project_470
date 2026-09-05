import { useState, useEffect, useRef } from 'react';
import Modal from '../Modal';
import { getOrCreateChatByListing, getChatById, sendMessage } from '../../services/chatApi';
import { useAuth } from '../../context/AuthContext';

export default function ChatModal({ listing, initialChatId, onClose }) {
  const { user } = useAuth();
  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchChat = async () => {
    try {
      setLoading(true);
      let res;
      if (initialChatId) {
        res = await getChatById(initialChatId);
      } else if (listing?._id) {
        res = await getOrCreateChatByListing(listing._id);
      }
      if (res?.data) {
        setChat(res.data);
      }
    } catch (err) {
      console.error('Error fetching chat:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChat();
  }, [listing?._id, initialChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !chat) return;

    try {
      setSending(true);
      await sendMessage(chat._id, messageText.trim());
      setMessageText('');
      fetchChat();
    } catch (err) {
      alert('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const isLandlord = user?.role === 'landlord';
  const otherPartyName = isLandlord
    ? chat?.tenantName || 'Tenant'
    : chat?.landlordName || 'Landlord';

  const modalTitle = chat?.listingTitle
    ? `💬 Chat: ${chat.listingTitle} (${otherPartyName})`
    : listing?.title
    ? `💬 Chat: ${listing.title}`
    : '💬 Chat Thread';

  return (
    <Modal title={modalTitle} onClose={onClose}>
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '520px' }}>
        {/* Listing Summary Header */}
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            marginBottom: '0.85rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc' }}>
              {chat?.listingTitle || listing?.title}
            </h4>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Speaking with: <strong style={{ color: isLandlord ? '#38bdf8' : '#c084fc' }}>{otherPartyName}</strong>
              {isLandlord && <span style={{ marginLeft: '0.5rem', color: '#64748b' }}>• Tenant Inquiry</span>}
            </p>
          </div>
          <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }} onClick={fetchChat}>
            🔄 Refresh
          </button>
        </div>

        {/* Message Thread */}
        <div
          style={{
            flexGrow: 1,
            overflowY: 'auto',
            padding: '0.85rem',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginBottom: '0.85rem',
          }}
        >
          {loading ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto' }}>
              Loading chat messages...
            </p>
          ) : !chat?.messages || chat.messages.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto' }}>
              No messages yet. Send a message below to begin the conversation!
            </p>
          ) : (
            chat.messages.map((m, idx) => {
              const isSystem = m.senderRole === 'system';
              const isMe =
                m.senderId === user?.id?.toString() ||
                (isLandlord && m.senderRole === 'landlord') ||
                (!isLandlord && m.senderRole === 'user');

              if (isSystem) {
                return (
                  <div
                    key={m._id || idx}
                    style={{
                      alignSelf: 'center',
                      maxWidth: '90%',
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      borderRadius: '10px',
                      padding: '0.5rem 0.85rem',
                      textAlign: 'center',
                      fontSize: '0.78rem',
                      color: '#c084fc',
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
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      background: isMe
                        ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                        : 'rgba(255, 255, 255, 0.07)',
                      border: isMe ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: '0.65rem 0.95rem',
                      boxShadow: isMe ? '0 4px 12px rgba(139, 92, 246, 0.3)' : '0 2px 6px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.2rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: isMe ? '#f8fafc' : m.senderRole === 'landlord' ? '#fbbf24' : '#38bdf8',
                        }}
                      >
                        {m.senderName} ({m.senderRole === 'landlord' ? 'Landlord' : 'Tenant'})
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: '#f8fafc', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                      {m.text}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '0.2rem', padding: '0 0.3rem' }}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder={
              isLandlord
                ? `Reply to ${otherPartyName}...`
                : 'Type your message to landlord...'
            }
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            style={{ flexGrow: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={sending || !messageText.trim()}>
            {sending ? 'Sending...' : 'Send 🚀'}
          </button>
        </form>
      </div>
    </Modal>
  );
}
