const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' })

const doc = {
  info: {
    title: 'Halisaha API Swagger',
    description: 'Swagger docs for Halisaha API',
  },
  host: 'localhost:3000/api',
  schemes: ['http'],
}

const outputFile = './swagger.json'
const endpointsFiles = ['./src/routers/index.js']

swaggerAutogen(outputFile, endpointsFiles, doc)
