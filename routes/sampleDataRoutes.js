const express = require('express');
const router = express.Router();
const { generateSampleTdsData } = require('../utils/generateSampleTdsData');

// Generate sample TDS data
router.post('/generate-tds-data', async (req, res) => {
    try {
        const result = await generateSampleTdsData();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 