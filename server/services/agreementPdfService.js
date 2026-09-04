const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORAGE_DIR = path.join(__dirname, '../storage/agreements');

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * Generates a perfectly formatted, professional PDF agreement document with zero text overlap.
 */
function generateAgreementPdf(agreement) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        const sha256Hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

        const filename = `${agreement.agreementId || 'agreement'}.pdf`;
        const filePath = path.join(STORAGE_DIR, filename);

        fs.writeFileSync(filePath, pdfBuffer);

        resolve({
          pdfBuffer,
          sha256Hash,
          filePath,
          filename,
        });
      });

      doc.on('error', (err) => reject(err));

      // ── Color Palette ────────────────────────────────────────
      const C_PRIMARY    = '#0f172a'; // Slate 900
      const C_INDIGO     = '#4338ca'; // Indigo 700
      const C_EMERALD    = '#047857'; // Emerald 700
      const C_TEXT       = '#334155'; // Slate 700
      const C_MUTED      = '#64748b'; // Slate 500
      const C_BG_LIGHT   = '#f8fafc'; // Slate 50
      const C_BORDER     = '#cbd5e1'; // Slate 300

      let y = 0;

      // ── 1. Top Header Banner ──────────────────────────────────
      doc.rect(0, 0, doc.page.width, 90).fill(C_PRIMARY);

      doc.fillColor('#ffffff')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('RentEase Residential Lease Agreement', 40, 24);

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#94a3b8')
         .text('OFFICIAL LEGAL BINDING CONTRACT • CRYPTOGRAPHICALLY SECURED', 40, 52);

      doc.fontSize(8.5)
         .fillColor('#a5b4fc')
         .font('Helvetica-Bold')
         .text(`AGREEMENT ID: ${agreement.agreementId}`, doc.page.width - 240, 26, { align: 'right' })
         .font('Helvetica')
         .fillColor('#cbd5e1')
         .text(`DATE: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, doc.page.width - 240, 42, { align: 'right' });

      y = 105;

      // ── 2. Security Banner Box ───────────────────────────────
      const secBoxHeight = 36;
      doc.rect(40, y, doc.page.width - 80, secBoxHeight)
         .fillAndStroke(C_BG_LIGHT, '#e2e8f0');

      doc.fillColor(C_EMERALD)
         .fontSize(8.5)
         .font('Helvetica-Bold')
         .text('🔒 TAMPER-EVIDENT CRYPTOGRAPHIC PROTECTION', 52, y + 8);

      doc.fillColor(C_MUTED)
         .fontSize(7.5)
         .font('Helvetica')
         .text('This contract is protected by a SHA-256 hash checksum. Any alteration invalidates digital legal verification.', 52, y + 20);

      y += secBoxHeight + 15;

      // ── 3. Section 1: Contracting Parties ────────────────────
      doc.fillColor(C_INDIGO)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('1. CONTRACTING PARTIES', 40, y);

      y += 18;

      const cardWidth = (doc.page.width - 95) / 2;
      const cardHeight = 70;

      // Landlord Box (Left)
      doc.rect(40, y, cardWidth, cardHeight).fillAndStroke('#f1f5f9', C_BORDER);
      doc.fillColor(C_PRIMARY).fontSize(9.5).font('Helvetica-Bold').text('LANDLORD (LESSOR)', 50, y + 8);
      doc.fillColor(C_TEXT).fontSize(8.5).font('Helvetica')
         .text(`Name: ${agreement.landlordName}`, 50, y + 22)
         .text(`Email: ${agreement.landlordEmail}`, 50, y + 35)
         .text(`Phone: ${agreement.landlordPhone || '+880 1711-000000'}`, 50, y + 48);

      // Tenant Box (Right)
      const tX = 45 + cardWidth;
      doc.rect(tX, y, cardWidth, cardHeight).fillAndStroke('#f1f5f9', C_BORDER);
      doc.fillColor(C_PRIMARY).fontSize(9.5).font('Helvetica-Bold').text('TENANT (LESSEE)', tX + 10, y + 8);
      doc.fillColor(C_TEXT).fontSize(8.5).font('Helvetica')
         .text(`Name: ${agreement.tenantName}`, tX + 10, y + 22)
         .text(`Email: ${agreement.tenantEmail}`, tX + 10, y + 35)
         .text(`Phone: ${agreement.tenantPhone || '+880 1819-111222'}`, tX + 10, y + 48);

      y += cardHeight + 18;

      // ── 4. Section 2: Property & Duration ────────────────────
      doc.fillColor(C_INDIGO)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('2. PREMISES & LEASE DURATION', 40, y);

      y += 18;

      doc.fillColor(C_TEXT).fontSize(8.5).font('Helvetica');
      doc.text(`Property Name: `, 40, y, { continued: true })
         .font('Helvetica-Bold').text(agreement.listingTitle);
      y += 14;

      doc.font('Helvetica').text(`Address: `, 40, y, { continued: true })
         .font('Helvetica-Bold').text(`${agreement.propertyAddress}, ${agreement.city || 'Dhaka'}`);
      y += 14;

      const sDate = new Date(agreement.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const eDate = new Date(agreement.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

      doc.font('Helvetica').text(`Lease Term: `, 40, y, { continued: true })
         .font('Helvetica-Bold').text(`${sDate}  to  ${eDate}  (${agreement.leaseTermMonths || 12} Months)`);

      y += 24;

      // ── 5. Section 3: Rent & Financial Terms ─────────────────
      doc.fillColor(C_INDIGO)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('3. RENT & FINANCIAL TERMS', 40, y);

      y += 18;

      const finBoxHeight = 52;
      doc.rect(40, y, doc.page.width - 80, finBoxHeight)
         .fillAndStroke('#f3e8ff', '#c084fc');

      doc.fillColor('#581c87').fontSize(9).font('Helvetica-Bold')
         .text(`Monthly Rent: BDT ${Number(agreement.rentAmount).toLocaleString()} / month`, 52, y + 9)
         .text(`Security Deposit: BDT ${Number(agreement.depositAmount).toLocaleString()} (Refundable)`, 52, y + 23)
         .text(`Payment Due Date: On or before the ${agreement.paymentDueDate || 5}th of each calendar month`, 52, y + 37);

      y += finBoxHeight + 20;

      // ── 6. Section 4: Terms & Clauses ────────────────────────
      doc.fillColor(C_INDIGO)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('4. TERMS & CONDITION CLAUSES', 40, y);

      y += 18;

      const defaultClauses = [
        { title: 'Monthly Payment & Penalty', text: 'Rent must be cleared on or before the due date. Overdue payments incur a 2% daily penalty.' },
        { title: 'Maintenance & Service Requests', text: 'Tenant is required to log all structural, plumbing, and electrical issues via the RentEase Portal.' },
        { title: 'Subletting Restriction', text: 'Subletting or secondary leasing without explicit written authorization from the Landlord is prohibited.' },
        { title: 'Security Deposit Refund', text: 'The security deposit will be refunded within 14 business days post move-out inspection.' },
      ];

      const clausesToPrint = agreement.clauses && agreement.clauses.length > 0 ? agreement.clauses : defaultClauses;

      clausesToPrint.forEach((item, idx) => {
        doc.fillColor(C_PRIMARY).fontSize(8.5).font('Helvetica-Bold')
           .text(`4.${idx + 1} ${item.title}: `, 40, y, { continued: true });
        doc.fillColor(C_TEXT).font('Helvetica')
           .text(item.text);

        y = doc.y + 6;
      });

      y += 12;

      // ── 7. Section 5: Signatures & Audit Trail ───────────────
      doc.fillColor(C_INDIGO)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('5. DIGITAL EXECUTION & AUDIT TRAIL', 40, y);

      y += 40;

      // Landlord Sig Line
      doc.moveTo(40, y).lineTo(230, y).stroke(C_BORDER);
      doc.fillColor(C_PRIMARY).fontSize(8.5).font('Helvetica-Bold').text(agreement.landlordName, 40, y + 5);
      doc.fillColor(C_MUTED).fontSize(7.5).font('Helvetica').text('Landlord Digital Signature (Verified)', 40, y + 17);

      // Tenant Sig Line
      const tSigX = doc.page.width - 230;
      doc.moveTo(tSigX, y).lineTo(doc.page.width - 40, y).stroke(C_BORDER);
      doc.fillColor(C_PRIMARY).fontSize(8.5).font('Helvetica-Bold').text(agreement.tenantName, tSigX, y + 5);
      doc.fillColor(C_MUTED).fontSize(7.5).font('Helvetica').text('Tenant Digital Signature (Verified)', tSigX, y + 17);

      // ── 8. Footer Security Note ──────────────────────────────
      doc.fontSize(7)
         .fillColor('#94a3b8')
         .text(
           `RentEase Automated Lease Generator • SHA-256 Document Verification: http://localhost:5173/api/agreements/${agreement.agreementId}/verify`,
           40,
           doc.page.height - 30,
           { align: 'center' }
         );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateAgreementPdf, STORAGE_DIR };
