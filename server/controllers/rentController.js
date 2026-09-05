const RentPayment = require('../models/RentPayment');
const Booking = require('../models/Booking');
const { createNotification } = require('../services/notificationService');

// Automatic update of past-due payments to 'overdue' with flagged status
const syncOverdueStatuses = async () => {
  const now = new Date();
  await RentPayment.updateMany(
    { status: 'due', dueDate: { $lt: now } },
    { $set: { status: 'overdue', overdueFlagged: true } }
  );
};

// ── 1. Create a single rent payment record (LANDLORD ONLY) ─────
exports.createRentPayment = async (req, res) => {
  try {
    // POWER CHECK: Only landlord can create/log rent records
    if (req.user?.role !== 'landlord') {
      return res.status(403).json({
        message: 'Forbidden: Only landlords have the power to create or log rent records.',
      });
    }

    const {
      tenantId,
      tenantName,
      tenantEmail,
      listingId,
      listingTitle,
      month,
      amount,
      bookedDays,
      dailyRate,
      bookingId,
      dueDate,
      status,
      paymentMethod,
      notes,
    } = req.body;

    if (!tenantEmail || !listingTitle || !month || amount === undefined || amount === null || !dueDate) {
      return res.status(400).json({
        message: 'Missing required fields: tenantEmail, listingTitle, month, amount, dueDate',
      });
    }

    const landlordId = req.user?.id || 'demo-landlord';
    const landlordName = req.user?.name || req.user?.email || 'Landlord';

    const parsedDueDate = new Date(dueDate);
    const now = new Date();

    let initialStatus = status || 'due';
    let isOverdue = initialStatus === 'overdue';

    if (initialStatus === 'due' && parsedDueDate < now) {
      initialStatus = 'overdue';
      isOverdue = true;
    }

    const finalAmount = Number(amount);
    const numBookedDays = Number(bookedDays) || 0;
    const computedDailyRate = Number(dailyRate) || (numBookedDays > 0 ? Math.round(finalAmount / numBookedDays) : 0);

    const newPayment = new RentPayment({
      tenantId: tenantId || tenantEmail,
      tenantName: tenantName || tenantEmail.split('@')[0],
      tenantEmail,
      landlordId,
      landlordName,
      listingId: listingId || null,
      listingTitle,
      month,
      amount: finalAmount,
      bookedDays: numBookedDays,
      dailyRate: computedDailyRate,
      bookingId: bookingId || null,
      dueDate: parsedDueDate,
      status: initialStatus,
      paidDate: initialStatus === 'paid' ? now : null,
      paymentMethod: paymentMethod || 'Cash',
      notes: notes || '',
      overdueFlagged: isOverdue,
    });

    await newPayment.save();

    // ── Notify tenant of new rent record ──────────────────────
    const isOD = initialStatus === 'overdue';
    await createNotification({
      recipientId: tenantId || tenantEmail,
      recipientEmail: tenantEmail,
      recipientRole: 'user',
      type: isOD ? 'rent_overdue' : 'rent_due',
      title: isOD ? `🚨 Overdue Rent — ${listingTitle}` : `💳 Rent Due — ${listingTitle}`,
      message: isOD
        ? `Your rent of ৳${Number(amount).toLocaleString()} for ${month} at ${listingTitle} is OVERDUE. Please pay immediately.`
        : `Your rent of ৳${Number(amount).toLocaleString()} for ${month} at ${listingTitle} is due on ${new Date(dueDate).toLocaleDateString()}.`,
      link: '/rent-tracking',
      sourceId: newPayment._id.toString(),
      sourceType: 'RentPayment',
    });

    // ── Notify admin that landlord logged a rent record ───────
    await createNotification({
      recipientId: 'admin',
      recipientEmail: process.env.ADMIN_EMAIL || 'admin@rentease.com',
      recipientRole: 'admin',
      type: isOD ? 'rent_overdue' : 'rent_due',
      title: isOD ? `🚨 Overdue Rent Logged: ${listingTitle}` : `📋 Rent Record Logged: ${listingTitle}`,
      message: `Landlord "${landlordName}" created a rent record for tenant "${tenantName || tenantEmail}" (${month}) at "${listingTitle}". Amount: ৳${finalAmount.toLocaleString()}, Status: ${initialStatus.toUpperCase()}.`,
      link: '/rent-tracking',
      sourceId: newPayment._id.toString(),
      sourceType: 'RentPayment',
    });

    res.status(201).json({
      message: 'Rent payment record created successfully',
      payment: newPayment,
    });
  } catch (err) {
    console.error('❌ createRentPayment error:', err);
    res.status(500).json({ message: 'Failed to create rent payment record', error: err.message });
  }
};

// ── 2. Get rent payment records ───────────────────────────────
exports.getRentPayments = async (req, res) => {
  try {
    // Perform automatic overdue check sync first
    await syncOverdueStatuses();

    const { role, id, email } = req.user || {};
    const { month, status, search } = req.query;

    let filter = {};

    // Role based authorization filter:
    // Landlord sees their own properties' rent records
    // User sees only their own rental payment records
    // Admin sees all records (read-only audit)
    if (role === 'landlord') {
      filter.landlordId = id;
    } else if (role === 'user') {
      filter.$or = [{ tenantEmail: email }, { tenantId: id }];
    } // admin sees all

    if (month && month !== 'all') {
      filter.month = month;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$and = [
        filter.$and ? { ...filter.$and } : {},
        {
          $or: [
            { tenantName: searchRegex },
            { tenantEmail: searchRegex },
            { listingTitle: searchRegex },
          ],
        },
      ];
    }

    const payments = await RentPayment.find(filter).sort({ dueDate: 1, createdAt: -1 });

    // Calculate Summary Stats
    let allRolePayments = [];
    if (role === 'landlord') {
      allRolePayments = await RentPayment.find({ landlordId: id });
    } else if (role === 'user') {
      allRolePayments = await RentPayment.find({ $or: [{ tenantEmail: email }, { tenantId: id }] });
    } else {
      allRolePayments = await RentPayment.find({});
    }

    const summary = {
      totalCollected: allRolePayments
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0),
      totalDue: allRolePayments
        .filter((p) => p.status === 'due')
        .reduce((sum, p) => sum + p.amount, 0),
      totalOverdue: allRolePayments
        .filter((p) => p.status === 'overdue')
        .reduce((sum, p) => sum + p.amount, 0),
      overdueCount: allRolePayments.filter((p) => p.status === 'overdue').length,
      paidCount: allRolePayments.filter((p) => p.status === 'paid').length,
      dueCount: allRolePayments.filter((p) => p.status === 'due').length,
    };

    res.json({ payments, summary });
  } catch (err) {
    console.error('❌ getRentPayments error:', err);
    res.status(500).json({ message: 'Failed to fetch rent payments', error: err.message });
  }
};

// ── 3. Update rent status & details (LANDLORD ONLY) ───────────
exports.updateRentStatus = async (req, res) => {
  try {
    // POWER CHECK: Only landlord has the power to edit, mark paid, mark due, flag overdue
    if (req.user?.role !== 'landlord') {
      return res.status(403).json({
        message: 'Forbidden: Only landlords have the power to perform rent actions (editing, marking paid/due/overdue).',
      });
    }

    const { id } = req.params;
    const { status, paidDate, paymentMethod, notes, amount, dueDate, bookedDays, dailyRate } = req.body;

    const payment = await RentPayment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Rent payment record not found' });
    }

    const previousStatus = payment.status;

    if (status) {
      payment.status = status;
      if (status === 'paid') {
        payment.paidDate = paidDate ? new Date(paidDate) : new Date();
        payment.overdueFlagged = false;
      } else if (status === 'overdue') {
        payment.overdueFlagged = true;
        payment.paidDate = null;
      } else if (status === 'due') {
        payment.paidDate = null;
        // Check if due date is past
        payment.overdueFlagged = new Date(payment.dueDate) < new Date();
        if (payment.overdueFlagged) {
          payment.status = 'overdue';
        }
      }
    }

    if (paymentMethod !== undefined) payment.paymentMethod = paymentMethod;
    if (notes !== undefined) payment.notes = notes;
    if (bookedDays !== undefined) payment.bookedDays = Number(bookedDays);
    if (dailyRate !== undefined) payment.dailyRate = Number(dailyRate);
    if (amount !== undefined) payment.amount = Number(amount);
    if (dueDate !== undefined) {
      payment.dueDate = new Date(dueDate);
      if (payment.status === 'due' && new Date(dueDate) < new Date()) {
        payment.status = 'overdue';
        payment.overdueFlagged = true;
      }
    }

    await payment.save();

    const landlordDisplayName = req.user?.name || req.user?.email || 'Landlord';

    // ── Notify tenant of status change ───────────────────────
    if (status) {
      const notifType = status === 'paid' ? 'rent_paid' : status === 'overdue' ? 'rent_overdue' : 'rent_due';
      const notifTitle = status === 'paid'
        ? `✅ Rent Confirmed Paid — ${payment.listingTitle}`
        : status === 'overdue'
        ? `🚨 Rent Overdue — ${payment.listingTitle}`
        : `💳 Rent Due — ${payment.listingTitle}`;
      const notifMsg = status === 'paid'
        ? `Your rent of ৳${payment.amount.toLocaleString()} for ${payment.month} has been marked as paid by landlord. Thank you!`
        : status === 'overdue'
        ? `Your rent of ৳${payment.amount.toLocaleString()} for ${payment.month} has been flagged as overdue by landlord. Please pay immediately.`
        : `Your rent of ৳${payment.amount.toLocaleString()} for ${payment.month} is due on ${new Date(payment.dueDate).toLocaleDateString()}.`;

      await createNotification({
        recipientId: payment.tenantId,
        recipientEmail: payment.tenantEmail,
        recipientRole: 'user',
        type: notifType,
        title: notifTitle,
        message: notifMsg,
        link: '/rent-tracking',
        sourceId: payment._id.toString(),
        sourceType: 'RentPayment',
      });
    }

    // ── Notify ADMIN of landlord's rent action ────────────────
    const adminActionTitle = status === 'paid'
      ? `💰 Rent Marked Paid: ${payment.listingTitle}`
      : status === 'overdue'
      ? `🚨 Rent Flagged Overdue: ${payment.listingTitle}`
      : status === 'due'
      ? `⏳ Rent Marked Due: ${payment.listingTitle}`
      : `✏️ Rent Record Edited: ${payment.listingTitle}`;

    const adminActionMsg = `Landlord "${landlordDisplayName}" updated rent record for tenant "${payment.tenantName}" (${payment.month}) at "${payment.listingTitle}". Status: ${payment.status.toUpperCase()} (was ${previousStatus.toUpperCase()}), Amount: ৳${payment.amount.toLocaleString()}.`;

    await createNotification({
      recipientId: 'admin',
      recipientEmail: process.env.ADMIN_EMAIL || 'admin@rentease.com',
      recipientRole: 'admin',
      type: status === 'paid' ? 'rent_paid' : status === 'overdue' ? 'rent_overdue' : 'rent_due',
      title: adminActionTitle,
      message: adminActionMsg,
      link: '/rent-tracking',
      sourceId: payment._id.toString(),
      sourceType: 'RentPayment',
    });

    res.json({
      message: `Rent status updated to '${payment.status}'`,
      payment,
    });
  } catch (err) {
    console.error('❌ updateRentStatus error:', err);
    res.status(500).json({ message: 'Failed to update rent record', error: err.message });
  }
};

// ── 4. Delete rent record (LANDLORD ONLY) ──────────────────────
exports.deleteRentPayment = async (req, res) => {
  try {
    // POWER CHECK: Only landlord can delete rent records
    if (req.user?.role !== 'landlord') {
      return res.status(403).json({
        message: 'Forbidden: Only landlords have the power to delete rent payment records.',
      });
    }

    const { id } = req.params;
    const payment = await RentPayment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Rent payment record not found' });
    }

    await RentPayment.findByIdAndDelete(id);

    const landlordDisplayName = req.user?.name || req.user?.email || 'Landlord';

    // ── Notify admin of deleted rent record ───────────────────
    await createNotification({
      recipientId: 'admin',
      recipientEmail: process.env.ADMIN_EMAIL || 'admin@rentease.com',
      recipientRole: 'admin',
      type: 'system',
      title: `🗑 Rent Record Deleted: ${payment.listingTitle}`,
      message: `Landlord "${landlordDisplayName}" deleted the rent record for tenant "${payment.tenantName}" (${payment.month}) at "${payment.listingTitle}". Amount was ৳${payment.amount.toLocaleString()}.`,
      link: '/rent-tracking',
      sourceId: payment._id.toString(),
      sourceType: 'RentPayment',
    });

    res.json({ message: 'Rent payment record deleted successfully', id });
  } catch (err) {
    console.error('❌ deleteRentPayment error:', err);
    res.status(500).json({ message: 'Failed to delete rent record', error: err.message });
  }
};

// ── 5. Bulk generate rent (LANDLORD ONLY) ──────────────────────
exports.bulkGenerateRent = async (req, res) => {
  try {
    // POWER CHECK: Only landlord can bulk generate rent
    if (req.user?.role !== 'landlord') {
      return res.status(403).json({
        message: 'Forbidden: Only landlords have the power to generate rent records.',
      });
    }

    const landlordId = req.user?.id || 'demo-landlord';
    const landlordDisplayName = req.user?.name || req.user?.email || 'Landlord';
    const { month, defaultDueDate } = req.body;

    if (!month) {
      return res.status(400).json({ message: 'Month is required (e.g. "2026-09")' });
    }

    // Find all approved bookings for this landlord
    const approvedBookings = await Booking.find({
      landlordId,
      status: 'approved',
    }).populate('listingId');

    if (approvedBookings.length === 0) {
      return res.status(404).json({
        message: 'No approved tenant bookings found to generate rent for.',
      });
    }

    const createdRecords = [];
    const dueDate = defaultDueDate ? new Date(defaultDueDate) : new Date();

    // Parse year and month to determine days in month
    const [yearStr, monthStr] = month.split('-');
    const yearNum = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const daysInMonth = (yearNum && monthNum)
      ? new Date(yearNum, monthNum, 0).getDate()
      : 30;

    for (const booking of approvedBookings) {
      // Check if already generated for this month
      const existing = await RentPayment.findOne({
        landlordId,
        tenantEmail: booking.tenantEmail,
        month,
        listingTitle: booking.listingTitle,
      });

      if (!existing) {
        const monthDates = (booking.dates || []).filter((d) => d.startsWith(month));
        const bookedDaysCount = monthDates.length > 0 ? monthDates.length : (booking.dates?.length || 1);

        const listingMonthlyPrice = booking.listingId?.price || 30000;
        const dailyRate = Math.round(listingMonthlyPrice / daysInMonth);
        const calculatedAmount = Math.round(dailyRate * bookedDaysCount);

        const isOverdue = dueDate < new Date();
        const newRecord = new RentPayment({
          tenantId: booking.tenantId,
          tenantName: booking.tenantName,
          tenantEmail: booking.tenantEmail,
          landlordId,
          landlordName: landlordDisplayName,
          listingId: booking.listingId?._id || booking.listingId,
          listingTitle: booking.listingTitle,
          month,
          amount: calculatedAmount,
          bookedDays: bookedDaysCount,
          dailyRate,
          bookingId: booking._id,
          dueDate,
          status: isOverdue ? 'overdue' : 'due',
          overdueFlagged: isOverdue,
          notes: `Auto-calculated: ${bookedDaysCount} day(s) @ ৳${dailyRate.toLocaleString()}/day`,
        });
        await newRecord.save();
        createdRecords.push(newRecord);
      }
    }

    // ── Notify admin of bulk generation ───────────────────────
    if (createdRecords.length > 0) {
      await createNotification({
        recipientId: 'admin',
        recipientEmail: process.env.ADMIN_EMAIL || 'admin@rentease.com',
        recipientRole: 'admin',
        type: 'rent_due',
        title: `⚡ Bulk Rent Generated (${month})`,
        message: `Landlord "${landlordDisplayName}" bulk-generated ${createdRecords.length} rent record(s) for ${month}.`,
        link: '/rent-tracking',
        sourceType: 'RentPayment',
      });
    }

    res.json({
      message: `Generated ${createdRecords.length} day-based rent record(s) for ${month}`,
      createdCount: createdRecords.length,
      records: createdRecords,
    });
  } catch (err) {
    console.error('❌ bulkGenerateRent error:', err);
    res.status(500).json({ message: 'Failed to generate monthly rent', error: err.message });
  }
};
