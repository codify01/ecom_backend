const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')



const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
      },
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
      },
      password: {
        type: String,
        required: true,
        minlength: 6,
        maxlength: 12
      },
      phoneNumber: {
        type: String,
        required: true,
        trim: true,
      },
      addresses: [
        {
          street: { type: String, required: true },
          city: { type: String, required: true },
          state: { type: String, required: true },
          country: { type: String, required: true },
          zipCode: { type: String, required: true }
        }
      ],
      role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
      },
      cart: [],
      orders: [
        {
          orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
          }
        }
      ],
      createdAt: {
        type: Date,
        default: Date.now
      },
      updatedAt: {
        type: Date
      }
})

userSchema.pre("save", function(next){
    bcrypt.hash(this.password, 10)
    .then((hashed)=>{
        this.password = hashed
        next()
    }).catch((err)=>{
        console.log(err.message)  
    })
})

const User = mongoose.model('users', userSchema)


module.exports = User