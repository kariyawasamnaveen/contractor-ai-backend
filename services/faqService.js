const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class FAQService {
  /**
   * Search FAQs based on user query
   * @param {string} query - User's question
   * @param {string} language - Language code (en, bn, hi)
   * @returns {Array} Matching FAQs
   */
  async searchFAQs(query, language = 'en') {
    try {
      // Search in both question and answer fields
      const faqs = await prisma.fAQ.findMany({
        where: {
          AND: [
            {
              OR: [
                { question: { contains: query, mode: 'insensitive' } },
                { answer: { contains: query, mode: 'insensitive' } },
              ],
            },
            { language }
          ]
        },
        take: 5, // Return top 5 matches
      });

      return faqs;
    } catch (error) {
      console.error('❌ FAQ search error:', error);
      return [];
    }
  }

  /**
   * Search by keywords (better matching)
   * @param {string} query - User's question
   * @param {string} language - Language code
   * @returns {Array} Best matching FAQs
   */
  async searchByKeywords(query, language = 'en') {
    try {
      // Extract keywords from query
      const keywords = this.extractKeywords(query, language);
      
      if (keywords.length === 0) {
        return [];
      }

      // Search for each keyword
      const results = [];
      for (const keyword of keywords) {
        const faqs = await this.searchFAQs(keyword, language);
        results.push(...faqs);
      }

      // Remove duplicates and rank by relevance
      const uniqueFAQs = this.removeDuplicates(results);
      return uniqueFAQs.slice(0, 3); // Return top 3
      
    } catch (error) {
      console.error('❌ Keyword search error:', error);
      return [];
    }
  }

  /**
   * Extract important keywords from user query
   */
  extractKeywords(query, language) {
    const lowerQuery = query.toLowerCase();

    // English keywords
    const enKeywords = {
      'services': ['service', 'offer', 'provide', 'do'],
      'pricing': ['price', 'cost', 'quote', 'estimate', 'budget', 'pay'],
      'emergency': ['emergency', 'urgent', 'immediate', 'quick'],
      'consultation': ['consultation', 'visit', 'meeting', 'discuss'],
      'renovation': ['renovation', 'remodel', 'construction', 'building'],
      'repair': ['repair', 'fix', 'broken', 'damage'],
      'kitchen': ['kitchen'],
      'bathroom': ['bathroom'],
      'plumbing': ['plumbing', 'pipe', 'water', 'leak'],
      'electrical': ['electrical', 'electric', 'wiring', 'power'],
    };

    // Bengali keywords
    const bnKeywords = {
      'services': ['সেবা', 'প্রদান'],
      'pricing': ['মূল্য', 'খরচ', 'উদ্ধৃতি'],
      'emergency': ['জরুরি', 'তাৎক্ষণিক'],
      'consultation': ['পরামর্শ'],
      'renovation': ['সংস্কার', 'নির্মাণ'],
    };

    // Hindi keywords
    const hiKeywords = {
      'services': ['सेवा', 'सेवाएं'],
      'pricing': ['मूल्य', 'लागत', 'उद्धरण'],
      'emergency': ['आपातकाल', 'तत्काल'],
      'consultation': ['परामर्श'],
      'renovation': ['नवीकरण', 'निर्माण'],
    };

    const keywordMap = {
      'en': enKeywords,
      'bn': bnKeywords,
      'hi': hiKeywords,
    };

    const keywords = [];
    const languageKeywords = keywordMap[language] || enKeywords;

    // Check which categories match
    for (const [category, terms] of Object.entries(languageKeywords)) {
      for (const term of terms) {
        if (lowerQuery.includes(term)) {
          keywords.push(category);
          break;
        }
      }
    }

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Remove duplicate FAQs
   */
  removeDuplicates(faqs) {
    const seen = new Set();
    return faqs.filter(faq => {
      if (seen.has(faq.id)) {
        return false;
      }
      seen.add(faq.id);
      return true;
    });
  }

  /**
   * Get all FAQs by language
   * @param {string} language - Language code
   * @returns {Array} All FAQs
   */
  async getAllFAQs(language = 'en') {
    try {
      return await prisma.fAQ.findMany({
        where: { language },
        orderBy: { category: 'asc' },
      });
    } catch (error) {
      console.error('❌ Get all FAQs error:', error);
      return [];
    }
  }

  /**
   * Get FAQs by category
   * @param {string} category - Category name
   * @param {string} language - Language code
   * @returns {Array} FAQs in category
   */
  async getFAQsByCategory(category, language = 'en') {
    try {
      return await prisma.fAQ.findMany({
        where: { 
          category,
          language 
        },
      });
    } catch (error) {
      console.error('❌ Get FAQs by category error:', error);
      return [];
    }
  }

  /**
   * Check if user query matches an FAQ
   * Returns best matching FAQ or null
   */
  async findBestMatch(userMessage, language = 'en') {
    try {
      // Try keyword search first
      const results = await this.searchByKeywords(userMessage, language);
      
      if (results.length > 0) {
        return {
          found: true,
          faq: results[0], // Return best match
          allMatches: results
        };
      }

      // Fallback to general search
      const generalResults = await this.searchFAQs(userMessage, language);
      
      if (generalResults.length > 0) {
        return {
          found: true,
          faq: generalResults[0],
          allMatches: generalResults
        };
      }

      return {
        found: false,
        faq: null,
        allMatches: []
      };
      
    } catch (error) {
      console.error('❌ Find best match error:', error);
      return {
        found: false,
        faq: null,
        allMatches: []
      };
    }
  }
}

module.exports = new FAQService();