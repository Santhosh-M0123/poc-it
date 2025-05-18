const mongoose = require('mongoose');

const tdsGstinSchema = new mongoose.Schema({
    tdsGstin: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}2Z[0-9A-Z]{1}$/.test(v);
            },
            message: props => `${props.value} is not a valid TDS GSTIN!`
        }
    },
    legalName: {
        type: String,
        required: true
    },
    linkedPan: {
        type: String,
        required: true,
        ref: 'GstinMaster',
        validate: {
            validator: function(v) {
                return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
            },
            message: props => `${props.value} is not a valid PAN number!`
        }
    }
}, {
    timestamps: true,
    collection: 'tds_gstin'
});

// Create index on linkedPan
tdsGstinSchema.index({ linkedPan: 1 });

// Virtual populate to get related GSTIN master details
tdsGstinSchema.virtual('gstinMasterDetails', {
    ref: 'GstinMaster',
    localField: 'linkedPan',
    foreignField: 'panNumber',
    justOne: true
});

const TdsGstin = mongoose.model('TdsGstin', tdsGstinSchema);

module.exports = TdsGstin; 