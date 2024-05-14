const express = require('express')
require('express-async-errors')
require('dotenv').config()
require('./src/config/database')
const router = require('./src/routers')
const errorHandlerMiddleware = require('./src/middlewares/errorHandler.middleware')
const swaggerUi = require('swagger-ui-express')
const swaggerFile = require('./swagger.json')

const port = process.env.PORT

const app = express()

app.use(express.json())

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile))

app.get('/', (req, res) => {
  res.status(200).json({ message: 'index' })
})

// ROUTES
app.use('/api', router)

//Error Middleware
app.use(errorHandlerMiddleware)

app.listen(port, () => {
  console.log(`Server started on port ${port}.`)
})
