const express = require('express');
const router = express.Router();
const Driver = require('../../models/Driver');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { isAdmin, protectAdmin } = require('../../middleware/authMiddleware');

// GET: All pending drivers for approval
router.get('/pending', protectAdmin, isAdmin, async (req, res) => {
    try {
        const drivers = await Driver.find({
            profileStatus: 'pending_verification'
        })
            .select('name phone licenseNumber vehicleNumber documents profileImage createdAt')
            .sort({ createdAt: -1 });

        return successResponse(res, 'Pending drivers fetched', { drivers });
    } catch (error) {
        return errorResponse(res, 'Server error', 500);
    }
});

// POST: Approve Driver
router.post('/approve/:driverId', protectAdmin, async (req, res) => {
    try {
        const { driverId } = req.params;

        const driver = await Driver.findById(driverId);
        if (!driver) {
            return errorResponse(res, 'Driver not found', 404);
        }

        if (!['pending_verification', 'rejected'].includes(driver.profileStatus)) {
            return errorResponse(res, 'Only pending or rejected drivers can be approved', 400);
        }
        driver.profileStatus = 'approved';
        driver.isVerified = true;
        driver.isAvailable = true;
        await driver.save();

        // TODO: Send Push Notification / SMS - "Your account has been approved!"

        return successResponse(res, 'Driver approved successfully!', {
            driverId: driver._id,
            name: driver.name,
            phone: driver.phone
        });

    } catch (error) {
        return errorResponse(res, 'Approval failed', 500);
    }
});

// POST: Reject Driver
router.post('/reject/:driverId', protectAdmin, async (req, res) => {
    try {
        const { driverId } = req.params;
        const { rejectionReason } = req.body;

        if (!rejectionReason) {
            return errorResponse(res, 'Rejection reason is required', 400);
        }

        const driver = await Driver.findById(driverId);
        if (!driver) {
            return errorResponse(res, 'Driver not found', 404);
        }

        driver.profileStatus = 'rejected';
        driver.rejectionReason = rejectionReason;
        await driver.save();

        // TODO: Send SMS/Push - "Your registration was rejected: " + reason

        return successResponse(res, 'Driver rejected', {
            driverId: driver._id,
            reason: rejectionReason
        });

    } catch (error) {
        return errorResponse(res, 'Rejection failed', 500);
    }
});

module.exports = router;