// ========================================
// 3. backend/services/telegramService.js
// ========================================
const axios = require('axios');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(message) {
    try {
      await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML'
      });
      console.log('✅ Telegram sent');
      return { success: true };
    } catch (error) {
      console.error('❌ Telegram error:', error.message);
      return { success: false };
    }
  }

  // ✅ UPDATED: Professional format
  formatLead(lead) {
    let message = `🏠 <b>NEW LEAD - Estate Contractor</b>\n\n`;
    
    message += `👤 <b>CONTACT</b>\n`;
    message += `   Name: ${lead.name}\n`;
    if (lead.phone) {
      message += `   📞 Phone: ${lead.phone}\n`;
    } else {
      message += `   📞 Phone: Not provided\n`;
    }
    if (lead.email) {
      message += `   📧 Email: ${lead.email}\n`;
    } else {
      message += `   📧 Email: Not provided\n`;
    }
    
    message += `\n🏗️ <b>PROJECT</b>\n`;
    message += `   Type: ${lead.projectType}\n`;
    message += `   Budget: ${lead.budget || 'Not specified'}\n`;
    
    // ✅ Add appointment if exists
    if (lead.appointmentTime) {
      const appointmentDate = new Date(lead.appointmentTime);
      message += `\n📅 <b>APPOINTMENT</b>\n`;
      message += `   ${appointmentDate.toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}\n`;
    }
    
    message += `\n📝 <b>DESCRIPTION</b>\n${lead.description || 'No details provided'}\n`;
    message += `\n⏰ Received: ${new Date(lead.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
    message += `\n📞 <b>ACTION:</b> Call immediately for best results!`;
    
    return message;
  }
}

module.exports = new TelegramService();
