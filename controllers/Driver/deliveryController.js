// const Delivery = require('../../models/Delivery');
// const Route = require('../../models/Route');
// const Driver = require('../../models/Driver');
// const DeliveryStatusHistory = require('../../models/DeliveryStatusHistory');
// const { successResponse, errorResponse } = require('../../utils/responseHelper');
// const { generateOTP } = require('../../utils/otpHelper');
// const { sendSMS } = require('../../utils/smsHelper');
// const Remark = require('../../models/Remark');
// const { sortByProximity } = require('../../utils/geoHelper');

// // Get Driver Deliveries - Upcoming & Completed 

// // exports.getDriverDeliveries = async (req, res) => {
// //   try {
// //     const driver = req.user;

// //     if (!driver || driver.role !== 'driver') {
// //       return errorResponse(res, 'Unauthorized', 401);
// //     }

// //     // Fetch all deliveries assigned to this driver
// //     const deliveries = await Delivery.find({ driverId: driver._id })
// //       .populate('customerId', 'name phone companyName')
// //       .populate('remarks', 'remarkText category severity color createdAt')
// //       .select(
// //         'trackingNumber status priority pickupLocation deliveryLocation scheduledDeliveryTime actualDeliveryTime packageDetails distance'
// //       )
// //       .sort({ scheduledDeliveryTime: 1 })
// //       .lean();

// //     // Define which statuses are Upcoming vs Completed
// //     const upcomingStatuses = ['Pending_acceptance', 'Assigned', 'Picked_up', 'In_transit', 'Out_for_delivery', 'Arrived', 'assigned', "Proof_uploaded"];
// //     const completedStatuses = ['Delivered', 'Failed', 'Cancelled',"Completed"];

// //     const upcoming = [];
// //     const completed = [];

// //     deliveries.forEach(d => {
// //       const item = {
// //         id: d._id.toString(),
// //         trackingNumber: d.trackingNumber,
// //         companyName: d.customerId?.companyName || d.customerId?.name || 'Unknown Customer',
// //         status: d.status,
// //         priority: d.priority,
// //         time: d.scheduledDeliveryTime
// //           ? new Date(d.scheduledDeliveryTime).toLocaleTimeString('en-US', {
// //             hour: '2-digit',
// //             minute: '2-digit',
// //             hour12: true
// //           }).replace(' ', '')
// //           : 'Not Scheduled',
// //         date: d.scheduledDeliveryTime
// //           ? new Date(d.scheduledDeliveryTime).toLocaleDateString('en-GB', {
// //             day: '2-digit',
// //             month: 'short'
// //           }).replace(' ', ' ')
// //           : null,
// //         deliveryAddress: d.deliveryLocation.address.split(',')[0] || d.deliveryLocation.address,
// //         pickupAddress: d.pickupLocation.address.split(',')[0] || d.pickupLocation.address,
// //         distance: d.distance ? `${d.distance.toFixed(1)} km` : 'N/A',
// //         packageInfo: d.packageDetails.description
// //           ? `${d.packageDetails.quantity || 1}x ${d.packageDetails.description}`
// //           : 'Package',
// //         remarks: d.remarks?.length > 0
// //           ? d.remarks.map(r => ({
// //             text: r.remarkText,
// //             category: r.category,
// //             severity: r.severity,
// //             color: r.color || '#666',
// //             time: new Date(r.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
// //           }))
// //           : []
// //       };

// //       if (upcomingStatuses.includes(d.status)) {
// //         upcoming.push(item);
// //       } else if (completedStatuses.includes(d.status)) {
// //         completed.push(item);
// //       }
// //     });

// //     return successResponse(res, 'Deliveries fetched successfully', {
// //       upcoming,
// //       completed,
// //       counts: {
// //         upcoming: upcoming.length,
// //         completed: completed.length
// //       }
// //     });

// //   } catch (error) {
// //     console.error('Get Driver Deliveries Error:', error);
// //     return errorResponse(res, 'Failed to load deliveries', 500);
// //   }
// // };

// // ================================================================
// // controllers/Driver/deliveryController.js me
// // exports.getDriverDeliveries poora is se REPLACE karo
// // ================================================================
// // FIXES:
// // 1. Active (already started - In_transit/Picked_up/etc) delivery ab
// //    ranking me shaamil nahi hoti - use "current" ke taur pe list ke
// //    top pe pin kar diya, baaki queue se compete nahi karti.
// // 2. Pending (abhi shuru na hui / "assigned") deliveries ka distance
// //    ab deliveryLocation (destination) se calculate hota hai, pickupLocation
// //    (jo sabke liye SAME warehouse hota hai) se nahi - isi wajah se
// //    2 alag deliveries same distance dikha rahi thi.
// // 3. Agar backend route-optimizer ne already routeSequence set kar diya
// //    hai (jo order-assign/delivery-complete pe automatically chalta hai),
// //    to USI ko authoritative maana jata hai - do alag sorting mechanism
// //    ab conflict nahi karte.
// // ================================================================

// exports.getDriverDeliveries = async (req, res) => {
//   try {
//     const driver = req.user;

//     if (!driver || driver.role !== 'driver') {
//       return errorResponse(res, 'Unauthorized', 401);
//     }

//     const driverDoc = await Driver.findById(driver._id).select('currentLocation');
//     const driverLocation = (driverDoc?.currentLocation?.latitude && driverDoc?.currentLocation?.longitude)
//       ? { latitude: driverDoc.currentLocation.latitude, longitude: driverDoc.currentLocation.longitude }
//       : null;

//     const deliveries = await Delivery.find({ driverId: driver._id })
//       .populate('customerId', 'name phone companyName')
//       .populate('remarks', 'remarkText category severity color createdAt')
//       .select(
//         'trackingNumber status priority pickupLocation deliveryLocation scheduledDeliveryTime actualDeliveryTime packageDetails distance routeGroupId routeSequence effectivePickupLocation distanceFromPrevious'
//       )
//       .sort({ scheduledDeliveryTime: 1 })
//       .lean();

//     const upcomingStatuses = ['Pending_acceptance', 'Assigned', 'Picked_up', 'In_transit', 'Out_for_delivery', 'Arrived', 'assigned', "Proof_uploaded"];
//     const completedStatuses = ['Delivered', 'Failed', 'Cancelled', "Completed"];

//     // In statuses ka matlab driver already package leke nikal chuka hai -
//     // ye "ACTIVE" delivery hai, ranking me shaamil nahi hogi, alag pin hogi
//     const activeStatuses = ['Picked_up', 'In_transit', 'Out_for_delivery', 'Arrived', 'Proof_uploaded'];

//     const upcomingRaw = deliveries.filter(d => upcomingStatuses.includes(d.status));
//     const completedRaw = deliveries.filter(d => completedStatuses.includes(d.status));

//     // ✅ FIX 1: Active delivery ko queue-ranking se ALAG karo
//     const activeRaw = upcomingRaw.filter(d => activeStatuses.includes(d.status));
//     const pendingRaw = upcomingRaw.filter(d => !activeStatuses.includes(d.status));

//     // ================================================================
//     // ✅ NEAREST-FIRST SORTING (sirf PENDING queue pe, active ko touch nahi)
//     // ================================================================
//     let orderedPending = pendingRaw;

//     // ✅ FIX 3: Agar backend route-optimizer ne already sequence set kar
//     // diya hai (routeSequence field), usi ko follow karo - dobara alag
//     // se proximity-calculate mat karo (do sources of truth clash karte the)
//     const allHaveRouteSequence = pendingRaw.length > 0 &&
//       pendingRaw.every(d => d.routeSequence !== undefined && d.routeSequence !== null);

//     if (allHaveRouteSequence) {
//       orderedPending = [...pendingRaw].sort((a, b) => a.routeSequence - b.routeSequence);
//     } else if (driverLocation && pendingRaw.length > 1) {
//       // Fallback: agar kisi wajah se routeSequence set nahi hai, to yahin
//       // pe proximity-sort karo - lekin ab hamesha deliveryLocation
//       // (destination) use karo, pickupLocation (shared warehouse) nahi
//       const getCoords = (d) => {
//         const loc = d.deliveryLocation;
//         return (loc?.coordinates?.latitude && loc?.coordinates?.longitude)
//           ? { latitude: loc.coordinates.latitude, longitude: loc.coordinates.longitude }
//           : null;
//       };

//       const ranked = await sortByProximity(driverLocation, pendingRaw, getCoords);
//       orderedPending = ranked.map(r => ({
//         ...r.item,
//         __distanceKm: r.distanceKm,
//         __etaMin: r.durationMin,
//         __distanceSource: r.source
//       }));
//     }

//     // Active delivery(ies) hamesha list ke TOP pe, kabhi reorder nahi hoti
//     const orderedUpcoming = [...activeRaw, ...orderedPending];

//     const upcoming = [];
//     const completed = [];

//     orderedUpcoming.forEach((d) => {
//       const isActive = activeStatuses.includes(d.status);

//       const item = {
//         id: d._id.toString(),
//         trackingNumber: d.trackingNumber,
//         companyName: d.customerId?.companyName || d.customerId?.name || 'Unknown Customer',
//         status: d.status,
//         priority: d.priority,
//         time: d.scheduledDeliveryTime
//           ? new Date(d.scheduledDeliveryTime).toLocaleTimeString('en-US', {
//             hour: '2-digit',
//             minute: '2-digit',
//             hour12: true
//           }).replace(' ', '')
//           : 'Not Scheduled',
//         date: d.scheduledDeliveryTime
//           ? new Date(d.scheduledDeliveryTime).toLocaleDateString('en-GB', {
//             day: '2-digit',
//             month: 'short'
//           }).replace(' ', ' ')
//           : null,
//         deliveryAddress: d.deliveryLocation.address.split(',')[0] || d.deliveryLocation.address,
//         pickupAddress: d.pickupLocation.address.split(',')[0] || d.pickupLocation.address,
//         distance: d.distance ? `${d.distance.toFixed(1)} km` : 'N/A',
//         // ✅ FIX 2: Active delivery ko rank/tag nahi milta - isSurrent flag milta hai
//         isCurrent: isActive,
//         nearestRank: isActive ? null : (orderedPending.indexOf(d) + 1),
//         distanceFromDriver: (d.__distanceKm !== undefined && d.__distanceKm !== Infinity)
//           ? `${d.__distanceKm.toFixed(1)} km`
//           : (d.distanceFromPrevious !== undefined && d.distanceFromPrevious !== null
//               ? `${d.distanceFromPrevious.toFixed(1)} km`
//               : null),
//         etaFromDriver: d.__etaMin ? `${d.__etaMin} min` : null,
//         packageInfo: d.packageDetails.description
//           ? `${d.packageDetails.quantity || 1}x ${d.packageDetails.description}`
//           : 'Package',
//         remarks: d.remarks?.length > 0
//           ? d.remarks.map(r => ({
//             text: r.remarkText,
//             category: r.category,
//             severity: r.severity,
//             color: r.color || '#666',
//             time: new Date(r.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
//           }))
//           : []
//       };

//       upcoming.push(item);
//     });

//     completedRaw.forEach(d => {
//       const item = {
//         id: d._id.toString(),
//         trackingNumber: d.trackingNumber,
//         companyName: d.customerId?.companyName || d.customerId?.name || 'Unknown Customer',
//         status: d.status,
//         priority: d.priority,
//         time: d.scheduledDeliveryTime
//           ? new Date(d.scheduledDeliveryTime).toLocaleTimeString('en-US', {
//             hour: '2-digit',
//             minute: '2-digit',
//             hour12: true
//           }).replace(' ', '')
//           : 'Not Scheduled',
//         date: d.scheduledDeliveryTime
//           ? new Date(d.scheduledDeliveryTime).toLocaleDateString('en-GB', {
//             day: '2-digit',
//             month: 'short'
//           }).replace(' ', ' ')
//           : null,
//         deliveryAddress: d.deliveryLocation.address.split(',')[0] || d.deliveryLocation.address,
//         pickupAddress: d.pickupLocation.address.split(',')[0] || d.pickupLocation.address,
//         distance: d.distance ? `${d.distance.toFixed(1)} km` : 'N/A',
//         packageInfo: d.packageDetails.description
//           ? `${d.packageDetails.quantity || 1}x ${d.packageDetails.description}`
//           : 'Package',
//         remarks: d.remarks?.length > 0
//           ? d.remarks.map(r => ({
//             text: r.remarkText,
//             category: r.category,
//             severity: r.severity,
//             color: r.color || '#666',
//             time: new Date(r.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
//           }))
//           : []
//       };

//       completed.push(item);
//     });

//     return successResponse(res, 'Deliveries fetched successfully', {
//       upcoming,
//       completed,
//       counts: {
//         upcoming: upcoming.length,
//         completed: completed.length
//       },
//       sortedByProximity: !!driverLocation
//     });

//   } catch (error) {
//     console.error('Get Driver Deliveries Error:', error);
//     return errorResponse(res, 'Failed to load deliveries', 500);
//   }
// };

// // GET /driver/delivery/:deliveryId/details
// // GET /admin/delivery/:deliveryId OR /driver/delivery/:deliveryId/details
// exports.getDeliveryDetails = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;
//     const user = req.user;

//     const delivery = await Delivery.findById(deliveryId)
//       .populate('customerId', 'name phone companyName')
//       .populate('driverId', 'name phone vehicleNumber')
//       .populate('createdBy', 'name')
//       .lean();

//     if (!delivery) return errorResponse(res, 'Delivery not found', 404);

//     // Calculate Times (Exact Image Jaisa)
//     const formatTime = (date) => date ? new Date(date).toLocaleTimeString('en-US', {
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: true
//     }) : '—';

//     const formatDateTime = (date) => date ? new Date(date).toLocaleString('en-GB', {
//       day: '2-digit', month: 'short', year: 'numeric',
//       hour: '2-digit', minute: '2-digit', hour12: true
//     }).replace(',', '') : null;

//     const calcDuration = (start, end) => {
//       if (!start || !end) return 'In Progress';
//       const diff = new Date(end) - new Date(start);
//       const h = Math.floor(diff / (1000 * 60 * 60));
//       const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
//       return h > 0 ? `${h}h ${m}m` : `${m} min`;
//     };

//     // Waiting Time: picked_up → out_for_delivery
//     let waitingTime = '—';
//     if (delivery.actualPickupTime) {
//       const history = await DeliveryStatusHistory.find({ deliveryId })
//         .sort({ timestamp: 1 })
//         .select('status timestamp');

//       const pickedUpTime = delivery.actualPickupTime;
//       const outForDeliveryTime = history.find(h => h.status === 'out_for_delivery')?.timestamp;

//       if (outForDeliveryTime) {
//         waitingTime = calcDuration(pickedUpTime, outForDeliveryTime);
//       } else if (['out_for_delivery', 'delivered'].includes(delivery.status)) {
//         waitingTime = '0 min';
//       } else {
//         waitingTime = 'In Progress';
//       }
//     }

//     const journeyDetails = {
//       started: delivery.actualPickupTime ? formatTime(delivery.actualPickupTime) : 'Not Started',
//       ended: delivery.actualDeliveryTime ? formatTime(delivery.actualDeliveryTime) : 'Not Ended',
//       waitingTime: waitingTime,
//       timeTaken: delivery.actualPickupTime && delivery.actualDeliveryTime
//         ? calcDuration(delivery.actualPickupTime, delivery.actualDeliveryTime)
//         : (delivery.actualPickupTime ? 'In Progress' : 'Not Started'),
//       totalDistance: delivery.distance > 0 ? `${delivery.distance.toFixed(1)} km` : 'Calculating...'
//     };

//     const response = {
//       id: delivery._id.toString(),
//       trackingNumber: delivery.trackingNumber,
//       orderId: delivery.orderId,
//       status: delivery.status,
//       priority: delivery.priority,
//       journey: journeyDetails,
//       customer: {
//         name: delivery.customerId?.companyName || delivery.customerId?.name || 'Unknown',
//         phone: delivery.customerId?.phone || delivery.deliveryLocation.contactPhone
//       },
//       pickup: {
//         address: delivery.pickupLocation.address.split(',')[0],
//         fullAddress: delivery.pickupLocation.address,
//         contact: delivery.pickupLocation.contactPerson || 'N/A',
//         phone: delivery.pickupLocation.contactPhone || 'N/A'
//       },
//       delivery: {
//         address: delivery.deliveryLocation.address.split(',')[0],
//         fullAddress: delivery.deliveryLocation.address,
//         contact: delivery.deliveryLocation.contactPerson,
//         phone: delivery.deliveryLocation.contactPhone
//       },
//       package: {
//         description: delivery.packageDetails.description || 'General Item',
//         quantity: delivery.packageDetails.quantity || 1,
//         weight: delivery.packageDetails.weight ? `${delivery.packageDetails.weight} kg` : null,
//         fragile: delivery.packageDetails.fragile
//       },
//       schedule: {
//         pickup: delivery.scheduledPickupTime ? formatDateTime(delivery.scheduledPickupTime) : null,
//         delivery: delivery.scheduledDeliveryTime ? formatDateTime(delivery.scheduledDeliveryTime) : null
//       },
//       driver: delivery.driverId ? {
//         name: delivery.driverId.name,
//         phone: delivery.driverId.phone,
//         vehicle: delivery.driverId.vehicleNumber
//       } : null,
//       proof: delivery.status === 'delivered' ? {
//         receiverName: delivery.deliveryProof.receiverName,
//         photos: delivery.deliveryProof.photos || [],
//         signature: delivery.deliveryProof.signature || null,
//         otpVerified: delivery.deliveryProof.otpVerified
//       } : null,
//       instructions: delivery.instructions || null,
//       createdAt: formatDateTime(delivery.createdAt)
//     };

//     return successResponse(res, 'Delivery details fetched', response);

//   } catch (error) {
//     console.error('Error:', error);
//     return errorResponse(res, 'Server error', 500);
//   }
// };


const Delivery = require('../../models/Delivery');
const Route = require('../../models/Route');
const Driver = require('../../models/Driver');
const DeliveryStatusHistory = require('../../models/DeliveryStatusHistory');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { generateOTP } = require('../../utils/otpHelper');
const { sendSMS } = require('../../utils/smsHelper');
const Remark = require('../../models/Remark');
const { sortByProximity } = require('../../utils/geoHelper');

// Statuses jo "upcoming" maane jaate hain
const UPCOMING_STATUSES = ['Pending_acceptance', 'Assigned', 'Picked_up', 'In_transit', 'Out_for_delivery', 'Arrived', 'assigned', "Proof_uploaded"];
const COMPLETED_STATUSES = ['Delivered', 'Failed', 'Cancelled', "Completed"];
// In statuses me driver already package uthake nikal chuka hota hai — uske
// liye reference point apna destination hoga, warna pickup point hoga.
const EN_ROUTE_TO_DESTINATION_STATUSES = ['Picked_up', 'In_transit', 'Out_for_delivery', 'Arrived', 'Proof_uploaded'];

// ================================================================
// REUSABLE HELPER — same logic REST endpoint (getDriverDeliveries) aur
// socket handler (driver:location event) dono use karte hain, taaki jaise
// hi driver ki location update ho, socket se turant naya sorted list bhi
// push kiya ja sake — REST call ka wait nahi karna padta.
// ================================================================
exports.getSortedUpcomingForDriver = async (driverId) => {
  const driverDoc = await Driver.findById(driverId).select('currentLocation');
  const driverLocation = (driverDoc?.currentLocation?.latitude && driverDoc?.currentLocation?.longitude)
    ? { latitude: driverDoc.currentLocation.latitude, longitude: driverDoc.currentLocation.longitude }
    : null;

  const deliveries = await Delivery.find({ driverId })
    .populate('customerId', 'name phone companyName')
    .populate('remarks', 'remarkText category severity color createdAt')
    .select(
      'trackingNumber status priority pickupLocation deliveryLocation scheduledDeliveryTime actualDeliveryTime packageDetails distance routeGroupId routeSequence'
    )
    .sort({ scheduledDeliveryTime: 1 })
    .lean();

  const upcomingRaw = deliveries.filter(d => UPCOMING_STATUSES.includes(d.status));
  const completedRaw = deliveries.filter(d => COMPLETED_STATUSES.includes(d.status));

  let orderedUpcoming = upcomingRaw;

  if (driverLocation && upcomingRaw.length > 1) {
    const getCoords = (d) => {
      const loc = EN_ROUTE_TO_DESTINATION_STATUSES.includes(d.status) ? d.deliveryLocation : d.pickupLocation;
      return (loc?.coordinates?.latitude && loc?.coordinates?.longitude)
        ? { latitude: loc.coordinates.latitude, longitude: loc.coordinates.longitude }
        : null;
    };

    const ranked = await sortByProximity(driverLocation, upcomingRaw, getCoords);
    orderedUpcoming = ranked.map(r => ({
      ...r.item,
      __distanceKm: r.distanceKm,
      __etaMin: r.durationMin,
      __distanceSource: r.source
    }));
  }

  const buildItem = (d, idx) => ({
    id: d._id.toString(),
    trackingNumber: d.trackingNumber,
    companyName: d.customerId?.companyName || d.customerId?.name || 'Unknown Customer',
    status: d.status,
    priority: d.priority,
    time: d.scheduledDeliveryTime
      ? new Date(d.scheduledDeliveryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(' ', '')
      : 'Not Scheduled',
    date: d.scheduledDeliveryTime
      ? new Date(d.scheduledDeliveryTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(' ', ' ')
      : null,
    deliveryAddress: d.deliveryLocation.address.split(',')[0] || d.deliveryLocation.address,
    pickupAddress: d.pickupLocation.address.split(',')[0] || d.pickupLocation.address,
    distance: d.distance ? `${d.distance.toFixed(1)} km` : 'N/A',
    nearestRank: idx !== undefined ? idx + 1 : null,
    distanceFromDriver: (d.__distanceKm !== undefined && d.__distanceKm !== Infinity) ? `${d.__distanceKm.toFixed(1)} km` : null,
    etaFromDriver: d.__etaMin ? `${d.__etaMin} min` : null,
    packageInfo: d.packageDetails.description ? `${d.packageDetails.quantity || 1}x ${d.packageDetails.description}` : 'Package',
    remarks: d.remarks?.length > 0
      ? d.remarks.map(r => ({
        text: r.remarkText, category: r.category, severity: r.severity, color: r.color || '#666',
        time: new Date(r.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      }))
      : []
  });

  return {
    upcoming: orderedUpcoming.map((d, idx) => buildItem(d, idx)),
    completed: completedRaw.map(d => buildItem(d)),
    sortedByProximity: !!driverLocation
  };
};


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

    console.log('\n========== [DELIVERY-LIST] START ==========');
    console.log('[DELIVERY-LIST] driverId (from token):', driver._id.toString());

    const result = await exports.getSortedUpcomingForDriver(driver._id);

    console.log('[DELIVERY-LIST] sortedByProximity:', result.sortedByProximity);
    console.log('[DELIVERY-LIST] upcoming count:', result.upcoming.length, '| completed count:', result.completed.length);
    result.upcoming.forEach(u => {
      console.log(`  #${u.nearestRank} → ${u.trackingNumber} | distanceFromDriver: ${u.distanceFromDriver}`);
    });
    console.log('========== [DELIVERY-LIST] END ==========\n');

    return successResponse(res, 'Deliveries fetched successfully', {
      upcoming: result.upcoming,
      completed: result.completed,
      counts: {
        upcoming: result.upcoming.length,
        completed: result.completed.length
      },
      sortedByProximity: result.sortedByProximity
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