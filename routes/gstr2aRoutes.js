const express = require('express');
const router = express.Router();
const path = require('path');
const Gstr2a = require('../models/Gstr2a');
const { processGstr2aFile, loadAllGstr2aFiles } = require('../utils/gstr2aLoader');
const fs = require('fs').promises;

// Load all GSTR2A files from directory
router.post('/load-files', async (req, res) => {
    try {
        const directoryPath = path.join(__dirname, '../samples/Formatted_GSTR2A_PlaceOfSupply_Corrected');
        const results = await loadAllGstr2aFiles(directoryPath);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get purchase records for a GSTIN
router.get('/gstin/:gstin', async (req, res) => {
    try {
        const records = await Gstr2a.find({ gstin: req.params.gstin });
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get purchase record by GSTIN and return period
router.get('/gstin/:gstin/period/:period', async (req, res) => {
    try {
        const record = await Gstr2a.findOne({
            gstin: req.params.gstin,
            returnPeriod: req.params.period
        });
        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get summary of all purchase records
router.get('/summary', async (req, res) => {
    try {
        const summary = await Gstr2a.aggregate([
            {
                $group: {
                    _id: null,
                    totalGstins: { $sum: 1 },
                    totalInvoices: { $sum: '$summary.totalInvoices' },
                    totalValue: { $sum: '$summary.totalInvoiceValue' },
                    totalTaxableValue: { $sum: '$summary.totalTaxableValue' },
                    totalCentralTax: { $sum: '$summary.totalCentralTax' },
                    totalStateUtTax: { $sum: '$summary.totalStateUtTax' }
                }
            }
        ]);
        res.json(summary[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get invoices by date range
router.get('/invoices/date-range', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const records = await Gstr2a.aggregate([
            { $unwind: '$purchaseInvoices' },
            { 
                $match: { 
                    'purchaseInvoices.invoiceDate': {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate)
                    }
                }
            },
            { 
                $group: {
                    _id: '$gstin',
                    purchaseInvoices: { $push: '$purchaseInvoices' },
                    totalValue: { $sum: '$purchaseInvoices.invoiceValue' },
                    totalTaxableValue: { $sum: '$purchaseInvoices.taxableValue' },
                    totalCentralTax: { $sum: '$purchaseInvoices.centralTax' },
                    totalStateUtTax: { $sum: '$purchaseInvoices.stateUtTax' }
                }
            }
        ]);
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get total purchase value by GSTIN
router.get('/gstin/:gstin/total', async (req, res) => {
    try {
        const result = await Gstr2a.aggregate([
            { $match: { gstin: req.params.gstin } },
            {
                $group: {
                    _id: '$gstin',
                    totalInvoices: { $sum: '$summary.totalInvoices' },
                    totalValue: { $sum: '$summary.totalInvoiceValue' },
                    totalTaxableValue: { $sum: '$summary.totalTaxableValue' },
                    totalCentralTax: { $sum: '$summary.totalCentralTax' },
                    totalStateUtTax: { $sum: '$summary.totalStateUtTax' }
                }
            }
        ]);
        res.json(result[0] || { message: 'No records found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download GSTR2A file route
router.get('/download/:gstin', async (req, res) => {
    try {
        const { gstin } = req.params;
        
        // Construct the file path using absolute path
        const filePath = path.resolve(
            __dirname,
            '..',
            'samples',
            'Formatted_GSTR2A_PlaceOfSupply_Corrected',
            `${gstin}_GSTR2A.xlsx`
        );

        // Log the file path for debugging
        console.log('Attempting to download file:', filePath);

        // Check if file exists
        try {
            await fs.access(filePath);
            console.log('File exists and is accessible');
        } catch (error) {
            console.error(`File not found at path: ${filePath}`);
            return res.status(404).json({ 
                error: 'GSTR2A file not found for the specified GSTIN',
                details: `File ${gstin}_GSTR2A.xlsx not found in the directory`
            });
        }

        // Set appropriate headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${gstin}_GSTR2A.xlsx"`);

        // Use fs.createReadStream for better memory handling
        const fileStream = require('fs').createReadStream(filePath);
        
        // Handle stream errors
        fileStream.on('error', (error) => {
            console.error('Error streaming file:', error);
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: 'Failed to download GSTR2A file',
                    details: 'Error streaming the file'
                });
            }
        });

        // Pipe the file to the response
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error in download route:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Failed to download GSTR2A file',
                details: error.message
            });
        }
    }
});

module.exports = router; 