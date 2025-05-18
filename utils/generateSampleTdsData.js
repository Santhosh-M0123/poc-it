const GstinMaster = require('../models/GstinMaster');
const TdsGstin = require('../models/TdsGstin');
const Gstr2a = require('../models/Gstr2a');
const TdsGstPayment = require('../models/TdsGstPayment');

const TDS_THRESHOLD = 250000; // 2.5 lakhs
const TDS_RATE = 0.02; // 2%

// Helper function to generate a random payment status
const getRandomPaymentStatus = () => {
    const statuses = ['PENDING', 'PAID', 'PARTIALLY_PAID'];
    return statuses[Math.floor(Math.random() * statuses.length)];
};

// Helper function to generate a random challan number
const generateChallanNumber = () => {
    return `CHL${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

// Helper function to calculate TDS amount from invoices
const calculateTdsAmount = (invoices) => {
    const eligibleInvoices = invoices.filter(inv => inv.taxableValue > TDS_THRESHOLD);
    const totalEligibleValue = eligibleInvoices.reduce((sum, inv) => sum + inv.taxableValue, 0);
    return totalEligibleValue * TDS_RATE;
};

// Helper function to distribute amount into GST components
const distributeGstComponents = (totalAmount) => {
    // Randomly decide if it's IGST or CGST+SGST
    const isIgst = Math.random() > 0.5;
    
    if (isIgst) {
        return {
            igstAmount: totalAmount,
            cgstAmount: 0,
            sgstAmount: 0
        };
    } else {
        const halfAmount = totalAmount / 2;
        return {
            igstAmount: 0,
            cgstAmount: halfAmount,
            sgstAmount: halfAmount
        };
    }
};

const generateSampleTdsData = async () => {
    try {
        // Get 25 random GSTINs from master
        const gstinRecords = await GstinMaster.aggregate([
            { $sample: { size: 25 } }
        ]);

        console.log(`Selected ${gstinRecords.length} random GSTINs for TDS registration`);

        // Create TDS GSTIN entries
        for (const gstinRecord of gstinRecords) {
            const tdsGstinData = {
                tdsGstin: gstinRecord.gstin,
                legalName: gstinRecord.legalName,
                linkedPan: gstinRecord.panNumber
            };

            await TdsGstin.findOneAndUpdate(
                { tdsGstin: tdsGstinData.tdsGstin },
                tdsGstinData,
                { upsert: true, new: true }
            );
        }

        console.log('Created TDS GSTIN entries');

        // Create TDS GST Payment entries
        for (const gstinRecord of gstinRecords) {
            // Get GSTR2A records for this GSTIN
            const gstr2aRecords = await Gstr2a.find({ gstin: gstinRecord.gstin });
            
            // Calculate total TDS amount from all invoices
            const totalTdsAmount = gstr2aRecords.reduce((sum, record) => {
                return sum + calculateTdsAmount(record.purchaseInvoices);
            }, 0);

            if (totalTdsAmount > 0) {
                // Create payment record for current month
                const currentDate = new Date();
                const paymentPeriod = `${String(currentDate.getMonth() + 1).padStart(2, '0')}${currentDate.getFullYear()}`;
                
                // Generate random deductee amount (between 80% to 100% of TDS amount)
                const deducteeAmount = totalTdsAmount * (0.8 + Math.random() * 0.2);
                
                // Distribute into GST components
                const gstComponents = distributeGstComponents(deducteeAmount);
                
                const paymentData = {
                    gstin: gstinRecord.gstin,
                    paymentPeriod,
                    deducteeAmount,
                    ...gstComponents,
                    paymentStatus: getRandomPaymentStatus(),
                    paymentDate: currentDate,
                    challanNumber: generateChallanNumber(),
                    remarks: `Sample payment for ${paymentPeriod}`
                };

                await TdsGstPayment.findOneAndUpdate(
                    { gstin: paymentData.gstin, paymentPeriod },
                    paymentData,
                    { upsert: true, new: true }
                );
            }
        }

        console.log('Created TDS GST Payment entries');

        return {
            status: 'success',
            message: 'Sample TDS data generated successfully'
        };

    } catch (error) {
        console.error('Error generating sample TDS data:', error);
        throw error;
    }
};

module.exports = {
    generateSampleTdsData
}; 