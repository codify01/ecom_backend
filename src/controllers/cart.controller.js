const Cart = require("../models/cart.model");


const addCart = async (req,res)=>{
    const { userId,productId,quantity} = req.body
    const { id } = req.params
    try{
        const cart = await User.create(userId,productId,quantity)
          console.log(cart);
          
          res.json(cart)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}





module.exports = {addCart}