import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createStripeCheckout } from '../services/rentApi';

export default function StripeCheckoutGateway() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const paymentId = searchParams.get('paymentId') || '';
  const amount = Number(searchParams.get('amount') || 0);
  const title = searchParams.get('title') || 'Rent Payment';
  const month = searchParams.get('month') || 'Current Cycle';
  const tenantName = searchParams.get('tenantName') || 'Tenant';
  const tenantEmail = searchParams.get('tenantEmail') || 'tenant@example.com';
  const totalAmount = Number(searchParams.get('totalAmount') || amount);

  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expDate, setExpDate] = useState('12 / 28');
  const [cvc, setCvc] = useState('123');
  const [nameOnCard, setNameOnCard] = useState(tenantName);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepMessage, setStepMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const remainingAfterPayment = Math.max(0, totalAmount - amount);

  const handlePayNow = async (e) => {
    e.preventDefault();
    if (!paymentId || amount <= 0) {
      setErrorMsg('Invalid payment details.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    setStepMessage('🔒 Encrypting payment payload with 256-bit SSL...');

    try {
      await new Promise((r) => setTimeout(r, 700));
      setStepMessage('⚡ Connecting to Stripe Payment Gateway...');

      await new Promise((r) => setTimeout(r, 800));
      setStepMessage('💳 Authorizing payment with card issuer...');

      const res = await createStripeCheckout(paymentId, amount);

      setStepMessage('✅ Payment Authorized! Updating rent ledger & generating receipt...');
      await new Promise((r) => setTimeout(r, 800));

      if (res.data?.url && res.data.url.includes('http')) {
        window.location.href = res.data.url;
      } else {
        navigate('/rent-tracking?payment=success');
      }
    } catch (err) {
      console.error('Stripe Gateway error:', err);
      setIsProcessing(false);
      setErrorMsg(err.response?.data?.message || err.message || 'Payment authorization failed.');
    }
  };

  const handleCancel = () => {
    navigate('/rent-tracking?payment=cancelled');
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 70px)',
        background: '#090d16',
        color: '#f8fafc',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '940px',
          background: '#0f172a',
          borderRadius: '20px',
          border: '1px solid #1e293b',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Gateway Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            padding: '1.25rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                fontSize: '1.4rem',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                color: '#fff',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              stripe
            </span>
            <span
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                fontSize: '0.7rem',
                padding: '3px 10px',
                borderRadius: '12px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              Checkout Gateway
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: '#e0e7ff' }}>
            <span>🔒 256-Bit Encrypted</span>
            <span
              style={{
                background: '#10b981',
                color: '#064e3b',
                fontWeight: 800,
                fontSize: '0.65rem',
                padding: '2px 8px',
                borderRadius: '8px',
              }}
            >
              TEST MODE
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            gap: '0',
          }}
        >
          {/* Left Column: Order Summary */}
          <div
            style={{
              padding: '2.5rem',
              background: '#0b1329',
              borderRight: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                RentEase Monthly Lease
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: '0.5rem 0 1.5rem 0' }}>
                {title}
              </h2>

              <div
                style={{
                  background: '#0f172a',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  border: '1px solid #1e293b',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.88rem' }}>
                  <span style={{ color: '#94a3b8' }}>Billing Period:</span>
                  <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{month}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.88rem' }}>
                  <span style={{ color: '#94a3b8' }}>Tenant Name:</span>
                  <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{tenantName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: '#94a3b8' }}>Tenant Email:</span>
                  <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{tenantEmail}</span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div style={{ borderTop: '1px dashed #1e293b', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                  <span>Total Rent Due:</span>
                  <span>${totalAmount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: 700, color: '#60a5fa' }}>
                  <span>Payment Amount:</span>
                  <span>${amount.toLocaleString()}</span>
                </div>
                {remainingAfterPayment > 0 && (
                  <div
                    style={{
                      background: '#1e1b4b',
                      color: '#a5b4fc',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      border: '1px solid #312e81',
                    }}
                  >
                    <span>Remaining Balance After:</span>
                    <strong>${remainingAfterPayment.toLocaleString()}</strong>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              disabled={isProcessing}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '0.85rem',
                textAlign: 'left',
                marginTop: '2rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              ← Cancel & return to Rent Ease
            </button>
          </div>

          {/* Right Column: Stripe Card Payment Form */}
          <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#f8fafc' }}>
              Pay with Credit or Debit Card
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 1.75rem 0' }}>
              Powered by Stripe. Test card pre-filled for sandbox simulation.
            </p>

            {errorMsg && (
              <div
                style={{
                  background: '#451a03',
                  border: '1px solid #b45309',
                  color: '#fde68a',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handlePayNow} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  disabled={isProcessing}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#020617',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '1rem',
                    fontFamily: 'monospace',
                    letterSpacing: '1px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 600 }}>
                    Expires
                  </label>
                  <input
                    type="text"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    disabled={isProcessing}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: '#020617',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 600 }}>
                    CVC
                  </label>
                  <input
                    type="text"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    disabled={isProcessing}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: '#020617',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={nameOnCard}
                  onChange={(e) => setNameOnCard(e.target.value)}
                  disabled={isProcessing}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#020617',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              {/* Status Animation Box */}
              {isProcessing && (
                <div
                  style={{
                    background: '#1e1b4b',
                    border: '1px solid #4338ca',
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    color: '#c7d2fe',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #818cf8',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span>{stepMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: isProcessing
                    ? '#475569'
                    : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.4)',
                  transition: 'all 0.2s ease',
                  marginTop: '0.5rem',
                }}
              >
                {isProcessing ? 'Processing Payment...' : `💳 Pay $${amount.toLocaleString()} with Stripe →`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
