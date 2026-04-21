// const User = require('../../models/User');
// const Driver = require('../../models/Driver');
// const Document = require('../../models/Document');
// const { successResponse, errorResponse } = require('../../utils/responseHelper');
// const Session = require('../../models/Session');          
// const RefreshToken = require('../../models/RefreshToken'); 

// // Get Dashboard Statistics
// exports.getDashboardStats = async (req, res) => {
//   try {
//     // Total counts
//     const totalUsers = await User.countDocuments({ role: 'customer', isActive: true });
//     const totalDrivers = await Driver.countDocuments();
//     const totalAdmins = await User.countDocuments({ role: 'admin', isActive: true });

//     // Driver statistics
//     const activeDrivers = await Driver.countDocuments({ isAvailable: true });
//     const approvedDrivers = await Driver.countDocuments({ profileStatus: 'approved' });
//     const pendingDrivers = await Driver.countDocuments({ profileStatus: 'pending_verification' });
//     const rejectedDrivers = await Driver.countDocuments({ profileStatus: 'rejected' });

//     // Document statistics
//     const pendingDocuments = await Document.countDocuments({ status: 'pending' });
//     const verifiedDocuments = await Document.countDocuments({ status: 'verified' });
//     const rejectedDocuments = await Document.countDocuments({ status: 'rejected' });

//     // Recent registrations (last 7 days)
//     const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
//     const recentUsers = await User.countDocuments({
//       role: 'customer',
//       createdAt: { $gte: sevenDaysAgo }
//     });
//     const recentDrivers = await Driver.countDocuments({
//       createdAt: { $gte: sevenDaysAgo }
//     });

//     successResponse(res, 'Dashboard statistics retrieved successfully', {
//       users: {
//         total: totalUsers,
//         recent: recentUsers
//       },
//       drivers: {
//         total: totalDrivers,
//         active: activeDrivers,
//         approved: approvedDrivers,
//         pending: pendingDrivers,
//         rejected: rejectedDrivers,
//         recent: recentDrivers
//       },
//       admins: {
//         total: totalAdmins
//       },
//       documents: {
//         pending: pendingDocuments,
//         verified: verifiedDocuments,
//         rejected: rejectedDocuments
//       }
//     });
//   } catch (error) {
//     errorResponse(res, error.message);
//   }
// };

// // Get All Users (with pagination)
// exports.getAllUsers = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, role, isActive, search } = req.query;

//     // Build query
//     const query = {};
//     if (role) query.role = role;
//     if (isActive !== undefined) query.isActive = isActive === 'true';
//     if (search) {
//       query.$or = [
//         { name: { $regex: search, $options: 'i' } },
//         { email: { $regex: search, $options: 'i' } },
//         { phone: { $regex: search, $options: 'i' } }
//       ];
//     }

//     // Execute query with pagination
//     const users = await User.find(query)
//       .select('-password')
//       .sort({ createdAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit);

//     const total = await User.countDocuments(query);

//     successResponse(res, 'Users retrieved successfully', {
//       users,
//       pagination: {
//         total,
//         page: parseInt(page),
//         pages: Math.ceil(total / limit)
//       }
//     });
//   } catch (error) {
//     errorResponse(res, error.message);
//   }
// };

// // Get All Drivers (with pagination)
// exports.getAllDrivers = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, profileStatus, isAvailable, search } = req.query;

//     // Build query
//     const query = {};
//     if (profileStatus) query.profileStatus = profileStatus;
//     if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';

//     // Search condition
//     if (search) {
//       const searchRegex = new RegExp(search, 'i');
//       query.$or = [
//         { name: searchRegex },
//         { email: searchRegex },
//         { phone: searchRegex },
//         { licenseNumber: searchRegex },
//         { vehicleNumber: searchRegex },
//         { vehicleModel: searchRegex }
//       ];
//     }

//     // Get drivers directly (no populate needed!)
//     const drivers = await Driver.find(query)
//       .select('-password -pin -resetPinToken -resetPinExpires') // sensitive fields hide
//       .sort({ createdAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit);

//     const total = await Driver.countDocuments(query);

//     return successResponse(res, 'Drivers retrieved successfully', {
//       drivers,
//       pagination: {
//         total,
//         page: parseInt(page),
//         pages: Math.ceil(total / limit),
//         limit: parseInt(limit)
//       }
//     });

//   } catch (error) {
//     console.error('Get All Drivers Error:', error);
//     return errorResponse(res, error.message || 'Failed to fetch drivers', 500);
//   }
// };

// // Get Single User Details
// exports.getUserDetails = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const user = await User.findById(userId).select('-password');
//     if (!user) {
//       return errorResponse(res, 'User not found', 404);
//     }

//     // If driver, get driver details
//     let driver = null;
//     if (user.role === 'driver') {
//       driver = await Driver.findOne({ userId: user._id });
//     }

//     successResponse(res, 'User details retrieved successfully', {
//       user,
//       driver
//     });
//   } catch (error) {
//     errorResponse(res, error.message);
//   }
// };

// // Deactivate/Activate User
// exports.toggleUserStatus = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const user = await User.findById(userId);
//     if (!user) {
//       return errorResponse(res, 'User not found', 404);
//     }

//     // Toggle status
//     user.isActive = !user.isActive;
//     await user.save();

//     // If driver, also update availability
//     if (user.role === 'driver') {
//       await Driver.updateOne(
//         { userId: user._id },
//         { isAvailable: false }
//       );
//     }

//     successResponse(res, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, {
//       userId: user._id,
//       isActive: user.isActive
//     });
//   } catch (error) {
//     errorResponse(res, error.message);
//   }
// };

// // Delete User
// exports.deleteUser = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const user = await User.findById(userId);
//     if (!user) {
//       return errorResponse(res, 'User not found', 404);
//     }

//     // Prevent deleting admins
//     if (user.role === 'admin') {
//       return errorResponse(res, 'Cannot delete admin users', 403);
//     }

//     // Agar driver hai to uska saara data delete karo
//     if (user.role === 'driver') {
//       const driver = await Driver.findOne({ userId: user._id });
//       if (driver) {
//         // Ab documents Driver ke andar embedded hain → koi alag collection nahi
//         // Sirf driver delete karne se documents bhi gayab ho jayenge!
//         await Driver.deleteOne({ _id: driver._id });
//       }
//     }

//     // Delete all sessions & refresh tokens
//     await Session.deleteMany({ userId: user._id });
//     await RefreshToken.deleteMany({ userId: user._id });

//     // Finally delete the user
//     await User.deleteOne({ _id: userId });

//     return successResponse(res, 'User and all associated data deleted successfully');

//   } catch (error) {
//     console.error('Delete User Error:', error);
//     return errorResponse(res, error.message || 'Failed to delete user', 500);
//   }
// };

// exports.renderDashboard = async (req, res) => {
//   try {
//     const [
//       totalOrders,
//       totalDeliveries,
//       totalDrivers,
//       totalCustomers,
//       pendingOrders,
//       activeDeliveries,
//       availableDrivers,
//       todayRevenue,
//       recentOrders,
//       activeDeliveriesData
//     ] = await Promise.all([
//       Order.countDocuments(),
//       Delivery.countDocuments(),
//       Driver.countDocuments(),
//       User.countDocuments({ role: 'customer' }),
//       Order.countDocuments({ status: 'pending' }),
//       Delivery.countDocuments({ status: { $in: ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'] } }),
//       Driver.countDocuments({ isAvailable: true }),
//       Order.aggregate([
//         {
//           $match: {
//             createdAt: {
//               $gte: new Date(new Date().setHours(0, 0, 0, 0))
//             },
//             status: { $ne: 'cancelled' }
//           }
//         },
//         {
//           $group: {
//             _id: null,
//             total: { $sum: '$totalAmount' }
//           }
//         }
//       ]),
//       Order.find()
//         .populate('customerId', 'name email')
//         .populate('deliveryId', 'trackingNumber status')
//         .sort({ createdAt: -1 })
//         .limit(10),
//       Delivery.find({ status: { $in: ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'] } })
//         .populate('customerId', 'name phone')
//         .populate('driverId')
//         .limit(10)
//     ]);

//     const orderStatusBreakdown = await Order.aggregate([
//       { $group: { _id: '$status', count: { $sum: 1 } } }
//     ]);

//     const deliveryStatusBreakdown = await Delivery.aggregate([
//       { $group: { _id: '$status', count: { $sum: 1 } } }
//     ]);

//     res.render('admin/dashboard/index', {
//       title: 'Dashboard',
//       user: req.admin,
//       stats: {
//         totalOrders,
//         totalDeliveries,
//         totalDrivers,
//         totalCustomers,
//         pendingOrders,
//         activeDeliveries,
//         availableDrivers,
//         todayRevenue: todayRevenue[0]?.total || 0
//       },
//       orderStatusBreakdown,
//       deliveryStatusBreakdown,
//       recentOrders,
//       activeDeliveries: activeDeliveriesData,
//       success: req.query.success,
//       error: req.query.error
//     });
//   } catch (error) {
//     console.error('Dashboard Error:', error);
//     res.render('admin/dashboard/index', {
//       title: 'Dashboard',
//       user: req.admin,
//       error: 'Failed to load dashboard data'
//     });
//   }
// };

require("dotenv").config()
const mongoose = require("mongoose");
const Order = require('../../models/Order');
const Delivery = require('../../models/Delivery');
const Driver = require('../../models/Driver');
const Customer = require('../../models/Customer');
const Vehicle = require("../../models/Vehicle")
const { sendNotification } = require('../../utils/sendNotification');

//render dashboard
// exports.renderDashboard = async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const last7DaysStart = new Date(today);
//     last7DaysStart.setDate(today.getDate() - 6); // Last 7 days including today

//     const [
//       totalOrders,
//       totalDeliveries,
//       totalDrivers,
//       totalCustomers,
//       todayDeliveries,
//       availableDrivers,
//       availableVehicles,
//       recentOrders,
//       chartData
//     ] = await Promise.all([
//       Order.countDocuments(),
//       Delivery.countDocuments(),
//       Driver.countDocuments(),
//       Customer.countDocuments(),

//       // Today's delivered
//       Delivery.countDocuments({ 
//         status: 'delivered', 
//         actualDeliveryTime: { $gte: today } 
//       }),

//       // Available Drivers: assuming you have isAvailable field in Driver
//       // If Driver also uses "status": "available" → change accordingly
//       Driver.countDocuments({ isAvailable: true }),           // ← Keep if exists

//       // IMPORTANT FIX: Available Vehicles – use your actual field "status": "available"
//       Vehicle.countDocuments({ status: "available" }),       // ← This will give you 1 (or more)

//       // Recent 10 orders
//       Order.find()
//         .populate('customerId', 'name companyName phone')
//         .sort({ createdAt: -1 })
//         .limit(10),

//       // Chart: Orders & Deliveries last 7 days
//       Order.aggregate([
//         {
//           $match: {
//             createdAt: { $gte: last7DaysStart, $lte: today }
//           }
//         },
//         {
//           $group: {
//             _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
//             orders: { $sum: 1 },
//             deliveries: { 
//               $sum: { 
//                 $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] 
//               } 
//             }
//           }
//         },
//         { $sort: { _id: 1 } }
//       ])
//     ]);

//     const currentUrl = req.originalUrl || req.url;

//     res.render('index', {
//       title: 'Dashboard',
//       user: req.admin,
//       url: currentUrl,
//       stats: {
//         totalOrders: totalOrders || 0,
//         totalDeliveries: totalDeliveries || 0,
//         totalDrivers: totalDrivers || 0,
//         totalCustomers: totalCustomers || 0,
//         todayDeliveries: todayDeliveries || 0,
//         availableDrivers: availableDrivers || 0,
//         availableVehicles: availableVehicles || 0
//       },
//       recentOrders: recentOrders || [],
//       chartData: chartData || []
//     });

//   } catch (error) {
//     console.error('Dashboard render error:', error);

//     const currentUrl = req.originalUrl || req.url;

//     res.render('index', {
//       title: 'Dashboard',
//       user: req.admin,
//       url: currentUrl,
//       stats: {
//         totalOrders: 0,
//         totalDeliveries: 0,
//         totalDrivers: 0,
//         totalCustomers: 0,
//         todayDeliveries: 0,
//         availableDrivers: 0,
//         availableVehicles: 0
//       },
//       recentOrders: [],
//       chartData: [],
//       error: 'Failed to load dashboard data. Please try again.'
//     });
//   }
// };

//render dashboard
exports.renderDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const last7DaysStart = new Date(today);
    last7DaysStart.setDate(today.getDate() - 6);

    const [
      totalOrders,
      totalDeliveries,
      totalDrivers,
      totalCustomers,
      todayDeliveries,
      availableDrivers,
      availableVehicles,
      recentOrders,
      chartData
    ] = await Promise.all([
      Order.countDocuments(),
      Delivery.countDocuments(),
      Driver.countDocuments(),
      Customer.countDocuments(),

      Delivery.countDocuments({
        status: 'delivered',
        actualDeliveryTime: { $gte: today }
      }),

      Driver.countDocuments({ isAvailable: true }),

      Vehicle.countDocuments({ status: "available" }),

      Order.find()
        .populate('customerId', 'name companyName phone')
        .sort({ createdAt: -1 })
        .limit(10),

      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: last7DaysStart, $lte: today }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            orders: { $sum: 1 },
            deliveries: {
              $sum: {
                $cond: [{ $eq: ["$status", "delivered"] }, 1, 0]
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const currentUrl = req.originalUrl || req.url;

    res.render('index', {
      title: 'Dashboard',
      user: req.admin,
      url: currentUrl,
      stats: {
        totalOrders: totalOrders || 0,
        totalDeliveries: totalDeliveries || 0,
        totalDrivers: totalDrivers || 0,
        totalCustomers: totalCustomers || 0,
        todayDeliveries: todayDeliveries || 0,
        availableDrivers: availableDrivers || 0,
        availableVehicles: availableVehicles || 0
      },
      recentOrders: recentOrders || [],
      chartData: chartData || []
    });

  } catch (error) {
    console.error('Dashboard render error:', error);

    const currentUrl = req.originalUrl || req.url;

    res.render('index', {
      title: 'Dashboard',
      user: req.admin,
      url: currentUrl,
      stats: {
        totalOrders: 0,
        totalDeliveries: 0,
        totalDrivers: 0,
        totalCustomers: 0,
        todayDeliveries: 0,
        availableDrivers: 0,
        availableVehicles: 0
      },
      recentOrders: [],
      chartData: [],
      error: 'Failed to load dashboard data. Please try again.'
    });
  }
};

// ==================== NEW: GET ALL DRIVER LOCATIONS ====================
/**
 * @route   GET /admin/api/drivers/locations
 * @desc    Get all drivers with their current locations for live map
 * @access  Private (Admin only)
 */
exports.getAllDriverLocations = async (req, res) => {
  try {
    const drivers = await Driver.find({
      'currentLocation.latitude': { $exists: true },
      'currentLocation.longitude': { $exists: true }
    })
      .select('name phone vehicleNumber currentLocation isAvailable currentJourney activeDelivery lastLocationUpdate')
      .populate({
        path: 'currentJourney',
        select: 'status deliveryId',
        strictPopulate: false
      })  
      .lean();

    // Filter out drivers without valid coordinates
    const validDrivers = drivers.filter(driver =>
      driver.currentLocation?.latitude &&
      driver.currentLocation?.longitude
    );

    return res.json({
      success: true,
      count: validDrivers.length,
      data: validDrivers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get Driver Locations Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch driver locations',
      error: error.message
    });
  }
};

// ==================== NEW: GET SINGLE DRIVER LOCATION ====================
/**
 * @route   GET /admin/api/drivers/:driverId/location
 * @desc    Get specific driver's current location
 * @access  Private (Admin only)  
 */
exports.getDriverLocation = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findById(driverId)
      .select('name phone vehicleNumber currentLocation isAvailable currentJourney lastLocationUpdate')
      .populate('currentJourney', 'status deliveryId startTime')
      .lean();

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    if (!driver.currentLocation?.latitude || !driver.currentLocation?.longitude) {
      return res.status(404).json({
        success: false,
        message: 'Location not available for this driver'
      });
    }

    return res.json({
      success: true,
      data: driver,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get Driver Location Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch driver location',
      error: error.message
    });
  }
};

// Render orders list
exports.renderOrdersList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = {};
    if (req.query.search) {
      filter.$or = [
        { orderNumber: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .populate('customerId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalOrders / limit);

    res.render('admin/orders/list', {
      title: 'Orders',
      user: req.admin,
      orders,
      currentPage: page,
      totalPages,
      filters: req.query
    });
  } catch (error) {
    console.error('Orders list error:', error);
    res.status(500).render('admin/orders/list', {
      title: 'Orders',
      user: req.admin,
      orders: [],
      currentPage: 1,
      totalPages: 1,
      filters: {},
      error: 'Failed to load orders'
    });
  }
};

// Render order details
exports.renderOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId')
      .populate('deliveryId');

    if (!order) {
      return res.redirect('/admin/orders?error=Order not found');
    }

    res.render('admin/orders/details', {
      title: `Order ${order.orderNumber}`,
      user: req.admin,
      order
    });
  } catch (error) {
    console.error('Order details error:', error);
    res.redirect('/admin/orders?error=Failed to load order');
  }
};

// Render create order form
exports.renderCreateOrder = async (req, res) => {
  try {
    const customers = await Customer.find({ status: 'active' }).sort({ name: 1 });

    res.render('admin/orders/create', {
      title: 'Create Order',
      user: req.admin,
      customers
    });
  } catch (error) {
    console.error('Create order render error:', error);
    res.redirect('/admin/orders?error=Failed to load form');
  }
};

// Render deliveries list
exports.renderDeliveriesList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = {};
    if (req.query.search) {
      filter.trackingNumber = { $regex: req.query.search, $options: 'i' };
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.driver) {
      filter.driverId = req.query.driver;
    }
    if (req.query.startDate) {
      filter.scheduledDate = { $gte: new Date(req.query.startDate) };
    }

    const [deliveries, totalDeliveries, drivers] = await Promise.all([
      Delivery.find(filter)
        .populate('driverId orderId')
        .populate({
          path: 'orderId',
          populate: { path: 'customerId' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Delivery.countDocuments(filter),
      Driver.find({ status: 'active' }).sort({ name: 1 })
    ]);

    // Calculate stats
    const stats = {
      pending: await Delivery.countDocuments({ status: 'pending' }),
      inTransit: await Delivery.countDocuments({ status: 'in_transit' }),
      outForDelivery: await Delivery.countDocuments({ status: 'out_for_delivery' }),
      delivered: await Delivery.countDocuments({
        status: 'delivered',
        updatedAt: { $gte: new Date().setHours(0, 0, 0, 0) }
      })
    };

    const totalPages = Math.ceil(totalDeliveries / limit);

    res.render('admin/deliveries/list', {
      title: 'Deliveries',
      user: req.admin,
      deliveries,
      drivers,
      stats,
      currentPage: page,
      totalPages,
      filters: req.query
    });
  } catch (error) {
    console.error('Deliveries list error:', error);
    res.status(500).render('admin/deliveries/list', {
      title: 'Deliveries',
      user: req.admin,
      deliveries: [],
      drivers: [],
      stats: {},
      currentPage: 1,
      totalPages: 1,
      filters: {},
      error: 'Failed to load deliveries'
    });
  }
};

// Render delivery details
exports.renderDeliveryDetails = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('driverId orderId')
      .populate({
        path: 'orderId',
        populate: { path: 'customerId' }
      });

    if (!delivery) {
      return res.redirect('/admin/deliveries?error=Delivery not found');
    }

    res.render('admin/deliveries/details', {
      title: `Delivery ${delivery.trackingNumber}`,
      user: req.admin,
      delivery
    });
  } catch (error) {
    console.error('Delivery details error:', error);
    res.redirect('/admin/deliveries?error=Failed to load delivery');
  }
};

// Render live tracking
exports.renderLiveTracking = async (req, res) => {
  try {
    const activeDeliveries = await Delivery.find({
      status: { $in: ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'] }
    })
      .populate('driverId orderId')
      .populate({
        path: 'orderId',
        populate: { path: 'customerId' }
      })
      .sort({ updatedAt: -1 });

    res.render('admin/tracking/live', {
      title: 'Live Tracking',
      user: req.admin,
      activeDeliveries,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
    });
  } catch (error) {
    console.error('Live tracking error:', error);
    res.status(500).render('admin/tracking/live', {
      title: 'Live Tracking',
      user: req.admin,
      activeDeliveries: [],
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
      error: 'Failed to load tracking data'
    });
  }
};


// NEW: Render Drivers List Page (EJS)
exports.renderDriversList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Build filter query (same as your getAllDrivers API)
    const query = {};
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
        { licenseNumber: { $regex: req.query.search, $options: 'i' } },
        { vehicleNumber: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.status === 'active') query.isActive = true;
    if (req.query.status === 'inactive') query.isActive = false;
    if (req.query.isBlocked === 'true') query['blockStatus.isBlocked'] = true;
    if (req.query.isBlocked === 'false') query['blockStatus.isBlocked'] = false;

    const [drivers, total] = await Promise.all([
      Driver.find(query)
        .select('-password -pin -resetPinToken -resetPinExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Driver.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.render('list', {
      title: 'Drivers Management',
      user: req.admin,
      drivers,
      pagination: {
        currentPage: page,
        totalPages,
        total
      },
      filters: req.query,
      url: req.originalUrl
    });
  } catch (error) {
    console.error('Render Drivers List Error:', error);
    res.status(500).render('list', {
      title: 'Drivers Management',
      user: req.admin,
      drivers: [],
      pagination: { currentPage: 1, totalPages: 1, total: 0 },
      filters: {},
      url: req.originalUrl,
      error: 'Failed to load drivers list'
    });
  }
}

exports.renderDriverDetails = async (req, res) => {
  try {
    const driverId = req.params.driverId || req.params.id;
    console.log('[DETAILS] Requested ID:', driverId);

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return res.redirect('/admin/drivers?error=Invalid driver ID');
    }

    const driver = await Driver.findById(driverId)
      .select('-password -pin -resetPinToken -resetPinExpires')
      .lean();

    if (!driver) {
      return res.redirect('/admin/drivers?error=Driver not found');
    }

    // Base URL - IMPORTANT: do NOT add /uploads/ here if it's already in .env
    const baseUrl = process.env.IMAGE_URL || 'http://localhost:5001/uploads/documents';
    // If .env has IMAGE_URL=http://localhost:5001/uploads/  → it's correct, no extra slash

    // Normalize documents
    if (driver.documents && Array.isArray(driver.documents)) {
      const docs = driver.documents;

      // Fix double slash and use correct documentType from your DB
      driver.licenseFront = docs.find(d => d.documentType === 'license_front')?.fileUrl
        ? `${baseUrl}/${docs.find(d => d.documentType === 'license_front').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
        : null;

      driver.licenseBack = docs.find(d => d.documentType === 'license_back')?.fileUrl
        ? `${baseUrl}/${docs.find(d => d.documentType === 'license_back').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
        : null;

      // Updated documentType names from your DB
      driver.rcFront = docs.find(d => d.documentType === 'vehicle_Mulkia_front')?.fileUrl
        ? `${baseUrl}/${docs.find(d => d.documentType === 'vehicle_Mulkia_front').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
        : null;

      driver.rcBack = docs.find(d => d.documentType === 'vehicle_Mulkia_back')?.fileUrl
        ? `${baseUrl}/${docs.find(d => d.documentType === 'vehicle_Mulkia_back').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
        : null;

      console.log('[DETAILS] Fixed Document URLs:', {
        licenseFront: driver.licenseFront,
        licenseBack: driver.licenseBack,
        rcFront: driver.rcFront,
        rcBack: driver.rcBack
      });
    }

    // Rest of your code (vehicle, deliveries, stats, render)...
    const assignedVehicle = await Vehicle.findOne({ assignedDriver: driverId })
      .select('vehicleNumber vehicleType currentMeterReading status')
      .lean() || null;

    const recentDeliveries = await Delivery.find({ driverId: driver._id })
      .populate('orderId')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const stats = {
      totalDeliveries: await Delivery.countDocuments({ driverId }),
      completed: await Delivery.countDocuments({ driverId, status: 'delivered' }),
      active: await Delivery.countDocuments({
        driverId,
        status: { $in: ['in_transit', 'out_for_delivery', 'assigned'] }
      })
    };

    res.render('details', {
      title: `Driver - ${driver.name || 'Details'}`,
      user: req.admin,
      driver,
      assignedVehicle,
      recentDeliveries,
      stats,
      url: req.originalUrl
    });

  } catch (error) {
    console.error('[DETAILS] CRITICAL ERROR:', error);
    res.redirect('/admin/drivers?error=Failed to load driver details');
  }
};

// exports.toggleDriverProfileStatus = async (req, res) => {
//   try {
//     const { driverId, status } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(driverId)) {
//       req.flash('error', 'Invalid driver ID');
//       return res.redirect(`/admin/drivers/view/${driverId}`);
//     }

//     const driver = await Driver.findById(driverId);
//     if (!driver) {
//       req.flash('error', 'Driver not found');
//       return res.redirect('/admin/drivers');
//     }

//     const newStatus = status === '1' ? 'approved' : 'rejected';

//     // Optional: You can add extra check before approving
//     if (newStatus === 'approved') {
//       const allVerified = driver.documents.every(doc => doc.status === 'verified');
//       if (!allVerified) {
//         req.flash('error', 'Cannot approve: Not all documents are verified yet!');
//         return res.redirect(`/admin/drivers/view/${driverId}`);
//       }
//     }

//     driver.profileStatus = newStatus;
//     await driver.save();

//     // Optional: Send notification to driver via FCM
//     if (driver.fcmToken) {
//       const message = newStatus === 'approved'
//         ? "Congratulations! Your profile has been approved ✓ You can now start accepting deliveries."
//         : "Your profile has been rejected. Please check documents and re-submit.";

//       await sendFCMNotification({
//         token: driver.fcmToken,
//         title: newStatus === 'approved' ? "Profile Approved!" : "Profile Rejected",
//         body: message,
//         data: { type: "profile_status_update", status: newStatus }
//       });
//     }

//     req.flash('success', `Driver profile status updated to ${newStatus.toUpperCase()}`);
//     res.redirect(`/admin/drivers/view/${driverId}`);

//   } catch (error) {
//     console.error('Profile status toggle error:', error);
//     req.flash('error', 'Failed to update profile status');
//     res.redirect(`/admin/drivers/view/${driverId}`);
//   }
// };

// exports.toggleDriverProfileStatus = async (req, res) => {
//   let driverId; // declare outside try so catch can use it

//   try {
//     ({ driverId, status } = req.params); // destructuring

//     if (!mongoose.Types.ObjectId.isValid(driverId)) {
//       req.flash('error', 'Invalid driver ID');
//       return res.redirect(`/admin/drivers`);
//     }

//     const driver = await Driver.findById(driverId);
//     if (!driver) {
//       req.flash('error', 'Driver not found');
//       return res.redirect('/admin/drivers');
//     }

//     const newStatus = status === '1' ? 'approved' : 'rejected';

//     // Extra safety check for approval
//     if (newStatus === 'approved') {
//       const allVerified = driver.documents.every(doc => doc.status === 'verified');
//       if (!allVerified) {
//         req.flash('error', 'Cannot approve: Not all documents are verified yet!');
//         return res.redirect(`/admin/drivers/view/${driverId}`);
//       }
//     }

//     // Update status
//     driver.profileStatus = newStatus;
//     if (newStatus === 'rejected') {
//       driver.rejectionReason = req.body.rejectionReason?.trim() || 'Documents did not meet requirements';
//     } else {
//       driver.rejectionReason = null; // clear on approve
//     }

//     await driver.save();

//     // Send notification using your EXISTING sendNotification function
//     if (driver.fcmToken) {
//       const isApproved = newStatus === 'approved';

//       const notificationData = {
//         title: isApproved ? "Profile Approved!" : "Profile Rejected",
//         body: isApproved
//           ? `Congratulations ${driver.name || 'Driver'}! Your profile has been approved. You can now go online and accept deliveries.`
//           : `Your profile has been rejected. Reason: ${driver.rejectionReason}. Please update documents and re-submit.`,
//         type: "profile_status_update",
//         status: newStatus,
//         driverId: driver._id.toString()
//       };

//       // Use your actual notification function (same as acceptRequest style)
//       await sendNotification(driver.fcmToken, notificationData);

//       console.log(`Profile ${newStatus} notification sent to driver ${driver._id}`);
//     } else {
//       console.warn(`No FCM token for driver ${driver._id} — notification skipped`);
//     }

//     req.flash('success', `Driver profile status updated to ${newStatus.toUpperCase()}`);
//     res.redirect(`/admin/drivers/view/${driverId}`);

//   } catch (error) {
//     console.error('Profile status toggle error:', error);

//     req.flash('error', 'Failed to update profile status');

//     // Safe redirect — use driverId if available, else go to list
//     const redirectUrl = driverId 
//       ? `/admin/drivers/view/${driverId}` 
//       : '/admin/drivers';

//     res.redirect(redirectUrl);
//   }
// };

exports.toggleDriverProfileStatus = async (req, res) => {
  let driverId; // catch block ke liye

  try {
    ({ driverId, status } = req.params);

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      req.flash('error', 'Invalid driver ID');
      return res.redirect(`/admin/drivers`);
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      req.flash('error', 'Driver not found');
      return res.redirect('/admin/drivers');
    }

    const newStatus = status === '1' ? 'approved' : 'rejected';

    // Approval ke liye check
    if (newStatus === 'approved') {
      const allVerified = driver.documents.every(doc => doc.status === 'verified');
      if (!allVerified) {
        req.flash('error', 'Cannot approve: Not all documents are verified yet!');
        return res.redirect(`/admin/drivers/view/${driverId}`);
      }
    }

    // Rejection reason handle karo (prompt se aa raha hai query param mein)
    let rejectionReasonText = null;
    if (newStatus === 'rejected') {
      rejectionReasonText = req.query.reason?.trim() || 'Documents did not meet requirements';
      driver.rejectionReason = rejectionReasonText;
    } else {
      driver.rejectionReason = null;
    }

    driver.profileStatus = newStatus;
    await driver.save();

    // Notification bhejo with logs
    if (driver.fcmToken) {
      const isApproved = newStatus === 'approved';

      const notificationData = {
        title: isApproved ? "Profile Approved!" : "Profile Rejected",
        body: isApproved
          ? `Congratulations ${driver.name || 'Driver'}! Your profile has been approved. You can now go online and accept deliveries.`
          : `Your profile has been rejected. Reason: ${rejectionReasonText || 'Not specified'}. Please update documents and re-submit.`,
        type: "profile_status_update",
        status: newStatus,
        driverId: driver._id.toString()
      };

      console.log(`[NOTIF ATTEMPT] Sending ${newStatus.toUpperCase()} notification to driver ${driver._id}`);

      try {
        await sendNotification(driver.fcmToken, notificationData);
        console.log(`[NOTIF SUCCESS] ${newStatus.toUpperCase()} notification sent to ${driver._id}`);
      } catch (notifErr) {
        console.error(`[NOTIF FAILED] ${newStatus.toUpperCase()} notification failed for ${driver._id}:`, notifErr.message);
      }
    } else {
      console.warn(`[NOTIF SKIPPED] No FCM token for driver ${driver._id}`);
    }

    req.flash('success', `Driver profile status updated to ${newStatus.toUpperCase()}`);
    res.redirect(`/admin/drivers/view/${driverId}`);

  } catch (error) {
    console.error('Profile status toggle error:', error);

    req.flash('error', 'Failed to update profile status');

    const redirectUrl = driverId
      ? `/admin/drivers/view/${driverId}`
      : '/admin/drivers';

    res.redirect(redirectUrl);
  }
};

