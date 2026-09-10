// console.log('🔥🔥🔥 [FILE-LOAD-CHECK] deliveryController.js LOADED at:', new Date().toISOString());

// const Delivery = require('../../models/Delivery');
// const Order = require('../../models/Order')
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

// function getRankingCoords(d) {
//   const loc = d.deliveryLocation;
//   return (loc?.coordinates?.latitude && loc?.coordinates?.longitude)
//     ? { latitude: loc.coordinates.latitude, longitude: loc.coordinates.longitude }
//     : null;
// }

// // ✅ IST (India) ke hisaab se "aaj" ka 00:00 nikaalta hai — date-boundary compare ke liye
// function startOfTodayIST() {
//   const now = new Date();
//   const istOffsetMs = 5.5 * 60 * 60 * 1000;
//   const istNow = new Date(now.getTime() + istOffsetMs);
//   istNow.setUTCHours(0, 0, 0, 0);
//   return new Date(istNow.getTime() - istOffsetMs);
// }

// // ✅ Purane din ki (aaj se pehle ki) saari UPCOMING deliveries ko
// // "Returned_to_Factory" mark kar deta hai — jaise hi driver apni list
// // dobara fetch karega (naya delivery assign hone ke baad), stale entries
// // automatically queue se hat jaayengi. Data delete nahi hota, sirf status
// // change hota hai — DeliveryStatusHistory mein audit trail reh jaata hai.

// // async function autoReturnStaleDeliveries(driverId) {
// //   const todayStart = startOfTodayIST();

// //   const staleDeliveries = await Delivery.find({
// //     driverId,
// //     status: { $in: UPCOMING_STATUSES },
// //     $or: [
// //       { scheduledDeliveryTime: { $ne: null, $lt: todayStart } },
// //       { scheduledDeliveryTime: null, createdAt: { $lt: todayStart } }
// //     ]
// //   });

// //   if (staleDeliveries.length === 0) return { flushedCount: 0, flushed: [] };

// //   console.log(`[STALE-FLUSH] driverId: ${driverId} | ${staleDeliveries.length} purani pending delivery(ies) mili — factory-return maan ke queue se hata rahe hain`);

// //   const flushed = [];
// //   for (const d of staleDeliveries) {
// //     const previousStatus = d.status;
// //     d.status = 'Returned_to_Factory';
// //     d.returnedToFactoryAt = new Date();
// //     d.returnedToFactoryReason = `Auto-flushed: previous day ki pending delivery thi (status "${previousStatus}"), parcel factory mein submit maana gaya`;
// //     await d.save();

// //     // ✅ NAYA — linked Order ka status bhi sync karo, taaki admin panel
// //     // ke Orders list mein bhi wahi order "Returned to Factory" dikhe.
// //     if (d.orderId) {
// //       try {
// //         await Order.findOneAndUpdate(
// //           { orderNumber: d.orderId },
// //           { status: 'Returned_to_Factory' }   // ✅ FIX — capital, exact enum value ke hisaab se
// //         );
// //         console.log(`[STALE-FLUSH] ✅ Order "${d.orderId}" ka status bhi 'Returned_to_Factory' set kiya`);
// //       } catch (orderErr) {
// //         console.error(`[STALE-FLUSH] Order status update fail hui "${d.orderId}" ke liye: ${orderErr.message}`);
// //       }
// //     }

// //     try {
// //       await DeliveryStatusHistory.create({
// //         deliveryId: d._id,
// //         status: 'Returned_to_Factory',
// //         previousStatus,
// //         timestamp: new Date(),
// //         remarks: 'Auto-returned to factory: stale pending delivery from a previous day'
// //       });
// //     } catch (histErr) {
// //       console.error(`[STALE-FLUSH] History log fail hui ${d.trackingNumber} ke liye: ${histErr.message}`);
// //     }

// //     console.log(`[STALE-FLUSH] ✅ ${d.trackingNumber} → Returned_to_Factory (pehle: ${previousStatus})`);
// //     flushed.push(d.trackingNumber);
// //   }

// //   return { flushedCount: flushed.length, flushed };
// // }


// async function autoReturnStaleDeliveries(driverId) {
//   const todayStart = startOfTodayIST();
 
//   const staleDeliveries = await Delivery.find({
//     driverId,
//     status: { $in: UPCOMING_STATUSES },
//     $or: [
//       { scheduledDeliveryTime: { $ne: null, $lt: todayStart } },
//       { scheduledDeliveryTime: null, createdAt: { $lt: todayStart } }
//     ]
//   });
 
//   if (staleDeliveries.length === 0) return { flushedCount: 0, flushed: [] };
 
//   console.log(`[STALE-FLUSH] driverId: ${driverId} | ${staleDeliveries.length} purani pending delivery(ies) mili — factory-return maan ke queue se hata rahe hain`);
 
//   const flushed = [];
//   for (const d of staleDeliveries) {
//     const previousStatus = d.status;
//     d.status = 'Returned_to_Factory';
//     d.returnedToFactoryAt = new Date();
//     d.returnedToFactoryReason = `Auto-flushed: previous day ki pending delivery thi (status "${previousStatus}"), parcel factory mein submit maana gaya`;
//     await d.save();
 
//     // ✅ NAYA — linked Order ka status bhi sync karo, taaki admin panel
//     // ke Orders list mein bhi wahi order "Returned to Factory" dikhe.
//     if (d.orderId) {
//       try {
//         await Order.findOneAndUpdate(
//           { orderNumber: d.orderId },
//           { status: 'Returned_to_Factory' }   // ✅ FIX — capital, exact enum value ke hisaab se
//         );
//         console.log(`[STALE-FLUSH] ✅ Order "${d.orderId}" ka status bhi 'Returned_to_Factory' set kiya`);
//       } catch (orderErr) {
//         console.error(`[STALE-FLUSH] Order status update fail hui "${d.orderId}" ke liye: ${orderErr.message}`);
//       }
//     }
 
//     try {
//       await DeliveryStatusHistory.create({
//         deliveryId: d._id,
//         status: 'Returned_to_Factory',
//         previousStatus,
//         timestamp: new Date(),
//         remarks: 'Auto-returned to factory: stale pending delivery from a previous day'
//       });
//     } catch (histErr) {
//       console.error(`[STALE-FLUSH] History log fail hui ${d.trackingNumber} ke liye: ${histErr.message}`);
//     }
 
//     console.log(`[STALE-FLUSH] ✅ ${d.trackingNumber} → Returned_to_Factory (pehle: ${previousStatus})`);
//     flushed.push(d.trackingNumber);
//   }
 
//   return { flushedCount: flushed.length, flushed };
// }
// exports.autoReturnStaleDeliveries = autoReturnStaleDeliveries;
 
// async function getDefaultStartPoint() {
//   try {
//     const defaultPickup = await PickupLocation.findOne({ isDefault: true, isActive: true });
//     if (defaultPickup?.coordinates?.latitude && defaultPickup?.coordinates?.longitude) {
//       const coords = { latitude: defaultPickup.coordinates.latitude, longitude: defaultPickup.coordinates.longitude };
//       console.log(`[PROXIMITY] Default pickup location: "${defaultPickup.name || defaultPickup.address}" | coords: ${JSON.stringify(coords)}`);
//       if (!isPlausibleDriverLocation(coords)) {
//         console.warn(`[PROXIMITY] ⚠️ Default pickup location ke coordinates hi suspicious hain (${coords.latitude}, ${coords.longitude}) — "Manage Pickup Locations" mein isko check/fix karo`);
//       }
//       return coords;
//     }
//     const anyPickup = await PickupLocation.findOne({ isActive: true }).sort({ createdAt: 1 });
//     if (anyPickup?.coordinates?.latitude && anyPickup?.coordinates?.longitude) {
//       const coords = { latitude: anyPickup.coordinates.latitude, longitude: anyPickup.coordinates.longitude };
//       console.log(`[PROXIMITY] Fallback pickup location (no default set): "${anyPickup.name || anyPickup.address}" | coords: ${JSON.stringify(coords)}`);
//       if (!isPlausibleDriverLocation(coords)) {
//         console.warn(`[PROXIMITY] ⚠️ Fallback pickup location ke coordinates hi suspicious hain (${coords.latitude}, ${coords.longitude}) — "Manage Pickup Locations" mein isko check/fix karo`);
//       }
//       return coords;
//     }
//   } catch (err) {
//     console.error('[PROXIMITY] getDefaultStartPoint error:', err.message);
//   }
//   return null;
// }
 
// // ✅ Driver ki live GPS reading sanity-check karta hai (business sirf India mein hai).
// // Agar GPS koi bahar-ka/garbage coordinate de de (jaise Abu Dhabi 24.19,54.47),
// // to usse currentPoint na banaya jaaye — warna poori proximity chain ulti ho jaati hai.
// function isPlausibleDriverLocation(loc) {
//   if (!loc) return false;
//   const { latitude, longitude } = loc;
//   const INDIA_BOUNDS = { minLat: 6, maxLat: 38, minLng: 68, maxLng: 98 };
//   return (
//     latitude >= INDIA_BOUNDS.minLat && latitude <= INDIA_BOUNDS.maxLat &&
//     longitude >= INDIA_BOUNDS.minLng && longitude <= INDIA_BOUNDS.maxLng
//   );
// }
 
// // ✅ Driver ke current point se HAR delivery ka direct distance nikaalta hai
// // (chain/hop wise nahi — seedha driver se). Isi se pure "distance from driver"
// // ke hisaab se ascending sort hoga.
// async function computeDistancesFromPoint(currentPoint, pool, getCoords) {
//   const withCoords = pool.map(d => ({ delivery: d, coords: getCoords(d) }));
//   const validEntries = withCoords.filter(e => e.coords);
//   const invalidEntries = withCoords.filter(e => !e.coords);
 
//   invalidEntries.forEach(e => {
//     console.warn(
//       `[PROXIMITY] ⚠️ Coordinates missing for ${e.delivery.trackingNumber} | status: ${e.delivery.status} | ` +
//       `deliveryLocation.coords: ${JSON.stringify(e.delivery.deliveryLocation?.coordinates || null)}`
//     );
//   });
 
//   let googleDistances = null;
//   if (validEntries.length > 0) {
//     try {
//       googleDistances = await getGoogleDistanceMatrix(currentPoint, validEntries.map(e => e.coords));
//     } catch (e) {
//       googleDistances = null;
//     }
//   }
 
//   const results = validEntries.map((e, idx) => {
//     const g = googleDistances?.[idx];
//     if (g && g.distanceKm !== null && g.distanceKm !== undefined) {
//       return { delivery: e.delivery, distanceKm: g.distanceKm, durationMin: g.durationMin ?? null, source: 'google' };
//     }
//     const distanceKm = calculateDistance(
//       currentPoint.latitude, currentPoint.longitude,
//       e.coords.latitude, e.coords.longitude
//     );
//     return { delivery: e.delivery, distanceKm, durationMin: null, source: 'haversine' };
//   });
 
//   invalidEntries.forEach(e => {
//     results.push({ delivery: e.delivery, distanceKm: Infinity, durationMin: null, source: 'none' });
//   });
 
//   return results;
// }
 
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
 
// exports.getSortedUpcomingForDriver = async (driverId) => {
//   // ✅ Sabse pehle purane din ki stale deliveries flush karo
//   await autoReturnStaleDeliveries(driverId);
 
//   const driverDoc = await Driver.findById(driverId).select('currentLocation');
 
//   let driverLocation = (driverDoc?.currentLocation?.latitude && driverDoc?.currentLocation?.longitude)
//     ? { latitude: driverDoc.currentLocation.latitude, longitude: driverDoc.currentLocation.longitude }
//     : null;
 
//   if (driverLocation && !isPlausibleDriverLocation(driverLocation)) {
//     console.warn(
//       `[PROXIMITY] ⚠️ Driver ki GPS location suspicious lag rahi hai (${driverLocation.latitude}, ${driverLocation.longitude}) ` +
//       `— expected bounds ke bahar hai, isko ignore karke fallback warehouse point use karenge`
//     );
//     driverLocation = null;
//   }
 
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
 
//   console.log(
//     `[PROXIMITY] Resolved starting point → source: ${usedFallbackStart ? 'FALLBACK_WAREHOUSE' : (driverLocation ? 'DRIVER_LIVE_GPS' : 'NONE')} | ` +
//     `coords: ${driverLocation ? JSON.stringify(driverLocation) : 'null'} | driverId: ${driverId}`
//   );
 
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
 
//   if (driverLocation && upcomingRaw.length > 0) {
//     console.log(
//       `[PROXIMITY] Distance-from-driver ke hisaab se sort karenge — ${upcomingRaw.length} delivery(ies), priority sirf display ke liye hai` +
//       `${usedFallbackStart ? ' (using fallback warehouse start point)' : ''}`
//     );
 
//     const distanceResults = await computeDistancesFromPoint(driverLocation, upcomingRaw, getRankingCoords);
 
//     distanceResults.sort((a, b) => a.distanceKm - b.distanceKm);
 
//     distanceResults.forEach(r => {
//       console.log(`[PROXIMITY-DISTANCE] driverPoint: ${JSON.stringify(driverLocation)} | delivery: ${r.delivery.trackingNumber} | destination: ${r.delivery.deliveryLocation?.address} | distanceKm: ${r.distanceKm} | source: ${r.source}`);
//     });
 
//     orderedUpcoming = distanceResults.map(r => ({
//       ...r.delivery,
//       __distanceKm: r.distanceKm,
//       __etaMin: r.durationMin,
//       __distanceSource: r.source
//     }));
//   }
 
//   const buildItem = (d, idx) => {
//     const hasProximityDistance = d.__distanceKm !== undefined && d.__distanceKm !== Infinity;
 
//     // ✅ FIX: pehle yahan `d.deliveryLocation.address.split(',')[0]` seedha
//     // call hota tha — agar KISI EK delivery ka address missing/undefined
//     // ho (jaise corrupt/badly-saved data), to `.split` TypeError throw
//     // karta, poora getSortedUpcomingForDriver() function reject ho jaata,
//     // aur us DRIVER ki SAARI deliveries (list page pe) rank/sort ke bina
//     // "-" dikhne lagti thi (fallback catch block me ja girti thi).
//     // Ab safe optional-chaining ke saath fallback text milega, crash nahi.
//     const deliveryAddr = d.deliveryLocation?.address || 'Address not available';
//     const pickupAddr = d.pickupLocation?.address || 'Address not available';
 
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
//       deliveryAddress: deliveryAddr.split(',')[0] || deliveryAddr,
//       pickupAddress: pickupAddr.split(',')[0] || pickupAddr,
//       distance: hasProximityDistance
//         ? `${d.__distanceKm.toFixed(1)} km`
//         : (d.distance ? `${d.distance.toFixed(1)} km` : 'N/A'),
//       nearestRank: idx !== undefined ? idx + 1 : null,
//       distanceFromDriver: hasProximityDistance ? `${d.__distanceKm.toFixed(1)} km` : null,
//       etaFromDriver: d.__etaMin ? `${d.__etaMin} min` : null,
//       packageInfo: d.packageDetails?.description ? `${d.packageDetails.quantity || 1}x ${d.packageDetails.description}` : 'Package',
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
 
//     let effectivePickupLocation = delivery.pickupLocation;
//     let routeChain = [];
 
//     if (delivery.driverId) {
//       try {
//         const driverIdForSort = delivery.driverId._id || delivery.driverId;
//         const sorted = await exports.getSortedUpcomingForDriver(driverIdForSort);
//         const myIndex = sorted.upcoming.findIndex(u => u.id === delivery._id.toString());
 
//         console.log(`[DELIVERY-DETAILS] deliveryId: ${deliveryId} | myRank: ${myIndex >= 0 ? myIndex + 1 : 'not in upcoming list'} of ${sorted.upcoming.length}`);
 
//         routeChain.push({ label: 'Factory (Start)', isFactory: true, isCurrent: false, distance: null });
//         sorted.upcoming.forEach(u => {
//           routeChain.push({
//             label: u.trackingNumber,
//             isFactory: false,
//             isCurrent: u.id === delivery._id.toString(),
//             distance: u.distanceFromDriver
//           });
//         });
 
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
//       routeChain,
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

// exports.autoReturnStaleDeliveries = autoReturnStaleDeliveries;

// async function getDefaultStartPoint() {
//   try {
//     const defaultPickup = await PickupLocation.findOne({ isDefault: true, isActive: true });
//     if (defaultPickup?.coordinates?.latitude && defaultPickup?.coordinates?.longitude) {
//       const coords = { latitude: defaultPickup.coordinates.latitude, longitude: defaultPickup.coordinates.longitude };
//       console.log(`[PROXIMITY] Default pickup location: "${defaultPickup.name || defaultPickup.address}" | coords: ${JSON.stringify(coords)}`);
//       if (!isPlausibleDriverLocation(coords)) {
//         console.warn(`[PROXIMITY] ⚠️ Default pickup location ke coordinates hi suspicious hain (${coords.latitude}, ${coords.longitude}) — "Manage Pickup Locations" mein isko check/fix karo`);
//       }
//       return coords;
//     }
//     const anyPickup = await PickupLocation.findOne({ isActive: true }).sort({ createdAt: 1 });
//     if (anyPickup?.coordinates?.latitude && anyPickup?.coordinates?.longitude) {
//       const coords = { latitude: anyPickup.coordinates.latitude, longitude: anyPickup.coordinates.longitude };
//       console.log(`[PROXIMITY] Fallback pickup location (no default set): "${anyPickup.name || anyPickup.address}" | coords: ${JSON.stringify(coords)}`);
//       if (!isPlausibleDriverLocation(coords)) {
//         console.warn(`[PROXIMITY] ⚠️ Fallback pickup location ke coordinates hi suspicious hain (${coords.latitude}, ${coords.longitude}) — "Manage Pickup Locations" mein isko check/fix karo`);
//       }
//       return coords;
//     }
//   } catch (err) {
//     console.error('[PROXIMITY] getDefaultStartPoint error:', err.message);
//   }
//   return null;
// }

// // ✅ Driver ki live GPS reading sanity-check karta hai (business sirf India mein hai).
// // Agar GPS koi bahar-ka/garbage coordinate de de (jaise Abu Dhabi 24.19,54.47),
// // to usse currentPoint na banaya jaaye — warna poori proximity chain ulti ho jaati hai.
// function isPlausibleDriverLocation(loc) {
//   if (!loc) return false;
//   const { latitude, longitude } = loc;
//   const INDIA_BOUNDS = { minLat: 6, maxLat: 38, minLng: 68, maxLng: 98 };
//   return (
//     latitude >= INDIA_BOUNDS.minLat && latitude <= INDIA_BOUNDS.maxLat &&
//     longitude >= INDIA_BOUNDS.minLng && longitude <= INDIA_BOUNDS.maxLng
//   );
// }

// // ✅ Driver ke current point se HAR delivery ka direct distance nikaalta hai
// // (chain/hop wise nahi — seedha driver se). Isi se pure "distance from driver"
// // ke hisaab se ascending sort hoga.
// async function computeDistancesFromPoint(currentPoint, pool, getCoords) {
//   const withCoords = pool.map(d => ({ delivery: d, coords: getCoords(d) }));
//   const validEntries = withCoords.filter(e => e.coords);
//   const invalidEntries = withCoords.filter(e => !e.coords);

//   invalidEntries.forEach(e => {
//     console.warn(
//       `[PROXIMITY] ⚠️ Coordinates missing for ${e.delivery.trackingNumber} | status: ${e.delivery.status} | ` +
//       `deliveryLocation.coords: ${JSON.stringify(e.delivery.deliveryLocation?.coordinates || null)}`
//     );
//   });

//   let googleDistances = null;
//   if (validEntries.length > 0) {
//     try {
//       googleDistances = await getGoogleDistanceMatrix(currentPoint, validEntries.map(e => e.coords));
//     } catch (e) {
//       googleDistances = null;
//     }
//   }

//   const results = validEntries.map((e, idx) => {
//     const g = googleDistances?.[idx];
//     if (g && g.distanceKm !== null && g.distanceKm !== undefined) {
//       return { delivery: e.delivery, distanceKm: g.distanceKm, durationMin: g.durationMin ?? null, source: 'google' };
//     }
//     const distanceKm = calculateDistance(
//       currentPoint.latitude, currentPoint.longitude,
//       e.coords.latitude, e.coords.longitude
//     );
//     return { delivery: e.delivery, distanceKm, durationMin: null, source: 'haversine' };
//   });

//   invalidEntries.forEach(e => {
//     results.push({ delivery: e.delivery, distanceKm: Infinity, durationMin: null, source: 'none' });
//   });

//   return results;
// }

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

// exports.getSortedUpcomingForDriver = async (driverId) => {
//   // ✅ Sabse pehle purane din ki stale deliveries flush karo
//   await autoReturnStaleDeliveries(driverId);

//   const driverDoc = await Driver.findById(driverId).select('currentLocation');

//   let driverLocation = (driverDoc?.currentLocation?.latitude && driverDoc?.currentLocation?.longitude)
//     ? { latitude: driverDoc.currentLocation.latitude, longitude: driverDoc.currentLocation.longitude }
//     : null;

//   if (driverLocation && !isPlausibleDriverLocation(driverLocation)) {
//     console.warn(
//       `[PROXIMITY] ⚠️ Driver ki GPS location suspicious lag rahi hai (${driverLocation.latitude}, ${driverLocation.longitude}) ` +
//       `— expected bounds ke bahar hai, isko ignore karke fallback warehouse point use karenge`
//     );
//     driverLocation = null;
//   }

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

//   console.log(
//     `[PROXIMITY] Resolved starting point → source: ${usedFallbackStart ? 'FALLBACK_WAREHOUSE' : (driverLocation ? 'DRIVER_LIVE_GPS' : 'NONE')} | ` +
//     `coords: ${driverLocation ? JSON.stringify(driverLocation) : 'null'} | driverId: ${driverId}`
//   );

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

//   if (driverLocation && upcomingRaw.length > 0) {
//     console.log(
//       `[PROXIMITY] Distance-from-driver ke hisaab se sort karenge — ${upcomingRaw.length} delivery(ies), priority sirf display ke liye hai` +
//       `${usedFallbackStart ? ' (using fallback warehouse start point)' : ''}`
//     );

//     const distanceResults = await computeDistancesFromPoint(driverLocation, upcomingRaw, getRankingCoords);

//     distanceResults.sort((a, b) => a.distanceKm - b.distanceKm);

//     distanceResults.forEach(r => {
//       console.log(`[PROXIMITY-DISTANCE] driverPoint: ${JSON.stringify(driverLocation)} | delivery: ${r.delivery.trackingNumber} | destination: ${r.delivery.deliveryLocation?.address} | distanceKm: ${r.distanceKm} | source: ${r.source}`);
//     });

//     orderedUpcoming = distanceResults.map(r => ({
//       ...r.delivery,
//       __distanceKm: r.distanceKm,
//       __etaMin: r.durationMin,
//       __distanceSource: r.source
//     }));
//   }

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

//     let effectivePickupLocation = delivery.pickupLocation;
//     let routeChain = [];

//     if (delivery.driverId) {
//       try {
//         const driverIdForSort = delivery.driverId._id || delivery.driverId;
//         const sorted = await exports.getSortedUpcomingForDriver(driverIdForSort);
//         const myIndex = sorted.upcoming.findIndex(u => u.id === delivery._id.toString());

//         console.log(`[DELIVERY-DETAILS] deliveryId: ${deliveryId} | myRank: ${myIndex >= 0 ? myIndex + 1 : 'not in upcoming list'} of ${sorted.upcoming.length}`);

//         routeChain.push({ label: 'Factory (Start)', isFactory: true, isCurrent: false, distance: null });
//         sorted.upcoming.forEach(u => {
//           routeChain.push({
//             label: u.trackingNumber,
//             isFactory: false,
//             isCurrent: u.id === delivery._id.toString(),
//             distance: u.distanceFromDriver
//           });
//         });

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
//       routeChain,
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
const Order = require('../../models/Order')
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
 
// ✅ IST (India) ke hisaab se "aaj" ka 00:00 nikaalta hai — date-boundary compare ke liye
function startOfTodayIST() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  istNow.setUTCHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - istOffsetMs);
}
 
// ✅ Purane din ki (aaj se pehle ki) saari UPCOMING deliveries ko
// "Returned_to_Factory" mark kar deta hai — jaise hi driver apni list
// dobara fetch karega (naya delivery assign hone ke baad), stale entries
// automatically queue se hat jaayengi. Data delete nahi hota, sirf status
// change hota hai — DeliveryStatusHistory mein audit trail reh jaata hai.
// async function autoReturnStaleDeliveries(driverId) {
//   const todayStart = startOfTodayIST();
 
//   const staleDeliveries = await Delivery.find({
//     driverId,
//     status: { $in: UPCOMING_STATUSES },
//     $or: [
//       { scheduledDeliveryTime: { $ne: null, $lt: todayStart } },
//       { scheduledDeliveryTime: null, createdAt: { $lt: todayStart } }
//     ]
//   });
 
//   if (staleDeliveries.length === 0) return { flushedCount: 0, flushed: [] };
 
//   console.log(`[STALE-FLUSH] driverId: ${driverId} | ${staleDeliveries.length} purani pending delivery(ies) mili — factory-return maan ke queue se hata rahe hain`);
 
//   const flushed = [];
//   for (const d of staleDeliveries) {
//     const previousStatus = d.status;
//     d.status = 'Returned_to_Factory';
//     d.returnedToFactoryAt = new Date();
//     d.returnedToFactoryReason = `Auto-flushed: previous day ki pending delivery thi (status "${previousStatus}"), parcel factory mein submit maana gaya`;
//     await d.save();
 
//     try {
//       await DeliveryStatusHistory.create({
//         deliveryId: d._id,
//         status: 'Returned_to_Factory',
//         previousStatus,
//         timestamp: new Date(),
//         remarks: 'Auto-returned to factory: stale pending delivery from a previous day'
//       });
//     } catch (histErr) {
//       console.error(`[STALE-FLUSH] History log fail hui ${d.trackingNumber} ke liye: ${histErr.message}`);
//     }
 
//     console.log(`[STALE-FLUSH] ✅ ${d.trackingNumber} → Returned_to_Factory (pehle: ${previousStatus})`);
//     flushed.push(d.trackingNumber);
//   }
 
//   return { flushedCount: flushed.length, flushed };
// }
async function autoReturnStaleDeliveries(driverId) {
  const todayStart = startOfTodayIST();
 
  // ================================================================
  // ✅ FIX: pehle yahan `scheduledDeliveryTime` ko bhi check kiya jaata
  // tha — agar wo set thi (chahe future/aaj ki koi bhi date/time ho),
  // to delivery kabhi "stale" nahi maani jaati thi, bhale hi wo KAL
  // assign hui ho aur aaj tak "assigned"/"in_transit" hi padi ho. Yehi
  // wajah thi ki "kal assign ki gayi delivery aaj bhi Returned to
  // Factory nahi ban rahi" — kyunki admin ke form pe scheduledDeliveryTime
  // set ho jaati thi (aaj ya future ki), jo is check ko hamesha false
  // kar deti thi.
  //
  // AB: sirf ek hi sahi signal use karte hain — "yeh delivery KAB
  // CREATE/ASSIGN hui thi" (createdAt). Agar wo aaj se pehle (kisi
  // purane din) create hui thi aur ABHI TAK complete/cancel nahi hui,
  // to wo stale hai — scheduledDeliveryTime se koi farak nahi padta.
  // ================================================================
  const staleDeliveries = await Delivery.find({
    driverId,
    status: { $in: UPCOMING_STATUSES },
    createdAt: { $lt: todayStart }
  });
 
  console.log(`[STALE-FLUSH] driverId: ${driverId} | todayStart(IST): ${todayStart.toISOString()} | checked, found: ${staleDeliveries.length} stale`);
 
  if (staleDeliveries.length === 0) return { flushedCount: 0, flushed: [] };
 
  console.log(`[STALE-FLUSH] driverId: ${driverId} | ${staleDeliveries.length} purani pending delivery(ies) mili — factory-return maan ke queue se hata rahe hain`);
 
  const flushed = [];
  for (const d of staleDeliveries) {
    const previousStatus = d.status;
    d.status = 'Returned_to_Factory';
    d.returnedToFactoryAt = new Date();
    d.returnedToFactoryReason = `Auto-flushed: previous day ki pending delivery thi (status "${previousStatus}"), parcel factory mein submit maana gaya`;
    await d.save();
 
    // ✅ NAYA — linked Order ka status bhi sync karo, taaki admin panel
    // ke Orders list mein bhi wahi order "Returned to Factory" dikhe.
    if (d.orderId) {
      try {
        await Order.findOneAndUpdate(
          { orderNumber: d.orderId },
          { status: 'Returned_to_Factory' }   // ✅ FIX — capital, exact enum value ke hisaab se
        );
        console.log(`[STALE-FLUSH] ✅ Order "${d.orderId}" ka status bhi 'Returned_to_Factory' set kiya`);
      } catch (orderErr) {
        console.error(`[STALE-FLUSH] Order status update fail hui "${d.orderId}" ke liye: ${orderErr.message}`);
      }
    }
 
    try {
      await DeliveryStatusHistory.create({
        deliveryId: d._id,
        status: 'Returned_to_Factory',
        previousStatus,
        timestamp: new Date(),
        remarks: 'Auto-returned to factory: stale pending delivery from a previous day'
      });
    } catch (histErr) {
      console.error(`[STALE-FLUSH] History log fail hui ${d.trackingNumber} ke liye: ${histErr.message}`);
    }
 
    console.log(`[STALE-FLUSH] ✅ ${d.trackingNumber} → Returned_to_Factory (pehle: ${previousStatus})`);
    flushed.push(d.trackingNumber);
  }
 
  return { flushedCount: flushed.length, flushed };
}
exports.autoReturnStaleDeliveries = autoReturnStaleDeliveries;
 
// ================================================================
// ✅ NAYA: GLOBAL stale-flush — SAARE drivers ke liye ek saath chalata
// hai. Pehle stale-flush sirf TAB chalta tha jab koi admin/driver kisi
// specific page/API ko hit karta (list, details, my-delivery waghera).
// Iska matlab agar koi bhi us driver ke liye koi page na khole, to
// "Returned to Factory" kabhi trigger hi nahi hota tha — bhale hi
// delivery kitni bhi purani/stale ho jaaye.
//
// Ab yeh function app.js se ek BACKGROUND INTERVAL par (har kuch minute
// mein) automatically chalega — kisi page/click ka wait nahi karega.
// Isse "kal ki delivery aaj bhi Assigned dikh rahi hai" wala issue
// permanently solve ho jaata hai, chahe koi admin/driver app na bhi
// khole.
// ================================================================
async function flushAllStaleDeliveriesGlobally() {
  try {
    console.log(`[GLOBAL-STALE-FLUSH] 🔄 Run start at ${new Date().toISOString()}`);
 
    const activeDriverIds = await Delivery.distinct('driverId', {
      driverId: { $ne: null },
      status: { $in: UPCOMING_STATUSES }
    });
 
    console.log(`[GLOBAL-STALE-FLUSH] Checking ${activeDriverIds.length} driver(s) with active deliveries: ${activeDriverIds.join(', ')}`);
 
    if (activeDriverIds.length === 0) return { totalFlushed: 0 };
 
    let totalFlushed = 0;
    for (const dId of activeDriverIds) {
      try {
        const result = await autoReturnStaleDeliveries(dId);
        totalFlushed += result.flushedCount;
      } catch (err) {
        console.error(`[GLOBAL-STALE-FLUSH] Driver ${dId} ke liye fail hua:`, err.message);
      }
    }
 
    console.log(`[GLOBAL-STALE-FLUSH] ✅ Run complete — Total ${totalFlushed} stale delivery(ies) "Returned_to_Factory" mark ki gayi`);
 
    return { totalFlushed };
  } catch (err) {
    console.error('[GLOBAL-STALE-FLUSH] Failed:', err.message);
    return { totalFlushed: 0, error: err.message };
  }
}
exports.flushAllStaleDeliveriesGlobally = flushAllStaleDeliveriesGlobally;
 
async function getDefaultStartPoint() {
  try {
    const defaultPickup = await PickupLocation.findOne({ isDefault: true, isActive: true });
    if (defaultPickup?.coordinates?.latitude && defaultPickup?.coordinates?.longitude) {
      const coords = { latitude: defaultPickup.coordinates.latitude, longitude: defaultPickup.coordinates.longitude };
      console.log(`[PROXIMITY] Default pickup location: "${defaultPickup.name || defaultPickup.address}" | coords: ${JSON.stringify(coords)}`);
      if (!isPlausibleDriverLocation(coords)) {
        console.warn(`[PROXIMITY] ⚠️ Default pickup location ke coordinates hi suspicious hain (${coords.latitude}, ${coords.longitude}) — "Manage Pickup Locations" mein isko check/fix karo`);
      }
      return coords;
    }
    const anyPickup = await PickupLocation.findOne({ isActive: true }).sort({ createdAt: 1 });
    if (anyPickup?.coordinates?.latitude && anyPickup?.coordinates?.longitude) {
      const coords = { latitude: anyPickup.coordinates.latitude, longitude: anyPickup.coordinates.longitude };
      console.log(`[PROXIMITY] Fallback pickup location (no default set): "${anyPickup.name || anyPickup.address}" | coords: ${JSON.stringify(coords)}`);
      if (!isPlausibleDriverLocation(coords)) {
        console.warn(`[PROXIMITY] ⚠️ Fallback pickup location ke coordinates hi suspicious hain (${coords.latitude}, ${coords.longitude}) — "Manage Pickup Locations" mein isko check/fix karo`);
      }
      return coords;
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
 
// ✅ Driver ke current point se HAR delivery ka direct distance nikaalta hai
// (chain/hop wise nahi — seedha driver se). Isi se pure "distance from driver"
// ke hisaab se ascending sort hoga.
async function computeDistancesFromPoint(currentPoint, pool, getCoords) {
  const withCoords = pool.map(d => ({ delivery: d, coords: getCoords(d) }));
  const validEntries = withCoords.filter(e => e.coords);
  const invalidEntries = withCoords.filter(e => !e.coords);
 
  invalidEntries.forEach(e => {
    console.warn(
      `[PROXIMITY] ⚠️ Coordinates missing for ${e.delivery.trackingNumber} | status: ${e.delivery.status} | ` +
      `deliveryLocation.coords: ${JSON.stringify(e.delivery.deliveryLocation?.coordinates || null)}`
    );
  });
 
  let googleDistances = null;
  if (validEntries.length > 0) {
    try {
      googleDistances = await getGoogleDistanceMatrix(currentPoint, validEntries.map(e => e.coords));
    } catch (e) {
      googleDistances = null;
    }
  }
 
  const results = validEntries.map((e, idx) => {
    const g = googleDistances?.[idx];
    if (g && g.distanceKm !== null && g.distanceKm !== undefined) {
      return { delivery: e.delivery, distanceKm: g.distanceKm, durationMin: g.durationMin ?? null, source: 'google' };
    }
    const distanceKm = calculateDistance(
      currentPoint.latitude, currentPoint.longitude,
      e.coords.latitude, e.coords.longitude
    );
    return { delivery: e.delivery, distanceKm, durationMin: null, source: 'haversine' };
  });
 
  invalidEntries.forEach(e => {
    results.push({ delivery: e.delivery, distanceKm: Infinity, durationMin: null, source: 'none' });
  });
 
  return results;
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
  // ✅ Sabse pehle purane din ki stale deliveries flush karo
  await autoReturnStaleDeliveries(driverId);
 
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
 
  console.log(
    `[PROXIMITY] Resolved starting point → source: ${usedFallbackStart ? 'FALLBACK_WAREHOUSE' : (driverLocation ? 'DRIVER_LIVE_GPS' : 'NONE')} | ` +
    `coords: ${driverLocation ? JSON.stringify(driverLocation) : 'null'} | driverId: ${driverId}`
  );
 
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
 
  // ✅ Priority helper — 'urgent'/'high' pehle, phir 'medium', phir 'low'
  const priorityRank = (p) => {
    const key = String(p || '').toLowerCase().trim();
    return PRIORITY_ORDER.hasOwnProperty(key) ? PRIORITY_ORDER[key] : 99;
  };
 
  if (driverLocation && upcomingRaw.length > 0) {
    console.log(
      `[PROXIMITY] Priority-first, phir distance-from-driver ke hisaab se sort karenge — ${upcomingRaw.length} delivery(ies)` +
      `${usedFallbackStart ? ' (using fallback warehouse start point)' : ''}`
    );
 
    const distanceResults = await computeDistancesFromPoint(driverLocation, upcomingRaw, getRankingCoords);
 
    // ================================================================
    // ✅ FIX: pehle sirf distance se sort hota tha, priority sirf card
    // pe dikhane ke liye thi ("high"/"urgent" hone ka koi asar order pe
    // nahi padta tha). Ab pehle PRIORITY tier ke hisaab se group hota
    // hai (urgent/high sabse upar), aur SAME priority tier ke andar
    // distance (route) ke hisaab se nearest-first order milta hai.
    // ================================================================
    distanceResults.sort((a, b) => {
      const prioDiff = priorityRank(a.delivery.priority) - priorityRank(b.delivery.priority);
      if (prioDiff !== 0) return prioDiff;
      return a.distanceKm - b.distanceKm;
    });
 
    distanceResults.forEach(r => {
      console.log(`[PROXIMITY-DISTANCE] priority: ${r.delivery.priority} | delivery: ${r.delivery.trackingNumber} | destination: ${r.delivery.deliveryLocation?.address} | distanceKm: ${r.distanceKm} | source: ${r.source}`);
    });
 
    orderedUpcoming = distanceResults.map(r => ({
      ...r.delivery,
      __distanceKm: r.distanceKm,
      __etaMin: r.durationMin,
      __distanceSource: r.source
    }));
  } else if (upcomingRaw.length > 0) {
    // ✅ Driver location bhi na mile to bhi kam se kam priority ke
    // hisaab se sort karo (distance ke bina) — pehle yahan bilkul
    // creation-order me hi reh jaata tha, priority ka koi asar nahi tha.
    orderedUpcoming = [...upcomingRaw].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  }
 
  const buildItem = (d, idx) => {
    const hasProximityDistance = d.__distanceKm !== undefined && d.__distanceKm !== Infinity;
 
    // ✅ FIX: pehle yahan `d.deliveryLocation.address.split(',')[0]` seedha
    // call hota tha — agar KISI EK delivery ka address missing/undefined
    // ho (jaise corrupt/badly-saved data), to `.split` TypeError throw
    // karta, poora getSortedUpcomingForDriver() function reject ho jaata,
    // aur us DRIVER ki SAARI deliveries (list page pe) rank/sort ke bina
    // "-" dikhne lagti thi (fallback catch block me ja girti thi).
    // Ab safe optional-chaining ke saath fallback text milega, crash nahi.
    const deliveryAddr = d.deliveryLocation?.address || 'Address not available';
    const pickupAddr = d.pickupLocation?.address || 'Address not available';
 
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
      deliveryAddress: deliveryAddr.split(',')[0] || deliveryAddr,
      pickupAddress: pickupAddr.split(',')[0] || pickupAddr,
      distance: hasProximityDistance
        ? `${d.__distanceKm.toFixed(1)} km`
        : (d.distance ? `${d.distance.toFixed(1)} km` : 'N/A'),
      nearestRank: idx !== undefined ? idx + 1 : null,
      distanceFromDriver: hasProximityDistance ? `${d.__distanceKm.toFixed(1)} km` : null,
      etaFromDriver: d.__etaMin ? `${d.__etaMin} min` : null,
      packageInfo: d.packageDetails?.description ? `${d.packageDetails.quantity || 1}x ${d.packageDetails.description}` : 'Package',
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
 
    let effectivePickupLocation = delivery.pickupLocation;
    let routeChain = [];
 
    if (delivery.driverId) {
      try {
        const driverIdForSort = delivery.driverId._id || delivery.driverId;
        const sorted = await exports.getSortedUpcomingForDriver(driverIdForSort);
        const myIndex = sorted.upcoming.findIndex(u => u.id === delivery._id.toString());
 
        console.log(`[DELIVERY-DETAILS] deliveryId: ${deliveryId} | myRank: ${myIndex >= 0 ? myIndex + 1 : 'not in upcoming list'} of ${sorted.upcoming.length}`);
 
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
      routeChain,
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