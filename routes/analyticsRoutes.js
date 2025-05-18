const express = require('express');
const router = express.Router();
const { getAnalyticsReport } = require('../utils/analyticsService');

// Get TDS analytics report
router.get('/tds-report', async (req, res) => {
    try {
        const report = await getAnalyticsReport();
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 