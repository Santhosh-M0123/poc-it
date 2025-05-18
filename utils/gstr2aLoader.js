const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const Gstr2a = require('../models/Gstr2a');

// Helper function to parse date from Excel
const parseExcelDate = (excelDate) => {
    if (!excelDate) return null;
    // Check if it's already a date string
    if (typeof excelDate === 'string' && excelDate.includes('-')) {
        const [day, month, year] = excelDate.split('-').map(num => parseInt(num, 10));
        return new Date(year, month - 1, day);
    }
    // Handle Excel date number
    return new Date((excelDate - 25569) * 86400 * 1000);
};

// Helper function to clean number values
const cleanNumber = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    // Remove currency symbols, commas and other non-numeric characters except decimal point
    return parseFloat(value.toString().replace(/[^0-9.-]+/g, '')) || 0;
};

// Helper function to extract return period from date
const getReturnPeriod = (date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}${year}`;
};

const processGstr2aFile = async (filePath) => {
    try {
        console.log('Processing file:', filePath);
        // Extract GSTIN from filename
        const fileName = path.basename(filePath);
        const gstin = fileName.split('_')[0];
        console.log('Extracted GSTIN:', gstin);

        // Read Excel file
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header mapping
        const data = XLSX.utils.sheet_to_json(worksheet, { 
            raw: false,
            defval: null // Set default value for empty cells
        });
        
        console.log('Raw data sample:', data[0]);

        if (!data || data.length === 0) {
            throw new Error('No data found in Excel file');
        }

        // Process purchase invoices
        const purchaseInvoices = [];
        let returnPeriod = '';

        for (const row of data) {
            // Skip header or empty rows
            if (!row['Invoice number'] || !row['Invoice Date']) {
                console.log('Skipping row due to missing invoice number or date:', row);
                continue;
            }

            const invoiceDate = parseExcelDate(row['Invoice Date']);
            if (!returnPeriod && invoiceDate) {
                returnPeriod = getReturnPeriod(invoiceDate);
            }

            // Create purchase invoice object with only required fields
            const purchaseInvoice = {
                invoiceNumber: row['Invoice number'],
                invoiceDate: invoiceDate,
                invoiceValue: cleanNumber(row['Invoice Value (₹)']),
                placeOfSupply: row['Place of supply'],
                rate: cleanNumber(row['Rate (%)']),
                taxableValue: cleanNumber(row['Taxable Value (₹)']),
                centralTax: cleanNumber(row['Central Tax (₹)']),
                stateUtTax: cleanNumber(row['State/UT tax (₹)'])
            };

            // Validate required fields
            if (purchaseInvoice.invoiceNumber && 
                purchaseInvoice.invoiceDate && 
                purchaseInvoice.placeOfSupply) {
                console.log('Adding invoice:', purchaseInvoice);
                purchaseInvoices.push(purchaseInvoice);
            } else {
                console.log('Skipping invalid invoice:', purchaseInvoice);
            }
        }

        console.log(`Processed ${purchaseInvoices.length} valid invoices`);

        if (!returnPeriod) {
            returnPeriod = '042023'; // Default return period if not found
        }

        // Create or update GSTR2A record
        const gstr2aData = {
            gstin,
            returnPeriod,
            purchaseInvoices
        };

        console.log('Saving GSTR2A data:', {
            gstin,
            returnPeriod,
            invoiceCount: purchaseInvoices.length
        });

        const result = await Gstr2a.findOneAndUpdate(
            { gstin, returnPeriod },
            gstr2aData,
            { 
                upsert: true, 
                new: true, 
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        console.log('Saved result:', {
            gstin: result.gstin,
            invoiceCount: result.purchaseInvoices.length,
            summary: result.summary
        });

        return {
            gstin,
            invoicesProcessed: purchaseInvoices.length,
            status: 'success'
        };

    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error.message);
        throw error;
    }
};

const loadAllGstr2aFiles = async (directoryPath) => {
    try {
        const files = fs.readdirSync(directoryPath)
            .filter(file => file.endsWith('_GSTR2A.xlsx'));

        console.log(`Found ${files.length} GSTR2A files to process`);

        const results = {
            total: files.length,
            processed: 0,
            failed: 0,
            errors: [],
            summary: []
        };

        for (const file of files) {
            try {
                console.log(`\nProcessing file ${results.processed + 1} of ${files.length}: ${file}`);
                const result = await processGstr2aFile(path.join(directoryPath, file));
                results.processed++;
                results.summary.push(result);
                console.log(`Successfully processed file: ${file}`);
            } catch (error) {
                results.failed++;
                results.errors.push({
                    file,
                    error: error.message
                });
                console.error(`Failed to process file ${file}:`, error.message);
            }
        }

        console.log('\nProcessing Summary:', {
            totalFiles: results.total,
            processed: results.processed,
            failed: results.failed
        });

        return results;

    } catch (error) {
        console.error('Error loading GSTR2A files:', error.message);
        throw error;
    }
};

module.exports = {
    processGstr2aFile,
    loadAllGstr2aFiles
}; 