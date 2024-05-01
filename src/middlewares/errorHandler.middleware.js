const APIError = require('../utils/errors')


const errorHandleMiddleware = (err, req, res, next) => {
    if (err instanceof APIError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message
        })
    } else {
        return res.status(500).json({
            success: false,
            message: `API Error: ${err.message}`
        })
    }
}

module.exports = errorHandleMiddleware