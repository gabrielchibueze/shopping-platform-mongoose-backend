const express = require("express")
const router = express.Router()
const shopController = require("../controllers/shop");
const isAuth = require("../middleware/is-authenticated");

router.get("/", shopController.getProducts);
router.get("/cart", isAuth, shopController.getCarts);
router.get("/order/checkout", isAuth, shopController.getCheckout)
router.get("/order/checkout/success", isAuth, shopController.getCheckoutSuccess)
router.get("/order/checkout/cancel", isAuth, shopController.getCheckout)

router.get("/products/:productId", shopController.getProductDetails);
router.post("/add-to-cart/:productId", isAuth, shopController.postCart);
router.post("/remove-cart/:productId", isAuth, shopController.removeCart);
router.post("/place-order", isAuth, shopController.placeOrder);
router.get("/orders", isAuth, shopController.getOrders);
router.get("/invoice/:orderId", shopController.generateInvoice)
router.get("/invoice/generated-invoice/:orderId", shopController.getOrderInvoice)

module.exports = router;