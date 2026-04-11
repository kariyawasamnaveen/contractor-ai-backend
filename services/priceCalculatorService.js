class PriceCalculatorService {
  constructor() {
    // Price ranges in Indian Rupees (₹)
    this.priceRules = {
      kitchen: {
        min: 50000,
        max: 200000,
        perSqft: 800,
        description: 'Kitchen Renovation'
      },
      bathroom: {
        min: 30000,
        max: 150000,
        perSqft: 600,
        description: 'Bathroom Renovation'
      },
      bedroom: {
        min: 40000,
        max: 180000,
        perSqft: 500,
        description: 'Bedroom Renovation'
      },
      living_room: {
        min: 60000,
        max: 250000,
        perSqft: 700,
        description: 'Living Room Renovation'
      },
      full_house: {
        min: 300000,
        max: 2000000,
        perSqft: 600,
        description: 'Full House Renovation'
      },
      painting: {
        min: 10000,
        max: 100000,
        perSqft: 50,
        description: 'Painting Work'
      },
      flooring: {
        min: 25000,
        max: 200000,
        perSqft: 200,
        description: 'Flooring Work'
      },
      plumbing: {
        min: 5000,
        max: 50000,
        perSqft: 100,
        description: 'Plumbing Work'
      },
      electrical: {
        min: 8000,
        max: 80000,
        perSqft: 150,
        description: 'Electrical Work'
      }
    };
  }

  /**
   * Detect project type from message
   */
  detectProjectType(message) {
    const lowerMessage = message.toLowerCase();
    
    const projectPatterns = {
      kitchen: ['kitchen', 'रसोई', 'রান্নাঘর'],
      bathroom: ['bathroom', 'toilet', 'washroom', 'बाथरूम', 'বাথরুম'],
      bedroom: ['bedroom', 'बेडरूम', 'শোবার ঘর'],
      living_room: ['living room', 'hall', 'drawing room', 'लिविंग रूम', 'বৈঠকখানা'],
      full_house: ['full house', 'entire house', 'complete house', 'whole house', 'पूरा घर', 'সম্পূর্ণ বাড়ি'],
      painting: ['paint', 'painting', 'पेंटिंग', 'রং'],
      flooring: ['floor', 'flooring', 'tile', 'marble', 'फर्श', 'মেঝে'],
      plumbing: ['plumbing', 'pipe', 'water', 'प्लंबिंग', 'প্লাম্বিং'],
      electrical: ['electrical', 'wiring', 'light', 'बिजली', 'বিদ্যুৎ']
    };

    for (const [type, keywords] of Object.entries(projectPatterns)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return type;
      }
    }

    return 'full_house'; // Default
  }

  /**
   * Extract size/area from message
   */
  extractSize(message) {
    // Match patterns like: 200 sqft, 200 sq ft, 200 square feet
    const sizePatterns = [
      /(\d+)\s*(?:sq\.?\s*ft|square\s*feet|sqft)/i,
      /(\d+)\s*(?:वर्ग फुट|sq|स्क्वायर)/i,
      /(\d+)\s*(?:বর্গ ফুট)/i
    ];

    for (const pattern of sizePatterns) {
      const match = message.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }

    return null;
  }

  /**
   * Calculate estimated price
   */
  calculatePrice(projectType, size = null) {
    const rules = this.priceRules[projectType];
    
    if (!rules) {
      return null;
    }

    let estimatedPrice;
    
    if (size) {
      // Calculate based on size
      estimatedPrice = size * rules.perSqft;
      // Ensure within min-max range
      estimatedPrice = Math.max(rules.min, Math.min(estimatedPrice, rules.max));
    } else {
      // Use average of min and max
      estimatedPrice = (rules.min + rules.max) / 2;
    }

    return {
      projectType: rules.description,
      size: size,
      estimatedPrice: Math.round(estimatedPrice),
      minPrice: rules.min,
      maxPrice: rules.max,
      pricePerSqft: rules.perSqft,
      breakdown: this.getBreakdown(estimatedPrice)
    };
  }

  /**
   * Get price breakdown
   */
  getBreakdown(totalPrice) {
    return {
      materials: Math.round(totalPrice * 0.45),
      labor: Math.round(totalPrice * 0.35),
      overhead: Math.round(totalPrice * 0.20)
    };
  }

  /**
   * Format price in Indian format (₹1,50,000)
   */
  formatPrice(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Generate price estimate message
   */
  generateEstimateMessage(estimate) {
    if (!estimate) {
      return 'I need more details about your project to provide an accurate estimate. Could you tell me the project type and approximate size?';
    }

    let message = `📊 **Price Estimate for ${estimate.projectType}**\n\n`;
    
    if (estimate.size) {
      message += `📐 Size: ${estimate.size} sq.ft\n`;
      message += `💰 Rate: ${this.formatPrice(estimate.pricePerSqft)}/sq.ft\n\n`;
    }

    message += `💵 **Estimated Cost: ${this.formatPrice(estimate.estimatedPrice)}**\n\n`;
    message += `📉 Price Range: ${this.formatPrice(estimate.minPrice)} - ${this.formatPrice(estimate.maxPrice)}\n\n`;
    
    message += `📋 **Cost Breakdown:**\n`;
    message += `• Materials: ${this.formatPrice(estimate.breakdown.materials)} (45%)\n`;
    message += `• Labor: ${this.formatPrice(estimate.breakdown.labor)} (35%)\n`;
    message += `• Overhead & Profit: ${this.formatPrice(estimate.breakdown.overhead)} (20%)\n\n`;
    
    message += `⚠️ *Note: This is an approximate estimate. Final cost may vary based on materials, design complexity, and site conditions.*\n\n`;
    message += `📞 For a detailed quote, please share your contact details or schedule a free consultation!`;

    return message;
  }

  /**
   * Main function to process price request
   */
  processPriceRequest(message) {
    const projectType = this.detectProjectType(message);
    const size = this.extractSize(message);
    const estimate = this.calculatePrice(projectType, size);
    
    return {
      success: true,
      estimate: estimate,
      message: this.generateEstimateMessage(estimate)
    };
  }
}

module.exports = new PriceCalculatorService();
