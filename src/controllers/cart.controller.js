const User = require("../models/user.model");


const addCart = async (req,res)=>{
    const { items,pId,name,category,price,image,description,quatity} = req.body
    const { id } = req.params
    try{
        const cart = await User.findByIdAndUpdate(
             id,
            { cart: items},
            { new: true, upsert: true }
          );
          console.log(cart);
          
          res.json(cart)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}





module.exports = {addCart}