const express = require("express")
const {isDriver, authenticateDriver} = require("../../middleware/authMiddleware")
const { getVehicle } = require("../../controllers/Driver/Homepage")

const router = express.Router()

router.get(
    "/vehicle",
    authenticateDriver,
    isDriver,
    getVehicle
)

module.exports = router