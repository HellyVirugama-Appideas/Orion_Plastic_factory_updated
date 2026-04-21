const Delivery = require('../../models/Delivery');
const Route = require('../../models/Route');
const Driver = require('../../models/Driver');
const DeliveryStatusHistory = require('../../models/DeliveryStatusHistory');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { generateOTP } = require('../../utils/otpHelper');
const { sendSMS } = require('../../utils/smsHelper');
const Remark = require('../../models/Remark');


// exports.getDeliveryDetails = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;
//     const driver = req.user;

//     const delivery = await Delivery.findOne({
//       _id: deliveryId,
//       driverId: driver._id
//     })
//       .populate('customerId', 'name phone companyName')
//       .populate('driverId', 'name phone vehicleNumber')
//       .populate({
//         path: 'remarks',
//         populate: { path: 'createdBy', select: 'name role' }
//       })
//       .populate('route');

//     if (!delivery) {
//       return errorResponse(res, 'Delivery not found or not assigned to you', 404);
//     }

//     const formatted = {
//       id: delivery._id,
//       trackingNumber: delivery.trackingNumber,
//       orderId: delivery.orderId,
//       status: delivery.status,
//       priority: delivery.priority,
//       distance: delivery.distance,
//       estimatedDuration: delivery.estimatedDuration,
//       customer: delivery.customerId ? {
//         name: delivery.customerId.name,
//         phone: delivery.customerId.phone,
//         company: delivery.customerId.companyName
//       } : null,
//       pickup: {
//         address: delivery.pickupLocation.address,
//         contactPerson: delivery.pickupLocation.contactPerson,
//         contactPhone: delivery.pickupLocation.contactPhone
//       },
//       delivery: {
//         address: delivery.deliveryLocation.address,
//         contactPerson: delivery.deliveryLocation.contactPerson,
//         contactPhone: delivery.deliveryLocation.contactPhone
//       },
//       package: delivery.packageDetails,
//       scheduledPickupTime: delivery.scheduledPickupTime,
//       scheduledDeliveryTime: delivery.scheduledDeliveryTime,
//       actualPickupTime: delivery.actualPickupTime,
//       actualDeliveryTime: delivery.actualDeliveryTime,
//       instructions: delivery.instructions,
//       remarks: delivery.remarks.map(r => ({
//         text: r.remarkText,
//         category: r.category,
//         severity: r.severity,
//         color: r.color,
//         createdAt: r.createdAt,
//         createdBy: r.createdBy ? r.createdBy.name : 'System'
//       }))
//     };

//     return successResponse(res, 'Delivery details fetched', formatted);
//   } catch (error) {
//     console.error('Get Delivery Details Error:', error);
//     return errorResponse(res, 'Failed to fetch details', 500);
//   }
// };

// Get Driver Deliveries - Upcoming & Completed 

exports.getDriverDeliveries = async (req, res) => {
  try {
    const driver = req.user;

    if (!driver || driver.role !== 'driver') {
      return errorResponse(res, 'Unauthorized', 401);
    }

    // Fetch all deliveries assigned to this driver
    const deliveries = await Delivery.find({ driverId: driver._id })
      .populate('customerId', 'name phone companyName')
      .populate('remarks', 'remarkText category severity color createdAt')
      .select(
        'trackingNumber status priority pickupLocation deliveryLocation scheduledDeliveryTime actualDeliveryTime packageDetails distance'
      )
      .sort({ scheduledDeliveryTime: 1 })
      .lean();

    // Define which statuses are Upcoming vs Completed
    const upcomingStatuses = ['Pending_acceptance', 'Assigned', 'Picked_up', 'In_transit', 'Out_for_delivery', 'Arrived', 'assigned', "Proof_uploaded"];
    const completedStatuses = ['Delivered', 'Failed', 'Cancelled',"Completed"];

    const upcoming = [];
    const completed = [];

    deliveries.forEach(d => {
      const item = {
        id: d._id.toString(),
        trackingNumber: d.trackingNumber,
        companyName: d.customerId?.companyName || d.customerId?.name || 'Unknown Customer',
        status: d.status,
        priority: d.priority,
        time: d.scheduledDeliveryTime
          ? new Date(d.scheduledDeliveryTime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }).replace(' ', '')
          : 'Not Scheduled',
        date: d.scheduledDeliveryTime
          ? new Date(d.scheduledDeliveryTime).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short'
          }).replace(' ', ' ')
          : null,
        deliveryAddress: d.deliveryLocation.address.split(',')[0] || d.deliveryLocation.address,
        pickupAddress: d.pickupLocation.address.split(',')[0] || d.pickupLocation.address,
        distance: d.distance ? `${d.distance.toFixed(1)} km` : 'N/A',
        packageInfo: d.packageDetails.description
          ? `${d.packageDetails.quantity || 1}x ${d.packageDetails.description}`
          : 'Package',
        remarks: d.remarks?.length > 0
          ? d.remarks.map(r => ({
            text: r.remarkText,
            category: r.category,
            severity: r.severity,
            color: r.color || '#666',
            time: new Date(r.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          }))
          : []
      };

      if (upcomingStatuses.includes(d.status)) {
        upcoming.push(item);
      } else if (completedStatuses.includes(d.status)) {
        completed.push(item);
      }
    });

    return successResponse(res, 'Deliveries fetched successfully', {
      upcoming,
      completed,
      counts: {
        upcoming: upcoming.length,
        completed: completed.length
      }
    });

  } catch (error) {
    console.error('Get Driver Deliveries Error:', error);
    return errorResponse(res, 'Failed to load deliveries', 500);
  }
};

// GET /driver/delivery/:deliveryId/details
// GET /admin/delivery/:deliveryId OR /driver/delivery/:deliveryId/details
exports.getDeliveryDetails = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const user = req.user;

    const delivery = await Delivery.findById(deliveryId)
      .populate('customerId', 'name phone companyName')
      .populate('driverId', 'name phone vehicleNumber')
      .populate('createdBy', 'name')
      .lean();

    if (!delivery) return errorResponse(res, 'Delivery not found', 404);

    // Calculate Times (Exact Image Jaisa)
    const formatTime = (date) => date ? new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) : '—';

    const formatDateTime = (date) => date ? new Date(date).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }).replace(',', '') : null;

    const calcDuration = (start, end) => {
      if (!start || !end) return 'In Progress';
      const diff = new Date(end) - new Date(start);
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return h > 0 ? `${h}h ${m}m` : `${m} min`;
    };

    // Waiting Time: picked_up → out_for_delivery
    let waitingTime = '—';
    if (delivery.actualPickupTime) {
      const history = await DeliveryStatusHistory.find({ deliveryId })
        .sort({ timestamp: 1 })
        .select('status timestamp');

      const pickedUpTime = delivery.actualPickupTime;
      const outForDeliveryTime = history.find(h => h.status === 'out_for_delivery')?.timestamp;

      if (outForDeliveryTime) {
        waitingTime = calcDuration(pickedUpTime, outForDeliveryTime);
      } else if (['out_for_delivery', 'delivered'].includes(delivery.status)) {
        waitingTime = '0 min';
      } else {
        waitingTime = 'In Progress';
      }
    }

    const journeyDetails = {
      started: delivery.actualPickupTime ? formatTime(delivery.actualPickupTime) : 'Not Started',
      ended: delivery.actualDeliveryTime ? formatTime(delivery.actualDeliveryTime) : 'Not Ended',
      waitingTime: waitingTime,
      timeTaken: delivery.actualPickupTime && delivery.actualDeliveryTime
        ? calcDuration(delivery.actualPickupTime, delivery.actualDeliveryTime)
        : (delivery.actualPickupTime ? 'In Progress' : 'Not Started'),
      totalDistance: delivery.distance > 0 ? `${delivery.distance.toFixed(1)} km` : 'Calculating...'
    };

    const response = {
      id: delivery._id.toString(),
      trackingNumber: delivery.trackingNumber,
      orderId: delivery.orderId,
      status: delivery.status,
      priority: delivery.priority,
      journey: journeyDetails,
      customer: {
        name: delivery.customerId?.companyName || delivery.customerId?.name || 'Unknown',
        phone: delivery.customerId?.phone || delivery.deliveryLocation.contactPhone
      },
      pickup: {
        address: delivery.pickupLocation.address.split(',')[0],
        fullAddress: delivery.pickupLocation.address,
        contact: delivery.pickupLocation.contactPerson || 'N/A',
        phone: delivery.pickupLocation.contactPhone || 'N/A'
      },
      delivery: {
        address: delivery.deliveryLocation.address.split(',')[0],
        fullAddress: delivery.deliveryLocation.address,
        contact: delivery.deliveryLocation.contactPerson,
        phone: delivery.deliveryLocation.contactPhone
      },
      package: {
        description: delivery.packageDetails.description || 'General Item',
        quantity: delivery.packageDetails.quantity || 1,
        weight: delivery.packageDetails.weight ? `${delivery.packageDetails.weight} kg` : null,
        fragile: delivery.packageDetails.fragile
      },
      schedule: {
        pickup: delivery.scheduledPickupTime ? formatDateTime(delivery.scheduledPickupTime) : null,
        delivery: delivery.scheduledDeliveryTime ? formatDateTime(delivery.scheduledDeliveryTime) : null
      },
      driver: delivery.driverId ? {
        name: delivery.driverId.name,
        phone: delivery.driverId.phone,
        vehicle: delivery.driverId.vehicleNumber
      } : null,
      proof: delivery.status === 'delivered' ? {
        receiverName: delivery.deliveryProof.receiverName,
        photos: delivery.deliveryProof.photos || [],
        signature: delivery.deliveryProof.signature || null,
        otpVerified: delivery.deliveryProof.otpVerified
      } : null,
      instructions: delivery.instructions || null,
      createdAt: formatDateTime(delivery.createdAt)
    };

    return successResponse(res, 'Delivery details fetched', response);

  } catch (error) {
    console.error('Error:', error);
    return errorResponse(res, 'Server error', 500);
  }
};