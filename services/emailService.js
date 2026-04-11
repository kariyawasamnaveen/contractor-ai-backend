require('dotenv').config();
const axios = require('axios');

class EmailService {
  async sendLeadNotification(lead) {
    try {
      // ✅ Add appointment section if exists
      const appointmentSection = lead.appointmentTime 
        ? `
      <div class="info-box" style="background: #e0f2fe; border-left: 4px solid #0284c7;">
        <h3 style="color: #0369a1; margin-top: 0;">📅 Appointment Requested</h3>
        <p><span class="label">Scheduled Time:</span><span class="value">${new Date(lead.appointmentTime).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</span></p>
      </div>
      `
        : '';

      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: {
            name: 'Estate Contractor',
            email: '9907ab001@smtp-brevo.com'
          },
          to: [
            {
              email: 'theestatecontractor@gmail.com',
              name: 'Estate Contractor Admin'
            }
          ],
          replyTo: {
            email: lead.email || 'noreply@estatecontractor.net'
          },
          subject: '🏠 New Lead from Website - Estate Contractor',
          htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
    .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2563eb; border-radius: 4px; }
    .label { font-weight: bold; color: #475569; }
    .value { color: #1e293b; margin-left: 10px; }
    .footer { background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🏠 New Lead Received</h1>
      <p style="margin: 5px 0 0 0;">Estate Contractor - Website Chatbot</p>
    </div>
    
    <div class="content">
      <h2 style="color: #2563eb; margin-top: 0;">Contact Information</h2>
      <div class="info-box">
        <p><span class="label">Name:</span><span class="value">${lead.name}</span></p>
        <p><span class="label">Email:</span><span class="value">${lead.email || 'Not provided'}</span></p>
        <p><span class="label">Phone:</span><span class="value">${lead.phone || 'Not provided'}</span></p>
      </div>
      
      ${appointmentSection}
      
      <h2 style="color: #2563eb;">Project Details</h2>
      <div class="info-box">
        <p><span class="label">Project Type:</span><span class="value">${lead.projectType}</span></p>
        <p><span class="label">Budget:</span><span class="value">${lead.budget || 'Not specified'}</span></p>
        <p><span class="label">Location:</span><span class="value">${lead.location || 'Not provided'}</span></p>
        ${lead.description ? `<p><span class="label">Description:</span><span class="value">${lead.description}</span></p>` : ''}
      </div>
      
      <div class="info-box">
        <p><span class="label">Source:</span><span class="value">Website Chatbot</span></p>
        <p><span class="label">Received:</span><span class="value">${new Date(lead.createdAt).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}</span></p>
      </div>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from Estate Contractor Lead Management System</p>
      <p>© ${new Date().getFullYear()} Estate Contractor. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
          `
        },
        {
          headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
            'content-type': 'application/json'
          }
        }
      );

      console.log('✅ Email sent via Brevo API');
      return { success: true };
    } catch (error) {
      console.error('❌ Brevo API error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  async sendCallbackNotification(leadData, callbackTime) {
    try {
      console.log('🔍 DEBUG 19: sendCallbackNotification called');
      console.log('🔍 DEBUG 20: leadData:', leadData);
      console.log('🔍 DEBUG 21: callbackTime:', callbackTime);
      
      const callbackDate = new Date(callbackTime);
      console.log('🔍 DEBUG 22: callbackDate object:', callbackDate);
      
      const formattedTime = callbackDate.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log('🔍 DEBUG 23: Formatted time:', formattedTime);

      const emailPayload = {
        sender: {
          name: 'Estate Contractor',
          email: '9907ab001@smtp-brevo.com'
        },
        to: [
          {
            email: 'theestatecontractor@gmail.com',
            name: 'Estate Contractor Admin'
          }
        ],
        subject: '📅 Callback Scheduled - Action Required',
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f0fdf4; padding: 30px; border: 1px solid #d1fae5; }
    .time-box { background: white; padding: 20px; margin: 20px 0; border: 2px solid #059669; border-radius: 8px; text-align: center; }
    .time { font-size: 24px; font-weight: bold; color: #059669; }
    .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #059669; border-radius: 4px; }
    .label { font-weight: bold; color: #065f46; }
    .value { color: #064e3b; margin-left: 10px; }
    .footer { background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📅 Callback Reminder</h1>
      <p style="margin: 5px 0 0 0;">Estate Contractor - Scheduled Follow-up</p>
    </div>
    
    <div class="content">
      <div class="time-box">
        <p style="margin: 0; font-size: 14px; color: #065f46;">SCHEDULED FOR</p>
        <p class="time" style="margin: 10px 0;">${formattedTime}</p>
      </div>
      
      <h2 style="color: #059669;">Lead Information</h2>
      <div class="info-box">
        <p><span class="label">Name:</span><span class="value">${leadData.name}</span></p>
        <p><span class="label">Email:</span><span class="value">${leadData.email || 'Not provided'}</span></p>
        <p><span class="label">Phone:</span><span class="value">${leadData.phone || 'Not provided'}</span></p>
      </div>
      
      <div class="info-box">
        <p><span class="label">Project Type:</span><span class="value">${leadData.projectType}</span></p>
        <p><span class="label">Budget:</span><span class="value">${leadData.budget || 'Not specified'}</span></p>
      </div>
      
      <p style="background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 4px; margin-top: 20px;">
        <strong>⏰ Reminder:</strong> Please contact this lead at the scheduled time above.
      </p>
    </div>
    
    <div class="footer">
      <p>This callback has been added to your Google Calendar</p>
      <p>© ${new Date().getFullYear()} Estate Contractor. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `
      };

      console.log('🔍 DEBUG 24: Sending email to Brevo API...');

      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        emailPayload,
        {
          headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
            'content-type': 'application/json'
          }
        }
      );

      console.log('🔍 DEBUG 25: Brevo API response status:', response.status);
      console.log('🔍 DEBUG 26: Brevo API response data:', response.data);
      console.log('✅ Callback email sent via Brevo API');
      
      return { success: true };
    } catch (error) {
      console.error('❌ DEBUG 27: Callback email error caught');
      console.error('🔍 DEBUG 28: Error message:', error.message);
      console.error('🔍 DEBUG 29: Error response:', error.response?.data);
      return { success: false };
    }
  }
}

module.exports = new EmailService();
