const GstinMaster = require('../models/GstinMaster');
const TdsGstin = require('../models/TdsGstin');
const Gstr2a = require('../models/Gstr2a');
const TdsGstPayment = require('../models/TdsGstPayment');

const TDS_THRESHOLD = 250000; // 2.5 lakhs
const TDS_RATE = 0.02; // 2%

const calculateTdsValue = (invoices) => {
    const eligibleInvoices = invoices.filter(inv => inv.taxableValue > TDS_THRESHOLD);
    const totalEligibleValue = eligibleInvoices.reduce((sum, inv) => sum + inv.taxableValue, 0);
    return {
        totalEligibleValue,
        tdsAmount: totalEligibleValue * TDS_RATE,
        eligibleInvoicesCount: eligibleInvoices.length
    };
};

const getAnalyticsReport = async () => {
    try {
        // Get all GSTIN records
        const gstinRecords = await GstinMaster.find();
        const tdsRegistrations = await TdsGstin.find();

        // Create a map of PAN numbers to TDS GSTIN details
        const tdsPanMap = new Map();
        tdsRegistrations.forEach(tds => {
            tdsPanMap.set(tds.linkedPan, {
                tdsGstin: tds.tdsGstin,
                legalName: tds.legalName
            });
        });

        // Get current month's payment period
        const currentDate = new Date();
        const currentPeriod = `${String(currentDate.getMonth() + 1).padStart(2, '0')}${currentDate.getFullYear()}`;

        // Get all TDS payments for the current period
        const tdsPayments = await TdsGstPayment.find({ paymentPeriod: currentPeriod });
        const tdsPaymentMap = new Map(tdsPayments.map(payment => [payment.gstin, payment]));

        // Process each GSTIN
        const analyticsData = await Promise.all(gstinRecords.map(async (gstin) => {
            // Get all GSTR2A records for this GSTIN
            const gstr2aRecords = await Gstr2a.find({ gstin: gstin.gstin });
            
            // Combine all invoices
            const allInvoices = gstr2aRecords.reduce((acc, record) => {
                return acc.concat(record.purchaseInvoices);
            }, []);

            // Calculate TDS values
            const tdsCalculation = calculateTdsValue(allInvoices);
            
            // Get TDS payment info
            const tdsPayment = tdsPaymentMap.get(gstin.gstin) || {
                deducteeAmount: 0,
                paymentStatus: 'NOT_PAID'
            };

            // Calculate TDS difference
            const tdsDifference = tdsCalculation.tdsAmount - tdsPayment.deducteeAmount;

            // Get TDS registration info based on PAN
            const tdsInfo = tdsPanMap.get(gstin.panNumber);
            const isTdsRegistered = !!tdsInfo;

            // Determine TDS status
            let tdsStatus = 'NOT_PAID';
            if (tdsPayment.paymentStatus === 'PAID') {
                tdsStatus = tdsDifference <= 0 ? 'FULLY_PAID' : 'PARTIALLY_PAID';
            } else if (tdsPayment.paymentStatus === 'PARTIALLY_PAID') {
                tdsStatus = 'PARTIALLY_PAID';
            }

            return {
                gstinNumber: gstin.gstin,
                panNumber: gstin.panNumber,
                legalName: gstin.legalName,
                tdsGstinNumber: tdsInfo ? tdsInfo.tdsGstin : '-',
                isTdsRegistered: isTdsRegistered,
                totalInvoices: allInvoices.length,
                eligibleInvoices: tdsCalculation.eligibleInvoicesCount,
                totalEligibleValue: tdsCalculation.totalEligibleValue,
                totalTdsApplicable: tdsCalculation.tdsAmount,
                tdsPaymentDone: tdsPayment.deducteeAmount,
                tdsDifference: tdsDifference,
                tdsStatus: tdsStatus
            };
        }));

        // Sort analytics data by TDS difference in descending order
        analyticsData.sort((a, b) => b.tdsDifference - a.tdsDifference);

        // Calculate summary
        const summary = {
            totalGstins: gstinRecords.length,
            totalTdsRegistered: tdsRegistrations.length,
            totalTdsValue: analyticsData.reduce((sum, record) => sum + record.totalTdsApplicable, 0),
            totalTdsPaid: analyticsData.reduce((sum, record) => sum + record.tdsPaymentDone, 0),
            totalTdsPending: analyticsData.reduce((sum, record) => sum + Math.max(0, record.tdsDifference), 0)
        };

        return {
            summary,
            details: analyticsData
        };
    } catch (error) {
        console.error('Error generating analytics report:', error);
        throw error;
    }
};

module.exports = {
    getAnalyticsReport
}; 