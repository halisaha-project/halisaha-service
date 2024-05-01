class Response {
    constructor(data = null, status = 200, message = null,) {
        this.data = data
        this.message = message
        this.status = status
    }

    success(res) {
        return res.status(this.status).json({
            success: true,
            data: this.data,
            message: this.message ?? "Operation is successful."
        })
    }
}

module.exports = Response