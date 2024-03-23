// const Carts = require("../models/cart");
require("dotenv").config({path: "../uri.env"});
const Product = require("../models/product");
const Order = require("../models/order")
const mongodb = require("mongodb")
const User = require("../models/user");
const fs = require("fs");
const puppeteer = require("puppeteer")
const path = require("path");
const stripe = require("stripe")(process.env.STRIP_SECRET_KEY)
const PdfDocument = require("pdfkit");
const session = require("express-session");

const CONTENT_PER_PAGE = 4

exports.getProducts = async (req, res, next)=>{
    const currentPage = +req.query.page || 1
    let totalItems
    Product.find().countDocuments().then(numberOfProducts =>{
        totalItems = numberOfProducts
        return Product.find()
        .skip((currentPage - 1) * CONTENT_PER_PAGE)
        .limit(CONTENT_PER_PAGE)    
    })
    .then((products) =>{
        res.render("shop/products", {
            prods: products, 
            pageTitle: "My Shop",
            path: "/",
            totalProducts: totalItems,
            totalItems: totalItems,
            contentPerPage: CONTENT_PER_PAGE,
            firstPage: 1,
            currentPage: currentPage,
            previousPage: currentPage - 1,
            nextPage: currentPage + 1,
            hasNextPage: CONTENT_PER_PAGE * currentPage < totalItems,
            hasPreviousPage: currentPage > 1,
            lastPage: Math.ceil(totalItems/CONTENT_PER_PAGE)
        });
    }).catch(err => console.log(err))
}

exports.getProductDetails = (req, res, next)=>{
    const prodId = req.params.productId
    Product.findById(prodId).then(product =>{
        res.render("shop/product-details", {
            prods: product, 
            path: "/",
        } )
    }).catch(err =>console.log(err))
}


exports.getCarts = (req, res, next)=>{
    if(req.session.isLoggedIn){
        req.user.getCart()
        .then(carts =>{
            const totalPrice = carts.reduce((total, current) =>{
                return total + (parseFloat(current.product.price) * current.quantity)
            }, 0).toFixed(2)
            res.render("shop/cart", {
                prod: carts, 
                totalPrice: totalPrice,  
                path: "/cart", 
                pageTitle: "Shopping Cart",
            } )
        })
        .catch(err => console.log(err))    
    }
    else{
        res.redirect("/")
    }
};

exports.getCheckout = (req, res, next)=>{
    let products;
    let totalPrice = 0;
    req.user
    .populate("cart.items.productId")
    .then(user =>{
        products = user.cart.items;
        products.forEach(product =>{
            totalPrice += product.quantity * product.productId.price
        });

        return stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: products.map(product => {
                return {
                    price_data: {
                        currency: "gbp",
                        unit_amount: Math.round(product.productId.price * 100), // Convert price to cents
                        product_data: {
                            name: product.productId.name,
                            description: product.productId.description,
                        },
                    },
                    quantity: product.quantity,
                };
            }),
            success_url: req.protocol + "://" + req.get("host") + "/order/checkout/success",
            cancel_url: req.protocol + "://" + req.get("host") + "/order/checkout/cancel"
        });
            })
    .then(session =>{
        console.log(session)
        res.render("shop/checkout", {
            prod: products, 
            totalPrice: totalPrice,  
            path: "/checkout", 
            pageTitle: "Order checkout",
            session: session.id
        } )    
    })
};
exports.getCheckoutSuccess = (req, res, next)=>{
    if(req.session.isLoggedIn){
        req.user.placeOrder()
        .then(orderSuccess =>{
            req.user.getOrders().then(orders =>{
                res.render("shop/orders", {
                    prod: orders, 
                    path: "/admin/orders", 
                    pageTitle: "Your Orders",
                } )
            })    
        })
        .catch(err => console.log(err))
    }

}

exports.postCart = (req, res, next)=>{
    const prodId = req.params.productId ||req.body.productId;
    Product.findById(prodId).then(product =>{ 
        req.user.addToCart(product).then(result =>{
            res.status(200).json({ message: "Product added to cart"})
        })
    })

}
exports.removeCart = (req, res, next)=>{
    const prodId = req.params.productId
    req.user.removeCart(prodId)
    .then(result => {
        res.redirect("/cart");
    }).catch(err => console.log(err))
}

exports.placeOrder = (req, res, next)=>{
    req.user.placeOrder().then(result => {
        res.redirect("/orders")
    })
    .catch(err => console.log(err))
}

exports.getOrders = (req, res, next)=>{

    if(req.session.isLoggedIn){
        req.user.getOrders().then(orders =>{
            res.render("shop/orders", {
                prod: orders, 
                path: "/admin/orders", 
                pageTitle: "Your Orders",
            } )
        })
    
    }
    else {
        res.redirect("/")
    }
    
}
exports.generateInvoice = async (req, res, next)=>{
    try {
        const orderId = req.params.orderId
        const order = await Order.findById(orderId)
        if(!order){
            return next(new Error("No success orders found"))
        }
        // if(order.user.userId.toString() !== req.session.user._id.toString()){
        //     console.log(order.user.userId.toString() !== req.session.user._id.toString())
        //     return next(new Error("unauthorised access"))
        // }

        let totalPrice = 0
        order.order.map(order =>{
            totalPrice += order.product.price * order.quantity
        })
        console.log(order)
        
        const orderUser = order.user.username.split("")
        const username = orderUser[0].toUpperCase() + orderUser.slice(1, orderUser.length).join("")
        const invoiceName = "invoice-" + orderId + ".pdf"

        res.render("shop/order-invoice", {
            order: order,
            pageTitle: `Order invoice - ${invoiceName}`,
            totalPrice: totalPrice,
            userName: username
        })
        // res.redirect(`/invoice/generated-invoice/${orderId}`)
    
    }
    catch (err){
        next(err)
    }

}

exports.getOrderInvoice = async (req, res, next)=>{
    try {
        const orderId = req.params.orderId;
        
        const filePath = `http://localhost:3500/invoice/${orderId}`;
        const invoiceName = "invoice-" + orderId + ".pdf"
        const invoicePath = path.join("data", "invoices", invoiceName) 


        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", 'inline; filename="' + invoiceName + ' "')
        await generatePDF(invoicePath, filePath);
        const fileStream = fs.createReadStream(invoicePath)
        fileStream.pipe(res)
    }
    catch (err){
        next(err)
    }

}

    async function generatePDF(invoicePath, filePath) {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(filePath);
        await page.pdf({ path: invoicePath, format: 'A4' });
        await browser.close();
    }