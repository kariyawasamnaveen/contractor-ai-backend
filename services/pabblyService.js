const axios = require('axios');

class PabblyService {
  constructor() {
    this.webhookUrl = process.env.PABBLY_WEBHOOK_URL || 'https://connect.pabbly.com/workflow/sendwebhookdata/IjU3NjYwNTY1MDYzZjA0M2Q1MjZhNTUzMTUxMzMi_pc';
  }

  async sendLead(leadData) {
    try {
      const payload = {
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        project_type: leadData.projectType,
        budget: leadData.budget,
        location: leadData.location,
        description: leadData.description,
        source: 'chatbot',
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(this.webhookUrl, payload, {
        timeout: 10000
      });

      console.log('✅ Lead sent to Pabbly');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Pabbly error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PabblyService();