// const Remark = require('../../models/Remark');
// const Delivery = require("../../models/Delivery")

// // Create Predefined Remark
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

//     const adminId = req.admin._id; // protectAdmin se aayega

//     if (!remarkText || !category) {
//       return res.status(400).json({
//         success: false,
//         message: 'Remark text and category are required'
//       });
//     }

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

// // Get All Predefined Remarks (Public - for drivers)
// exports.getAllPredefinedRemarks = async (req, res) => {
//   try {
//     const { category, search } = req.query;

//     const query = { isPredefined: true, isActive: true };
//     if (category) query.category = category;
//     if (search) query.remarkText = { $regex: search, $options: 'i' };

//     const remarks = await Remark.find(query)
//       .sort({ displayOrder: 1, remarkText: 1 })
//       .select('-editHistory -associatedDeliveries');

//     const groupedByCategory = remarks.reduce((acc, remark) => {
//       if (!acc[remark.category]) acc[remark.category] = [];
//       acc[remark.category].push(remark);
//       return acc;
//     }, {});

//     res.status(200).json({
//       success: true,
//       data: { remarks, groupedByCategory, total: remarks.length }
//     });

//   } catch (error) {
//     console.error('Get predefined remarks error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch predefined remarks'
//     });
//   }
// };

// // Update Predefined Remark
// exports.updatePredefinedRemark = async (req, res) => {
//   try {
//     const { remarkId } = req.params;
//     const updates = req.body;

//     const remark = await Remark.findById(remarkId);
//     if (!remark || !remark.isPredefined) {
//       return res.status(404).json({
//         success: false,
//         message: 'Predefined remark not found'
//       });
//     }

//     const allowed = ['remarkText', 'category', 'severity', 'displayOrder', 'icon', 'color', 'description', 'isActive'];
//     allowed.forEach(field => {
//       if (updates[field] !== undefined) remark[field] = updates[field];
//     });

//     await remark.save();

//     res.status(200).json({
//       success: true,
//       message: 'Predefined remark updated successfully',
//       data: { remark }
//     });

//   } catch (error) {
//     console.error('Update remark error:', error);
//     res.status(500).json({ success: false, message: 'Update failed' });
//   }
// };

// // Delete (Soft) Predefined Remark
// // exports.deletePredefinedRemark = async (req, res) => {
// //   try {
// //     const { remarkId } = req.params;
// //     const remark = await Remark.findById(remarkId);

// //     if (!remark || !remark.isPredefined) {
// //       return res.status(404).json({
// //         success: false,
// //         message: 'Predefined remark not found'
// //       });
// //     }

// //     remark.isActive = false;
// //     await remark.save();

// //     res.status(200).json({
// //       success: true,
// //       message: 'Predefined remark deleted successfully'
// //     });

// //   } catch (error) {
// //     console.error('Delete remark error:', error);
// //     res.status(500).json({ success: false, message: 'Delete failed' });
// //   }
// // };
// exports.deletePredefinedRemark = async (req, res) => {
//   try {
//     const { remarkId } = req.params;

//     const remark = await Remark.findOne({ 
//       _id: remarkId, 
//       isPredefined: true 
//     });

//     if (!remark) {
//       return res.status(404).json({
//         success: false,
//         message: 'Predefined remark not found or already deleted'
//       });
//     }

//     await Remark.deleteOne({ _id: remarkId });

//     await Delivery.updateMany(
//       { remarks: remarkId },
//       { $pull: { remarks: remarkId } }
//     );


//     return res.status(200).json({
//       success: true,
//       message: 'Predefined remark permanently deleted from database!',
//       data: {
//         deletedRemarkId: remarkId,
//         remarkText: remark.remarkText
//       }
//     });

//   } catch (error) {
//     console.error('Hard Delete Remark Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to delete remark',
//       error: error.message
//     });
//   }
// };

// // Approve Custom Remark (Admin)
// exports.approveCustomRemark = async (req, res) => {
//   try {
//     const { remarkId } = req.params;
//     const { convertToPredefined, displayOrder } = req.body;
//     const adminId = req.admin._id;

//     const remark = await Remark.findById(remarkId);
//     if (!remark || remark.isPredefined) {
//       return res.status(404).json({
//         success: false,
//         message: 'Custom remark not found'
//       });
//     }

//     remark.approvalStatus = 'approved';
//     remark.approvedBy = adminId;
//     remark.approvedAt = Date.now();

//     if (convertToPredefined) {
//       remark.isPredefined = true;
//       remark.remarkType = 'predefined';
//       remark.displayOrder = displayOrder ?? 0;
//     }

//     await remark.save();

//     res.status(200).json({
//       success: true,
//       message: convertToPredefined
//         ? 'Remark approved and converted to predefined'
//         : 'Remark approved successfully',
//       data: { remark }
//     });

//   } catch (error) {
//     console.error('Approve remark error:', error);
//     res.status(500).json({ success: false, message: 'Approval failed' });
//   }
// };

// // Reject Custom Remark
// exports.rejectCustomRemark = async (req, res) => {
//   try {
//     const { remarkId } = req.params;
//     const { reason } = req.body;
//     const adminId = req.admin._id;

//     const remark = await Remark.findById(remarkId);
//     if (!remark || remark.isPredefined) {
//       return res.status(404).json({ success: false, message: 'Remark not found' });
//     }

//     remark.approvalStatus = 'rejected';
//     remark.approvedBy = adminId;
//     remark.approvedAt = Date.now();
//     remark.isActive = false;
//     if (reason) remark.description = `Rejected: ${reason}`;

//     await remark.save();

//     res.status(200).json({
//       success: true,
//       message: 'Custom remark rejected',
//       data: { remark }
//     });

//   } catch (error) {
//     console.error('Reject remark error:', error);
//     res.status(500).json({ success: false, message: 'Rejection failed' });
//   }
// };

// // Get Pending Custom Remarks (Admin Dashboard)
// exports.getPendingCustomRemarks = async (req, res) => {
//   try {
//     const remarks = await Remark.find({
//       isPredefined: false,
//       approvalStatus: 'pending',
//       requiresApproval: true
//     })
//       .populate('createdBy', 'name email phone')
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       data: { remarks, total: remarks.length }
//     });

//   } catch (error) {
//     console.error('Get pending remarks error:', error);
//     res.status(500).json({ success: false, message: 'Failed to fetch pending remarks' });
//   }
// };

// // Remark Statistics (Admin Analytics)
// exports.getRemarkStatistics = async (req, res) => {
//   try {
//     const [summary, categoryStats, recentlyUsed] = await Promise.all([
//       Promise.all([
//         Remark.countDocuments({ isActive: true }),
//         Remark.countDocuments({ isPredefined: true, isActive: true }),
//         Remark.countDocuments({ isPredefined: false, isActive: true }),
//         Remark.countDocuments({ approvalStatus: 'pending' })
//       ]),
//       Remark.aggregate([
//         { $match: { isActive: true } },
//         { $group: { _id: '$category', count: { $sum: 1 }, usage: { $sum: '$usageCount' } } },
//         { $sort: { usage: -1 } }
//       ]),
//       Remark.find({ isActive: true })
//         .sort({ lastUsedAt: -1 })
//         .limit(5)
//         .select('remarkText category usageCount lastUsedAt')
//     ]);

//     res.status(200).json({
//       success: true,
//       data: {
//         summary: {
//           total: summary[0],
//           predefined: summary[1],
//           custom: summary[2],
//           pendingApproval: summary[3]
//         },
//         categoryStats,
//         recentlyUsed
//       }
//     });

//   } catch (error) {
//     console.error('Statistics error:', error);
//     res.status(500).json({ success: false, message: 'Failed to load stats' });
//   }
// };



const Remark = require('../../models/Remark');
const Delivery = require("../../models/Delivery");


// GET /admin/remarks - List all predefined remarks (EJS)
exports.listPredefinedRemarks = async (req, res) => {
  try {
    const {
      category,
      search,
      type = 'all',
      page = 1,
      limit = 10
    } = req.query;

    // Build query
    const query = {};

    // Type filter
    if (type === 'predefined') query.isPredefined = true;
    if (type === 'custom') query.isPredefined = false;
    // 'all' → no filter

    if (category) query.category = category;
    if (search) query.remarkText = { $regex: search.trim(), $options: 'i' };

    // Pagination calculation
    const pageNum = parseInt(page);
    const pageLimit = parseInt(limit);
    const skip = (pageNum - 1) * pageLimit;

    // Fetch remarks
    const remarks = await Remark.find(query)
      .populate('createdBy', 'name email phone role') // Driver/Admin name
      .sort({ createdAt: -1, displayOrder: 1 })
      .skip(skip)
      .limit(pageLimit)
      .lean();

    // Total count for pagination
    const totalRemarks = await Remark.countDocuments(query);
    const totalPages = Math.ceil(totalRemarks / pageLimit);

    // Pass to EJS
    res.render('remarks', {
      title: 'Remarks Management',
      remarks,
      query: req.query,               // Keep filters in URL
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalRemarks: totalRemarks,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      messages: req.flash(),
      admin: req.admin,
      url: req.originalUrl
    });

  } catch (error) {
    console.error('List remarks error:', error);
    req.flash('error', 'Failed to load remarks');
    res.redirect('/admin/dashboard');
  }
};

// GET /admin/remarks/create - Show create form (EJS)
exports.showCreatePredefinedRemark = (req, res) => {
  res.render('remark-create', {
    title: 'Create Predefined Remark',
    messages: req.flash(),
    admin: req.admin,
    url: req.originalUrl
  });
};

// POST /admin/remarks/create - Create predefined remark (EJS)
exports.createPredefinedRemarkEJS = async (req, res) => {
  try {
    const {
      remarkText,
      category,
      severity,
      displayOrder,
      icon,
      color,
      description
    } = req.body;

    const adminId = req.admin._id;

    if (!remarkText || !category) {
      req.flash('error', 'Remark text and category are required');
      return res.redirect('/admin/remarks/create');
    }

    const existingRemark = await Remark.findOne({
      remarkText: remarkText.trim(),
      isPredefined: true,
      isActive: true
    });

    if (existingRemark) {
      req.flash('error', 'This predefined remark already exists');
      return res.redirect('/admin/remarks/create');
    }

    const remark = new Remark({
      remarkType: 'predefined',
      remarkText: remarkText.trim(),
      category,
      severity: severity || 'medium',
      isPredefined: true,
      displayOrder: displayOrder || 0,
      icon,
      color: color || '#666666',
      description,
      createdBy: adminId,
      isActive: true,
      approvalStatus: 'approved'
    });

    await remark.save();

    req.flash('success', 'Predefined remark created successfully');
    res.redirect('/admin/remarks');
  } catch (error) {
    console.error('Create predefined remark error:', error);
    req.flash('error', 'Failed to create predefined remark');
    res.redirect('/admin/remarks/create');
  }
};

// GET /admin/remarks/:remarkId/edit - Show edit form (EJS)
exports.showEditPredefinedRemark = async (req, res) => {
  try {
    const { remarkId } = req.params;
    const remark = await Remark.findById(remarkId).lean();

    if (!remark || !remark.isPredefined) {
      req.flash('error', 'Predefined remark not found');
      return res.redirect('/admin/remarks');
    }

    res.render('remark-edit', {
      title: 'Edit Predefined Remark',
      remark,
      messages: req.flash(),
      admin: req.admin,
      url: req.originalUrl
    });
  } catch (error) {
    console.error('Show edit remark error:', error);
    req.flash('error', 'Failed to load edit form');
    res.redirect('/admin/remarks');
  }
};

// POST /admin/remarks/:remarkId/edit - Update predefined remark (EJS)
exports.updatePredefinedRemarkEJS = async (req, res) => {
  try {
    const { remarkId } = req.params;
    const updates = req.body;

    const remark = await Remark.findById(remarkId);
    if (!remark || !remark.isPredefined) {
      req.flash('error', 'Predefined remark not found');
      return res.redirect('/admin/remarks');
    }

    const allowed = ['remarkText', 'category', 'severity', 'displayOrder', 'icon', 'color', 'description', 'isActive'];
    allowed.forEach(field => {
      if (updates[field] !== undefined) remark[field] = updates[field];
    });

    await remark.save();

    req.flash('success', 'Predefined remark updated successfully');
    res.redirect('/admin/remarks');
  } catch (error) {
    console.error('Update remark error:', error);
    req.flash('error', 'Failed to update remark');
    res.redirect(`/admin/remarks/${req.params.remarkId}/edit`);
  }
};

// POST /admin/remarks/:remarkId/delete - Delete predefined remark (EJS)
exports.deletePredefinedRemarkEJS = async (req, res) => {
  try {
    const { remarkId } = req.params;

    const remark = await Remark.findOne({
      _id: remarkId,
      isPredefined: true
    });

    if (!remark) {
      req.flash('error', 'Predefined remark not found');
      return res.redirect('/admin/remarks');
    }

    await Remark.deleteOne({ _id: remarkId });

    await Delivery.updateMany(
      { remarks: remarkId },
      { $pull: { remarks: remarkId } }
    );

    req.flash('success', 'Predefined remark deleted successfully');
    res.redirect('/admin/remarks');
  } catch (error) {
    console.error('Delete remark error:', error);
    req.flash('error', 'Failed to delete remark');
    res.redirect('/admin/remarks');
  }
};

// GET /admin/remarks/pending-custom - List pending custom remarks (EJS)
exports.listPendingCustomRemarks = async (req, res) => {
  try {
    const remarks = await Remark.find({
      isPredefined: false,
      approvalStatus: 'pending',
      requiresApproval: true
    })
      .populate('createdBy', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    res.render('pending-custom-remarks', {
      title: 'Pending Custom Remarks',
      remarks,
      messages: req.flash(),
      admin: req.admin,
      url: req.originalUrl
    });
  } catch (error) {
    console.error('List pending custom remarks error:', error);
    req.flash('error', 'Failed to load pending remarks');
    res.redirect('/admin/remarks');
  }
};

// POST /admin/remarks/custom/:remarkId/approve - Approve custom remark (EJS)
exports.approveCustomRemarkEJS = async (req, res) => {
  try {
    const { remarkId } = req.params;
    const { convertToPredefined, displayOrder } = req.body;
    const adminId = req.admin._id;

    const remark = await Remark.findById(remarkId);
    if (!remark || remark.isPredefined) {
      req.flash('error', 'Custom remark not found');
      return res.redirect('/admin/remarks');
    }

    remark.approvalStatus = 'approved';
    remark.approvedBy = adminId;
    remark.approvedAt = Date.now();

    if (convertToPredefined) {
      remark.isPredefined = true;
      remark.remarkType = 'predefined';
      remark.displayOrder = displayOrder ?? 0;
    }

    await remark.save();

    req.flash('success', convertToPredefined ? 'Remark approved and converted' : 'Remark approved');
    res.redirect('/admin/remarks/pending-custom');
  } catch (error) {
    console.error('Approve remark error:', error);
    req.flash('error', 'Failed to approve remark');
    res.redirect('/admin/remarks');
  }
};

// POST /admin/remarks/custom/:remarkId/reject - Reject custom remark (EJS)
exports.rejectCustomRemarkEJS = async (req, res) => {
  try {
    const { remarkId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin._id;

    const remark = await Remark.findById(remarkId);
    if (!remark || remark.isPredefined) {
      req.flash('error', 'Custom remark not found');
      return res.redirect('/admin/remarks/pending-custom');
    }

    remark.approvalStatus = 'rejected';
    remark.approvedBy = adminId;
    remark.approvedAt = Date.now();
    remark.isActive = false;
    if (reason) remark.description = `Rejected: ${reason}`;

    await remark.save();

    req.flash('success', 'Custom remark rejected');
    res.redirect('/admin/remarks');
  } catch (error) {
    console.error('Reject remark error:', error);
    req.flash('error', 'Failed to reject remark');
    res.redirect('/admin/remarks');
  }
};

// GET /admin/remarks/statistics - Show remark statistics (EJS)
exports.showRemarkStatistics = async (req, res) => {
  try {
    const [summary, categoryStats, recentlyUsed] = await Promise.all([
      Promise.all([
        Remark.countDocuments({ isActive: true }),
        Remark.countDocuments({ isPredefined: true, isActive: true }),
        Remark.countDocuments({ isPredefined: false, isActive: true }),
        Remark.countDocuments({ approvalStatus: 'pending' })
      ]),
      Remark.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 }, usage: { $sum: '$usageCount' } } },
        { $sort: { usage: -1 } }
      ]),
      Remark.find({ isActive: true })
        .sort({ lastUsedAt: -1 })
        .limit(5)
        .select('remarkText category usageCount lastUsedAt')
        .lean()
    ]);

    res.render('remark-statistics', {
      title: 'Remark Statistics',
      summary: {
        total: summary[0],
        predefined: summary[1],
        custom: summary[2],
        pendingApproval: summary[3]
      },
      categoryStats,
      recentlyUsed,
      messages: req.flash(),
      admin: req.admin
    });
  } catch (error) {
    console.error('Statistics error:', error);
    req.flash('error', 'Failed to load statistics');
    res.redirect('/admin/remarks');
  }
};

// GET /admin/remarks/:remarkId/view - View single remark details
// exports.viewRemark = async (req, res) => {
//   try {
//     const { remarkId } = req.params;

//     const remark = await Remark.findById(remarkId)
//       .populate('createdBy', 'name email phone role')
//       .populate('approvedBy', 'name email') // if approved
//       .lean();

//     if (!remark) {
//       req.flash('error', 'Remark not found');
//       return res.redirect('/admin/remarks');
//     }

//     res.render('remark-view', {
//       title: `Remark Details - ${remark.remarkText.substring(0, 30)}...`,
//       remark,
//       messages: req.flash(),
//       admin: req.admin,
//       url: req.originalUrl
//     });
//   } catch (error) {
//     console.error('View remark error:', error);
//     req.flash('error', 'Failed to load remark details');
//     res.redirect('/admin/remarks');
//   }
// };

// GET /admin/remarks/:remarkId/view
exports.viewRemark = async (req, res) => {
  try {
    const { remarkId } = req.params;

    const remark = await Remark.findById(remarkId)
      .populate('createdBy', 'name email phone role')
      .populate('approvedBy', 'name email')
      .populate('associatedDeliveries', 'orderId status trackingNumber')  // ← Yeh line add karo
      .lean();

    if (!remark) {
      req.flash('error', 'Remark not found');
      return res.redirect('/admin/remarks');
    }

    res.render('remark-view', {
      title: `Remark Details - ${remark.remarkText.substring(0, 30)}...`,
      remark,
      messages: req.flash(),
      admin: req.admin,
      url: req.originalUrl
    });
  } catch (error) {
    console.error('View remark error:', error);
    req.flash('error', 'Failed to load remark details');
    res.redirect('/admin/remarks');
  }
};

