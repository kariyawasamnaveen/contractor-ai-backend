const express = require('express');
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const router = express.Router();

// Public routes (no auth required)
router.post('/login', adminController.login);

// Protected routes (auth required)
router.get('/me', auth, adminController.me);

// ========== DASHBOARD STATS (NEW) ==========
router.get('/stats', auth, adminController.getStats);

// ========== LEADS MANAGEMENT (NEW & UPDATED) ==========
router.get('/leads', auth, adminController.getLeads);
router.get('/leads/:id', auth, adminController.getLead);
router.patch('/leads/:id/status', auth, adminController.updateLeadStatus);
router.patch('/leads/:id/assign', auth, adminController.assignLead);
router.delete('/leads/:id', auth, adminController.deleteLead);

// ========== CONVERSATIONS ==========
router.get('/conversations', auth, adminController.getConversations);
router.get('/conversations/:sessionId', auth, adminController.getConversation);

// ========== NOTES ==========
router.post('/leads/:leadId/notes', auth, adminController.addNote);
router.get('/leads/:leadId/notes', auth, adminController.getNotes);

// ========== TASKS ==========
router.post('/tasks', auth, adminController.createTask);
router.get('/tasks', auth, adminController.getTasks);
router.patch('/tasks/:id', auth, adminController.updateTask);

// ========== ACTIVITIES ==========
router.get('/activities', auth, adminController.getActivities);

// ========== REAL-TIME NOTIFICATIONS ==========
router.get('/notifications/stream', auth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Notification stream connected' })}\n\n`);
  
  // Keep connection alive
  const keepAliveInterval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
  }, 30000);
  
  req.on('close', () => {
    clearInterval(keepAliveInterval);
  });
});

module.exports = router;
