const express = require('express');
const leadController = require('../controllers/leadController');
const exportService = require('../services/exportService');
const auth = require('../middleware/auth');
const router = express.Router();

// ✅ DEBUG 16
console.log('🟡 DEBUG 16 [leadRoutes]: Lead routes file loaded');

// Create lead
router.post('/', (req, res) => {
  // ✅ DEBUG 17
  console.log('🟡 DEBUG 17 [leadRoutes]: POST /api/leads endpoint hit');
  leadController.createLead(req, res);
});

// Export routes (MUST be BEFORE :id route to avoid conflict)
router.get('/export/excel', auth, async (req, res) => {
  try {
    const buffer = await exportService.exportLeadsToExcel(req.query);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=leads_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

router.get('/export/csv', auth, async (req, res) => {
  try {
    const csv = await exportService.exportLeadsToCSV(req.query);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Get all leads
router.get('/', (req, res) => leadController.getLeads(req, res));

// Get single lead by ID (MUST be AFTER export routes)
router.get('/:id', (req, res) => leadController.getLeadById(req, res));

// Update lead status
router.patch('/:id/status', (req, res) => leadController.updateLeadStatus(req, res));

module.exports = router;
