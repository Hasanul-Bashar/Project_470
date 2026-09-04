import { useState, useEffect } from 'react';
import Modal from '../Modal';
import { getOrCreateChatByListing, sendMessage } from '../../services/chatApi';

export default function ChatModal({ listing, onClose }) {
  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchChat = async () => {
    try {
      setLoading(true);
      const res = await getOrCreateChatByListing(listing._id);
      setChat(res.data);
    } catch (err) {
      console.error('Error fetching chat:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listing?._id) {
      fetchChat();
    }
  }, [listing?._id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !chat) return;

    try {
      setSending(true);
      await sendMessage(chat._id, messageText);
      setMessageText('');
      fetchChat();
    } catch (err) {
      alert('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title={`💬 Chat: ${listing.title}`} onClose={onClose}>
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '480px' }}>
        {/* Listing Summary Bar */}
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc' }}>{listing.title}</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>📍 {listing.location}</p>
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
            padding: '0.75rem',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          {loading ? (
            <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading chat messages...</p>
          ) : !chat?.messages || chat.messages.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8' }}>No messages yet. Send a message below!</p>
          ) : (
            chat.messages.map((m, idx) => {
              const isSystem = m.senderRole === 'system';
              return (
                <div
                  key={m._id || idx}
                  style={{
                    alignSelf: isSystem ? 'center' : 'flex-start',
                    maxWidth: isSystem ? '90%' : '80%',
                    background: isSystem
                      ? 'rgba(139, 92, 246, 0.1)'
                      : 'rgba(255, 255, 255, 0.06)',
                    border: `1px solid ${isSystem ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: '10px',
                    padding: '0.65rem 0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isSystem ? '#c084fc' : '#38bdf8' }}>
                      {m.senderName} ({m.senderRole.toUpperCase()})
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.86rem', color: '#f8fafc', whiteSpace: 'pre-wrap' }}>
                    {m.text}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Type your message to landlord..."
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
