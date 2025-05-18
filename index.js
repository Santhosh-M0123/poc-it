const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const gstinRoutes = require('./routes/gstinRoutes');
const gstr2aRoutes = require('./routes/gstr2aRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const sampleDataRoutes = require('./routes/sampleDataRoutes');
const { loadGstinData } = require('./utils/dataLoader');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://atom-tds.vercel.app', /\.vercel\.app$/]
        : 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', gstinRoutes);
app.use('/api/gstr2a', gstr2aRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/sample', sampleDataRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Catch-all route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use(errorHandler);

// Initialize database and start server
async function init() {
    try {
        // Connect to MongoDB
        await connectDB();
        
        // Load initial data if needed (commented out by default)
        // const result = await loadGstinData();
        // console.log('Data loading summary:', result);
        
        // Start the server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log('Environment:', process.env.NODE_ENV);
        });
        
    } catch (error) {
        console.error('Initialization error:', error.message);
        process.exit(1);
    }
}

// Run the initialization
init();

// // Example usage
// async function example() {
//     try {
//         // Create a GSTIN Master entry
//         const gstinMaster = await GstinMaster.create({
//             gstin: '33DABTE7825N1ZH',
//             legalName: 'Ball-Weber',
//             stateCode: '33'
//             // panNumber will be automatically extracted from GSTIN
//             // entityType will be automatically determined from legalName
//         });

//         // Create a TDS GSTIN entry
//         const tdsGstin = await TdsGstin.create({
//             tdsGstin: '33DABTE7825N2Z0',
//             legalName: 'Martinez-Black',
//             linkedPan: 'DABTE7825N'
//         });

//         // Query with population example
//         const tdsWithMaster = await TdsGstin.findOne({ tdsGstin: '33DABTE7825N2Z0' })
//             .populate('gstinMasterDetails');

//         console.log('GSTIN Master:', gstinMaster);
//         console.log('TDS GSTIN with Master details:', tdsWithMaster);

//     } catch (error) {
//         console.error('Error:', error.message);
//     }
// }

// example();