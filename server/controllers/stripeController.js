const Stripe = require('stripe');
const PDFDocument = require('pdfkit');
const RentPayment = require('../models/RentPayment');
const StripeEvent = require('../models/StripeEvent');
const { createNotification } = require('../services/notificationService');

// Initialize Stripe — gracefully handle missing key
const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeKey ? new Stripe(stripeKey) : null;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// ── Payment State Machine ────────────────────────────────────────
// States: due | overdue | partial | paid | failed
//
// Transitions:
//   due/overdue + successful payment (< full amount) → partial
//   due/overdue + successful payment (>= full amount) → paid
//   partial + successful payment (total < full amount) → partial
//   partial + successful payment (total >= full amount) → paid
//   any + failed payment → stays in current state (no change)
//   any + retry → creates new checkout session (idempotent)
// ─────────────────────────────────────────────────────────────────

/**
 * 1. Create a Stripe Checkout Session for a rent payment
 * Supports partial payments — tenant can specify an amount <= remaining balance
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const { rentPaymentId, amount } = req.body;

    if (!rentPaymentId || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: 'rentPaymentId and a positive amount are required.',
      });
    }

    const payment = await RentPayment.findById(rentPaymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Rent payment record not found.' });
    }

    // Calculate remaining balance
    const remaining = payment.amount - (payment.amountPaid || 0);
    if (remaining <= 0) {
      return res.status(400).json({ message: 'This rent is already fully paid.' });
    }

    const payAmount = Math.min(Number(amount), remaining);

    if (!stripe) {
      // ── Demo Stripe Fallback Mode (when STRIPE_SECRET_KEY is not in .env) ──
      const demoSessionId = `cs_demo_${Date.now()}`;
      const origin = req.headers.origin || 'http://localhost:5173';
      const previouslyPaid = payment.amountPaid || (payment.status === 'paid' ? payment.amount : 0);
      const newTotal = previouslyPaid + payAmount;

      payment.stripePayments.push({
        sessionId: demoSessionId,
        amount: payAmount,
        paidAt: new Date(),
      });

      payment.amountPaid = newTotal;
      payment.stripeSessionId = demoSessionId;
      payment.paymentMethod = 'Stripe (Demo)';

      if (newTotal >= payment.amount) {
        payment.status = 'paid';
        payment.paidDate = new Date();
        payment.overdueFlagged = false;
      } else {
        payment.status = 'partial';
      }

      await payment.save();

      // Notify tenant
      const isPaid = payment.status === 'paid';
      await createNotification({
        recipientId: payment.tenantId,
        recipientEmail: payment.tenantEmail,
        recipientRole: 'user',
        type: isPaid ? 'rent_paid' : 'rent_partial',
        title: isPaid
          ? `✅ Rent Fully Paid — ${payment.listingTitle}`
          : `💳 Partial Payment Received — ${payment.listingTitle}`,
        message: isPaid
          ? `Your rent of $${payment.amount.toLocaleString()} for ${payment.month} has been fully paid. Thank you!`
          : `Payment of $${payAmount.toLocaleString()} received. Remaining balance: $${(payment.amount - newTotal).toLocaleString()} for ${payment.month}.`,
        link: '/rent-tracking',
        sourceId: payment._id.toString(),
        sourceType: 'RentPayment',
      });

      // Notify admin
      await createNotification({
        recipientId: 'admin',
        recipientEmail: process.env.ADMIN_EMAIL || 'admin@rentease.com',
        recipientRole: 'admin',
        type: isPaid ? 'rent_paid' : 'rent_partial',
        title: isPaid
          ? `💰 Rent Paid via Stripe: ${payment.listingTitle}`
          : `💳 Partial Rent via Stripe: ${payment.listingTitle}`,
        message: isPaid
          ? `Tenant "${payment.tenantName}" fully paid rent of ৳${payment.amount.toLocaleString()} for ${payment.month} at "${payment.listingTitle}".`
          : `Tenant "${payment.tenantName}" made a partial payment of ৳${payAmount.toLocaleString()} for ${payment.month} at "${payment.listingTitle}". Remaining: ৳${(payment.amount - newTotal).toLocaleString()}.`,
        link: '/rent-tracking',
        sourceId: payment._id.toString(),
        sourceType: 'RentPayment',
      });

      return res.json({
        url: `${origin}/rent-tracking?payment=success&demo=true`,
        sessionId: demoSessionId,
        demoMode: true,
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Rent — ${payment.listingTitle}`,
              description: `${payment.month} rent payment for ${payment.tenantName}`,
            },
            unit_amount: Math.round(payAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        rentPaymentId: payment._id.toString(),
        tenantEmail: payment.tenantEmail,
        payAmount: payAmount.toString(),
      },
      customer_email: payment.tenantEmail,
      success_url: `${req.headers.origin || 'http://localhost:5173'}/rent-tracking?payment=success`,
      cancel_url: `${req.headers.origin || 'http://localhost:5173'}/rent-tracking?payment=cancelled`,
    });

    // Store session reference on the payment record
    payment.stripeSessionId = session.id;
    await payment.save();

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('❌ createCheckoutSession error:', err);
    res.status(500).json({ message: 'Failed to create Stripe checkout session', error: err.message });
  }
};

/**
 * 2. Handle Stripe Webhook — processes checkout.session.completed events
 * Implements idempotency via StripeEvent model (dedupes repeated events)
 */
exports.handleWebhook = async (req, res) => {
  let event;

  // Verify webhook signature if secret is configured
  if (WEBHOOK_SECRET) {
    const sig = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return res.status(400).json({ message: 'Webhook signature verification failed' });
    }
  } else {
    // If no webhook secret, parse the raw body as JSON (development mode)
    try {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      // If it's a Buffer, convert to string first
      if (Buffer.isBuffer(req.body)) {
        event = JSON.parse(req.body.toString());
      }
    } catch (err) {
      console.error('❌ Failed to parse webhook body:', err.message);
      return res.status(400).json({ message: 'Invalid webhook payload' });
    }
  }

  // ── Idempotency Check ──────────────────────────────────────────
  // Skip if we've already processed this event ID
  const existingEvent = await StripeEvent.findOne({ eventId: event.id });
  if (existingEvent) {
    console.log(`⏭️ Duplicate webhook event skipped: ${event.id}`);
    return res.status(200).json({ received: true, duplicate: true });
  }

  // Record this event as processed (before processing to prevent races)
  await StripeEvent.create({ eventId: event.id, type: event.type });

  // ── Process checkout.session.completed ──────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { rentPaymentId, payAmount, tenantEmail } = session.metadata || {};

    if (!rentPaymentId) {
      console.error('❌ Webhook missing rentPaymentId in metadata');
      return res.status(200).json({ received: true, error: 'missing metadata' });
    }

    try {
      const payment = await RentPayment.findById(rentPaymentId);
      if (!payment) {
        console.error(`❌ RentPayment ${rentPaymentId} not found for webhook`);
        return res.status(200).json({ received: true, error: 'payment not found' });
      }

      const paidAmount = Number(payAmount) || 0;
      const previouslyPaid = payment.amountPaid || 0;
      const newTotal = previouslyPaid + paidAmount;

      // Record this individual Stripe payment
      payment.stripePayments.push({
        sessionId: session.id,
        amount: paidAmount,
        paidAt: new Date(),
      });

      payment.amountPaid = newTotal;
      payment.stripeSessionId = session.id;
      payment.paymentMethod = 'Stripe';

      // ── State Machine Transition ──────────────────────────────
      if (newTotal >= payment.amount) {
        // Fully paid
        payment.status = 'paid';
        payment.paidDate = new Date();
        payment.overdueFlagged = false;
      } else {
        // Partially paid
        payment.status = 'partial';
      }

      await payment.save();

      // ── Notification ──────────────────────────────────────────
      const isPaid = payment.status === 'paid';
      await createNotification({
        recipientId: payment.tenantId,
        recipientEmail: payment.tenantEmail,
        recipientRole: 'user',
        type: isPaid ? 'rent_paid' : 'rent_partial',
        title: isPaid
          ? `✅ Rent Fully Paid — ${payment.listingTitle}`
          : `💳 Partial Payment Received — ${payment.listingTitle}`,
        message: isPaid
          ? `Your rent of $${payment.amount.toLocaleString()} for ${payment.month} has been fully paid via Stripe. Thank you!`
          : `Payment of $${paidAmount.toLocaleString()} received. Remaining balance: $${(payment.amount - newTotal).toLocaleString()} for ${payment.month}.`,
        link: '/rent-tracking',
        sourceId: payment._id.toString(),
        sourceType: 'RentPayment',
      });

      // Also notify landlord
      await createNotification({
        recipientId: payment.landlordId,
        recipientEmail: '',
        recipientRole: 'landlord',
        type: isPaid ? 'rent_paid' : 'rent_partial',
        title: isPaid
          ? `✅ Rent Collected — ${payment.tenantName}`
          : `💳 Partial Payment — ${payment.tenantName}`,
        message: isPaid
          ? `${payment.tenantName} has fully paid $${payment.amount.toLocaleString()} for ${payment.month} at ${payment.listingTitle}.`
          : `${payment.tenantName} paid $${paidAmount.toLocaleString()}. Remaining: $${(payment.amount - newTotal).toLocaleString()} for ${payment.month}.`,
        link: '/rent-tracking',
        sourceId: payment._id.toString(),
        sourceType: 'RentPayment',
      });

      // Also notify admin
      await createNotification({
        recipientId: 'admin',
        recipientEmail: process.env.ADMIN_EMAIL || 'admin@rentease.com',
        recipientRole: 'admin',
        type: isPaid ? 'rent_paid' : 'rent_partial',
        title: isPaid
          ? `💰 Rent Collected via Stripe: ${payment.listingTitle}`
          : `💳 Partial Rent via Stripe: ${payment.listingTitle}`,
        message: isPaid
          ? `Tenant "${payment.tenantName}" fully paid ৳${payment.amount.toLocaleString()} for ${payment.month} at "${payment.listingTitle}" via Stripe.`
          : `Tenant "${payment.tenantName}" paid ৳${paidAmount.toLocaleString()} via Stripe. Remaining balance: ৳${(payment.amount - newTotal).toLocaleString()} for ${payment.month}.`,
        link: '/rent-tracking',
        sourceId: payment._id.toString(),
        sourceType: 'RentPayment',
      });

      console.log(`✅ Stripe payment processed: $${paidAmount} for RentPayment ${rentPaymentId} (total: $${newTotal}/${payment.amount})`);
    } catch (err) {
      console.error('❌ Error processing webhook payment:', err);
    }
  }

  res.status(200).json({ received: true });
};

/**
 * 3. Download PDF Receipt for a rent payment
 */
exports.downloadReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await RentPayment.findById(paymentId);

    // Calculate effective amount paid (handle records marked paid or with amountPaid)
    const effectivePaid =
      payment.amountPaid != null && payment.amountPaid > 0
        ? payment.amountPaid
        : payment.status === 'paid'
        ? payment.amount
        : 0;

    if (effectivePaid <= 0) {
      return res.status(400).json({ message: 'No payments recorded for this rent record yet.' });
    }

    // Generate PDF receipt
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="receipt-${payment._id}-${payment.month}.pdf"`
    );

    doc.pipe(res);

    // ── Header ─────────────────────────────────────────────────
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('RentEase', { align: 'center' })
      .fontSize(11)
      .font('Helvetica')
      .text('Payment Receipt', { align: 'center' })
      .moveDown(1.5);

    // Horizontal line
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#6366f1')
      .lineWidth(2)
      .stroke()
      .moveDown(1);

    // ── Receipt Details ────────────────────────────────────────
    const leftX = 50;
    const rightX = 300;
    let y = doc.y;

    const addRow = (label, value) => {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(label, leftX, y)
        .font('Helvetica')
        .text(value, rightX, y);
      y += 22;
    };

    addRow('Receipt ID:', payment._id.toString());
    addRow('Tenant Name:', payment.tenantName);
    addRow('Tenant Email:', payment.tenantEmail);
    addRow('Property:', payment.listingTitle);
    addRow('Month:', payment.month);
    addRow('Total Rent Due:', `$${payment.amount.toLocaleString()}`);
    addRow('Amount Paid:', `$${effectivePaid.toLocaleString()}`);
    addRow(
      'Remaining Balance:',
      `$${Math.max(0, payment.amount - effectivePaid).toLocaleString()}`
    );
    addRow('Payment Status:', payment.status.toUpperCase());
    addRow('Payment Method:', payment.paymentMethod || 'Stripe');
    addRow(
      'Last Payment Date:',
      payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : 'N/A'
    );

    doc.y = y + 10;

    // ── Payment History ────────────────────────────────────────
    if (payment.stripePayments && payment.stripePayments.length > 0) {
      doc
        .moveDown(0.5)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke()
        .moveDown(0.8);

      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .text('Payment History', leftX)
        .moveDown(0.5);

      payment.stripePayments.forEach((sp, idx) => {
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            `${idx + 1}. $${sp.amount.toLocaleString()} — ${new Date(sp.paidAt).toLocaleString()} (Session: ${sp.sessionId.slice(-8)})`,
            leftX
          )
          .moveDown(0.3);
      });
    }

    // ── Footer ─────────────────────────────────────────────────
    doc
      .moveDown(2)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#6366f1')
      .lineWidth(1)
      .stroke()
      .moveDown(0.5);

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#94a3b8')
      .text(
        `Generated by RentEase on ${new Date().toLocaleString()}. This is a computer-generated receipt.`,
        leftX,
        doc.y,
        { align: 'center' }
      );

    doc.end();
  } catch (err) {
    console.error('❌ downloadReceipt error:', err);
    res.status(500).json({ message: 'Failed to generate receipt', error: err.message });
  }
};
