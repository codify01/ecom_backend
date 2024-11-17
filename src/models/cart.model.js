const mongoose = require('mongoose')


const cartSchema = new mongoose.Schema({
    cart: {
      userId: String,       
      productId: Number,
      quantity:Number,
      createdAt: {
        type: Date,
        default: Date.now
      },    
      updatedAt: {
        type: Date,

      } 
    }
  }
  )

  const Cart = mongoose.model('carts', cartSchema)

  module.exports = Cart