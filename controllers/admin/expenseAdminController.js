const Expense = require('../../models/Expense');
const Driver = require('../../models/Driver');
const Notification = require("../../models/Notification")
const { sendNotification } = require("../../utils/sendNotification")

//  GET ALL EXPENSES (ADMIN) 
// exports.getAllExpenses = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 20,
//       expenseType,
//       approvalStatus,
//       driverId,
//       vehicleNumber,
//       startDate,
//       endDate,
//       minAmount,
//       maxAmount,
//       sortBy = 'expenseDate',
//       sortOrder = 'desc'
//     } = req.query;

//     // Build query
//     const query = {};

//     if (expenseType) query.expenseType = expenseType;
//     if (approvalStatus) query.approvalStatus = approvalStatus;
//     if (driverId) query.driver = driverId;
//     if (vehicleNumber) query['vehicle.vehicleNumber'] = vehicleNumber;

//     if (startDate || endDate) {
//       query.expenseDate = {};
//       if (startDate) query.expenseDate.$gte = new Date(startDate);
//       if (endDate) query.expenseDate.$lte = new Date(endDate);
//     }

//     if (minAmount || maxAmount) {
//       query['fuelDetails.totalAmount'] = {};
//       if (minAmount) query['fuelDetails.totalAmount'].$gte = parseFloat(minAmount);
//       if (maxAmount) query['fuelDetails.totalAmount'].$lte = parseFloat(maxAmount);
//     }

//     // Pagination
//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

//     const expenses = await Expense.find(query)
//       .populate('driver', 'name email phone vehicleNumber vehicleType')
//       .populate('journey', 'startTime endTime distance')
//       .populate('delivery', 'trackingNumber orderId status')
//       .sort(sort)
//       .skip(skip)
//       .limit(parseInt(limit));

//     const total = await Expense.countDocuments(query);

//     // Get summary statistics
//     const summary = await Expense.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: null,
//           totalExpenses: { $sum: '$fuelDetails.totalAmount' },
//           totalRecords: { $sum: 1 },
//           pendingCount: {
//             $sum: { $cond: [{ $eq: ['$approvalStatus', 'pending'] }, 1, 0] }
//           },
//           approvedByAdminCount: {
//             $sum: { $cond: [{ $eq: ['$approvalStatus', 'approved_by_admin'] }, 1, 0] }
//           },
//           approvedByFinanceCount: {
//             $sum: { $cond: [{ $eq: ['$approvalStatus', 'approved_by_finance'] }, 1, 0] }
//           },
//           rejectedCount: {
//             $sum: { $cond: [{ $eq: ['$approvalStatus', 'rejected'] }, 1, 0] }
//           }
//         }
//       }
//     ]);

//     res.status(200).json({
//       success: true,
//       message: 'Expenses retrieved successfully',
//       data: {
//         expenses,
//         pagination: {
//           total,
//           page: parseInt(page),
//           pages: Math.ceil(total / parseInt(limit)),
//           limit: parseInt(limit)
//         },
//         summary: summary[0] || {}
//       }
//     });

//   } catch (error) {
//     console.error('Get all expenses error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch expenses',
//       error: error.message
//     });
//   }
// };

//  GET EXPENSE BY ID (ADMIN) 
// exports.getExpenseById = async (req, res) => {
//   try {
//     const { expenseId } = req.params;

//     const expense = await Expense.findById(expenseId)
//       .populate('driver', 'name email phone vehicleNumber vehicleType profilePhoto')
//       .populate('journey', 'startTime endTime distance status')
//       .populate('delivery', 'trackingNumber orderId status')
//       .populate('approvalWorkflow.adminApproval.approvedBy', 'name email')
//       .populate('approvalWorkflow.financeApproval.approvedBy', 'name email')
//       .populate('rejectedBy', 'name email');

//     if (!expense) {
//       return res.status(404).json({
//         success: false,
//         message: 'Expense not found'
//       });
//     }

//     // Get driver's expense history
//     const driverHistory = await Expense.aggregate([
//       { $match: { driver: expense.driver._id } },
//       {
//         $group: {
//           _id: null,
//           totalExpenses: { $sum: '$fuelDetails.totalAmount' },
//           totalRecords: { $sum: 1 },
//           avgExpense: { $avg: '$fuelDetails.totalAmount' }, 
//           avgMileage: { $avg: '$mileageData.averageMileage' }
//         }
//       }
//     ]);

//     res.status(200).json({
//       success: true,
//       data: {
//         expense,
//         driverHistory: driverHistory[0] || {}
//       }
//     });

//   } catch (error) {
//     console.error('Get expense error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch expense',
//       error: error.message
//     });
//   }
// };

// GET ALL EXPENSES (Admin)
exports.getAllExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      expenseType,
      approvalStatus,
      driverId,
      vehicleNumber,
      startDate,
      endDate,
      sortBy = 'expenseDate',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filters for table data
    if (expenseType) query.expenseType = expenseType;
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (driverId) query.driver = driverId;
    if (vehicleNumber) query['vehicle.vehicleNumber'] = vehicleNumber;

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // 1. Get Expenses + Pagination
    const expenses = await Expense.find(query)
      .populate('driver', 'name email phone')
      .populate('vehicle', 'vehicleNumber')   // agar vehicle populate chahiye to
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Expense.countDocuments(query);

    // 2. Filtered Summary (Current tab ke liye)
    const filteredSummary = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$totalAmount' },
          pendingCount: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'Pending'] }, 1, 0] } },
          approvedByAdminCount: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'Approved'] }, 1, 0] } },
          rejectedCount: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'Rejected'] }, 1, 0] } }
        }
      }
    ]);

    // 3. Global Summary (Saare counts - tabs ke liye) ← Yeh important hai!
    const globalSummary = await Expense.aggregate([
      { $match: {} },   // No filter - saari expenses pe
      {
        $group: {
          _id: null,
          pendingCount: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'Pending'] }, 1, 0] } },
          approvedByAdminCount: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'Approved'] }, 1, 0] } },
          rejectedCount: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'Rejected'] }, 1, 0] } }
        }
      }
    ]);

    const currentQuery = new URLSearchParams(req.query).toString();

    res.render('expenses', {
      title: 'Expense Management',
      expenses,
      summary: filteredSummary[0] || {},           // Table + current tab ke liye
      globalSummary: globalSummary[0] || {},       // ← Tabs ke counts ke liye (New)
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      currentQuery,
      approvalStatus: approvalStatus || 'all',     // Tab active karne ke liye
      messages: req.flash(),
      url: req.originalUrl,
      admin: req.admin
    });

  } catch (error) {
    console.error('Get all expenses error:', error);
    req.flash('error', 'Failed to load expenses');
    res.redirect('/admin/expenses');
  }
};

// GET SINGLE EXPENSE DETAIL (EJS)
exports.getExpenseById = async (req, res) => {
  try {
    const { expenseId } = req.params;

    const expense = await Expense.findById(expenseId)
      .populate('driver', 'name email phone vehicleNumber')
      .populate('journey')
      .populate('delivery')
      .populate('approvalWorkflow.adminApproval.approvedBy', 'name email')
      .populate('approvalWorkflow.financeApproval.approvedBy', 'name email')
    // .lean();

    if (!expense) {
      req.flash('error', 'Expense not found');
      return res.redirect('/admin/expenses');
    }

    res.render('expense_view', {
      title: `Expense Details`,
      expense,
      messages: req.flash(),
      url: req.originalUrl,
      admin: req.admin
    });

  } catch (error) {
    console.error('Get expense error:', error);
    req.flash('error', 'Failed to load expense details');
    res.redirect('/admin/expenses');
  }
};


// GET PENDING EXPENSES (ADMIN) 
exports.getPendingExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const query = { approvalStatus: 'pending' };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const expenses = await Expense.find(query)
      .populate('driver', 'name email phone vehicleNumber')
      .sort({ expenseDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Expense.countDocuments(query);

    // Calculate total pending amount
    const pendingSummary = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalPendingAmount: { $sum: '$fuelDetails.totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        pendingExpenses: expenses,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit)
        },
        summary: pendingSummary[0] || { totalPendingAmount: 0, count: 0 }
      }
    });

  } catch (error) {
    console.error('Get pending expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending expenses',
      error: error.message
    });
  }
};


exports.approveExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { comments } = req.body;

    const expense = await Expense.findById(expenseId)
      .populate('driver', 'name fcmToken');

    if (!expense) {
      req.flash('error', 'Expense not found');
      return res.redirect('/admin/expenses');
    }``

    if (expense.approvalStatus !== 'Pending') {
      req.flash('error', `Expense is already ${expense.approvalStatus}`);
      return res.redirect('/admin/expenses');
    }

    // Update approval
    expense.approvalWorkflow.adminApproval = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      comments: comments || 'Approved by admin',
      status: 'Approved'
    };

    expense.approvalStatus = 'Approved';
    await expense.save();

    // ────────────────────────────────────────────────
    // CALCULATE REAL AMOUNT (FIXED)
    // ────────────────────────────────────────────────
    let realAmount = 0;
    if (expense.expenseType === 'fuel' && expense.fuelDetails) {
      realAmount = expense.fuelDetails.totalFuelCost || 0;
    } else if (expense.expenseType === 'vehicle' && expense.vehicleExpenseDetails) {
      realAmount = expense.vehicleExpenseDetails.expenseAmount || 0;
    }

    // ────────────────────────────────────────────────
    // NOTIFICATIONS TO DRIVER
    // ────────────────────────────────────────────────
    const driver = expense.driver;
    if (driver) {
      console.log(`[EXPENSE-APPROVE-NOTIF] Sending to driver ${driver._id} (${driver.name})`);

      // 1. Push Notification (FCM)
      if (driver.fcmToken && driver.fcmToken.trim().length > 20) {
        console.log(`[EXPENSE-FCM] Attempting send to: ${driver.fcmToken.substring(0, 20)}...`);
        try {
          await sendNotification(
            driver.name || "Driver",
            "english",
            driver.fcmToken,
            "expense_approved",
            {
              expenseId: expense._id.toString(),
              amount: realAmount,
              expenseType: expense.expenseType,
              message: comments || "Your expense has been approved",
              type: "expense_approved"
            }
          );
          console.log(`[EXPENSE-NOTIF-SUCCESS] FCM sent for approval`);
        } catch (pushErr) {
          console.error("[EXPENSE-FCM-ERROR]", pushErr.message || pushErr);
        }
      } else {
        console.warn("[EXPENSE-NOTIF] No valid FCM token for driver");
      }

      // 2. In-app Notification – FIXED AMOUNT
      try {
        await Notification.create({
          recipientId: driver._id,
          recipientType: 'Driver',
          type: 'expense_approved',
          title: 'Expense Approved',
          message: `Your ${expense.expenseType} expense of ₹${realAmount} has been approved by admin.${comments ? ` Comment: ${comments}` : ''}`,
          referenceId: expense._id,
          referenceModel: 'Expense',
          priority: 'medium',
          createdAt: new Date()
        });
        console.log(`[EXPENSE-NOTIF-SUCCESS] In-app notification created for approval`);
      } catch (notifErr) {
        console.error("[EXPENSE-INAPP-ERROR]", notifErr.message || notifErr);
      }
    }

    req.flash('success', 'Expense approved successfully. Driver notified.');
    res.redirect("/admin/expenses");

  } catch (error) {
    console.error('Admin approve expense error:', error);
    req.flash('error', 'Failed to approve expense');
    res.redirect('/admin/expenses');
  }
};



//  REJECT EXPENSE (ADMIN) 
// exports.rejectExpense = async (req, res) => {
//   try {
//     const { expenseId } = req.params;
//     const { reason } = req.body;

//     if (!reason) {
//       return res.status(400).json({
//         success: false,
//         message: 'Rejection reason is required'
//       });
//     }

//     const expense = await Expense.findById(expenseId);
//     if (!expense) {
//       return res.status(404).json({
//         success: false,
//         message: 'Expense not found'
//       });
//     }

//     expense.approvalStatus = 'rejected';
//     expense.rejectionReason = reason;
//     expense.rejectedBy = req.user._id;
//     expense.rejectedAt = Date.now();

//     // Update workflow based on current status
//     if (expense.approvalStatus === 'pending') {
//       expense.approvalWorkflow.adminApproval = {
//         status: 'rejected',
//         comments: reason,
//         approvedBy: req.user._id,
//         approvedAt: Date.now()
//       };
//     }

//     await expense.save();
//     await expense.populate('driver', 'name email phone');

//     // res.status(200).json({
//     //   success: true,
//     //   message: 'Expense rejected',
//     //   data: { expense }
//     // });

//     res.redirect("/admin/expenses")

//   } catch (error) {
//     console.error('Reject expense error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to reject expense',
//       error: error.message
//     });
//   }
// };

// REJECT EXPENSE (ADMIN)
exports.rejectExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      req.flash('error', 'Rejection reason is required');
      return res.redirect('/admin/expenses');
    }

    const expense = await Expense.findById(expenseId)
      .populate('driver', 'name fcmToken');

    if (!expense) {
      req.flash('error', 'Expense not found');
      return res.redirect('/admin/expenses');
    }

    expense.approvalStatus = 'Rejected';
    expense.rejectionReason = reason;
    expense.rejectedBy = req.user._id;
    expense.rejectedAt = new Date();

    // Update workflow
    if (expense.approvalWorkflow.adminApproval?.status === 'Pending') {
      expense.approvalWorkflow.adminApproval = {
        status: 'Rejected',
        comments: reason,
        approvedBy: req.user._id,
        approvedAt: new Date()
      };
    }

    await expense.save();

    // ────────────────────────────────────────────────
    // CALCULATE REAL AMOUNT (FIXED)
    // ────────────────────────────────────────────────
    let realAmount = 0;
    if (expense.expenseType === 'fuel' && expense.fuelDetails) {
      realAmount = expense.fuelDetails.totalFuelCost || 0;
    } else if (expense.expenseType === 'vehicle' && expense.vehicleExpenseDetails) {
      realAmount = expense.vehicleExpenseDetails.expenseAmount || 0;
    }

    // ────────────────────────────────────────────────
    // NOTIFICATIONS TO DRIVER
    // ────────────────────────────────────────────────
    const driver = expense.driver;
    if (driver) {
      console.log(`[EXPENSE-REJECT-NOTIF] Sending to driver ${driver._id} (${driver.name})`);

      // 1. Push Notification (FCM)
      if (driver.fcmToken && driver.fcmToken.trim().length > 20) {
        console.log(`[EXPENSE-FCM] Attempting send to: ${driver.fcmToken.substring(0, 20)}...`);
        try {
          await sendNotification(
            driver.name || "Driver",
            "english",
            driver.fcmToken,
            "expense_rejected",
            {
              expenseId: expense._id.toString(),
              amount: realAmount,
              expenseType: expense.expenseType,
              reason: reason,
              type: "expense_rejected"
            }
          );
          console.log(`[EXPENSE-NOTIF-SUCCESS] FCM sent for rejection`);
        } catch (pushErr) {
          console.error("[EXPENSE-FCM-ERROR]", pushErr.message || pushErr);
        }
      } else {
        console.warn("[EXPENSE-NOTIF] No valid FCM token for driver");
      }

      // 2. In-app Notification – FIXED AMOUNT
      try {
        await Notification.create({
          recipientId: driver._id,
          recipientType: 'Driver',
          type: 'expense_rejected',
          title: 'Expense Rejected',
          message: `Your ${expense.expenseType} expense of ₹${realAmount} was rejected.${reason ? ` Reason: ${reason}` : ''}`,
          referenceId: expense._id,
          referenceModel: 'Expense',
          priority: 'high',
          createdAt: new Date()
        });
        console.log(`[EXPENSE-NOTIF-SUCCESS] In-app notification created for rejection`);
      } catch (notifErr) {
        console.error("[EXPENSE-INAPP-ERROR]", notifErr.message || notifErr);
      }
    }

    req.flash('success', 'Expense rejected. Driver notified.');
    res.redirect("/admin/expenses");

  } catch (error) {
    console.error('Reject expense error:', error);
    req.flash('error', 'Failed to reject expense');
    res.redirect('/admin/expenses');
  }
};

//  GET EXPENSE REPORTS (ADMIN) 
exports.getExpenseReports = async (req, res) => {
  try {
    const {
      vehicleNumber,
      driverId,
      startDate,
      endDate,
      groupBy = 'month'
    } = req.query;

    const matchStage = {};

    if (vehicleNumber) matchStage['vehicle.vehicleNumber'] = vehicleNumber;
    if (driverId) matchStage.driver = mongoose.Types.ObjectId(driverId);

    if (startDate || endDate) {
      matchStage.expenseDate = {};
      if (startDate) matchStage.expenseDate.$gte = new Date(startDate);
      if (endDate) matchStage.expenseDate.$lte = new Date(endDate);
    }

    // Group by date format
    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-W%V';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m';
    }

    const report = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: dateFormat, date: '$expenseDate' } },
            expenseType: '$expenseType'
          },
          totalAmount: { $sum: '$fuelDetails.totalAmount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$fuelDetails.totalAmount' }
        }
      },
      { $sort: { '_id.period': -1 } }
    ]);

    // Calculate summary
    const summary = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$fuelDetails.totalAmount' },
          totalRecords: { $sum: 1 },
          avgExpense: { $avg: '$fuelDetails.totalAmount' },
          totalFuelQuantity: { $sum: '$fuelDetails.quantity' },
          totalDistance: { $sum: '$mileageData.distanceCovered' },
          avgMileage: { $avg: '$mileageData.averageMileage' }
        }
      }
    ]);

    // Expense by type
    const byType = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$expenseType',
          totalAmount: { $sum: '$fuelDetails.totalAmount' },
          count: { $sum: 1 },
          percentage: { $sum: '$fuelDetails.totalAmount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        report,
        summary: summary[0] || {},
        byExpenseType: byType,
        filters: { vehicleNumber, driverId, startDate, endDate, groupBy }
      }
    });

  } catch (error) {
    console.error('Get expense reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate expense reports',
      error: error.message
    });
  }
};

//  GET EXPENSE ANALYTICS (ADMIN) 
exports.getExpenseAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.expenseDate = {};
      if (startDate) matchStage.expenseDate.$gte = new Date(startDate);
      if (endDate) matchStage.expenseDate.$lte = new Date(endDate);
    }

    // Overview statistics
    const overview = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$fuelDetails.totalAmount' },
          totalRecords: { $sum: 1 },
          avgExpense: { $avg: '$fuelDetails.totalAmount' },
          totalFuel: { $sum: '$fuelDetails.quantity' },
          totalDistance: { $sum: '$mileageData.distanceCovered' },
          avgMileage: { $avg: '$mileageData.averageMileage' }
        }
      }
    ]);

    // Expense by type
    const expenseByType = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$expenseType',
          total: { $sum: '$fuelDetails.totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Approval status breakdown
    const approvalBreakdown = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$fuelDetails.totalAmount' }
        }
      }
    ]);

    // Top drivers by expense
    const topDrivers = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$driver',
          totalExpense: { $sum: '$fuelDetails.totalAmount' },
          tripCount: { $sum: 1 },
          avgExpense: { $avg: '$fuelDetails.totalAmount' },
          avgMileage: { $avg: '$mileageData.averageMileage' }
        }
      },
      { $sort: { totalExpense: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'drivers',
          localField: '_id',
          foreignField: '_id',
          as: 'driverInfo'
        }
      },
      { $unwind: '$driverInfo' },
      {
        $project: {
          driverId: '$_id',
          driverName: '$driverInfo.name',
          vehicleNumber: '$driverInfo.vehicleNumber',
          totalExpense: 1,
          tripCount: 1,
          avgExpense: 1,
          avgMileage: 1
        }
      }
    ]);

    // Monthly trend
    const monthlyTrend = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$expenseDate' } },
          totalExpense: { $sum: '$fuelDetails.totalAmount' },
          avgExpense: { $avg: '$fuelDetails.totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Vehicle efficiency comparison
    const vehicleEfficiency = await Expense.aggregate([
      { $match: { ...matchStage, expenseType: 'fuel' } },
      {
        $group: {
          _id: '$vehicle.vehicleNumber',
          vehicleType: { $first: '$vehicle.vehicleType' },
          avgMileage: { $avg: '$mileageData.averageMileage' },
          totalDistance: { $sum: '$mileageData.distanceCovered' },
          totalFuel: { $sum: '$fuelDetails.quantity' },
          totalCost: { $sum: '$fuelDetails.totalAmount' }
        }
      },
      { $sort: { avgMileage: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: overview[0] || {},
        expenseByType,
        approvalBreakdown,
        topDrivers,
        monthlyTrend,
        vehicleEfficiency
      }
    });

  } catch (error) {
    console.error('Get expense analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics',
      error: error.message
    });
  }
};

// EXPORT EXPENSES (ADMIN) 
exports.exportExpenses = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      driverId,
      vehicleNumber,
      approvalStatus,
      format = 'json'
    } = req.query;

    const query = {};

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    if (driverId) query.driver = driverId;
    if (vehicleNumber) query['vehicle.vehicleNumber'] = vehicleNumber;
    if (approvalStatus) query.approvalStatus = approvalStatus;

    const expenses = await Expense.find(query)
      .populate('driver', 'name email phone vehicleNumber')
      .sort({ expenseDate: -1 })
      .lean();

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = expenses.map(exp => ({
        'Expense ID': exp._id,
        'Date': new Date(exp.expenseDate).toLocaleDateString(),
        'Driver Name': exp.driver?.name || 'N/A',
        'Vehicle Number': exp.vehicle.vehicleNumber,
        'Expense Type': exp.expenseType,
        'Amount': exp.fuelDetails.totalAmount,
        'Fuel Quantity': exp.fuelDetails.quantity || 'N/A',
        'Meter Reading': exp.meterReading.current,
        'Distance': exp.mileageData.distanceCovered || 'N/A',
        'Mileage': exp.mileageData.averageMileage || 'N/A',
        'Status': exp.approvalStatus,
        'Payment Status': exp.paymentStatus
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');

      // Simple CSV conversion (you can use csv-writer package for better formatting)
      const headers = Object.keys(csvData[0]).join(',');
      const rows = csvData.map(row => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');

      return res.send(csv);
    }

    // Default: Return JSON
    res.status(200).json({
      success: true,
      data: {
        expenses,
        total: expenses.length,
        exportedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Export expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export expenses',
      error: error.message
    });
  }
};


module.exports = exports;