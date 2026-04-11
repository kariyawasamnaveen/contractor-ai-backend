const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); 

class CalendarService {
  constructor() {
    const keyPath = path.join(__dirname, '../config/google-calendar-key.json');
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    
    this.auth = new google.auth.GoogleAuth({
      credentials: keyFile,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    this.calendar = google.calendar({ version: 'v3' });
  }

  /**
   * Schedule a callback appointment
   */
  async scheduleCallback(leadData, callbackTime) {
    try {
      console.log('🟢 DEBUG CAL-1: Input callbackTime:', callbackTime);
      console.log('🟢 DEBUG CAL-2: typeof callbackTime:', typeof callbackTime);
      
      const authClient = await this.auth.getClient();
      console.log('🟢 DEBUG CAL-3: Auth obtained');
      
      // ✅ Add validation
      if (!callbackTime || callbackTime === 'null') {
        console.log('❌ DEBUG CAL-4: callbackTime is null/invalid');
        return { success: false, error: 'No callback time provided' };
      }
      
      const event = {
        summary: `Callback: ${leadData.name} - ${leadData.projectType}`,
        description: `Lead Details:...`,
        start: {
          dateTime: callbackTime,
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: new Date(new Date(callbackTime).getTime() + 30 * 60000).toISOString(),
          timeZone: 'Asia/Kolkata',
        },
      };
      
      console.log('🟢 DEBUG CAL-5: Event object created:', JSON.stringify(event, null, 2));
      console.log('🟢 DEBUG CAL-6: Calendar ID:', process.env.GOOGLE_CALENDAR_ID);
      
      const response = await this.calendar.events.insert({
        auth: authClient,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        resource: event,
      });
      
      console.log('🟢 DEBUG CAL-7: Calendar API response received');
      console.log('🟢 DEBUG CAL-8: Event ID:', response.data.id);
      console.log('🟢 DEBUG CAL-9: HTML Link:', response.data.htmlLink);
      
      return { success: true, eventLink: response.data.htmlLink };
    } catch (error) {
      console.error('❌ DEBUG CAL-10: Calendar error:', error.message);
      console.error('❌ DEBUG CAL-11: Full error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available time slots for a given date
   */
  async getAvailableSlots(date) {
    try {
      const authClient = await this.auth.getClient();
      
      // Set business hours: 9 AM to 5 PM
      const startTime = new Date(date);
      startTime.setHours(9, 0, 0, 0);
      
      const endTime = new Date(date);
      endTime.setHours(17, 0, 0, 0);

      // Get existing events from calendar
      const response = await this.calendar.events.list({
        auth: authClient,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const existingEvents = response.data.items || [];
      
      // Calculate available 30-minute slots
      const slots = [];
      const slotDuration = 30; // minutes
      let currentTime = new Date(startTime);

      while (currentTime < endTime) {
        const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000);
        
        // Check if this slot conflicts with any existing event
        const isAvailable = !existingEvents.some(event => {
          const eventStart = new Date(event.start.dateTime || event.start.date);
          const eventEnd = new Date(event.end.dateTime || event.end.date);
          return (currentTime < eventEnd && slotEnd > eventStart);
        });

        if (isAvailable) {
          slots.push({
            start: currentTime.toISOString(),
            end: slotEnd.toISOString(),
            time: currentTime.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }),
            formatted: currentTime.toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          });
        }
        
        // Move to next slot
        currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
      }

      console.log(`✅ Found ${slots.length} available slots`);
      return slots;
      
    } catch (error) {
      console.error('❌ Get available slots error:', error.message);
      return [];
    }
  }

  /**
   * Get available slots for next 7 days
   */
  async getAvailableSlotsForWeek() {
    try {
      const allSlots = {};
      const today = new Date();

      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        
        const dateKey = checkDate.toISOString().split('T')[0];
        const slots = await this.getAvailableSlots(checkDate.toISOString());
        
        if (slots.length > 0) {
          allSlots[dateKey] = {
            date: checkDate.toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            slots: slots
          };
        }
      }

      return allSlots;
    } catch (error) {
      console.error('❌ Get weekly slots error:', error.message);
      return {};
    }
  }

  /**
   * Book a specific time slot
   */
  async bookSlot(leadData, slotStart, slotEnd) {
    try {
      const authClient = await this.auth.getClient();
      
      const event = {
        summary: `Appointment: ${leadData.name}`,
        description: `Contact: ${leadData.phone || leadData.email}
Project: ${leadData.projectType || 'General Inquiry'}

Booked via: Website Chatbot`,
        start: {
          dateTime: slotStart,
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: slotEnd,
          timeZone: 'Asia/Kolkata',
        },
        attendees: leadData.email ? [{ email: leadData.email }] : [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 30 }
          ]
        }
      };

      const response = await this.calendar.events.insert({
        auth: authClient,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        resource: event,
        sendUpdates: 'all'
      });

      console.log('✅ Appointment booked:', response.data.htmlLink);
      
      return { 
        success: true, 
        eventId: response.data.id,
        eventLink: response.data.htmlLink 
      };
      
    } catch (error) {
      console.error('❌ Book slot error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel/Delete a calendar event
   */
  async cancelEvent(eventId) {
    try {
      const authClient = await this.auth.getClient();
      
      await this.calendar.events.delete({
        auth: authClient,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId: eventId,
        sendUpdates: 'all'
      });

      console.log('✅ Event cancelled:', eventId);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Cancel event error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new CalendarService();
