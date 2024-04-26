const express = require('express');
require('./database/databaseConnection')

//ROUTES
const userRouter = require('./router/userRouter')


const app = express();
app.use(express.json());



//USERS
app.use('/api/users', userRouter)



app.get('/', (req, res) => {
    res.status(200).json({ 'message': 'index' })
})



app.listen(3000, () => {
    console.log("Server launched on port 3000.")
})
