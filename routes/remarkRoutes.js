const express = require("express")

const router = express.Router()
const { addCustomRemark, getMyCustomRemarks, associateRemarkWithDelivery, getDeliveryRemarks } = require("../controllers/remarkController")
const { authenticateAny } = require("../middleware/authMiddleware")

router.post("/custom",
    authenticateAny,
    addCustomRemark
)
router.get("/my",
   authenticateAny,
    getMyCustomRemarks
)
router.post("/associate",
    authenticateAny,
    associateRemarkWithDelivery
)
router.get("/delivery/:deliveryId", 
    authenticateAny,
    getDeliveryRemarks
)

module.exports = router