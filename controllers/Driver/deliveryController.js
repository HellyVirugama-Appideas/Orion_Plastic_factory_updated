// // console.log('🔥🔥🔥 [FILE-LOAD-CHECK] deliveryController.js LOADED at:', new Date().toISOString());

// // const Delivery = require('../../models/Delivery');
// // const Route = require('../../models/Route');
// // const Driver = require('../../models/Driver');
// // const DeliveryStatusHistory = require('../../models/DeliveryStatusHistory');
// // const { successResponse, errorResponse } = require('../../utils/responseHelper');
// // const { generateOTP } = require('../../utils/otpHelper');
// // const { sendSMS } = require('../../utils/smsHelper');
// // const Remark = require('../../models/Remark');
// // const { getGoogleDistanceMatrix, calculateDistance, geocodeAddress } = require('../../utils/geoHelper');

// // // Statuses jo "upcoming" maane jaate hain
// // const UPCOMING_STATUSES = ['Pending_acceptance', 'Assigned', 'Picked_up', 'In_transit', 'Out_for_delivery', 'Arrived', 'assigned', "Proof_uploaded"];
// // const COMPLETED_STATUSES = ['Delivered', 'Failed', 'Cancelled', "Completed"];

// // // ✅ Priority tiers — number jitna chhota, priority utni upar
// // const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

// // // ================================================================
// // // ✅ ROOT-CAUSE FIX: proximity ranking ke liye reference point HAMESHA
// // // deliveryLocation (destination) hona chahiye — pickupLocation nahi.
// // // Wajah: agar sab deliveries ka pickup EK HI factory hai (jaisa aksar
// // // hota hai), to pickupLocation se ranking karne par sab "same distance"
// // // (factory se factory = 0 km) dikhengi — jo bilkul galat/useless hai.
// // // Driver ke liye jo maayne rakhta hai woh hai "yeh delivery kis jagah
// // // JAANI hai" (deliveryLocation), na ki "kahan se uthani hai".
// // // ================================================================
// // function getRankingCoords(d) {
// //   const loc = d.deliveryLocation;
// //   return (loc?.coordinates?.latitude && loc?.coordinates?.longitude)
// //     ? { latitude: loc.coordinates.latitude, longitude: loc.coordinates.longitude }
// //     : null;
// // }

// // // ================================================================
// // // Helper: given a starting point and a pool of deliveries, find the
// // // SINGLE nearest one (Google Distance Matrix, Haversine fallback).
// // // Missing/invalid coordinates → distanceKm: Infinity (never crashes,
// // // bas end me chala jaata hai, aur reason console me clearly log hota hai).
// // // ================================================================
// // async function findNearestFromPool(currentPoint, pool, getCoords) {
// //   const withCoords = pool.map(d => ({ delivery: d, coords: getCoords(d) }));
// //   const validEntries = withCoords.filter(e => e.coords);
// //   const invalidEntries = withCoords.filter(e => !e.coords);

// //   if (invalidEntries.length > 0) {
// //     invalidEntries.forEach(e => {
// //       console.warn(
// //         `[PROXIMITY] ⚠️ Coordinates missing for ${e.delivery.trackingNumber} | status: ${e.delivery.status} | ` +
// //         `deliveryLocation.coords: ${JSON.stringify(e.delivery.deliveryLocation?.coordinates || null)}`
// //       );
// //     });
// //   }

// //   if (validEntries.length === 0) {
// //     const chosen = pool[0];
// //     return { chosen, distanceKm: Infinity, durationMin: null, source: 'none' };
// //   }

// //   const destinations = validEntries.map(e => e.coords);

// //   let googleDistances = null;
// //   try {
// //     googleDistances = await getGoogleDistanceMatrix(currentPoint, destinations);
// //   } catch (e) {
// //     googleDistances = null;
// //   }

// //   // Har entry ke liye final distance nikaalo — Google se milta hai toh
// //   // wahi use karo, warna SIRF us specific point ke liye Haversine
// //   // fallback karo (poore result ko Infinity mat bana do).
// //   const distances = validEntries.map((e, idx) => {
// //     const g = googleDistances?.[idx];
// //     if (g && g.distanceKm !== null && g.distanceKm !== undefined) {
// //       return { distanceKm: g.distanceKm, durationMin: g.durationMin ?? null, source: 'google' };
// //     }
// //     const distanceKm = calculateDistance(
// //       currentPoint.latitude, currentPoint.longitude,
// //       e.coords.latitude, e.coords.longitude
// //     );
// //     return { distanceKm, durationMin: null, source: 'haversine' };
// //   });

// //   let nearestIdxInValid = 0;
// //   let nearestDist = distances[0].distanceKm;
// //   let nearestDuration = distances[0].durationMin;
// //   let source = distances[0].source;

// //   distances.forEach((d, idx) => {
// //     if (d.distanceKm < nearestDist) {
// //       nearestDist = d.distanceKm;
// //       nearestDuration = d.durationMin;
// //       nearestIdxInValid = idx;
// //       source = d.source;
// //     }
// //   });

// //   const chosen = validEntries[nearestIdxInValid].delivery;
// //   return { chosen, distanceKm: nearestDist, durationMin: nearestDuration, source };
// // }

// // // ================================================================
// // // REUSABLE HELPER — same logic REST endpoint (getDriverDeliveries) aur
// // // socket handler (driver:location event) dono use karte hain.
// // //
// // // ✅ SORTING RULE (priority + distance dono):
// // // 1) Pehle priority tier ke hisaab se group hota hai: urgent → high →
// // //    medium → low. Ek tier jab tak khatam na ho, agli tier shuru nahi
// // //    hoti.
// // // 2) HAR TIER KE ANDAR chained nearest-neighbor chalta hai — HAMESHA
// // //    deliveryLocation (destination) coordinates use karke, kyunki
// // //    pickupLocation sabke liye same factory ho sakta hai.
// // // ================================================================
// // exports.getSortedUpcomingForDriver = async (driverId) => {
// //   const driverDoc = await Driver.findById(driverId).select('currentLocation');
// //   const driverLocation = (driverDoc?.currentLocation?.latitude && driverDoc?.currentLocation?.longitude)
// //     ? { latitude: driverDoc.currentLocation.latitude, longitude: driverDoc.currentLocation.longitude }
// //     : null;

// //   const deliveries = await Delivery.find({ driverId })
// //     .populate('customerId', 'name phone companyName')
// //     .populate('remarks', 'remarkText category severity color createdAt')
// //     .select(
// //       'trackingNumber status priority pickupLocation deliveryLocation scheduledDeliveryTime actualDeliveryTime packageDetails distance routeGroupId routeSequence'
// //     )
// //     .sort({ scheduledDeliveryTime: 1 })
// //     .lean();

// //   const upcomingRaw = deliveries.filter(d => UPCOMING_STATUSES.includes(d.status));
// //   const completedRaw = deliveries.filter(d => COMPLETED_STATUSES.includes(d.status));

// //   // ── Coordinates-repair pass: agar deliveryLocation ke coordinates
// //   // missing/invalid hain, address se turant geocode karke fill karo,
// //   // DB me bhi save karo (agli baar fast/cached ho). ──
// //   for (const d of upcomingRaw) {
// //     const loc = d.deliveryLocation;
// //     const hasValidCoords = loc?.coordinates?.latitude && loc?.coordinates?.longitude;

// //     if (!hasValidCoords) {
// //       if (loc?.address) {
// //         console.warn(`[PROXIMITY] ${d.trackingNumber} — deliveryLocation.coordinates missing, attempting live geocode from address: "${loc.address}"`);

// //         const geocoded = await geocodeAddress(loc.address);

// //         if (geocoded) {
// //           d.deliveryLocation = {
// //             ...loc,
// //             coordinates: { latitude: geocoded.latitude, longitude: geocoded.longitude }
// //           };

// //           try {
// //             await Delivery.findByIdAndUpdate(d._id, {
// //               'deliveryLocation.coordinates.latitude': geocoded.latitude,
// //               'deliveryLocation.coordinates.longitude': geocoded.longitude
// //             });
// //             console.log(`[PROXIMITY] ✅ ${d.trackingNumber} — coordinates repaired & saved: ${geocoded.latitude}, ${geocoded.longitude}`);
// //           } catch (saveErr) {
// //             console.error(`[PROXIMITY] Failed to save repaired coordinates for ${d.trackingNumber}: ${saveErr.message}`);
// //           }
// //         } else {
// //           console.error(`[PROXIMITY] ❌ ${d.trackingNumber} — geocode bhi fail ho gaya, ye delivery distance-unknown rahegi`);
// //         }
// //       } else {
// //         console.error(`[PROXIMITY] ❌❌ ${d.trackingNumber} — deliveryLocation me address AUR coordinates DONO missing hain! Raw: ${JSON.stringify(loc)}`);
// //       }
// //     } else {
// //       console.log(`[PROXIMITY] ✓ ${d.trackingNumber} — deliveryLocation coordinates valid: ${loc.coordinates.latitude}, ${loc.coordinates.longitude}`);
// //     }
// //   }

// //   let orderedUpcoming = upcomingRaw;

// //   if (driverLocation && upcomingRaw.length > 1) {
// //     // ── Step 1: priority ke hisaab se tiers banao ──
// //     const tiers = {};
// //     upcomingRaw.forEach(d => {
// //       const p = (d.priority || 'medium').toLowerCase();
// //       const tierKey = PRIORITY_ORDER.hasOwnProperty(p) ? p : 'medium';
// //       if (!tiers[tierKey]) tiers[tierKey] = [];
// //       tiers[tierKey].push(d);
// //     });

// //     const tierKeysInOrder = Object.keys(PRIORITY_ORDER)
// //       .sort((a, b) => PRIORITY_ORDER[a] - PRIORITY_ORDER[b])
// //       .filter(k => tiers[k]?.length > 0);

// //     console.log(`[PROXIMITY] Priority tiers found: ${tierKeysInOrder.map(k => `${k}(${tiers[k].length})`).join(', ')}`);

// //     // ── Step 2: har tier ke andar chained nearest-neighbor ──
// //     const chainResult = [];
// //     let currentPoint = driverLocation;

// //     for (const tierKey of tierKeysInOrder) {
// //       let remaining = [...tiers[tierKey]];
// //       console.log(`[PROXIMITY] Processing tier "${tierKey}" — ${remaining.length} delivery(ies)`);

// //       while (remaining.length > 0) {
// //         const result = await findNearestFromPool(currentPoint, remaining, getRankingCoords);

// //         console.log(`[PROXIMITY-CHAIN] currentPoint: ${JSON.stringify(currentPoint)} | chosen: ${result.chosen.trackingNumber} | destination: ${result.chosen.deliveryLocation?.address} | distanceKm: ${result.distanceKm} | source: ${result.source}`);

// //         chainResult.push({
// //           item: result.chosen,
// //           distanceKm: result.distanceKm,
// //           durationMin: result.durationMin,
// //           source: result.source,
// //           tier: tierKey
// //         });

// //         // ✅ Ab agla comparison is CHOSEN delivery ki DESTINATION se hoga
// //         // (driver wahan pahunchega, phir agli sabse nazdik delivery dhoondhega)
// //         const chosenCoords = getRankingCoords(result.chosen);
// //         if (chosenCoords) {
// //           currentPoint = chosenCoords;
// //         } else {
// //           console.warn(`[PROXIMITY-CHAIN] ⚠️ ${result.chosen.trackingNumber} ke coordinates null aaye — currentPoint update nahi hua`);
// //         }

// //         const removeIdx = remaining.findIndex(d => d._id.toString() === result.chosen._id.toString());
// //         if (removeIdx > -1) remaining.splice(removeIdx, 1);
// //       }
// //     }

// //     orderedUpcoming = chainResult.map(r => ({
// //       ...r.item,
// //       __distanceKm: r.distanceKm,
// //       __etaMin: r.durationMin,
// //       __distanceSource: r.source,
// //       __tier: r.tier
// //     }));
// //   }

// //   // ================================================================
// //   // APP-COMPATIBILITY: App ki UI "item.distance" field render karti hai.
// //   // Hum "distance" field ke andar hi naya proximity-distance daal dete
// //   // hain — app bina code-change ke sahi (driver-se) distance dikhati hai.
// //   // ================================================================
// //   const buildItem = (d, idx) => {
// //     const hasProximityDistance = d.__distanceKm !== undefined && d.__distanceKm !== Infinity;

// //     return {
// //       id: d._id.toString(),
// //       trackingNumber: d.trackingNumber,
// //       companyName: d.customerId?.companyName || d.customerId?.name || 'Unknown Customer',
// //       status: d.status,
// //       priority: d.priority,
// //       time: d.scheduledDeliveryTime
// //         ? new Date(d.scheduledDeliveryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(' ', '')
// //         : 'Not Scheduled',
// //       date: d.scheduledDeliveryTime
// //         ? new Date(d.scheduledDeliveryTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(' ', ' ')
// //         : null,
// //       deliveryAddress: d.deliveryLocation.address.split(',')[0] || d.deliveryLocation.address,
// //       pickupAddress: d.pickupLocation.address.split(',')[0] || d.pickupLocation.address,
// //       distance: hasProximityDistance
// //         ? `${d.__distanceKm.toFixed(1)} km`
// //         : (d.distance ? `${d.distance.toFixed(1)} km` : 'N/A'),
// //       nearestRank: idx !== undefined ? idx + 1 : null,
// //       distanceFromDriver: hasProximityDistance ? `${d.__distanceKm.toFixed(1)} km` : null,
// //       etaFromDriver: d.__etaMin ? `${d.__etaMin} min` : null,
// //       packageInfo: d.packageDetails.description ? `${d.packageDetails.quantity || 1}x ${d.packageDetails.description}` : 'Package',
// //       remarks: d.remarks?.length > 0
// //         ? d.remarks.map(r => ({
// //           text: r.remarkText, category: r.category, severity: r.severity, color: r.color || '#666',
// //           time: new Date(r.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
// //         }))
// //         : []
// //     };
// //   };

// //   return {
// //     upcoming: orderedUpcoming.map((d, idx) => buildItem(d, idx)),
// //     completed: completedRaw.map(d => buildItem(d)),
// //     sortedByProximity: !!driverLocation
// //   };
// // };

// // // ================================================================
// // // GET Driver Deliveries - Upcoming & Completed (REST endpoint)
// // // ================================================================
// // exports.getDriverDeliveries = async (req, res) => {
// //   try {
// //     const driver = req.user;

// //     if (!driver || driver.role !== 'driver') {
// //       return errorResponse(res, 'Unauthorized', 401);
// //     }

// //     console.log('\n========== [DELIVERY-LIST] START ==========');
// //     console.log('[DELIVERY-LIST] driverId (from token):', driver._id.toString());

// //     const result = await exports.getSortedUpcomingForDriver(driver._id);

// //     console.log('[DELIVERY-LIST] sortedByProximity:', result.sortedByProximity);
// //     console.log('[DELIVERY-LIST] upcoming count:', result.upcoming.length, '| completed count:', result.completed.length);
// //     result.upcoming.forEach(u => {
// //       console.log(`  #${u.nearestRank} → ${u.trackingNumber} | priority: ${u.priority} | distance (shown in app): ${u.distance} | distanceFromDriver: ${u.distanceFromDriver}`);
// //     });
// //     console.log('========== [DELIVERY-LIST] END ==========\n');

// //     return successResponse(res, 'Deliveries fetched successfully', {
// //       upcoming: result.upcoming,
// //       completed: result.completed,
// //       counts: {
// //         upcoming: result.upcoming.length,
// //         completed: result.completed.length
// //       },
// //       sortedByProximity: result.sortedByProximity
// //     });

// //   } catch (error) {
// //     console.error('Get Driver Deliveries Error:', error);
// //     return errorResponse(res, 'Failed to load deliveries', 500);
// //   }
// // };

// // // ================================================================
// // // GET /driver/delivery/:deliveryId/details
// // // ================================================================
// // exports.getDeliveryDetails = async (req, res) => {
// //   try {
// //     const { deliveryId } = req.params;
// //     const user = req.user;

// //     const delivery = await Delivery.findById(deliveryId)
// //       .populate('customerId', 'name phone companyName')
// //       .populate('driverId', 'name phone vehicleNumber')
// //       .populate('createdBy', 'name')
// //       .lean();

// //     if (!delivery) return errorResponse(res, 'Delivery not found', 404);

// //     // ── Effective pickup nikaalo (list ki proximity-ranking se) ──
// //     let effectivePickupLocation = delivery.pickupLocation;

// //     if (delivery.driverId) {
// //       try {
// //         const driverIdForSort = delivery.driverId._id || delivery.driverId;
// //         const sorted = await exports.getSortedUpcomingForDriver(driverIdForSort);
// //         const myIndex = sorted.upcoming.findIndex(u => u.id === delivery._id.toString());

// //         console.log(`[DELIVERY-DETAILS] deliveryId: ${deliveryId} | myRank: ${myIndex >= 0 ? myIndex + 1 : 'not in upcoming list'} of ${sorted.upcoming.length}`);

// //         if (myIndex > 0) {
// //           const previousItem = sorted.upcoming[myIndex - 1];
// //           const previousDeliveryDoc = await Delivery.findById(previousItem.id)
// //             .select('deliveryLocation trackingNumber')
// //             .lean();

// //           if (previousDeliveryDoc?.deliveryLocation?.coordinates?.latitude) {
// //             effectivePickupLocation = previousDeliveryDoc.deliveryLocation;
// //             console.log(`[DELIVERY-DETAILS] ✅ Pickup overridden — using "${previousDeliveryDoc.trackingNumber}" destination as pickup: ${previousDeliveryDoc.deliveryLocation.address}`);
// //           }
// //         } else if (myIndex === 0) {
// //           console.log('[DELIVERY-DETAILS] Yeh delivery hi rank #1 (sabse nazdik) hai — original pickupLocation use hoga');
// //         }
// //       } catch (sortErr) {
// //         console.error('[DELIVERY-DETAILS] Proximity pickup resolution failed (non-fatal):', sortErr.message);
// //       }
// //     }

// //     delivery.pickupLocation = effectivePickupLocation;

// //     // Calculate Times (Exact Image Jaisa)
// //     const formatTime = (date) => date ? new Date(date).toLocaleTimeString('en-US', {
// //       hour: '2-digit',
// //       minute: '2-digit',
// //       hour12: true
// //     }) : '—';

// //     const formatDateTime = (date) => date ? new Date(date).toLocaleString('en-GB', {
// //       day: '2-digit', month: 'short', year: 'numeric',
// //       hour: '2-digit', minute: '2-digit', hour12: true
// //     }).replace(',', '') : null;

// //     const calcDuration = (start, end) => {
// //       if (!start || !end) return 'In Progress';
// //       const diff = new Date(end) - new Date(start);
// //       const h = Math.floor(diff / (1000 * 60 * 60));
// //       const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
// //       return h > 0 ? `${h}h ${m}m` : `${m} min`;
// //     };

// //     // Waiting Time: picked_up → out_for_delivery
// //     let waitingTime = '—';
// //     if (delivery.actualPickupTime) {
// //       const history = await DeliveryStatusHistory.find({ deliveryId })
// //         .sort({ timestamp: 1 })
// //         .select('status timestamp');

// //       const pickedUpTime = delivery.actualPickupTime;
// //       const outForDeliveryTime = history.find(h => h.status === 'out_for_delivery')?.timestamp;

// //       if (outForDeliveryTime) {
// //         waitingTime = calcDuration(pickedUpTime, outForDeliveryTime);
// //       } else if (['out_for_delivery', 'delivered'].includes(delivery.status)) {
// //         waitingTime = '0 min';
// //       } else {
// //         waitingTime = 'In Progress';
// //       }
// //     }

// //     const journeyDetails = {
// //       started: delivery.actualPickupTime ? formatTime(delivery.actualPickupTime) : 'Not Started',
// //       ended: delivery.actualDeliveryTime ? formatTime(delivery.actualDeliveryTime) : 'Not Ended',
// //       waitingTime: waitingTime,
// //       timeTaken: delivery.actualPickupTime && delivery.actualDeliveryTime
// //         ? calcDuration(delivery.actualPickupTime, delivery.actualDeliveryTime)
// //         : (delivery.actualPickupTime ? 'In Progress' : 'Not Started'),
// //       totalDistance: delivery.distance > 0 ? `${delivery.distance.toFixed(1)} km` : 'Calculating...'
// //     };

// //     const response = {
// //       id: delivery._id.toString(),
// //       trackingNumber: delivery.trackingNumber,
// //       orderId: delivery.orderId,
// //       status: delivery.status,
// //       priority: delivery.priority,
// //       journey: journeyDetails,
// //       customer: {
// //         name: delivery.customerId?.companyName || delivery.customerId?.name || 'Unknown',
// //         phone: delivery.customerId?.phone || delivery.deliveryLocation.contactPhone
// //       },
// //       pickup: {
// //         address: delivery.pickupLocation.address.split(',')[0],
// //         fullAddress: delivery.pickupLocation.address,
// //         contact: delivery.pickupLocation.contactPerson || 'N/A',
// //         phone: delivery.pickupLocation.contactPhone || 'N/A'
// //       },
// //       delivery: {
// //         address: delivery.deliveryLocation.address.split(',')[0],
// //         fullAddress: delivery.deliveryLocation.address,
// //         contact: delivery.deliveryLocation.contactPerson,
// //         phone: delivery.deliveryLocation.contactPhone
// //       },
// //       package: {
// //         description: delivery.packageDetails.description || 'General Item',
// //         quantity: delivery.packageDetails.quantity || 1,
// //         weight: delivery.packageDetails.weight ? `${delivery.packageDetails.weight} kg` : null,
// //         fragile: delivery.packageDetails.fragile
// //       },
// //       schedule: {
// //         pickup: delivery.scheduledPickupTime ? formatDateTime(delivery.scheduledPickupTime) : null,
// //         delivery: delivery.scheduledDeliveryTime ? formatDateTime(delivery.scheduledDeliveryTime) : null
// //       },
// //       driver: delivery.driverId ? {
// //         name: delivery.driverId.name,
// //         phone: delivery.driverId.phone,
// //         vehicle: delivery.driverId.vehicleNumber
// //       } : null,
// //       proof: delivery.status === 'delivered' ? {
// //         receiverName: delivery.deliveryProof.receiverName,
// //         photos: delivery.deliveryProof.photos || [],
// //         signature: delivery.deliveryProof.signature || null,
// //         otpVerified: delivery.deliveryProof.otpVerified
// //       } : null,
// //       instructions: delivery.instructions || null,
// //       createdAt: formatDateTime(delivery.createdAt)
// //     };

// //     return successResponse(res, 'Delivery details fetched', response);

// //   } catch (error) {
// //     console.error('Error:', error);
// //     return errorResponse(res, 'Server error', 500);
// //   }
// // };

// console.log('🔥🔥🔥 [FILE-LOAD-CHECK] deliveryController.js LOADED at:', new Date().toISOString());

// const Delivery = require('../../models/Delivery');
// const Route = require('../../models/Route');
// const Driver = require('../../models/Driver');
// const DeliveryStatusHistory = require('../../models/DeliveryStatusHistory');
// const { successResponse, errorResponse } = require('../../utils/responseHelper');
// const { generateOTP } = require('../../utils/otpHelper');
// const { sendSMS } = require('../../utils/smsHelper');
// const Remark = require('../../models/Remark');
// const { getGoogleDistanceMatrix, calculateDistance, geocodeAddress } = require('../../utils/geoHelper');
// const { PickupLocation } = require('../../models/Order'); // ✅ NAYA: fallback default start point ke liye

// // Statuses jo "upcoming" maane jaate hain
// const UPCOMING_STATUSES = ['Pending_acceptance', 'Assigned', 'Picked_up', 'In_transit', 'Out_for_delivery', 'Arrived', 'assigned', "Proof_uploaded"];
// const COMPLETED_STATUSES = ['Delivered', 'Failed', 'Cancelled', "Completed"];

// // ✅ Priority tiers — number jitna chhota, priority utni upar
// const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

// // ================================================================
// // ✅ ROOT-CAUSE FIX: proximity ranking ke liye reference point HAMESHA
// // deliveryLocation (destination) hona chahiye — pickupLocation nahi.
// // Wajah: agar sab deliveries ka pickup EK HI factory hai (jaisa aksar
// // hota hai), to pickupLocation se ranking karne par sab "same distance"
// // (factory se factory = 0 km) dikhengi — jo bilkul galat/useless hai.
// // Driver ke liye jo maayne rakhta hai woh hai "yeh delivery kis jagah
// // JAANI hai" (deliveryLocation), na ki "kahan se uthani hai".
// // ================================================================
// function getRankingCoords(d) {
//   const loc = d.deliveryLocation;
//   return (loc?.coordinates?.latitude && loc?.coordinates?.longitude)
//     ? { latitude: loc.coordinates.latitude, longitude: loc.coordinates.longitude }
//     : null;
// }

// // ================================================================
// // ✅ NAYA: Agar driver ki live GPS location DB me abhi nahi hai
// // (jaise bulk-assign ke turant baad, driver ke pehla ping bhejne se
// // pehle), to bhi proximity-chaining chalu rahe — default warehouse
// // (isDefault: true wali PickupLocation, ya koi bhi active pickup)
// // ko starting point maan lete hain.
// // ================================================================
// async function getDefaultStartPoint() {
//   try {
//     const defaultPickup = await PickupLocation.findOne({ isDefault: true, isActive: true });
//     if (defaultPickup?.coordinates?.latitude && defaultPickup?.coordinates?.longitude) {
//       return {
//         latitude: defaultPickup.coordinates.latitude,
//         longitude: defaultPickup.coordinates.longitude
//       };
//     }
//     const anyPickup = await PickupLocation.findOne({ isActive: true }).sort({ createdAt: 1 });
//     if (anyPickup?.coordinates?.latitude && anyPickup?.coordinates?.longitude) {
//       return {
//         latitude: anyPickup.coordinates.latitude,
//         longitude: anyPickup.coordinates.longitude
//       };
//     }
//   } catch (err) {
//     console.error('[PROXIMITY] getDefaultStartPoint error:', err.message);
//   }
//   return null;
// }

// // ================================================================
// // Helper: given a starting point and a pool of deliveries, find the
// // SINGLE nearest one (Google Distance Matrix, Haversine fallback).
// // Missing/invalid coordinates → distanceKm: Infinity (never crashes,
// // bas end me chala jaata hai, aur reason console me clearly log hota hai).
// // ================================================================
// async function findNearestFromPool(currentPoint, pool, getCoords) {
//   const withCoords = pool.map(d => ({ delivery: d, coords: getCoords(d) }));
//   const validEntries = withCoords.filter(e => e.coords);
//   const invalidEntries = withCoords.filter(e => !e.coords);

//   if (invalidEntries.length > 0) {
//     invalidEntries.forEach(e => {
//       console.warn(
//         `[PROXIMITY] ⚠️ Coordinates missing for ${e.delivery.trackingNumber} | status: ${e.delivery.status} | ` +
//         `deliveryLocation.coords: ${JSON.stringify(e.delivery.deliveryLocation?.coordinates || null)}`
//       );
//     });
//   }

//   if (validEntries.length === 0) {
//     const chosen = pool[0];
//     return { chosen, distanceKm: Infinity, durationMin: null, source: 'none' };
//   }

//   const destinations = validEntries.map(e => e.coords);

//   let googleDistances = null;
//   try {
//     googleDistances = await getGoogleDistanceMatrix(currentPoint, destinations);
//   } catch (e) {
//     googleDistances = null;
//   }

//   // Har entry ke liye final distance nikaalo — Google se milta hai toh
//   // wahi use karo, warna SIRF us specific point ke liye Haversine
//   // fallback karo (poore result ko Infinity mat bana do).
//   const distances = validEntries.map((e, idx) => {
//     const g = googleDistances?.[idx];
//     if (g && g.distanceKm !== null && g.distanceKm !== undefined) {
//       return { distanceKm: g.distanceKm, durationMin: g.durationMin ?? null, source: 'google' };
//     }
//     const distanceKm = calculateDistance(
//       currentPoint.latitude, currentPoint.longitude,
//       e.coords.latitude, e.coords.longitude
//     );
//     return { distanceKm, durationMin: null, source: 'haversine' };
//   });

//   let nearestIdxInValid = 0;
//   let nearestDist = distances[0].distanceKm;
//   let nearestDuration = distances[0].durationMin;
//   let source = distances[0].source;

//   distances.forEach((d, idx) => {
//     if (d.distanceKm < nearestDist) {
//       nearestDist = d.distanceKm;
//       nearestDuration = d.durationMin;
//       nearestIdxInValid = idx;
//       source = d.source;
//     }
//   });

//   const chosen = validEntries[nearestIdxInValid].delivery;
//   return { chosen, distanceKm: nearestDist, durationMin: nearestDuration, source };
// }

// // ================================================================
// // REUSABLE HELPER — same logic REST endpoint (getDriverDeliveries) aur
// // socket handler (driver:location event) dono use karte hain.
// //
// // ✅ SORTING RULE (priority + distance dono):
// // 1) Pehle priority tier ke hisaab se group hota hai: urgent → high →
// //    medium → low. Ek tier jab tak khatam na ho, agli tier shuru nahi
// //    hoti.
// // 2) HAR TIER KE ANDAR chained nearest-neighbor chalta hai — HAMESHA
// //    deliveryLocation (destination) coordinates use karke, kyunki
// //    pickupLocation sabke liye same factory ho sakta hai.
// // 3) ✅ Driver ki GPS na ho tab bhi (bulk-assign ke turant baad) —
// //    default warehouse ko starting point maan ke chaining chalti hai.
// // ================================================================
// exports.getSortedUpcomingForDriver = async (driverId) => {
//   const driverDoc = await Driver.findById(driverId).select('currentLocation');

//   let driverLocation = (driverDoc?.currentLocation?.latitude && driverDoc?.currentLocation?.longitude)
//     ? { latitude: driverDoc.currentLocation.latitude, longitude: driverDoc.currentLocation.longitude }
//     : null;

//   let usedFallbackStart = false;
//   if (!driverLocation) {
//     driverLocation = await getDefaultStartPoint();
//     if (driverLocation) {
//       usedFallbackStart = true;
//       console.log('[PROXIMITY] Driver ki live GPS nahi hai — default warehouse ko starting point maan rahe hain');
//     } else {
//       console.warn('[PROXIMITY] Driver ki GPS bhi nahi hai, default warehouse bhi nahi mila — proximity sorting skip hogi');
//     }
//   }

//   const deliveries = await Delivery.find({ driverId })
//     .populate('customerId', 'name phone companyName')
//     .populate('remarks', 'remarkText category severity color createdAt')
//     .select(
//       'trackingNumber status priority pickupLocation deliveryLocation scheduledDeliveryTime actualDeliveryTime packageDetails distance routeGroupId routeSequence'
//     )
//     .sort({ scheduledDeliveryTime: 1 })
//     .lean();

//   const upcomingRaw = deliveries.filter(d => UPCOMING_STATUSES.includes(d.status));
//   const completedRaw = deliveries.filter(d => COMPLETED_STATUSES.includes(d.status));

//   // ── Coordinates-repair pass: agar deliveryLocation ke coordinates
//   // missing/invalid hain, address se turant geocode karke fill karo,
//   // DB me bhi save karo (agli baar fast/cached ho). ──
//   for (const d of upcomingRaw) {
//     const loc = d.deliveryLocation;
//     const hasValidCoords = loc?.coordinates?.latitude && loc?.coordinates?.longitude;

//     if (!hasValidCoords) {
//       if (loc?.address) {
//         console.warn(`[PROXIMITY] ${d.trackingNumber} — deliveryLocation.coordinates missing, attempting live geocode from address: "${loc.address}"`);

//         const geocoded = await geocodeAddress(loc.address);

//         if (geocoded) {
//           d.deliveryLocation = {
//             ...loc,
//             coordinates: { latitude: geocoded.latitude, longitude: geocoded.longitude }
//           };

//           try {
//             await Delivery.findByIdAndUpdate(d._id, {
//               'deliveryLocation.coordinates.latitude': geocoded.latitude,
//               'deliveryLocation.coordinates.longitude': geocoded.longitude
//             });
//             console.log(`[PROXIMITY] ✅ ${d.trackingNumber} — coordinates repaired & saved: ${geocoded.latitude}, ${geocoded.longitude}`);
//           } catch (saveErr) {
//             console.error(`[PROXIMITY] Failed to save repaired coordinates for ${d.trackingNumber}: ${saveErr.message}`);
//           }
//         } else {
//           console.error(`[PROXIMITY] ❌ ${d.trackingNumber} — geocode bhi fail ho gaya, ye delivery distance-unknown rahegi`);
//         }
//       } else {
//         console.error(`[PROXIMITY] ❌❌ ${d.trackingNumber} — deliveryLocation me address AUR coordinates DONO missing hain! Raw: ${JSON.stringify(loc)}`);
//       }
//     } else {
//       console.log(`[PROXIMITY] ✓ ${d.trackingNumber} — deliveryLocation coordinates valid: ${loc.coordinates.latitude}, ${loc.coordinates.longitude}`);
//     }
//   }

//   let orderedUpcoming = upcomingRaw;

//   if (driverLocation && upcomingRaw.length > 1) {
//     // ── Step 1: priority ke hisaab se tiers banao ──
//     const tiers = {};
//     upcomingRaw.forEach(d => {
//       const p = (d.priority || 'medium').toLowerCase();
//       const tierKey = PRIORITY_ORDER.hasOwnProperty(p) ? p : 'medium';
//       if (!tiers[tierKey]) tiers[tierKey] = [];
//       tiers[tierKey].push(d);
//     });

//     const tierKeysInOrder = Object.keys(PRIORITY_ORDER)
//       .sort((a, b) => PRIORITY_ORDER[a] - PRIORITY_ORDER[b])
//       .filter(k => tiers[k]?.length > 0);

//     console.log(`[PROXIMITY] Priority tiers found: ${tierKeysInOrder.map(k => `${k}(${tiers[k].length})`).join(', ')}${usedFallbackStart ? ' (using fallback warehouse start point)' : ''}`);

//     // ── Step 2: har tier ke andar chained nearest-neighbor ──
//     const chainResult = [];
//     let currentPoint = driverLocation;

//     for (const tierKey of tierKeysInOrder) {
//       let remaining = [...tiers[tierKey]];
//       console.log(`[PROXIMITY] Processing tier "${tierKey}" — ${remaining.length} delivery(ies)`);

//       while (remaining.length > 0) {
//         const result = await findNearestFromPool(currentPoint, remaining, getRankingCoords);

//         console.log(`[PROXIMITY-CHAIN] currentPoint: ${JSON.stringify(currentPoint)} | chosen: ${result.chosen.trackingNumber} | destination: ${result.chosen.deliveryLocation?.address} | distanceKm: ${result.distanceKm} | source: ${result.source}`);

//         chainResult.push({
//           item: result.chosen,
//           distanceKm: result.distanceKm,
//           durationMin: result.durationMin,
//           source: result.source,
//           tier: tierKey
//         });

//         // ✅ Ab agla comparison is CHOSEN delivery ki DESTINATION se hoga
//         // (driver wahan pahunchega, phir agli sabse nazdik delivery dhoondhega)
//         const chosenCoords = getRankingCoords(result.chosen);
//         if (chosenCoords) {
//           currentPoint = chosenCoords;
//         } else {
//           console.warn(`[PROXIMITY-CHAIN] ⚠️ ${result.chosen.trackingNumber} ke coordinates null aaye — currentPoint update nahi hua`);
//         }

//         const removeIdx = remaining.findIndex(d => d._id.toString() === result.chosen._id.toString());
//         if (removeIdx > -1) remaining.splice(removeIdx, 1);
//       }
//     }

//     orderedUpcoming = chainResult.map(r => ({
//       ...r.item,
//       __distanceKm: r.distanceKm,
//       __etaMin: r.durationMin,
//       __distanceSource: r.source,
//       __tier: r.tier
//     }));
//   }

//   // ================================================================
//   // APP-COMPATIBILITY: App ki UI "item.distance" field render karti hai.
//   // Hum "distance" field ke andar hi naya proximity-distance daal dete
//   // hain — app bina code-change ke sahi (driver-se) distance dikhati hai.
//   // ================================================================
//   const buildItem = (d, idx) => {
//     const hasProximityDistance = d.__distanceKm !== undefined && d.__distanceKm !== Infinity;

//     return {
//       id: d._id.toString(),
//       trackingNumber: d.trackingNumber,
//       companyName: d.customerId?.companyName || d.customerId?.name || 'Unknown Customer',
//       status: d.status,
//       priority: d.priority,
//       time: d.scheduledDeliveryTime
//         ? new Date(d.scheduledDeliveryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(' ', '')
//         : 'Not Scheduled',
//       date: d.scheduledDeliveryTime
//         ? new Date(d.scheduledDeliveryTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(' ', ' ')
//         : null,
//       deliveryAddress: d.deliveryLocation.address.split(',')[0] || d.deliveryLocation.address,
//       pickupAddress: d.pickupLocation.address.split(',')[0] || d.pickupLocation.address,
//       distance: hasProximityDistance
//         ? `${d.__distanceKm.toFixed(1)} km`
//         : (d.distance ? `${d.distance.toFixed(1)} km` : 'N/A'),
//       nearestRank: idx !== undefined ? idx + 1 : null,
//       distanceFromDriver: hasProximityDistance ? `${d.__distanceKm.toFixed(1)} km` : null,
//       etaFromDriver: d.__etaMin ? `${d.__etaMin} min` : null,
//       packageInfo: d.packageDetails.description ? `${d.packageDetails.quantity || 1}x ${d.packageDetails.description}` : 'Package',
//       remarks: d.remarks?.length > 0
//         ? d.remarks.map(r => ({
//           text: r.remarkText, category: r.category, severity: r.severity, color: r.color || '#666',
//           time: new Date(r.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
//         }))
//         : []
//     };
//   };

//   return {
//     upcoming: orderedUpcoming.map((d, idx) => buildItem(d, idx)),
//     completed: completedRaw.map(d => buildItem(d)),
//     sortedByProximity: !!driverLocation
//   };
// };

// // ================================================================
// // GET Driver Deliveries - Upcoming & Completed (REST endpoint)
// // ================================================================
// exports.getDriverDeliveries = async (req, res) => {
//   try {
//     const driver = req.user;

//     if (!driver || driver.role !== 'driver') {
//       return errorResponse(res, 'Unauthorized', 401);
//     }

//     console.log('\n========== [DELIVERY-LIST] START ==========');
//     console.log('[DELIVERY-LIST] driverId (from token):', driver._id.toString());

//     const result = await exports.getSortedUpcomingForDriver(driver._id);

//     console.log('[DELIVERY-LIST] sortedByProximity:', result.sortedByProximity);
//     console.log('[DELIVERY-LIST] upcoming count:', result.upcoming.length, '| completed count:', result.completed.length);
//     result.upcoming.forEach(u => {
//       console.log(`  #${u.nearestRank} → ${u.trackingNumber} | priority: ${u.priority} | distance (shown in app): ${u.distance} | distanceFromDriver: ${u.distanceFromDriver}`);
//     });
//     console.log('========== [DELIVERY-LIST] END ==========\n');

//     return successResponse(res, 'Deliveries fetched successfully', {
//       upcoming: result.upcoming,
//       completed: result.completed,
//       counts: {
//         upcoming: result.upcoming.length,
//         completed: result.completed.length
//       },
//       sortedByProximity: result.sortedByProximity
//     });

//   } catch (error) {
//     console.error('Get Driver Deliveries Error:', error);
//     return errorResponse(res, 'Failed to load deliveries', 500);
//   }
// };

// // ================================================================
// // GET /driver/delivery/:deliveryId/details
// // ================================================================
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

//     // ── Effective pickup nikaalo (list ki proximity-ranking se) ──
//     let effectivePickupLocation = delivery.pickupLocation;

//     if (delivery.driverId) {
//       try {
//         const driverIdForSort = delivery.driverId._id || delivery.driverId;
//         const sorted = await exports.getSortedUpcomingForDriver(driverIdForSort);
//         const myIndex = sorted.upcoming.findIndex(u => u.id === delivery._id.toString());

//         console.log(`[DELIVERY-DETAILS] deliveryId: ${deliveryId} | myRank: ${myIndex >= 0 ? myIndex + 1 : 'not in upcoming list'} of ${sorted.upcoming.length}`);

//         if (myIndex > 0) {
//           const previousItem = sorted.upcoming[myIndex - 1];
//           const previousDeliveryDoc = await Delivery.findById(previousItem.id)
//             .select('deliveryLocation trackingNumber')
//             .lean();

//           if (previousDeliveryDoc?.deliveryLocation?.coordinates?.latitude) {
//             effectivePickupLocation = previousDeliveryDoc.deliveryLocation;
//             console.log(`[DELIVERY-DETAILS] ✅ Pickup overridden — using "${previousDeliveryDoc.trackingNumber}" destination as pickup: ${previousDeliveryDoc.deliveryLocation.address}`);
//           }
//         } else if (myIndex === 0) {
//           console.log('[DELIVERY-DETAILS] Yeh delivery hi rank #1 (sabse nazdik) hai — original pickupLocation use hoga');
//         }
//       } catch (sortErr) {
//         console.error('[DELIVERY-DETAILS] Proximity pickup resolution failed (non-fatal):', sortErr.message);
//       }
//     }

//     delivery.pickupLocation = effectivePickupLocation;

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


console.log('🔥🔥🔥 [FILE-LOAD-CHECK] deliveryController.js LOADED at:', new Date().toISOString());

const Delivery = require('../../models/Delivery');
const Route = require('../../models/Route');
const Driver = require('../../models/Driver');
const DeliveryStatusHistory = require('../../models/DeliveryStatusHistory');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { generateOTP } = require('../../utils/otpHelper');
const { sendSMS } = require('../../utils/smsHelper');
const Remark = require('../../models/Remark');
const { getGoogleDistanceMatrix, calculateDistance, geocodeAddress } = require('../../utils/geoHelper');
const { PickupLocation } = require('../../models/Order'); // ✅ NAYA: fallback default start point ke liye

// Statuses jo "upcoming" maane jaate hain
const UPCOMING_STATUSES = ['Pending_acceptance', 'Assigned', 'Picked_up', 'In_transit', 'Out_for_delivery', 'Arrived', 'assigned', "Proof_uploaded"];
const COMPLETED_STATUSES = ['Delivered', 'Failed', 'Cancelled', "Completed"];

// ✅ Priority tiers — number jitna chhota, priority utni upar
const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

function getRankingCoords(d) {
  const loc = d.deliveryLocation;
  return (loc?.coordinates?.latitude && loc?.coordinates?.longitude)
    ? { latitude: loc.coordinates.latitude, longitude: loc.coordinates.longitude }
    : null;
}

async function getDefaultStartPoint() {
  try {
    const defaultPickup = await PickupLocation.findOne({ isDefault: true, isActive: true });
    if (defaultPickup?.coordinates?.latitude && defaultPickup?.coordinates?.longitude) {
      return {
        latitude: defaultPickup.coordinates.latitude,
        longitude: defaultPickup.coordinates.longitude
      };
    }
    const anyPickup = await PickupLocation.findOne({ isActive: true }).sort({ createdAt: 1 });
    if (anyPickup?.coordinates?.latitude && anyPickup?.coordinates?.longitude) {
      return {
        latitude: anyPickup.coordinates.latitude,
        longitude: anyPickup.coordinates.longitude
      };
    }
  } catch (err) {
    console.error('[PROXIMITY] getDefaultStartPoint error:', err.message);
  }
  return null;
}

// ✅ Driver ki live GPS reading sanity-check karta hai (business sirf India mein hai).
// Agar GPS koi bahar-ka/garbage coordinate de de (jaise Abu Dhabi 24.19,54.47),
// to usse currentPoint na banaya jaaye — warna poori proximity chain ulti ho jaati hai.
function isPlausibleDriverLocation(loc) {
  if (!loc) return false;
  const { latitude, longitude } = loc;
  const INDIA_BOUNDS = { minLat: 6, maxLat: 38, minLng: 68, maxLng: 98 };
  return (
    latitude >= INDIA_BOUNDS.minLat && latitude <= INDIA_BOUNDS.maxLat &&
    longitude >= INDIA_BOUNDS.minLng && longitude <= INDIA_BOUNDS.maxLng
  );
}

async function findNearestFromPool(currentPoint, pool, getCoords) {
  const withCoords = pool.map(d => ({ delivery: d, coords: getCoords(d) }));
  const validEntries = withCoords.filter(e => e.coords);
  const invalidEntries = withCoords.filter(e => !e.coords);

  if (invalidEntries.length > 0) {
    invalidEntries.forEach(e => {
      console.warn(
        `[PROXIMITY] ⚠️ Coordinates missing for ${e.delivery.trackingNumber} | status: ${e.delivery.status} | ` +
        `deliveryLocation.coords: ${JSON.stringify(e.delivery.deliveryLocation?.coordinates || null)}`
      );
    });
  }

  if (validEntries.length === 0) {
    const chosen = pool[0];
    return { chosen, distanceKm: Infinity, durationMin: null, source: 'none' };
  }

  const destinations = validEntries.map(e => e.coords);

  let googleDistances = null;
  try {
    googleDistances = await getGoogleDistanceMatrix(currentPoint, destinations);
  } catch (e) {
    googleDistances = null;
  }

  const distances = validEntries.map((e, idx) => {
    const g = googleDistances?.[idx];
    if (g && g.distanceKm !== null && g.distanceKm !== undefined) {
      return { distanceKm: g.distanceKm, durationMin: g.durationMin ?? null, source: 'google' };
    }
    const distanceKm = calculateDistance(
      currentPoint.latitude, currentPoint.longitude,
      e.coords.latitude, e.coords.longitude
    );
    return { distanceKm, durationMin: null, source: 'haversine' };
  });

  let nearestIdxInValid = 0;
  let nearestDist = distances[0].distanceKm;
  let nearestDuration = distances[0].durationMin;
  let source = distances[0].source;

  distances.forEach((d, idx) => {
    if (d.distanceKm < nearestDist) {
      nearestDist = d.distanceKm;
      nearestDuration = d.durationMin;
      nearestIdxInValid = idx;
      source = d.source;
    }
  });

  const chosen = validEntries[nearestIdxInValid].delivery;
  return { chosen, distanceKm: nearestDist, durationMin: nearestDuration, source };
}

exports.getSortedUpcomingForDriver = async (driverId) => {
  const driverDoc = await Driver.findById(driverId).select('currentLocation');

  let driverLocation = (driverDoc?.currentLocation?.latitude && driverDoc?.currentLocation?.longitude)
    ? { latitude: driverDoc.currentLocation.latitude, longitude: driverDoc.currentLocation.longitude }
    : null;

  if (driverLocation && !isPlausibleDriverLocation(driverLocation)) {
    console.warn(
      `[PROXIMITY] ⚠️ Driver ki GPS location suspicious lag rahi hai (${driverLocation.latitude}, ${driverLocation.longitude}) ` +
      `— expected bounds ke bahar hai, isko ignore karke fallback warehouse point use karenge`
    );
    driverLocation = null;
  }

  let usedFallbackStart = false;
  if (!driverLocation) {
    driverLocation = await getDefaultStartPoint();
    if (driverLocation) {
      usedFallbackStart = true;
      console.log('[PROXIMITY] Driver ki live GPS nahi hai — default warehouse ko starting point maan rahe hain');
    } else {
      console.warn('[PROXIMITY] Driver ki GPS bhi nahi hai, default warehouse bhi nahi mila — proximity sorting skip hogi');
    }
  }

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

  for (const d of upcomingRaw) {
    const loc = d.deliveryLocation;
    const hasValidCoords = loc?.coordinates?.latitude && loc?.coordinates?.longitude;

    if (!hasValidCoords) {
      if (loc?.address) {
        console.warn(`[PROXIMITY] ${d.trackingNumber} — deliveryLocation.coordinates missing, attempting live geocode from address: "${loc.address}"`);

        const geocoded = await geocodeAddress(loc.address);

        if (geocoded) {
          d.deliveryLocation = {
            ...loc,
            coordinates: { latitude: geocoded.latitude, longitude: geocoded.longitude }
          };

          try {
            await Delivery.findByIdAndUpdate(d._id, {
              'deliveryLocation.coordinates.latitude': geocoded.latitude,
              'deliveryLocation.coordinates.longitude': geocoded.longitude
            });
            console.log(`[PROXIMITY] ✅ ${d.trackingNumber} — coordinates repaired & saved: ${geocoded.latitude}, ${geocoded.longitude}`);
          } catch (saveErr) {
            console.error(`[PROXIMITY] Failed to save repaired coordinates for ${d.trackingNumber}: ${saveErr.message}`);
          }
        } else {
          console.error(`[PROXIMITY] ❌ ${d.trackingNumber} — geocode bhi fail ho gaya, ye delivery distance-unknown rahegi`);
        }
      } else {
        console.error(`[PROXIMITY] ❌❌ ${d.trackingNumber} — deliveryLocation me address AUR coordinates DONO missing hain! Raw: ${JSON.stringify(loc)}`);
      }
    } else {
      console.log(`[PROXIMITY] ✓ ${d.trackingNumber} — deliveryLocation coordinates valid: ${loc.coordinates.latitude}, ${loc.coordinates.longitude}`);
    }
  }

  let orderedUpcoming = upcomingRaw;

  // ✅ PURE PROXIMITY CHAIN — priority se bilkul grouping nahi hoti ab.
  // Chahe delivery kabhi bhi/kisi bhi order mein assign hui ho (dur wali pehle,
  // medium beech mein, close baad mein — koi farak nahi padta), list hamesha
  // driver/factory ke current point se sabse nazdeek wali delivery se shuru hogi,
  // uske baad wahi se agli sabse nazdeek, phir agli, aage badhte hue.
  // Priority field sirf display/info ke liye rakhi hai, sorting ke liye use nahi hoti.
  if (driverLocation && upcomingRaw.length > 1) {
    console.log(
      `[PROXIMITY] Pure nearest-neighbor chain chalayenge — ${upcomingRaw.length} delivery(ies), priority sirf display ke liye hai` +
      `${usedFallbackStart ? ' (using fallback warehouse start point)' : ''}`
    );

    const chainResult = [];
    let currentPoint = driverLocation;
    let remaining = [...upcomingRaw];

    while (remaining.length > 0) {
      const result = await findNearestFromPool(currentPoint, remaining, getRankingCoords);

      console.log(`[PROXIMITY-CHAIN] currentPoint: ${JSON.stringify(currentPoint)} | chosen: ${result.chosen.trackingNumber} | destination: ${result.chosen.deliveryLocation?.address} | distanceKm: ${result.distanceKm} | source: ${result.source}`);

      chainResult.push({
        item: result.chosen,
        distanceKm: result.distanceKm,
        durationMin: result.durationMin,
        source: result.source
      });

      const chosenCoords = getRankingCoords(result.chosen);
      if (chosenCoords) {
        currentPoint = chosenCoords;
      } else {
        console.warn(`[PROXIMITY-CHAIN] ⚠️ ${result.chosen.trackingNumber} ke coordinates null aaye — currentPoint update nahi hua`);
      }

      const removeIdx = remaining.findIndex(d => d._id.toString() === result.chosen._id.toString());
      if (removeIdx > -1) remaining.splice(removeIdx, 1);
    }

    orderedUpcoming = chainResult.map(r => ({
      ...r.item,
      __distanceKm: r.distanceKm,
      __etaMin: r.durationMin,
      __distanceSource: r.source
    }));
  }

  const buildItem = (d, idx) => {
    const hasProximityDistance = d.__distanceKm !== undefined && d.__distanceKm !== Infinity;

    return {
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
      distance: hasProximityDistance
        ? `${d.__distanceKm.toFixed(1)} km`
        : (d.distance ? `${d.distance.toFixed(1)} km` : 'N/A'),
      nearestRank: idx !== undefined ? idx + 1 : null,
      distanceFromDriver: hasProximityDistance ? `${d.__distanceKm.toFixed(1)} km` : null,
      etaFromDriver: d.__etaMin ? `${d.__etaMin} min` : null,
      packageInfo: d.packageDetails.description ? `${d.packageDetails.quantity || 1}x ${d.packageDetails.description}` : 'Package',
      remarks: d.remarks?.length > 0
        ? d.remarks.map(r => ({
          text: r.remarkText, category: r.category, severity: r.severity, color: r.color || '#666',
          time: new Date(r.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        }))
        : []
    };
  };

  return {
    upcoming: orderedUpcoming.map((d, idx) => buildItem(d, idx)),
    completed: completedRaw.map(d => buildItem(d)),
    sortedByProximity: !!driverLocation
  };
};

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
      console.log(`  #${u.nearestRank} → ${u.trackingNumber} | priority: ${u.priority} | distance (shown in app): ${u.distance} | distanceFromDriver: ${u.distanceFromDriver}`);
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

// ================================================================
// GET /driver/delivery/:deliveryId/details
// ================================================================
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

    // ================================================================
    // ✅ Effective pickup + routeChain (list ki proximity-ranking se)
    // routeChain: [{ label, isFactory, isCurrent, distance }] — sirf
    // display ke liye, app UI chahe to "Factory → A → B" dikha sake.
    // ================================================================
    let effectivePickupLocation = delivery.pickupLocation;
    let routeChain = [];

    if (delivery.driverId) {
      try {
        const driverIdForSort = delivery.driverId._id || delivery.driverId;
        const sorted = await exports.getSortedUpcomingForDriver(driverIdForSort);
        const myIndex = sorted.upcoming.findIndex(u => u.id === delivery._id.toString());

        console.log(`[DELIVERY-DETAILS] deliveryId: ${deliveryId} | myRank: ${myIndex >= 0 ? myIndex + 1 : 'not in upcoming list'} of ${sorted.upcoming.length}`);

        // Poora chain banao display ke liye: Factory -> stop1 -> stop2 -> ...
        routeChain.push({ label: 'Factory (Start)', isFactory: true, isCurrent: false, distance: null });
        sorted.upcoming.forEach(u => {
          routeChain.push({
            label: u.trackingNumber,
            isFactory: false,
            isCurrent: u.id === delivery._id.toString(),
            distance: u.distanceFromDriver
          });
        });

        if (myIndex > 0) {
          const previousItem = sorted.upcoming[myIndex - 1];
          const previousDeliveryDoc = await Delivery.findById(previousItem.id)
            .select('deliveryLocation trackingNumber')
            .lean();

          if (previousDeliveryDoc?.deliveryLocation?.coordinates?.latitude) {
            effectivePickupLocation = previousDeliveryDoc.deliveryLocation;
            console.log(`[DELIVERY-DETAILS] ✅ Pickup overridden — using "${previousDeliveryDoc.trackingNumber}" destination as pickup: ${previousDeliveryDoc.deliveryLocation.address}`);
          }
        } else if (myIndex === 0) {
          console.log('[DELIVERY-DETAILS] Yeh delivery hi rank #1 (sabse nazdik) hai — original pickupLocation use hoga');
        }
      } catch (sortErr) {
        console.error('[DELIVERY-DETAILS] Proximity pickup resolution failed (non-fatal):', sortErr.message);
      }
    }

    delivery.pickupLocation = effectivePickupLocation;

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
      routeChain, // ✅ NAYA — app UI chahe to "Factory → A → B" dikha sake
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