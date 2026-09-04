import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getAgreements,
  createAgreement,
  generateAgreementPdf,
  verifyAgreementHash,
  getAgreementDownloadUrl,
} from '../../services/agreementApi';

export default function AgreementManager() {
  const { user } = useAuth();

  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [verifyResultModal, setVerifyResultModal] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
    landlordName: '',
    landlordEmail: '',
    landlordPhone: '',
    listingTitle: '',
    propertyAddress: '',
    city: 'Dhaka',
    rentAmount: '',
    depositAmount: '',
    paymentDueDate: 5,
    startDate: '',
    endDate: '',
    clause1Title: 'Monthly Payment & Overdue Terms',
    clause1Text: 'Rent must be cleared on or before the due date. Overdue payments incur a daily penalty.',
    clause2Title: 'Maintenance & Service Requests',
    clause2Text: 'Tenant is required to log all structural, plumbing, and electrical issues via the Maintenance Module.',
    clause3Title: 'Subletting Restriction',
    clause3Text: 'Subletting or secondary leasing without explicit written authorization is strictly prohibited.',
  });

  const fetchAgreements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAgreements({ search: searchTerm });
      setAgreements(res.data.agreements || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch rental agreements.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchAgreements();
  }, [fetchAgreements]);

  // Handle Form Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Create Agreement
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const clauses = [
        { title: formData.clause1Title, text: formData.clause1Text },
        { title: formData.clause2Title, text: formData.clause2Text },
        { title: formData.clause3Title, text: formData.clause3Text },
      ].filter((c) => c.title && c.text);

      await createAgreement({
        tenantName: formData.tenantName,
        tenantEmail: formData.tenantEmail,
        tenantPhone: formData.tenantPhone,
        landlordName: formData.landlordName,
        landlordEmail: formData.landlordEmail,
        landlordPhone: formData.landlordPhone,
        listingTitle: formData.listingTitle,
        propertyAddress: formData.propertyAddress,
        city: formData.city,
        rentAmount: formData.rentAmount,
        depositAmount: formData.depositAmount,
        paymentDueDate: formData.paymentDueDate,
        startDate: formData.startDate,
        endDate: formData.endDate,
        clauses,
      });

      setIsCreateModalOpen(false);
      fetchAgreements();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create rental agreement');
    }
  };

  // Handle PDF Generation
  const handleGeneratePdf = async (id) => {
    setGeneratingId(id);
    try {
      await generateAgreementPdf(id);
      fetchAgreements();
    } catch (err) {
      alert('Failed to generate PDF');
    } finally {
      setGeneratingId(null);
    }
  };

  // Handle SHA-256 Tamper Verification
  const handleVerifyHash = async (id) => {
    setVerifyingId(id);
    try {
      const res = await verifyAgreementHash(id);
      setVerifyResultModal(res.data);
      fetchAgreements();
    } catch (err) {
      alert('Failed to run verification endpoint');
    } finally {
      setVerifyingId(null);
    }
  };

  // Summary Metrics
  const totalAgreements = agreements.length;
  const verifiedCount = agreements.filter((a) => a.isVerified).length;
  const finalizedCount = agreements.filter((a) => a.status === 'Finalized' || a.status === 'Signed').length;
  const totalRentValue = agreements.reduce((sum, a) => sum + (a.rentAmount || 0), 0);

  return (
    <div className="agreement-manager-container" style={{ color: '#f8fafc' }}>
      {/* ── KPI Summary Header Cards ────────────────────────────── */}
      <div
        className="kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div className="panel" style={{ background: '#13151f', border: '1px solid #272a37', padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>📄 Total Agreements</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6366f1' }}>{totalAgreements}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Contracts on record</div>
        </div>

        <div className="panel" style={{ background: '#13151f', border: '1px solid #272a37', padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>🔒 SHA-256 Verified Untampered</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>{verifiedCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Cryptographically validated</div>
        </div>

        <div className="panel" style={{ background: '#13151f', border: '1px solid #272a37', padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>📑 Finalized PDF Contracts</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6' }}>{finalizedCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Ready for download</div>
        </div>

        <div className="panel" style={{ background: '#13151f', border: '1px solid #272a37', padding: '1.25rem', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>💰 Monthly Active Rent Value</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a855f7' }}>
            ৳{totalRentValue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Total monthly contract value</div>
        </div>
      </div>

      {/* ── Toolbar & Actions ───────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Search agreement ID, property title, tenant, landlord..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: '#1a1d28',
              borderColor: '#2d3348',
              color: '#fff',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              width: '100%',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
            id="btn-create-agreement"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              border: 'none',
              fontWeight: 600,
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ➕ Generate New Agreement
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            padding: '0.8rem 1.2rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* ── Agreements List ─────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          ⏳ Loading agreements & verifying hashes...
        </div>
      ) : agreements.length === 0 ? (
        <div
          className="panel"
          style={{
            background: '#13151f',
            border: '1px solid #272a37',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            borderRadius: '12px',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
          <h3 style={{ color: '#f8fafc', marginBottom: '0.5rem' }}>No Rental Agreements Found</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
            Generate a new templated rental contract populated with tenant, landlord, property details, and custom clauses. Includes SHA-256 tamper verification.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            ➕ Generate New Agreement
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {agreements.map((item) => (
            <div
              key={item._id}
              className="panel"
              style={{
                background: '#13151f',
                border: '1px solid #272a37',
                borderRadius: '14px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              {/* Top Bar: Agreement ID, Status Badge & Hash Pill */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  borderBottom: '1px solid #1e2130',
                  paddingBottom: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    style={{
                      background: 'rgba(99,102,241,0.15)',
                      color: '#818cf8',
                      border: '1px solid rgba(99,102,241,0.3)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    }}
                  >
                    📄 {item.agreementId}
                  </span>

                  <span
                    style={{
                      background: item.status === 'Finalized' || item.status === 'Signed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: item.status === 'Finalized' || item.status === 'Signed' ? '#34d399' : '#fbbf24',
                      border: `1px solid ${item.status === 'Finalized' || item.status === 'Signed' ? '#10b981' : '#f59e0b'}`,
                      padding: '3px 9px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {item.status}
                  </span>

                  {item.isVerified && (
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: '#10b981',
                        border: '1px solid #10b98144',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                      title={`Last Verified: ${item.lastVerifiedAt ? new Date(item.lastVerifiedAt).toLocaleTimeString() : 'Recently'}`}
                    >
                      🔒 SHA-256 Untampered
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Created: {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Body Content */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                {/* Property & Rent */}
                <div>
                  <h4 style={{ margin: '0 0 4px', color: '#f8fafc', fontSize: '1.05rem' }}>
                    🏢 {item.listingTitle}
                  </h4>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>
                    📍 {item.propertyAddress}, {item.city}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>
                    Monthly Rent: <span style={{ color: '#38bdf8' }}>৳{item.rentAmount?.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Security Deposit: ৳{item.depositAmount?.toLocaleString()}
                  </div>
                </div>

                {/* Landlord & Tenant Info */}
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>
                    <strong>🏠 Landlord:</strong> {item.landlordName} ({item.landlordEmail})
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '8px' }}>
                    <strong>👤 Tenant:</strong> {item.tenantName} ({item.tenantEmail})
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    🗓 Term: {new Date(item.startDate).toLocaleDateString()} ➔ {new Date(item.endDate).toLocaleDateString()} ({item.leaseTermMonths} months)
                  </div>
                </div>

                {/* Cryptographic SHA-256 Hash Display Box */}
                <div
                  style={{
                    background: '#0b0d14',
                    border: '1px solid #1e2235',
                    borderRadius: '8px',
                    padding: '0.8rem 1rem',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    🔑 Cryptographic Checksum (SHA-256 Hash):
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.72rem',
                      color: item.sha256Hash ? '#34d399' : '#64748b',
                      wordBreak: 'break-all',
                      background: '#131520',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid #272d42',
                    }}
                  >
                    {item.sha256Hash || 'Hash not computed yet'}
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  borderTop: '1px solid #1e2130',
                  paddingTop: '0.8rem',
                  flexWrap: 'wrap',
                }}
              >
                {/* Download PDF button */}
                <a
                  href={getAgreementDownloadUrl(item._id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  id={`btn-download-pdf-${item._id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: '#1e2235',
                    color: '#f8fafc',
                    border: '1px solid #333a54',
                  }}
                >
                  📄 View / Download PDF
                </a>

                {/* Regenerate PDF */}
                <button
                  className="btn btn-secondary"
                  onClick={() => handleGeneratePdf(item._id)}
                  disabled={generatingId === item._id}
                  style={{
                    fontSize: '0.85rem',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: '#1e2235',
                    color: '#f8fafc',
                    border: '1px solid #333a54',
                  }}
                >
                  {generatingId === item._id ? '⏳ Generating...' : '🔄 Regenerate PDF'}
                </button>

                {/* Run SHA-256 Tamper Verification */}
                <button
                  className="btn btn-primary"
                  onClick={() => handleVerifyHash(item._id)}
                  disabled={verifyingId === item._id}
                  id={`btn-verify-sha256-${item._id}`}
                  style={{
                    fontSize: '0.85rem',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {verifyingId === item._id ? '⏳ Verifying Hash...' : '🔒 Verify SHA-256 Integrity'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE AGREEMENT MODAL ──────────────────────────────── */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#13151f',
              border: '1px solid #272a37',
              borderRadius: '16px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.5rem',
              color: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #1e2130', paddingBottom: '0.8rem' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.2rem' }}>
                📄 Generate Rental Agreement (PDF & SHA-256 Hash)
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Property Details */}
              <div style={{ background: '#1a1d28', padding: '1rem', borderRadius: '10px', border: '1px solid #272d42' }}>
                <h4 style={{ margin: '0 0 0.8rem', color: '#818cf8', fontSize: '0.95rem' }}>🏢 Property Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Property Title *</label>
                    <input
                      type="text"
                      name="listingTitle"
                      value={formData.listingTitle}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3348', color: '#fff', padding: '0.5rem', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3348', color: '#fff', padding: '0.5rem', borderRadius: '6px' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Full Property Address *</label>
                    <input
                      type="text"
                      name="propertyAddress"
                      value={formData.propertyAddress}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3348', color: '#fff', padding: '0.5rem', borderRadius: '6px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Landlord & Tenant Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Landlord */}
                <div style={{ background: '#1a1d28', padding: '1rem', borderRadius: '10px', border: '1px solid #272d42' }}>
                  <h4 style={{ margin: '0 0 0.8rem', color: '#38bdf8', fontSize: '0.95rem' }}>🏠 Landlord Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Name</label>
                      <input
                        type="text"
                        name="landlordName"
                        value={formData.landlordName}
                        onChange={handleInputChange}
                        required
                        style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3348', color: '#fff', padding: '0.4rem', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Email</label>
                      <input
                        type="email"
                        name="landlordEmail"
                        value={formData.landlordEmail}
                        onChange={handleInputChange}
                        required
                        style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3348', color: '#fff', padding: '0.4rem', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tenant */}
                <div style={{ background: '#1a1d28', padding: '1rem', borderRadius: '10px', border: '1px solid #272d42' }}>
                  <h4 style={{ margin: '0 0 0.8rem', color: '#34d399', fontSize: '0.95rem' }}>👤 Tenant Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Name</label>
                      <input
                        type="text"
                        name="tenantName"
                        value={formData.tenantName}
                        onChange={handleInputChange}
                        required
                        style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3348', color: '#fff', padding: '0.4rem', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Email</label>
                      <input
                        type="email"
                        name="tenantEmail"
                        value={formData.tenantEmail}
                        onChange={handleInputChange}
                        required
                        style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3348', color: '#fff', padding: '0.4rem', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial & Lease Dates */}
              <div style={{ background: '#1a1d28', padding: '1rem', borderRadius: '10px', border: '1px solid #272d42' }}>
                <h4 style={{ margin: '0 0 0.8rem', color: '#c084fc', fontSize: '0.95rem' }}>💰 Rent & Duration Terms</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Monthly Rent (BDT) *</label>
                    <input
                      type="number"
                      name="rentAmount"
                      value={formData.rentAmount}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3348', color: '#fff', padding: '0.4rem', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Security Deposit (BDT) *</label>
                    <input
                      type="number"
                      name="depositAmount"
                      value={formData.depositAmount}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3348', color: '#fff', padding: '0.4rem', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Due Day of Month *</label>
                    <input
                      type="number"
                      name="paymentDueDate"
                      value={formData.paymentDueDate}
                      onChange={handleInputChange}
                      min="1"
                      max="31"
                      required
                      style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3348', color: '#fff', padding: '0.4rem', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Lease Start Date *</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3348', color: '#fff', padding: '0.4rem', borderRadius: '6px' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Lease End Date *</label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3348', color: '#fff', padding: '0.4rem', borderRadius: '6px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none' }}
                >
                  🔒 Generate Contract & SHA-256 Hash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SHA-256 VERIFICATION RESULT MODAL ───────────────────── */}
      {verifyResultModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#131520',
              border: verifyResultModal.verified ? '1px solid #10b981' : '1px solid #ef4444',
              borderRadius: '16px',
              maxWidth: '550px',
              width: '100%',
              padding: '1.8rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
              color: '#f8fafc',
            }}
          >
            {/* Header Icon */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: verifyResultModal.verified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: verifyResultModal.verified ? '2px solid #10b981' : '2px solid #ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 0.8rem',
                }}
              >
                {verifyResultModal.verified ? '🔒' : '⚠️'}
              </div>

              <h3 style={{ margin: '0 0 6px', color: verifyResultModal.verified ? '#34d399' : '#fca5a5', fontSize: '1.25rem' }}>
                {verifyResultModal.verified ? 'Cryptographic Integrity Verified' : 'Tamper Detection Alert!'}
              </h3>

              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                {verifyResultModal.statusMessage}
              </p>
            </div>

            {/* Hash Comparison Box */}
            <div style={{ background: '#0b0d14', border: '1px solid #1f2438', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                📋 Agreement ID: <span style={{ color: '#818cf8', fontFamily: 'monospace' }}>{verifyResultModal.agreementId}</span>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>STORED SHA-256 CHECKSUM (CREATION TIME):</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#10b981', background: '#131625', padding: '6px', borderRadius: '4px', wordBreak: 'break-all' }}>
                  {verifyResultModal.storedHash}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>COMPUTED SHA-256 CHECKSUM (RE-CHECKED NOW):</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: verifyResultModal.verified ? '#10b981' : '#ef4444', background: '#131625', padding: '6px', borderRadius: '4px', wordBreak: 'break-all' }}>
                  {verifyResultModal.computedHash}
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '10px', textAlign: 'right' }}>
                Timestamp: {new Date(verifyResultModal.verifiedAt).toLocaleString()}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ textAlign: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => setVerifyResultModal(null)}
                style={{
                  background: verifyResultModal.verified ? '#10b981' : '#ef4444',
                  border: 'none',
                  padding: '8px 24px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close Security Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
