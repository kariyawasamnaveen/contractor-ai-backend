// Estate Contractor Professional Chat Widget
const API_URL = window.location.origin;
let sessionId = generateSessionId();
let selectedPhotos = [];
let conversationHistory = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeChat();
  setupEventListeners();
  displayWelcomeMessage();
});

function initializeChat() {
  console.log('🏠 Estate Contractor Chat initialized');
  console.log('Session ID:', sessionId);
}

function setupEventListeners() {
  // Send message on Enter (but allow Shift+Enter for new line)
  const input = document.getElementById('messageInput');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    
    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = input.scrollHeight + 'px';
    });
  }
  
  // Photo upload
  const photoInput = document.getElementById('photoInput');
  if (photoInput) {
    photoInput.addEventListener('change', handlePhotoSelect);
  }
}

function displayWelcomeMessage() {
  const messagesContainer = document.getElementById('messagesContainer');
  
  const welcomeCard = `
    <div class="estate-welcome-card">
      <h3>👋 Welcome to Estate Contractor!</h3>
      <p>Hello! I'm your AI assistant for home renovation and waterproofing services in Kolkata. How can I help you today?</p>
      
      <div class="estate-services-grid">
        <button class="estate-service-btn" onclick="quickAction('waterproofing')">
          💧 Waterproofing
        </button>
        <button class="estate-service-btn secondary" onclick="quickAction('bathroom')">
          🚿 Bathroom Renovation
        </button>
        <button class="estate-service-btn secondary" onclick="quickAction('kitchen')">
          🍳 Kitchen Design
        </button>
        <button class="estate-service-btn" onclick="quickAction('pricing')">
          💰 Get Quote
        </button>
      </div>
    </div>
  `;
  
  messagesContainer.innerHTML = welcomeCard;
  scrollToBottom();
}

function quickAction(type) {
  const messages = {
    'waterproofing': 'I need information about waterproofing services',
    'bathroom': 'I want to renovate my bathroom',
    'kitchen': 'I need a modular kitchen',
    'pricing': 'What is your price range for services?'
  };
  
  const message = messages[type];
  if (message) {
    document.getElementById('messageInput').value = message;
    sendMessage();
  }
}

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  
  if (!message && selectedPhotos.length === 0) return;
  
  // Display user message
  if (message) {
    addMessage(message, 'user');
  }
  
  // Display photos if any
  if (selectedPhotos.length > 0) {
    addPhotoMessage(selectedPhotos, 'user');
  }
  
  // Clear input
  input.value = '';
  input.style.height = 'auto';
  
  // Show typing indicator
  showTypingIndicator();
  
  try {
    // Upload photos first if any
    let photoUrls = [];
    if (selectedPhotos.length > 0) {
      photoUrls = await uploadPhotos(selectedPhotos);
      clearPhotoPreview();
    }
    
    // Send message to API
    const response = await fetch(`${API_URL}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message || 'I uploaded a photo for analysis',
        sessionId: sessionId,
        photoUrls: photoUrls
      })
    });
    
    const data = await response.json();
    
    // Hide typing indicator
    hideTypingIndicator();
    
    if (data.success) {
      addMessage(data.response, 'bot');
      
      // Store conversation
      conversationHistory.push({
        user: message,
        bot: data.response,
        timestamp: new Date().toISOString()
      });
    } else {
      addMessage('Sorry, I encountered an error. Please try again or contact us at 📞 62891 37586', 'bot');
    }
    
  } catch (error) {
    console.error('Error sending message:', error);
    hideTypingIndicator();
    addMessage('Connection error. Please check your internet and try again.', 'bot');
  }
}

function addMessage(text, sender) {
  const messagesContainer = document.getElementById('messagesContainer');
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  const avatarEmoji = sender === 'bot' ? '🏠' : '👤';
  
  const messageHTML = `
    <div class="estate-message ${sender}">
      <div class="estate-message-avatar">${avatarEmoji}</div>
      <div class="estate-message-content">
        <div class="estate-message-bubble">${formatMessage(text)}</div>
        <div class="estate-message-time">
          <span>⏰ ${time}</span>
        </div>
      </div>
    </div>
  `;
  
  messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
  scrollToBottom();
}

function addPhotoMessage(photos, sender) {
  const messagesContainer = document.getElementById('messagesContainer');
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  const avatarEmoji = sender === 'bot' ? '🏠' : '👤';
  
  const photosHTML = photos.map(photo => {
    const url = typeof photo === 'string' ? photo : URL.createObjectURL(photo);
    return `<div class="estate-photo-message"><img src="${url}" alt="Uploaded photo" onclick="viewFullImage('${url}')"></div>`;
  }).join('');
  
  const messageHTML = `
    <div class="estate-message ${sender}">
      <div class="estate-message-avatar">${avatarEmoji}</div>
      <div class="estate-message-content">
        ${photosHTML}
        <div class="estate-message-time">
          <span>⏰ ${time}</span>
        </div>
      </div>
    </div>
  `;
  
  messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
  scrollToBottom();
}

function formatMessage(text) {
  // Convert markdown-style formatting
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert line breaks
  text = text.replace(/\n/g, '<br>');
  
  // Convert URLs to links
  text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
  
  // Convert phone numbers to clickable
  text = text.replace(/(\+?\d{10,})/g, '<a href="tel:$1">$1</a>');
  
  return text;
}

function showTypingIndicator() {
  const messagesContainer = document.getElementById('messagesContainer');
  
  const typingHTML = `
    <div class="estate-typing-indicator" id="typingIndicator">
      <div class="estate-message-avatar">🏠</div>
      <div class="estate-typing-bubble">
        <div class="estate-typing-dot"></div>
        <div class="estate-typing-dot"></div>
        <div class="estate-typing-dot"></div>
      </div>
    </div>
  `;
  
  messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
  scrollToBottom();
}

function hideTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) {
    indicator.remove();
  }
}

// Photo handling
function handlePhotoSelect(event) {
  const files = Array.from(event.target.files);
  
  if (files.length === 0) return;
  
  // Validate files
  const validFiles = files.filter(file => {
    if (!file.type.startsWith('image/')) {
      alert('Please select only image files');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size should be less than 5MB');
      return false;
    }
    return true;
  });
  
  if (validFiles.length === 0) return;
  
  // Add to selected photos
  selectedPhotos = [...selectedPhotos, ...validFiles];
  
  // Update preview
  updatePhotoPreview();
  
  // Clear input
  event.target.value = '';
}

function updatePhotoPreview() {
  const previewContainer = document.getElementById('photoPreview');
  
  if (selectedPhotos.length === 0) {
    previewContainer.style.display = 'none';
    return;
  }
  
  previewContainer.style.display = 'flex';
  previewContainer.innerHTML = selectedPhotos.map((photo, index) => {
    const url = URL.createObjectURL(photo);
    return `
      <div class="estate-photo-item">
        <img src="${url}" alt="Preview ${index + 1}">
        <button class="estate-photo-remove" onclick="removePhoto(${index})">×</button>
      </div>
    `;
  }).join('');
}

function removePhoto(index) {
  selectedPhotos.splice(index, 1);
  updatePhotoPreview();
}

function clearPhotoPreview() {
  selectedPhotos = [];
  document.getElementById('photoPreview').style.display = 'none';
  document.getElementById('photoPreview').innerHTML = '';
}

async function uploadPhotos(photos) {
  const uploadedUrls = [];
  
  for (const photo of photos) {
    try {
      const formData = new FormData();
      formData.append('photo', photo);
      formData.append('sessionId', sessionId);
      
      const response = await fetch(`${API_URL}/api/upload/photo`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success && data.photoUrl) {
        uploadedUrls.push(data.photoUrl);
      }
    } catch (error) {
      console.error('Photo upload error:', error);
    }
  }
  
  return uploadedUrls;
}

function viewFullImage(url) {
  window.open(url, '_blank');
}

function scrollToBottom() {
  const container = document.getElementById('messagesContainer');
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 100);
}

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Export for use in HTML
window.sendMessage = sendMessage;
window.quickAction = quickAction;
window.removePhoto = removePhoto;
window.viewFullImage = viewFullImage;
