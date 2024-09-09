const express = require('express')
const { addCart } = require('../controllers/cart.controller')
const routes = express.Router()


routes.post('/cart/:userId/add', addCart)





module.exports = routes