const express = require('express');
const router = express.Router();
const { insertGstin, insertTdsGstin } = require('../utils/dataLoader');
const GstinMaster = require('../models/GstinMaster');
const TdsGstin = require('../models/TdsGstin');

// Create new GSTIN entry
router.post('/gstin', async (req, res) => {
    try {
        const result = await insertGstin(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Create new TDS GSTIN entry
router.post('/tds-gstin', async (req, res) => {
    try {
        const result = await insertTdsGstin(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get all GSTIN entries
router.get('/gstin', async (req, res) => {
    try {
        const gstins = await GstinMaster.find();
        res.json(gstins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all TDS GSTIN entries
router.get('/tds-gstin', async (req, res) => {
    try {
        const tdsGstins = await TdsGstin.find();
        res.json(tdsGstins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get GSTIN by PAN
router.get('/gstin/pan/:pan', async (req, res) => {
    try {
        const gstins = await GstinMaster.find({ panNumber: req.params.pan });
        res.json(gstins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get TDS GSTIN by linked PAN
router.get('/tds-gstin/pan/:pan', async (req, res) => {
    try {
        const tdsGstins = await TdsGstin.find({ linkedPan: req.params.pan });
        res.json(tdsGstins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 