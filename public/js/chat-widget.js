const API_URL = window.location.origin;
let sessionId = generateSessionId();
let selectedPhotos = [];
let conversationHistory = [];

document.addEventListener('DOMContentLoaded', () => {
  showWelcomeMessage();
});

function showWelcomeMessage() {
  const messagesContainer = document.getElementById('messagesContainer');
  
  const welcomeCard = `
    <div class="welcome-card">
      <h3>Welcome to Estate Contractor</h3>
      <p>I'm Priya, your AI concierge. How can I transform your space today?</p>
      <div class="quick-actions-grid">
        <button class="quick-action-btn" onclick="quickAction('waterproofing')">💧 Waterproofing</button>
        <button class="quick-action-btn" onclick="quickAction('bathroom')">🛁 Bathroom</button>
        <button class="quick-action-btn" onclick="quickAction('kitchen')">🍳 Kitchen</button>
        <button class="quick-action-btn" onclick="quickAction('pricing')">💰 Get Quote</button>
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
  
  if (message) addMessage(message, 'user');
  
  if (selectedPhotos.length > 0) {
    addPhotoMessage(selectedPhotos, 'user');
  }
  
  input.value = '';
  showTypingIndicator();
  
  try {
    let photoUrls = [];
    if (selectedPhotos.length > 0) {
      photoUrls = await uploadPhotos(selectedPhotos);
      clearPhotoPreview();
    }
    
    const response = await fetch(`${API_URL}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message || 'Analyze these photos',
        sessionId: sessionId,
        photoUrls: photoUrls
      })
    });
    
    const data = await response.json();
    hideTypingIndicator();
    
    if (data.success) {
      addMessage(data.response, 'bot');
    } else {
      addMessage('Technical hiccup. Please try again or call 📞 62891 37586', 'bot');
    }
    
  } catch (error) {
    hideTypingIndicator();
    addMessage('Connection lost. Please check your internet.', 'bot');
  }
}

function addMessage(text, sender) {
  const messagesContainer = document.getElementById('messagesContainer');
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  const messageHTML = `
    <div class="estate-message ${sender}">
      <div class="estate-message-bubble">${formatMessage(text)}</div>
      <div class="estate-message-time">${time}</div>
    </div>
  `;
  
  messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
  scrollToBottom();
}

function addPhotoMessage(photos, sender) {
  const messagesContainer = document.getElementById('messagesContainer');
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  const photosHTML = photos.map(photo => {
    const url = typeof photo === 'string' ? photo : URL.createObjectURL(photo);
    return `<div class="preview-item" style="width: 100px; height: 100px; margin-bottom: 5px;"><img src="${url}" style="width:100%; height:100%; object-fit:cover;"></div>`;
  }).join('');
  
  const messageHTML = `
    <div class="estate-message ${sender}">
      <div class="estate-message-content">${photosHTML}</div>
      <div class="estate-message-time">${time}</div>
    </div>
  `;
  
  messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
  scrollToBottom();
}

function formatMessage(text) {
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\n/g, '<br>');
  return text;
}

function showTypingIndicator() {
  const messagesContainer = document.getElementById('messagesContainer');
  const typingHTML = `
    <div class="estate-typing-indicator" id="typingIndicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
  scrollToBottom();
}

function hideTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

function handlePhotoSelect(event) {
  const files = Array.from(event.target.files);
  selectedPhotos = [...selectedPhotos, ...files];
  updatePhotoPreview();
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
      <div class="preview-item">
        <img src="${url}">
        <button class="remove-photo" onclick="removePhoto(${index})">×</button>
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
}

async function uploadPhotos(photos) {
  const uploadedUrls = [];
  for (const photo of photos) {
    const formData = new FormData();
    formData.append('photo', photo);
    formData.append('sessionId', sessionId);
    const response = await fetch(`${API_URL}/api/upload/photo`, { method: 'POST', body: formData });
    const data = await response.json();
    if (data.success) uploadedUrls.push(data.photoUrl);
  }
  return uploadedUrls;
}

function scrollToBottom() {
  const container = document.getElementById('messagesContainer');
  setTimeout(() => { container.scrollTop = container.scrollHeight; }, 100);
}

function generateSessionId() {
  return 'session_' + Date.now();
}

window.sendMessage = sendMessage;
window.quickAction = quickAction;
window.removePhoto = removePhoto;
window.handlePhotoSelect = handlePhotoSelect;
