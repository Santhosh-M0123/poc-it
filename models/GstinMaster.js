const mongoose = require('mongoose');

const gstinMasterSchema = new mongoose.Schema({
    gstin: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(v);
            },
            message: props => `${props.value} is not a valid GSTIN!`
        }
    },
    legalName: {
        type: String,
        required: true
    },
    stateCode: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return v === '33'; // For Tamil Nadu
            },
            message: props => `${props.value} is not a valid state code! Only 33 (Tamil Nadu) is allowed.`
        },
        default: '33'
    },
    panNumber: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
            },
            message: props => `${props.value} is not a valid PAN number!`
        }
    },
    entityType: {
        type: String,
        enum: ['PLC', 'LLC', 'Ltd', 'Inc', 'Group', 'Sons', 'Other'],
        default: 'Other'
    }
}, {
    timestamps: true, // This will add createdAt and updatedAt fields
    collection: 'gstin_master'
});

// Middleware to extract PAN from GSTIN before saving
gstinMasterSchema.pre('save', function(next) {
    if (this.isModified('gstin')) {
        this.panNumber = this.gstin.substring(2, 12);
    }
    // Extract entity type from legal name
    const legalName = this.legalName.toLowerCase();
    if (legalName.includes('plc')) this.entityType = 'PLC';
    else if (legalName.includes('llc')) this.entityType = 'LLC';
    else if (legalName.includes('ltd')) this.entityType = 'Ltd';
    else if (legalName.includes('inc')) this.entityType = 'Inc';
    else if (legalName.includes('group')) this.entityType = 'Group';
    else if (legalName.includes('sons')) this.entityType = 'Sons';
    else this.entityType = 'Other';
    
    next();
});

// Create indexes
gstinMasterSchema.index({ panNumber: 1 });
gstinMasterSchema.index({ stateCode: 1 });

const GstinMaster = mongoose.model('GstinMaster', gstinMasterSchema);

module.exports = GstinMaster; 