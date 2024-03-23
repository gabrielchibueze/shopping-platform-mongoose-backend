const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    orderDate: {
        type: String, 
        require: true
    },
    order: [
        {
            product: {type: Object, require: true},
            quantity: {type: Number, require: true}
        }
    ],
    
    user: {    
        username: {
            type: String,
            require: true
        },
        email: {
            type: String,
            require: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            require: true
        }
    }

})

module.exports = mongoose.model("Order", orderSchema)