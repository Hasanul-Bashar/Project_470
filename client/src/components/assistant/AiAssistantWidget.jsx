import { useState, useEffect, useRef } from 'react';
import { sendAssistantChat, getAssistantSuggestions, getAssistantStatus } from '../../services/assistantApi';

export default function AiAssistantWidget({
  isOpen,
  onClose,
  onOpenBooking,
  onOpenCalendar,
  onOpenChat,
}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "👋 **Hello! I'm your RentEase AI Search Assistant.**\n\nAsk me anything in plain English, for example:\n- *\"2-bed flat under 20k in Mirpur\"*\n- *\"Apartments in Dhanmondi with parking and lift\"*\n- *\"Affordable room or bachelor flat under 15k\"*\n\nI run real database queries on our verified listings with multi-turn memory so you can easily refine your search!",
      listings: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentFilters, setCurrentFilters] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [statusInfo, setStatusInfo] = useState(null);
  const [activeProvider, setActiveProvider] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load suggestions & provider status on mount
  useEffect(() => {
    getAssistantSuggestions()
      .then((res) => {
        if (res.data?.suggestions) setSuggestions(res.data.suggestions);
      })
      .catch(() => {});

    getAssistantStatus()
      .then((res) => {
        if (res.data) setStatusInfo(res.data);
      })
      .catch(() => {});
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen, loading]);

  // Send query
  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build conversation history for the LLM
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await sendAssistantChat(query, history, currentFilters);
      const data = res.data;

      if (data.filters) {
        setCurrentFilters(data.filters);
      }
      if (data.provider) {
        setActiveProvider(data.provider);
      }

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Here is what I found in our database:',
        listings: data.listings || [],
        isRelaxed: data.isRelaxed,
        provider: data.provider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Assistant error:', err);
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          '⚠️ Sorry, I encountered an issue while communicating with the rental search engine. Please try again in a moment.',
        listings: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setCurrentFilters({});
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: '🔄 Search filters reset! What are you looking for next?',
        listings: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleClearConversation = () => {
    setCurrentFilters({});
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          "👋 Conversation reset. Ready for a new search! Tell me what area, budget, or bedroom count you're looking for.",
        listings: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Helper to format text with bold and bullet points
  const renderFormattedContent = (content) => {
    return content.split('\n').map((line, idx) => {
      let trimmed = line.trim();
      if (!trimmed) return <div key={idx} style={{ height: '0.4rem' }} />;

      // Format bold markdown (**text**)
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={pIdx}>{part.slice(1, -1)}</em>;
        }
        return part;
      });

      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        return (
          <div key={idx} style={{ paddingLeft: '1rem', position: 'relative', marginBottom: '0.2rem' }}>
            <span style={{ position: 'absolute', left: '0.2rem', color: 'var(--purple)' }}>•</span>
            {formattedParts}
          </div>
        );
      }

      return (
        <div key={idx} style={{ marginBottom: '0.35rem' }}>
          {formattedParts}
        </div>
      );
    });
  };

  if (!isOpen) return null;

  const hasActiveFilters = Object.values(currentFilters).some(
    (val) => val !== null && val !== undefined && (Array.isArray(val) ? val.length > 0 : true)
  );

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '440px',
        maxWidth: 'calc(100vw - 32px)',
        height: '620px',
        maxHeight: 'calc(100vh - 48px)',
        background: 'rgba(13, 20, 37, 0.96)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(139, 92, 246, 0.35)',
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65), 0 0 30px rgba(139, 92, 246, 0.2)',
        zIndex: 9999,
        overflow: 'hidden',
        animation: 'slideUp 0.25s ease-out',
      }}
    >
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '1rem 1.25rem',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(34, 211, 238, 0.1))',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
            }}
          >
            🤖
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc' }}>
              RentEase AI Concierge
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 6px #10b981',
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {activeProvider || (statusInfo?.hasConfiguredKey ? 'Live LLM Multi-Provider' : 'Grounded DB Engine')}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={handleClearConversation}
            title="Reset conversation & filters"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              borderRadius: '8px',
              padding: '0.35rem 0.6rem',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            🔄 Reset
          </button>
          <button
            onClick={onClose}
            title="Close Assistant"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#f8fafc',
              borderRadius: '8px',
              width: '30px',
              height: '30px',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── ACTIVE SEARCH FILTERS PILLS BAR ─────────────────────────────── */}
      {hasActiveFilters && (
        <div
          style={{
            padding: '0.45rem 1rem',
            background: 'rgba(139, 92, 246, 0.1)',
            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.35rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 600 }}>Active:</span>
            {currentFilters.location && (
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                📍 {currentFilters.location}
              </span>
            )}
            {currentFilters.maxPrice && (
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                💰 &le; {currentFilters.maxPrice.toLocaleString()} BDT
              </span>
            )}
            {currentFilters.bedrooms && (
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                🛏️ {currentFilters.bedrooms} Bed(s)
              </span>
            )}
            {currentFilters.amenities?.map((a, i) => (
              <span
                key={i}
                style={{
                  fontSize: '0.68rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '10px',
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: '#c084fc',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                ✨ {a}
              </span>
            ))}
          </div>
          <button
            onClick={handleResetFilters}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.7rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* ── CHAT MESSAGES BODY ───────────────────────────────────────────── */}
      <div
        style={{
          flexGrow: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '100%',
              }}
            >
              {/* Message Bubble */}
              <div
                style={{
                  maxWidth: '86%',
                  padding: '0.75rem 0.95rem',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isUser
                    ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  lineHeight: '1.45',
                  boxShadow: isUser
                    ? '0 4px 12px rgba(139, 92, 246, 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.2)',
                }}
              >
                {renderFormattedContent(msg.content)}
              </div>

              {/* Timestamp */}
              <span
                style={{
                  fontSize: '0.68rem',
                  color: '#64748b',
                  marginTop: '0.25rem',
                  padding: '0 0.25rem',
                }}
              >
                {msg.timestamp}
              </span>

              {/* Embedded Interactive Property Listing Cards */}
              {msg.listings && msg.listings.length > 0 && (
                <div
                  style={{
                    marginTop: '0.65rem',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#94a3b8',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      paddingLeft: '0.2rem',
                    }}
                  >
                    🏢 {msg.listings.length} Real Database Matches:
                  </div>

                  {msg.listings.map((listing) => (
                    <div
                      key={listing._id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.035)',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                        borderRadius: '12px',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '0.5rem',
                        }}
                      >
                        <div>
                          <h4
                            style={{
                              margin: '0 0 0.15rem 0',
                              fontSize: '0.9rem',
                              fontWeight: 700,
                              color: '#f8fafc',
                            }}
                          >
                            {listing.title}
                          </h4>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            📍 {listing.location}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            color: 'var(--purple)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          BDT {listing.price?.toLocaleString()}/mo
                        </span>
                      </div>

                      {/* Amenities mini badges */}
                      {listing.amenities && listing.amenities.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {listing.amenities.slice(0, 3).map((a, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '0.65rem',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '8px',
                                background: 'rgba(139, 92, 246, 0.12)',
                                color: '#c084fc',
                              }}
                            >
                              ✨ {a}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1.5fr',
                          gap: '0.35rem',
                          marginTop: '0.25rem',
                          paddingTop: '0.45rem',
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.68rem', padding: '0.3rem' }}
                          onClick={() => onOpenCalendar?.(listing)}
                        >
                          🗓 Calendar
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.68rem', padding: '0.3rem', color: '#38bdf8' }}
                          onClick={() => onOpenChat?.(listing)}
                        >
                          💬 Chat
                        </button>
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: '0.68rem', padding: '0.3rem' }}
                          onClick={() => onOpenBooking?.(listing)}
                        >
                          📩 Book / Rent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              width: 'fit-content',
            }}
          >
            <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Parsing criteria & executing verified DB search...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── QUICK SUGGESTION CHIPS ────────────────────────────────────────── */}
      {suggestions.length > 0 && (
        <div
          style={{
            padding: '0.5rem 1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            gap: '0.4rem',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          {suggestions.slice(0, 4).map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(item.query)}
              disabled={loading}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                padding: '0.25rem 0.6rem',
                borderRadius: '12px',
                fontSize: '0.72rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              💡 {item.label}
            </button>
          ))}
        </div>
      )}

      {/* ── INPUT FORM ────────────────────────────────────────────────────── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{
          padding: '0.85rem 1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(10, 15, 30, 0.8)',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          className="form-input"
          style={{
            flexGrow: 1,
            fontSize: '0.85rem',
            padding: '0.65rem 0.9rem',
            borderRadius: '12px',
          }}
          placeholder="Ask: '2-bed flat under 20k in Mirpur'..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{
            padding: '0.65rem 1rem',
            borderRadius: '12px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
          disabled={loading || !input.trim()}
        >
          <span>Send</span>
          <span>✈️</span>
        </button>
      </form>
    </div>
  );
}
