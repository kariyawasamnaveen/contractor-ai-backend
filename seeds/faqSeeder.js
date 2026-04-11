const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const faqData = [
  // ========== ENGLISH FAQs ==========
  {
    question: "What services does Estate Contractor provide?",
    answer: "We provide complete home renovation services including kitchen remodeling, bathroom renovation, flooring, painting, plumbing, electrical work, roofing, and general construction projects. We handle everything from small repairs to complete home makeovers.",
    category: "services",
    language: "en"
  },
  {
    question: "How do I get a quote for my project?",
    answer: "Getting a quote is easy! You can share your project details and photos through this chat, call us directly, or schedule a free consultation. We'll provide a detailed estimate within 24 hours after reviewing your requirements.",
    category: "pricing",
    language: "en"
  },
  {
    question: "Do you offer emergency repair services?",
    answer: "Yes! We provide 24/7 emergency repair services for urgent issues like plumbing leaks, electrical problems, or structural damage. Contact us immediately for emergency situations and we'll dispatch a team right away.",
    category: "emergency",
    language: "en"
  },
  {
    question: "What areas do you serve?",
    answer: "We serve the entire metropolitan area and surrounding regions. Contact us with your location and we'll confirm if we can help you with your project.",
    category: "service_area",
    language: "en"
  },
  {
    question: "How long does a typical renovation take?",
    answer: "Project timelines vary based on scope. Small repairs take 1-3 days, bathroom renovations typically take 2-3 weeks, kitchen remodels take 4-6 weeks, and full home renovations can take 2-4 months. We'll provide a detailed timeline with your quote.",
    category: "timeline",
    language: "en"
  },
  {
    question: "Do you provide free consultations?",
    answer: "Yes! We offer free initial consultations where we'll visit your property, assess your needs, discuss your vision, and provide preliminary advice. There's no obligation to proceed after the consultation.",
    category: "consultation",
    language: "en"
  },
  {
    question: "Are you licensed and insured?",
    answer: "Absolutely! Estate Contractor is fully licensed, bonded, and insured. All our workers are certified professionals, and we comply with all local building codes and regulations.",
    category: "credentials",
    language: "en"
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept cash, bank transfers, checks, and all major credit cards. For larger projects, we offer flexible payment plans with deposits and milestone payments.",
    category: "payment",
    language: "en"
  },

  // ========== BENGALI FAQs ==========
  {
    question: "এস্টেট কন্ট্রাক্টর কি কি সেবা প্রদান করে?",
    answer: "আমরা সম্পূর্ণ বাড়ি সংস্কার সেবা প্রদান করি যার মধ্যে রয়েছে রান্নাঘর পুনর্নির্মাণ, বাথরুম সংস্কার, মেঝে, পেইন্টিং, প্লাম্বিং, বৈদ্যুতিক কাজ, ছাদ এবং সাধারণ নির্মাণ প্রকল্প। ছোট মেরামত থেকে সম্পূর্ণ বাড়ি সংস্কার পর্যন্ত আমরা সবকিছু সামলাই।",
    category: "services",
    language: "bn"
  },
  {
    question: "আমি কিভাবে আমার প্রকল্পের জন্য একটি উদ্ধৃতি পেতে পারি?",
    answer: "উদ্ধৃতি পাওয়া সহজ! আপনি এই চ্যাটের মাধ্যমে আপনার প্রকল্পের বিবরণ এবং ফটো শেয়ার করতে পারেন, সরাসরি আমাদের কল করতে পারেন, অথবা একটি বিনামূল্যে পরামর্শ সময়সূচী করতে পারেন। আপনার প্রয়োজনীয়তা পর্যালোচনা করার পরে আমরা 24 ঘন্টার মধ্যে একটি বিস্তারিত অনুমান প্রদান করব।",
    category: "pricing",
    language: "bn"
  },
  {
    question: "আপনারা কি জরুরি মেরামত সেবা প্রদান করেন?",
    answer: "হ্যাঁ! আমরা জরুরি সমস্যা যেমন প্লাম্বিং লিক, বৈদ্যুতিক সমস্যা, বা কাঠামোগত ক্ষতির জন্য 24/7 জরুরি মেরামত সেবা প্রদান করি। জরুরি পরিস্থিতির জন্য অবিলম্বে আমাদের সাথে যোগাযোগ করুন এবং আমরা তাৎক্ষণিক একটি দল পাঠাব।",
    category: "emergency",
    language: "bn"
  },
  {
    question: "আপনারা কোন এলাকায় সেবা প্রদান করেন?",
    answer: "আমরা সম্পূর্ণ মেট্রোপলিটন এলাকা এবং আশেপাশের অঞ্চলে সেবা প্রদান করি। আপনার অবস্থান সহ আমাদের সাথে যোগাযোগ করুন এবং আমরা নিশ্চিত করব যে আমরা আপনার প্রকল্পে সহায়তা করতে পারি কিনা।",
    category: "service_area",
    language: "bn"
  },
  {
    question: "আপনারা কি বিনামূল্যে পরামর্শ প্রদান করেন?",
    answer: "হ্যাঁ! আমরা বিনামূল্যে প্রাথমিক পরামর্শ অফার করি যেখানে আমরা আপনার সম্পত্তি পরিদর্শন করব, আপনার চাহিদা মূল্যায়ন করব, আপনার দৃষ্টিভঙ্গি নিয়ে আলোচনা করব এবং প্রাথমিক পরামর্শ প্রদান করব। পরামর্শের পরে এগিয়ে যাওয়ার কোনো বাধ্যবাধকতা নেই।",
    category: "consultation",
    language: "bn"
  },

  // ========== HINDI FAQs ==========
  {
    question: "एस्टेट कॉन्ट्रैक्टर कौन सी सेवाएं प्रदान करता है?",
    answer: "हम पूर्ण घर नवीकरण सेवाएं प्रदान करते हैं जिनमें रसोई रीमॉडलिंग, बाथरूम नवीकरण, फ्लोरिंग, पेंटिंग, प्लंबिंग, इलेक्ट्रिकल कार्य, छत और सामान्य निर्माण परियोजनाएं शामिल हैं। हम छोटी मरम्मत से लेकर पूर्ण घर परिवर्तन तक सब कुछ संभालते हैं।",
    category: "services",
    language: "hi"
  },
  {
    question: "मैं अपनी परियोजना के लिए एक उद्धरण कैसे प्राप्त कर सकता हूं?",
    answer: "उद्धरण प्राप्त करना आसान है! आप इस चैट के माध्यम से अपनी परियोजना विवरण और फ़ोटो साझा कर सकते हैं, सीधे हमें कॉल कर सकते हैं, या एक मुफ्त परामर्श शेड्यूल कर सकते हैं। आपकी आवश्यकताओं की समीक्षा करने के बाद हम 24 घंटे के भीतर एक विस्तृत अनुमान प्रदान करेंगे।",
    category: "pricing",
    language: "hi"
  },
  {
    question: "क्या आप आपातकालीन मरम्मत सेवाएं प्रदान करते हैं?",
    answer: "हां! हम तत्काल समस्याओं जैसे प्लंबिंग लीक, बिजली की समस्याओं, या संरचनात्मक क्षति के लिए 24/7 आपातकालीन मरम्मत सेवाएं प्रदान करते हैं। आपातकालीन स्थितियों के लिए तुरंत हमसे संपर्क करें और हम तुरंत एक टीम भेजेंगे।",
    category: "emergency",
    language: "hi"
  },
  {
    question: "आप किन क्षेत्रों में सेवा प्रदान करते हैं?",
    answer: "हम संपूर्ण महानगरीय क्षेत्र और आसपास के क्षेत्रों में सेवा प्रदान करते हैं। अपने स्थान के साथ हमसे संपर्क करें और हम पुष्टि करेंगे कि क्या हम आपकी परियोजना में मदद कर सकते हैं।",
    category: "service_area",
    language: "hi"
  },
  {
    question: "क्या आप मुफ्त परामर्श प्रदान करते हैं?",
    answer: "हां! हम मुफ्त प्रारंभिक परामर्श प्रदान करते हैं जहां हम आपकी संपत्ति का दौरा करेंगे, आपकी जरूरतों का आकलन करेंगे, आपकी दृष्टि पर चर्चा करेंगे और प्रारंभिक सलाह प्रदान करेंगे। परामर्श के बाद आगे बढ़ने की कोई बाध्यता नहीं है।",
    category: "consultation",
    language: "hi"
  }
];

async function seedFAQs() {
  try {
    console.log('🌱 Starting FAQ seeding...');

    // Clear existing FAQs (optional)
    const deleteResult = await prisma.fAQ.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.count} existing FAQs`);

    // Insert new FAQs
    for (const faq of faqData) {
      await prisma.fAQ.create({ data: faq });
      console.log(`✅ Added: ${faq.question.substring(0, 50)}...`);
    }

    console.log(`\n🎉 Successfully seeded ${faqData.length} FAQs!`);
    console.log(`   📊 English: ${faqData.filter(f => f.language === 'en').length}`);
    console.log(`   📊 Bengali: ${faqData.filter(f => f.language === 'bn').length}`);
    console.log(`   📊 Hindi: ${faqData.filter(f => f.language === 'hi').length}`);

  } catch (error) {
    console.error('❌ Error seeding FAQs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedFAQs()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedFAQs, faqData };