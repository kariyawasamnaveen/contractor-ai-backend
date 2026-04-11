require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function testCalendar() {
  try {
    console.log('1. Loading credentials...');
    const keyPath = path.join(__dirname, 'config/google-calendar-key.json');
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    console.log('   Service Account:', keyFile.client_email);
    
    console.log('\n2. Authenticating...');
    const auth = new google.auth.GoogleAuth({
      credentials: keyFile,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    const authClient = await auth.getClient();
    console.log('   ✅ Authenticated');
    
    console.log('\n3. Creating event...');
    const calendar = google.calendar({ version: 'v3' });
    
    const event = {
      summary: 'DEBUG TEST - Estate Contractor',
      description: 'Testing calendar integration',
      start: {
        dateTime: new Date(Date.now() + 600000).toISOString(),
        timeZone: 'Asia/Colombo',
      },
      end: {
        dateTime: new Date(Date.now() + 630000).toISOString(),
        timeZone: 'Asia/Colombo',
      },
    };
    
    // Try YOUR email first
    const calendarId = 'hknskariyawasamnaveen@gmail.com';
    console.log('   Target Calendar:', calendarId);
    
    const response = await calendar.events.insert({
      auth: authClient,
      calendarId: calendarId,
      resource: event,
    });
    
    console.log('\n✅ SUCCESS!');
    console.log('Event ID:', response.data.id);
    console.log('Event Link:', response.data.htmlLink);
    console.log('\nCheck your calendar now!');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.code === 404) {
      console.log('\n⚠️  Calendar not found or service account has no access!');
      console.log('Solution: Share YOUR calendar with service account:');
      console.log('   estate-chatbot@estate-contractor-chatbot.iam.gserviceaccount.com');
    }
  }
}

testCalendar();