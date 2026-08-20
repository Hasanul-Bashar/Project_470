const Complaint = require('../models/Complaint');

exports.createComplaint = async (req, res) => {
  try {
    const { title, category, description, targetType, targetId } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }

    const complaint = await Complaint.create({
      title,
      category: category || 'other',
      description,
      targetType: targetType || 'platform',
      targetId: targetId || '',
      submittedBy: {
        userId: req.user?.id || 'demo-user-id',
        email: req.user?.email || 'user@example.com',
        name: req.user?.name || req.user?.firstName || 'User',
        role: req.user?.role || 'user',
      },
      status: 'Pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully. Our admin team will review it.',
      complaint,
    });
  } catch (err) {
    console.error('❌ Create Complaint Error:', err);
    return res.status(500).json({ message: 'Server error creating complaint' });
  }
};

exports.getComplaints = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
    return res.json(complaints);
  } catch (err) {
    console.error('❌ Get Complaints Error:', err);
    return res.status(500).json({ message: 'Server error fetching complaints' });
  }
};

exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    return res.json(complaint);
  } catch (err) {
    console.error('❌ Get Complaint Details Error:', err);
    return res.status(500).json({ message: 'Server error fetching complaint details' });
  }
};

exports.updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes } = req.body;

    if (!['Pending', 'In Review', 'Resolved', 'Dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid complaint status' });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    complaint.status = status;
    if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;
    if (status === 'Resolved' || status === 'Dismissed') complaint.resolvedAt = new Date();

    await complaint.save();

    return res.json({
      success: true,
      message: `Complaint status updated to ${status}`,
      complaint,
    });
  } catch (err) {
    console.error('❌ Update Complaint Status Error:', err);
    return res.status(500).json({ message: 'Server error updating complaint status' });
  }
};
