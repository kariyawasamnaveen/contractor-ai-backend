// Estate Contractor Admin Dashboard
// API Configuration
const API_URL = window.location.origin;
let currentUser = null;
let currentPage = 'dashboard';
let notificationInterval = null;
let charts = {};

// ========== AUTHENTICATION ==========
function checkAuth() {
  const token = localStorage.getItem('admin_token');
  const user = localStorage.getItem('admin_user');
  
  if (!token || !user) {
    window.location.href = './login.html';
    return false;
  }
  
  try {
    currentUser = JSON.parse(user);
    updateUserInfo();
    return true;
  } catch (error) {
    console.error('Auth error:', error);
    logout();
    return false;
  }
}

function updateUserInfo() {
  if (currentUser) {
    document.getElementById('userName').textContent = currentUser.name || 'Admin User';
    document.getElementById('userEmail').textContent = currentUser.email || 'admin@estatecontractor.com';
    
    const initials = (currentUser.name || 'A').charAt(0).toUpperCase();
    const avatars = document.querySelectorAll('#userAvatar');
    avatars.forEach(avatar => avatar.textContent = initials);
  }
}

function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  window.location.href = './login.html';
}

// ========== API HELPER ==========
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('admin_token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    });
    
    if (response.status === 401) {
      logout();
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    return null;
  }
}

// ========== NAVIGATION ==========
function navigateToPage(page) {
  currentPage = page;
  
  // Update active nav
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.page === page) {
      link.classList.add('active');
    }
  });
  
  // Update page title
  const titles = {
    dashboard: 'Dashboard',
    leads: 'Lead Management',
    conversations: 'Chat Conversations',
    waterproofing: 'Waterproofing Leads',
    renovations: 'Renovation Projects',
    photos: 'Photo Gallery',
    analytics: 'Reports & Analytics',
    activities: 'Activity Log',
    settings: 'Settings'
  };
  
  const pageTitle = document.getElementById('pageTitle');
  const currentPageSpan = document.getElementById('currentPage');
  
  if (pageTitle) pageTitle.textContent = titles[page] || 'Dashboard';
  if (currentPageSpan) currentPageSpan.textContent = titles[page] || 'Dashboard';
  
  loadPageContent(page);
}

async function loadPageContent(page) {
  const content = document.getElementById('pageContent');
  
  if (!content) return;
  
  switch(page) {
    case 'dashboard':
      await loadDashboard();
      break;
    case 'leads':
      await loadLeadsPage();
      break;
    case 'conversations':
      await loadConversationsPage();
      break;
    case 'analytics':
      await loadAnalyticsPage();
      break;
    default:
      content.innerHTML = '<div class="empty-state"><h3>Page Coming Soon</h3></div>';
  }
}

// ========== DASHBOARD PAGE ==========
async function loadDashboard() {
  const content = document.getElementById('pageContent');
  
  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-info">
            <h3>Total Leads</h3>
            <div class="stat-value" id="totalLeads">-</div>
          </div>
          <div class="stat-icon blue">
            <i class="fas fa-users"></i>
          </div>
        </div>
        <div class="stat-footer">
          <div class="stat-change positive">
            <i class="fas fa-arrow-up"></i>
            <span>All time</span>
          </div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-info">
            <h3>Today</h3>
            <div class="stat-value" id="todayLeads">-</div>
          </div>
          <div class="stat-icon green">
            <i class="fas fa-calendar-day"></i>
          </div>
        </div>
        <div class="stat-footer">
          <div class="stat-change positive">
            <i class="fas fa-arrow-up"></i>
            <span>New today</span>
          </div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-info">
            <h3>This Week</h3>
            <div class="stat-value" id="weekLeads">-</div>
          </div>
          <div class="stat-icon orange">
            <i class="fas fa-calendar-week"></i>
          </div>
        </div>
        <div class="stat-footer">
          <div class="stat-change positive">
            <i class="fas fa-arrow-up"></i>
            <span>Last 7 days</span>
          </div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-info">
            <h3>This Month</h3>
            <div class="stat-value" id="monthLeads">-</div>
          </div>
          <div class="stat-icon purple">
            <i class="fas fa-calendar-alt"></i>
          </div>
        </div>
        <div class="stat-footer">
          <div class="stat-change positive">
            <i class="fas fa-arrow-up"></i>
            <span>Last 30 days</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-header">
          <h3>Leads Over Time (30 Days)</h3>
        </div>
        <canvas id="leadsChart" height="80"></canvas>
      </div>
      
      <div class="chart-card">
        <div class="chart-header">
          <h3>Leads by Status</h3>
        </div>
        <canvas id="statusChart" height="80"></canvas>
      </div>
    </div>
    
    <div class="table-card">
      <div class="table-header">
        <h3>Recent Leads</h3>
        <div class="table-actions">
          <button class="btn btn-primary" onclick="navigateToPage('leads')">
            <i class="fas fa-arrow-right"></i> View All
          </button>
        </div>
      </div>
      <div id="recentLeadsTable">
        <div class="loading">
          <div class="spinner"></div>
        </div>
      </div>
    </div>
  `;
  
  await loadDashboardStats();
  await loadDashboardCharts();
  await loadRecentLeads();
}

async function loadDashboardStats() {
  try {
    const response = await apiRequest('/api/admin/stats');
    
    if (response && response.success) {
      const stats = response.data;
      
      document.getElementById('totalLeads').textContent = stats.total || 0;
      document.getElementById('todayLeads').textContent = stats.today || 0;
      document.getElementById('weekLeads').textContent = stats.week || 0;
      document.getElementById('monthLeads').textContent = stats.month || 0;
    } else {
      document.getElementById('totalLeads').textContent = '0';
      document.getElementById('todayLeads').textContent = '0';
      document.getElementById('weekLeads').textContent = '0';
      document.getElementById('monthLeads').textContent = '0';
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadDashboardCharts() {
  // ✅ FIX: Destroy existing charts before creating new ones
  Object.values(charts).forEach(chart => {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy();
    }
  });
  charts = {};
  
  // Leads Over Time Chart
  const leadsCtx = document.getElementById('leadsChart');
  if (leadsCtx) {
    charts.leads = new Chart(leadsCtx, {
      type: 'line',
      data: {
        labels: getLast30Days(),
        datasets: [{
          label: 'Leads',
          data: generateMockLeadsData(30),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
  
  // Status Chart
  const statusCtx = document.getElementById('statusChart');
  if (statusCtx) {
    charts.status = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['New', 'Contacted', 'Qualified', 'Converted'],
        datasets: [{
          data: [5, 0, 0, 0],
          backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

async function loadRecentLeads() {
  console.log('🔵 Step 1: Starting loadRecentLeads function');
  
  try {
    console.log('🔵 Step 2: Making API request to /api/admin/leads?limit=10');
    const response = await apiRequest('/api/admin/leads?limit=10');
    
    console.log('🔵 Step 3: API Response received:', response);
    console.log('🔵 Step 3a: response exists?', !!response);
    console.log('🔵 Step 3b: response.success?', response?.success);
    console.log('🔵 Step 3c: response.leads exists?', !!response?.leads);
    console.log('🔵 Step 3d: response.leads is array?', Array.isArray(response?.leads));
    console.log('🔵 Step 3e: response.leads length?', response?.leads?.length);
    console.log('🔵 Step 3f: Full response object:', JSON.stringify(response, null, 2));
    
    const tableDiv = document.getElementById('recentLeadsTable');
    console.log('🔵 Step 4: Table div found?', !!tableDiv);
    
    // Check each condition separately for debugging
    if (!response) {
      console.log('❌ FAILED: No response received from API');
      tableDiv.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error</h3>
          <p>No response from server</p>
        </div>
      `;
      return;
    }
    
    if (!response.success) {
      console.log('❌ FAILED: response.success is false');
      console.log('Error message:', response.error || 'Unknown error');
      tableDiv.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error</h3>
          <p>${response.error || 'API request failed'}</p>
        </div>
      `;
      return;
    }
    
    if (!response.leads) {
      console.log('❌ FAILED: response.leads does not exist');
      console.log('Available response keys:', Object.keys(response));
      console.log('Response structure:', response);
      tableDiv.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error</h3>
          <p>Invalid response format - no leads property</p>
        </div>
      `;
      return;
    }
    
    if (!Array.isArray(response.leads)) {
      console.log('❌ FAILED: response.leads is not an array');
      console.log('Type of response.leads:', typeof response.leads);
      tableDiv.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error</h3>
          <p>Invalid response format - leads is not an array</p>
        </div>
      `;
      return;
    }
    
    if (response.leads.length === 0) {
      console.log('⚠️ WARNING: response.leads is empty array (no leads found)');
      tableDiv.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <h3>No Leads Yet</h3>
          <p>New leads will appear here when customers contact you through the chatbot</p>
        </div>
      `;
      return;
    }
    
    console.log('✅ Step 5: All checks passed! Found', response.leads.length, 'leads');
    console.log('✅ Step 5a: First lead:', response.leads[0]);
    
    const leads = response.leads;
    
    console.log('🔵 Step 6: Generating HTML table...');
    const htmlContent = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact</th>
            <th>Service</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${leads.map(lead => `
            <tr>
              <td><strong>${lead.name || 'N/A'}</strong></td>
              <td>
                ${lead.phone ? `<div><i class="fas fa-phone"></i> ${lead.phone}</div>` : ''}
                ${lead.email ? `<div><i class="fas fa-envelope"></i> ${lead.email}</div>` : ''}
              </td>
              <td>${lead.projectType || 'General Inquiry'}</td>
              <td><span class="status-badge ${(lead.status || 'new').toLowerCase()}">${lead.status || 'New'}</span></td>
              <td>${new Date(lead.createdAt).toLocaleDateString()}</td>
              <td>
                <div class="action-btns">
                  <button class="action-btn" onclick="viewLead('${lead.id}')" title="View">
                    <i class="fas fa-eye"></i>
                  </button>
                  ${lead.phone ? `
                  <button class="action-btn" onclick="callLead('${lead.phone}')" title="Call">
                    <i class="fas fa-phone"></i>
                  </button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    console.log('🔵 Step 6a: HTML generated, length:', htmlContent.length);
    
    tableDiv.innerHTML = htmlContent;
    console.log('✅ Step 7: HTML inserted into table div successfully!');
    console.log('✅ COMPLETED: loadRecentLeads function finished successfully');
    
  } catch (error) {
    console.error('❌ EXCEPTION in loadRecentLeads:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    const tableDiv = document.getElementById('recentLeadsTable');
    if (tableDiv) {
      tableDiv.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error Loading Leads</h3>
          <p>${error.message}</p>
        </div>
      `;
    }
  }
}

// ========== LEADS PAGE ==========
async function loadLeadsPage() {
  const content = document.getElementById('pageContent');
  
  content.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <h3>All Leads</h3>
        <div class="table-actions">
          <input type="text" placeholder="Search leads..." class="search-box" id="leadSearch">
          <select class="chart-filter">
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
          </select>
        </div>
      </div>
      <div id="allLeadsTable">
        <div class="loading">
          <div class="spinner"></div>
        </div>
      </div>
    </div>
  `;
  
  await loadAllLeads();
}

async function loadAllLeads() {
  try {
    const response = await apiRequest('/api/admin/leads');
    const tableDiv = document.getElementById('allLeadsTable');
    
    // ✅ FIX: Changed response.data to response.leads
    if (response && response.success && response.leads && response.leads.length > 0) {
      const leads = response.leads;
      
      tableDiv.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Service</th>
              <th>Budget</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${leads.map(lead => `
              <tr>
                <td><strong>${lead.name || 'N/A'}</strong></td>
                <td>
                  ${lead.phone ? `<div><i class="fas fa-phone"></i> ${lead.phone}</div>` : ''}
                  ${lead.email ? `<div><i class="fas fa-envelope"></i> ${lead.email}</div>` : ''}
                </td>
                <td>${lead.projectType || 'General'}</td>
                <td>${lead.budget || 'N/A'}</td>
                <td><span class="status-badge ${(lead.status || 'new').toLowerCase()}">${lead.status || 'New'}</span></td>
                <td>${new Date(lead.createdAt).toLocaleDateString()}</td>
                <td>
                  <div class="action-btns">
                    <button class="action-btn" onclick="viewLead('${lead.id}')">
                      <i class="fas fa-eye"></i>
                    </button>
                    ${lead.phone ? `
                    <button class="action-btn" onclick="callLead('${lead.phone}')">
                      <i class="fas fa-phone"></i>
                    </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      tableDiv.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <h3>No Leads Yet</h3>
          <p>Leads will appear here when customers interact with the chatbot</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading leads:', error);
    document.getElementById('allLeadsTable').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error Loading Leads</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ========== CONVERSATIONS PAGE ==========
async function loadConversationsPage() {
  const content = document.getElementById('pageContent');
  
  content.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <h3>Chat Conversations</h3>
      </div>
      <div class="empty-state">
        <i class="fas fa-comments"></i>
        <h3>No Conversations Yet</h3>
        <p>Chat history will appear here</p>
      </div>
    </div>
  `;
}

// ========== ANALYTICS PAGE ==========
async function loadAnalyticsPage() {
  const content = document.getElementById('pageContent');
  
  content.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-chart-line"></i>
      <h3>Analytics Coming Soon</h3>
      <p>Detailed analytics and reports will be available here</p>
    </div>
  `;
}

// ========== HELPER FUNCTIONS ==========
function getLast30Days() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  return days;
}

function generateMockLeadsData(days) {
  const data = [];
  for (let i = 0; i < days; i++) {
    data.push(Math.floor(Math.random() * 3));
  }
  return data;
}

function refreshData() {
  console.log('Refreshing data...');
  loadPageContent(currentPage);
}

function viewLead(leadId) {
  alert(`View lead details: ${leadId}`);
}

function callLead(phone) {
  window.location.href = `tel:${phone}`;
}

function toggleNotifications() {
  alert('Notifications - Coming soon!');
}
