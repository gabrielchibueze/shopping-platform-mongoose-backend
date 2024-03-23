const express = require("express");
const authController = require("../controllers/auth");
const bcrypt = require("bcryptjs")
const { check, body } = require("express-validator");
const User = require("../models/user");
const router = express.Router();

router.get("/login", authController.getLogin);
    router.post("/login", 
    body("email", "Invalid email syntax").isEmail(),
    body("password").custom((value, {req})=>{
        return User.findOne({email: req.body.email}).then(user =>{
            if(!user){
                return Promise.reject("Invalid email or password entered")
            }
            return bcrypt.compare(value, user.password).then(passwordmatch=>{
                if(!passwordmatch){
                    return Promise.reject("Invalid email or password entered")
                }
            })
        })
    }),
    authController.postLogin
);

router.get("/logout", authController.postLogout);

router.get("/signup", authController.getSignup);
router.post("/signup", 
    check("email", ).isEmail().normalizeEmail()
        .withMessage("Please enter a valid email")
        .custom((value, { req })=>{
            return User.findOne({email: value}).then(user =>{
                if(user){
                    return Promise.reject("This user email account is already existing")
                }
            })
        }).trim(),
    
        body("password", "Hint: Password must have min. of 5 and max. of 12 characters and must be alphanumeric").isLength({min: 5, max: 12}).isAlphanumeric().trim(),
    body("comfirmPassword").trim().custom((value, {req})=>{
        if(value !== req.body.password){
            throw new Error("Passwords have to match")
        }
        return true
    }),
    authController.postSignup
    
);

router.get("/reset-password", authController.getResetPassword);
router.post("/reset-password", authController.postResetPassword)

router.get("/reset/:token", authController.getNewPassword)
router.post("/update-password", authController.postNewPassword)

module.exports = router;