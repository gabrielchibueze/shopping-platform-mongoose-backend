const express = require("express");
const router = express.Router();
const productController = require("../controllers/product");
const { body, check } = require("express-validator")
const isAuth = require("../middleware/is-authenticated")

const addAndEdit = [
    body("name", "The product name should have between 3 and 20 characters").isLength({min: 3, max: 20}).trim(),
    body("description", "Product description should be between 10  and 150 characters long").isLength({min: 10, max: 150}).trim(),
    body("price", "invalid format for product amount entered").isFloat(),
];

router.get("/add-product",  isAuth, productController.getAddProduct);

router.post("/add-product", isAuth, addAndEdit, productController.postAddProduct
);

router.get("/products", isAuth, productController.getProductList)
router.get("/edit-product/:productId", isAuth, productController.editProduct)
router.post("/save-edited-product/:productId", isAuth, addAndEdit, productController.saveEditedProduct)
router.delete("/products/:productId", isAuth, productController.deleteProduct)

module.exports = router
