const express = require('express');
const app = express();
require('dotenv').config()
require('./src/config/database')
const port = process.env.PORT
const router = require('./src/routers')
const errorHandlerMiddleware = require('./src/middlewares/errorHandler.middleware')

app.use(express.json());


app.get('/', (req, res) => {
    res.status(200).json({ 'message': 'index' })
})

// ROUTES
app.use('/api', router)


//Error Middleware
app.use(errorHandlerMiddleware)

app.listen(port, () => {
    console.log(`Server started on port ${port}.`)
})
