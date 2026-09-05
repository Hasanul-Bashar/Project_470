import AgreementManager from '../components/agreements/AgreementManager';

export default function AgreementsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0b10', color: '#f8fafc' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }}>
            📄 Rental Agreement Generation & SHA-256 Verification
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
            Dynamic PDF contract generation from templated legal agreements with SHA-256 cryptographic tamper verification.
          </p>
        </div>

        <AgreementManager />
      </div>
    </div>
  );
}

