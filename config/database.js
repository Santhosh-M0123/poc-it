const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect( 
            'mongodb+srv://test:testmongodb@project-cluster.mf3epkh.mongodb.net/?retryWrites=true&w=majority&appName=project-cluster'
            , {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB; 