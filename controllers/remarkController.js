// const Remark = require('../models/Remark');
// const Delivery = require('../models/Delivery');

// // ==================== PREDEFINED REMARKS MANAGEMENT (ADMIN) ====================

// // Create Predefined Remark (Admin)
// exports.createPredefinedRemark = async (req, res) => {
//   try {
//     const {
//       remarkText,
//       category,
//       severity,
//       displayOrder,
//       icon,
//       color,
//       description
//     } = req.body;

//     const adminId = req.user.id;

//     // Validate required fields
//     if (!remarkText || !category) {
//       return res.status(400).json({
//         success: false,
//         message: 'Remark text and category are required'
//       });
//     }

//     // Check for duplicate
//     const existingRemark = await Remark.findOne({
//       remarkText: remarkText.trim(),
//       isPredefined: true,
//       isActive: true
//     });

//     if (existingRemark) {
//       return res.status(400).json({
//         success: false,
//         message: 'This predefined remark already exists'
//       });
//     }

//     // Create predefined remark
//     const remark = new Remark({
//       remarkType: 'predefined',
//       remarkText: remarkText.trim(),
//       category,
//       severity: severity || 'medium',
//       isPredefined: true,
//       displayOrder: displayOrder || 0,
//       icon,
//       color: color || '#666666',
//       description,
//       createdBy: adminId,
//       isActive: true,
//       approvalStatus: 'approved'
//     });

//     await remark.save();

//     res.status(201).json({
//       success: true,
//       message: 'Predefined remark created successfully',
//       data: { remark }
//     });

//   } catch (error) {
//     console.error('Create predefined remark error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create predefined remark',
//       error: error.message
//     });
//   }
// };

// // Get All Predefined Remarks (Public - for drivers to select)
// exports.getAllPredefinedRemarks = async (req, res) => {
//   try {
//     const { category, search } = req.query;

//     const query = {
//       isPredefined: true,
//       isActive: true
//     };

//     if (category) {
//       query.category = category;
//     }

//     if (search) {
//       query.remarkText = { $regex: search, $options: 'i' };
//     }

//     const remarks = await Remark.find(query)
//       .sort({ displayOrder: 1, remarkText: 1 })
//       .select('-editHistory -associatedDeliveries');

//     // Group by category
//     const groupedByCategory = remarks.reduce((acc, remark) => {
//       if (!acc[remark.category]) {
//         acc[remark.category] = [];
//       }
//       acc[remark.category].push(remark);
//       return acc;
//     }, {});

//     res.status(200).json({
//       success: true,
//       data: {
//         remarks,
//         groupedByCategory,
//         total: remarks.length
//       }
//     });

//   } catch (error) {
//     console.error('Get predefined remarks error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch predefined remarks',
//       error: error.message
//     });
//   }
// };

// // Update Predefined Remark (Admin)
// exports.updatePredefinedRemark = async (req, res) => {
//   try {
//     const { remarkId } = req.params;
//     const updates = req.body;

//     const remark = await Remark.findById(remarkId);
//     if (!remark) {
//       return res.status(404).json({
//         success: false,
//         message: 'Remark not found'
//       });
//     }

//     if (!remark.isPredefined) {
//       return res.status(400).json({
//         success: false,
//         message: 'This is not a predefined remark'
//       });
//     }

//     // Update allowed fields
//     const allowedUpdates = ['remarkText', 'category', 'severity', 'displayOrder', 'icon', 'color', 'description', 'isActive'];
    
//     allowedUpdates.forEach(field => {
//       if (updates[field] !== undefined) {
//         remark[field] = updates[field];
//       }
//     });

//     await remark.save();

//     res.status(200).json({
//       success: true,
//       message: 'Predefined remark updated successfully',
//       data: { remark }
//     });

//   } catch (error) {
//     console.error('Update predefined remark error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to update predefined remark',
//       error: error.message
//     });
//   }
// };

// // Delete Predefined Remark (Admin - soft delete)
// exports.deletePredefinedRemark = async (req, res) => {
//   try {
//     const { remarkId } = req.params;

//     const remark = await Remark.findById(remarkId);
//     if (!remark) {
//       return res.status(404).json({
//         success: false,
//         message: 'Remark not found'
//       });
//     }

//     if (!remark.isPredefined) {
//       return res.status(400).json({
//         success: false,
//         message: 'This is not a predefined remark'
//       });
//     }

//     // Soft delete
//     remark.isActive = false;
//     await remark.save();

//     res.status(200).json({
//       success: true,
//       message: 'Predefined remark deleted successfully'
//     });

//   } catch (error) {
//     console.error('Delete predefined remark error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to delete predefined remark',
//       error: error.message
//     });
//   }
// };

// // ==================== CUSTOM REMARKS (DRIVER) ====================

// // Add Custom Remark (Driver with "Others" option)
// exports.addCustomRemark = async (req, res) => {
//   try {
//     const { remarkText, category, deliveryId, description } = req.body;
//     const driverId = req.user.id;

//     if (!remarkText) {
//       return res.status(400).json({
//         success: false,
//         message: 'Remark text is required'
//       });
//     }

//     // Create custom remark
//     const remark = new Remark({
//       remarkType: 'custom',
//       remarkText: remarkText.trim(),
//       category: category || 'other',
//       isPredefined: false,
//       createdBy: driverId,
//       description,
//       isActive: true,
//       requiresApproval: true,
//       approvalStatus: 'pending' // Requires admin approval
//     });

//     // Associate with delivery if provided
//     if (deliveryId) {
//       const delivery = await Delivery.findById(deliveryId);
//       if (delivery) {
//         remark.associatedDeliveries.push(deliveryId);
//       }
//     }

//     await remark.save();

//     res.status(201).json({
//       success: true,
//       message: 'Custom remark submitted. Awaiting admin approval.',
//       data: { remark }
//     });

//   } catch (error) {
//     console.error('Add custom remark error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to add custom remark',
//       error: error.message
//     });
//   }
// };

// // Get Custom Remarks (Driver - their own)
// exports.getMyCustomRemarks = async (req, res) => {
//   try {
//     const driverId = req.user.id;
//     const { status } = req.query;

//     const query = {
//       createdBy: driverId,
//       isPredefined: false
//     };

//     if (status) {
//       query.approvalStatus = status;
//     }

//     const remarks = await Remark.find(query)
//       .sort({ createdAt: -1 })
//       .select('-editHistory');

//     res.status(200).json({
//       success: true,
//       data: {
//         remarks,
//         total: remarks.length
//       }
//     });

//   } catch (error) {
//     console.error('Get custom remarks error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch custom remarks',
//       error: error.message
//     });
//   }
// };

// // ==================== REMARK ASSOCIATION WITH DELIVERIES ====================

// // Associate Remark with Delivery
// exports.associateRemarkWithDelivery = async (req, res) => {
//   try {
//     const { remarkId, deliveryId } = req.body;
//     const driverId = req.user.id;

//     // Validate remark
//     const remark = await Remark.findById(remarkId);
//     if (!remark) {
//       return res.status(404).json({
//         success: false,
//         message: 'Remark not found'
//       });
//     }

//     // Validate delivery
//     const delivery = await Delivery.findById(deliveryId);
//     if (!delivery) {
//       return res.status(404).json({
//         success: false,
//         message: 'Delivery not found'
//       });
//     }

//     // Check if driver owns the delivery
//     if (delivery.driver.toString() !== driverId) {
//       return res.status(403).json({
//         success: false,
//         message: 'You can only add remarks to your own deliveries'
//       });
//     }

//     // Add association
//     await remark.addDeliveryAssociation(deliveryId);

//     // Add remark to delivery
//     if (!delivery.remarks) {
//       delivery.remarks = [];
//     }
//     if (!delivery.remarks.includes(remarkId)) {
//       delivery.remarks.push(remarkId);
//       await delivery.save();
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Remark associated with delivery successfully',
//       data: {
//         remark: await remark.populate('associatedDeliveries'),
//         delivery
//       }
//     });

//   } catch (error) {
//     console.error('Associate remark error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to associate remark',
//       error: error.message
//     });
//   }
// };

// // Get Remarks for Delivery
// exports.getDeliveryRemarks = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     const remarks = await Remark.find({
//       associatedDeliveries: deliveryId,
//       isActive: true
//     }).sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       data: {
//         deliveryId,
//         remarks,
//         total: remarks.length
//       }
//     });

//   } catch (error) {
//     console.error('Get delivery remarks error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch delivery remarks',
//       error: error.message
//     });
//   }
// };

// // ==================== ADMIN APPROVAL FOR CUSTOM REMARKS ====================

// // Approve Custom Remark (Admin)
// exports.approveCustomRemark = async (req, res) => {
//   try {
//     const { remarkId } = req.params;
//     const { convertToPredefined, displayOrder } = req.body;
//     const adminId = req.user.id;

//     const remark = await Remark.findById(remarkId);
//     if (!remark) {
//       return res.status(404).json({
//         success: false,
//         message: 'Remark not found'
//       });
//     }

//     if (remark.isPredefined) {
//       return res.status(400).json({
//         success: false,
//         message: 'This is already a predefined remark'
//       });
//     }

//     // Approve remark
//     remark.approvalStatus = 'approved';
//     remark.approvedBy = adminId;
//     remark.approvedAt = Date.now();

//     // Convert to predefined if requested
//     if (convertToPredefined) {
//       remark.isPredefined = true;
//       remark.remarkType = 'predefined';
//       if (displayOrder !== undefined) {
//         remark.displayOrder = displayOrder;
//       }
//     }

//     await remark.save();

//     res.status(200).json({
//       success: true,
//       message: convertToPredefined 
//         ? 'Custom remark approved and converted to predefined remark'
//         : 'Custom remark approved',
//       data: { remark }
//     });

//   } catch (error) {
//     console.error('Approve custom remark error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to approve custom remark',
//       error: error.message
//     });
//   }
// };

// // Reject Custom Remark (Admin)
// exports.rejectCustomRemark = async (req, res) => {
//   try {
//     const { remarkId } = req.params;
//     const { reason } = req.body;
//     const adminId = req.user.id;

//     const remark = await Remark.findById(remarkId);
//     if (!remark) {
//       return res.status(404).json({
//         success: false,
//         message: 'Remark not found'
//       });
//     }

//     remark.approvalStatus = 'rejected';
//     remark.approvedBy = adminId;
//     remark.approvedAt = Date.now();
//     remark.description = reason ? `Rejected: ${reason}` : remark.description;
//     remark.isActive = false;

//     await remark.save();

//     res.status(200).json({
//       success: true,
//       message: 'Custom remark rejected',
//       data: { remark }
//     });

//   } catch (error) {
//     console.error('Reject custom remark error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to reject custom remark',
//       error: error.message
//     });
//   }
// };

// // Get Pending Custom Remarks (Admin)
// exports.getPendingCustomRemarks = async (req, res) => {
//   try {
//     const remarks = await Remark.find({
//       isPredefined: false,
//       approvalStatus: 'pending',
//       requiresApproval: true
//     })
//     .populate('createdBy', 'name email')
//     .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       data: {
//         remarks,
//         total: remarks.length
//       }
//     });

//   } catch (error) {
//     console.error('Get pending custom remarks error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch pending custom remarks',
//       error: error.message
//     });
//   }
// };

// // ==================== REMARK STATISTICS & ANALYTICS ====================

// // Get Most Used Remarks
// exports.getMostUsedRemarks = async (req, res) => {
//   try {
//     const { limit = 10, category } = req.query;

//     const query = { isActive: true };
//     if (category) {
//       query.category = category;
//     }

//     const remarks = await Remark.getMostUsed(parseInt(limit));

//     res.status(200).json({
//       success: true,
//       data: {
//         remarks,
//         total: remarks.length
//       }
//     });

//   } catch (error) {
//     console.error('Get most used remarks error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch most used remarks',
//       error: error.message
//     });
//   }
// };

// // Get Remark Statistics
// exports.getRemarkStatistics = async (req, res) => {
//   try {
//     const totalRemarks = await Remark.countDocuments({ isActive: true });
//     const predefinedCount = await Remark.countDocuments({ isPredefined: true, isActive: true });
//     const customCount = await Remark.countDocuments({ isPredefined: false, isActive: true });
//     const pendingApproval = await Remark.countDocuments({ approvalStatus: 'pending' });

//     // Usage by category
//     const categoryStats = await Remark.aggregate([
//       { $match: { isActive: true } },
//       {
//         $group: {
//           _id: '$category',
//           count: { $sum: 1 },
//           totalUsage: { $sum: '$usageCount' }
//         }
//       },
//       { $sort: { totalUsage: -1 } }
//     ]);

//     // Recent activity
//     const recentlyUsed = await Remark.find({ isActive: true })
//       .sort({ lastUsedAt: -1 })
//       .limit(5)
//       .select('remarkText category usageCount lastUsedAt');

//     res.status(200).json({
//       success: true,
//       data: {
//         summary: {
//           totalRemarks,
//           predefinedCount,
//           customCount,
//           pendingApproval
//         },
//         categoryStats,
//         recentlyUsed
//       }
//     });

//   } catch (error) {
//     console.error('Get remark statistics error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch remark statistics',
//       error: error.message
//     });
//   }
// };

// module.exports = exports;


const Remark = require('../models/Remark');
const Delivery = require("../models/Delivery")
const Driver = require("../models/Driver")

//  DRIVER REMARKS ONLY 

// 1. Add Custom Remark (Driver - "Others" option)
exports.addCustomRemark = async (req, res) => {
  try {
    const { remarkText, category = 'other', deliveryId, description } = req.body;
    const driverId = req.user._id;

    if (!remarkText || remarkText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Remark text is required'
      });
    }

    const remark = new Remark({
      remarkType: 'custom',
      remarkText: remarkText.trim(),
      category,
      isPredefined: false,
      createdBy: driverId,
      description: description || null,
      isActive: true,
      requiresApproval: true,
      approvalStatus: 'pending'
    });

    // Agar deliveryId diya hai to link kar do
    if (deliveryId) {
      const delivery = await Delivery.findOne({
        _id: deliveryId,
        driver: driverId,
        status: { $in: ['assigned', 'picked_up', 'in_transit'] }
      });

      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: 'Delivery not found or not assigned to you'
        });
      }

      remark.associatedDeliveries.push(deliveryId);
    }

    await remark.save();

    res.status(201).json({
      success: true,
      message: 'Custom remark submitted. Awaiting admin approval.',
      data: { remark }
    });

  } catch (error) {
    console.error('Driver Add Custom Remark Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit remark',
      error: error.message
    });
  }
};

// // 2. Get My Custom Remarks (Driver Dashboard)
// exports.getMyCustomRemarks = async (req, res) => {
//   try {
//     const driverId = req.user._id;
//     const { status = 'all' } = req.query;

//     const query = {
//       createdBy: driverId,
//       isPredefined: false
//     };

//     if (status !== 'all') {
//       query.approvalStatus = status;
//     }

//     const remarks = await Remark.find(query)
//       .sort({ createdAt: -1 })
//       .select('remarkText category approvalStatus createdAt associatedDeliveries');

//     res.status(200).json({
//       success: true,
//       data: {
//         remarks,
//         total: remarks.length,
//         pending: remarks.filter(r => r.approvalStatus === 'pending').length,
//         approved: remarks.filter(r => r.approvalStatus === 'approved').length,
//         rejected: remarks.filter(r => r.approvalStatus === 'rejected').length
//       }
//     });

//   } catch (error) {
//     console.error('Get My Remarks Error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch your remarks'
//     });
//   }
// };

exports.getMyCustomRemarks = async (req, res) => {
  try {
    const driverId = req.user?._id || req.driver?._id;

    const { status = 'all' } = req.query;

    const query = {
      createdBy: driverId,
      isPredefined: false
    };

    if (status !== 'all') {
      query.approvalStatus = status;
    }

    const remarks = await Remark.find(query)
      .sort({ createdAt: -1 })
      .select('remarkText category approvalStatus createdAt associatedDeliveries');

    res.status(200).json({
      success: true,
      data: {
        remarks,
        total: remarks.length,
        pending: remarks.filter(r => r.approvalStatus === 'pending').length,
        approved: remarks.filter(r => r.approvalStatus === 'approved').length,
        rejected: remarks.filter(r => r.approvalStatus === 'rejected').length
      }
    });

  } catch (error) {
    console.error('Get My Remarks Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch remarks'
    });
  }
};
// 3. Associate Remark with Delivery (Driver)
exports.associateRemarkWithDelivery = async (req, res) => {
  try {
    const { remarkId, deliveryId } = req.body;
    const driverId = req.user._id;

    // Validate remark
    const remark = await Remark.findOne({
      _id: remarkId,
      createdBy: driverId,
      isPredefined: false
    });

    if (!remark) {
      return res.status(404).json({
        success: false,
        message: 'Remark not found or not created by you'
      });
    }

    // Validate delivery
    const delivery = await Delivery.findOne({
      _id: deliveryId,
      driver: driverId
    });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found or not assigned to you'
      });
    }

    // Add association
    if (!remark.associatedDeliveries.includes(deliveryId)) {
      remark.associatedDeliveries.push(deliveryId);
      await remark.save();
    }

    // Add remark to delivery
    if (!delivery.remarks.includes(remarkId)) {
      delivery.remarks.push(remarkId);
      await delivery.save();
    }

    res.status(200).json({
      success: true,
      message: 'Remark linked to delivery successfully',
      data: { remark, deliveryId }
    });

  } catch (error) {
    console.error('Associate Remark Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link remark'
    });
  }
};

// 4. Get Remarks for a Specific Delivery (Driver)
exports.getDeliveryRemarks = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const driverId = req.user._id;

    // Check if delivery belongs to driver
    const delivery = await Delivery.findOne({
      _id: deliveryId,
      driver: driverId
    });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found or not assigned to you'
      });
    }

    const remarks = await Remark.find({
      associatedDeliveries: deliveryId,
      isActive: true
    })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      data: {
        deliveryId,
        remarks,
        total: remarks.length
      }
    });

  } catch (error) {
    console.error('Get Delivery Remarks Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch remarks'
    });
  }
};

module.exports = exports;