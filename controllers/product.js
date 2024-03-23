const mongodb = require("mongodb");
const Product = require("../models/product");
const User = require("../models/user");
const { validationResult } = require("express-validator");
const fileHelper = require("../utils/deleteFileHelper")
const CONTENT_PER_PAGE = 4


exports.getAddProduct = (req, res, next)=>{
    let successMessage = [];

    successMessage.push(req.flash("success"))
    let success;

    if (successMessage.flat().length >=1) {
        success = successMessage.flat().length >=1 ? successMessage.flat()[0] : null
    }

    res.render("admin/add-product", {
        pageTitle: "Add Product", 
        path: "/add-product",
        success: success,
        invalidPath: []
});
};

exports.postAddProduct = (req, res, next)=>{
    const name = req.body.name;
    const description = req.body.description;
    const price = req.body.price;
    const image = req.file;
    const userId = req.user._id;

    const errors = validationResult(req)
    
    if(!image){
        return res.status(422).render("admin/add-product", {
            pageTitle: "Add Product", 
            path: "/add-product", 
            error: "You have not entered an invalid image format (PNG, JPG and JPEG)",
            oldInput: {name: name, description: description, price: price},
            invalidPath: []
        });
    }
    const imageUrl = image.path
    if(!errors.isEmpty()){
        return res.status(422).render("admin/add-product", {
            pageTitle: "Add Product", 
            path: "/add-product", 
            error: errors.array()[0].msg,
            oldInput: {name: name, description: description, price: price},
            invalidPath: errors.array()
        });
    }

    const product = new Product({
        name: name,
        description: description, 
        price: price, 
        imageUrl: imageUrl,
        userId: userId
    })
    product.save().then(result =>{
        console.log("product created for you")
        console.log(result)
    }).catch(err => console.log(err))
    req.flash("success", "Product added successfully")
    res.redirect("/admin/add-product")

};

exports.getProductList = (req, res, next)=>{

    const currentPage = +req.query.page || 1
    let totalItems
    Product.find({userId: req.user._id}).countDocuments().then(numberOfProducts =>{
        totalItems = numberOfProducts
        return Product.find({userId: req.user._id})
        .skip((currentPage - 1) * CONTENT_PER_PAGE)
        .limit(CONTENT_PER_PAGE)    
    
    })
    .then((products) =>{
        res.render("admin/products", {
            prods: products, 
            pageTitle: "All Products", 
            path: "/admin/products",
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

        })
    }).catch(err=>console.log(err))
};

exports.editProduct = (req, res, next)=>{
    const prodId = req.params.productId

    let successMessage = [];

    successMessage.push(req.flash("success"))
    let success;

    if (successMessage.flat().length >=1) {
        success = successMessage.flat().length >=1 ? successMessage.flat()[0] : null
    }

    Product.findById(prodId).then(product =>{
        console.log(product)
        res.render("admin/edit-product", {
            path: "/edit-product", 
            prods: product, 
            pageTitle: "Edit Product",
            invalidPath: [],

        })
    })
}

exports.saveEditedProduct = (req, res, next)=>{
    const prodId = req.params.productId
    const name = req.body.name;
    const description = req.body.description;
    const price = req.body.price;
    const image = req.file;
    const userId = req.user._id
    
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(422).render("admin/edit-product", {
            pageTitle: "Add Product", 
            path: "/edit-product", 
            editing: true,
            error: errors.array()[0].msg,
            oldInput: {name: name, _id: prodId, description: description, price: price},
            invalidPath: errors.array()
        });
    }

    console.log(image)

   Product.findById(prodId).then(product =>{
    if(product.userId.toString() !== userId.toString()){
        return res.redirect("/")
    }
        product.name = name
        product.description = description
        product.price = price
        if(image){
            fileHelper.deleteFile(product.imageUrl)
            product.imageUrl = image.path
        }
        product.userId - userId
       
       return product.save().then(result =>{
        res.redirect("/admin/products")
       })
    
   })
   .catch(err => {
    console.log(err)
   })

}

exports.deleteProduct = (req, res, next)=>{
    const prodId = req.params.productId
    Product.findById(prodId).then(product =>{
        if(product){
            fileHelper.deleteFile(product.imageUrl)
        }
    })
    Product.deleteOne({_id: prodId, userId: req.user._id}).then(result =>{
        res.status(200).json({ message: "Product deleted successfully." })
    })
    .catch(err => res.status(500).json({ message: "Production deletion failed." }))
}
