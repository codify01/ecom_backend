const express = require('express');
const mongoose = require('mongoose')
require('dotenv').config()
const productsRoute = require('./src/routes/product.route');
const userRouter = require('./src/routes/user.route');
const cors = require('cors');
const cartRoutes = require('./src/routes/cart.route');
const app = express()
const URI = process.env.URI



app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cors('*'))


// routes
app.use('/api', userRouter)
app.use('/api', productsRoute)
app.use('/api', cartRoutes)







mongoose.connect(URI)
.then(()=>{
    app.listen(8000, ()=>{
        console.log('server running and DB connected success')   
    })
})
.catch((err)=>{
    console.log('failed to connect to database',err)
})
