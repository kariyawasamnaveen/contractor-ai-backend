const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

class AdminController {
  // Login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      const user = await prisma.user.findUnique({
        where: { email }
      });
      
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );
      
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });
      
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  // Get current user
  async me(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          lastLogin: true,
          createdAt: true
        }
      });
      
      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user' });
    }
  }

  // ========== NEW: GET DASHBOARD STATS ==========
  async getStats(req, res) {
    try {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const weekStart = new Date(now.setDate(now.getDate() - 7));
      const monthStart = new Date(now.setDate(now.getDate() - 30));

      const [total, today, week, month] = await Promise.all([
        prisma.lead.count(),
        prisma.lead.count({
          where: { createdAt: { gte: todayStart } }
        }),
        prisma.lead.count({
          where: { createdAt: { gte: weekStart } }
        }),
        prisma.lead.count({
          where: { createdAt: { gte: monthStart } }
        })
      ]);

      res.json({
        success: true,
        data: {
          total,
          today,
          week,
          month
        }
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  }

  // ========== NEW: GET ALL LEADS ==========
  async getLeads(req, res) {
    try {
      const { status, search, limit = 50, offset = 0 } = req.query;
      
      const where = {};
      
      if (status && status !== 'all') {
        where.status = status;
      }
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { projectType: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          include: {
            photos: true,
            notes: {
              take: 3,
              orderBy: { createdAt: 'desc' }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        prisma.lead.count({ where })
      ]);
      
      res.json({
        success: true,
        leads,
        total,
        hasMore: total > parseInt(offset) + parseInt(limit)
      });
    } catch (error) {
      console.error('Get leads error:', error);
      res.status(500).json({ error: 'Failed to get leads' });
    }
  }

  // ========== NEW: GET SINGLE LEAD ==========
  async getLead(req, res) {
    try {
      const { id } = req.params;
      
      const lead = await prisma.lead.findUnique({
        where: { id },
        include: {
          photos: true,
          notes: {
            orderBy: { createdAt: 'desc' }
          },
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 20
          },
          tasks: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      res.json({ success: true, lead });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get lead' });
    }
  }

  // Update lead status
  async updateLeadStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const lead = await prisma.lead.update({
        where: { id },
        data: { status }
      });
      
      await prisma.activity.create({
        data: {
          leadId: id,
          userId: req.user.id,
          action: 'status_updated',
          description: `Status changed to ${status}`
        }
      });
      
      res.json({ success: true, lead });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update lead status' });
    }
  }

  // Get conversations
  async getConversations(req, res) {
    try {
      const conversations = await prisma.conversation.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 50
      });
      
      res.json({ success: true, conversations });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get conversations' });
    }
  }

  // Get single conversation
  async getConversation(req, res) {
    try {
      const { sessionId } = req.params;
      
      const conversation = await prisma.conversation.findUnique({
        where: { sessionId }
      });
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      res.json({ success: true, conversation });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get conversation' });
    }
  }

  // Add note to lead
  async addNote(req, res) {
    try {
      const { leadId } = req.params;
      const { content } = req.body;
      
      const note = await prisma.note.create({
        data: {
          leadId,
          content,
          createdBy: req.user.name || req.user.email
        }
      });
      
      await prisma.activity.create({
        data: {
          leadId,
          userId: req.user.id,
          action: 'note_added',
          description: `Added a note`
        }
      });
      
      res.json({ success: true, note });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add note' });
    }
  }

  // Get notes for lead
  async getNotes(req, res) {
    try {
      const { leadId } = req.params;
      
      const notes = await prisma.note.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' }
      });
      
      res.json({ success: true, notes });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get notes' });
    }
  }

  // Assign lead
  async assignLead(req, res) {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;
      
      const lead = await prisma.lead.update({
        where: { id },
        data: { assignedTo }
      });
      
      await prisma.activity.create({
        data: {
          leadId: id,
          userId: req.user.id,
          action: 'lead_assigned',
          description: `Assigned to ${assignedTo}`
        }
      });
      
      res.json({ success: true, lead });
    } catch (error) {
      res.status(500).json({ error: 'Failed to assign lead' });
    }
  }

  // Delete lead
  async deleteLead(req, res) {
    try {
      const { id } = req.params;
      
      await prisma.lead.delete({ where: { id } });
      
      await prisma.activity.create({
        data: {
          userId: req.user.id,
          action: 'lead_deleted',
          description: `Deleted lead ${id}`
        }
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete lead' });
    }
  }

  // Get activity log
  async getActivities(req, res) {
    try {
      const { leadId } = req.query;
      
      const where = leadId ? { leadId } : {};
      
      const activities = await prisma.activity.findMany({
        where,
        include: {
          user: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      
      res.json({ success: true, activities });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get activities' });
    }
  }

  // Create task
  async createTask(req, res) {
    try {
      const { leadId, title, description, dueDate, priority, assignedTo } = req.body;
      
      const task = await prisma.task.create({
        data: {
          leadId,
          title,
          description,
          dueDate: new Date(dueDate),
          priority,
          assignedTo
        }
      });
      
      await prisma.activity.create({
        data: {
          leadId,
          userId: req.user.id,
          action: 'task_created',
          description: `Created task: ${title}`
        }
      });
      
      res.json({ success: true, task });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create task' });
    }
  }

  // Get tasks
  async getTasks(req, res) {
    try {
      const { leadId, status } = req.query;
      
      const where = {};
      if (leadId) where.leadId = leadId;
      if (status) where.status = status;
      
      const tasks = await prisma.task.findMany({
        where,
        include: {
          lead: {
            select: { name: true, projectType: true }
          }
        },
        orderBy: { dueDate: 'asc' }
      });
      
      res.json({ success: true, tasks });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get tasks' });
    }
  }

  // Update task
  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const { status, completedAt } = req.body;
      
      const task = await prisma.task.update({
        where: { id },
        data: {
          status,
          completedAt: completedAt ? new Date(completedAt) : null
        }
      });
      
      res.json({ success: true, task });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update task' });
    }
  }
}

module.exports = new AdminController();
