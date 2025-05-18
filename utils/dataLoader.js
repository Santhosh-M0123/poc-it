const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const GstinMaster = require('../models/GstinMaster');
const TdsGstin = require('../models/TdsGstin');

// Helper function to extract PAN from GSTIN
const extractPanFromGstin = (gstin) => {
    return gstin.substring(2, 12);
};

const loadGstinData = async () => {
    try {
        const gstinResults = [];
        const tdsResults = [];

        // Read and parse the GSTIN master CSV file
        await new Promise((resolve, reject) => {
            fs.createReadStream(path.join(__dirname, '../samples/100_Dummy_Tamil_Nadu_GSTINs_with_Legal_Names.csv'))
                .pipe(csv())
                .on('data', (data) => {
                    // Clean up the data
                    const gstin = data['Dummy GSTIN (Tamil Nadu)']?.trim();
                    const legalName = data['Dummy Legal Name']?.trim();
                    
                    if (gstin && legalName) {
                        gstinResults.push({
                            gstin,
                            legalName,
                            stateCode: '33', // Tamil Nadu
                            panNumber: extractPanFromGstin(gstin)
                        });
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        // Read and parse the TDS GSTIN CSV file
        await new Promise((resolve, reject) => {
            fs.createReadStream(path.join(__dirname, '../samples/25_Dummy_TDS_GSTINs_with_Shared_PAN.csv'))
                .pipe(csv())
                .on('data', (data) => {
                    // Clean up the data
                    const tdsGstin = data['Dummy TDS GSTIN (Tamil Nadu)']?.trim();
                    const legalName = data['Dummy Legal Name']?.trim();
                    const linkedPan = data['Same PAN As']?.trim();
                    
                    if (tdsGstin && legalName && linkedPan) {
                        tdsResults.push({
                            tdsGstin,
                            legalName,
                            linkedPan
                        });
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        console.log(`Found ${gstinResults.length} GSTIN records and ${tdsResults.length} TDS records to process`);

        // Insert GSTIN master data
        for (const gstinData of gstinResults) {
            try {
                await GstinMaster.findOneAndUpdate(
                    { gstin: gstinData.gstin },
                    gstinData,
                    { upsert: true, new: true, runValidators: true }
                );
            } catch (error) {
                console.error(`Error inserting GSTIN ${gstinData.gstin}:`, error.message);
            }
        }

        // Insert TDS GSTIN data
        for (const tdsData of tdsResults) {
            try {
                await TdsGstin.findOneAndUpdate(
                    { tdsGstin: tdsData.tdsGstin },
                    tdsData,
                    { upsert: true, new: true, runValidators: true }
                );
            } catch (error) {
                console.error(`Error inserting TDS GSTIN ${tdsData.tdsGstin}:`, error.message);
            }
        }

        console.log('Data loading completed successfully');
        
        // Return summary
        return {
            gstinProcessed: gstinResults.length,
            tdsProcessed: tdsResults.length
        };

    } catch (error) {
        console.error('Error loading data:', error.message);
        throw error;
    }
};

// Single GSTIN insertion function for API
const insertGstin = async (gstinData) => {
    try {
        const { gstin, legalName } = gstinData;
        if (!gstin || !legalName) {
            throw new Error('GSTIN and Legal Name are required');
        }

        const data = {
            gstin,
            legalName,
            stateCode: '33',
            panNumber: extractPanFromGstin(gstin)
        };

        const result = await GstinMaster.findOneAndUpdate(
            { gstin: data.gstin },
            data,
            { upsert: true, new: true, runValidators: true }
        );

        return result;
    } catch (error) {
        throw error;
    }
};

// Single TDS GSTIN insertion function for API
const insertTdsGstin = async (tdsData) => {
    try {
        const { tdsGstin, legalName, linkedPan } = tdsData;
        if (!tdsGstin || !legalName || !linkedPan) {
            throw new Error('TDS GSTIN, Legal Name, and Linked PAN are required');
        }

        const result = await TdsGstin.findOneAndUpdate(
            { tdsGstin },
            tdsData,
            { upsert: true, new: true, runValidators: true }
        );

        return result;
    } catch (error) {
        throw error;
    }
};

module.exports = { 
    loadGstinData,
    insertGstin,
    insertTdsGstin,
    extractPanFromGstin
}; 