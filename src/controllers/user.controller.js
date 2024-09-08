const User = require("../models/user.model")
const jwt = require("jsonwebtoken")
const seret = process.env.SERET
const bcrypt = require('bcryptjs')
const registerUser = async (req, res)=>{
    try {
        let {firstName, lastName, email, password, phoneNumber, role} = req.body
        const user = await User.create({firstName, lastName, email, password, phoneNumber, role})
        res.status(201).json({message: 'User registered success', user: user, status:true})
    }catch (err) {
        res.status(500).json({message: 'Error occured while registring user', error: err.message, status:false})
    }
}

const loginUser = async (req, res)=>{
    try{
        let {email, password} = req.body
        const user = await User.findOne({email: email})
        console.log(user)
        if(user){
            const isValidPassword = await bcrypt.compare(password, user.password)
            if (isValidPassword){
                const token = jwt.sign({user}, seret, {expiresIn: '7h'})
                res.status(200).json({message:'User loggin in', user:user, status:true, token:token, isValid:true})
            }else{
                res.status(404).json({message:'incorrect password', isValid:false, status:true})
            }
        }
        else {
            res.status(404).json({message: 'User not found', status:true})
        }  
    }
    catch(err){
        res.status(500).json({message: 'Error loging in', error: err.message, status:false})
    }
}





module.exports = {registerUser, loginUser}