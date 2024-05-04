const APIError = require('../utils/error.util')


const errorHandleMiddleware = (err, req, res, next) => {
    if (err instanceof APIError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message
        })
    } else {
        return res.status(500).json({
            success: false,
            message: `Internal Error: ${err.message}`
        })
    }
}

module.exports = errorHandleMiddleware