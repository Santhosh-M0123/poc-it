const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // MongoDB errors
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        return res.status(500).json({
            error: 'Database error occurred',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation error',
            details: Object.values(err.errors).map(e => e.message)
        });
    }

    // Default error
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = errorHandler; 