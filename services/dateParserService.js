// ========================================
// 2. backend/services/dateParserService.js
// ========================================
const chrono = require('chrono-node');

class DateParserService {
  extractDateTime(message) {
    try {
      // ✅ Use Asia/Kolkata timezone as reference
      const now = new Date();
      const results = chrono.parse(message, now, { 
        forwardDate: true,
        timezone: 'Asia/Kolkata'
      });
      
      if (results.length === 0) {
        return null;
      }

      const parsedDate = results[0].start.date();
      const detectedText = results[0].text;

      // ✅ Ensure future date
      if (parsedDate <= now) {
        parsedDate.setDate(parsedDate.getDate() + 1);
      }

      return {
        success: true,
        dateTime: parsedDate.toISOString(),
        detectedText: detectedText,
        formatted: parsedDate.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    } catch (error) {
      console.error('Date parsing error:', error);
      return null;
    }
  }

  hasDateTimeIntent(message) {
    const dateKeywords = [
      'tomorrow', 'today', 'tonight', 'morning', 'afternoon', 'evening',
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
      'next week', 'next month', 'call me', 'schedule', 'appointment',
      'am', 'pm', 'o\'clock', 'at', 'on'
    ];

    const lowerMessage = message.toLowerCase();
    return dateKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  isValidFutureDate(dateTime) {
    const parsedDate = new Date(dateTime);
    const now = new Date();
    return parsedDate > now;
  }
}

module.exports = new DateParserService();
