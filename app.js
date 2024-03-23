require("dotenv").config({path: "./uri.env"})
const express = require("express")
const mongodb = require("mongodb")
const mongoose = require("mongoose")
const session = require("express-session")
const MongoDBStore = require("connect-mongodb-session")(session)
const multer = require("multer")
const csrf = require("csurf");
const flash = require("connect-flash")
const path = require("path");
const fs = require("fs")


const store = new MongoDBStore({
    uri: process.env.MONGODB_URI,
    collection: "sessions"
})

const fileStorage = multer.diskStorage({
    destination: (req, file, cb)=>{
        const uploadDir = path.join("./data/images")
        fs.mkdir(uploadDir, { recursive: true }, (err)=>{
            if(err){
                console.log(err)
            }
            cb(null, uploadDir)
        }) 
    },
    filename: (req, file, cb)=>{
        const randomNums = `file-${Math.floor(Math.random() * 1000000)}`
        cb(null, (randomNums + "-" + file.originalname))
    }
})
const fileFilter = (req, file, cb)=>{
    if(file.mimetype === "image/png" || file.mimetype === "image/jpeg" || file.mimetype === "image/jpg"){
        cb(null, true)
    } 
    else {
        cb(null, false)
    }
}

const app = express()
const bodyParser = require("body-parser")

const adminRoutes = require("./Routes/admin")
const shopRoutes = require("./Routes/shop")
const authRoutes = require("./Routes/auth")
const errorController = require("./controllers/error")

const User = require("./models/user")
const csrfProtection = csrf();

app.set("view engine", "pug")
app.set("views", "views")

app.use(bodyParser.urlencoded({extended: false}))
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single("image"))
app.use(express.static(path.join(__dirname, "public")))
app.use("/images", express.static(path.join(__dirname, "data", "images")))
app.use(session({
    secret: "my secret-cookies", 
    resave: false, 
    saveUninitialized: false, 
    store: store
}));

app.use(csrfProtection)
app.use(flash())

app.use((req, res, next)=>{
    if(!req.session.user){
        return next()
    }
    User.findById(req.session.user._id)
    .then(user =>{
        req.user = user
        next();
    }).catch(err => console.log(err));
})

app.use((req, res, next)=>{
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    if(req.session.isLoggedIn){
        const username = req.session.user.username.split("")
        const name = username[0].toUpperCase() + username.slice(1, username.length).join("")
        res.locals.username = name
    }
    next()
})

app.use(authRoutes)
app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(errorController.error404);

mongoose
.connect(process.env.MONGODB_URI)
.then(result =>{
    User.findOne().then(user =>{
        if(!user){
            const user = new User ({
                username: "gabbyraw",
                email: "gabbyraw@gmail.com",
                password: "gabbygabbyraw",
                cart: { items: []}
            })
            user.save()
        }

    })  
    app.listen(3500)

})
.catch(err => console.log(err))
