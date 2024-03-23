const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const { validationResult } = require("express-validator");
require("dotenv").config({path: "../uri.env"});
const fs = require("fs");
const path = require("path")

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: process.env.SENDGRID_API
    }
}))

// To Capitalize the first letter of the username
function firstCaseUpper(username){
    const inputUsername = username.split("")
    return inputUsername[0].toUpperCase()+inputUsername.slice(1,inputUsername.length).join("")
}

// Login COntrollers
exports.getLogin = (req, res, next)=>{ 
    let errorMessage = [];
    let successMessage = [];
    errorMessage.push(req.flash("error"));
    successMessage.push(req.flash("success"))

    let error;
    let success;

    if(errorMessage.flat().length >=1){
        error = errorMessage.flat().length >=1 ? errorMessage.flat()[0] : null
    } 
    if (successMessage.flat().length >=1) {
        success = successMessage.flat().length >=1 ? successMessage.flat()[0] : null
    }

    res.render("authentication/login", {
        path: "/login",
        pageTitle: "Shop 'N' Go - Login",
        error: error,
        success: success
    })
}

exports.postLogin = (req, res, next)=>{
    const email = req.body.email
    const password = req.body.password
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return   res.status(422).render("authentication/login", {
            path: "/login",
            pageTitle: "Shop 'N' Go - Login",
            error: errors.array()[0].msg,
            oldInput: {email: email, password: password}
        })

    }
    User.findOne({email: email}).then(user =>{
        if(user){
           return  bcrypt.compare(password, user.password)
            .then(loginSucess =>{
                if(loginSucess){
                    req.session.user = user
                    req.session.isLoggedIn = true,
                    req.flash("success", "Login Successful......")    
                    res.redirect("/")
                }
                else {
                    // req.flash("error", "Invalid password or email entered.")    
                    res.redirect("/login")
                }

            }).catch(err => console.log(err))
        }
    })
}
exports.postLogout = (req, res, next)=>{
    req.session.destroy((err)=>{
        res.redirect("/")
    })

}

// Sign Up Controllers
exports.getSignup = (req, res, next)=>{
    let errorMessage = [];
    errorMessage.push(req.flash("error"));
    let error;

    if(errorMessage.flat().length >=1){
        error = errorMessage.flat().length >=1 ? errorMessage.flat()[0] : null
    } 

    let successMessage = [];
    successMessage.push(req.flash("success"))
    let success;

    if (successMessage.flat().length >=1) {
        success = successMessage.flat().length >=1 ? successMessage.flat()[0] : null
    }

    res.render("authentication/signup", {
        path: "/signup",
        pageTitle: "Shop 'N' Go - Sign-up",
        error: error,
        success: success
    })
}

exports.postSignup = (req, res, next)=>{
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const comfirmPassword = req.body.comfirmPassword;

    const errors = validationResult(req)
    console.log(errors.array())
    if(!errors.isEmpty()){
        // console.log(errors.array())

        return res.status(422).render("authentication/signup", {
            path: "/signup",
            pageTitle: "Shop 'N' Go - Sign-up",
            error: errors.array()[0].msg,
            oldInput: {username: username, email: email, password: password, comfirmPassword: comfirmPassword},
            invalidPath: errors.array()

        })
    }
    return bcrypt
        .hash(password, 12).then(encryptedPassword =>{
            const user = new User({
                username: username,
                email: email,
                password: encryptedPassword,
                cart: {items: []}
            })
            return user.save()
        }).then(result =>{
            res.redirect("/login")

            return transporter.sendMail({
                to: email,
                from: "admin@gabrielegwu.com",
                subject: "Shop 'N' Go - Signup successfull!!!!",
                html: `
                <html>
                <h1>Hello ${firstCaseUpper(username)}<h1> 
                <hr>
                <p>Welcome!</p> 
                <p>You have successfully signed up to Shop 'N' Go </p>
                
                </html>`
            })
            .catch(err => console.log(err))
    })

}


exports.getResetPassword = (req, res, next)=>{
    let errorMessage = [];
    errorMessage.push(req.flash("error"));
    let error;

    if(errorMessage.flat().length >=1){
        error = errorMessage.flat().length >=1 ? errorMessage.flat()[0] : null
    } 
    
    let successMessage = [];
    successMessage.push(req.flash("success"))
    let success;

    if (successMessage.flat().length >=1) {
        success = successMessage.flat().length >=1 ? successMessage.flat()[0] : null
    }

    res.render("authentication/reset-password", {
        path: "/reset-password",
        pageTitle: "Reset Password",
        error: error,
        success: success
    })
}

exports.postResetPassword = async (req, res, next)=>{

    crypto.randomBytes(24, async (err, buffer)=>{
        if(err){
            return res.redirect("/reset-password")
        }
        const token = buffer.toString("hex");

        try {
            const user = await User.findOne({email: req.body.email})
            if(!user){
                req.flash("error", "This user email doest ot exist... Please sign up")
                return res.redirect("/reset-password")
            }

            user.resetToken = token;
            user.resetTokenExpiration = Date.now() + 3600000;
            await user.save();

            const filePath = path.join("./messages/welcomeemail.html");
            const welcomeEmail = await fs.promises.readFile(filePath, "utf8",)

            req.flash("success", "Check your email to continue your password reset")
            res.redirect("/reset-password")
            transporter.sendMail({
                to: req.body.email,
                from: "admin@gabrielegwu.com",
                subject: "Shop 'N' Go - Password reset",
                html: `<p>You have requested to reset your login password</p>
                <p>If you requested for this, <a href="http://localhost:3500/reset/${token}">Click Here</a> to proceed</p>
                ${welcomeEmail}
                `
            })

        } catch(error){
            console.error("Error:", error)
        }
    })

}

exports.getNewPassword = (req, res, next)=>{
    const token = req.params.token
    console.log(token)
    let errorMessage = [];
    errorMessage.push(req.flash("error"));
    let error;
    if(errorMessage.flat().length >=1){
        error = errorMessage.flat().length >=1 ? errorMessage.flat()[0] : null
    } 

    let successMessage = [];
    successMessage.push(req.flash("success"))
    let success;
    if (successMessage.flat().length >=1) {
        success = successMessage.flat().length >=1 ? successMessage.flat()[0] : null
    }

    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
    .then(user =>{
        if(!user){
            req.flash("error", "No valid reset token found")
            return res.redirect("/")
        }
        res.render("authentication/new-password", {
            pageTitle: "Shop 'N' Go - Change password",
            error: error,
            success: success,
            userId: user._id,
            resetToken: token
        })    
    
    }).catch(err => console.log(err))
};

exports.postNewPassword = (req, res, next)=>{
    const userId = req.body.userId;
    const token = req.body.resetToken;
    const newPassword = req.body.newpassword

    let thisUser;

    User.findOne({resetToken: token, _id: userId, resetTokenExpiration: {$gt: Date.now()}})

    .then(user =>{
        thisUser = user

        return bcrypt.hash(newPassword, 12)
    }).then(hashedPassword=>{
        thisUser.password = hashedPassword;
        thisUser.resetToken = undefined;
        thisUser.resetTokenExpiration = undefined;
        return thisUser.save()
    }).then(result =>{

        req.flash("success", "You have successfully changed your password")
        res.redirect("/login")
        transporter.sendMail({
            to: thisUser.email,
            from: "admin@gabrielegwu.com",
            subject: "Shop 'N' Go - Successful password reset",
            html: `<p>Hello ${firstCaseUpper(thisUser.username)}</p>
            <p>You have successfully reset you account password</p>
            <p>If you did not request for this change, <a href="http://localhost:3500/login">contact Shop 'N' Go</a> immediately for an action to be taken.</p>
                    
            `
        })
    })

.catch(err => console.log(err))
};