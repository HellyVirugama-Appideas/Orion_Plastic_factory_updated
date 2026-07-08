const Order = require('../../models/Order');
const { PickupLocation } = require('../../models/Order');
const OrderStatusHistory = require('../../models/OrderStatusHistory');
const Delivery = require('../../models/Delivery');
const mongoose = require('mongoose');
const Customer = require("../../models/Customer")
const { successResponse, errorResponse } = require("../../utils/responseHelper")
const Category = require("../../models/Category")

const { getSortedDeliveryQueueForDriver } = require('../../utils/deliveryQueueHelper');


const Notification = require('../../models/Notification');
const { sendNotification } = require('../../utils/sendNotification');
const Driver = require('../../models/Driver');

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
  const { orderId } = req.params;

  console.log('\n========== UPDATE ORDER START ==========');
  console.log('[UPDATE-ORDER] orderId:', orderId);
  console.log('[UPDATE-ORDER] user:', req.user?.name, '| role:', req.user?.role);

  try {
    // ── Step 1: Order fetch ──
    const order = await Order.findById(orderId);
    if (!order) {
      console.log('[UPDATE-ORDER] ❌ Order not found');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    console.log('[UPDATE-ORDER] ✅ Order found | orderNumber:', order.orderNumber, '| status:', order.status, '| deliveryId:', order.deliveryId || 'NONE');

    // ── Step 2: canUpdateOrder check ──
    if (!order.canBeModified()) {
      console.log('[UPDATE-ORDER] ❌ Cannot update | status:', order.status);
      req.flash('error', `Order cannot be edited — delivery is already ${order.status}. Only Pending/Confirmed orders can be updated.`);
      return res.redirect('/admin/orders');
    }

    // ── Step 3: Authorization ──
    if (req.user.role === 'customer' && order.customerId.toString() !== req.user._id.toString()) {
      console.log('[UPDATE-ORDER] ❌ Access denied');
      req.flash('error', 'Access denied');
      return res.redirect('/admin/orders');
    }

    const updates = req.body;
    console.log('[UPDATE-ORDER] incoming fields:', Object.keys(updates).join(', '));

    // ── Step 4: Customer restricted fields ──
    if (req.user.role === 'customer') {
      delete updates.status;
      delete updates.taxPercentage;
      delete updates.shippingCharges;
      delete updates.discount;
      console.log('[UPDATE-ORDER] Customer role — restricted fields removed');
    }

    // ── Step 5: Items parse ──
    if (updates.items) {
      try {
        updates.items = JSON.parse(updates.items);
        console.log('[UPDATE-ORDER] ✅ Items parsed | count:', updates.items.length);
      } catch (err) {
        console.log('[UPDATE-ORDER] ❌ Items parse failed:', err.message);
        return res.status(400).json({ success: false, message: 'Invalid items format' });
      }
    }

    // ── Step 6: deliveryLocation merge ──
    if (updates.deliveryLocation) {
      console.log('[UPDATE-ORDER] deliveryLocation received — merging...');

      const oldLoc = order.deliveryLocation ? order.deliveryLocation.toObject() : {};
      const newLoc = updates.deliveryLocation;

      const hasNewCoords =
        newLoc.coordinates?.latitude !== undefined &&
        newLoc.coordinates?.latitude !== '' &&
        newLoc.coordinates?.longitude !== undefined &&
        newLoc.coordinates?.longitude !== '';

      console.log('[UPDATE-ORDER] hasNewCoords:', hasNewCoords);
      console.log('[UPDATE-ORDER] old address:', oldLoc.address);
      console.log('[UPDATE-ORDER] new address:', newLoc.address);

      order.deliveryLocation = {
        ...oldLoc,
        address: newLoc.address ?? oldLoc.address,
        contactPerson: newLoc.contactPerson ?? oldLoc.contactPerson,
        contactPhone: newLoc.contactPhone ?? oldLoc.contactPhone,
        city: newLoc.city ?? oldLoc.city,
        state: newLoc.state ?? oldLoc.state,
        pincode: newLoc.pincode ?? oldLoc.pincode,
        landmark: newLoc.landmark ?? oldLoc.landmark,
        coordinates: hasNewCoords
          ? {
            latitude: Number(newLoc.coordinates.latitude),
            longitude: Number(newLoc.coordinates.longitude)
          }
          : oldLoc.coordinates
      };

      console.log('[UPDATE-ORDER] ✅ deliveryLocation merged | final address:', order.deliveryLocation.address);
      delete updates.deliveryLocation;
    }

    // ── Step 7: Save order ──
    Object.assign(order, updates);
    await order.save();
    console.log('[UPDATE-ORDER] ✅ Order saved | deliveryId:', order.deliveryId || 'NONE');

    // ── Step 8: Delivery collection sync ──
    if (order.deliveryId) {
      try {
        const deliveryUpdate = {
          'deliveryLocation.address': order.deliveryLocation.address,
          'deliveryLocation.contactPerson': order.deliveryLocation.contactPerson,
          'deliveryLocation.contactPhone': order.deliveryLocation.contactPhone,
        };

        if (order.deliveryLocation?.coordinates?.latitude &&
          order.deliveryLocation?.coordinates?.longitude) {
          deliveryUpdate['deliveryLocation.coordinates.latitude'] = order.deliveryLocation.coordinates.latitude;
          deliveryUpdate['deliveryLocation.coordinates.longitude'] = order.deliveryLocation.coordinates.longitude;
        }

        await Delivery.findByIdAndUpdate(order.deliveryId, deliveryUpdate, { new: false });
        console.log('[UPDATE-ORDER] ✅ Delivery document synced');
      } catch (delErr) {
        console.error('[UPDATE-ORDER] ❌ Delivery sync failed:', delErr.message);
      }
    }

    // ── Step 9: Driver notification ──
    if (!order.deliveryId) {
      console.log('[UPDATE-ORDER] ⚠️ No deliveryId — notification skipped');
    } else {
      console.log('\n[UPDATE-ORDER] --- NOTIFICATION BLOCK START ---');
      try {
        const delivery = await Delivery.findById(order.deliveryId);
        console.log('[UPDATE-ORDER] delivery found:', !!delivery);
        console.log('[UPDATE-ORDER] delivery.driverId:', delivery?.driverId || 'NULL');
        console.log('[UPDATE-ORDER] delivery.status:', delivery?.status);

        if (!delivery?.driverId) {
          console.warn('[UPDATE-ORDER] ⚠️ No driverId — driver not assigned yet');
        } else {
          const driverId = delivery.driverId.toString();
          console.log('[UPDATE-ORDER] driverId:', driverId);

          const driver = await Driver.findById(driverId).select('fcmToken name');
          console.log('[UPDATE-ORDER] driver name:', driver?.name || 'NOT FOUND');
          console.log('[UPDATE-ORDER] fcmToken:', driver?.fcmToken
            ? driver.fcmToken.substring(0, 25) + '...'
            : 'MISSING'
          );

          const notifTitle = `Order Updated — ${order.orderNumber}`;
          const notifMessage = `Delivery address has been updated. Please check the app.`;

          // ── Step 9a: Notification DB record create karo ──
          // (Same pattern as working delivery_assigned)
          try {
            await Notification.create({
              recipientId: driverId,
              recipientType: 'Driver',
              type: 'delivery_updated',
              title: notifTitle,
              message: notifMessage,
              data: {
                deliveryId: order.deliveryId,
              },
              channels: {
                push: {
                  sent: !!driver?.fcmToken,
                  sentAt: driver?.fcmToken ? new Date() : undefined,
                }
              },
              priority: 'high',
              isRead: false,
            });
            console.log('[UPDATE-ORDER] ✅ Notification saved to DB');
          } catch (dbErr) {
            console.error('[UPDATE-ORDER] ❌ Notification DB save failed:', dbErr.message);
          }

          // ── Step 9b: FCM push (same sendNotification utility jo working hai) ──
          if (driver?.fcmToken) {
            try {
              const fcmResult = await sendNotification(driver.fcmToken, {
                title: notifTitle,
                body: notifMessage,
                type: 'order_updated',
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                deliveryId: order.deliveryId.toString(),
                address: order.deliveryLocation?.address || '',
              });
              console.log('[UPDATE-ORDER] ✅ FCM push result:', fcmResult ? 'sent' : 'failed');
            } catch (fcmErr) {
              console.error('[UPDATE-ORDER] ❌ FCM push error:', fcmErr.message);
            }
          } else {
            console.warn('[UPDATE-ORDER] ⚠️ FCM skipped — no token');
          }

          // ── Step 9c: Socket emit ──
          const io = req.app.get('io');
          if (io) {
            const room = `driver-${driverId}`;
            const roomSockets = await io.in(room).allSockets();
            console.log(`[UPDATE-ORDER] Socket room "${room}" connections: ${roomSockets.size}`);

            io.to(room).emit('order:updated', {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              message: notifMessage,
              updatedFields: {
                deliveryLocation: order.deliveryLocation || null,
                specialInstructions: order.specialInstructions || null,
                priority: order.priority || null,
              },
              timestamp: new Date().toISOString(),
            });
            console.log('[UPDATE-ORDER] ✅ Socket emitted to room:', room);
          } else {
            console.warn('[UPDATE-ORDER] ⚠️ io not found on req.app');
          }
        }
      } catch (notifyErr) {
        console.error('[UPDATE-ORDER] ❌ Notification block error:', notifyErr.message);
        console.error(notifyErr.stack);
      }
      console.log('[UPDATE-ORDER] --- NOTIFICATION BLOCK END ---\n');
    }

    // ── Step 10: Admin room broadcast ──
    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('order:updated', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        updatedBy: req.user?.name || 'Admin',
        timestamp: new Date().toISOString(),
      });
      console.log('[UPDATE-ORDER] ✅ Admin room broadcast done');
    }

    console.log('========== UPDATE ORDER DONE ==========\n');
    req.flash('success', 'Order updated successfully');
    res.redirect('/admin/orders');

  } catch (error) {
    console.error('[UPDATE-ORDER] ❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    req.flash('error', 'Failed to update order');
    res.redirect(`/admin/orders/edit/${orderId}`);
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

    // return res.status(200).json({
    //   success: true,
    //   message: 'Order deleted successfully',
    //   deletedOrderId: orderId
    // });
    res.redirect(`/admin/orders`);

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

// exports.updateOrderPriority = async (req, res) => {
//   const { orderId } = req.params;
//   const { priority } = req.body;

//   console.log('\n========== UPDATE PRIORITY START ==========');
//   console.log('[PRIORITY] orderId:', orderId, '| newPriority:', priority);

//   try {
//     if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
//       return res.status(400).json({ success: false, message: 'Invalid priority value' });
//     }

//     const order = await Order.findById(orderId).populate('customerId', 'name companyName');
//     if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

//     const oldPriority = order.priority;
//     console.log('[PRIORITY] orderNumber:', order.orderNumber, '| change:', oldPriority, '→', priority);
//     console.log('[PRIORITY] deliveryId:', order.deliveryId || 'NONE');

//     order.priority = priority;
//     await order.save();
//     console.log('[PRIORITY] ✅ Priority saved to DB');

//     let driverNotified = false;

//     if (!order.deliveryId) {
//       console.log('[PRIORITY] ⚠️ No deliveryId — notification skipped');
//     } else {
//       console.log('\n[PRIORITY] --- NOTIFICATION BLOCK START ---');
//       try {
//         const delivery = await Delivery.findById(order.deliveryId);
//         console.log('[PRIORITY] delivery found:', !!delivery);
//         console.log('[PRIORITY] delivery.driverId:', delivery?.driverId || 'NULL');

//         if (!delivery?.driverId) {
//           console.warn('[PRIORITY] ⚠️ No driverId on delivery');
//         } else {
//           const driverId = delivery.driverId.toString();
//           console.log('[PRIORITY] driverId:', driverId);

//           const driver = await Driver.findById(driverId).select('fcmToken name');
//           console.log('[PRIORITY] driver name:', driver?.name || 'NOT FOUND');
//           console.log('[PRIORITY] fcmToken:', driver?.fcmToken
//             ? driver.fcmToken.substring(0, 25) + '...'
//             : 'MISSING'
//           );

//           const notifTitle = `Priority: ${priority.toUpperCase()} — ${order.orderNumber}`;
//           const notifMessage = `Order priority changed from ${oldPriority} to ${priority}`;

//           // ── Notification DB record ──
//           try {
//             await Notification.create({
//               recipientId: driverId,
//               recipientType: 'Driver',
//               type: 'delivery_updated',
//               title: notifTitle,
//               message: notifMessage,
//               data: {
//                 deliveryId: order.deliveryId,
//               },
//               channels: {
//                 push: {
//                   sent: !!driver?.fcmToken,
//                   sentAt: driver?.fcmToken ? new Date() : undefined,
//                 }
//               },
//               priority: priority === 'urgent' ? 'urgent' : 'high',
//               isRead: false,
//             });
//             console.log('[PRIORITY] ✅ Notification saved to DB');
//           } catch (dbErr) {
//             console.error('[PRIORITY] ❌ Notification DB save failed:', dbErr.message);
//           }

//           // ── FCM push ──
//           if (driver?.fcmToken) {
//             try {
//               const fcmResult = await sendNotification(driver.fcmToken, {
//                 title: notifTitle,
//                 body: notifMessage,
//                 type: 'priority_changed',
//                 orderId: order._id.toString(),
//                 orderNumber: order.orderNumber,
//                 oldPriority: String(oldPriority),
//                 newPriority: String(priority),
//                 deliveryId: order.deliveryId.toString(),
//               });
//               console.log('[PRIORITY] ✅ FCM push result:', fcmResult ? 'sent' : 'failed');
//               driverNotified = !!fcmResult;
//             } catch (fcmErr) {
//               console.error('[PRIORITY] ❌ FCM error:', fcmErr.message);
//             }
//           } else {
//             console.warn('[PRIORITY] ⚠️ FCM skipped — no token');
//           }

//           // ── Socket ──
//           const io = req.app.get('io');
//           if (io) {
//             const room = `driver-${driverId}`;
//             const roomSockets = await io.in(room).allSockets();
//             console.log(`[PRIORITY] Socket room "${room}" connections: ${roomSockets.size}`);

//             io.to(room).emit('order:priority:changed', {
//               orderId: order._id.toString(),
//               orderNumber: order.orderNumber,
//               oldPriority,
//               newPriority: priority,
//               message: notifMessage,
//             });
//             console.log('[PRIORITY] ✅ Socket emitted to room:', room);
//           }
//         }
//       } catch (notifyErr) {
//         console.error('[PRIORITY] ❌ Notification block error:', notifyErr.message);
//         console.error(notifyErr.stack);
//       }
//       console.log('[PRIORITY] --- NOTIFICATION BLOCK END ---\n');
//     }

//     console.log('========== UPDATE PRIORITY DONE ==========\n');

//     return res.json({
//       success: true,
//       message: `Priority updated to ${priority}`,
//       priority,
//       orderId,
//       driverNotified,
//     });

//   } catch (error) {
//     console.error('[PRIORITY] ❌ FATAL ERROR:', error.message);
//     console.error(error.stack);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };


module.exports = exports;
