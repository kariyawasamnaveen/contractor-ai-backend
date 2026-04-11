const faqService = require('../services/faqService');

async function testFAQSystem() {
  console.log('🧪 Testing FAQ System...\n');

  // Test 1: English search
  console.log('Test 1: English - "What services do you offer?"');
  const result1 = await faqService.findBestMatch('What services do you offer?', 'en');
  console.log('Match found:', result1.found);
  if (result1.found) {
    console.log('Answer:', result1.faq.answer.substring(0, 100) + '...\n');
  }

  // Test 2: Bengali search
  console.log('Test 2: Bengali - "আপনারা কি কি সেবা প্রদান করেন?"');
  const result2 = await faqService.findBestMatch('আপনারা কি কি সেবা প্রদান করেন?', 'bn');
  console.log('Match found:', result2.found);
  if (result2.found) {
    console.log('Answer:', result2.faq.answer.substring(0, 100) + '...\n');
  }

  // Test 3: Hindi search
  console.log('Test 3: Hindi - "आप कौन सी सेवाएं प्रदान करते हैं?"');
  const result3 = await faqService.findBestMatch('आप कौन सी सेवाएं प्रदान करते हैं?', 'hi');
  console.log('Match found:', result3.found);
  if (result3.found) {
    console.log('Answer:', result3.faq.answer.substring(0, 100) + '...\n');
  }

  // Test 4: Keyword search
  console.log('Test 4: Keyword search - "emergency repair"');
  const result4 = await faqService.findBestMatch('I need emergency repair', 'en');
  console.log('Match found:', result4.found);
  if (result4.found) {
    console.log('Category:', result4.faq.category);
    console.log('Answer:', result4.faq.answer.substring(0, 100) + '...\n');
  }

  // Test 5: Get all FAQs
  console.log('Test 5: Get all English FAQs');
  const allFAQs = await faqService.getAllFAQs('en');
  console.log(`Total FAQs: ${allFAQs.length}`);
  
  console.log('\n✅ All tests completed!');
  process.exit(0);
}

testFAQSystem().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});