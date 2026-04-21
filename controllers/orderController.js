const Order = require('../models/Order');
const OrderStatusHistory = require('../models/OrderStatusHistory');
const Delivery = require('../models/Delivery');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// ======================== CREATE ORDER ========================

// Customer creates order
exports.createOrder = async (req, res) => {
  try {
    const {
      items,
      deliveryLocation,
      pickupLocation,
      scheduledPickupDate,
      scheduledDeliveryDate,
      specialInstructions,
      packagingInstructions,
      paymentMethod,
      orderType,
      priority
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return errorResponse(res, 'Order must have at least one item', 400);
    }

    // Validate delivery location
    if (!deliveryLocation || !deliveryLocation.address || !deliveryLocation.contactPerson || !deliveryLocation.contactPhone) {
      return errorResponse(res, 'Complete delivery location details required', 400);
    }

    // Calculate item totals
    const processedItems = items.map(item => ({
      ...item,
    }));

    // Generate order number
    const orderNumber = await Order.generateOrderNumber();

    // Default pickup location (Orion Plastic Factory)
    const defaultPickupLocation = pickupLocation || {
      address: 'Orion Plastic Factory, Plot No. 45, GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat 382445',
      coordinates: {
        latitude: 22.9871,
        longitude: 72.6369
      },
      contactPerson: 'Factory Manager',
      contactPhone: '9876543200'
    };

    // Create order
    const order = await Order.create({
      orderNumber,
      customerId: req.user._id,
      orderType: orderType || 'retail',
      items: processedItems,
      pickupLocation: defaultPickupLocation,
      deliveryLocation,
      scheduledPickupDate,
      scheduledDeliveryDate,
      specialInstructions,
      packagingInstructions,
      priority: priority || 'medium',
      paymentDetails: {
        method: paymentMethod || 'cod',
        status: 'pending'
      },
      status: 'pending',
      createdBy: req.user._id
    });

    // Create status history
    await OrderStatusHistory.create({
      orderId: order._id,
      status: 'pending',
      remarks: 'Order placed by customer',
      updatedBy: {
        userId: req.user._id,
        userRole: req.user.role,
        userName: req.user.name
      }
    });

    // Populate customer details
    await order.populate('customerId', 'name email phone');

    return successResponse(res, 'Order placed successfully', {
      order,
      message: 'Your order has been placed. Our team will confirm it shortly.'
    }, 201);

  } catch (error) {
    console.error('Create Order Error:', error);
    return errorResponse(res, error.message || 'Failed to create order', 500);
  }
};

// Admin creates order
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
//       packagingInstructions,
//       paymentMethod,
//       orderType,
//       priority,
//       taxPercentage,
//       shippingCharges,
//       discount,
//       status
//     } = req.body;

//     // Validate customer
//     const customer = await User.findById(customerId);
//     if (!customer) {
//       return errorResponse(res, 'Customer not found', 404);
//     }

//     // Validate items
//     if (!items || items.length === 0) {
//       return errorResponse(res, 'Order must have at least one item', 400);
//     }

//     // Calculate item totals
//     const processedItems = items.map(item => ({
//       ...item
//     }));

//     // Generate order number
//     const orderNumber = await Order.generateOrderNumber();

//     // Default pickup location
//     const defaultPickupLocation = pickupLocation || {
//       address: 'Orion Plastic Factory, Plot No. 45, GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat 382445',
//       coordinates: {
//         latitude: 22.9871,
//         longitude: 72.6369
//       },
//       contactPerson: 'Factory Manager',
//       contactPhone: '9876543200'
//     };

//     // Create order
//     const order = await Order.create({
//       orderNumber,
//       customerId,
//       orderType: orderType || 'retail',
//       items: processedItems,
//       pickupLocation: defaultPickupLocation,
//       deliveryLocation,
//       scheduledPickupDate,
//       scheduledDeliveryDate,
//       specialInstructions,
//       packagingInstructions,
//       priority: priority || 'medium',
//       taxPercentage: taxPercentage || 0,
//       shippingCharges: shippingCharges || 0,
//       discount: discount || { amount: 0, percentage: 0 },
//       paymentDetails: {
//         method: paymentMethod || 'cod',
//         status: 'pending'
//       },
//       status: status || 'confirmed',
//       createdBy: req.user._id,
//       confirmedBy: status === 'confirmed' ? req.user._id : null,
//       confirmedAt: status === 'confirmed' ? new Date() : null
//     });

//     // Create status history
//     await OrderStatusHistory.create({
//       orderId: order._id,
//       status: order.status,
//       remarks: `Order created by admin`,
//       updatedBy: {
//         userId: req.user._id,
//         userRole: req.user.role,
//         userName: req.user.name
//       }
//     });

//     // Populate customer details
//     await order.populate('customerId', 'name email phone');

//     return successResponse(res, 'Order created successfully', { order }, 201);

//   } catch (error) {
//     console.error('Create Order By Admin Error:', error);
//     return errorResponse(res, error.message || 'Failed to create order', 500);
//   }
// };

// Admin creates order
exports.createOrderByAdmin = async (req, res) => {
  try {
    const {
      customerId,
      items,
      deliveryLocation,
      pickupLocation,
      scheduledPickupDate,
      scheduledDeliveryDate,
      specialInstructions,
      packagingInstructions,
      priority,
      orderType = 'retail'
    } = req.body;

    // Validate customer
    const customer = await User.findById(customerId);
    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 'At least one item is required', 400);
    }

    // Generate order number
    const orderNumber = await Order.generateOrderNumber();

    // Default pickup location
    const defaultPickup = pickupLocation || {
      address: 'Orion Plastic Factory, Plot No. 45, GIDC Vatva, Ahmedabad',
      coordinates: { latitude: 22.9871, longitude: 72.6369 },
      contactPerson: 'Factory Incharge',
      contactPhone: '9876543210'
    };

    // Create clean logistics order
    const order = await Order.create({
      orderNumber,
      customerId,
      orderType,
      items: items.map(item => ({ 
        productName: item.productName,
        productCode: item.productCode || null,
        category: item.category || 'other',
        quantity: item.quantity,
        description: item.description || '',
        specifications: item.specifications || {}
      })),
      pickupLocation: defaultPickup,
      deliveryLocation,
      scheduledPickupDate: scheduledPickupDate ? new Date(scheduledPickupDate) : null,
      scheduledDeliveryDate: scheduledDeliveryDate ? new Date(scheduledDeliveryDate) : null,
      specialInstructions: specialInstructions || '',
      packagingInstructions: packagingInstructions || '',
      priority: priority || 'medium',
      status: 'confirmed', 
      createdBy: req.user._id,
      confirmedBy: req.user._id,
      confirmedAt: new Date()
    });

    // Create status history
    await OrderStatusHistory.create({
      orderId: order._id,
      status: 'confirmed',
      remarks: 'Order created and confirmed by admin',
      updatedBy: {
        userId: req.user._id,
        userRole: req.user.role,
        userName: req.user.name
      }
    });

    // Populate customer
    await order.populate('customerId', 'name email phone companyName');

    return successResponse(res, 'Order created successfully!', { order }, 201);

  } catch (error) {
    console.error('Create Order Error:', error.message);
    return errorResponse(res, error.message || 'Failed to create order', 500);
  }
};

// ======================== GET ORDERS ========================

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

// Get customer's orders
exports.getMyOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate
    } = req.query;

    const query = { customerId: req.user._id };

    if (status) query.status = status;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('deliveryId', 'trackingNumber status driverId actualDeliveryTime')
        .sort({ createdAt: -1 })
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
    console.error('Get My Orders Error:', error);
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

// ======================== UPDATE ORDER ========================

// Update order (Admin or Customer if pending)
exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const updates = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    // Check if order can be modified
    if (!order.canBeModified()) {
      return errorResponse(res, 'Order cannot be modified in current status', 400);
    }

    // Check authorization
    if (req.user.role === 'customer' && order.customerId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Restricted fields for customers
    if (req.user.role === 'customer') {
      delete updates.status;
      delete updates.taxPercentage;
      delete updates.shippingCharges;
      delete updates.discount;
    }

    // Update order
    Object.assign(order, updates);
    await order.save();

    return successResponse(res, 'Order updated successfully', { order });

  } catch (error) {
    console.error('Update Order Error:', error);
    return errorResponse(res, error.message || 'Failed to update order', 500);
  }
};

// DELETE ORDER (with support for short role 'S')
exports.deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/orders');
    }

    // Debug log (optional, remove later if you want)
    console.log("=== DELETE ORDER DEBUG ===");
    console.log("User Role:", req.user?.role);

    // Role check with short form support ('S' for superadmin, 'A' for admin)
    const userRole = (req.user?.role || '').toString().trim();
    const isSuperAdmin = userRole === 'superadmin' || userRole === 'S';
    const isAdmin = userRole === 'admin' || userRole === 'A';
    const hasAdminAccess = isSuperAdmin || isAdmin;

    // Check if order can be deleted (status based)
    const deletableStatuses = ['pending', 'cancelled', 'failed', 'awaiting_payment'];
    if (!deletableStatuses.includes(order.status)) {
      req.flash('error', 'Order cannot be deleted in current status');
      return res.redirect('/admin/orders');
    }

    // Authorization
    const isOrderOwner = order.customerId?.toString() === req.user._id.toString();

    if (!hasAdminAccess && !isOrderOwner) {
      req.flash('error', 'You do not have permission to delete this order');
      return res.redirect('/admin/orders');
    }

    // Optional: extra safety for non-admin users (customers)
    if (!hasAdminAccess) {
      const timeSinceCreation = Date.now() - new Date(order.createdAt).getTime();
      if (timeSinceCreation > 30 * 60 * 1000) { // 30 minutes
        req.flash('error', 'You can only delete orders within 30 minutes of creation');
        return res.redirect('/admin/orders');
      }
    }

    // Perform deletion
    await Order.findByIdAndDelete(orderId);

    req.flash('success', `Order ${order.orderNumber || orderId} deleted successfully`);
    res.redirect('/admin/orders');

  } catch (error) {
    console.error('Delete Order Error:', error);
    req.flash('error', 'Failed to delete order');
    res.redirect('/admin/orders');
  }
};

// ======================== ORDER STATUS MANAGEMENT ========================

// Confirm order (Admin)
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

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancellationReason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    // Check authorization
    if (req.user.role === 'customer' && order.customerId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Check if order can be cancelled
    if (!order.canBeCancelled()) {
      return errorResponse(res, 'Order cannot be cancelled in current status', 400);
    }

    const previousStatus = order.status;
    order.status = 'cancelled';
    order.cancelledBy = req.user._id;
    order.cancelledAt = new Date();
    order.cancellationReason = cancellationReason;

    await order.save();

    // Create status history
    await OrderStatusHistory.create({
      orderId: order._id,
      status: 'cancelled',
      previousStatus,
      remarks: cancellationReason || 'Order cancelled',
      updatedBy: {
        userId: req.user._id,
        userRole: req.user.role,
        userName: req.user.name
      }
    });

    return successResponse(res, 'Order cancelled successfully', { order });

  } catch (error) {
    console.error('Cancel Order Error:', error);
    return errorResponse(res, error.message || 'Failed to cancel order', 500);
  }
};

// ======================== CREATE DELIVERY FROM ORDER ========================

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

// ======================== PAYMENT MANAGEMENT ========================

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, transactionId, paidAmount } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    order.paymentDetails.status = paymentStatus;
    
    if (transactionId) {
      order.paymentDetails.transactionId = transactionId;
    }
    
    if (paidAmount) {
      order.paymentDetails.paidAmount = paidAmount;
      order.paymentDetails.paidAt = new Date();
    }

    await order.save();

    return successResponse(res, 'Payment status updated successfully', { order });

  } catch (error) {
    console.error('Update Payment Status Error:', error);
    return errorResponse(res, error.message || 'Failed to update payment status', 500);
  }
};

// ======================== STATISTICS ========================

// Get order statistics (Admin)
exports.getOrderStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [
      totalOrders,
      statusCounts,
      paymentStatusCounts,
      totalRevenue,
      averageOrderValue,
      ordersByType
    ] = await Promise.all([
      Order.countDocuments(dateFilter),
      Order.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$paymentDetails.status', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { ...dateFilter, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.aggregate([
        { $match: { ...dateFilter, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, average: { $avg: '$totalAmount' } } }
      ]),
      Order.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$orderType', count: { $sum: 1 } } }
      ])
    ]);

    return successResponse(res, 'Order statistics retrieved successfully', {
      totalOrders,
      statusBreakdown: statusCounts,
      paymentStatusBreakdown: paymentStatusCounts,
      totalRevenue: totalRevenue[0]?.total || 0,
      averageOrderValue: averageOrderValue[0]?.average || 0,
      ordersByType
    });

  } catch (error) {
    console.error('Get Order Statistics Error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve statistics', 500);
  }
};

module.exports = exports;