const mongoose = require('mongoose');

const tdsGstPaymentSchema = new mongoose.Schema({
    gstin: {
        type: String,
        required: true,
        ref: 'GstinMaster',
        validate: {
            validator: function(v) {
                return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(v);
            },
            message: props => `${props.value} is not a valid GSTIN!`
        }
    },
    paymentPeriod: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^(0[1-9]|1[0-2])\d{4}$/.test(v); // Format: MMYYYY
            },
            message: props => `${props.value} is not a valid payment period! Format should be MMYYYY`
        }
    },
    deducteeAmount: {
        type: Number,
        required: true,
        min: [0, 'Amount paid to deductee cannot be negative'],
        validate: {
            validator: function(v) {
                return v >= 0;
            },
            message: props => `${props.value} is not a valid amount!`
        }
    },
    igstAmount: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'IGST amount cannot be negative']
    },
    cgstAmount: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'CGST amount cannot be negative']
    },
    sgstAmount: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'SGST amount cannot be negative']
    },
    totalTaxAmount: {
        type: Number,
        required: true,
        default: 0
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: ['PENDING', 'PAID', 'PARTIALLY_PAID', 'FAILED'],
        default: 'PENDING'
    },
    paymentDate: {
        type: Date
    },
    challanNumber: {
        type: String,
        trim: true
    },
    remarks: {
        type: String,
        trim: true,
        maxLength: 500
    }
}, {
    timestamps: true,
    collection: 'tds_gst_payments'
});

// Pre-save middleware to calculate total tax amount
tdsGstPaymentSchema.pre('save', function(next) {
    this.totalTaxAmount = this.igstAmount + this.cgstAmount + this.sgstAmount;
    next();
});

// Create compound index for GSTIN and payment period
tdsGstPaymentSchema.index({ gstin: 1, paymentPeriod: 1 }, { unique: true });

// Create index for payment status and date for quick queries
tdsGstPaymentSchema.index({ paymentStatus: 1, paymentDate: 1 });

// Virtual for total payment amount including deductee amount
tdsGstPaymentSchema.virtual('totalAmount').get(function() {
    return this.deducteeAmount + this.totalTaxAmount;
});

// Instance method to check if payment is complete
tdsGstPaymentSchema.methods.isPaymentComplete = function() {
    return this.paymentStatus === 'PAID';
};

// Static method to find pending payments
tdsGstPaymentSchema.statics.findPendingPayments = function() {
    return this.find({ paymentStatus: 'PENDING' })
        .sort({ paymentPeriod: 1 });
};

// Static method to get payment summary by period
tdsGstPaymentSchema.statics.getPaymentSummary = async function(period) {
    return this.aggregate([
        {
            $match: { paymentPeriod: period }
        },
        {
            $group: {
                _id: '$paymentStatus',
                totalAmount: { $sum: '$totalTaxAmount' },
                count: { $sum: 1 }
            }
        }
    ]);
};

const TdsGstPayment = mongoose.model('TdsGstPayment', tdsGstPaymentSchema);

module.exports = TdsGstPayment; 