import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { SupportTicket, TicketStatus, TicketRequestType, TicketRequestedField } from '../models/SupportTicket';
import { User } from '../models/User';
import { auditService } from '../services/auditService';

const router = Router();

// Protect ALL support ticket endpoints with authentication
router.use(requireAuth);

/**
 * POST /api/support-tickets
 * Create a new identity change or support ticket for the authenticated user
 */
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User account not found.' });
      return;
    }

    const { requestType, requestedField, proposedValue, reason, supportingDocumentRef } = req.body;

    if (!requestedField || !proposedValue || !reason) {
      res.status(400).json({
        success: false,
        error: 'Requested field, proposed value, and explanation reason are required.',
      });
      return;
    }

    const allowedFields: TicketRequestedField[] = ['name', 'dateOfBirth', 'nidNumber', 'address', 'other'];
    if (!allowedFields.includes(requestedField)) {
      res.status(400).json({ success: false, error: `Invalid requested field [${requestedField}].` });
      return;
    }

    // Determine current value
    let currentValue = '';
    if (requestedField === 'name') currentValue = user.name || '';
    else if (requestedField === 'dateOfBirth') currentValue = user.dateOfBirth ? String(user.dateOfBirth) : '';
    else if (requestedField === 'nidNumber') currentValue = user.nidNumber || '';
    else if (requestedField === 'address') currentValue = user.address || '';

    // Generate unique Ticket ID: TCK-2026-XXXX
    const year = new Date().getFullYear();
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const ticketId = `TCK-${year}-${randomSeq}`;

    const newTicket = await SupportTicket.create({
      ticketId,
      userId: user._id,
      userRole: user.role,
      requestType: (requestType as TicketRequestType) || 'IDENTITY_CHANGE',
      requestedField: requestedField as TicketRequestedField,
      currentValue,
      proposedValue: String(proposedValue).trim(),
      reason: String(reason).trim(),
      supportingDocumentRef: supportingDocumentRef ? String(supportingDocumentRef).trim() : undefined,
      status: 'OPEN',
    });

    res.json({
      success: true,
      message: 'Support ticket submitted successfully. Pending Administrator review.',
      ticket: newTicket,
    });
  } catch (error: any) {
    console.error('[SupportTicketRoutes] Create ticket error:', error);
    res.status(500).json({ success: false, error: 'Failed to create support ticket.', details: error.message });
  }
});

/**
 * GET /api/support-tickets/my-tickets
 * Retrieve list of support tickets submitted by current user
 */
router.get('/my-tickets', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: tickets.length, tickets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch your support tickets.' });
  }
});

/**
 * GET /api/support-tickets/admin/all
 * Admin-only query for support tickets with search, status filtering, and pagination
 */
router.get('/admin/all', requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, requestType, search, page: pageStr, limit: limitStr } = req.query;
    const filter: any = {};

    if (status) filter.status = status as TicketStatus;
    if (requestType) filter.requestType = requestType as TicketRequestType;

    const page = parseInt((pageStr as string) || '1', 10);
    const limit = parseInt((limitStr as string) || '10', 10);
    const skip = (page - 1) * limit;

    if (search && (search as string).trim()) {
      const q = (search as string).trim();
      const matchingUsers = await User.find({
        $or: [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }, { phone: { $regex: q, $options: 'i' } }],
      }).select('_id').lean();

      const userIds = matchingUsers.map((u) => u._id);

      filter.$or = [
        { ticketId: { $regex: q, $options: 'i' } },
        { reason: { $regex: q, $options: 'i' } },
        { proposedValue: { $regex: q, $options: 'i' } },
        { userId: { $in: userIds } },
      ];
    }

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .populate('userId', 'name phone email role accountStatus profileImage')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicket.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: tickets.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
      tickets,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch admin support tickets queue.', details: error.message });
  }
});

/**
 * POST /api/support-tickets/admin/:id/resolve
 * Admin-only action to APPROVE or REJECT a support ticket
 */
router.post('/admin/:id/resolve', requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, resolutionReason } = req.body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      res.status(400).json({ success: false, error: 'Action must be APPROVE or REJECT.' });
      return;
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      res.status(404).json({ success: false, error: 'Support ticket not found.' });
      return;
    }

    const targetUser = await User.findById(ticket.userId);
    if (!targetUser) {
      res.status(404).json({ success: false, error: 'Target user account no longer exists.' });
      return;
    }

    const oldVal = ticket.currentValue || '';
    const newVal = ticket.proposedValue;

    if (action === 'APPROVE') {
      // Execute identity update on user profile
      if (ticket.requestedField === 'name') {
        targetUser.name = newVal;
      } else if (ticket.requestedField === 'dateOfBirth') {
        targetUser.dateOfBirth = newVal;
      } else if (ticket.requestedField === 'nidNumber') {
        targetUser.nidNumber = newVal;
        targetUser.nidStatus = 'VERIFIED';
      } else if (ticket.requestedField === 'address') {
        targetUser.address = newVal;
      }

      ticket.status = 'APPROVED';
      ticket.reviewedBy = req.user!.id as any;
      ticket.reviewedAt = new Date();
      ticket.resolutionReason = resolutionReason || 'Approved after document verification';
      await ticket.save();
      await targetUser.save();

      // Write immutable audit log
      await auditService.logAction({
        actorId: req.user!.id,
        action: 'IDENTITY_CHANGE_APPROVED',
        entity: 'USER',
        entityId: targetUser._id.toString(),
        ipAddress: req.ip,
        metadata: {
          ticketId: ticket.ticketId,
          requestedField: ticket.requestedField,
          oldValue: oldVal,
          newValue: newVal,
          resolutionReason: ticket.resolutionReason,
        },
      });

      res.json({
        success: true,
        message: `Support ticket ${ticket.ticketId} APPROVED. User ${ticket.requestedField} updated to "${newVal}".`,
        ticket,
      });
    } else {
      ticket.status = 'REJECTED';
      ticket.reviewedBy = req.user!.id as any;
      ticket.reviewedAt = new Date();
      ticket.resolutionReason = resolutionReason || 'Rejected after review';
      await ticket.save();

      await auditService.logAction({
        actorId: req.user!.id,
        action: 'IDENTITY_CHANGE_REJECTED',
        entity: 'USER',
        entityId: targetUser._id.toString(),
        ipAddress: req.ip,
        metadata: {
          ticketId: ticket.ticketId,
          requestedField: ticket.requestedField,
          resolutionReason: ticket.resolutionReason,
        },
      });

      res.json({
        success: true,
        message: `Support ticket ${ticket.ticketId} REJECTED.`,
        ticket,
      });
    }
  } catch (error: any) {
    console.error('[SupportTicketRoutes] Resolve ticket error:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve support ticket.', details: error.message });
  }
});

export default router;
