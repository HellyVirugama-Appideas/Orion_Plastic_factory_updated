const CustomerFeedback = require('../models/CustomerFeedback');
const Delivery = require('../models/Delivery');
const Driver = require('../models/Driver');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Submit Feedback (Customer)
// controllers/feedbackController.js → YE PURA FUNCTION REPLACE KAR DO

exports.submitFeedback = async (req, res) => {
  try {
    let { deliveryId, rating, categories, comment, issues, wouldRecommend } = req.body;

    // 1. Basic validation
    if (!deliveryId || !rating) {
      return errorResponse(res, 'deliveryId and rating are required', 400);
    }

    if (rating < 1 || rating > 5) {
      return errorResponse(res, 'Rating must be between 1 and 5', 400);
    }

    // 2. Fix: Trim & validate ObjectId format
    deliveryId = deliveryId.trim();
    if (!/^[0-9a-fA-F]{24}$/.test(deliveryId)) {
      return errorResponse(res, 'Invalid deliveryId format', 400);
    }

    // 3. Find delivery
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return errorResponse(res, 'Delivery not found', 404);
    }

    // 4. Verify customer ownership
    if (delivery.customerId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized: This is not your delivery', 403);
    }

    // 5. Check delivery status
    if (delivery.status !== 'delivered') {
      return errorResponse(res, 'Feedback can only be given for delivered orders', 400);
    }

    // 6. Check if already submitted
    const existing = await CustomerFeedback.findOne({ deliveryId });
    if (existing) {
      return errorResponse(res, 'You have already submitted feedback for this delivery', 400);
    }

    // 7. Create feedback
    const feedback = await CustomerFeedback.create({
      deliveryId,
      customerId: req.user._id,
      driverId: delivery.driverId,
      rating: Number(rating),
      categories: categories || {},
      comment: comment || '',
      issues: issues || [],
      wouldRecommend: wouldRecommend ?? null
    });

    // 8. Update Driver Rating
    if (delivery.driverId) {
      const allFeedbacks = await CustomerFeedback.find({ driverId: delivery.driverId });
      const avgRating = allFeedbacks.reduce((sum, f) => sum + f.rating, 0) / allFeedbacks.length;
      await Driver.findByIdAndUpdate(delivery.driverId, {
        rating: parseFloat(avgRating.toFixed(2)),
        totalRides: allFeedbacks.length
      });
    }

    return successResponse(res, 'Thank you! Feedback submitted successfully', {
      feedbackId: feedback._id,
      rating: feedback.rating,
      comment: feedback.comment
    }, 201);

  } catch (error) {
    console.error('Submit Feedback Error:', error.message);
    
    // Special handling for CastError
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid deliveryId format. Please check and try again.', 400);
    }

    return errorResponse(res, 'Failed to submit feedback', 500);
  }
};

// Get Feedback by Delivery
exports.getFeedbackByDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const feedback = await CustomerFeedback.findOne({ deliveryId })
      .populate('customerId', 'name email')
      .populate({
        path: 'driverId',
        populate: { path: 'userId', select: 'name' }
      });

    if (!feedback) {
      return errorResponse(res, 'No feedback found for this delivery', 404);
    }

    return successResponse(res, 'Feedback retrieved successfully', { feedback });

  } catch (error) {
    console.error('Get Feedback Error:', error);
    return errorResponse(res, 'Failed to retrieve feedback', 500);
  }
};

// Get Driver Feedbacks
exports.getDriverFeedbacks = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const feedbacks = await CustomerFeedback.find({ driverId })
      .populate('customerId', 'name')
      .populate('deliveryId', 'trackingNumber orderId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CustomerFeedback.countDocuments({ driverId });

    // Calculate statistics
    const avgRating = feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
      : 0;

    const ratingDistribution = {
      5: feedbacks.filter(f => f.rating === 5).length,
      4: feedbacks.filter(f => f.rating === 4).length,
      3: feedbacks.filter(f => f.rating === 3).length,
      2: feedbacks.filter(f => f.rating === 2).length,
      1: feedbacks.filter(f => f.rating === 1).length
    };

    return successResponse(res, 'Driver feedbacks retrieved successfully', {
      feedbacks,
      statistics: {
        totalFeedbacks: total,
        averageRating: parseFloat(avgRating.toFixed(2)),
        ratingDistribution
      },
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get Driver Feedbacks Error:', error);
    return errorResponse(res, 'Failed to retrieve feedbacks', 500);
  }
};