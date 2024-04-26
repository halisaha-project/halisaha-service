const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')

const User = require('../models/userModel')


//READ ALL
router.get('/', async (req, res) => {
    const users = await User.find({})
    res.json(users)
})

//READ BY ID
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
        if (user) {
            res.json(user)
        } else {
            res.status(404).json({ error: 'Not Found', message: 'User not found.' });
        }
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Database Error', message: error.message });
    }
})

//CREATE
router.post('/', async (req, res) => {

    if (req.body.hasOwnProperty('password')) {
        req.body.password = await bcrypt.hash(req.body.password, 10)
    }

    try {
        const _ = User(req.body);
        const newUser = await _.save()
        res.json(newUser)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Database Error', message: error.message });
    }
})

//UPDATE
router.patch('/:id', async (req, res) => {
    delete req.body.createdAt
    delete req.body.updatedAt

    if (req.body.hasOwnProperty('password')) {
        req.body.password = await bcrypt.hash(req.body.password, 10)
    }

    try {
        const updatedUser = await User.findByIdAndUpdate({ _id: req.params.id }, req.body, { new: true, runValidators: true })
        if (updatedUser) {
            res.json(updatedUser)
        } else {
            res.status(404).json({ error: 'Not Found', message: 'User not found.' });
        }
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Database Error', message: error.message });
    }

})

//DELETE
router.delete('/:id', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id)
        if (deletedUser) {
            res.json(deletedUser)
        } else {
            res.status(404).json({ error: 'Not Found', message: 'User not found.' });
        }
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Database Error', message: error.message });
    }
})


//LOGIN
router.post('/login', async (req, res) => {

    try {
        const user = await User.login(req.body.email, req.body.password)
        res.json(user)
    } catch (error) {
        if (error.message === "InvalidInfo") {
            res.status(400).json({ error: 'Invalid Information', message: 'Invalid email or password.' });
        } else {
            console.error(error)
            res.status(500).json({ error: 'Database Error', message: error.message });
        }
    }

})



module.exports = router