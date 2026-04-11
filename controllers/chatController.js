// ========================================
// 1. backend/controllers/chatController.js
// ========================================
const aiService = require('../services/aiService');
const faqService = require('../services/faqService');
const emailService = require('../services/emailService');
const conversationStateService = require('../services/conversationStateService'); // ✅ NEW IMPORT
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const dateParserService = require('../services/dateParserService');
const prisma = new PrismaClient();

class ChatController {
  async sendMessage(req, res) {
    try {
      const { message, sessionId, language = 'en' } = req.body;

      console.log('🔵 DEBUG 1 [chatController]: Message received');
      console.log('  - Message:', message);
      console.log('  - SessionId:', sessionId);
      console.log('  - Language:', language);

      console.log(`📩 Received: "${message}" (Session: ${sessionId})`);

      let conversation = await prisma.conversation.findUnique({
        where: { sessionId }
      });

      const chatHistory = conversation?.messages || [];

      const response = await aiService.processMessage(
        message,
        chatHistory,
        language
      );

      const updatedMessages = [
        ...chatHistory,
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: response, timestamp: new Date() }
      ];

      if (conversation) {
        await prisma.conversation.update({
          where: { sessionId },
          data: {
            messages: updatedMessages,
            language,
            updatedAt: new Date()
          }
        });
      } else {
        await prisma.conversation.create({
          data: {
            sessionId,
            messages: updatedMessages,
            language
          }
        });
      }

      // ✅ UPDATED: Extract contact info with context
      const contactInfo = this.extractContactInfoWithContext(message, sessionId, updatedMessages);

      console.log('🔵 DEBUG 2 [chatController]: Contact info extracted (with context)');
      console.log('  - Name:', contactInfo.name);
      console.log('  - Phone:', contactInfo.phone);
      console.log('  - Email:', contactInfo.email);

      // ✅ UPDATED: Extract appointment time
      let appointmentTime = null;
      if (dateParserService.hasDateTimeIntent(message)) {
        const dateInfo = dateParserService.extractDateTime(message);
        if (dateInfo && dateInfo.success) {
          appointmentTime = dateInfo;
          console.log('📅 Appointment detected:', dateInfo.formatted);
          
          // ✅ Store appointment in conversation state
          conversationStateService.updateState(sessionId, {
            appointment: dateInfo
          });
        }
      }

      const isLead = this.detectLead(message);

      console.log('🔵 DEBUG 3 [chatController]: Lead detection');
      console.log('  - isLead:', isLead);
      console.log('  - Has name?:', !!contactInfo.name);
      console.log('  - Has phone?:', !!contactInfo.phone);
      console.log('  - Has email?:', !!contactInfo.email);

      if (isLead || contactInfo.name || contactInfo.phone || contactInfo.email) {
        console.log('🔵 DEBUG 4 [chatController]: Lead condition TRUE - processing lead');
        
        console.log('🎯 Lead detected! Processing...');
        
        // ✅ Get complete contact info from conversation state
        const completeInfo = conversationStateService.getCompleteInfo(sessionId);
        
        // ✅ Use appointment from conversation state if not in current message
        if (!appointmentTime && completeInfo.appointment) {
          appointmentTime = completeInfo.appointment;
          console.log('📅 Using stored appointment:', appointmentTime.formatted);
        }
        
        this.sendNotifications({
          message,
          contactInfo: completeInfo, // ✅ Use complete info
          sessionId,
          language,
          chatHistory: updatedMessages,
          appointmentTime
        }).catch(err => console.error('Notification error:', err));

        // ✅ UPDATED: Create or update lead (not duplicate)
        if (completeInfo.name || completeInfo.email || completeInfo.phone) {
          console.log('🟢 DEBUG 5 [chatController]: Creating/updating lead...');
          
          try {
            await this.createOrUpdateLead(sessionId, completeInfo, message, appointmentTime);
            console.log('✅ Lead created/updated successfully!');
          } catch (error) {
            console.error('❌ Lead creation/update failed:', error.message);
          }
        } else {
          console.log('⚠️ DEBUG 5 [chatController]: Incomplete contact info - lead pending');
        }
      } else {
        console.log('🔵 DEBUG 4 [chatController]: Lead condition FALSE - no action');
      }

      console.log('🔵 DEBUG 6 [chatController]: Sending response to client');

      res.json({
        success: true,
        response,
        sessionId
      });

    } catch (error) {
      console.error('❌ Chat error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * ✅ NEW: Extract contact info with conversation context
   */
  extractContactInfoWithContext(message, sessionId, chatHistory) {
    // Step 1: Extract from current message
    const currentInfo = this.extractContactInfo(message);

    // Step 2: Check if message is a standalone name
    const standaloneName = conversationStateService.isStandaloneName(message);
    if (standaloneName) {
      currentInfo.name = standaloneName;
    }

    // Step 3: Extract name from AI context if not found
    if (!currentInfo.name) {
      const contextName = conversationStateService.extractNameFromContext(chatHistory);
      if (contextName) {
        currentInfo.name = contextName;
      }
    }

    // Step 4: Update conversation state
    const completeInfo = conversationStateService.updateState(sessionId, currentInfo);

    return completeInfo;
  }

  /**
   * ✅ EXISTING: Extract contact info from message (unchanged logic)
   */
  extractContactInfo(message) {
    const info = {
      name: null,
      phone: null,
      email: null
    };

    // ✅ Comma-separated format
    const commaPattern = /([a-zA-Z\s]{2,30}),\s*([^\s,]+@[^\s,]+\.[a-zA-Z]{2,}),\s*(\+?91?[\s-]?[6-9]\d{9})/;
    const commaMatch = message.match(commaPattern);
    if (commaMatch) {
      info.name = commaMatch[1].trim();
      info.email = commaMatch[2].trim();
      info.phone = commaMatch[3].replace(/[\s+-]/g, '').slice(-10);
      return info;
    }

    // Dash format
    const dashPattern = /name\s*[-:]\s*([a-zA-Z\s]+?)(?:\s*,|\s*phone|\s*email)/i;
    const phonePattern2 = /phone\s*[-:]\s*([\d\s+-]+)/i;
    const emailPattern2 = /email\s*[-:]\s*([^\s,]+@[^\s,]+)/i;
    
    const nameMatch = message.match(dashPattern);
    const phoneMatch = message.match(phonePattern2);
    const emailMatch = message.match(emailPattern2);
    
    if (nameMatch) info.name = nameMatch[1].trim();
    if (phoneMatch) {
      let phone = phoneMatch[1].replace(/[\s+-]/g, '');
      info.phone = phone.slice(-10);
    }
    if (emailMatch) info.email = emailMatch[1].trim();
    
    if (info.name || info.phone || info.email) {
      return info;
    }

    // Original patterns
    const namePatterns = [
      /(?:my name is|i am|i'm|this is)\s+([a-zA-Z\s]+?)(?:\s|,|\.|\band\b)/i,
      /(?:name|naam|নাম|नाम)[\s:]+([a-zA-Z\s]+?)(?:\s|,|\.|\band\b)/i
    ];

    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        info.name = match[1].trim();
        break;
      }
    }

    // Phone patterns
    const phonePatterns = [
      /(?:\+?91[\s-]?)?([6-9]\d{9})(?!\d)/,
      /(?:phone|mobile|contact|number|tel|ph)[\s:]*(\+?91?[\s-]?[6-9]\d{9})/i,
    ];

    for (const pattern of phonePatterns) {
      const match = message.match(pattern);
      if (match) {
        let phone = match[1] || match[0];
        phone = phone.replace(/[\s+-]/g, '');
        if (phone.length >= 10) {
          info.phone = phone.slice(-10);
          break;
        }
      }
    }

    // Email pattern
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch3 = message.match(emailPattern);
    if (emailMatch3) {
      info.email = emailMatch3[0];
    }

    return info;
  }

  /**
   * ✅ NEW: Create or update lead (avoid duplicates)
   */
  async createOrUpdateLead(sessionId, contactInfo, message, appointmentTime) {
    // Check if lead already exists for this session
    const existingLead = await prisma.lead.findFirst({
      where: {
        OR: [
          { description: { contains: sessionId } },
          { phone: contactInfo.phone },
          { email: contactInfo.email }
        ]
      }
    });

    const leadData = {
      name: contactInfo.name || contactInfo.email?.split('@')[0] || 'Chat Lead',
      email: contactInfo.email || null,
      phone: contactInfo.phone || null,
      projectType: 'renovation',
      description: `Session: ${sessionId} | Latest message: ${message}`,
      source: 'chatbot'
    };

    // ✅ Add callbackTime if appointment exists
    if (appointmentTime && appointmentTime.dateTime) {
      leadData.callbackTime = new Date(appointmentTime.dateTime);
      console.log('✅ [Lead] Setting callbackTime:', leadData.callbackTime);
    }

    if (existingLead) {
      console.log('🔄 [Lead] Updating existing lead:', existingLead.id);
      
      // Update existing lead
      await axios.put(
        `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/leads/${existingLead.id}`,
        leadData
      );
    } else {
      console.log('🆕 [Lead] Creating new lead');
      
      // Create new lead
      await axios.post(
        `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/leads`,
        leadData
      );
    }
  }

  detectLead(message) {
    const leadKeywords = [
      'quote', 'estimate', 'price', 'cost', 'renovation',
      'repair', 'construction', 'contact', 'call', 'email',
      'project', 'interested', 'need', 'want', 'looking for',
      'budget', 'consultation', 'visit', 'schedule',
      'উদ্ধৃতি', 'মূল্য', 'খরচ', 'সংস্কার', 'যোগাযোগ',
      'उद्धरण', 'मूल्य', 'लागत', 'नवीकरण', 'संपर्क'
    ];

    const lowerMessage = message.toLowerCase();
    return leadKeywords.some(keyword =>
      lowerMessage.includes(keyword.toLowerCase())
    );
  }

  async sendNotifications(data) {
    const { message, contactInfo, sessionId, language, appointmentTime } = data;

    const leadData = {
      name: contactInfo.name || contactInfo.email?.split('@')[0] || 'Chat Lead',
      email: contactInfo.email || null,
      phone: contactInfo.phone || null,
      projectType: 'renovation',
      description: message,
      createdAt: new Date(),
      appointmentTime: appointmentTime || null
    };

    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        const telegramMessage = this.formatTelegramMessage(
          message,
          contactInfo,
          sessionId,
          language,
          appointmentTime
        );
        await this.sendTelegramNotification(telegramMessage);
        console.log('✅ Telegram notification sent');
      } catch (error) {
        console.error('❌ Telegram notification failed:', error.message);
      }
    } else {
      console.warn('⚠️ Telegram credentials not configured');
    }

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const result = await emailService.sendLeadNotification(leadData);
        if (result.success) {
          console.log('✅ Email notification sent');
        } else {
          console.error('❌ Email notification failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Email notification failed:', error.message);
      }
    } else {
      console.warn('⚠️ Email credentials not configured');
    }
  }

  formatTelegramMessage(message, contactInfo, sessionId, language, appointmentTime) {
    let text = '🚨 <b>NEW LEAD ALERT - Estate Contractor</b>\n\n';
    
    text += '👤 <b>CONTACT INFORMATION</b>\n';
    if (contactInfo.name) {
      text += `   Name: ${contactInfo.name}\n`;
    }
    if (contactInfo.phone) {
      text += `   📞 Phone: ${contactInfo.phone}\n`;
    }
    if (contactInfo.email) {
      text += `   📧 Email: ${contactInfo.email}\n`;
    }
    
    if (appointmentTime && appointmentTime.formatted) {
      text += `\n📅 <b>APPOINTMENT REQUESTED</b>\n`;
      text += `   ${appointmentTime.formatted}\n`;
    }
    
    text += `\n💬 <b>MESSAGE</b>\n${message}\n`;
    text += `\n📊 <b>DETAILS</b>\n`;
    text += `   Language: ${language.toUpperCase()}\n`;
    text += `   Session: ${sessionId.substring(0, 20)}...\n`;
    text += `   Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;
    text += `\n⚡ <b>ACTION:</b> Contact within 1 hour for best conversion!`;

    return text;
  }

  async sendTelegramNotification(text) {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    await axios.post(url, {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: 'HTML'
    });
  }

  async getChatHistory(req, res) {
    try {
      const { sessionId } = req.params;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const conversation = await prisma.conversation.findUnique({
        where: { sessionId }
      });

      if (!conversation) {
        return res.json({ messages: [] });
      }

      res.json({
        success: true,
        messages: conversation.messages,
        language: conversation.language
      });

    } catch (error) {
      console.error("❌ GetChatHistory error:", error);
      res.status(500).json({ error: 'Failed to get chat history' });
    }
  }

  async getFAQCategories(req, res) {
    try {
      const { language = 'en' } = req.query;
      
      const faqs = await faqService.getAllFAQs(language);
      
      const categories = {};
      faqs.forEach(faq => {
        if (!categories[faq.category]) {
          categories[faq.category] = [];
        }
        categories[faq.category].push({
          id: faq.id,
          question: faq.question,
          answer: faq.answer
        });
      });

      res.json({
        language,
        categories,
        totalFAQs: faqs.length
      });
    } catch (error) {
      console.error('❌ Get FAQ categories error:', error);
      res.status(500).json({ error: 'Failed to get FAQ categories' });
    }
  }
}

module.exports = new ChatController();