// require("dotenv").config()
// const mongoose = require("mongoose");
// const Order = require('../../models/Order');
// const Delivery = require('../../models/Delivery');
// const Driver = require('../../models/Driver');
// const Customer = require('../../models/Customer');
// const Vehicle = require("../../models/Vehicle")
// const { sendNotification } = require('../../utils/sendNotification');

// //render dashboard
// // exports.renderDashboard = async (req, res) => {
// //   try {
// //     const today = new Date();
// //     today.setHours(0, 0, 0, 0);

// //     const last7DaysStart = new Date(today);
// //     last7DaysStart.setDate(today.getDate() - 6); // Last 7 days including today

// //     const [
// //       totalOrders,
// //       totalDeliveries,
// //       totalDrivers,
// //       totalCustomers,
// //       todayDeliveries,
// //       availableDrivers,
// //       availableVehicles,
// //       recentOrders,
// //       chartData
// //     ] = await Promise.all([
// //       Order.countDocuments(),
// //       Delivery.countDocuments(),
// //       Driver.countDocuments(),
// //       Customer.countDocuments(),

// //       // Today's delivered
// //       Delivery.countDocuments({ 
// //         status: 'delivered', 
// //         actualDeliveryTime: { $gte: today } 
// //       }),

// //       // Available Drivers: assuming you have isAvailable field in Driver
// //       // If Driver also uses "status": "available" → change accordingly
// //       Driver.countDocuments({ isAvailable: true }),           // ← Keep if exists

// //       // IMPORTANT FIX: Available Vehicles – use your actual field "status": "available"
// //       Vehicle.countDocuments({ status: "available" }),       // ← This will give you 1 (or more)

// //       // Recent 10 orders
// //       Order.find()
// //         .populate('customerId', 'name companyName phone')
// //         .sort({ createdAt: -1 })
// //         .limit(10),

// //       // Chart: Orders & Deliveries last 7 days
// //       Order.aggregate([
// //         {
// //           $match: {
// //             createdAt: { $gte: last7DaysStart, $lte: today }
// //           }
// //         },
// //         {
// //           $group: {
// //             _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
// //             orders: { $sum: 1 },
// //             deliveries: { 
// //               $sum: { 
// //                 $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] 
// //               } 
// //             }
// //           }
// //         },
// //         { $sort: { _id: 1 } }
// //       ])
// //     ]);

// //     const currentUrl = req.originalUrl || req.url;

// //     res.render('index', {
// //       title: 'Dashboard',
// //       user: req.admin,
// //       url: currentUrl,
// //       stats: {
// //         totalOrders: totalOrders || 0,
// //         totalDeliveries: totalDeliveries || 0,
// //         totalDrivers: totalDrivers || 0,
// //         totalCustomers: totalCustomers || 0,
// //         todayDeliveries: todayDeliveries || 0,
// //         availableDrivers: availableDrivers || 0,
// //         availableVehicles: availableVehicles || 0
// //       },
// //       recentOrders: recentOrders || [],
// //       chartData: chartData || []
// //     });

// //   } catch (error) {
// //     console.error('Dashboard render error:', error);

// //     const currentUrl = req.originalUrl || req.url;

// //     res.render('index', {
// //       title: 'Dashboard',
// //       user: req.admin,
// //       url: currentUrl,
// //       stats: {
// //         totalOrders: 0,
// //         totalDeliveries: 0,
// //         totalDrivers: 0,
// //         totalCustomers: 0,
// //         todayDeliveries: 0,
// //         availableDrivers: 0,
// //         availableVehicles: 0
// //       },
// //       recentOrders: [],
// //       chartData: [],
// //       error: 'Failed to load dashboard data. Please try again.'
// //     });
// //   }
// // };

// //render dashboard

// exports.renderDashboard = async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const todayEnd = new Date();           // ← Yeh add karo
//     todayEnd.setHours(23, 59, 59, 999);

//     const last7DaysStart = new Date(today);
//     last7DaysStart.setDate(today.getDate() - 6);

//     const approvedDriverFilter = {
//       profileStatus: 'approved',
//       isActive: true,
//       'blockStatus.isBlocked': { $ne: true }
//     };

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
//       Driver.countDocuments(approvedDriverFilter),
//       Customer.countDocuments(),

//       Delivery.countDocuments({
//         createdAt: {
//           $gte: today,
//           $lte: todayEnd
//         }
//       }),

//       Driver.countDocuments({ isAvailable: true }),

//       // ✅ Sirf approved + available drivers
//       Driver.countDocuments({
//         ...approvedDriverFilter,
//         isAvailable: true
//       }),

//       Vehicle.countDocuments({ status: "available" }),

//       Order.find()
//         .populate('customerId', 'name companyName phone')
//         .sort({ createdAt: -1 })
//         .limit(10),

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


// // exports.renderDashboard = async (req, res) => {
// //   try {
// //     const today = new Date();
// //     today.setHours(0, 0, 0, 0);
// //     const todayEnd = new Date();
// //     todayEnd.setHours(23, 59, 59, 999);
// //     const last7DaysStart = new Date(today);
// //     last7DaysStart.setDate(today.getDate() - 6);

// //     // ✅ Consistent filter — har jagah same condition
// //     const approvedDriverFilter = {
// //       profileStatus: 'approved',
// //       isActive: true,
// //       'blockStatus.isBlocked': { $ne: true }
// //     };

// //     const [
// //       totalOrders,
// //       totalDeliveries,
// //       totalDrivers,
// //       totalCustomers,
// //       todayDeliveries,
// //       availableDrivers,
// //       availableVehicles,
// //       recentOrders,
// //       chartData
// //     ] = await Promise.all([
// //       Order.countDocuments(),
// //       Delivery.countDocuments(),

// //       // ✅ Sirf approved drivers
// //       Driver.countDocuments(approvedDriverFilter),

// //       Customer.countDocuments(),

// //       Delivery.countDocuments({
// //         createdAt: { $gte: today, $lte: todayEnd }
// //       }),

// //       // ✅ Sirf approved + available drivers
// //       Driver.countDocuments({ 
// //         ...approvedDriverFilter,
// //         isAvailable: true 
// //       }),

// //       Vehicle.countDocuments({ status: "available" }),

// //       Order.find()
// //         .populate('customerId', 'name companyName phone')
// //         .sort({ createdAt: -1 })
// //         .limit(10),

// //       Order.aggregate([
// //         {
// //           $match: {
// //             createdAt: { $gte: last7DaysStart, $lte: today }
// //           }
// //         },
// //         {
// //           $group: {
// //             _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
// //             orders: { $sum: 1 },
// //             deliveries: {
// //               $sum: {
// //                 $cond: [{ $eq: ["$status", "delivered"] }, 1, 0]
// //               }
// //             }
// //           }
// //         },
// //         { $sort: { _id: 1 } }
// //       ])
// //     ]);

// //     const currentUrl = req.originalUrl || req.url;

// //     res.render('index', {
// //       title: 'Dashboard',
// //       user: req.admin,
// //       url: currentUrl,
// //       messages: req.flash(),
// //       stats: {
// //         totalOrders: totalOrders || 0,
// //         totalDeliveries: totalDeliveries || 0,
// //         totalDrivers: totalDrivers || 0,
// //         totalCustomers: totalCustomers || 0,
// //         todayDeliveries: todayDeliveries || 0,
// //         availableDrivers: availableDrivers || 0,
// //         availableVehicles: availableVehicles || 0
// //       },
// //       recentOrders: recentOrders || [],
// //       chartData: chartData || []
// //     });

// //   } catch (error) {
// //     console.error('Dashboard render error:', error);
// //     const currentUrl = req.originalUrl || req.url;
// //     res.render('index', {
// //       title: 'Dashboard',
// //       user: req.admin,
// //       url: currentUrl,
// //       messages: req.flash(),
// //       stats: {
// //         totalOrders: 0, totalDeliveries: 0, totalDrivers: 0,
// //         totalCustomers: 0, todayDeliveries: 0,
// //         availableDrivers: 0, availableVehicles: 0
// //       },
// //       recentOrders: [],
// //       chartData: []
// //     });
// //   }
// // };

// // ==================== NEW: GET ALL DRIVER LOCATIONS ====================
// /**
//  * @route   GET /admin/api/drivers/locations
//  * @desc    Get all drivers with their current locations for live map
//  * @access  Private (Admin only)
//  */
// // exports.getAllDriverLocations = async (req, res) => {
// //   try {
// //     const drivers = await Driver.find({
// //       'currentLocation.latitude': { $exists: true },
// //       'currentLocation.longitude': { $exists: true }
// //     })
// //       .select('name phone vehicleNumber currentLocation isAvailable currentJourney activeDelivery lastLocationUpdate')
// //       .populate({
// //         path: 'currentJourney',
// //         select: 'status deliveryId',
// //         strictPopulate: false
// //       })
// //       .lean();

// //     // Filter out drivers without valid coordinates
// //     const validDrivers = drivers.filter(driver =>
// //       driver.currentLocation?.latitude &&
// //       driver.currentLocation?.longitude
// //     );

// //     return res.json({
// //       success: true,
// //       count: validDrivers.length,
// //       data: validDrivers,
// //       timestamp: new Date().toISOString()
// //     });

// //   } catch (error) {
// //     console.error('Get Driver Locations Error:', error);
// //     return res.status(500).json({
// //       success: false,
// //       message: 'Failed to fetch driver locations',
// //       error: error.message
// //     });
// //   }
// // };

// // ==================== NEW: GET SINGLE DRIVER LOCATION ====================

// exports.getAllDriverLocations = async (req, res) => {
//   try {
//     // Sirf approved + active + non-blocked drivers
//     const drivers = await Driver.find({
//       profileStatus: 'approved',
//       isActive: true,
//       'blockStatus.isBlocked': { $ne: true }
//     })
//       .select('name phone vehicleNumber currentLocation isAvailable currentJourney lastLocationUpdate')
//       .populate({
//         path: 'currentJourney',
//         select: 'status deliveryId',
//         strictPopulate: false
//       })
//       .lean();

//     return res.json({
//       success: true,
//       count: drivers.length,
//       data: drivers,
//       timestamp: new Date().toISOString()
//     });

//   } catch (error) {
//     console.error('Get Driver Locations Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch driver locations',
//       error: error.message
//     });
//   }
// };
// /**
//  * @route   GET /admin/api/drivers/:driverId/location
//  * @desc    Get specific driver's current location
//  * @access  Private (Admin only)  
//  */
// exports.getDriverLocation = async (req, res) => {
//   try {
//     const { driverId } = req.params;

//     const driver = await Driver.findById(driverId)
//       .select('name phone vehicleNumber currentLocation isAvailable currentJourney lastLocationUpdate')
//       .populate('currentJourney', 'status deliveryId startTime')
//       .lean();

//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: 'Driver not found'
//       });
//     }

//     if (!driver.currentLocation?.latitude || !driver.currentLocation?.longitude) {
//       return res.status(404).json({
//         success: false,
//         message: 'Location not available for this driver'
//       });
//     }

//     return res.json({
//       success: true,
//       data: driver,
//       timestamp: new Date().toISOString()
//     });

//   } catch (error) {
//     console.error('Get Driver Location Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch driver location',
//       error: error.message
//     });
//   }
// };

// // Render orders list
// exports.renderOrdersList = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = 20;
//     const skip = (page - 1) * limit;

//     // Build filter query
//     const filter = {};
//     if (req.query.search) {
//       filter.$or = [
//         { orderNumber: { $regex: req.query.search, $options: 'i' } }
//       ];
//     }
//     if (req.query.status) {
//       filter.status = req.query.status;
//     }
//     if (req.query.priority) {
//       filter.priority = req.query.priority;
//     }

//     const [orders, totalOrders] = await Promise.all([
//       Order.find(filter)
//         .populate('customerId')
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit),
//       Order.countDocuments(filter)
//     ]);

//     const totalPages = Math.ceil(totalOrders / limit);

//     res.render('admin/orders/list', {
//       title: 'Orders',
//       user: req.admin,
//       orders,
//       currentPage: page,
//       totalPages,
//       filters: req.query
//     });
//   } catch (error) {
//     console.error('Orders list error:', error);
//     res.status(500).render('admin/orders/list', {
//       title: 'Orders',
//       user: req.admin,
//       orders: [],
//       currentPage: 1,
//       totalPages: 1,
//       filters: {},
//       error: 'Failed to load orders'
//     });
//   }
// };

// // Render order details
// exports.renderOrderDetails = async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.id)
//       .populate('customerId')
//       .populate('deliveryId');

//     if (!order) {
//       return res.redirect('/admin/orders?error=Order not found');
//     }

//     res.render('admin/orders/details', {
//       title: `Order ${order.orderNumber}`,
//       user: req.admin,
//       order
//     });
//   } catch (error) {
//     console.error('Order details error:', error);
//     res.redirect('/admin/orders?error=Failed to load order');
//   }
// };

// // Render create order form
// exports.renderCreateOrder = async (req, res) => {
//   try {
//     const customers = await Customer.find({ status: 'active' }).sort({ name: 1 });

//     res.render('admin/orders/create', {
//       title: 'Create Order',
//       user: req.admin,
//       customers
//     });
//   } catch (error) {
//     console.error('Create order render error:', error);
//     res.redirect('/admin/orders?error=Failed to load form');
//   }
// };

// // Render deliveries list
// exports.renderDeliveriesList = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = 20;
//     const skip = (page - 1) * limit;

//     // Build filter query
//     const filter = {};
//     if (req.query.search) {
//       filter.trackingNumber = { $regex: req.query.search, $options: 'i' };
//     }
//     if (req.query.status) {
//       filter.status = req.query.status;
//     }
//     if (req.query.driver) {
//       filter.driverId = req.query.driver;
//     }
//     if (req.query.startDate) {
//       filter.scheduledDate = { $gte: new Date(req.query.startDate) };
//     }

//     const [deliveries, totalDeliveries, drivers] = await Promise.all([
//       Delivery.find(filter)
//         .populate('driverId orderId')
//         .populate({
//           path: 'orderId',
//           populate: { path: 'customerId' }
//         })
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit),
//       Delivery.countDocuments(filter),
//       Driver.find({ status: 'active' }).sort({ name: 1 })
//     ]);

//     // Calculate stats
//     const stats = {
//       pending: await Delivery.countDocuments({ status: 'pending' }),
//       inTransit: await Delivery.countDocuments({ status: 'in_transit' }),
//       outForDelivery: await Delivery.countDocuments({ status: 'out_for_delivery' }),
//       delivered: await Delivery.countDocuments({
//         status: 'delivered',
//         updatedAt: { $gte: new Date().setHours(0, 0, 0, 0) }
//       })
//     };

//     const totalPages = Math.ceil(totalDeliveries / limit);

//     res.render('admin/deliveries/list', {
//       title: 'Deliveries',
//       user: req.admin,
//       deliveries,
//       drivers,
//       stats,
//       currentPage: page,
//       totalPages,
//       filters: req.query
//     });
//   } catch (error) {
//     console.error('Deliveries list error:', error);
//     res.status(500).render('admin/deliveries/list', {
//       title: 'Deliveries',
//       user: req.admin,
//       deliveries: [],
//       drivers: [],
//       stats: {},
//       currentPage: 1,
//       totalPages: 1,
//       filters: {},
//       error: 'Failed to load deliveries'
//     });
//   }
// };

// // Render delivery details
// exports.renderDeliveryDetails = async (req, res) => {
//   try {
//     const delivery = await Delivery.findById(req.params.id)
//       .populate('driverId orderId')
//       .populate({
//         path: 'orderId',
//         populate: { path: 'customerId' }
//       });

//     if (!delivery) {
//       return res.redirect('/admin/deliveries?error=Delivery not found');
//     }

//     res.render('admin/deliveries/details', {
//       title: `Delivery ${delivery.trackingNumber}`,
//       user: req.admin,
//       delivery
//     });
//   } catch (error) {
//     console.error('Delivery details error:', error);
//     res.redirect('/admin/deliveries?error=Failed to load delivery');
//   }
// };

// // Render live tracking
// exports.renderLiveTracking = async (req, res) => {
//   try {
//     const activeDeliveries = await Delivery.find({
//       status: { $in: ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'] }
//     })
//       .populate('driverId orderId')
//       .populate({
//         path: 'orderId',
//         populate: { path: 'customerId' }
//       })
//       .sort({ updatedAt: -1 });

//     res.render('admin/tracking/live', {
//       title: 'Live Tracking',
//       user: req.admin,
//       activeDeliveries,
//       googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
//     });
//   } catch (error) {
//     console.error('Live tracking error:', error);
//     res.status(500).render('admin/tracking/live', {
//       title: 'Live Tracking',
//       user: req.admin,
//       activeDeliveries: [],
//       googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
//       error: 'Failed to load tracking data'
//     });
//   }
// };


// // NEW: Render Drivers List Page (EJS)
// exports.renderDriversList = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = 20;
//     const skip = (page - 1) * limit;

//     // Build filter query (same as your getAllDrivers API)
//     const query = {};
//     if (req.query.search) {
//       query.$or = [
//         { name: { $regex: req.query.search, $options: 'i' } },
//         { email: { $regex: req.query.search, $options: 'i' } },
//         { phone: { $regex: req.query.search, $options: 'i' } },
//         { licenseNumber: { $regex: req.query.search, $options: 'i' } },
//         { vehicleNumber: { $regex: req.query.search, $options: 'i' } }
//       ];
//     }
//     if (req.query.status === 'active') query.isActive = true;
//     if (req.query.status === 'inactive') query.isActive = false;
//     if (req.query.isBlocked === 'true') query['blockStatus.isBlocked'] = true;
//     if (req.query.isBlocked === 'false') query['blockStatus.isBlocked'] = false;

//     const [drivers, total] = await Promise.all([
//       Driver.find(query)
//         .select('-password -pin -resetPinToken -resetPinExpires')
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit),
//       Driver.countDocuments(query)
//     ]);

//     const totalPages = Math.ceil(total / limit);

//     res.render('list', {
//       title: 'Drivers Management',
//       user: req.admin,
//       drivers,
//       messages: req.flash(),
//       pagination: {
//         currentPage: page,
//         totalPages,
//         total
//       },
//       filters: req.query,
//       url: req.originalUrl
//     });
//   } catch (error) {
//     console.error('Render Drivers List Error:', error);
//     res.status(500).render('list', {
//       title: 'Drivers Management',
//       user: req.admin,
//       drivers: [],
//       pagination: { currentPage: 1, totalPages: 1, total: 0 },
//       filters: {},
//       url: req.originalUrl,
//       error: 'Failed to load drivers list'
//     });
//   }
// }

// exports.renderDriverDetails = async (req, res) => {
//   try {
//     const driverId = req.params.driverId || req.params.id;
//     console.log('[DETAILS] Requested ID:', driverId);

//     if (!mongoose.Types.ObjectId.isValid(driverId)) {
//       return res.redirect('/admin/drivers?error=Invalid driver ID');
//     }

//     const driver = await Driver.findById(driverId)
//       .select('-password -pin -resetPinToken -resetPinExpires')
//       .lean();

//     if (!driver) {
//       return res.redirect('/admin/drivers?error=Driver not found');
//     }

//     // Base URL - IMPORTANT: do NOT add /uploads/ here if it's already in .env
//     const baseUrl = process.env.IMAGE_URL || 'http://localhost:5001/uploads/documents';
//     // If .env has IMAGE_URL=http://localhost:5001/uploads/  → it's correct, no extra slash

//     // Normalize documents
//     if (driver.documents && Array.isArray(driver.documents)) {
//       const docs = driver.documents;

//       // Fix double slash and use correct documentType from your DB
//       driver.licenseFront = docs.find(d => d.documentType === 'license_front')?.fileUrl
//         ? `${baseUrl}/${docs.find(d => d.documentType === 'license_front').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
//         : null;

//       driver.licenseBack = docs.find(d => d.documentType === 'license_back')?.fileUrl
//         ? `${baseUrl}/${docs.find(d => d.documentType === 'license_back').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
//         : null;

//       // Updated documentType names from your DB
//       driver.rcFront = docs.find(d => d.documentType === 'vehicle_Mulkia_front')?.fileUrl
//         ? `${baseUrl}/${docs.find(d => d.documentType === 'vehicle_Mulkia_front').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
//         : null;

//       driver.rcBack = docs.find(d => d.documentType === 'vehicle_Mulkia_back')?.fileUrl
//         ? `${baseUrl}/${docs.find(d => d.documentType === 'vehicle_Mulkia_back').fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
//         : null;

//       console.log('[DETAILS] Fixed Document URLs:', {
//         licenseFront: driver.licenseFront,
//         licenseBack: driver.licenseBack,
//         rcFront: driver.rcFront,
//         rcBack: driver.rcBack
//       });
//     }

//     // Rest of your code (vehicle, deliveries, stats, render)...
//     const assignedVehicle = await Vehicle.findOne({ assignedDriver: driverId })
//       .select('vehicleNumber vehicleType currentMeterReading status')
//       .lean() || null;

//     const recentDeliveries = await Delivery.find({ driverId: driver._id })
//       .populate('orderId')
//       .sort({ createdAt: -1 })
//       .limit(10)
//       .lean();

//     const stats = {
//       totalDeliveries: await Delivery.countDocuments({ driverId }),
//       completed: await Delivery.countDocuments({ driverId, status: 'delivered' }),
//       active: await Delivery.countDocuments({
//         driverId,
//         status: { $in: ['in_transit', 'out_for_delivery', 'assigned'] }
//       })
//     };

//     res.render('details', {
//       title: `Driver - ${driver.name || 'Details'}`,
//       user: req.admin,
//       driver,
//       assignedVehicle,
//       recentDeliveries,
//       stats,
//       url: req.originalUrl
//     });

//   } catch (error) {
//     console.error('[DETAILS] CRITICAL ERROR:', error);
//     res.redirect('/admin/drivers?error=Failed to load driver details');
//   }
// };

// exports.toggleDriverProfileStatus = async (req, res) => {
//   let driverId; // catch block ke liye

//   try {
//     ({ driverId, status } = req.params);

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

//     // Approval ke liye check
//     if (newStatus === 'approved') {
//       const allVerified = driver.documents.every(doc => doc.status === 'verified');
//       if (!allVerified) {
//         req.flash('error', 'Cannot approve: Not all documents are verified yet!');
//         return res.redirect(`/admin/drivers/view/${driverId}`);
//       }
//     }

//     // Rejection reason handle karo (prompt se aa raha hai query param mein)
//     let rejectionReasonText = null;
//     if (newStatus === 'rejected') {
//       rejectionReasonText = req.query.reason?.trim() || 'Documents did not meet requirements';
//       driver.rejectionReason = rejectionReasonText;
//     } else {
//       driver.rejectionReason = null;
//     }

//     driver.profileStatus = newStatus;
//     await driver.save();

//     // Notification bhejo with logs
//     if (driver.fcmToken) {
//       const isApproved = newStatus === 'approved';

//       const notificationData = {
//         title: isApproved ? "Profile Approved!" : "Profile Rejected",
//         body: isApproved
//           ? `Congratulations ${driver.name || 'Driver'}! Your profile has been approved. You can now go online and accept deliveries.`
//           : `Your profile has been rejected. Reason: ${rejectionReasonText || 'Not specified'}. Please update documents and re-submit.`,
//         type: "profile_status_update",
//         status: newStatus,
//         driverId: driver._id.toString()
//       };

//       console.log(`[NOTIF ATTEMPT] Sending ${newStatus.toUpperCase()} notification to driver ${driver._id}`);

//       try {
//         await sendNotification(driver.fcmToken, notificationData);
//         console.log(`[NOTIF SUCCESS] ${newStatus.toUpperCase()} notification sent to ${driver._id}`);
//       } catch (notifErr) {
//         console.error(`[NOTIF FAILED] ${newStatus.toUpperCase()} notification failed for ${driver._id}:`, notifErr.message);
//       }
//     } else {
//       console.warn(`[NOTIF SKIPPED] No FCM token for driver ${driver._id}`);
//     }

//     req.flash('success', `Driver profile status updated to ${newStatus.toUpperCase()}`);
//     res.redirect(`/admin/drivers/view/${driverId}`);

//   } catch (error) {
//     console.error('Profile status toggle error:', error);

//     req.flash('error', 'Failed to update profile status');

//     const redirectUrl = driverId
//       ? `/admin/drivers/view/${driverId}`
//       : '/admin/drivers';

//     res.redirect(redirectUrl);
//   }
// };


// FILE: controllers/admin/adminDashboardController.js
// CHANGES:
//   1. getAllDriverLocations - yeh route /admin/api/drivers/locations pe serve hota hai
//   2. renderLiveTracking - googleMapsApiKey pass karna fix kiya

// require("dotenv").config();
// const mongoose = require("mongoose");
// const Order = require('../../models/Order');
// const Delivery = require('../../models/Delivery');
// const Driver = require('../../models/Driver');
// const Customer = require('../../models/Customer');
// const Vehicle = require("../../models/Vehicle");
// const { sendNotification } = require('../../utils/sendNotification');

// // ==================== RENDER DASHBOARD ====================
// exports.renderDashboard = async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const todayEnd = new Date();
//     todayEnd.setHours(23, 59, 59, 999);
//     const last7DaysStart = new Date(today);
//     last7DaysStart.setDate(today.getDate() - 6);

//     const approvedDriverFilter = {
//       profileStatus: 'approved',
//       isActive: true,
//       'blockStatus.isBlocked': { $ne: true }
//     };

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
//       Driver.countDocuments(approvedDriverFilter),
//       Customer.countDocuments(),
//       Delivery.countDocuments({ createdAt: { $gte: today, $lte: todayEnd } }),
//       Driver.countDocuments({ isAvailable: true }),
//       Driver.countDocuments({ ...approvedDriverFilter, isAvailable: true }),
//       Vehicle.countDocuments({ status: "available" }),
//       Order.find()
//         .populate('customerId', 'name companyName phone')
//         .sort({ createdAt: -1 })
//         .limit(10),
//       Order.aggregate([
//         { $match: { createdAt: { $gte: last7DaysStart, $lte: today } } },
//         {
//           $group: {
//             _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
//             orders: { $sum: 1 },
//             deliveries: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } }
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
//       googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',  // ← Added
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
//       googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
//       stats: { totalOrders: 0, totalDeliveries: 0, totalDrivers: 0, totalCustomers: 0, todayDeliveries: 0, availableDrivers: 0, availableVehicles: 0 },
//       recentOrders: [],
//       chartData: [],
//       error: 'Failed to load dashboard data.'
//     });
//   }
// };

// // ==================== GET ALL DRIVER LOCATIONS ====================
// // Route: GET /admin/api/drivers/locations  (dashboard + live-tracking page)
// // Route: GET /admin/tracking/api/drivers/locations (tracking routes se)
// exports.getAllDriverLocations = async (req, res) => {
//   try {
//     const drivers = await Driver.find({
//       profileStatus: 'approved',
//       isActive: true,
//       'blockStatus.isBlocked': { $ne: true }
//     })
//       .select('name phone vehicleNumber currentLocation isAvailable currentJourney lastLocationUpdate')
//       .populate({
//         path: 'currentJourney',
//         select: 'status deliveryId startTime',
//         strictPopulate: false
//       })
//       .lean();

//     return res.json({
//       success: true,
//       count: drivers.length,
//       data: drivers,
//       timestamp: new Date().toISOString()
//     });

//   } catch (error) {
//     console.error('Get Driver Locations Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch driver locations',
//       error: error.message
//     });
//   }
// };

// // ==================== GET SINGLE DRIVER LOCATION ====================
// exports.getDriverLocation = async (req, res) => {
//   try {
//     const { driverId } = req.params;

//     const driver = await Driver.findById(driverId)
//       .select('name phone vehicleNumber currentLocation isAvailable currentJourney lastLocationUpdate')
//       .populate('currentJourney', 'status deliveryId startTime')
//       .lean();

//     if (!driver) {
//       return res.status(404).json({ success: false, message: 'Driver not found' });
//     }

//     if (!driver.currentLocation?.latitude || !driver.currentLocation?.longitude) {
//       return res.status(404).json({ success: false, message: 'Location not available' });
//     }

//     return res.json({ success: true, data: driver, timestamp: new Date().toISOString() });

//   } catch (error) {
//     return res.status(500).json({ success: false, message: 'Failed to fetch driver location', error: error.message });
//   }
// };

// // ==================== RENDER LIVE TRACKING ====================
// exports.renderLiveTracking = async (req, res) => {
//   try {
//     const activeDeliveries = await Delivery.find({
//       status: { $in: ['assigned', 'In_transit', 'in_transit', 'picked_up', 'out_for_delivery'] }
//     })
//       .populate('driverId')
//       .sort({ updatedAt: -1 });

//     res.render('admin/tracking/live', {
//       title: 'Live Tracking',
//       user: req.admin,
//       activeDeliveries,
//       googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''  // ← Yeh ZAROORI hai
//     });
//   } catch (error) {
//     console.error('Live tracking error:', error);
//     res.status(500).render('admin/tracking/live', {
//       title: 'Live Tracking',
//       user: req.admin,
//       activeDeliveries: [],
//       googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
//       error: 'Failed to load tracking data'
//     });
//   }
// };

// // ==================== RENDER ORDERS LIST ====================
// exports.renderOrdersList = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = 20;
//     const skip = (page - 1) * limit;

//     const filter = {};
//     if (req.query.search) filter.$or = [{ orderNumber: { $regex: req.query.search, $options: 'i' } }];
//     if (req.query.status) filter.status = req.query.status;
//     if (req.query.priority) filter.priority = req.query.priority;

//     const [orders, totalOrders] = await Promise.all([
//       Order.find(filter).populate('customerId').sort({ createdAt: -1 }).skip(skip).limit(limit),
//       Order.countDocuments(filter)
//     ]);

//     res.render('admin/orders/list', {
//       title: 'Orders',
//       user: req.admin,
//       orders,
//       currentPage: page,
//       totalPages: Math.ceil(totalOrders / limit),
//       filters: req.query
//     });
//   } catch (error) {
//     console.error('Orders list error:', error);
//     res.status(500).render('admin/orders/list', {
//       title: 'Orders', user: req.admin, orders: [], currentPage: 1, totalPages: 1, filters: {}, error: 'Failed to load orders'
//     });
//   }
// };

// exports.renderOrderDetails = async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.id).populate('customerId').populate('deliveryId');
//     if (!order) return res.redirect('/admin/orders?error=Order not found');
//     res.render('admin/orders/details', { title: `Order ${order.orderNumber}`, user: req.admin, order });
//   } catch (error) {
//     res.redirect('/admin/orders?error=Failed to load order');
//   }
// };

// exports.renderCreateOrder = async (req, res) => {
//   try {
//     const customers = await Customer.find({ status: 'active' }).sort({ name: 1 });
//     res.render('admin/orders/create', { title: 'Create Order', user: req.admin, customers });
//   } catch (error) {
//     res.redirect('/admin/orders?error=Failed to load form');
//   }
// };

// exports.renderDeliveriesList = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = 20;
//     const skip = (page - 1) * limit;

//     const filter = {};
//     if (req.query.search) filter.trackingNumber = { $regex: req.query.search, $options: 'i' };
//     if (req.query.status) filter.status = req.query.status;
//     if (req.query.driver) filter.driverId = req.query.driver;
//     if (req.query.startDate) filter.scheduledDate = { $gte: new Date(req.query.startDate) };

//     const [deliveries, totalDeliveries, drivers] = await Promise.all([
//       Delivery.find(filter)
//         .populate('driverId orderId')
//         .populate({ path: 'orderId', populate: { path: 'customerId' } })
//         .sort({ createdAt: -1 }).skip(skip).limit(limit),
//       Delivery.countDocuments(filter),
//       Driver.find({ status: 'active' }).sort({ name: 1 })
//     ]);

//     const stats = {
//       pending: await Delivery.countDocuments({ status: 'pending' }),
//       inTransit: await Delivery.countDocuments({ status: { $in: ['in_transit', 'In_transit'] } }),
//       delivered: await Delivery.countDocuments({ status: 'delivered', updatedAt: { $gte: new Date().setHours(0, 0, 0, 0) } })
//     };

//     res.render('admin/deliveries/list', {
//       title: 'Deliveries', user: req.admin, deliveries, drivers, stats,
//       currentPage: page, totalPages: Math.ceil(totalDeliveries / limit), filters: req.query
//     });
//   } catch (error) {
//     res.status(500).render('admin/deliveries/list', {
//       title: 'Deliveries', user: req.admin, deliveries: [], drivers: [], stats: {},
//       currentPage: 1, totalPages: 1, filters: {}, error: 'Failed to load deliveries'
//     });
//   }
// };

// exports.renderDeliveryDetails = async (req, res) => {
//   try {
//     const delivery = await Delivery.findById(req.params.id)
//       .populate('driverId orderId')
//       .populate({ path: 'orderId', populate: { path: 'customerId' } });
//     if (!delivery) return res.redirect('/admin/deliveries?error=Delivery not found');
//     res.render('admin/deliveries/details', { title: `Delivery ${delivery.trackingNumber}`, user: req.admin, delivery });
//   } catch (error) {
//     res.redirect('/admin/deliveries?error=Failed to load delivery');
//   }
// };

// exports.renderDriversList = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = 20;
//     const skip = (page - 1) * limit;

//     const query = {};
//     if (req.query.search) {
//       query.$or = [
//         { name: { $regex: req.query.search, $options: 'i' } },
//         { email: { $regex: req.query.search, $options: 'i' } },
//         { phone: { $regex: req.query.search, $options: 'i' } },
//         { licenseNumber: { $regex: req.query.search, $options: 'i' } },
//         { vehicleNumber: { $regex: req.query.search, $options: 'i' } }
//       ];
//     }
//     if (req.query.status === 'active') query.isActive = true;
//     if (req.query.status === 'inactive') query.isActive = false;
//     if (req.query.isBlocked === 'true') query['blockStatus.isBlocked'] = true;
//     if (req.query.isBlocked === 'false') query['blockStatus.isBlocked'] = false;

//     const [drivers, total] = await Promise.all([
//       Driver.find(query).select('-password -pin -resetPinToken -resetPinExpires').sort({ createdAt: -1 }).skip(skip).limit(limit),
//       Driver.countDocuments(query)
//     ]);

//     res.render('list', {
//       title: 'Drivers Management', user: req.admin, drivers, messages: req.flash(),
//       pagination: { currentPage: page, totalPages: Math.ceil(total / limit), total },
//       filters: req.query, url: req.originalUrl
//     });
//   } catch (error) {
//     res.status(500).render('list', {
//       title: 'Drivers Management', user: req.admin, drivers: [],
//       pagination: { currentPage: 1, totalPages: 1, total: 0 },
//       filters: {}, url: req.originalUrl, error: 'Failed to load drivers list'
//     });
//   }
// };

// exports.renderDriverDetails = async (req, res) => {
//   try {
//     const driverId = req.params.driverId || req.params.id;
//     if (!mongoose.Types.ObjectId.isValid(driverId)) return res.redirect('/admin/drivers?error=Invalid driver ID');

//     const driver = await Driver.findById(driverId).select('-password -pin -resetPinToken -resetPinExpires').lean();
//     if (!driver) return res.redirect('/admin/drivers?error=Driver not found');

//     const baseUrl = process.env.IMAGE_URL || 'http://localhost:5001/uploads/documents';

//     if (driver.documents && Array.isArray(driver.documents)) {
//       const docs = driver.documents;
//       const getUrl = (type) => {
//         const doc = docs.find(d => d.documentType === type);
//         return doc?.fileUrl ? `${baseUrl}/${doc.fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}` : null;
//       };
//       driver.licenseFront = getUrl('license_front');
//       driver.licenseBack = getUrl('license_back');
//       driver.rcFront = getUrl('vehicle_Mulkia_front');
//       driver.rcBack = getUrl('vehicle_Mulkia_back');
//     }

//     const [assignedVehicle, recentDeliveries, totalDeliveries, completed, active] = await Promise.all([
//       Vehicle.findOne({ assignedDriver: driverId }).select('vehicleNumber vehicleType currentMeterReading status').lean(),
//       Delivery.find({ driverId: driver._id }).populate('orderId').sort({ createdAt: -1 }).limit(10).lean(),
//       Delivery.countDocuments({ driverId }),
//       Delivery.countDocuments({ driverId, status: 'delivered' }),
//       Delivery.countDocuments({ driverId, status: { $in: ['in_transit', 'out_for_delivery', 'assigned'] } })
//     ]);

//     res.render('details', {
//       title: `Driver - ${driver.name || 'Details'}`, user: req.admin, driver,
//       assignedVehicle: assignedVehicle || null, recentDeliveries,
//       stats: { totalDeliveries, completed, active }, url: req.originalUrl
//     });
//   } catch (error) {
//     console.error('[DETAILS] Error:', error);
//     res.redirect('/admin/drivers?error=Failed to load driver details');
//   }
// };

// exports.toggleDriverProfileStatus = async (req, res) => {
//   let driverId;
//   try {
//     ({ driverId, status } = req.params);
//     if (!mongoose.Types.ObjectId.isValid(driverId)) {
//       req.flash('error', 'Invalid driver ID');
//       return res.redirect('/admin/drivers');
//     }

//     const driver = await Driver.findById(driverId);
//     if (!driver) {
//       req.flash('error', 'Driver not found');
//       return res.redirect('/admin/drivers');
//     }

//     const newStatus = status === '1' ? 'approved' : 'rejected';

//     if (newStatus === 'approved') {
//       const allVerified = driver.documents.every(doc => doc.status === 'verified');
//       if (!allVerified) {
//         req.flash('error', 'Cannot approve: Not all documents are verified yet!');
//         return res.redirect(`/admin/drivers/view/${driverId}`);
//       }
//     }

//     let rejectionReasonText = null;
//     if (newStatus === 'rejected') {
//       rejectionReasonText = req.query.reason?.trim() || 'Documents did not meet requirements';
//       driver.rejectionReason = rejectionReasonText;
//     } else {
//       driver.rejectionReason = null;
//     }

//     driver.profileStatus = newStatus;
//     await driver.save();

//     if (driver.fcmToken) {
//       const isApproved = newStatus === 'approved';
//       try {
//         await sendNotification(driver.fcmToken, {
//           title: isApproved ? "Profile Approved!" : "Profile Rejected",
//           body: isApproved
//             ? `Congratulations ${driver.name || 'Driver'}! Your profile has been approved.`
//             : `Your profile has been rejected. Reason: ${rejectionReasonText || 'Not specified'}.`,
//           type: "profile_status_update",
//           status: newStatus,
//           driverId: driver._id.toString()
//         });
//       } catch (notifErr) {
//         console.error(`Notification failed for ${driver._id}:`, notifErr.message);
//       }
//     }

//     req.flash('success', `Driver profile status updated to ${newStatus.toUpperCase()}`);
//     res.redirect(`/admin/drivers/view/${driverId}`);

//   } catch (error) {
//     console.error('Profile status toggle error:', error);
//     req.flash('error', 'Failed to update profile status');
//     res.redirect(driverId ? `/admin/drivers/view/${driverId}` : '/admin/drivers');
//   }
// };


// FILE: controllers/admin/adminDashboardController.js
// CHANGES:
//   1. getAllDriverLocations - yeh route /admin/api/drivers/locations pe serve hota hai
//   2. renderLiveTracking - googleMapsApiKey pass karna fix kiya

require("dotenv").config();
const mongoose = require("mongoose");
const Order = require('../../models/Order');
const Delivery = require('../../models/Delivery');
const Driver = require('../../models/Driver');
const Customer = require('../../models/Customer');
const Vehicle = require("../../models/Vehicle");
const { sendNotification } = require('../../utils/sendNotification');

// ==================== RENDER DASHBOARD ====================
// exports.renderDashboard = async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const todayEnd = new Date();
//     todayEnd.setHours(23, 59, 59, 999);
//     const last7DaysStart = new Date(today);
//     last7DaysStart.setDate(today.getDate() - 6);

//     const approvedDriverFilter = {
//       profileStatus: 'approved',
//       isActive: true,
//       'blockStatus.isBlocked': { $ne: true }
//     };

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
//       Driver.countDocuments(approvedDriverFilter),
//       Customer.countDocuments(),
//       Delivery.countDocuments({ createdAt: { $gte: today, $lte: todayEnd } }),
//       Driver.countDocuments({ isAvailable: true }),
//       Driver.countDocuments({ ...approvedDriverFilter, isAvailable: true }),
//       Vehicle.countDocuments({ status: "available" }),
//       Order.find()
//         .populate('customerId', 'name companyName phone')
//         .sort({ createdAt: -1 })
//         .limit(10),
//       Order.aggregate([
//         { $match: { createdAt: { $gte: last7DaysStart, $lte: today } } },
//         {
//           $group: {
//             _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
//             orders: { $sum: 1 },
//             deliveries: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } }
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
//       googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',  // ← Added
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
//       googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
//       stats: { totalOrders: 0, totalDeliveries: 0, totalDrivers: 0, totalCustomers: 0, todayDeliveries: 0, availableDrivers: 0, availableVehicles: 0 },
//       recentOrders: [],
//       chartData: [],
//       error: 'Failed to load dashboard data.'
//     });
//   }
// };

exports.renderDashboard = async (req, res) => {
  try {
    const now = new Date();

    // ── Aaj ka range ──
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // ── Last 7 days (aaj included) ──
    const last7DaysStart = new Date(todayStart);
    last7DaysStart.setDate(todayStart.getDate() - 6); // 6 days peeche + aaj = 7 days

    const approvedDriverFilter = {
      profileStatus: 'approved',
      isActive: true,
      'blockStatus.isBlocked': { $ne: true }
    };

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
      Driver.countDocuments(approvedDriverFilter),
      Customer.countDocuments(),

      // ✅ FIX: todayEnd use karo taaki poora din count ho
      Delivery.countDocuments({
        createdAt: { $gte: todayStart, $lte: todayEnd }
      }),

      Driver.countDocuments({ isAvailable: true }),
      Vehicle.countDocuments({ status: 'available' }),

      Order.find()
        .populate('customerId', 'name companyName phone')
        .sort({ createdAt: -1 })
        .limit(10),

      // ✅ FIX: Weekly chart — Orders + Deliveries alag models se
      // Pehle Orders per day
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: last7DaysStart, $lte: todayEnd }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: 'Asia/Kolkata'   // ← apna timezone set karo
              }
            },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // ── Deliveries per day alag fetch karo ──
    const deliveriesPerDay = await Delivery.aggregate([
      {
        $match: {
          createdAt: { $gte: last7DaysStart, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: 'Asia/Kolkata'
            }
          },
          deliveries: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // ── Last 7 days ki saari dates generate karo (gaps fill karne ke liye) ──
    const allDates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(todayStart.getDate() - i);
      // YYYY-MM-DD format
      const key = d.toISOString().slice(0, 10);
      allDates.push(key);
    }

    // ── Orders map banao ──
    const ordersMap = {};
    chartData.forEach(item => { ordersMap[item._id] = item.orders; });

    // ── Deliveries map banao ──
    const deliveriesMap = {};
    deliveriesPerDay.forEach(item => { deliveriesMap[item._id] = item.deliveries; });

    // ── Final chartData — har din ka data, missing days = 0 ──
    const finalChartData = allDates.map(date => {
      // DD/MM format for display
      const [year, month, day] = date.split('-');
      const label = `${day}/${month}`;
      return {
        _id: label,           // frontend pe yahi label show hoga
        date: date,           // raw date for sorting
        orders: ordersMap[date] || 0,
        deliveries: deliveriesMap[date] || 0
      };
    });

    const currentUrl = req.originalUrl || req.url;

    res.render('index', {
      title: 'Dashboard',
      user: req.admin,
      url: currentUrl,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
      stats: {
        totalOrders:      totalOrders      || 0,
        totalDeliveries:  totalDeliveries  || 0,
        totalDrivers:     totalDrivers     || 0,
        totalCustomers:   totalCustomers   || 0,
        todayDeliveries:  todayDeliveries  || 0,
        availableDrivers: availableDrivers || 0,
        availableVehicles: availableVehicles || 0
      },
      recentOrders: recentOrders || [],
      chartData: finalChartData
    });

  } catch (error) {
    console.error('Dashboard render error:', error);
    const currentUrl = req.originalUrl || req.url;
    res.render('index', {
      title: 'Dashboard',
      user: req.admin,
      url: currentUrl,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
      stats: {
        totalOrders: 0, totalDeliveries: 0, totalDrivers: 0,
        totalCustomers: 0, todayDeliveries: 0,
        availableDrivers: 0, availableVehicles: 0
      },
      recentOrders: [],
      chartData: [],
      error: 'Failed to load dashboard data.'
    });
  }
};

// ==================== GET ALL DRIVER LOCATIONS ====================
// Route: GET /admin/api/drivers/locations  (dashboard + live-tracking page)
// Route: GET /admin/tracking/api/drivers/locations (tracking routes se)
exports.getAllDriverLocations = async (req, res) => {
  try {
    const drivers = await Driver.find({
      profileStatus: 'approved',
      isActive: true,
      'blockStatus.isBlocked': { $ne: true }
    })
      .select('name phone vehicleNumber currentLocation isAvailable currentJourney lastLocationUpdate')
      .populate({
        path: 'currentJourney',
        select: 'status deliveryId startTime',
        strictPopulate: false
      })
      .lean();

    return res.json({
      success: true,
      count: drivers.length,
      data: drivers,
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

// ==================== GET SINGLE DRIVER LOCATION ====================
exports.getDriverLocation = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findById(driverId)
      .select('name phone vehicleNumber currentLocation isAvailable currentJourney lastLocationUpdate')
      .populate('currentJourney', 'status deliveryId startTime')
      .lean();

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (!driver.currentLocation?.latitude || !driver.currentLocation?.longitude) {
      return res.status(404).json({ success: false, message: 'Location not available' });
    }

    return res.json({ success: true, data: driver, timestamp: new Date().toISOString() });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch driver location', error: error.message });
  }
};

// ==================== RENDER LIVE TRACKING ====================
exports.renderLiveTracking = async (req, res) => {
  try {
    const activeDeliveries = await Delivery.find({
      status: { $in: ['assigned', 'In_transit', 'in_transit', 'picked_up', 'out_for_delivery'] }
    })
      .populate('driverId')
      .sort({ updatedAt: -1 });

    res.render('admin/tracking/live', {
      title: 'Live Tracking',
      user: req.admin,
      activeDeliveries,
      url: req.originalUrl,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''  // ← Yeh ZAROORI hai
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

// ==================== RENDER ORDERS LIST ====================
exports.renderOrdersList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) filter.$or = [{ orderNumber: { $regex: req.query.search, $options: 'i' } }];
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter).populate('customerId').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter)
    ]);

    res.render('admin/orders/list', {
      title: 'Orders',
      user: req.admin,
      orders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      filters: req.query
    });
  } catch (error) {
    console.error('Orders list error:', error);
    res.status(500).render('admin/orders/list', {
      title: 'Orders', user: req.admin, orders: [], currentPage: 1, totalPages: 1, filters: {}, error: 'Failed to load orders'
    });
  }
};

exports.renderOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('customerId').populate('deliveryId');
    if (!order) return res.redirect('/admin/orders?error=Order not found');
    res.render('admin/orders/details', { title: `Order ${order.orderNumber}`, user: req.admin, order });
  } catch (error) {
    res.redirect('/admin/orders?error=Failed to load order');
  }
};

exports.renderCreateOrder = async (req, res) => {
  try {
    const customers = await Customer.find({ status: 'active' }).sort({ name: 1 });
    res.render('admin/orders/create', { title: 'Create Order', user: req.admin, customers });
  } catch (error) {
    res.redirect('/admin/orders?error=Failed to load form');
  }
};

exports.renderDeliveriesList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) filter.trackingNumber = { $regex: req.query.search, $options: 'i' };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.driver) filter.driverId = req.query.driver;
    if (req.query.startDate) filter.scheduledDate = { $gte: new Date(req.query.startDate) };

    const [deliveries, totalDeliveries, drivers] = await Promise.all([
      Delivery.find(filter)
        .populate('driverId orderId')
        .populate({ path: 'orderId', populate: { path: 'customerId' } })
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Delivery.countDocuments(filter),
      Driver.find({ status: 'active' }).sort({ name: 1 })
    ]);

    const stats = {
      pending: await Delivery.countDocuments({ status: 'pending' }),
      inTransit: await Delivery.countDocuments({ status: { $in: ['in_transit', 'In_transit'] } }),
      delivered: await Delivery.countDocuments({ status: 'delivered', updatedAt: { $gte: new Date().setHours(0, 0, 0, 0) } })
    };

    res.render('admin/deliveries/list', {
      title: 'Deliveries', user: req.admin, deliveries, drivers, stats,
      currentPage: page, totalPages: Math.ceil(totalDeliveries / limit), filters: req.query
    });
  } catch (error) {
    res.status(500).render('admin/deliveries/list', {
      title: 'Deliveries', user: req.admin, deliveries: [], drivers: [], stats: {},
      currentPage: 1, totalPages: 1, filters: {}, error: 'Failed to load deliveries'
    });
  }
};

exports.renderDeliveryDetails = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('driverId orderId')
      .populate({ path: 'orderId', populate: { path: 'customerId' } });
    if (!delivery) return res.redirect('/admin/deliveries?error=Delivery not found');
    res.render('admin/deliveries/details', { title: `Delivery ${delivery.trackingNumber}`, user: req.admin, delivery });
  } catch (error) {
    res.redirect('/admin/deliveries?error=Failed to load delivery');
  }
};

exports.renderDriversList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

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
      Driver.find(query).select('-password -pin -resetPinToken -resetPinExpires').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Driver.countDocuments(query)
    ]);

    res.render('list', {
      title: 'Drivers Management', user: req.admin, drivers, messages: req.flash(),
      pagination: { currentPage: page, totalPages: Math.ceil(total / limit), total },
      filters: req.query, url: req.originalUrl
    });
  } catch (error) {
    res.status(500).render('list', {
      title: 'Drivers Management', user: req.admin, drivers: [],
      pagination: { currentPage: 1, totalPages: 1, total: 0 },
      filters: {}, url: req.originalUrl, error: 'Failed to load drivers list'
    });
  }
};

exports.renderDriverDetails = async (req, res) => {
  try {
    const driverId = req.params.driverId || req.params.id;
    if (!mongoose.Types.ObjectId.isValid(driverId)) return res.redirect('/admin/drivers?error=Invalid driver ID');

    const driver = await Driver.findById(driverId).select('-password -pin -resetPinToken -resetPinExpires').lean();
    if (!driver) return res.redirect('/admin/drivers?error=Driver not found');

    const baseUrl = process.env.IMAGE_URL || 'http://localhost:5001/uploads/documents';

    if (driver.documents && Array.isArray(driver.documents)) {
      const docs = driver.documents;
      const getUrl = (type) => {
        const doc = docs.find(d => d.documentType === type);
        return doc?.fileUrl ? `${baseUrl}/${doc.fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}` : null;
      };
      driver.licenseFront = getUrl('license_front');
      driver.licenseBack = getUrl('license_back');
      driver.rcFront = getUrl('vehicle_Mulkia_front');
      driver.rcBack = getUrl('vehicle_Mulkia_back');
    }

    const [assignedVehicle, recentDeliveries, totalDeliveries, completed, active] = await Promise.all([
      Vehicle.findOne({ assignedDriver: driverId }).select('vehicleNumber vehicleType currentMeterReading status').lean(),
      Delivery.find({ driverId: driver._id }).populate('orderId').sort({ createdAt: -1 }).limit(10).lean(),
      Delivery.countDocuments({ driverId }),
      Delivery.countDocuments({ driverId, status: 'delivered' }),
      Delivery.countDocuments({ driverId, status: { $in: ['in_transit', 'out_for_delivery', 'assigned'] } })
    ]);

    res.render('details', {
      title: `Driver - ${driver.name || 'Details'}`, user: req.admin, driver,
      assignedVehicle: assignedVehicle || null, recentDeliveries,
      stats: { totalDeliveries, completed, active }, url: req.originalUrl
    });
  } catch (error) {
    console.error('[DETAILS] Error:', error);
    res.redirect('/admin/drivers?error=Failed to load driver details');
  }
};

exports.toggleDriverProfileStatus = async (req, res) => {
  let driverId;
  try {
    ({ driverId, status } = req.params);
    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      req.flash('error', 'Invalid driver ID');
      return res.redirect('/admin/drivers');
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      req.flash('error', 'Driver not found');
      return res.redirect('/admin/drivers');
    }

    const newStatus = status === '1' ? 'approved' : 'rejected';

    if (newStatus === 'approved') {
      const allVerified = driver.documents.every(doc => doc.status === 'verified');
      if (!allVerified) {
        req.flash('error', 'Cannot approve: Not all documents are verified yet!');
        return res.redirect(`/admin/drivers/view/${driverId}`);
      }
    }

    let rejectionReasonText = null;
    if (newStatus === 'rejected') {
      rejectionReasonText = req.query.reason?.trim() || 'Documents did not meet requirements';
      driver.rejectionReason = rejectionReasonText;
    } else {
      driver.rejectionReason = null;
    }

    driver.profileStatus = newStatus;
    await driver.save();

    if (driver.fcmToken) {
      const isApproved = newStatus === 'approved';
      try {
        await sendNotification(driver.fcmToken, {
          title: isApproved ? "Profile Approved!" : "Profile Rejected",
          body: isApproved
            ? `Congratulations ${driver.name || 'Driver'}! Your profile has been approved.`
            : `Your profile has been rejected. Reason: ${rejectionReasonText || 'Not specified'}.`,
          type: "profile_status_update",
          status: newStatus,
          driverId: driver._id.toString()
        });
      } catch (notifErr) {
        console.error(`Notification failed for ${driver._id}:`, notifErr.message);
      }
    }

    req.flash('success', `Driver profile status updated to ${newStatus.toUpperCase()}`);
    res.redirect(`/admin/drivers/view/${driverId}`);

  } catch (error) {
    console.error('Profile status toggle error:', error);
    req.flash('error', 'Failed to update profile status');
    res.redirect(driverId ? `/admin/drivers/view/${driverId}` : '/admin/drivers');
  }
};