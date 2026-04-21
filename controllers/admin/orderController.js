// const Order = require('../../models/Order');
// const OrderStatusHistory = require('../../models/OrderStatusHistory');
// const Delivery = require('../../models/Delivery');
// const User = require('../../models/User');
// const { successResponse, errorResponse } = require('../../utils/responseHelper');


// // Admin creates order

// exports.createOrderByAdmin = async (req, res) => {
//   try {
//     const {
//       customerId,
//       items,
//       deliveryLocation,
//       pickupLocation,
//       scheduledPickupDate,
//       scheduledDeliveryDate,
//       specialInstructions,
//       packagingInstructions = '', 
//       priority = 'medium',
//       status = 'pending'
//     } = req.body;

//     // 1. Customer check
//     if (!customerId) return errorResponse(res, 'customerId is required', 400);

//     const customer = await User.findById(customerId);
//     if (!customer) return errorResponse(res, 'Customer not found', 404);

//     // 2. Items validation 
//     if (!items || !Array.isArray(items) || items.length === 0) {
//       return errorResponse(res, 'At least one item is required', 400);
//     }

//     // 3. Process items — 
//     const processedItems = items.map(item => ({
//       productName: item.productName?.trim(),
//       productCode: item.productCode || null,
//       category: item.category || 'other',
//       quantity: Number(item.quantity) || 1,
//       description: item.description || '',
//       specifications: item.specifications || {}
//     }));

//     // 4. Generate order number
//     const orderNumber = await Order.generateOrderNumber();

//     // 5. Pickup location
//     const finalPickupLocation = pickupLocation && pickupLocation.address
//       ? pickupLocation
//       : {
//         address: 'Orion Plastic Factory, Plot 45, GIDC Vatva, Ahmedabad',
//         coordinates: { latitude: 22.9871, longitude: 72.6369 },
//         contactPerson: 'Factory Manager',
//         contactPhone: '9876543200'
//       };

//     // 6. Admin info (SAFE)
//     const adminId = req.user?._id || null;
//     const adminName = req.user?.name || 'System Admin';

//     const order = await Order.create({
//       orderNumber,
//       customerId,
//       orderType: 'retail',
//       items: processedItems,
//       pickupLocation: finalPickupLocation,
//       deliveryLocation,
//       scheduledPickupDate: scheduledPickupDate ? new Date(scheduledPickupDate) : null,
//       scheduledDeliveryDate: scheduledDeliveryDate ? new Date(scheduledDeliveryDate) : null,
//       specialInstructions: specialInstructions || '',
//       packagingInstructions,
//       priority,
//       status,
//       createdBy: adminId,
//       confirmedBy: status === 'confirmed' ? adminId : null,
//       confirmedAt: status === 'confirmed' ? new Date() : null
//     });

//     // 8. Status History
//     await OrderStatusHistory.create({
//       orderId: order._id,
//       status: order.status,
//       remarks: `Order created by ${adminName}`,
//       updatedBy: {
//         userId: adminId,
//         userRole: 'admin',
//         userName: adminName
//       }
//     });

//     // 9. Populate customer
//     await order.populate('customerId', 'name email phone companyName');

//     return successResponse(res, 'Order created successfully!', { order }, 201);
//     // res.redirect(`/admin/orders/${order._id}?success=Order created successfully`)

//   } catch (error) {
//     console.error('Create Order Error:', error.message);
//     return errorResponse(res, error.message || 'Failed to create order', 500);
//     // res.redirect('/admin/orders/create?error=Failed to create order');
//   }
// };

// // Get all orders (Admin)
// exports.getAllOrders = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       status,
//       customerId,
//       search,
//       orderType,
//       priority,
//       paymentStatus,
//       startDate,
//       endDate,
//       sortBy = 'createdAt',
//       sortOrder = 'desc'
//     } = req.query;

//     const query = {};

//     // Filters
//     if (status) query.status = status;
//     if (customerId) query.customerId = customerId;
//     if (orderType) query.orderType = orderType;
//     if (priority) query.priority = priority;
//     if (paymentStatus) query['paymentDetails.status'] = paymentStatus;

//     // Search by order number or customer name
//     if (search) {
//       query.$or = [
//         { orderNumber: { $regex: search, $options: 'i' } }
//       ];
//     }

//     // Date range filter
//     if (startDate || endDate) {
//       query.createdAt = {};
//       if (startDate) query.createdAt.$gte = new Date(startDate);
//       if (endDate) query.createdAt.$lte = new Date(endDate);
//     }

//     // Pagination
//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

//     const [orders, total] = await Promise.all([
//       Order.find(query)
//         .populate('customerId', 'name email phone')
//         .populate('deliveryId', 'trackingNumber status')
//         .sort(sortOptions)
//         .skip(skip)
//         .limit(parseInt(limit)),
//       Order.countDocuments(query)
//     ]);

//     return successResponse(res, 'Orders retrieved successfully', {
//       orders,
//       pagination: {
//         total,
//         page: parseInt(page),
//         pages: Math.ceil(total / parseInt(limit))
//       }
//     });

//   } catch (error) {
//     console.error('Get All Orders Error:', error);
//     return errorResponse(res, error.message || 'Failed to retrieve orders', 500);
//   }
// };

// // Get single order details
// exports.getOrderDetails = async (req, res) => {
//   try {
//     const { orderId } = req.params;

//     const order = await Order.findById(orderId)
//       .populate('customerId', 'name email phone')
//       .populate('deliveryId')
//       .populate('createdBy', 'name email')
//       .populate('confirmedBy', 'name email');

//     if (!order) {
//       return errorResponse(res, 'Order not found', 404);
//     }

//     // Check authorization (customer can only see their own orders)
//     if (req.user.role === 'customer' && order.customerId._id.toString() !== req.user._id.toString()) {
//       return errorResponse(res, 'Access denied', 403);
//     }

//     // Get status history
//     const statusHistory = await OrderStatusHistory.find({ orderId: order._id })
//       .sort({ timestamp: 1 })
//       .populate('updatedBy.userId', 'name email');

//     return successResponse(res, 'Order details retrieved successfully', {
//       order,
//       statusHistory
//     });

//   } catch (error) {
//     console.error('Get Order Details Error:', error);
//     return errorResponse(res, error.message || 'Failed to retrieve order details', 500);
//   }
// };
// // Render edit order page
// exports.renderEditOrder = async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.id)
//       .populate('customerId', 'name email phone');

//     if (!order) {
//       return res.redirect('/admin/orders?error=Order not found');
//     }

//     const customers = await User.find({ role: 'customer' })
//       .select('name email phone')
//       .sort({ name: 1 });

//     res.render('admin/orders/edit', {
//       title: 'Edit Order',
//       user: req.user,
//       order,
//       customers
//     });
//   } catch (error) {
//     console.error('Render Edit Order Error:', error);
//     res.redirect('/admin/orders?error=Failed to load edit order page');
//   }
// };
// // Update order (Admin or Customer if pending)
// exports.updateOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const updates = req.body;

//     const order = await Order.findById(orderId);
//     if (!order) {
//       return errorResponse(res, 'Order not found', 404);
//     }

//     // Check if order can be modified
//     if (!order.canBeModified()) {
//       return errorResponse(res, 'Order cannot be modified in current status', 400);
//     }

//     // Check authorization
//     if (req.user.role === 'customer' && order.customerId.toString() !== req.user._id.toString()) {
//       return errorResponse(res, 'Access denied', 403);
//     }

//     // Restricted fields for customers
//     if (req.user.role === 'customer') {
//       delete updates.status;
//       delete updates.taxPercentage;
//       delete updates.shippingCharges;
//       delete updates.discount;
//     }

//     // Update order
//     Object.assign(order, updates);
//     await order.save();

//     // return successResponse(res, 'Order updated successfully', { order });
//     res.redirect(`/admin/orders/${order._id}?success=Order updated successfully`);

//   } catch (error) {
//     console.error('Update Order Error:', error);
//     // return errorResponse(res, error.message || 'Failed to update order', 500);
//     res.redirect(`/admin/orders/${req.params.id}/edit?error=Failed to update order`);

//   }
// };

// // Confirm order (Admin)
// exports.confirmOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { remarks, scheduledPickupDate, scheduledDeliveryDate } = req.body;

//     const order = await Order.findById(orderId);
//     if (!order) {
//       return errorResponse(res, 'Order not found', 404);
//     }

//     if (order.status !== 'pending') {
//       return errorResponse(res, 'Only pending orders can be confirmed', 400);
//     }

//     order.status = 'confirmed';
//     order.confirmedBy = req.user._id;
//     order.confirmedAt = new Date();

//     if (scheduledPickupDate) order.scheduledPickupDate = scheduledPickupDate;
//     if (scheduledDeliveryDate) order.scheduledDeliveryDate = scheduledDeliveryDate;

//     await order.save();

//     // Create status history
//     await OrderStatusHistory.create({
//       orderId: order._id,
//       status: 'confirmed',
//       previousStatus: 'pending',
//       remarks: remarks || 'Order confirmed',
//       updatedBy: {
//         userId: req.user._id,
//         userRole: req.user.role,
//         userName: req.user.name
//       }
//     });

//     await order.populate('customerId', 'name email phone');

//     return successResponse(res, 'Order confirmed successfully', { order });

//   } catch (error) {
//     console.error('Confirm Order Error:', error);
//     return errorResponse(res, error.message || 'Failed to confirm order', 500);
//   }
// };

// // Update order status (Admin)
// exports.updateOrderStatus = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { status, remarks } = req.body;

//     const order = await Order.findById(orderId);
//     if (!order) {
//       return errorResponse(res, 'Order not found', 404);
//     }

//     const previousStatus = order.status;
//     order.status = status;  

//     // Update specific fields based on status
//     if (status === 'confirmed' && !order.confirmedBy) {
//       order.confirmedBy = req.user._id;
//       order.confirmedAt = new Date();
//     }

//     await order.save();

//     // Create status history
//     await OrderStatusHistory.create({
//       orderId: order._id,
//       status,
//       previousStatus,
//       remarks,
//       updatedBy: {
//         userId: req.user._id,
//         userRole: req.user.role,
//         userName: req.user.name
//       }
//     });

//     return successResponse(res, 'Order status updated successfully', { order });

//   } catch (error) {
//     console.error('Update Order Status Error:', error);
//     return errorResponse(res, error.message || 'Failed to update order status', 500);
//   }
// };

// // List all orders
// exports.listOrders = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     const query = {};
//     if (req.query.status) query.status = req.query.status;
//     if (req.query.search) {
//       query.$or = [
//         { orderNumber: { $regex: req.query.search, $options: 'i' } }
//       ];
//     }

//     const [orders, total] = await Promise.all([
//       Order.find(query)
//         .populate('customerId', 'name email phone')
//         .populate('deliveryId', 'trackingNumber status')
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit),
//       Order.countDocuments(query)
//     ]);

//     res.render('admin/orders/list', {
//       title: 'Orders',
//       user: req.user,
//       orders,
//       currentPage: page,
//       totalPages: Math.ceil(total / limit),
//       filters: req.query,
//       success: req.query.success,
//       error: req.query.error
//     });
//   } catch (error) {
//     console.error('List Orders Error:', error);
//     res.redirect('/admin/dashboard?error=Failed to load orders');
//   }
// };

// // Render create order page
// exports.renderCreateOrder = async (req, res) => {
//   try {
//     const customers = await User.find({ role: 'customer' })
//       .select('name email phone')
//       .sort({ name: 1 });

//     res.render('admin/orders/create', {
//       title: 'Create Order',
//       user: req.user,
//       customers
//     });
//   } catch (error) {
//     console.error('Render Create Order Error:', error);
//     res.redirect('/admin/orders?error=Failed to load create order page');
//   }
// };

// // View order details
// exports.viewOrder = async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.id)
//       .populate('customerId', 'name email phone')
//       .populate('deliveryId')
//       .populate('createdBy', 'name email')
//       .populate('confirmedBy', 'name email');

//     if (!order) {
//       return res.redirect('/admin/orders?error=Order not found');
//     }

//     const statusHistory = await OrderStatusHistory.find({ orderId: order._id })
//       .sort({ timestamp: 1 })
//       .populate('updatedBy.userId', 'name email');

//     res.render('admin/orders/details', {
//       title: `Order ${order.orderNumber}`,
//       user: req.user,
//       order,
//       statusHistory,
//       success: req.query.success,
//       error: req.query.error
//     });
//   } catch (error) {
//     console.error('View Order Error:', error);
//     res.redirect('/admin/orders?error=Failed to load order details');
//   }
// };
// module.exports = exports;

const Order = require('../../models/Order');
const { PickupLocation } = require('../../models/Order');
const OrderStatusHistory = require('../../models/OrderStatusHistory');
const Delivery = require('../../models/Delivery');
const mongoose = require('mongoose');
const Customer = require("../../models/Customer")
const { successResponse, errorResponse } = require("../../utils/responseHelper")
const Category = require("../../models/Category")

// ============= RENDER ORDERS LIST PAGE =============
exports.renderOrdersList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      search,
      startDate,
      endDate
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) query.orderNumber = { $regex: search, $options: 'i' };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch orders with full population (customerId must be ObjectId reference)
    const orders = await Order.find(query)
      .populate('customerId', 'name email phone companyName')  // Now works correctly
      .populate({
        path: 'deliveryId',
        populate: { path: 'driverId', select: 'name phone' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    // Statistics calculation
    const stats = await Order.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          delivered: [{ $match: { status: 'delivered' } }, { $count: 'count' }],
          inTransit: [
            { $match: { status: { $in: ['in_transit', 'assigned', 'ready_for_pickup'] } } },
            { $count: 'count' }
          ],
          pending: [
            { $match: { status: { $in: ['pending', 'confirmed', 'processing'] } } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const statistics = {
      total: stats[0].total[0]?.count || 0,
      delivered: stats[0].delivered[0]?.count || 0,
      inTransit: stats[0].inTransit[0]?.count || 0,
      pending: stats[0].pending[0]?.count || 0
    };

    res.render('order_list', {
      title: 'Orders Management',
      user: req.user,
      orders,                    // customerId is now populated object
      stats: statistics,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      },
      filters: { status, priority, search, startDate, endDate },
      url: req.originalUrl,
      messages: req.flash()
    });

  } catch (error) {
    console.error('[ORDERS-LIST] Error:', error);
    req.flash('error', 'Failed to load orders');
    res.redirect('/admin/dashboard');
  }
};

// Get all orders (Admin)
exports.getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      customerId,
      search,
      orderType,
      priority,
      paymentStatus,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filters
    if (status) query.status = status;
    if (customerId) query.customerId = customerId;
    if (orderType) query.orderType = orderType;
    if (priority) query.priority = priority;
    if (paymentStatus) query['paymentDetails.status'] = paymentStatus;

    // Search by order number or customer name
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customerId', 'name email phone')
        .populate('deliveryId', 'trackingNumber status')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);

    return successResponse(res, 'Orders retrieved successfully', {
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get All Orders Error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve orders', 500);
  }
};

// Get single order details
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('customerId', 'name email phone')
      .populate('deliveryId')
      .populate('createdBy', 'name email')
      .populate('confirmedBy', 'name email');

    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    // Check authorization (customer can only see their own orders)
    if (req.user.role === 'customer' && order.customerId._id.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Get status history
    const statusHistory = await OrderStatusHistory.find({ orderId: order._id })
      .sort({ timestamp: 1 })
      .populate('updatedBy.userId', 'name email');

    return successResponse(res, 'Order details retrieved successfully', {
      order,
      statusHistory
    });

  } catch (error) {
    console.error('Get Order Details Error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve order details', 500);
  }
};

// ============= RENDER CREATE ORDER PAGE =============
// exports.renderCreateOrder = async (req, res) => {
//   try {
//     const customers = await Customer.find()
//       .select('name companyName phone email')    
//       .sort({ name: 1 })                          
//       .lean();                                    

//     console.log(`Found ${customers.length} customers for dropdown`);

//     res.render('order_create', {
//       title: 'Create New Order',
//       user: req.user,
//       customers,            
//       url: req.originalUrl,
//       messages: req.flash()
//     });

//   } catch (error) {
//     console.error('[CREATE-ORDER-PAGE] Error:', error);
//     req.flash('error', 'Failed to load create order page');
//     res.redirect('/admin/orders');
//   }
// };

// exports.renderCreateOrder = async (req, res) => {
//   try {
//     const customers = await Customer.find({}).select('name companyName phone').lean();
//     const categories = await Category.find({ isActive: true })
//       .sort({ displayOrder: 1, name: 1 })
//       .lean();

//     res.render('order_create', {
//       title: 'Create New Order',
//       customers,
//       categories,
//       messages: req.flash(),
//       admin: req.user,
//       url: req.originalUrl,
//     });
//   } catch (err) {
//     console.error(err);
//     req.flash('error', 'Failed to load create order page');
//     res.redirect('/admin/orders');
//   }
// };

exports.renderCreateOrder = async (req, res) => {
  try {
    const customers = await Customer.find({}).select('name companyName phone').lean();
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }).lean();

    // DB se active pickup locations fetch karo
    const pickupLocations = await PickupLocation.find({ isActive: true })
      .sort({ isDefault: -1, name: 1 })
      .lean();

    res.render('order_create', {
      title: 'Create New Order',
      customers,
      categories,
      pickupLocations,
      messages: req.flash(),
      admin: req.user,
      url: req.originalUrl,
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load create order page');
    res.redirect('/admin/orders');
  }
};

// exports.createOrder = async (req, res) => {
//   try {
//     const {
//       customerId,
//       items,
//       deliveryLocation,
//       pickupLocation,
//       scheduledPickupDate,
//       scheduledDeliveryDate,
//       specialInstructions,
//       packagingInstructions = '',
//       priority = 'medium',
//       status = 'pending'
//     } = req.body;

//     // 1. Customer check
//     if (!customerId) return errorResponse(res, 'customerId is required', 400);

//     const customer = await Customer.findById(customerId);
//     if (!customer) return errorResponse(res, 'Customer not found', 404);

//     // 2. Parse items (string → array)
//     let parsedItems = items;

//     if (typeof items === 'string') {
//       try {
//         parsedItems = JSON.parse(items);
//       } catch (parseError) {
//         console.error('Items JSON parse error:', parseError);
//         return errorResponse(res, 'Invalid items data format', 400);
//       }
//     }

//     if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
//       return errorResponse(res, 'At least one valid item is required', 400);
//     }

//     // 3. Process valid items
//     const processedItems = parsedItems.map(item => ({
//       productName: item.productName?.trim() || '',
//       productCode: item.productCode || null,
//       category: item.category || 'other',
//       quantity: Number(item.quantity) || 1,
//       description: item.description || '',
//       specifications: item.specifications || {}
//     }));

//     // 4. Generate order number
//     const orderNumber = await Order.generateOrderNumber();

//     // 5. Default pickup location
//     let finalPickupLocation;

//     if (pickupLocation) {
//       const pickup = await pickupLocation.findById(pickupLocation);
//       if (!pickup) {
//         return errorResponse(res, 'Selected pickup location not found', 400);
//       }

//       finalPickupLocation = {
//         address: pickup.address,
//         coordinates: {
//           latitude: pickup.coordinates.latitude,
//           longitude: pickup.coordinates.longitude
//         },
//         contactPerson: pickup.contactPerson,
//         contactPhone: pickup.contactPhone
//       };
//     } else {
//       return errorResponse(res, 'Pickup location is required', 400);
//     }

//     // 6. Admin info
//     const adminId = req.user?._id || null;
//     const adminName = req.user?.name || 'System Admin';

//     // 7. Create order
//     const order = await Order.create({
//       orderNumber,
//       customerId,
//       orderType: 'retail',
//       items: processedItems,
//       pickupLocation: finalPickupLocation,
//       deliveryLocation,
//       scheduledPickupDate: scheduledPickupDate ? new Date(scheduledPickupDate) : null,
//       scheduledDeliveryDate: scheduledDeliveryDate ? new Date(scheduledDeliveryDate) : null,
//       specialInstructions: specialInstructions || '',
//       packagingInstructions,
//       priority,
//       status,
//       createdBy: adminId,
//       confirmedBy: status === 'confirmed' ? adminId : null,
//       confirmedAt: status === 'confirmed' ? new Date() : null
//     });

//     // 8. Status History
//     await OrderStatusHistory.create({
//       orderId: order._id,
//       status: order.status,
//       remarks: `Order created by ${adminName}`,
//       updatedBy: {
//         userId: adminId,
//         userRole: 'admin',
//         userName: adminName
//       }
//     });

//     // 9. Populate customer
//     const populatedOrder = await Order.findById(order._id)
//       .populate('customerId', 'name companyName phone email customerId status');

//     // return successResponse(res, 'Order created successfully!', { order: populatedOrder }, 201);

//     res.redirect("/admin/orders")

//   } catch (error) {
//     console.error('Create Order Error:', error);
//     return errorResponse(res, error.message || 'Failed to create order', 500);
//   }
// };



// ============= RENDER ORDER DETAILS PAGE =============

exports.createOrder = async (req, res) => {
  try {
    const {
      customerId,
      pickupLocationId,
      items,
      deliveryLocation,
      scheduledPickupDate,
      scheduledDeliveryDate,
      specialInstructions,
      packagingInstructions = '',
      priority = 'medium',
      status = 'pending'
    } = req.body;

    if (!customerId) return errorResponse(res, 'customerId is required', 400);
    const customer = await Customer.findById(customerId);
    if (!customer) return errorResponse(res, 'Customer not found', 404);

    // Pickup location — DB se fetch
    if (!pickupLocationId) return errorResponse(res, 'Pickup location is required', 400);
    const pickupDoc = await PickupLocation.findById(pickupLocationId);
    if (!pickupDoc) return errorResponse(res, 'Selected pickup location not found', 404);

    const finalPickupLocation = {
      name: pickupDoc.name,
      address: pickupDoc.address,
      coordinates: {
        latitude: pickupDoc.coordinates.latitude,
        longitude: pickupDoc.coordinates.longitude
      },
      contactPerson: pickupDoc.contactPerson || '',
      contactPhone: pickupDoc.contactPhone || ''
    };

    // Parse items
    let parsedItems = items;
    if (typeof items === 'string') {
      try { parsedItems = JSON.parse(items); }
      catch (e) { return errorResponse(res, 'Invalid items data format', 400); }
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return errorResponse(res, 'At least one valid item is required', 400);
    }

    const processedItems = parsedItems.map(item => ({
      productName: item.productName?.trim() || '',
      productCode: item.productCode || null,
      category: item.category || 'other',
      quantity: Number(item.quantity) || 1,
      description: item.description || '',
      specifications: item.specifications || {}
    }));

    const orderNumber = await Order.generateOrderNumber();
    const adminId = req.user?._id || null;
    const adminName = req.user?.name || 'System Admin';

    const order = await Order.create({
      orderNumber,
      customerId,
      orderType: req.body.orderType || 'retail',
      items: processedItems,
      pickupLocation: finalPickupLocation,
      deliveryLocation,
      scheduledPickupDate: scheduledPickupDate ? new Date(scheduledPickupDate) : null,
      scheduledDeliveryDate: scheduledDeliveryDate ? new Date(scheduledDeliveryDate) : null,
      specialInstructions: specialInstructions || '',
      packagingInstructions,
      priority,
      status,
      createdBy: adminId,
      confirmedBy: status === 'confirmed' ? adminId : null,
      confirmedAt: status === 'confirmed' ? new Date() : null
    });

    await OrderStatusHistory.create({
      orderId: order._id,
      status: order.status,
      remarks: `Order created by ${adminName}`,
      updatedBy: { userId: adminId, userRole: 'admin', userName: adminName }
    });

    res.redirect("/admin/orders");

  } catch (error) {
    console.error('Create Order Error:', error);
    return errorResponse(res, error.message || 'Failed to create order', 500);
  }
};

// exports.renderOrderDetails = async (req, res) => {
//   try {
//     const { orderId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(orderId)) {
//       req.flash('error', 'Invalid order ID');
//       return res.redirect('/admin/orders');
//     }

//     const order = await Order.findById(orderId)
//       .populate('customerId', 'name email phone companyName')
//       .populate({
//         path: 'deliveryId',
//         populate: {
//           path: 'driverId',
//           select: 'name phone email'
//         }
//       })
//       .populate('createdBy', 'name email')
//       .populate('confirmedBy', 'name email')
//       .lean();

//     if (!order) {
//       req.flash('error', 'Order not found');
//       return res.redirect('/admin/orders');
//     }

//     // Get status history
//     const statusHistory = await OrderStatusHistory.find({ orderId: order._id })
//       .sort({ timestamp: -1 })
//       .populate('updatedBy.userId', 'name email')
//       .lean();

//     res.render('order_details', {
//       title: `Order ${order.orderNumber}`,
//       user: req.user,
//       order,
//       statusHistory,
//       url: req.originalUrl,
//       messages: req.flash()
//     });

//   } catch (error) {
//     console.error('[ORDER-DETAILS] Error:', error);
//     req.flash('error', 'Failed to load order details');
//     res.redirect('/admin/orders');
//   }
// };

// ============= RENDER EDIT ORDER PAGE =============

exports.renderOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      req.flash('error', 'Invalid order ID');
      return res.redirect('/admin/orders');
    }

    const order = await Order.findById(orderId)
      .populate('customerId', 'name email phone companyName')
      .populate({ path: 'deliveryId', populate: { path: 'driverId', select: 'name phone email' } })
      .populate('createdBy', 'name email')
      .populate('confirmedBy', 'name email')
      .lean();

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/orders');
    }

    const statusHistory = await OrderStatusHistory.find({ orderId: order._id })
      .sort({ timestamp: -1 })
      .populate('updatedBy.userId', 'name email')
      .lean();

    res.render('order_details', {
      title: `Order ${order.orderNumber}`,
      user: req.user,
      order,
      statusHistory,
      url: req.originalUrl,
      messages: req.flash()
    });

  } catch (error) {
    console.error('[ORDER-DETAILS] Error:', error);
    req.flash('error', 'Failed to load order details');
    res.redirect('/admin/orders');
  }
};

exports.renderEditOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      req.flash('error', 'Invalid order ID');
      return res.redirect('/admin/orders');
    }

    // Fetch order with populated customer details
    const order = await Order.findById(orderId)
      .populate('customerId', 'name email phone companyName')
      .lean();

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/orders');
    }

    const customers = await Customer.find()
      .select('name email phone companyName')
      .sort({ name: 1 })
      .lean();

    console.log(`Found ${customers.length} customers for edit dropdown`);

    res.render('order_edit', {
      title: `Edit Order - ${order.orderNumber}`,
      user: req.user,
      order,
      customers,
      url: req.originalUrl,
      messages: req.flash()
    });

  } catch (error) {
    console.error('[EDIT-ORDER-PAGE] Error:', error);
    req.flash('error', 'Failed to load edit order page');
    res.redirect('/admin/orders');
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const updates = req.body;

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if order can be modified (assuming you have this method in model)
    if (!order.canBeModified()) {
      return res.status(400).json({ success: false, message: 'Order cannot be modified in current status' });
    }

    // Check authorization
    if (req.user.role === 'customer' && order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Restricted fields for customers
    if (req.user.role === 'customer') {
      delete updates.status;
      delete updates.taxPercentage;
      delete updates.shippingCharges;
      delete updates.discount;
    }

    // Handle items if updated (parse from JSON string)
    if (updates.items) {
      try {
        updates.items = JSON.parse(updates.items);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid items format' });
      }
    }

    // Update order
    Object.assign(order, updates);
    await order.save();

    // Optional: Re-populate for response
    const updatedOrder = await Order.findById(order._id)
      .populate('customerId', 'name email phone companyName');

    res.redirect(`/admin/orders`);

  } catch (error) {
    console.error('Update Order Error:', error);
    req.flash('error', 'Failed to update order');
    res.redirect(`/admin/orders/${orderId}/edit`);
  }
};

// ============= DELETE ORDER =============

exports.deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1. Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    // 2. Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const nonDeletableStatuses = ['delivered', 'in_transit', 'processing'];
    if (nonDeletableStatuses.includes(order.status)) {
      return res.status(403).json({
        success: false,
        message: `Cannot delete order in status: ${order.status}`
      });
    }

    // 4. Optional: Authorization check (only admin or order creator)
    if (req.user.role !== 'admin' && order.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // 5. Delete related records (cascade delete)
    // Delete all status history entries
    await OrderStatusHistory.deleteMany({ orderId: order._id });

    // Delete related delivery if exists
    if (order.deliveryId) {
      await Delivery.findByIdAndDelete(order.deliveryId);
    }

    // 6. Finally delete the order
    await Order.findByIdAndDelete(order._id);

    return res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
      deletedOrderId: orderId
    });

  } catch (error) {
    console.error('[DELETE-ORDER] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete order',
      error: error.message
    });
  }
};

exports.confirmOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { remarks, scheduledPickupDate, scheduledDeliveryDate } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    if (order.status !== 'pending') {
      return errorResponse(res, 'Only pending orders can be confirmed', 400);
    }

    order.status = 'confirmed';
    order.confirmedBy = req.user._id;
    order.confirmedAt = new Date();

    if (scheduledPickupDate) order.scheduledPickupDate = scheduledPickupDate;
    if (scheduledDeliveryDate) order.scheduledDeliveryDate = scheduledDeliveryDate;

    await order.save();

    // Create status history
    await OrderStatusHistory.create({
      orderId: order._id,
      status: 'confirmed',
      previousStatus: 'pending',
      remarks: remarks || 'Order confirmed',
      updatedBy: {
        userId: req.user._id,
        userRole: req.user.role,
        userName: req.user.name
      }
    });

    await order.populate('customerId', 'name email phone');

    return successResponse(res, 'Order confirmed successfully', { order });

  } catch (error) {
    console.error('Confirm Order Error:', error);
    return errorResponse(res, error.message || 'Failed to confirm order', 500);
  }
};

// ============= RENDER CREATE DELIVERY FROM ORDER =============
exports.renderCreateDeliveryFromOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      req.flash('error', 'Invalid order ID');
      return res.redirect('/admin/orders');
    }

    const order = await Order.findById(orderId)
      .populate('customerId', 'name email phone companyName')
      .lean();

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/orders');
    }

    if (order.deliveryId) {
      req.flash('error', 'Delivery already exists for this order');
      return res.redirect(`/admin/orders/view/${orderId}`);
    }

    // Get available drivers
    const drivers = await User.find({
      role: 'driver',
      isActive: true,
      isAvailable: true
    })
      .select('name phone email')
      .sort({ name: 1 })
      .lean();

    res.render('create-delivery-from-order', {
      title: `Create Delivery - ${order.orderNumber}`,
      user: req.user,
      order,
      drivers,
      url: req.originalUrl,
      messages: req.flash()
    });

  } catch (error) {
    console.error('[CREATE-DELIVERY-PAGE] Error:', error);
    req.flash('error', 'Failed to load create delivery page');
    res.redirect('/admin/orders');
  }
};

exports.createDeliveryFromOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverId, scheduledPickupTime, scheduledDeliveryTime, priority } = req.body;

    const order = await Order.findById(orderId).populate('customerId');
    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    if (order.deliveryId) {
      return errorResponse(res, 'Delivery already created for this order', 400);
    }

    if (order.status !== 'confirmed' && order.status !== 'processing' && order.status !== 'ready_for_pickup') {
      return errorResponse(res, 'Order must be confirmed before creating delivery', 400);
    }

    // Prepare package details from order items
    const packageDescription = order.items.map(item =>
      `${item.productName} (${item.quantity} units)`
    ).join(', ');

    const totalWeight = order.items.reduce((sum, item) =>
      sum + ((item.specifications?.weight || 0) * item.quantity), 0
    );

    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

    // Create delivery
    const delivery = await Delivery.create({
      orderId: order.orderNumber,
      customerId: order.customerId._id,
      driverId: driverId || null,
      pickupLocation: order.pickupLocation,
      deliveryLocation: order.deliveryLocation,
      packageDetails: {
        description: packageDescription,
        weight: totalWeight,
        quantity: totalQuantity,
        value: order.totalAmount,
        fragile: false
      },
      scheduledPickupTime: scheduledPickupTime || order.scheduledPickupDate,
      scheduledDeliveryTime: scheduledDeliveryTime || order.scheduledDeliveryDate,
      priority: priority || order.priority,
      instructions: order.specialInstructions,
      status: driverId ? 'assigned' : 'pending',
      createdBy: req.user._id
    });

    // Link delivery to order
    order.deliveryId = delivery._id;
    order.status = 'assigned';
    await order.save();

    // Create order status history
    await OrderStatusHistory.create({
      orderId: order._id,
      status: 'assigned',
      previousStatus: order.status,
      remarks: `Delivery created: ${delivery.trackingNumber}`,
      updatedBy: {
        userId: req.user._id,
        userRole: req.user.role,
        userName: req.user.name
      }
    });

    await delivery.populate('driverId customerId');

    return successResponse(res, 'Delivery created from order successfully', {
      order,
      delivery,
      trackingUrl: `${process.env.FRONTEND_URL}/track/${delivery.trackingNumber}`
    }, 201);

  } catch (error) {
    console.error('Create Delivery From Order Error:', error);
    return errorResponse(res, error.message || 'Failed to create delivery from order', 500);
  }
};


// ============= GET ORDER STATISTICS (API) =============
exports.getOrderStatistics = async (req, res) => {
  try {
    const { startDate, endDate, customerId } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    if (customerId) {
      dateFilter.customerId = mongoose.Types.ObjectId(customerId);
    }

    const stats = await Order.aggregate([
      { $match: dateFilter },
      {
        $facet: {
          statusCounts: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          priorityCounts: [
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ],
          orderTypeCounts: [
            { $group: { _id: '$orderType', count: { $sum: 1 } } }
          ],
          totalOrders: [
            { $count: 'count' }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        total: stats[0].totalOrders[0]?.count || 0,
        byStatus: stats[0].statusCounts,
        byPriority: stats[0].priorityCounts,
        byType: stats[0].orderTypeCounts
      }
    });

  } catch (error) {
    console.error('[ORDER-STATS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};


// ================================================================
// PICKUP LOCATION CRUD — AJAX (JSON response, no redirect)
// Used directly from order_create.ejs modal
// ================================================================

// POST /admin/pickup-locations/create  → JSON
exports.createPickupLocation = async (req, res) => {
  try {
    const { name, address, city, state, pincode, latitude, longitude, contactPerson, contactPhone, isDefault } = req.body;

    if (!name || !address || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Name, address, latitude & longitude are required' });
    }

    // Agar isDefault true hai to baaki sab false karo
    if (isDefault) await PickupLocation.updateMany({}, { isDefault: false });

    const location = await PickupLocation.create({
      name, address, city, state, pincode,
      coordinates: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      contactPerson, contactPhone, isDefault: !!isDefault
    });

    return res.status(201).json({ success: true, location });
  } catch (error) {
    console.error('[CREATE-PICKUP] Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create pickup location' });
  }
};

// POST /admin/pickup-locations/:locationId/update  → JSON
exports.updatePickupLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    const { name, address, city, state, pincode, latitude, longitude, contactPerson, contactPhone, isDefault, isActive } = req.body;

    if (!name || !address || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Name, address, latitude & longitude are required' });
    }

    const doc = await PickupLocation.findById(locationId);
    if (!doc) return res.status(404).json({ success: false, message: 'Location not found' });

    // Agar isDefault true hai to baaki sab false karo
    if (isDefault) await PickupLocation.updateMany({ _id: { $ne: locationId } }, { isDefault: false });

    doc.name = name;
    doc.address = address;
    doc.city = city;
    doc.state = state;
    doc.pincode = pincode;
    doc.coordinates = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
    doc.contactPerson = contactPerson;
    doc.contactPhone = contactPhone;
    doc.isDefault = !!isDefault;
    doc.isActive = isActive !== false && isActive !== 'false';

    await doc.save();
    return res.json({ success: true, location: doc });
  } catch (error) {
    console.error('[UPDATE-PICKUP] Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update pickup location' });
  }
};

// DELETE /admin/pickup-locations/:locationId/delete  → JSON
exports.deletePickupLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    await PickupLocation.findByIdAndDelete(locationId);
    return res.json({ success: true, message: 'Pickup location deleted' });
  } catch (error) {
    console.error('[DELETE-PICKUP] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete pickup location' });
  }
};

// Update order status (Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, remarks } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    const previousStatus = order.status;
    order.status = status;

    // Update specific fields based on status
    if (status === 'confirmed' && !order.confirmedBy) {
      order.confirmedBy = req.user._id;
      order.confirmedAt = new Date();
    }

    await order.save();

    // Create status history
    await OrderStatusHistory.create({
      orderId: order._id,
      status,
      previousStatus,
      remarks,
      updatedBy: {
        userId: req.user._id,
        userRole: req.user.role,
        userName: req.user.name
      }
    });

    return successResponse(res, 'Order status updated successfully', { order });

  } catch (error) {
    console.error('Update Order Status Error:', error);
    return errorResponse(res, error.message || 'Failed to update order status', 500);
  }
};

exports.updateOrderPriority = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { priority } = req.body;

    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority value' });
    }

    const order = await Order.findById(orderId).populate('customerId', 'name companyName');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const oldPriority = order.priority;
    order.priority = priority;
    await order.save();

    let driverNotified = false;

    // Driver ko Socket + FCM notification bhejo
    try {
      const Delivery = require('../../models/Delivery');   // ← correct relative path
      const Driver   = require('../../models/Driver');     // ← apne actual model name se match karo

      if (order.deliveryId) {
        const delivery = await Delivery.findById(order.deliveryId).select('driverId');

        if (delivery?.driverId) {
          const driver = await Driver.findById(delivery.driverId).select('fcmToken');

          // 1. Socket notification
          const io = req.app.get('io');
          if (io) {
            io.to(`driver_${delivery.driverId}`).emit('order:priority:changed', {
              orderId:     order._id,
              orderNumber: order.orderNumber,
              oldPriority,
              newPriority: priority,
              message:     `Order ${order.orderNumber} priority changed to ${priority.toUpperCase()}`
            });
          }

          // 2. FCM push notification (agar driver ka fcmToken hai)
          if (driver?.fcmToken) {
            // apne sendNotification util ka function use karo
            const { sendRideNotification } = require('../../utils/sendNotification');
            await sendRideNotification(driver.fcmToken, {
              code:        '1',
              title:       `Order Priority: ${priority.toUpperCase()}`,
              body:        `Order #${order.orderNumber} priority changed from ${oldPriority} to ${priority}.`,
              orderId:     order._id.toString(),
              orderNumber: order.orderNumber,
              newPriority: priority,
              oldPriority,
            });
            driverNotified = true;
          }
        }
      }
    } catch (notifyErr) {
      // Notification fail hone se main response affect na ho
      console.warn('[PRIORITY] Notification failed (non-fatal):', notifyErr.message);
    }

    return res.json({
      success:         true,
      message:         `Priority updated to ${priority}`,
      priority,
      orderId,
      driverNotified,  // ← frontend toast mein "Driver notified" dikhega
    });

  } catch (error) {
    console.error('[PRIORITY] Update error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = exports;
