const { ChatOpenAI } = require('@langchain/openai');
const faqService = require('./faqService');
const dateParserService = require('./dateParserService');
const priceCalculatorService = require('./priceCalculatorService');
const { PERSONALITY_LAYER, GREETING_VARIATIONS } = require('../config/ai-config'); // ✅ NEW IMPORT

class AIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY is missing in .env file");
    }

    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o',
      temperature: 0.9, // ✅ INCREASED for more natural/varied responses
    });
  }

  /**
   * Detect language from user message
   */
  detectLanguage(text) {
    const bengaliPattern = /[\u0980-\u09FF]/;
    const hindiPattern = /[\u0900-\u097F]/;
    
    if (bengaliPattern.test(text)) return 'bn';
    if (hindiPattern.test(text)) return 'hi';
    return 'en';
  }

  /**
   * Detect if message is URGENT (needs immediate attention)
   */
  detectUrgency(message) {
    const urgentKeywords = [
      'urgent', 'emergency', 'immediately', 'asap', 'right now',
      'leaking', 'leak', 'water damage', 'flooding', 'broken',
      'help', 'quickly', 'fast', 'soon', 'critical',
      // Bengali
      'জরুরি', 'তাৎক্ষণিক', 'দ্রুত',
      // Hindi
      'तुरंत', 'आपातकाल', 'जल्दी'
    ];
    
    const lowerMessage = message.toLowerCase();
    return urgentKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * ✅ NEW: Check if message is a greeting
   */
  isGreeting(message) {
    const greetings = ['hi', 'hello', 'hey', 'hola', 'namaste', 'হাই', 'হ্যালো', 'नमस्ते', 'हैलो'];
    const lowerMessage = message.toLowerCase().trim();
    return greetings.some(greeting => lowerMessage === greeting || lowerMessage.startsWith(greeting + ' '));
  }

  /**
   * ✅ NEW: Get random greeting for variety
   */
  getRandomGreeting() {
    return GREETING_VARIATIONS[Math.floor(Math.random() * GREETING_VARIATIONS.length)];
  }

  /**
   * Main message processing with intelligent routing
   */
  async processMessage(userMessage, chatHistory = [], language = 'en') {
    try {
      // Auto-detect language if not provided
      if (!language || language === 'en') {
        language = this.detectLanguage(userMessage);
      }

      console.log(`\n📝 Processing message in ${language}: "${userMessage}"`);

      // ✅ NEW: Handle first-time greetings with personality
      if (chatHistory.length === 0 && this.isGreeting(userMessage)) {
        console.log('👋 First-time greeting detected - using personalized response');
        return this.getRandomGreeting();
      }

      // Step 1: Check for date/time intent (Calendar booking)
      if (dateParserService.hasDateTimeIntent(userMessage)) {
        const dateInfo = dateParserService.extractDateTime(userMessage);
        if (dateInfo && dateInfo.success) {
          console.log('📅 Date/time detected:', dateInfo.formatted);
          // AI will handle the response, we just log it
        }
      }

      // ✅ MODIFIED: Check for price intent but let AI handle conversationally
      const priceKeywords = ['price', 'cost', 'quote', 'estimate', 'budget', 'मूल्य', 'लागत', 'উদ্ধৃতি', 'খরচ'];
      const hasPriceIntent = priceKeywords.some(keyword => 
        userMessage.toLowerCase().includes(keyword)
      );

      if (hasPriceIntent) {
        console.log('💰 Price request detected - letting AI handle conversationally');
        // ✅ DON'T use priceCalculatorService - let AI ask questions naturally
        const response = await this.generateAIResponse(userMessage, chatHistory, language);
        return response;
      }

      // Step 3: Check for URGENT keywords
      const isUrgent = this.detectUrgency(userMessage);

      if (isUrgent) {
        console.log('🚨 URGENT case detected - bypassing FAQ for personalized response');
        const response = await this.generateAIResponse(userMessage, chatHistory, language);
        return response;
      }

      // Step 4: Check if message matches any FAQ
      const faqMatch = await faqService.findBestMatch(userMessage, language);

      if (faqMatch.found) {
        console.log('✅ FAQ MATCH FOUND!');
        console.log('   Question:', faqMatch.faq.question);
        console.log('   Returning FAQ answer directly\n');
        
        // Add follow-up CTA to FAQ answer
        return this.enhanceFAQAnswer(faqMatch.faq.answer, language);
      }

      console.log('ℹ️  No FAQ match found - using AI generation\n');

      // Step 5: No FAQ match - use AI
      const response = await this.generateAIResponse(
        userMessage, 
        chatHistory, 
        language
      );

      return response;

    } catch (error) {
      console.error('❌ AI Service Error:', error);
      return this.getErrorMessage(language);
    }
  }

  /**
   * Enhance FAQ answer with CTA
   */
  enhanceFAQAnswer(faqAnswer, language) {
    const ctas = {
      'en': '\n\n💬 Have more questions? I\'m here to help!\n📞 Call us: 62891 37586 | WhatsApp: +91 6289137586',
      'bn': '\n\n💬 আরও প্রশ্ন আছে? আমি সাহায্য করতে এখানে আছি!\n📞 কল করুন: 62891 37586 | WhatsApp: +91 6289137586',
      'hi': '\n\n💬 और सवाल हैं? मैं मदद के लिए यहाँ हूँ!\n📞 कॉल करें: 62891 37586 | WhatsApp: +91 6289137586'
    };

    return faqAnswer + (ctas[language] || ctas['en']);
  }

  /**
   * Generate AI response with Estate Contractor context
   */
  async generateAIResponse(userMessage, chatHistory, language) {
    try {
      const chatHistoryText = chatHistory
        .slice(-6) // ✅ Increased to 6 for better context
        .map(msg => {
          if (msg.role && msg.content) {
            return `${msg.role}: ${msg.content}`;
          }
          if (msg.message && msg.response) {
            return `User: ${msg.message}\nBot: ${msg.response}`;
          }
          return '';
        })
        .filter(msg => msg)
        .join('\n');

      const systemPrompt = this.getSystemPrompt(language);
      
      // ✅ NEW: Add conversation context
      const conversationStage = chatHistory.length === 0 
        ? 'First interaction - be welcoming' 
        : `Ongoing conversation (${chatHistory.length} messages) - continue naturally`;
      
      const prompt = `${systemPrompt}

Chat History:
${chatHistoryText}

Conversation Context: ${conversationStage}

User Message: ${userMessage}

Instructions:
- Respond in ${this.getLanguageName(language)}
- Keep response SHORT (2-3 sentences, max 40 words)
- Ask ONE follow-up question
- Be conversational and natural
- If discussing price, ask about scope BEFORE giving estimate
- If they're ready for consultation, collect: name → phone → email → appointment time (ONE at a time!)

Response:`;

      const response = await this.llm.invoke(prompt);

      if (response && response.content) {
        return typeof response.content === "string"
          ? response.content
          : response.content.map(c => c.text || c).join(" ");
      }

      return this.getFallbackMessage(language);
      
    } catch (error) {
      console.error('❌ Generate AI response error:', error);
      throw error;
    }
  }

  /**
   * ✅ UPDATED: Get Estate Contractor specific system prompt WITH PERSONALITY
   */
  getSystemPrompt(language) {
    const prompts = {
      'en': `${PERSONALITY_LAYER}

🏢 COMPANY INFORMATION:
- Company: Estate Contractor
- Location: Ballygunge, Kolkata, West Bengal 700019
- Experience: 5+ years, 500+ projects completed
- Target Market: Middle-class families in Kolkata
- USP: Affordable + Eco-friendly + All services under one roof
- Contact: 📞 62891 37586 | WhatsApp: +91 6289137586
- Email: iestatecontractor2@gmail.com

🛠️ SERVICES WE OFFER:

1. HOME INTERIORS:
   - Bedroom Interior Design (Custom wardrobes, bedside tables, lighting)
   - Bathroom Remodeling (4 styles: Spa-like, Modern, Vintage, Minimalist)
   - Modular Kitchen (L-shaped, U-shaped, Parallel, Island designs)
   - Living Room Decoration
   - Tiling & Flooring (Ceramic, Porcelain, Marble, Granite, Wood, Laminate)
   - False Ceiling (POP/Gypsum)
   - Wall Painting (Interior, Exterior, Texture, 3D art)

2. BUILDING RENOVATION:
   - Building Repair (Structural, wall cracks, foundation)
   - Building Waterproofing ⭐ TOP PRIORITY
     * 6 Methods: Bituminous, Cementitious, Liquid Membrane, Acrylic, PVC, Polyurethane
     * Critical for Kolkata's monsoon season
   - Building Painting (Climate-resistant)

3. TECHNICAL SERVICES:
   - Electrical Wiring
   - Plumbing Services

4. DESIGN SERVICES:
   - FREE Consultation (Always emphasize this!)
   - Space Planning
   - Material Selection
   - Color Consultation

💰 PRICING GUIDE (Use conversationally, NOT as data dump):
- Bathroom Renovation: ₹50,000 - ₹2,00,000
- Modular Kitchen: ₹40,000 - ₹1,50,000
- Bedroom Interior: ₹30,000 - ₹1,00,000
- Waterproofing: ₹10,000 - ₹50,000
- Wall Painting: ₹5,000 - ₹30,000
- Flooring: ₹20,000 - ₹80,000

IMPORTANT: When asked about price, FIRST ask about:
1. Size/area
2. Scope of work
3. Materials preference
THEN give a range, THEN offer FREE consultation

🌧️ KOLKATA CONTEXT (CRITICAL):
- Heavy monsoon season: June-September
- High humidity year-round
- Common problems: Roof leaks, wall dampness, mold, paint peeling
- WATERPROOFING is the #1 priority service
- Anti-slip tiles essential for bathrooms
- Weather-resistant materials crucial

Remember: You represent Estate Contractor's values - Affordable, Professional, Eco-friendly, Customer-centric.`,

      'bn': `${PERSONALITY_LAYER}

আপনি Estate Contractor এর Priya, যা বালিগঞ্জ, কলকাতায় অবস্থিত একটি বিশ্বস্ত ইন্টেরিয়র ডিজাইন এবং হোম রেনোভেশন কোম্পানি।

🏢 কোম্পানি তথ্য:
- অবস্থান: বালিগঞ্জ, কলকাতা
- অভিজ্ঞতা: ৫+ বছর, ৫০০+ প্রকল্প সম্পন্ন
- যোগাযোগ: 📞 62891 37586 | WhatsApp: +91 6289137586

আপনার ভূমিকা:
- গ্রাহকদের সঠিক renovation সেবা খুঁজে পেতে সাহায্য করুন
- স্বাভাবিক কথোপকথন করুন, ডেটা ডাম্প নয়
- একবারে একটি প্রশ্ন জিজ্ঞাসা করুন
- বিনামূল্যে পরামর্শ সবসময় উল্লেখ করুন
- নাম → ফোন → ইমেইল → অ্যাপয়েন্টমেন্ট সংগ্রহ করুন
- উষ্ণ ও বন্ধুত্বপূর্ণ থাকুন`,

      'hi': `${PERSONALITY_LAYER}

आप Estate Contractor की Priya हैं, जो बालीगंज, कोलकाता में स्थित एक विश्वसनीय इंटीरियर डिज़ाइन और होम रेनोवेशन कंपनी है।

🏢 कंपनी जानकारी:
- स्थान: बालीगंज, कोलकाता
- अनुभव: 5+ वर्ष, 500+ परियोजनाएँ पूर्ण
- संपर्क: 📞 62891 37586 | WhatsApp: +91 6289137586

आपकी भूमिका:
- ग्राहकों को सही renovation सेवाएँ खोजने में मदद करें
- प्राकृतिक बातचीत करें, डेटा डंप नहीं
- एक समय में एक प्रश्न पूछें
- हमेशा मुफ्त परामर्श का उल्लेख करें
- नाम → फोन → ईमेल → अपॉइंटमेंट एकत्र करें
- गर्मजोशी और मित्रवत रहें`
    };

    return prompts[language] || prompts['en'];
  }

  /**
   * Analyze image using GPT-4 Vision
   */
  async analyzeImage(imageUrl) {
    try {
      console.log('🖼️ Analyzing image with GPT-4 Vision...');

      // Convert Cloudinary URL to base64
      const axios = require('axios');
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64');
      const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';
      const base64DataUrl = `data:${mimeType};base64,${base64Image}`;

      const analysisPrompt = `You are Priya from Estate Contractor, analyzing a photo for a customer in Kolkata.

ANALYZE THIS IMAGE:
1. Identify the space type (bathroom/kitchen/bedroom/exterior/roof/walls)
2. Detect visible problems (water damage, cracks, old fixtures, dampness, wear, etc.)
3. Recommend appropriate services

Be warm, friendly, and conversational (2-3 sentences max).

DETECTION PATTERNS:
- Water stains/dampness/mold → URGENT WATERPROOFING (₹10,000-₹50,000)
- Old bathroom → Bathroom Renovation (₹50,000-₹2,00,000)
- Wall cracks → Building Repair URGENT (₹15,000-₹50,000)
- Old kitchen → Modular Kitchen (₹40,000-₹1,50,000)
- Peeling paint → Wall Painting (₹5,000-₹30,000)

FORMAT YOUR RESPONSE (keep it friendly and short):
**What I See:** [Brief description in 1 sentence]
**My Recommendation:** [Service + why in 1 sentence]
**Rough Cost:** [Range]
**Next Step:** Want a FREE site visit for exact quote?

Keep it conversational!`;

      const response = await this.llm.invoke([
        {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            { 
              type: "image_url", 
              image_url: { 
                url: base64DataUrl 
              } 
            }
          ]
        }
      ]);

      console.log('✅ Image analysis successful');
      return response.content || "Photo analyzed. Our expert will provide detailed recommendations.";

    } catch (error) {
      console.error('❌ Image analysis error:', error.message);
      
      // Fallback if GPT-4 Vision fails
      return `📸 **Thanks for sharing the photo!**

I can see it, but let me get you a detailed analysis. Can you describe what you need help with? That way I can guide you better! 😊

Or want to schedule a FREE site visit? Our team can give you an exact assessment.

📞 **Contact:** 62891 37586

What would you prefer?`;
    }
  }

  /**
   * Get language name for prompts
   */
  getLanguageName(code) {
    const languages = {
      'en': 'English',
      'bn': 'Bengali (বাংলা)',
      'hi': 'Hindi (हिंदी)'
    };
    return languages[code] || 'English';
  }

  /**
   * Get fallback message when AI fails
   */
  getFallbackMessage(language) {
    const messages = {
      'en': "I'm here to help! Could you rephrase that? Or call us at 📞 62891 37586",
      'bn': "আমি সাহায্য করতে এখানে আছি। আপনি কি আবার বলতে পারেন? অথবা কল করুন 📞 62891 37586",
      'hi': "मैं मदद के लिए यहाँ हूँ। क्या आप फिर से पूछ सकते हैं? या कॉल करें 📞 62891 37586"
    };
    return messages[language] || messages['en'];
  }

  /**
   * Get error message in appropriate language
   */
  getErrorMessage(language) {
    const messages = {
      'en': "Oops! Technical hiccup on my end 😅 Can you try again? Or call us at 📞 62891 37586",
      'bn': "ওহ! আমার একটু সমস্যা হচ্ছে 😅 আবার চেষ্টা করুন? অথবা কল করুন 📞 62891 37586",
      'hi': "उफ़! मुझे तकनीकी समस्या हो रही है 😅 फिर से कोशिश करें? या कॉल करें 📞 62891 37586"
    };
    return messages[language] || messages['en'];
  }
}

module.exports = new AIService();