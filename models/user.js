const mongoose = require("mongoose");
const Product = require("./product");
const Order = require("./order")
const mongodb = require("mongodb")
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        require: true,
    },
    email: {
        type: String,
        require: true,
    },
    resetToken: String,
    resetTokenExpiration: Date,
    password: {
        type: String,
        require: true
    },
    cart: {
        items: [{
            productId: {type: mongoose.Schema.Types.ObjectId, ref: "Product", require: true},
            quantity: {type: Number, require: true}
        }],
    },

})

userSchema.methods.addToCart = function(product){
    const productIndexInCart = this.cart.items.findIndex(cart => {
        return cart.productId.toString() === product._id.toString()
    });

    let newQuantity = 1;
    const updatedCart = [...this.cart.items]
    if(productIndexInCart >=0){
        const updatedQuantity = this.cart.items[productIndexInCart].quantity + 1
        updatedCart[productIndexInCart].quantity = updatedQuantity
    }
    else {
        updatedCart.push({
            productId: product._id,
            quantity: newQuantity
        })
    }
    
    this.cart.items = updatedCart
    return this.save()

}

userSchema.methods.getCart = function(){
    const carts =  this.cart.items

    return Product.find().then(products =>{
        const productCart = []
        for(let cart of carts){
            const filteredProducts = products.map(product =>{
                if(product._id.toString() === cart.productId.toString()){
                    productCart.push({product: product, quantity: cart.quantity})
                }
            } )
        }
        return productCart
    })
}

userSchema.methods.removeCart = function(pId){
    const prodId = new mongodb.ObjectId(pId)
    const filteredCart = this.cart.items.filter(prod => prod.productId.toString() != pId.toString() )
    this.cart.items = filteredCart;
    return this.save()
}

userSchema.methods.placeOrder = function(){
    const carts = this.cart.items
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // Months are zero-based, so we add 1
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    const orderDate = `${day < 10 ? '0' : ''}${day}/${month < 10 ? '0' : ''}${month}/${year} ${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;


    return Product.find().then(products =>{
        let orderedProducts = []
        for(let cart of carts){
            const filteredProds = products.find(prod => prod._id.toString() === cart.productId.toString());
            orderedProducts.push({product: filteredProds, quantity: cart.quantity})
        }
        return orderedProducts;
    }).then(orderedProducts =>{
        const order = new Order({
            orderDate: orderDate,
            order: orderedProducts,
            user: {
                username: this.username,
                email: this.email,
                userId: this._id
            }
        });
        return order.save();
    }).then(result =>{
        this.cart = {items: []};
        return this.save()
    });
}

userSchema.methods.getOrders = function(){
    return Order.find({"user.userId": new mongodb.ObjectId(this._id)})
    .then(orders =>{
        let orderDetails = [];
        for (let order of orders){
            orderDetails.push({_id: order._id, orderDate: order.orderDate, order: order.order})
        }
        return orderDetails
    })
}

module.exports = mongoose.model("User", userSchema)

















