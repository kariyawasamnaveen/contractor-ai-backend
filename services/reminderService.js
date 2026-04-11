const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const emailService = require('./emailService');
const telegramService = require('./telegramService');

const prisma = new PrismaClient();

class ReminderService {
  constructor() {
    this.startReminderCron();
  }

  /**
   * Start cron job to check reminders every hour
   */
  startReminderCron() {
    // Run every hour
    cron.schedule('0 * * * *', async () => {
      console.log('🔔 Checking for due reminders...');
      await this.checkAndSendReminders();
    });

    console.log('✅ Reminder cron job started');
  }

  /**
   * Check and send due reminders
   */
  async checkAndSendReminders() {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      // Find leads that need follow-up
      const leadsToFollowUp = await prisma.lead.findMany({
        where: {
          status: {
            in: ['new', 'contacted', 'interested']
          },
          createdAt: {
            lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago
          },
          // Add a custom field check if you have lastContactedAt
        }
      });

      for (const lead of leadsToFollowUp) {
        await this.sendFollowUpReminder(lead);
      }

      console.log(`✅ Sent ${leadsToFollowUp.length} follow-up reminders`);
    } catch (error) {
      console.error('❌ Reminder check error:', error);
    }
  }

  /**
   * Send follow-up reminder to admin
   */
  async sendFollowUpReminder(lead) {
    try {
      const message = this.formatFollowUpMessage(lead);

      // Send Telegram notification
      if (process.env.TELEGRAM_BOT_TOKEN) {
        await telegramService.sendMessage(message);
      }

      // Send Email notification
      if (process.env.BREVO_API_KEY) {
        await this.sendReminderEmail(lead);
      }

      console.log(`✅ Reminder sent for lead: ${lead.id}`);
    } catch (error) {
      console.error('❌ Send reminder error:', error);
    }
  }

  /**
   * Format Telegram follow-up message
   */
  formatFollowUpMessage(lead) {
    const hoursSince = Math.floor((new Date() - new Date(lead.createdAt)) / (1000 * 60 * 60));
    
    return `🔔 <b>FOLLOW-UP REMINDER</b>

⏰ Lead received ${hoursSince} hours ago

👤 <b>Name:</b> ${lead.name}
📞 <b>Phone:</b> ${lead.phone || 'N/A'}
📧 <b>Email:</b> ${lead.email || 'N/A'}
🏗 <b>Project:</b> ${lead.projectType}
💰 <b>Budget:</b> ${lead.budget || 'Not specified'}
📊 <b>Status:</b> ${lead.status}

⚠️ <b>Action Required:</b> Contact this lead soon!`;
  }

  /**
   * Send reminder email
   */
  async sendReminderEmail(lead) {
    const hoursSince = Math.floor((new Date() - new Date(lead.createdAt)) / (1000 * 60 * 60));

    const emailData = {
      to: [{ email: 'theestatecontractor@gmail.com', name: 'Admin' }],
      subject: `⏰ Follow-up Reminder: ${lead.name}`,
      htmlContent: `
        <div style="font-family: Arial; padding: 20px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px;">
          <h2 style="color: #856404;">🔔 Follow-up Reminder</h2>
          <p><strong>⏰ Lead received:</strong> ${hoursSince} hours ago</p>
          <hr>
          <p><strong>👤 Name:</strong> ${lead.name}</p>
          <p><strong>📞 Phone:</strong> ${lead.phone || 'N/A'}</p>
          <p><strong>📧 Email:</strong> ${lead.email || 'N/A'}</p>
          <p><strong>🏗 Project:</strong> ${lead.projectType}</p>
          <p><strong>💰 Budget:</strong> ${lead.budget || 'Not specified'}</p>
          <p><strong>📊 Status:</strong> ${lead.status}</p>
          <hr>
          <p style="background: #ffc107; padding: 10px; border-radius: 4px;">
            <strong>⚠️ Action Required:</strong> Please contact this lead!
          </p>
        </div>
      `
    };

    // This would use your Brevo API
    // Implementation depends on your emailService
  }

  /**
   * Schedule a custom reminder
   */
  async scheduleReminder(leadId, reminderTime, message) {
    try {
      // Store reminder in database (you'd need a Reminder model)
      // For now, we'll just log it
      console.log(`⏰ Reminder scheduled for lead ${leadId} at ${reminderTime}`);
      
      return { success: true };
    } catch (error) {
      console.error('Schedule reminder error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send status change notification
   */
  async sendStatusChangeNotification(lead, oldStatus, newStatus) {
    try {
      const message = `📊 <b>Lead Status Changed</b>

👤 <b>Lead:</b> ${lead.name}
📞 <b>Phone:</b> ${lead.phone || 'N/A'}

📈 <b>Status Update:</b>
${oldStatus} ➡️ ${newStatus}

🕐 <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

      // Send Telegram
      if (process.env.TELEGRAM_BOT_TOKEN) {
        await telegramService.sendMessage(message);
      }

      console.log(`✅ Status change notification sent for lead: ${lead.id}`);
    } catch (error) {
      console.error('❌ Status change notification error:', error);
    }
  }
}

module.exports = new ReminderService();
