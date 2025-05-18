const mongoose = require('mongoose');

// Schema for purchase invoices
const purchaseInvoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true
    },
    invoiceDate: {
        type: Date,
        required: true
    },
    invoiceValue: {
        type: Number,
        required: true
    },
    placeOfSupply: {
        type: String,
        required: true
    },
    rate: {
        type: Number,
        required: true
    },
    taxableValue: {
        type: Number,
        required: true
    },
    centralTax: {
        type: Number,
        required: true
    },
    stateUtTax: {
        type: Number,
        required: true
    }
});

// Main GSTR2A schema
const gstr2aSchema = new mongoose.Schema({
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
    returnPeriod: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^(0[1-9]|1[0-2])\d{4}$/.test(v); // Format: MMYYYY
            },
            message: props => `${props.value} is not a valid return period! Format should be MMYYYY`
        }
    },
    purchaseInvoices: [purchaseInvoiceSchema],
    summary: {
        totalInvoices: {
            type: Number,
            default: 0
        },
        totalInvoiceValue: {
            type: Number,
            default: 0
        },
        totalTaxableValue: {
            type: Number,
            default: 0
        },
        totalCentralTax: {
            type: Number,
            default: 0
        },
        totalStateUtTax: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Pre-save middleware to calculate totals
gstr2aSchema.pre('save', function(next) {
    const totals = {
        invoiceValue: 0,
        taxableValue: 0,
        centralTax: 0,
        stateUtTax: 0
    };

    this.purchaseInvoices.forEach(invoice => {
        totals.invoiceValue += invoice.invoiceValue || 0;
        totals.taxableValue += invoice.taxableValue || 0;
        totals.centralTax += invoice.centralTax || 0;
        totals.stateUtTax += invoice.stateUtTax || 0;
    });

    this.summary = {
        totalInvoices: this.purchaseInvoices.length,
        totalInvoiceValue: totals.invoiceValue,
        totalTaxableValue: totals.taxableValue,
        totalCentralTax: totals.centralTax,
        totalStateUtTax: totals.stateUtTax
    };

    next();
});

// Create indexes
gstr2aSchema.index({ gstin: 1, returnPeriod: 1 }, { unique: true });
gstr2aSchema.index({ 'purchaseInvoices.invoiceDate': 1 });

const Gstr2a = mongoose.model('Gstr2a', gstr2aSchema);

module.exports = Gstr2a; 