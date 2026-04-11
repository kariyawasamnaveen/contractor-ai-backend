const { PrismaClient } = require('@prisma/client');
const pabblyService = require('../services/pabblyService');
const telegramService = require('../services/telegramService');
const emailService = require('../services/emailService');
const calendarService = require('../services/calendarService');
const reminderService = require('../services/reminderService');
const prisma = new PrismaClient();
const notificationService = require('../services/notificationService');

class LeadController {
  async createLead(req, res) {
    try {
      console.log('🔥 Received lead data:', req.body);
      
      const leadData = req.body;

      // Validate required fields
      if (!leadData.name || !leadData.projectType) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ 
          error: 'Name and projectType are required',
          received: leadData 
        });
      }

      // Save to database
      console.log('💾 Saving to database...');
      const lead = await prisma.lead.create({
        data: {
          name: leadData.name,
          email: leadData.email || null,
          phone: leadData.phone || null,
          projectType: leadData.projectType,
          budget: leadData.budget || null,
          location: leadData.location || null,
          description: leadData.description || null,
          status: 'new',
          source: 'chatbot'
        }
      });
      console.log('✅ Lead saved:', lead.id);

      // Send real-time notification to admin
      notificationService.sendNewLeadNotification(lead);

      // Send to Pabbly CRM (non-blocking)
      pabblyService.sendLead(leadData)
        .then(result => {
          if (result.success) {
            console.log('✅ Lead sent to Pabbly CRM');
          } else {
            console.log('⚠️  Pabbly CRM sync failed:', result.error);
          }
        })
        .catch(err => console.log('⚠️  Pabbly error:', err.message));

      // Send Telegram notification (non-blocking)
      const telegramMessage = telegramService.formatLead(lead);
      telegramService.sendMessage(telegramMessage)
        .then(result => {
          if (result.success) {
            console.log('✅ Telegram notification sent');
          } else {
            console.log('⚠️  Telegram notification failed');
          }
        })
        .catch(err => console.log('⚠️  Telegram error:', err.message));

      // Send Email notification (non-blocking)
      emailService.sendLeadNotification(lead)
        .then(result => {
          if (result.success) {
            console.log('✅ Email notification sent');
          } else {
            console.log('⚠️  Email notification failed:', result.error);
          }
        })
        .catch(err => console.log('⚠️  Email error:', err.message));

      // 🆕 Schedule calendar callback if time provided
if (leadData.callbackTime) {
  console.log('🔴 DEBUG LEAD-1: callbackTime exists:', leadData.callbackTime);
  console.log('🔴 DEBUG LEAD-2: Lead object:', JSON.stringify(lead, null, 2));
  
  calendarService.scheduleCallback(lead, leadData.callbackTime)
    .then(result => {
      console.log('🔴 DEBUG LEAD-3: Calendar result:', result);
      if (result.success) {
        console.log('✅ DEBUG LEAD-4: Calendar success!');
      } else {
        console.log('❌ DEBUG LEAD-5: Calendar failed:', result.error);
      }
    })
    .catch(err => {
      console.log('❌ DEBUG LEAD-6: Calendar exception:', err.message);
    });
} else {
  console.log('🔴 DEBUG LEAD-7: NO callbackTime provided');
}
      // 🆕 Reminder service will automatically track this lead via cron job
      // No manual scheduling needed - it runs every hour automatically

      res.json({
        success: true,
        lead: {
          id: lead.id,
          name: lead.name,
          projectType: lead.projectType,
          createdAt: lead.createdAt
        }
      });

    } catch (error) {
      console.error('❌ Lead creation error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      
      res.status(500).json({ 
        error: 'Failed to create lead',
        details: error.message 
      });
    }
  }

  async getLeads(req, res) {
    try {
      const leads = await prisma.lead.findMany({
        include: { photos: true },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      res.json({
        success: true,
        count: leads.length,
        leads
      });
    } catch (error) {
      console.error('❌ Get leads error:', error);
      res.status(500).json({ error: 'Failed to get leads' });
    }
  }

  async getLeadById(req, res) {
    try {
      const { id } = req.params;
      
      const lead = await prisma.lead.findUnique({
        where: { id },
        include: { photos: true }
      });

      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      res.json({ success: true, lead });
    } catch (error) {
      console.error('❌ Get lead by ID error:', error);
      res.status(500).json({ error: 'Failed to get lead' });
    }
  }

  async updateLeadStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, oldStatus } = req.body;

      // Get current lead to know old status
      const currentLead = await prisma.lead.findUnique({
        where: { id }
      });

      if (!currentLead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      const previousStatus = oldStatus || currentLead.status;

      // Update lead status
      const lead = await prisma.lead.update({
        where: { id },
        data: { status }
      });

      // 🆕 Send status change notification
      await reminderService.sendStatusChangeNotification(
        lead, 
        previousStatus, 
        status
      ).catch(err => console.log('⚠️  Status notification error:', err.message));

      res.json({ success: true, lead });
    } catch (error) {
      console.error('❌ Update lead status error:', error);
      res.status(500).json({ error: 'Failed to update lead status' });
    }
  }
}

module.exports = new LeadController();
