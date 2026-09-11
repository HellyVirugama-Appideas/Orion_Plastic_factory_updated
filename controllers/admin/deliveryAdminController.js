// const Delivery = require('../../models/Delivery');
// const Order = require('../../models/Order');
// const Driver = require('../../models/Driver');
// const Customer = require('../../models/Customer');
// const DeliveryStatusHistory = require('../../models/DeliveryStatusHistory');
// const Notification = require('../../models/Notification');
// const mongoose = require('mongoose');
// const { successResponse, errorResponse } = require('../../utils/responseHelper');
// const { sendNotification } = require("../../utils/sendNotification")
// const { getSortedUpcomingForDriver, autoReturnStaleDeliveries } = require('../Driver/deliveryController');
// const { PickupLocation } = require('../../models/Order');
// const { calculateDistance } = require('../../utils/geoHelper');


// // ================================================================
// // ✅ GREEDY NEAREST-NEIGHBOR ROUTE CHAIN BUILDER
// // ----------------------------------------------------------------
// // Jab bhi driver ko koi NAYI delivery assign hoti hai, yeh function
// // us driver ki SAARI ACTIVE (abhi tak delivered/cancelled na hui)
// // deliveries ko dobara, sahi order me chain karta hai:
// //
// //   1) Pehla stop = driver ki ABHI ki LIVE location se sabse NEAREST
// //      delivery — iska pickup = Factory (apna originalPickupLocation).
// //   2) Dusra stop = pehle stop ke DROPOFF point se sabse NEAREST
// //      baaki delivery — iska pickup = pehle stop ka dropoff.
// //   3) Aise hi aage — har stop, pichle stop ke dropoff se sabse
// //      nearest wali delivery choose karta hai (classic greedy
// //      nearest-neighbor route).
// //
// // Yeh chain sirf ISI MOMENT compute hoti hai (jab naya order assign
// // hota hai) aur phir previousDeliveryId/nextDeliveryId + pickupLocation
// // ke through DB me STORE ho jaati hai. Iske baad — jab tak koi naya
// // order is driver ko assign na ho — yeh chain FIX rehti hai. Refresh
// // karne se, driver GPS move hone se, ya ek delivery complete karne se
// // yeh dobara recompute NAHI hoti (completion sirf status change karta
// // hai, chain ko touch nahi karta) — isi se route chain UI me stops
// // remove/reshuffle nahi hote, sirf color/status change hota hai.
// // ================================================================
// async function rebuildDriverRouteChain(driverId) {
//   const driver = await Driver.findById(driverId).select('currentLocation');

//   let currentPoint = (driver?.currentLocation?.latitude && driver?.currentLocation?.longitude)
//     ? { latitude: driver.currentLocation.latitude, longitude: driver.currentLocation.longitude }
//     : null;

//   // Sirf abhi tak ACTIVE (delivered/cancelled/completed nahi) deliveries.
//   // createdAt ascending fallback ke liye rakha hai (agar driver GPS na mile).
//   const activeDeliveries = await Delivery.find({
//     driverId,
//     status: { $nin: ['delivered', 'completed', 'cancelled', 'Delivered', 'Completed', 'Cancelled'] }
//   }).sort({ createdAt: 1 });

//   if (activeDeliveries.length === 0) {
//     console.log(`[ROUTE-CHAIN] Driver ${driverId} — koi active delivery nahi, chain rebuild skip.`);
//     return;
//   }

//   const remaining = [...activeDeliveries];
//   const orderedChain = [];

//   // ✅ FIX: pehle priority ka koi asar route order pe nahi padta tha —
//   // sirf pure nearest-neighbor (jo bhi geographically closest ho) chain
//   // ban jaati thi, chahe wo 'low' priority hi kyun na ho. Ab pehle
//   // priority TIER ke hisaab se group karte hain (urgent/high sabse
//   // pehle, phir medium, phir low), aur HAR TIER ke ANDAR hi nearest-
//   // neighbor greedy routing hoti hai — driver ke current point se (ya
//   // pichle tier ke aakhri stop se) continue karke.
//   const PRIORITY_TIER_ORDER = { urgent: 0, high: 0, medium: 1, low: 2 };
//   const tierOf = (del) => {
//     const key = String(del.priority || '').toLowerCase().trim();
//     return PRIORITY_TIER_ORDER.hasOwnProperty(key) ? PRIORITY_TIER_ORDER[key] : 1; // unknown priority -> medium tier
//   };

//   const tiers = [[], [], []]; // 0 = urgent/high, 1 = medium, 2 = low
//   remaining.forEach(del => tiers[tierOf(del)].push(del));

//   for (const tierGroup of tiers) {
//     while (tierGroup.length > 0) {
//       let nextIndex = 0; // ✅ default: agar current point na mile, creation-order (already sorted) follow karo

//       if (currentPoint) {
//         let minDist = Infinity;
//         tierGroup.forEach((del, idx) => {
//           const coords = del.deliveryLocation?.coordinates;
//           if (coords?.latitude && coords?.longitude) {
//             const dist = calculateDistance(currentPoint.latitude, currentPoint.longitude, coords.latitude, coords.longitude);
//             if (dist < minDist) {
//               minDist = dist;
//               nextIndex = idx;
//             }
//           }
//         });
//       }

//       const chosen = tierGroup.splice(nextIndex, 1)[0];
//       orderedChain.push(chosen);

//       // Agla "current point" — is stop ka dropoff (agar valid coords hain)
//       const chosenCoords = chosen.deliveryLocation?.coordinates;
//       if (chosenCoords?.latitude && chosenCoords?.longitude) {
//         currentPoint = { latitude: chosenCoords.latitude, longitude: chosenCoords.longitude };
//       }
//     }
//   }

//   console.log(`[ROUTE-CHAIN] Driver ${driverId} — rebuilt order: ${orderedChain.map(d => d.trackingNumber).join(' → ')}`);

//   for (let i = 0; i < orderedChain.length; i++) {
//     const cur = orderedChain[i];
//     const prev = i > 0 ? orderedChain[i - 1] : null;
//     const next = i < orderedChain.length - 1 ? orderedChain[i + 1] : null;

//     cur.previousDeliveryId = prev ? prev._id : null;
//     cur.nextDeliveryId = next ? next._id : null;

//     if (prev) {
//       cur.pickupLocation = {
//         address: prev.deliveryLocation.address,
//         contactPerson: prev.deliveryLocation.contactPerson,
//         contactPhone: prev.deliveryLocation.contactPhone,
//         city: prev.deliveryLocation.city,
//         state: prev.deliveryLocation.state,
//         pincode: prev.deliveryLocation.pincode,
//         landmark: prev.deliveryLocation.landmark,
//         coordinates: prev.deliveryLocation.coordinates
//       };
//     } else if (cur.originalPickupLocation?.address) {
//       cur.pickupLocation = cur.originalPickupLocation;
//     }

//     await cur.save();
//   }
// }


// // ✅ "Factory (Start)" ke liye hamesha us ORDER ka apna dynamic pickup
// // location use karo (jo admin ne order-create time pe select kiya tha) —
// // har order alag pickup branch/location se ho sakta hai, isliye kabhi bhi
// // ek single "master default" location har order pe hardcode nahi karni.
// // Master Pickup Locations table sirf tab use hota hai jab order/delivery
// // ka apna data genuinely corrupt/missing ho — normal case mein kabhi trigger
// // nahi hona chahiye.
// // ✅ India ke bounds ke bahar wale (jaise Abu Dhabi glitch) ya missing
// // coordinates ko "implausible" maankar reject karta hai.
// // ✅ Sirf basic sanity check — genuinely corrupt/missing coordinates (jaise
// // 0,0, undefined, ya out-of-world-bounds values) ko reject karta hai.
// // ⚠️ PEHLE ye function sirf INDIA ke bounds (lat 6-38, lng 68-98) accept
// // karta tha — jo galat assumption thi. Business ab UAE/Dubai se bhi pickup
// // karta hai (lat ~24, lng ~54), jo India ke bounds se bahar hai, isliye wo
// // hamesha "implausible/corrupt" maan liya jaata tha aur ek alag (India wali)
// // default location par silently switch ho jaata tha. Ab koi bhi valid
// // real-world coordinate accept hoga, chahe wo kisi bhi desh ka ho.
// function isPlausibleLocation(loc) {
//   if (loc?.latitude == null || loc?.longitude == null) return false;
//   const lat = Number(loc.latitude);
//   const lng = Number(loc.longitude);
//   if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
//   if (lat === 0 && lng === 0) return false; // classic "unset" placeholder
//   return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
// }

// // ✅ "Factory (Start)" ke liye — SABSE PEHLE order ka apna asli chuna hua
// // pickup location (originalPickupLocation) use karo, kyunki alag-alag
// // orders alag-alag pickup locations (branches/warehouses) se ho sakte hain.
// // SIRF tab MASTER default pickup pe fallback karo jab wo record missing ho
// // ya uske coordinates clearly galat/corrupt hon (purane bug se bache records).
// async function resolveFactoryLocation(delivery) {
//   // ⚠️ IMPORTANT: sirf originalPickupLocation trust karo — delivery.pickupLocation
//   // hamesha CHAINED value hoti hai (pichli delivery ki jagah se), asli factory
//   // nahi. Isko fallback maanna hi bug tha (kisi aur delivery ki location "Factory
//   // (Start)" ban jaati thi jab originalPickupLocation missing hoti thi).
//   const ownPickup = delivery.originalPickupLocation;

//   if (ownPickup?.address && isPlausibleLocation(ownPickup?.coordinates)) {
//     return { address: 'Factory (Start)', coordinates: ownPickup.coordinates };
//   }

//   // ✅ SAFETY NET: resolveFactoryLocation is only ever called for the FIRST
//   // delivery in a driver's chain (rank #1 / no previous stop). For that exact
//   // case, delivery.pickupLocation was ALREADY set correctly at creation time
//   // from order.pickupLocation (see createDeliveryFromOrder) — it only becomes
//   // a "chained" (non-factory) value for deliveries LATER in the chain, which
//   // never reach this function. So before falling back to the generic master
//   // default (which is the SAME location for every order and caused the
//   // "static Unja/Ahmedabad" bug), try the delivery's own stored pickup first.
//   // This self-heals old records even without running the backfill migration.
//   const storedPickup = delivery.pickupLocation;
//   if (storedPickup?.address && isPlausibleLocation(storedPickup?.coordinates)) {
//     console.warn(`[FACTORY-LOCATION] ⚠️ ${delivery.trackingNumber} ka originalPickupLocation missing hai — apne stored pickupLocation se recover kar rahe hain (${storedPickup.address})`);
//     return { address: 'Factory (Start)', coordinates: storedPickup.coordinates };
//   }

//   console.warn(`[FACTORY-LOCATION] ⚠️ ${delivery.trackingNumber} ka originalPickupLocation aur pickupLocation dono missing/corrupt hain — verified default pe fallback kar rahe hain`);
//   const verifiedDefault = await getVerifiedFactoryLocation();
//   if (verifiedDefault) return verifiedDefault;

//   // Kuch na mile to jo tha wahi rakho (kam se kam address dikhega)
//   return { address: 'Factory (Start)', coordinates: ownPickup?.coordinates || null };
// }

// // ✅ Master Pickup Locations table se verified default factory location.
// // Ab default entry ke coordinates bhi plausibility-check hote hain — agar
// // wo khud galat/corrupt hain (jaise UAE coordinates ke saath India address),
// // to usse skip karke koi aur valid active pickup location dhoondhi jaati hai.
// async function getVerifiedFactoryLocation() {
//   try {
//     const defaultPickup = await PickupLocation.findOne({ isDefault: true, isActive: true });
//     if (defaultPickup?.coordinates && isPlausibleLocation(defaultPickup.coordinates)) {
//       return {
//         address: 'Factory (Start)',
//         coordinates: {
//           latitude: defaultPickup.coordinates.latitude,
//           longitude: defaultPickup.coordinates.longitude
//         }
//       };
//     }
//     if (defaultPickup) {
//       console.warn(`[FACTORY-LOCATION] ⚠️ Default pickup location "${defaultPickup.name || defaultPickup.address}" ke coordinates hi galat hain (${defaultPickup.coordinates?.latitude}, ${defaultPickup.coordinates?.longitude}) — "Manage Pickup Locations" mein isko fix karo. Koi aur valid pickup dhoond rahe hain...`);
//     }

//     // Default nahi mila ya galat tha — koi bhi active pickup jiske coordinates plausible hon
//     const candidates = await PickupLocation.find({ isActive: true }).sort({ createdAt: 1 });
//     const validCandidate = candidates.find(p => p.coordinates && isPlausibleLocation(p.coordinates));
//     if (validCandidate) {
//       return {
//         address: 'Factory (Start)',
//         coordinates: {
//           latitude: validCandidate.coordinates.latitude,
//           longitude: validCandidate.coordinates.longitude
//         }
//       };
//     }

//     console.error('[FACTORY-LOCATION] ❌ Koi bhi active Pickup Location valid coordinates ke saath nahi mili — "Manage Pickup Locations" mein data check karo');
//   } catch (err) {
//     console.error('[FACTORY-LOCATION] getVerifiedFactoryLocation error:', err.message);
//   }
//   return null;
// }


// // ============= RENDER DELIVERIES LIST =============
// exports.renderDeliveriesList = async (req, res) => {
//   try {
//     const {
//       status,
//       search,
//       startDate,
//       endDate,
//       driverId
//     } = req.query;

//     const query = {};
//     if (status) query.status = status;
//     if (driverId) query.driverId = driverId;

//     if (search) {
//       query.$or = [
//         { trackingNumber: { $regex: search, $options: 'i' } },
//         { orderId: { $regex: search, $options: 'i' } }
//       ];
//     }

//     if (startDate || endDate) {
//       query.createdAt = {};
//       if (startDate) query.createdAt.$gte = new Date(startDate);
//       if (endDate) query.createdAt.$lte = new Date(endDate);
//     }

//     // ================================================================
//     // ✅ FIX: "Returned to Factory" stale-delivery flush ab list fetch
//     // hone se PEHLE chalti hai, taaki isi render mein updated status
//     // dikhe. Pehle yeh flush har driver-group ke liye "getSortedUpcoming
//     // ForDriver()" ke andar chalti thi — jo Delivery.find(query) (upar)
//     // ke BAAD call hota tha. Matlab: page pe jo data dikhta tha wo
//     // FLUSH SE PEHLE ka (purana/stale) hota tha — status update ho jaata
//     // tha DB mein, lekin usi refresh mein screen pe nahi dikhta tha,
//     // sirf AGLE refresh pe dikhta (ya kabhi nahi agar list dobara na
//     // khole). Ab pehle hi saare active drivers ke liye flush chala ke,
//     // uske BAAD hi list DB se fetch karte hain — hamesha fresh status.
//     // ================================================================
//     try {
//       const activeDriverIds = await Delivery.distinct('driverId', { driverId: { $ne: null } });
//       for (const dId of activeDriverIds) {
//         try {
//           await autoReturnStaleDeliveries(dId);
//         } catch (flushErr) {
//           console.error(`[DELIVERIES-LIST] Stale-flush failed for driver ${dId}:`, flushErr.message);
//         }
//       }
//     } catch (distinctErr) {
//       console.error('[DELIVERIES-LIST] Could not fetch distinct driverIds for stale-flush:', distinctErr.message);
//     }

//     let deliveries = await Delivery.find(query)
//       .populate('customerId', 'name email phone companyName customerId')
//       .populate('driverId', 'name phone vehicleNumber currentLocation')
//       .sort({ createdAt: -1 })
//       .lean();

//     console.log(`[DELIVERIES-LIST] Query: ${JSON.stringify(query)} | Raw deliveries fetched from DB: ${deliveries.length}`);

//     // === Proximity Sorting ===
//     const driverGroups = {};
//     for (const del of deliveries) {
//       const dId = del.driverId?._id?.toString() || 'unassigned';
//       if (!driverGroups[dId]) driverGroups[dId] = [];
//       driverGroups[dId].push(del);
//     }

//     console.log(`[DELIVERIES-LIST] Driver groups: ${Object.entries(driverGroups).map(([k, v]) => `${k}(${v.length})`).join(', ')}`);

//     let finalDeliveries = [];

//     for (const [dId, group] of Object.entries(driverGroups)) {
//       if (dId === 'unassigned') {
//         finalDeliveries.push(...group);
//         continue;
//       }

//       try {
//         const sorted = await getSortedUpcomingForDriver(dId);
//         const upcomingMap = new Map(sorted.upcoming.map(item => [item.id, item]));

//         const orderedGroup = group
//           .map(del => {
//             const sortedItem = upcomingMap.get(del._id.toString());
//             const stLower = (del.status || '').toLowerCase();
//             const isNonRoutable = ['returned_to_factory'].includes(stLower);

//             return {
//               ...del,
//               __nearestRank: sortedItem ? sortedItem.nearestRank : null,
//               __distance: isNonRoutable
//                 ? null
//                 : (sortedItem ? sortedItem.distanceFromDriver : (del.distance ? `${del.distance.toFixed(1)} km` : null)),
//               __hasRank: !!sortedItem,
//               __sortKey: sortedItem ? sortedItem.nearestRank : 999,
//               deliveryLocation: del.deliveryLocation
//             };
//           })
//           .sort((a, b) => a.__sortKey - b.__sortKey);

//         // ✅ FIX: pehle yahan ek loop tha jo har delivery ka pickupLocation
//         // is LIVE proximity-sorted (__sortKey) order ke hisaab se dobara
//         // overwrite kar deta tha (previous item ka deliveryLocation, ya
//         // resolveFactoryLocation agar rank #1 ban gaya). Driver GPS move
//         // karte hi yeh order refresh pe badal jaata tha — isi wajah se
//         // list me bhi delivery complete karke agli start karne ke baad
//         // pickup "Factory (Start)" galat dikhta tha.
//         //
//         // delivery.pickupLocation already assignment ke time (fixed
//         // previousDeliveryId chain se) sahi set ho chuka hota hai —
//         // isliye yahan usse dobara compute/overwrite karne ki zaroorat
//         // nahi hai. __nearestRank/__distance columns (jo sirf "driver ke
//         // current location se kitni door hai" dikhane ke liye hain) waise
//         // hi live rehte hain — sirf pickupLocation ab STATIC/correct hai.

//         finalDeliveries.push(...orderedGroup);
//         console.log(`[DELIVERIES-LIST] Driver ${dId}: ${orderedGroup.length} deliveries pushed to finalDeliveries`);

//       } catch (e) {
//         console.error(`[DELIVERIES-LIST] ⚠️ Sorting failed for driver ${dId} — pushing group as-is (fallback). Error: ${e.message}`);
//         console.error(e.stack);
//         finalDeliveries.push(...group);
//       }
//     }

//     console.log(`[DELIVERIES-LIST] Final total: ${finalDeliveries.length}`);
//     console.log(`[DELIVERIES-LIST] Sending all ${finalDeliveries.length} deliveries to DataTables (client-side pagination)`);

//     // Stats
//     const stats = await Delivery.aggregate([{
//       $facet: {
//         total: [{ $count: 'count' }],
//         delivered: [{ $match: { status: 'delivered' } }, { $count: 'count' }],
//         inTransit: [{ $match: { status: { $in: ['in_transit', 'assigned', 'picked_up', 'out_for_delivery'] } } }, { $count: 'count' }],
//         pending: [{ $match: { status: { $in: ['pending', 'pending_acceptance'] } } }, { $count: 'count' }]
//       }
//     }]);

//     const statistics = {
//       total: stats[0].total[0]?.count || 0,
//       delivered: stats[0].delivered[0]?.count || 0,
//       inTransit: stats[0].inTransit[0]?.count || 0,
//       pending: stats[0].pending[0]?.count || 0
//     };

//     res.render('deliveries_list', {
//       title: 'Deliveries Management',
//       user: req.user,
//       deliveries: finalDeliveries,
//       stats: statistics,
//       pagination: {
//         total: finalDeliveries.length,
//         page: 1,
//         pages: 1,
//         limit: finalDeliveries.length
//       },
//       filters: { status, search, startDate, endDate, driverId },
//       url: req.originalUrl,
//       messages: req.flash()
//     });

//   } catch (error) {
//     console.error('[DELIVERIES-LIST] Error:', error);
//     req.flash('error', 'Failed to load deliveries');
//     res.redirect('/admin/dashboard');
//   }
// };

// exports.renderDeliveryDetails = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
//       req.flash('error', 'Invalid delivery ID');
//       return res.redirect('/admin/deliveries');
//     }

//     let delivery = await Delivery.findById(deliveryId)
//       .populate({
//         path: 'customerId',
//         model: 'Customer',
//         select: 'name email phone companyName customerId'
//       })
//       .populate({
//         path: 'driverId',
//         select: 'name phone vehicleNumber profileImage currentLocation'
//       })
//       .populate('createdBy', 'name email')
//       .lean();

//     if (!delivery) {
//       req.flash('error', 'Delivery not found');
//       return res.redirect('/admin/deliveries');
//     }

//     // ================================================================
//     // ✅ FIX: yeh page pehle "Returned to Factory" stale-flush kabhi
//     // trigger hi nahi karta tha (kyunki iske pickup/chain logic ab
//     // getSortedUpcomingForDriver() call hi nahi karta — upar dekho).
//     // Isliye agar admin seedha kisi delivery ke details page pe aata
//     // tha (list page kholE bina), ya list page ek hi baar khola tha,
//     // to kal ki pending delivery "assigned" hi dikhti rehti thi, kabhi
//     // "Returned_to_Factory" nahi ban paati thi. Ab yahan explicitly
//     // is driver ka stale-flush chalate hain, aur agar ISI delivery ka
//     // status abhi-abhi flush se badla ho, to use turant re-fetch karke
//     // page pe naya (sahi) status dikhate hain.
//     // ================================================================
//     const driverIdForFlush = delivery.driverId?._id || delivery.driverId;
//     if (driverIdForFlush) {
//       try {
//         await autoReturnStaleDeliveries(driverIdForFlush);

//         const refreshedStatus = await Delivery.findById(deliveryId).select('status returnedToFactoryAt returnedToFactoryReason').lean();
//         if (refreshedStatus && refreshedStatus.status !== delivery.status) {
//           console.log(`[DELIVERY-DETAILS] Stale-flush ne is delivery ka status update kar diya: ${delivery.status} → ${refreshedStatus.status}`);
//           delivery.status = refreshedStatus.status;
//           delivery.returnedToFactoryAt = refreshedStatus.returnedToFactoryAt;
//           delivery.returnedToFactoryReason = refreshedStatus.returnedToFactoryReason;
//         }
//       } catch (flushErr) {
//         console.error('[DELIVERY-DETAILS] Stale-flush failed:', flushErr.message);
//       }
//     }

//     // ================================================================
//     // ✅ FIXED ROUTE CHAIN LOGIC (previousDeliveryId / nextDeliveryId walk)
//     // ----------------------------------------------------------------
//     // PEHLE: yeh function har render par getSortedUpcomingForDriver() se
//     // driver ki LIVE GPS proximity ke hisaab se dobara sort karta tha.
//     // Isse do problems ho rahi thi:
//     //   1) Driver jaise-jaise move karta, chain ka order/"my rank" refresh
//     //      har baar badal sakta tha — isliye pehli delivery complete karke
//     //      dusri start karne ke baad admin refresh karta to pickup location
//     //      galat tarike se "Factory (Start)" dikhne lagta tha (kyunki naya
//     //      proximity-sort myIndex ko 0 bana raha tha).
//     //   2) Completed delivery "upcoming" list se hi filter ho jaati thi,
//     //      isliye route chain se poori tarah GAYAB ho jaati thi.
//     //
//     // AB: chain ko delivery document par already maujood FIXED pointers
//     // (previousDeliveryId / nextDeliveryId) follow karke banate hain —
//     // yeh pointers sirf ek baar, assignment ke time set hote hain aur
//     // kabhi live GPS se badalte nahi. Completed/delivered stop chain se
//     // remove nahi hoti — bas "isCompleted" flag ke saath dikhti hai.
//     // ================================================================
//     let routeChain = [];

//     if (delivery.driverId) {
//       try {
//         // Step 1: Chain ke root tak peeche walk karo
//         let rootId = delivery._id;
//         let guard = 0;
//         while (guard < 50) {
//           const cur = await Delivery.findById(rootId).select('previousDeliveryId').lean();
//           if (!cur || !cur.previousDeliveryId) break;
//           rootId = cur.previousDeliveryId;
//           guard++;
//         }

//         // Step 2: Root se aage (nextDeliveryId) poora chain collect karo
//         const chainDocs = [];
//         let nodeId = rootId;
//         guard = 0;
//         while (nodeId && guard < 50) {
//           const node = await Delivery.findById(nodeId)
//             .select('trackingNumber status nextDeliveryId')
//             .lean();
//           if (!node) break;
//           chainDocs.push(node);
//           nodeId = node.nextDeliveryId;
//           guard++;
//         }

//         console.log(`[DELIVERY-DETAILS] Fixed chain length: ${chainDocs.length} | root: ${chainDocs[0]?.trackingNumber}`);

//         // Step 3: Route Chain build karo — Factory (Start) + har fixed stop
//         routeChain.push({ label: 'Factory (Start)', isFactory: true, isCurrent: false });

//         chainDocs.forEach((node) => {
//           const status = String(node.status || '').toLowerCase().trim();
//           routeChain.push({
//             label: node.trackingNumber,
//             isFactory: false,
//             isCurrent: node._id.toString() === delivery._id.toString(),
//             isCompleted: ['delivered', 'completed'].includes(status),
//             isCancelled: status === 'cancelled'
//           });
//         });

//       } catch (err) {
//         console.error('[DELIVERY-DETAILS] Chain resolution failed:', err.message);
//       }
//     }

//     // ✅ NOTE: delivery.pickupLocation ab yahan recompute NAHI karte.
//     // Yeh already assignment ke time (createDeliveryFromOrder mein)
//     // sahi chain ke saath set ho chuka hai — pehli delivery ke liye
//     // Factory, aur baad ki har delivery ke liye pichli delivery ka
//     // deliveryLocation. Usko yahan live-proximity se dobara overwrite
//     // karna hi galat "Factory se location aa raha hai" wala bug tha.

//     // Status History
//     const statusHistory = await DeliveryStatusHistory.find({ deliveryId: delivery._id })
//       .sort({ timestamp: -1 })
//       .populate('updatedBy.userId', 'name email')
//       .lean();

//     res.render('delivery_details', {
//       title: `Delivery ${delivery.trackingNumber}`,
//       user: req.user,
//       delivery,
//       statusHistory,
//       routeChain,
//       url: req.originalUrl,
//       messages: req.flash()
//     });

//   } catch (error) {
//     console.error('[DELIVERY-DETAILS] Error:', error);
//     req.flash('error', 'Failed to load delivery details');
//     res.redirect('/admin/deliveries');
//   }
// };

// // ============= RENDER CREATE DELIVERY FROM ORDER =============
// exports.renderCreateDeliveryFromOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(orderId)) {
//       req.flash('error', 'Invalid order ID');
//       return res.redirect('/admin/orders');
//     }

//     const order = await Order.findById(orderId)
//       .populate({
//         path: 'customerId',
//         model: 'Customer',
//         select: 'name email phone companyName customerId'
//       })
//       .lean();

//     if (!order) {
//       req.flash('error', 'Order not found');
//       return res.redirect('/admin/orders');
//     }

//     const existingDelivery = await Delivery.findOne({ orderId: order.orderNumber });
//     if (existingDelivery) {
//       req.flash('error', 'Delivery already exists for this order');
//       return res.redirect(`/admin/deliveries/${existingDelivery._id}`);
//     }

//     // ✅ NO silent hardcoded fallback here anymore. The pickup location must
//     // be exactly what was chosen at order-creation time (order.pickupLocation).
//     // If it's genuinely missing, we surface a warning instead of quietly
//     // showing a fake/static coordinate — that silent substitution was the
//     // root cause of the "static location" bug.
//     let locationWarning = null;
//     if (!order.pickupLocation?.coordinates?.latitude || !order.pickupLocation?.coordinates?.longitude) {
//       locationWarning = 'This order has no valid pickup coordinates saved. Please fix the pickup location on the order before creating a delivery.';
//       console.warn(`[RENDER-CREATE-DELIVERY] ⚠️ Order ${order.orderNumber} has missing/invalid pickupLocation.coordinates`);
//     }

//     if (!order.deliveryLocation?.coordinates?.latitude || !order.deliveryLocation?.coordinates?.longitude) {
//       locationWarning = (locationWarning ? locationWarning + ' ' : '') + 'This order has no valid delivery coordinates saved.';
//       console.warn(`[RENDER-CREATE-DELIVERY] ⚠️ Order ${order.orderNumber} has missing/invalid deliveryLocation.coordinates`);
//     }

//     if (locationWarning) {
//       req.flash('warning', locationWarning);
//     }

//     // Get available drivers
//     const drivers = await Driver.find({
//       isActive: true,
//       // isAvailable: true,
//       profileStatus: 'approved'
//     })

//       .select('name phone vehicleNumber profileImage isAvailable')
//       .lean();

//     res.render('delivery_create', {
//       title: `Create Delivery - ${order.orderNumber}`,
//       user: req.user,
//       order,
//       drivers,
//       url: req.originalUrl,
//       messages: req.flash()
//     });

//   } catch (error) {
//     console.error('[RENDER-CREATE-DELIVERY] Error:', error);
//     req.flash('error', 'Failed to load create delivery page');
//     res.redirect('/admin/orders');
//   }
// };

// exports.createDeliveryFromOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const {
//       customerId,
//       driverId,
//       scheduledPickupTime,
//       scheduledDeliveryTime,
//       instructions,
//       waypoints,
//       routeDistance,
//       routeDuration
//     } = req.body;

//     const order = await Order.findById(orderId)
//       .populate({
//         path: 'customerId',
//         model: 'Customer'
//       });

//     if (!order) {
//       req.flash('error', 'Order not found');
//       return res.redirect('/admin/orders');
//     }

//     const existing = await Delivery.findOne({ orderId: order.orderNumber });
//     if (existing) {
//       req.flash('error', 'Delivery already exists for this order');
//       return res.redirect(`/admin/deliveries/${existing._id}`);
//     }

//     const driver = await Driver.findById(driverId);
//     if (!driver) {
//       req.flash('error', 'Driver not found');
//       return res.redirect(`/admin/orders/${orderId}/create-delivery`);
//     }

//     if (driver.profileStatus !== 'approved') {
//       req.flash('warning', 'Note: Driver is not approved yet, but assigning anyway');
//       return res.redirect(`/admin/orders/${orderId}/create-delivery`);
//     }

//     // Generate tracking number
//     const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
//     const random = Math.floor(1000 + Math.random() * 9000);
//     const trackingNumber = `DEL${dateStr}${random}`;

//     // Parse waypoints
//     let parsedWaypoints = [];
//     if (waypoints) {
//       try {
//         parsedWaypoints = JSON.parse(waypoints);
//       } catch (e) {
//         console.error('Waypoints parse error:', e);
//       }
//     }

//     // ================================================================
//     // ✅ SIMPLE INITIAL SAVE — pickup abhi ke liye order ka apna original
//     // factory pickup hi rakhte hain. Delivery create hone ke turant baad
//     // rebuildDriverRouteChain() is driver ki SAARI active deliveries
//     // (isme yeh nayi wali bhi shamil hai) ko GREEDY NEAREST-NEIGHBOR se
//     // dobara sahi order me chain kar dega — first stop driver ke current
//     // location se nearest, uske baad uske dropoff se nearest, waghera.
//     // Isliye yahan koi manual previousDeliveryId/pickup-chaining nahi
//     // karni — sirf valid coordinates honi chahiye taaki record create ho
//     // sake, baaki rebuild function sambhal lega.
//     // ================================================================
//     const pickupLat = order?.pickupLocation?.coordinates?.latitude;
//     const pickupLng = order?.pickupLocation?.coordinates?.longitude;
//     const deliveryLat = order?.deliveryLocation?.coordinates?.latitude;
//     const deliveryLng = order?.deliveryLocation?.coordinates?.longitude;

//     if (!pickupLat || !pickupLng) {
//       req.flash('error', 'This order\'s pickup location has no valid coordinates. Please fix the pickup location before creating a delivery.');
//       return res.redirect(`/admin/deliveries/create-from-order/${orderId}`);
//     }

//     if (!deliveryLat || !deliveryLng) {
//       req.flash('error', 'This order\'s delivery location has no valid coordinates. Please fix the delivery location before creating a delivery.');
//       return res.redirect(`/admin/deliveries/create-from-order/${orderId}`);
//     }

//     const pickupCoords = { latitude: pickupLat, longitude: pickupLng };
//     const deliveryCoords = { latitude: deliveryLat, longitude: deliveryLng };

//     // ==================== CREATE DELIVERY ====================
//     const delivery = await Delivery.create({
//       trackingNumber,
//       orderId: order.orderNumber,
//       customerId: order.customerId?._id || null,
//       driverId,
//       vehicleNumber: driver.vehicleNumber,

//       // Original Factory Pickup (List view ke liye important, aur
//       // rebuildDriverRouteChain() rank #1 ban'ne par yehi use karta hai)
//       originalPickupLocation: order.pickupLocation,

//       // Placeholder — rebuildDriverRouteChain() ke baad sahi ho jayega
//       pickupLocation: {
//         ...order.pickupLocation,
//         coordinates: pickupCoords
//       },

//       deliveryLocation: {
//         ...order.deliveryLocation,
//         coordinates: deliveryCoords
//       },

//       packageDetails: {
//         description: order.items?.map(i => i.productName).join(', ') || 'Package',
//         quantity: order.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 1,
//         weight: order.items?.reduce((sum, i) => sum + (i.specifications?.weight || 0), 0) || 0
//       },

//       scheduledPickupTime: scheduledPickupTime ? new Date(scheduledPickupTime) : null,
//       scheduledDeliveryTime: scheduledDeliveryTime ? new Date(scheduledDeliveryTime) : null,
//       instructions,
//       waypoints: parsedWaypoints,
//       distance: parseFloat(routeDistance) || 0,
//       estimatedDuration: parseInt(routeDuration) || 0,
//       status: 'assigned',
//       priority: order.priority || 'medium',
//       createdBy: req.user._id
//     });

//     // ✅ Ab is driver ki poori active queue ko greedy nearest-neighbor se
//     // rebuild karo — yeh delivery.pickupLocation aur previousDeliveryId/
//     // nextDeliveryId sab ko sahi order me set kar dega.
//     let hasValidPreviousStop = false;
//     try {
//       await rebuildDriverRouteChain(driverId);
//       const refreshed = await Delivery.findById(delivery._id).select('previousDeliveryId pickupLocation');
//       hasValidPreviousStop = !!refreshed?.previousDeliveryId;
//       // refreshed pickupLocation ko notification text ke liye use karenge neeche
//       delivery.pickupLocation = refreshed?.pickupLocation || delivery.pickupLocation;
//     } catch (chainErr) {
//       console.error('[CREATE-DELIVERY] Route chain rebuild failed:', chainErr.message);
//     }

//     // Update order
//     order.deliveryId = delivery._id;
//     order.status = 'assigned';
//     await order.save();

//     // Status History
//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: 'assigned',
//       remarks: hasValidPreviousStop
//         ? `Delivery assigned to ${driver.name} — chained in optimized route`
//         : `Delivery assigned to ${driver.name}`,
//       updatedBy: {
//         userId: req.user._id,
//         userRole: req.user.role,
//         userName: req.user.name
//       }
//     });

//     // Notifications
//     if (driver.fcmToken) {
//       try {
//         const result = await sendNotification(driver.fcmToken, {
//           title: "Delivery Assigned 🚚",
//           body: `You have a new delivery. Pickup from ${delivery.pickupLocation?.address || 'location'}`,
//           deliveryId: delivery._id.toString(),
//           trackingNumber: delivery.trackingNumber,
//           type: "delivery_assigned"
//         });
//         if (result) {
//           console.log(`[CREATE-DELIVERY-NOTIF-SUCCESS] FCM push sent to driver ${driver._id}`);
//         } else {
//           console.warn(`[CREATE-DELIVERY-NOTIF] sendNotification returned null — check driver.fcmToken validity`);
//         }
//       } catch (pushErr) {
//         console.error("[CREATE-DELIVERY-FCM-ERROR]", pushErr.code || pushErr.message || pushErr);
//       }
//     } else {
//       console.warn(`No FCM token for driver ${driver._id} → assignment push notification skipped`);
//     }

//     try {
//       await Notification.create({
//         recipientId: driver._id,
//         recipientType: 'Driver',
//         type: 'delivery_assigned',
//         title: 'New Delivery Assigned',
//         message: `You have been assigned delivery ${delivery.trackingNumber}.`,
//         referenceId: delivery._id,
//         referenceModel: 'Delivery',
//         priority: `${delivery.priority}`,
//         createdAt: new Date()
//       });
//     } catch (notifErr) {
//       console.error("[NOTIF-ERROR]", notifErr.message);
//     }

//     console.log('[CREATE-DELIVERY] Success:', delivery.trackingNumber);
//     req.flash('success', 'Delivery created and driver assigned successfully!');
//     res.redirect(`/admin/deliveries/${delivery._id}`);

//   } catch (error) {
//     console.error('[CREATE-DELIVERY] Error:', error);
//     req.flash('error', error.message || 'Failed to create delivery');
//     res.redirect(`/admin/orders/${req.params.orderId}/create-delivery`);
//   }
// };

// // ============= CANCEL DELIVERY (ADMIN CAN ONLY CANCEL) =============
// exports.cancelDelivery = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;
//     const { remarks = 'Cancelled by admin' } = req.body;

//     const delivery = await Delivery.findById(deliveryId);
//     if (!delivery) {
//       return res.status(404).json({ success: false, message: 'Delivery not found' });
//     }

//     if (['Delivered', 'Cancelled'].includes(delivery.status)) {
//       return res.status(400).json({
//         success: false,
//         message: `Cannot cancel delivery in ${delivery.status} status`
//       });
//     }

//     const previousStatus = delivery.status;
//     delivery.status = 'Cancelled';
//     await delivery.save();

//     // Fetch driver
//     let driver = null;
//     if (delivery.driverId) {
//       driver = await Driver.findById(delivery.driverId).select('name fcmToken');

//       // Free the driver
//       await Driver.findByIdAndUpdate(delivery.driverId, {
//         isAvailable: true,
//         $unset: { currentLocation: "" } // optional: clear live location
//       });
//     }

//     // Update order if linked
//     if (delivery.orderId) {
//       await Order.updateOne(
//         { orderNumber: delivery.orderId },
//         { status: 'Cancelled' }
//       );
//     }

//     // Status history
//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: 'Cancelled',
//       previousStatus: previousStatus,
//       remarks: remarks,
//       updatedBy: {
//         userId: req.user._id,
//         userRole: req.user.role,
//         userName: req.user.name
//       }
//     });

//     // ────────────────────────────────────────────────
//     // NOTIFICATIONS – only if driver exists
//     // ────────────────────────────────────────────────
//     if (driver) {
//       console.log(`[CANCEL-NOTIF] Preparing for driver ${driver._id} (${driver.name})`);

//       // 1. Push Notification (FCM)
//       if (driver.fcmToken) {
//         console.log(`[CANCEL-FCM] Attempting send to: ${driver.fcmToken.substring(0, 20)}...`);
//         try {
//           const result = await sendNotification(driver.fcmToken, {
//             title: "Delivery Cancelled",
//             body: `Your assigned delivery ${delivery.trackingNumber} has been cancelled.\nReason: ${remarks}`,
//             deliveryId: delivery._id.toString(),
//             trackingNumber: delivery.trackingNumber,
//             reason: remarks,
//             type: "delivery_cancelled"
//           });
//           if (result) {
//             console.log(`[CANCEL-NOTIF-SUCCESS] FCM sent`);
//           } else {
//             console.warn(`[CANCEL-NOTIF] sendNotification returned null`);
//           }
//         } catch (pushErr) {
//           console.error("[CANCEL-FCM-ERROR]", pushErr.code || pushErr.message || pushErr);
//         }
//       } else {
//         console.warn("[CANCEL-NOTIF] No fcmToken for driver");
//       }

//       // 2. In-app Notification (consistent with schema)
//       try {
//         const notif = await Notification.create({
//           recipientId: driver._id,
//           recipientType: 'Driver',
//           type: 'delivery_cancelled',
//           title: 'Delivery Cancelled',
//           message: `Your assigned delivery ${delivery.trackingNumber} has been cancelled.\nReason: ${remarks}`,
//           referenceId: delivery._id,
//           referenceModel: 'Delivery',
//           priority: 'high',
//           createdAt: new Date()
//         });
//         console.log(`[CANCEL-NOTIF-SUCCESS] In-app created → ID: ${notif._id}`);
//       } catch (notifErr) {
//         console.error("[CANCEL-NOTIF-ERROR]", notifErr.message || notifErr);
//       }
//     } else {
//       console.warn("[CANCEL-NOTIF] No driver attached to delivery");
//     }

//     // Socket emit (if using)
//     if (global.io && driver) {
//       global.io.to('admin-room').emit('delivery:status:update', {
//         deliveryId: delivery._id,
//         status: 'Cancelled',
//         timestamp: new Date()
//       });

//       global.io.to('admin-room').emit('driver:available', {
//         driverId: delivery.driverId,
//         driverName: driver.name,
//         status: 'available'
//       });
//     }

//     return res.json({
//       success: true,
//       message: 'Delivery cancelled successfully. Driver is now available again.'
//     });

//   } catch (error) {
//     console.error('[CANCEL-DELIVERY] Error:', error);
//     return res.status(500).json({ success: false, message: 'Failed to cancel delivery' });
//   }
// };

// // ============= GET DRIVER'S CURRENT LOCATION (API) =============
// exports.getDriverCurrentLocation = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     const delivery = await Delivery.findById(deliveryId)
//       .populate({
//         path: 'driverId',
//         select: 'name vehicleNumber currentLocation'
//       })
//       .populate('journeyId')   // ← add this if you have journeyId in Delivery
//       .lean();

//     if (!delivery) {
//       return res.status(404).json({ success: false, message: 'Delivery not found' });
//     }

//     if (!delivery.driverId) {
//       return res.status(404).json({ success: false, message: 'No driver assigned' });
//     }

//     let locationData = {
//       driverId: delivery.driverId._id,
//       driverName: delivery.driverId.name,
//       vehicleNumber: delivery.driverId.vehicleNumber,
//       currentLocation: delivery.driverId.currentLocation || null,
//       deliveryStatus: delivery.status,
//       lastUpdate: delivery.driverId.currentLocation?.timestamp || null
//     };

//     // If journey exists and has history → send full path for completed/in-progress
//     if (delivery.journeyId?.locationHistory?.length > 0) {
//       locationData.pathHistory = delivery.journeyId.locationHistory.map(point => ({
//         lat: point.latitude,
//         lng: point.longitude,
//         timestamp: point.timestamp
//       }));
//     }

//     return res.json({
//       success: true,
//       data: locationData
//     });

//   } catch (error) {
//     console.error('[GET-DRIVER-LOCATION] Error:', error);
//     return res.status(500).json({ success: false, message: 'Failed to get location' });
//   }
// };

// // ============= EDIT DELIVERY =============
// exports.renderEditDelivery = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     const delivery = await Delivery.findById(deliveryId)
//       .populate('customerId')
//       .populate('driverId', 'name phone vehicleNumber')
//       .lean();

//     if (!delivery) {
//       req.flash('error', 'Delivery not found');
//       return res.redirect('/admin/deliveries');
//     }

//     // Get available drivers (current driver + all available ones)
//     const drivers = await Driver.find({
//       $or: [
//         { _id: delivery.driverId },
//         { isActive: true, isAvailable: true, profileStatus: 'approved' }
//       ]
//     })
//       .select('name phone vehicleNumber profileImage isAvailable')
//       .sort({ name: 1 })
//       .lean();

//     res.render('delivery_edit', {
//       title: `Edit Delivery - ${delivery.trackingNumber}`,
//       delivery,
//       drivers,
//       user: req.user,
//       url: req.originalUrl,
//       messages: req.flash()
//     });

//   } catch (error) {
//     console.error('[RENDER-EDIT-DELIVERY] Error:', error);
//     req.flash('error', 'Failed to load edit page');
//     res.redirect('/admin/deliveries');
//   }
// };


// exports.updateDelivery = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;
//     const {
//       driverId: inputDriverId,
//       scheduledPickupTime,
//       scheduledDeliveryTime,
//       instructions,
//       waypoints,
//       routeDistance,
//       routeDuration
//     } = req.body;

//     console.log('[UPDATE-DEBUG] Input driverId:', inputDriverId);
//     console.log('[UPDATE-DEBUG] Input driverId type:', typeof inputDriverId);
//     console.log('[UPDATE-DEBUG] Request body:', req.body);

//     // ────────────────────────────────────────────────
//     // Clean & Validate driverId (handle [object Object] case)
//     // ────────────────────────────────────────────────
//     let cleanDriverId = null;

//     if (inputDriverId) {
//       // Invalid case from bad form serialization
//       if (String(inputDriverId).includes('[object') || String(inputDriverId) === '[object Object]') {
//         console.error('[UPDATE-ERROR] Invalid driverId format from form:', inputDriverId);
//         req.flash('error', 'Invalid driver selection. Please try again.');
//         return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
//       }

//       try {
//         if (typeof inputDriverId === 'string' && inputDriverId.length === 24) {
//           cleanDriverId = inputDriverId;
//         } else if (typeof inputDriverId === 'object' && inputDriverId._id) {
//           cleanDriverId = inputDriverId._id.toString();
//         } else if (inputDriverId.toString && inputDriverId.toString().length === 24) {
//           cleanDriverId = inputDriverId.toString();
//         } else {
//           throw new Error('Cannot extract valid driver ID');
//         }
//       } catch (parseErr) {
//         console.error('[UPDATE-ERROR] Failed to parse driverId:', parseErr.message);
//         req.flash('error', 'Invalid driver ID format. Please select a driver from the dropdown.');
//         return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
//       }
//     }

//     console.log('[UPDATE-DEBUG] Cleaned driverId:', cleanDriverId);

//     // Fetch delivery
//     const delivery = await Delivery.findById(deliveryId);
//     if (!delivery) {
//       req.flash('error', 'Delivery not found');
//       return res.redirect('/admin/deliveries');
//     }

//     const currentDriverIdStr = delivery.driverId ? delivery.driverId.toString() : null;
//     console.log('[UPDATE-DEBUG] Current driverId (string):', currentDriverIdStr);

//     // Parse waypoints
//     let parsedWaypoints = [];
//     if (waypoints) {
//       try {
//         parsedWaypoints = JSON.parse(waypoints);
//       } catch (e) {
//         console.warn('Invalid waypoints JSON:', e.message);
//       }
//     }

//     // Update non-driver fields
//     if (scheduledPickupTime) delivery.scheduledPickupTime = new Date(scheduledPickupTime);
//     if (scheduledDeliveryTime) delivery.scheduledDeliveryTime = new Date(scheduledDeliveryTime);
//     if (instructions) delivery.instructions = instructions;
//     if (parsedWaypoints.length > 0) delivery.waypoints = parsedWaypoints;
//     if (routeDistance) delivery.distance = parseFloat(routeDistance) || delivery.distance;
//     if (routeDuration) delivery.estimatedDuration = parseInt(routeDuration) || delivery.estimatedDuration;

//     // Handle driver change
//     let driverChanged = false;
//     let oldDriver = null;
//     let newDriver = null;
//     const newDriverIdStr = cleanDriverId;

//     if (newDriverIdStr && newDriverIdStr !== currentDriverIdStr) {
//       console.log('[UPDATE-DEBUG] Driver change detected');

//       newDriver = await Driver.findById(newDriverIdStr);
//       if (!newDriver) {
//         req.flash('error', 'Selected driver not found');
//         return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
//       }

//       if (!newDriver.isAvailable || newDriver.profileStatus !== 'approved') {
//         req.flash('error', 'Selected driver is not available or not approved');
//         return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
//       }

//       // Free old driver
//       if (currentDriverIdStr) {
//         oldDriver = await Driver.findById(currentDriverIdStr);
//         if (oldDriver) {
//           oldDriver.isAvailable = true;
//           await oldDriver.save();
//           console.log(`[UPDATE] Freed old driver: ${oldDriver.name}`);
//         }
//       }

//       // Assign new driver
//       delivery.driverId = newDriver._id;
//       delivery.vehicleNumber = newDriver.vehicleNumber;
//       newDriver.isAvailable = false;
//       await newDriver.save();

//       driverChanged = true;
//       console.log(`[UPDATE] Reassigned to new driver: ${newDriver.name}`);
//     }

//     // Save updated delivery
//     await delivery.save();
//     console.log('[UPDATE-DEBUG] Delivery saved successfully');

//     // Status history
//     await DeliveryStatusHistory.create({
//       deliveryId: delivery._id,
//       status: delivery.status,
//       remarks: driverChanged
//         ? `Delivery reassigned from ${oldDriver?.name || 'previous driver'} to ${newDriver?.name}`
//         : 'Delivery details updated (route/schedule/etc.)',
//       updatedBy: {
//         userId: req.user._id,
//         userRole: req.user.role,
//         userName: req.user.name
//       }
//     });

//     // ────────────────────────────────────────────────
//     // NOTIFICATIONS
//     // ────────────────────────────────────────────────
//     console.log('[UPDATE-NOTIF] Starting notifications...');

//     if (driverChanged) {
//       console.log('[UPDATE-NOTIF] Driver changed - notifying both old and new');

//       // OLD DRIVER (cancel/reassign notification)
//       if (oldDriver) {
//         console.log(`[UPDATE-NOTIF] Notifying OLD driver: ${oldDriver.name}`);

//         // Push notification
//         if (oldDriver.fcmToken) {
//           try {
//             await sendNotification(oldDriver.fcmToken, {
//               title: "Delivery Reassigned",
//               body: `Delivery ${delivery.trackingNumber} has been reassigned to another driver.`,
//               deliveryId: delivery._id.toString(),
//               trackingNumber: delivery.trackingNumber,
//               reason: "Reassigned to another driver",
//               type: "delivery_cancelled"
//             });
//             console.log(`[UPDATE-NOTIF] FCM sent to OLD driver`);
//           } catch (e) {
//             console.error("[UPDATE-FCM-OLD-ERROR]", e.message || e);
//           }
//         } else {
//           console.warn("[UPDATE-NOTIF] No FCM token for OLD driver");
//         }

//         // In-app notification
//         try {
//           await Notification.create({
//             recipientId: oldDriver._id,
//             recipientType: 'Driver',
//             type: 'delivery_cancelled',
//             title: 'Delivery Reassigned',
//             message: `Delivery ${delivery.trackingNumber} has been reassigned to another driver.`,
//             referenceId: delivery._id,
//             referenceModel: 'Delivery',
//             priority: 'high',
//             createdAt: new Date()
//           });
//           console.log(`[UPDATE-NOTIF] In-app sent to OLD driver`);
//         } catch (e) {
//           console.error("[UPDATE-INAPP-OLD-ERROR]", e.message || e);
//         }
//       }

//       // NEW DRIVER (assigned notification)
//       if (newDriver) {
//         console.log(`[UPDATE-NOTIF] Notifying NEW driver: ${newDriver.name}`);

//         // Push notification
//         if (newDriver.fcmToken) {
//           try {
//             await sendNotification(newDriver.fcmToken, {
//               title: "New Delivery Assigned",
//               body: `Delivery ${delivery.trackingNumber} has been assigned to you. Please check details in the app.`,
//               deliveryId: delivery._id.toString(),
//               trackingNumber: delivery.trackingNumber,
//               customerName: delivery.customerId?.name || "Customer",
//               pickup: delivery.pickupLocation?.address || "",
//               type: "delivery_assigned"
//             });
//             console.log(`[UPDATE-NOTIF] FCM sent to NEW driver`);
//           } catch (e) {
//             console.error("[UPDATE-FCM-NEW-ERROR]", e.message || e);
//           }
//         } else {
//           console.warn("[UPDATE-NOTIF] No FCM token for NEW driver");
//         }

//         // In-app notification
//         try {
//           await Notification.create({
//             recipientId: newDriver._id,
//             recipientType: 'Driver',
//             type: 'delivery_assigned',
//             title: 'New Delivery Assigned',
//             message: `Delivery ${delivery.trackingNumber} has been assigned to you. Please check details in the app.`,
//             referenceId: delivery._id,
//             referenceModel: 'Delivery',
//             priority: 'high',
//             createdAt: new Date()
//           });
//           console.log(`[UPDATE-NOTIF] In-app sent to NEW driver`);
//         } catch (e) {
//           console.error("[UPDATE-INAPP-NEW-ERROR]", e.message || e);
//         }
//       }
//     } else {
//       // No driver change → notify current driver about update
//       console.log('[UPDATE-NOTIF] No driver change - notifying current driver');

//       const currentDriver = await Driver.findById(delivery.driverId);
//       if (currentDriver) {
//         console.log(`[UPDATE-NOTIF] Current driver: ${currentDriver.name}`);

//         // Push notification
//         if (currentDriver.fcmToken) {
//           try {
//             await sendNotification(currentDriver.fcmToken, {
//               title: "Delivery Updated",
//               body: `Delivery ${delivery.trackingNumber} details have been updated. Please check the app.`,
//               deliveryId: delivery._id.toString(),
//               trackingNumber: delivery.trackingNumber,
//               type: "delivery_updated"
//             });
//             console.log(`[UPDATE-NOTIF] FCM update sent to current driver`);
//           } catch (e) {
//             console.error("[UPDATE-FCM-CURRENT-ERROR]", e.message || e);
//           }
//         } else {
//           console.warn("[UPDATE-NOTIF] No FCM token for current driver");
//         }

//         // In-app notification
//         try {
//           await Notification.create({
//             recipientId: currentDriver._id,
//             recipientType: 'Driver',
//             type: 'delivery_updated',
//             title: 'Delivery Updated',
//             message: `Delivery ${delivery.trackingNumber} details have been updated. Please check the app.`,
//             referenceId: delivery._id,
//             referenceModel: 'Delivery',
//             priority: 'medium',
//             createdAt: new Date()
//           });
//           console.log(`[UPDATE-NOTIF] In-app update created for current driver`);
//         } catch (e) {
//           console.error("[UPDATE-INAPP-CURRENT-ERROR]", e.message || e);
//         }
//       } else {
//         console.warn("[UPDATE-NOTIF] No current driver found");
//       }
//     }

//     console.log('[UPDATE-DEBUG] Update completed successfully');
//     req.flash('success', 'Delivery updated successfully!');
//     res.redirect(`/admin/deliveries/${delivery._id}`);

//   } catch (error) {
//     console.error('[UPDATE-DELIVERY] Error:', error);
//     console.error('[UPDATE-DELIVERY] Stack:', error.stack);
//     req.flash('error', error.message || 'Failed to update delivery');
//     res.redirect(`/admin/deliveries/${req.params.deliveryId}/edit`);
//   }
// };

// // ============= GET COMPLETED JOURNEY ROUTE (for delivered deliveries) =============
// exports.getCompletedJourneyRoute = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;

//     // Find journey for this delivery
//     const Journey = require('../../models/Journey');
//     const journey = await Journey.findOne({ deliveryId })
//       .select('waypoints totalDistance totalDuration averageSpeed startLocation endLocation')
//       .lean();

//     if (!journey) {
//       return res.status(404).json({
//         success: false,
//         message: 'No journey found for this delivery'
//       });
//     }

//     // Build path from journey waypoints
//     const path = [];

//     // Add start location
//     if (journey.startLocation?.coordinates) {
//       path.push({
//         lat: journey.startLocation.coordinates.latitude,
//         lng: journey.startLocation.coordinates.longitude
//       });
//     }

//     // Add all waypoints
//     if (journey.waypoints && journey.waypoints.length > 0) {
//       journey.waypoints.forEach(wp => {
//         if (wp.location?.coordinates) {
//           path.push({
//             lat: wp.location.coordinates.latitude,
//             lng: wp.location.coordinates.longitude
//           });
//         }
//       });
//     }

//     // Add end location
//     if (journey.endLocation?.coordinates) {
//       path.push({
//         lat: journey.endLocation.coordinates.latitude,
//         lng: journey.endLocation.coordinates.longitude
//       });
//     }

//     console.log(`[GET-JOURNEY-ROUTE] Delivery: ${deliveryId}, Path points: ${path.length}`);

//     return res.json({
//       success: true,
//       data: {
//         path,
//         stats: {
//           totalDistance: journey.totalDistance ? `${journey.totalDistance.toFixed(2)} km` : 'N/A',
//           totalDuration: journey.totalDuration ? `${journey.totalDuration} mins` : 'N/A',
//           averageSpeed: journey.averageSpeed ? `${journey.averageSpeed.toFixed(1)} km/h` : 'N/A'
//         }
//       }
//     });

//   } catch (error) {
//     console.error('[GET-JOURNEY-ROUTE] Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch journey route',
//       error: error.message
//     });
//   }
// };

// exports.addDeliveryRemark = async (req, res) => {
//   try {
//     const { deliveryId } = req.params;
//     const { message, images } = req.body;

//     const delivery = await Delivery.findById(deliveryId);
//     if (!delivery) {
//       return errorResponse(res, 'Delivery not found', 404);
//     }

//     const remark = {
//       message,
//       images: images || [],
//       createdBy: req.user._id,
//       createdAt: new Date()
//     };

//     if (!delivery.remarks) delivery.remarks = [];
//     delivery.remarks.push(remark);

//     await delivery.save();

//     return successResponse(res, 'Remark added successfully', { remark });

//   } catch (error) {
//     console.error('[ADD-REMARK] Error:', error);
//     return errorResponse(res, 'Failed to add remark', 500);
//   }
// };

// // ============= GET ALL DRIVER LOCATIONS FOR DASHBOARD =============
// exports.getAllDriverLocations = async (req, res) => {
//   try {
//     // Find all active drivers with their current locations
//     const drivers = await Driver.find({
//       isActive: true,
//       profileStatus: 'approved'
//     })
//       .select('name phone vehicleNumber profileImage isAvailable currentLocation')
//       .lean();

//     // Filter drivers who have valid location data
//     const driversWithLocation = drivers.filter(driver =>
//       driver.currentLocation &&
//       driver.currentLocation.latitude &&
//       driver.currentLocation.longitude
//     );

//     // Format response
//     const formattedDrivers = driversWithLocation.map(driver => ({
//       _id: driver._id,
//       name: driver.name,
//       phone: driver.phone,
//       vehicleNumber: driver.vehicleNumber,
//       profileImage: driver.profileImage,
//       isAvailable: driver.isAvailable,
//       currentLocation: {
//         latitude: driver.currentLocation.latitude,
//         longitude: driver.currentLocation.longitude,
//         timestamp: driver.currentLocation.timestamp || new Date(),
//         speed: driver.currentLocation.speed || 0,
//         heading: driver.currentLocation.heading || 0
//       }
//     }));

//     console.log(`[GET-ALL-DRIVER-LOCATIONS] Returning ${formattedDrivers.length} drivers with location`);

//     return res.json({
//       success: true,
//       data: formattedDrivers,
//       count: formattedDrivers.length
//     });

//   } catch (error) {
//     console.error('[GET-ALL-DRIVER-LOCATIONS] Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch driver locations',
//       error: error.message
//     });
//   }
// };

// // ============= GET SINGLE DRIVER LOCATION =============
// exports.getSingleDriverLocation = async (req, res) => {
//   try {
//     const { driverId } = req.params;

//     const driver = await Driver.findById(driverId)
//       .select('name phone vehicleNumber isAvailable currentLocation')
//       .lean();

//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         message: 'Driver not found'
//       });
//     }

//     if (!driver.currentLocation || !driver.currentLocation.latitude) {
//       return res.status(404).json({
//         success: false,
//         message: 'Driver location not available'
//       });
//     }

//     return res.json({
//       success: true,
//       data: {
//         _id: driver._id,
//         name: driver.name,
//         phone: driver.phone,
//         vehicleNumber: driver.vehicleNumber,
//         isAvailable: driver.isAvailable,
//         currentLocation: driver.currentLocation
//       }
//     });

//   } catch (error) {
//     console.error('[GET-SINGLE-DRIVER-LOCATION] Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch driver location',
//       error: error.message
//     });
//   }
// };

// // ============= GET DRIVERS BY STATUS =============
// exports.getDriversByStatus = async (req, res) => {
//   try {
//     const { status } = req.query; // 'available', 'busy', 'all'

//     let query = {
//       isActive: true,
//       profileStatus: 'approved'
//     };

//     if (status === 'available') {
//       query.isAvailable = true;
//     } else if (status === 'busy') {
//       query.isAvailable = false;
//     }

//     const drivers = await Driver.find(query)
//       .select('name phone vehicleNumber profileImage isAvailable currentLocation')
//       .lean();

//     const driversWithLocation = drivers.filter(driver =>
//       driver.currentLocation &&
//       driver.currentLocation.latitude &&
//       driver.currentLocation.longitude
//     );

//     console.log(`[GET-DRIVERS-BY-STATUS] Status: ${status || 'all'}, Found: ${driversWithLocation.length} drivers`);

//     return res.json({
//       success: true,
//       data: driversWithLocation,
//       count: driversWithLocation.length
//     });

//   } catch (error) {
//     console.error('[GET-DRIVERS-BY-STATUS] Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch drivers',
//       error: error.message
//     });
//   }
// };

// // ============= UPDATE DELIVERY PRIORITY (FULL SOCKET UPDATE) =============
// exports.updateDeliveryPriority = async (req, res) => {
//   console.log('\n=== [PRIORITY UPDATE] ENDPOINT HIT ===');
//   console.log('URL:', req.originalUrl);
//   console.log('Params:', req.params);
//   console.log('Body:', req.body);

//   try {
//     const { deliveryId } = req.params;
//     const { priority } = req.body;

//     if (!deliveryId) {
//       console.log('❌ Missing deliveryId');
//       return res.status(400).json({ success: false, message: 'Delivery ID is required' });
//     }

//     if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
//       console.log('❌ Invalid priority:', priority);
//       return res.status(400).json({ success: false, message: 'Invalid priority value' });
//     }

//     // Full delivery fetch with relations
//     const delivery = await Delivery.findById(deliveryId)
//       .populate('driverId', 'name fcmToken vehicleNumber')
//       .populate('customerId', 'name companyName')
//       .lean();

//     if (!delivery) {
//       console.log('❌ Delivery not found');
//       return res.status(404).json({ success: false, message: 'Delivery not found' });
//     }

//     const oldPriority = delivery.priority;

//     // Update in DB
//     await Delivery.findByIdAndUpdate(deliveryId, { priority });

//     console.log(`✅ Priority updated: ${oldPriority} → ${priority}`);

//     // ================================================================
//     // ✅ FIX: Priority update DB me save ho jaata tha, lekin driver ki
//     // route chain (pickupLocation / previousDeliveryId / nextDeliveryId,
//     // jo rebuildDriverRouteChain() banata hai) kabhi rebuild nahi hoti
//     // thi. Isliye admin panel pe priority badge turant "HIGH" dikhta
//     // tha, par physical address chain purani (creation-order/old
//     // nearest-neighbor) waali hi reh jaati thi — priority ka route
//     // sequence pe koi asar nahi padta tha. Ab priority change hote hi
//     // us driver ki poori active queue ko turant rebuild karte hain,
//     // taaki naya HIGH-priority stop turant chain me upar/pehle aaye.
//     // ================================================================
//     if (delivery.driverId?._id || delivery.driverId) {
//       try {
//         const driverIdForRebuild = delivery.driverId?._id || delivery.driverId;
//         await rebuildDriverRouteChain(driverIdForRebuild);
//         console.log(`[PRIORITY-UPDATE] Route chain rebuilt for driver ${driverIdForRebuild} after priority change`);
//       } catch (chainErr) {
//         console.error('[PRIORITY-UPDATE] Route chain rebuild failed:', chainErr.message);
//       }
//     }

//     // Refresh full delivery data (rebuild ke baad — pickupLocation bhi fresh chahiye)
//     const updatedDelivery = await Delivery.findById(deliveryId)
//       .populate('driverId', 'name fcmToken vehicleNumber')
//       .populate('customerId', 'name companyName')
//       .lean();

//     // ==================== SOCKET PAYLOAD ====================
//     const io = req.app.get('io');
//     const socketPayload = {
//       type: "delivery:priority:updated",
//       deliveryId: updatedDelivery._id.toString(),
//       trackingNumber: updatedDelivery.trackingNumber,
//       priority: updatedDelivery.priority,
//       oldPriority: oldPriority,
//       status: updatedDelivery.status,
//       customerName: updatedDelivery.customerId?.companyName || updatedDelivery.customerId?.name || 'Customer',
//       driverName: updatedDelivery.driverId?.name || null,
//       vehicleNumber: updatedDelivery.driverId?.vehicleNumber || null,
//       pickupAddress: updatedDelivery.pickupLocation?.address || '',
//       deliveryAddress: updatedDelivery.deliveryLocation?.address || '',
//       scheduledPickupTime: updatedDelivery.scheduledPickupTime,
//       scheduledDeliveryTime: updatedDelivery.scheduledDeliveryTime,
//       actualPickupTime: updatedDelivery.actualPickupTime,
//       actualDeliveryTime: updatedDelivery.actualDeliveryTime,
//       timestamp: new Date().toISOString(),
//       message: `Priority changed to ${priority.toUpperCase()}`
//     };

//     if (io) {
//       // Admin ko full update
//       io.to("admin-room").emit("delivery:updated", socketPayload);
//       console.log('📤 Socket emitted to admin-room: delivery:updated');

//       // Driver ko bhi (agar assigned hai)
//       if (updatedDelivery.driverId) {
//         io.to(`driver-${updatedDelivery.driverId._id}`).emit("delivery:updated", socketPayload);
//         console.log(`📤 Socket emitted to driver room`);
//       }
//     }

//     // FCM (optional)
//     if (updatedDelivery.driverId?.fcmToken) {
//       try {
//         await sendNotification(updatedDelivery.driverId.fcmToken, {
//           title: `Priority Updated: ${priority.toUpperCase()}`,
//           body: `Your delivery ${updatedDelivery.trackingNumber} priority has been changed.`,
//           type: 'priority_changed',
//           deliveryId: updatedDelivery._id.toString(),
//           trackingNumber: updatedDelivery.trackingNumber
//         });
//         console.log(`[PRIORITY-NOTIF-SUCCESS] FCM sent to driver`);
//       } catch (e) {
//         console.error("[PRIORITY-FCM-ERROR]", e.message || e);
//       }
//     }

//     return res.json({
//       success: true,
//       message: `Priority updated to ${priority.toUpperCase()}`,
//       delivery: {
//         _id: updatedDelivery._id,
//         trackingNumber: updatedDelivery.trackingNumber,
//         priority: updatedDelivery.priority,
//         status: updatedDelivery.status,
//         pickupAddress: updatedDelivery.pickupLocation?.address,
//         deliveryAddress: updatedDelivery.deliveryLocation?.address,
//         driverName: updatedDelivery.driverId?.name
//       }
//     });

//   } catch (error) {
//     console.error('=== PRIORITY UPDATE ERROR ===', error);
//     return res.status(500).json({ success: false, message: 'Server error' });
//   }
// };


const Delivery = require('../../models/Delivery');
const Order = require('../../models/Order');
const Driver = require('../../models/Driver');
const Customer = require('../../models/Customer');
const DeliveryStatusHistory = require('../../models/DeliveryStatusHistory');
const Notification = require('../../models/Notification');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { sendNotification } = require("../../utils/sendNotification")
const { getSortedUpcomingForDriver, autoReturnStaleDeliveries } = require('../Driver/deliveryController');
const { PickupLocation } = require('../../models/Order');
const { calculateDistance } = require('../../utils/geoHelper');
 
 
// ================================================================
// ✅ GREEDY NEAREST-NEIGHBOR ROUTE CHAIN BUILDER
// ----------------------------------------------------------------
// Jab bhi driver ko koi NAYI delivery assign hoti hai, yeh function
// us driver ki SAARI ACTIVE (abhi tak delivered/cancelled na hui)
// deliveries ko dobara, sahi order me chain karta hai:
//
//   1) Pehla stop = driver ki ABHI ki LIVE location se sabse NEAREST
//      delivery — iska pickup = Factory (apna originalPickupLocation).
//   2) Dusra stop = pehle stop ke DROPOFF point se sabse NEAREST
//      baaki delivery — iska pickup = pehle stop ka dropoff.
//   3) Aise hi aage — har stop, pichle stop ke dropoff se sabse
//      nearest wali delivery choose karta hai (classic greedy
//      nearest-neighbor route).
//
// Yeh chain sirf ISI MOMENT compute hoti hai (jab naya order assign
// hota hai) aur phir previousDeliveryId/nextDeliveryId + pickupLocation
// ke through DB me STORE ho jaati hai. Iske baad — jab tak koi naya
// order is driver ko assign na ho — yeh chain FIX rehti hai. Refresh
// karne se, driver GPS move hone se, ya ek delivery complete karne se
// yeh dobara recompute NAHI hoti (completion sirf status change karta
// hai, chain ko touch nahi karta) — isi se route chain UI me stops
// remove/reshuffle nahi hote, sirf color/status change hota hai.
// ================================================================
async function rebuildDriverRouteChain(driverId) {
  const driver = await Driver.findById(driverId).select('currentLocation');
 
  let currentPoint = (driver?.currentLocation?.latitude && driver?.currentLocation?.longitude)
    ? { latitude: driver.currentLocation.latitude, longitude: driver.currentLocation.longitude }
    : null;
 
  // ================================================================
  // ✅ FIX: Ab tak, jab pehli delivery (A) DELIVERED ho chuki ho aur
  // baaki active deliveries (B, C) ka priority change ho (rebuild
  // trigger ho), to naye chain ke PEHLE item ka pickup hamesha uske
  // "originalPickupLocation" (factory/start link) pe RESET ho jaata
  // tha — chahe driver physically A ke dropoff se aage badh chuka ho.
  // Chain ko pata hi nahi chalta tha ki koi delivery already complete
  // ho chuki hai — isliye galat "wapas factory se" pickup dikhta tha.
  //
  // Ab is driver ki sabse RECENT DELIVERED delivery dhoondhte hain —
  // agar mile, to uska dropoff address/coords hi naye chain ke pehle
  // item ka "continuation point" banega (pickup + currentPoint dono),
  // taaki chain sahi se wahi se continue ho jahan driver physically
  // pahunch chuka hai. Agar koi delivered delivery nahi hai (din ki
  // pehli hi delivery hai), to pehle jaisa hi behavior (originalPickup
  // Location / driver GPS) rahega.
  // ================================================================
  const lastCompletedDelivery = await Delivery.findOne({
    driverId,
    status: { $in: ['delivered', 'Delivered'] }
  }).sort({ actualDeliveryTime: -1, updatedAt: -1 });
 
  let continuationPickupLocation = null;
  if (lastCompletedDelivery?.deliveryLocation?.address) {
    continuationPickupLocation = lastCompletedDelivery.deliveryLocation;
 
    const lastCoords = lastCompletedDelivery.deliveryLocation?.coordinates;
    if (!currentPoint && lastCoords?.latitude && lastCoords?.longitude) {
      // Driver ki live GPS nahi hai to bhi, last-delivered dropoff hi
      // sabse accurate "abhi driver kahan hai" wala estimate hai —
      // ise currentPoint bana ke nearest-neighbor sorting bhi sahi hogi.
      currentPoint = { latitude: lastCoords.latitude, longitude: lastCoords.longitude };
    }
 
    console.log(`[ROUTE-CHAIN] Driver ${driverId} — last completed delivery ${lastCompletedDelivery.trackingNumber} ka dropoff hi continuation point banega: "${continuationPickupLocation.address}"`);
  }
 
  // Sirf abhi tak ACTIVE (delivered/cancelled/completed nahi) deliveries.
  // createdAt ascending fallback ke liye rakha hai (agar driver GPS na mile).
  const activeDeliveries = await Delivery.find({
    driverId,
    status: { $nin: ['delivered', 'completed', 'cancelled', 'Delivered', 'Completed', 'Cancelled'] }
  }).sort({ createdAt: 1 });
 
  if (activeDeliveries.length === 0) {
    console.log(`[ROUTE-CHAIN] Driver ${driverId} — koi active delivery nahi, chain rebuild skip.`);
    return;
  }
 
  const remaining = [...activeDeliveries];
  const orderedChain = [];
 
  // ✅ FIX: pehle priority ka koi asar route order pe nahi padta tha —
  // sirf pure nearest-neighbor (jo bhi geographically closest ho) chain
  // ban jaati thi, chahe wo 'low' priority hi kyun na ho. Ab pehle
  // priority TIER ke hisaab se group karte hain (urgent/high sabse
  // pehle, phir medium, phir low), aur HAR TIER ke ANDAR hi nearest-
  // neighbor greedy routing hoti hai — driver ke current point se (ya
  // pichle tier ke aakhri stop se) continue karke.
  const PRIORITY_TIER_ORDER = { urgent: 0, high: 0, medium: 1, low: 2 };
  const tierOf = (del) => {
    const key = String(del.priority || '').toLowerCase().trim();
    return PRIORITY_TIER_ORDER.hasOwnProperty(key) ? PRIORITY_TIER_ORDER[key] : 1; // unknown priority -> medium tier
  };
 
  const tiers = [[], [], []]; // 0 = urgent/high, 1 = medium, 2 = low
  remaining.forEach(del => tiers[tierOf(del)].push(del));
 
  for (const tierGroup of tiers) {
    while (tierGroup.length > 0) {
      let nextIndex = 0; // ✅ default: agar current point na mile, creation-order (already sorted) follow karo
 
      if (currentPoint) {
        let minDist = Infinity;
        tierGroup.forEach((del, idx) => {
          const coords = del.deliveryLocation?.coordinates;
          if (coords?.latitude && coords?.longitude) {
            const dist = calculateDistance(currentPoint.latitude, currentPoint.longitude, coords.latitude, coords.longitude);
            if (dist < minDist) {
              minDist = dist;
              nextIndex = idx;
            }
          }
        });
      }
 
      const chosen = tierGroup.splice(nextIndex, 1)[0];
      orderedChain.push(chosen);
 
      // Agla "current point" — is stop ka dropoff (agar valid coords hain)
      const chosenCoords = chosen.deliveryLocation?.coordinates;
      if (chosenCoords?.latitude && chosenCoords?.longitude) {
        currentPoint = { latitude: chosenCoords.latitude, longitude: chosenCoords.longitude };
      }
    }
  }
 
  console.log(`[ROUTE-CHAIN] Driver ${driverId} — rebuilt order: ${orderedChain.map(d => d.trackingNumber).join(' → ')} | priorities: ${orderedChain.map(d => d.priority).join(', ')}`);
 
  for (let i = 0; i < orderedChain.length; i++) {
    const cur = orderedChain[i];
    const prev = i > 0 ? orderedChain[i - 1] : null;
    const next = i < orderedChain.length - 1 ? orderedChain[i + 1] : null;
 
    // ✅ FIX: Pehle sirf pehle item ka pickup ADDRESS (text) continuation
    // se copy hota tha, lekin previousDeliveryId link (jo asli DB-level
    // chain banata hai) set hi nahi hota tha — isliye ye naya chain
    // khud ko ek ALAG "root/batch" maan leta tha, aur last-completed
    // delivery se real link nahi banta tha. List-sorting isko 2 alag
    // chains samajhti thi (1 completed batch + 1 naya batch), poori
    // continuous chain nahi. Ab pehle item ko lastCompletedDelivery se
    // ID-level bhi link kar rahe hain (dono taraf se).
    cur.previousDeliveryId = prev ? prev._id : (i === 0 && lastCompletedDelivery ? lastCompletedDelivery._id : null);
    cur.nextDeliveryId = next ? next._id : null;
 
    if (prev) {
      cur.pickupLocation = {
        address: prev.deliveryLocation.address,
        contactPerson: prev.deliveryLocation.contactPerson,
        contactPhone: prev.deliveryLocation.contactPhone,
        city: prev.deliveryLocation.city,
        state: prev.deliveryLocation.state,
        pincode: prev.deliveryLocation.pincode,
        landmark: prev.deliveryLocation.landmark,
        coordinates: prev.deliveryLocation.coordinates
      };
    } else if (continuationPickupLocation) {
      // ✅ FIX: Chain ka PEHLA item — agar is driver ki koi delivery
      // already DELIVERED ho chuki hai, to uske dropoff se hi continue
      // karo (originalPickupLocation/factory se reset mat karo).
      cur.pickupLocation = {
        address: continuationPickupLocation.address,
        contactPerson: continuationPickupLocation.contactPerson,
        contactPhone: continuationPickupLocation.contactPhone,
        city: continuationPickupLocation.city,
        state: continuationPickupLocation.state,
        pincode: continuationPickupLocation.pincode,
        landmark: continuationPickupLocation.landmark,
        coordinates: continuationPickupLocation.coordinates
      };
    } else if (cur.originalPickupLocation?.address) {
      cur.pickupLocation = cur.originalPickupLocation;
    }
 
    await cur.save();
 
    // ✅ FIX: lastCompletedDelivery khud "activeDeliveries" list me nahi
    // hota (delivered hone ki wajah se), isliye uska nextDeliveryId is
    // upar wale loop me kabhi update nahi hota — sirf ek taraf (naye
    // item ka previousDeliveryId) set hone se chain-walk theek se kaam
    // nahi karta. Ise ek baar, sirf pehle active item ke liye, alag se
    // update kar dete hain — taaki completed → active link DONO taraf
    // se complete ho.
    if (i === 0 && lastCompletedDelivery && !prev) {
      try {
        await Delivery.findByIdAndUpdate(lastCompletedDelivery._id, { nextDeliveryId: cur._id });
      } catch (linkErr) {
        console.error(`[ROUTE-CHAIN] lastCompletedDelivery.nextDeliveryId update fail:`, linkErr.message);
      }
    }
  }
}
 
// ✅ Exported so a one-time repair script (scripts/fixRouteChains.js) can
// call it directly for EVERY driver. This is needed because the priority-
// tier fix above only affects FUTURE deliveries/priority-changes — chains
// that were already saved wrong before the fix won't correct themselves
// until something re-triggers a rebuild for that driver.
exports.rebuildDriverRouteChain = rebuildDriverRouteChain;
 
 
// ✅ "Factory (Start)" ke liye hamesha us ORDER ka apna dynamic pickup
// location use karo (jo admin ne order-create time pe select kiya tha) —
// har order alag pickup branch/location se ho sakta hai, isliye kabhi bhi
// ek single "master default" location har order pe hardcode nahi karni.
// Master Pickup Locations table sirf tab use hota hai jab order/delivery
// ka apna data genuinely corrupt/missing ho — normal case mein kabhi trigger
// nahi hona chahiye.
// ✅ India ke bounds ke bahar wale (jaise Abu Dhabi glitch) ya missing
// coordinates ko "implausible" maankar reject karta hai.
// ✅ Sirf basic sanity check — genuinely corrupt/missing coordinates (jaise
// 0,0, undefined, ya out-of-world-bounds values) ko reject karta hai.
// ⚠️ PEHLE ye function sirf INDIA ke bounds (lat 6-38, lng 68-98) accept
// karta tha — jo galat assumption thi. Business ab UAE/Dubai se bhi pickup
// karta hai (lat ~24, lng ~54), jo India ke bounds se bahar hai, isliye wo
// hamesha "implausible/corrupt" maan liya jaata tha aur ek alag (India wali)
// default location par silently switch ho jaata tha. Ab koi bhi valid
// real-world coordinate accept hoga, chahe wo kisi bhi desh ka ho.
function isPlausibleLocation(loc) {
  if (loc?.latitude == null || loc?.longitude == null) return false;
  const lat = Number(loc.latitude);
  const lng = Number(loc.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false; // classic "unset" placeholder
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
 
// ✅ "Factory (Start)" ke liye — SABSE PEHLE order ka apna asli chuna hua
// pickup location (originalPickupLocation) use karo, kyunki alag-alag
// orders alag-alag pickup locations (branches/warehouses) se ho sakte hain.
// SIRF tab MASTER default pickup pe fallback karo jab wo record missing ho
// ya uske coordinates clearly galat/corrupt hon (purane bug se bache records).
async function resolveFactoryLocation(delivery) {
  // ⚠️ IMPORTANT: sirf originalPickupLocation trust karo — delivery.pickupLocation
  // hamesha CHAINED value hoti hai (pichli delivery ki jagah se), asli factory
  // nahi. Isko fallback maanna hi bug tha (kisi aur delivery ki location "Factory
  // (Start)" ban jaati thi jab originalPickupLocation missing hoti thi).
  const ownPickup = delivery.originalPickupLocation;
 
  if (ownPickup?.address && isPlausibleLocation(ownPickup?.coordinates)) {
    return { address: 'Factory (Start)', coordinates: ownPickup.coordinates };
  }
 
  // ✅ SAFETY NET: resolveFactoryLocation is only ever called for the FIRST
  // delivery in a driver's chain (rank #1 / no previous stop). For that exact
  // case, delivery.pickupLocation was ALREADY set correctly at creation time
  // from order.pickupLocation (see createDeliveryFromOrder) — it only becomes
  // a "chained" (non-factory) value for deliveries LATER in the chain, which
  // never reach this function. So before falling back to the generic master
  // default (which is the SAME location for every order and caused the
  // "static Unja/Ahmedabad" bug), try the delivery's own stored pickup first.
  // This self-heals old records even without running the backfill migration.
  const storedPickup = delivery.pickupLocation;
  if (storedPickup?.address && isPlausibleLocation(storedPickup?.coordinates)) {
    console.warn(`[FACTORY-LOCATION] ⚠️ ${delivery.trackingNumber} ka originalPickupLocation missing hai — apne stored pickupLocation se recover kar rahe hain (${storedPickup.address})`);
    return { address: 'Factory (Start)', coordinates: storedPickup.coordinates };
  }
 
  console.warn(`[FACTORY-LOCATION] ⚠️ ${delivery.trackingNumber} ka originalPickupLocation aur pickupLocation dono missing/corrupt hain — verified default pe fallback kar rahe hain`);
  const verifiedDefault = await getVerifiedFactoryLocation();
  if (verifiedDefault) return verifiedDefault;
 
  // Kuch na mile to jo tha wahi rakho (kam se kam address dikhega)
  return { address: 'Factory (Start)', coordinates: ownPickup?.coordinates || null };
}
 
// ✅ Master Pickup Locations table se verified default factory location.
// Ab default entry ke coordinates bhi plausibility-check hote hain — agar
// wo khud galat/corrupt hain (jaise UAE coordinates ke saath India address),
// to usse skip karke koi aur valid active pickup location dhoondhi jaati hai.
async function getVerifiedFactoryLocation() {
  try {
    const defaultPickup = await PickupLocation.findOne({ isDefault: true, isActive: true });
    if (defaultPickup?.coordinates && isPlausibleLocation(defaultPickup.coordinates)) {
      return {
        address: 'Factory (Start)',
        coordinates: {
          latitude: defaultPickup.coordinates.latitude,
          longitude: defaultPickup.coordinates.longitude
        }
      };
    }
    if (defaultPickup) {
      console.warn(`[FACTORY-LOCATION] ⚠️ Default pickup location "${defaultPickup.name || defaultPickup.address}" ke coordinates hi galat hain (${defaultPickup.coordinates?.latitude}, ${defaultPickup.coordinates?.longitude}) — "Manage Pickup Locations" mein isko fix karo. Koi aur valid pickup dhoond rahe hain...`);
    }
 
    // Default nahi mila ya galat tha — koi bhi active pickup jiske coordinates plausible hon
    const candidates = await PickupLocation.find({ isActive: true }).sort({ createdAt: 1 });
    const validCandidate = candidates.find(p => p.coordinates && isPlausibleLocation(p.coordinates));
    if (validCandidate) {
      return {
        address: 'Factory (Start)',
        coordinates: {
          latitude: validCandidate.coordinates.latitude,
          longitude: validCandidate.coordinates.longitude
        }
      };
    }
 
    console.error('[FACTORY-LOCATION] ❌ Koi bhi active Pickup Location valid coordinates ke saath nahi mili — "Manage Pickup Locations" mein data check karo');
  } catch (err) {
    console.error('[FACTORY-LOCATION] getVerifiedFactoryLocation error:', err.message);
  }
  return null;
}
 
 
// ============= RENDER DELIVERIES LIST =============
exports.renderDeliveriesList = async (req, res) => {
  try {
    const {
      status,
      search,
      startDate,
      endDate,
      driverId
    } = req.query;
 
    const query = {};
    if (status) query.status = status;
    if (driverId) query.driverId = driverId;
 
    if (search) {
      query.$or = [
        { trackingNumber: { $regex: search, $options: 'i' } },
        { orderId: { $regex: search, $options: 'i' } }
      ];
    }
 
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
 
    // ================================================================
    // ✅ FIX: "Returned to Factory" stale-delivery flush ab list fetch
    // hone se PEHLE chalti hai, taaki isi render mein updated status
    // dikhe. Pehle yeh flush har driver-group ke liye "getSortedUpcoming
    // ForDriver()" ke andar chalti thi — jo Delivery.find(query) (upar)
    // ke BAAD call hota tha. Matlab: page pe jo data dikhta tha wo
    // FLUSH SE PEHLE ka (purana/stale) hota tha — status update ho jaata
    // tha DB mein, lekin usi refresh mein screen pe nahi dikhta tha,
    // sirf AGLE refresh pe dikhta (ya kabhi nahi agar list dobara na
    // khole). Ab pehle hi saare active drivers ke liye flush chala ke,
    // uske BAAD hi list DB se fetch karte hain — hamesha fresh status.
    // ================================================================
    try {
      const activeDriverIds = await Delivery.distinct('driverId', { driverId: { $ne: null } });
      for (const dId of activeDriverIds) {
        try {
          await autoReturnStaleDeliveries(dId);
        } catch (flushErr) {
          console.error(`[DELIVERIES-LIST] Stale-flush failed for driver ${dId}:`, flushErr.message);
        }
      }
    } catch (distinctErr) {
      console.error('[DELIVERIES-LIST] Could not fetch distinct driverIds for stale-flush:', distinctErr.message);
    }
 
    let deliveries = await Delivery.find(query)
      .populate('customerId', 'name email phone companyName customerId')
      .populate('driverId', 'name phone vehicleNumber currentLocation')
      .sort({ createdAt: -1 })
      .lean();
 
    console.log(`[DELIVERIES-LIST] Query: ${JSON.stringify(query)} | Raw deliveries fetched from DB: ${deliveries.length}`);
 
    // === Proximity Sorting ===
    const driverGroups = {};
    for (const del of deliveries) {
      const dId = del.driverId?._id?.toString() || 'unassigned';
      if (!driverGroups[dId]) driverGroups[dId] = [];
      driverGroups[dId].push(del);
    }
 
    console.log(`[DELIVERIES-LIST] Driver groups: ${Object.entries(driverGroups).map(([k, v]) => `${k}(${v.length})`).join(', ')}`);
 
    let finalDeliveries = [];
 
    for (const [dId, group] of Object.entries(driverGroups)) {
      if (dId === 'unassigned') {
        finalDeliveries.push(...group);
        continue;
      }
 
      try {
        const sorted = await getSortedUpcomingForDriver(dId);
        const upcomingMap = new Map(sorted.upcoming.map(item => [item.id, item]));
 
        // ================================================================
        // ✅ FIX (v2): Pehla fallback (tier*100000+distance) POORI driver
        // history ko priority ke hisaab se globally mix kar raha tha —
        // isse alag-alag DIN/BATCHES ke orders aapas me interleave ho
        // jaate the (e.g. 11-09 ka HIGH, 10-09 ke HIGH se upar aa jaata
        // tha). Priority sirf usi BATCH ke andar compare honi chahiye
        // jisme woh orders ek saath assign hue the — batches khud purane-
        // se-naye order me hi rehne chahiye.
        //
        // Har delivery ka previousDeliveryId/nextDeliveryId already us
        // exact batch ke andar sahi (priority-wise) chain bana chuka hai
        // (rebuildDriverRouteChain ne assignment ke time), aur DELIVERED
        // hote hi ye chain FREEZE ho jaati hai (future rebuilds sirf
        // active deliveries ko touch karte hain) — isliye ye chain hi
        // "us batch ka priority order" reliably batati hai.
        //
        // Isliye ab completed/non-upcoming delivery ke liye: uski chain
        // ka ROOT (previousDeliveryId=null tak backward walk) dhoondo,
        // root ka time hi batch ka time hai, aur chain ke andar apni
        // position (0,1,2...) forward walk se nikalo. Sort key =
        // batchRootTime + chainPosition — isse batches apne time-order
        // me hi rehti hain, aur har batch ke ANDAR priority order (jo
        // chain already encode karti hai) preserved rehta hai.
        // ================================================================
        const groupById = new Map(group.map(d => [d._id.toString(), d]));
        const chainInfoCache = new Map();
 
        const resolveChainInfo = (del) => {
          const idStr = del._id.toString();
          if (chainInfoCache.has(idStr)) return chainInfoCache.get(idStr);
 
          // Chain root dhoondo (backward walk)
          let root = del;
          let guard = 0;
          while (
            root.previousDeliveryId &&
            groupById.has(root.previousDeliveryId.toString()) &&
            guard < 50
          ) {
            root = groupById.get(root.previousDeliveryId.toString());
            guard++;
          }
 
          const rootTime = new Date(root.scheduledPickupTime || root.createdAt || 0).getTime();
 
          // Root se forward walk karke pure batch ki positions ek saath cache kar do
          let pos = 0;
          let node = root;
          const visited = new Set();
          while (node && !visited.has(node._id.toString()) && pos < 50) {
            visited.add(node._id.toString());
            chainInfoCache.set(node._id.toString(), { rootTime, position: pos });
            const nextIdStr = node.nextDeliveryId ? node.nextDeliveryId.toString() : null;
            node = nextIdStr && groupById.has(nextIdStr) ? groupById.get(nextIdStr) : null;
            pos++;
          }
 
          return chainInfoCache.get(idStr) || {
            rootTime: new Date(del.scheduledPickupTime || del.createdAt || 0).getTime(),
            position: 0
          };
        };
 
        const fallbackSortKey = (del) => {
          const { rootTime, position } = resolveChainInfo(del);
          // ✅ FIX: batch khud NAYE-se-PURANE order me chahiye (latest batch
          // sabse upar — jaisa normal "newest first" list hoti hai), isliye
          // rootTime negate kiya hai. Batch ke ANDAR priority order (position)
          // hamesha ascending hi rahega (HIGH=0 pehle, phir MEDIUM, phir LOW).
          return (-rootTime * 1000) + position;
        };
 
        const orderedGroup = group
          .map(del => {
            const sortedItem = upcomingMap.get(del._id.toString());
            const stLower = (del.status || '').toLowerCase();
            const isNonRoutable = ['returned_to_factory'].includes(stLower);
 
            return {
              ...del,
              __nearestRank: sortedItem ? sortedItem.nearestRank : null,
              __distance: isNonRoutable
                ? null
                : (sortedItem ? sortedItem.distanceFromDriver : (del.distance ? `${del.distance.toFixed(1)} km` : null)),
              __hasRank: !!sortedItem,
              __sortKey: sortedItem ? sortedItem.nearestRank : fallbackSortKey(del),
              deliveryLocation: del.deliveryLocation
            };
          })
          .sort((a, b) => a.__sortKey - b.__sortKey);
 
        // ✅ FIX: pehle yahan ek loop tha jo har delivery ka pickupLocation
        // is LIVE proximity-sorted (__sortKey) order ke hisaab se dobara
        // overwrite kar deta tha (previous item ka deliveryLocation, ya
        // resolveFactoryLocation agar rank #1 ban gaya). Driver GPS move
        // karte hi yeh order refresh pe badal jaata tha — isi wajah se
        // list me bhi delivery complete karke agli start karne ke baad
        // pickup "Factory (Start)" galat dikhta tha.
        //
        // delivery.pickupLocation already assignment ke time (fixed
        // previousDeliveryId chain se) sahi set ho chuka hota hai —
        // isliye yahan usse dobara compute/overwrite karne ki zaroorat
        // nahi hai. __nearestRank/__distance columns (jo sirf "driver ke
        // current location se kitni door hai" dikhane ke liye hain) waise
        // hi live rehte hain — sirf pickupLocation ab STATIC/correct hai.
 
        finalDeliveries.push(...orderedGroup);
        console.log(`[DELIVERIES-LIST] Driver ${dId}: ${orderedGroup.length} deliveries pushed to finalDeliveries`);
 
      } catch (e) {
        console.error(`[DELIVERIES-LIST] ⚠️ Sorting failed for driver ${dId} — pushing group as-is (fallback). Error: ${e.message}`);
        console.error(e.stack);
        finalDeliveries.push(...group);
      }
    }
 
    console.log(`[DELIVERIES-LIST] Final total: ${finalDeliveries.length}`);
    console.log(`[DELIVERIES-LIST] Sending all ${finalDeliveries.length} deliveries to DataTables (client-side pagination)`);
 
    // Stats
    const stats = await Delivery.aggregate([{
      $facet: {
        total: [{ $count: 'count' }],
        delivered: [{ $match: { status: 'delivered' } }, { $count: 'count' }],
        inTransit: [{ $match: { status: { $in: ['in_transit', 'assigned', 'picked_up', 'out_for_delivery'] } } }, { $count: 'count' }],
        pending: [{ $match: { status: { $in: ['pending', 'pending_acceptance'] } } }, { $count: 'count' }]
      }
    }]);
 
    const statistics = {
      total: stats[0].total[0]?.count || 0,
      delivered: stats[0].delivered[0]?.count || 0,
      inTransit: stats[0].inTransit[0]?.count || 0,
      pending: stats[0].pending[0]?.count || 0
    };
 
    res.render('deliveries_list', {
      title: 'Deliveries Management',
      user: req.user,
      deliveries: finalDeliveries,
      stats: statistics,
      pagination: {
        total: finalDeliveries.length,
        page: 1,
        pages: 1,
        limit: finalDeliveries.length
      },
      filters: { status, search, startDate, endDate, driverId },
      url: req.originalUrl,
      messages: req.flash()
    });
 
  } catch (error) {
    console.error('[DELIVERIES-LIST] Error:', error);
    req.flash('error', 'Failed to load deliveries');
    res.redirect('/admin/dashboard');
  }
};
 
exports.renderDeliveryDetails = async (req, res) => {
  try {
    const { deliveryId } = req.params;
 
    if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
      req.flash('error', 'Invalid delivery ID');
      return res.redirect('/admin/deliveries');
    }
 
    let delivery = await Delivery.findById(deliveryId)
      .populate({
        path: 'customerId',
        model: 'Customer',
        select: 'name email phone companyName customerId'
      })
      .populate({
        path: 'driverId',
        select: 'name phone vehicleNumber profileImage currentLocation'
      })
      .populate('createdBy', 'name email')
      .lean();
 
    if (!delivery) {
      req.flash('error', 'Delivery not found');
      return res.redirect('/admin/deliveries');
    }
 
    // ================================================================
    // ✅ FIX: yeh page pehle "Returned to Factory" stale-flush kabhi
    // trigger hi nahi karta tha (kyunki iske pickup/chain logic ab
    // getSortedUpcomingForDriver() call hi nahi karta — upar dekho).
    // Isliye agar admin seedha kisi delivery ke details page pe aata
    // tha (list page kholE bina), ya list page ek hi baar khola tha,
    // to kal ki pending delivery "assigned" hi dikhti rehti thi, kabhi
    // "Returned_to_Factory" nahi ban paati thi. Ab yahan explicitly
    // is driver ka stale-flush chalate hain, aur agar ISI delivery ka
    // status abhi-abhi flush se badla ho, to use turant re-fetch karke
    // page pe naya (sahi) status dikhate hain.
    // ================================================================
    const driverIdForFlush = delivery.driverId?._id || delivery.driverId;
    if (driverIdForFlush) {
      try {
        await autoReturnStaleDeliveries(driverIdForFlush);
 
        const refreshedStatus = await Delivery.findById(deliveryId).select('status returnedToFactoryAt returnedToFactoryReason').lean();
        if (refreshedStatus && refreshedStatus.status !== delivery.status) {
          console.log(`[DELIVERY-DETAILS] Stale-flush ne is delivery ka status update kar diya: ${delivery.status} → ${refreshedStatus.status}`);
          delivery.status = refreshedStatus.status;
          delivery.returnedToFactoryAt = refreshedStatus.returnedToFactoryAt;
          delivery.returnedToFactoryReason = refreshedStatus.returnedToFactoryReason;
        }
      } catch (flushErr) {
        console.error('[DELIVERY-DETAILS] Stale-flush failed:', flushErr.message);
      }
    }
 
    // ================================================================
    // ✅ FIXED ROUTE CHAIN LOGIC (previousDeliveryId / nextDeliveryId walk)
    // ----------------------------------------------------------------
    // PEHLE: yeh function har render par getSortedUpcomingForDriver() se
    // driver ki LIVE GPS proximity ke hisaab se dobara sort karta tha.
    // Isse do problems ho rahi thi:
    //   1) Driver jaise-jaise move karta, chain ka order/"my rank" refresh
    //      har baar badal sakta tha — isliye pehli delivery complete karke
    //      dusri start karne ke baad admin refresh karta to pickup location
    //      galat tarike se "Factory (Start)" dikhne lagta tha (kyunki naya
    //      proximity-sort myIndex ko 0 bana raha tha).
    //   2) Completed delivery "upcoming" list se hi filter ho jaati thi,
    //      isliye route chain se poori tarah GAYAB ho jaati thi.
    //
    // AB: chain ko delivery document par already maujood FIXED pointers
    // (previousDeliveryId / nextDeliveryId) follow karke banate hain —
    // yeh pointers sirf ek baar, assignment ke time set hote hain aur
    // kabhi live GPS se badalte nahi. Completed/delivered stop chain se
    // remove nahi hoti — bas "isCompleted" flag ke saath dikhti hai.
    // ================================================================
    let routeChain = [];
 
    if (delivery.driverId) {
      try {
        // Step 1: Chain ke root tak peeche walk karo
        let rootId = delivery._id;
        let guard = 0;
        while (guard < 50) {
          const cur = await Delivery.findById(rootId).select('previousDeliveryId').lean();
          if (!cur || !cur.previousDeliveryId) break;
          rootId = cur.previousDeliveryId;
          guard++;
        }
 
        // Step 2: Root se aage (nextDeliveryId) poora chain collect karo
        const chainDocs = [];
        let nodeId = rootId;
        guard = 0;
        while (nodeId && guard < 50) {
          const node = await Delivery.findById(nodeId)
            .select('trackingNumber status nextDeliveryId')
            .lean();
          if (!node) break;
          chainDocs.push(node);
          nodeId = node.nextDeliveryId;
          guard++;
        }
 
        console.log(`[DELIVERY-DETAILS] Fixed chain length: ${chainDocs.length} | root: ${chainDocs[0]?.trackingNumber}`);
 
        // Step 3: Route Chain build karo — Factory (Start) + har fixed stop
        routeChain.push({ label: 'Factory (Start)', isFactory: true, isCurrent: false });
 
        chainDocs.forEach((node) => {
          const status = String(node.status || '').toLowerCase().trim();
          routeChain.push({
            label: node.trackingNumber,
            isFactory: false,
            isCurrent: node._id.toString() === delivery._id.toString(),
            isCompleted: ['delivered', 'completed'].includes(status),
            isCancelled: status === 'cancelled'
          });
        });
 
      } catch (err) {
        console.error('[DELIVERY-DETAILS] Chain resolution failed:', err.message);
      }
    }
 
    // ✅ NOTE: delivery.pickupLocation ab yahan recompute NAHI karte.
    // Yeh already assignment ke time (createDeliveryFromOrder mein)
    // sahi chain ke saath set ho chuka hai — pehli delivery ke liye
    // Factory, aur baad ki har delivery ke liye pichli delivery ka
    // deliveryLocation. Usko yahan live-proximity se dobara overwrite
    // karna hi galat "Factory se location aa raha hai" wala bug tha.
 
    // Status History
    const statusHistory = await DeliveryStatusHistory.find({ deliveryId: delivery._id })
      .sort({ timestamp: -1 })
      .populate('updatedBy.userId', 'name email')
      .lean();
 
    res.render('delivery_details', {
      title: `Delivery ${delivery.trackingNumber}`,
      user: req.user,
      delivery,
      statusHistory,
      routeChain,
      url: req.originalUrl,
      messages: req.flash()
    });
 
  } catch (error) {
    console.error('[DELIVERY-DETAILS] Error:', error);
    req.flash('error', 'Failed to load delivery details');
    res.redirect('/admin/deliveries');
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
      .populate({
        path: 'customerId',
        model: 'Customer',
        select: 'name email phone companyName customerId'
      })
      .lean();
 
    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/orders');
    }
 
    const existingDelivery = await Delivery.findOne({ orderId: order.orderNumber });
    if (existingDelivery) {
      req.flash('error', 'Delivery already exists for this order');
      return res.redirect(`/admin/deliveries/${existingDelivery._id}`);
    }
 
    // ✅ NO silent hardcoded fallback here anymore. The pickup location must
    // be exactly what was chosen at order-creation time (order.pickupLocation).
    // If it's genuinely missing, we surface a warning instead of quietly
    // showing a fake/static coordinate — that silent substitution was the
    // root cause of the "static location" bug.
    let locationWarning = null;
    if (!order.pickupLocation?.coordinates?.latitude || !order.pickupLocation?.coordinates?.longitude) {
      locationWarning = 'This order has no valid pickup coordinates saved. Please fix the pickup location on the order before creating a delivery.';
      console.warn(`[RENDER-CREATE-DELIVERY] ⚠️ Order ${order.orderNumber} has missing/invalid pickupLocation.coordinates`);
    }
 
    if (!order.deliveryLocation?.coordinates?.latitude || !order.deliveryLocation?.coordinates?.longitude) {
      locationWarning = (locationWarning ? locationWarning + ' ' : '') + 'This order has no valid delivery coordinates saved.';
      console.warn(`[RENDER-CREATE-DELIVERY] ⚠️ Order ${order.orderNumber} has missing/invalid deliveryLocation.coordinates`);
    }
 
    if (locationWarning) {
      req.flash('warning', locationWarning);
    }
 
    // Get available drivers
    const drivers = await Driver.find({
      isActive: true,
      // isAvailable: true,
      profileStatus: 'approved'
    })
 
      .select('name phone vehicleNumber profileImage isAvailable')
      .lean();
 
    res.render('delivery_create', {
      title: `Create Delivery - ${order.orderNumber}`,
      user: req.user,
      order,
      drivers,
      url: req.originalUrl,
      messages: req.flash()
    });
 
  } catch (error) {
    console.error('[RENDER-CREATE-DELIVERY] Error:', error);
    req.flash('error', 'Failed to load create delivery page');
    res.redirect('/admin/orders');
  }
};
 
exports.createDeliveryFromOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      customerId,
      driverId,
      scheduledPickupTime,
      scheduledDeliveryTime,
      instructions,
      waypoints,
      routeDistance,
      routeDuration
    } = req.body;
 
    const order = await Order.findById(orderId)
      .populate({
        path: 'customerId',
        model: 'Customer'
      });
 
    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/orders');
    }
 
    const existing = await Delivery.findOne({ orderId: order.orderNumber });
    if (existing) {
      req.flash('error', 'Delivery already exists for this order');
      return res.redirect(`/admin/deliveries/${existing._id}`);
    }
 
    const driver = await Driver.findById(driverId);
    if (!driver) {
      req.flash('error', 'Driver not found');
      return res.redirect(`/admin/orders/${orderId}/create-delivery`);
    }
 
    if (driver.profileStatus !== 'approved') {
      req.flash('warning', 'Note: Driver is not approved yet, but assigning anyway');
      return res.redirect(`/admin/orders/${orderId}/create-delivery`);
    }
 
    // Generate tracking number
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    const trackingNumber = `DEL${dateStr}${random}`;
 
    // Parse waypoints
    let parsedWaypoints = [];
    if (waypoints) {
      try {
        parsedWaypoints = JSON.parse(waypoints);
      } catch (e) {
        console.error('Waypoints parse error:', e);
      }
    }
 
    // ================================================================
    // ✅ SIMPLE INITIAL SAVE — pickup abhi ke liye order ka apna original
    // factory pickup hi rakhte hain. Delivery create hone ke turant baad
    // rebuildDriverRouteChain() is driver ki SAARI active deliveries
    // (isme yeh nayi wali bhi shamil hai) ko GREEDY NEAREST-NEIGHBOR se
    // dobara sahi order me chain kar dega — first stop driver ke current
    // location se nearest, uske baad uske dropoff se nearest, waghera.
    // Isliye yahan koi manual previousDeliveryId/pickup-chaining nahi
    // karni — sirf valid coordinates honi chahiye taaki record create ho
    // sake, baaki rebuild function sambhal lega.
    // ================================================================
    const pickupLat = order?.pickupLocation?.coordinates?.latitude;
    const pickupLng = order?.pickupLocation?.coordinates?.longitude;
    const deliveryLat = order?.deliveryLocation?.coordinates?.latitude;
    const deliveryLng = order?.deliveryLocation?.coordinates?.longitude;
 
    if (!pickupLat || !pickupLng) {
      req.flash('error', 'This order\'s pickup location has no valid coordinates. Please fix the pickup location before creating a delivery.');
      return res.redirect(`/admin/deliveries/create-from-order/${orderId}`);
    }
 
    if (!deliveryLat || !deliveryLng) {
      req.flash('error', 'This order\'s delivery location has no valid coordinates. Please fix the delivery location before creating a delivery.');
      return res.redirect(`/admin/deliveries/create-from-order/${orderId}`);
    }
 
    const pickupCoords = { latitude: pickupLat, longitude: pickupLng };
    const deliveryCoords = { latitude: deliveryLat, longitude: deliveryLng };
 
    // ==================== CREATE DELIVERY ====================
    const delivery = await Delivery.create({
      trackingNumber,
      orderId: order.orderNumber,
      customerId: order.customerId?._id || null,
      driverId,
      vehicleNumber: driver.vehicleNumber,
 
      // Original Factory Pickup (List view ke liye important, aur
      // rebuildDriverRouteChain() rank #1 ban'ne par yehi use karta hai)
      originalPickupLocation: order.pickupLocation,
 
      // Placeholder — rebuildDriverRouteChain() ke baad sahi ho jayega
      pickupLocation: {
        ...order.pickupLocation,
        coordinates: pickupCoords
      },
 
      deliveryLocation: {
        ...order.deliveryLocation,
        coordinates: deliveryCoords
      },
 
      packageDetails: {
        description: order.items?.map(i => i.productName).join(', ') || 'Package',
        quantity: order.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 1,
        weight: order.items?.reduce((sum, i) => sum + (i.specifications?.weight || 0), 0) || 0
      },
 
      scheduledPickupTime: scheduledPickupTime ? new Date(scheduledPickupTime) : null,
      scheduledDeliveryTime: scheduledDeliveryTime ? new Date(scheduledDeliveryTime) : null,
      instructions,
      waypoints: parsedWaypoints,
      distance: parseFloat(routeDistance) || 0,
      estimatedDuration: parseInt(routeDuration) || 0,
      status: 'assigned',
      priority: order.priority || 'medium',
      createdBy: req.user._id
    });
 
    // ✅ Ab is driver ki poori active queue ko greedy nearest-neighbor se
    // rebuild karo — yeh delivery.pickupLocation aur previousDeliveryId/
    // nextDeliveryId sab ko sahi order me set kar dega.
    let hasValidPreviousStop = false;
    try {
      await rebuildDriverRouteChain(driverId);
      const refreshed = await Delivery.findById(delivery._id).select('previousDeliveryId pickupLocation');
      hasValidPreviousStop = !!refreshed?.previousDeliveryId;
      // refreshed pickupLocation ko notification text ke liye use karenge neeche
      delivery.pickupLocation = refreshed?.pickupLocation || delivery.pickupLocation;
    } catch (chainErr) {
      console.error('[CREATE-DELIVERY] Route chain rebuild failed:', chainErr.message);
    }
 
    // Update order
    order.deliveryId = delivery._id;
    order.status = 'assigned';
    await order.save();
 
    // Status History
    await DeliveryStatusHistory.create({
      deliveryId: delivery._id,
      status: 'assigned',
      remarks: hasValidPreviousStop
        ? `Delivery assigned to ${driver.name} — chained in optimized route`
        : `Delivery assigned to ${driver.name}`,
      updatedBy: {
        userId: req.user._id,
        userRole: req.user.role,
        userName: req.user.name
      }
    });
 
    // Notifications
    if (driver.fcmToken) {
      try {
        const result = await sendNotification(driver.fcmToken, {
          title: "Delivery Assigned 🚚",
          body: `You have a new delivery. Pickup from ${delivery.pickupLocation?.address || 'location'}`,
          deliveryId: delivery._id.toString(),
          trackingNumber: delivery.trackingNumber,
          type: "delivery_assigned"
        });
        if (result) {
          console.log(`[CREATE-DELIVERY-NOTIF-SUCCESS] FCM push sent to driver ${driver._id}`);
        } else {
          console.warn(`[CREATE-DELIVERY-NOTIF] sendNotification returned null — check driver.fcmToken validity`);
        }
      } catch (pushErr) {
        console.error("[CREATE-DELIVERY-FCM-ERROR]", pushErr.code || pushErr.message || pushErr);
      }
    } else {
      console.warn(`No FCM token for driver ${driver._id} → assignment push notification skipped`);
    }
 
    try {
      await Notification.create({
        recipientId: driver._id,
        recipientType: 'Driver',
        type: 'delivery_assigned',
        title: 'New Delivery Assigned',
        message: `You have been assigned delivery ${delivery.trackingNumber}.`,
        referenceId: delivery._id,
        referenceModel: 'Delivery',
        priority: `${delivery.priority}`,
        createdAt: new Date()
      });
    } catch (notifErr) {
      console.error("[NOTIF-ERROR]", notifErr.message);
    }
 
    console.log('[CREATE-DELIVERY] Success:', delivery.trackingNumber);
    req.flash('success', 'Delivery created and driver assigned successfully!');
    res.redirect(`/admin/deliveries/${delivery._id}`);
 
  } catch (error) {
    console.error('[CREATE-DELIVERY] Error:', error);
    req.flash('error', error.message || 'Failed to create delivery');
    res.redirect(`/admin/orders/${req.params.orderId}/create-delivery`);
  }
};
 
// ============= CANCEL DELIVERY (ADMIN CAN ONLY CANCEL) =============
exports.cancelDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { remarks = 'Cancelled by admin' } = req.body;
 
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }
 
    if (['Delivered', 'Cancelled'].includes(delivery.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel delivery in ${delivery.status} status`
      });
    }
 
    const previousStatus = delivery.status;
    delivery.status = 'Cancelled';
    await delivery.save();
 
    // Fetch driver
    let driver = null;
    if (delivery.driverId) {
      driver = await Driver.findById(delivery.driverId).select('name fcmToken');
 
      // Free the driver
      await Driver.findByIdAndUpdate(delivery.driverId, {
        isAvailable: true,
        $unset: { currentLocation: "" } // optional: clear live location
      });
    }
 
    // Update order if linked
    if (delivery.orderId) {
      await Order.updateOne(
        { orderNumber: delivery.orderId },
        { status: 'Cancelled' }
      );
    }
 
    // Status history
    await DeliveryStatusHistory.create({
      deliveryId: delivery._id,
      status: 'Cancelled',
      previousStatus: previousStatus,
      remarks: remarks,
      updatedBy: {
        userId: req.user._id,
        userRole: req.user.role,
        userName: req.user.name
      }
    });
 
    // ────────────────────────────────────────────────
    // NOTIFICATIONS – only if driver exists
    // ────────────────────────────────────────────────
    if (driver) {
      console.log(`[CANCEL-NOTIF] Preparing for driver ${driver._id} (${driver.name})`);
 
      // 1. Push Notification (FCM)
      if (driver.fcmToken) {
        console.log(`[CANCEL-FCM] Attempting send to: ${driver.fcmToken.substring(0, 20)}...`);
        try {
          const result = await sendNotification(driver.fcmToken, {
            title: "Delivery Cancelled",
            body: `Your assigned delivery ${delivery.trackingNumber} has been cancelled.\nReason: ${remarks}`,
            deliveryId: delivery._id.toString(),
            trackingNumber: delivery.trackingNumber,
            reason: remarks,
            type: "delivery_cancelled"
          });
          if (result) {
            console.log(`[CANCEL-NOTIF-SUCCESS] FCM sent`);
          } else {
            console.warn(`[CANCEL-NOTIF] sendNotification returned null`);
          }
        } catch (pushErr) {
          console.error("[CANCEL-FCM-ERROR]", pushErr.code || pushErr.message || pushErr);
        }
      } else {
        console.warn("[CANCEL-NOTIF] No fcmToken for driver");
      }
 
      // 2. In-app Notification (consistent with schema)
      try {
        const notif = await Notification.create({
          recipientId: driver._id,
          recipientType: 'Driver',
          type: 'delivery_cancelled',
          title: 'Delivery Cancelled',
          message: `Your assigned delivery ${delivery.trackingNumber} has been cancelled.\nReason: ${remarks}`,
          referenceId: delivery._id,
          referenceModel: 'Delivery',
          priority: 'high',
          createdAt: new Date()
        });
        console.log(`[CANCEL-NOTIF-SUCCESS] In-app created → ID: ${notif._id}`);
      } catch (notifErr) {
        console.error("[CANCEL-NOTIF-ERROR]", notifErr.message || notifErr);
      }
    } else {
      console.warn("[CANCEL-NOTIF] No driver attached to delivery");
    }
 
    // Socket emit (if using)
    if (global.io && driver) {
      global.io.to('admin-room').emit('delivery:status:update', {
        deliveryId: delivery._id,
        status: 'Cancelled',
        timestamp: new Date()
      });
 
      global.io.to('admin-room').emit('driver:available', {
        driverId: delivery.driverId,
        driverName: driver.name,
        status: 'available'
      });
    }
 
    return res.json({
      success: true,
      message: 'Delivery cancelled successfully. Driver is now available again.'
    });
 
  } catch (error) {
    console.error('[CANCEL-DELIVERY] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel delivery' });
  }
};
 
// ============= GET DRIVER'S CURRENT LOCATION (API) =============
exports.getDriverCurrentLocation = async (req, res) => {
  try {
    const { deliveryId } = req.params;
 
    const delivery = await Delivery.findById(deliveryId)
      .populate({
        path: 'driverId',
        select: 'name vehicleNumber currentLocation'
      })
      .populate('journeyId')   // ← add this if you have journeyId in Delivery
      .lean();
 
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }
 
    if (!delivery.driverId) {
      return res.status(404).json({ success: false, message: 'No driver assigned' });
    }
 
    let locationData = {
      driverId: delivery.driverId._id,
      driverName: delivery.driverId.name,
      vehicleNumber: delivery.driverId.vehicleNumber,
      currentLocation: delivery.driverId.currentLocation || null,
      deliveryStatus: delivery.status,
      lastUpdate: delivery.driverId.currentLocation?.timestamp || null
    };
 
    // If journey exists and has history → send full path for completed/in-progress
    if (delivery.journeyId?.locationHistory?.length > 0) {
      locationData.pathHistory = delivery.journeyId.locationHistory.map(point => ({
        lat: point.latitude,
        lng: point.longitude,
        timestamp: point.timestamp
      }));
    }
 
    return res.json({
      success: true,
      data: locationData
    });
 
  } catch (error) {
    console.error('[GET-DRIVER-LOCATION] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get location' });
  }
};
 
// ============= EDIT DELIVERY =============
exports.renderEditDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
 
    const delivery = await Delivery.findById(deliveryId)
      .populate('customerId')
      .populate('driverId', 'name phone vehicleNumber')
      .lean();
 
    if (!delivery) {
      req.flash('error', 'Delivery not found');
      return res.redirect('/admin/deliveries');
    }
 
    // Get available drivers (current driver + all available ones)
    const drivers = await Driver.find({
      $or: [
        { _id: delivery.driverId },
        { isActive: true, isAvailable: true, profileStatus: 'approved' }
      ]
    })
      .select('name phone vehicleNumber profileImage isAvailable')
      .sort({ name: 1 })
      .lean();
 
    res.render('delivery_edit', {
      title: `Edit Delivery - ${delivery.trackingNumber}`,
      delivery,
      drivers,
      user: req.user,
      url: req.originalUrl,
      messages: req.flash()
    });
 
  } catch (error) {
    console.error('[RENDER-EDIT-DELIVERY] Error:', error);
    req.flash('error', 'Failed to load edit page');
    res.redirect('/admin/deliveries');
  }
};
 
 
exports.updateDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const {
      driverId: inputDriverId,
      scheduledPickupTime,
      scheduledDeliveryTime,
      instructions,
      waypoints,
      routeDistance,
      routeDuration
    } = req.body;
 
    console.log('[UPDATE-DEBUG] Input driverId:', inputDriverId);
    console.log('[UPDATE-DEBUG] Input driverId type:', typeof inputDriverId);
    console.log('[UPDATE-DEBUG] Request body:', req.body);
 
    // ────────────────────────────────────────────────
    // Clean & Validate driverId (handle [object Object] case)
    // ────────────────────────────────────────────────
    let cleanDriverId = null;
 
    if (inputDriverId) {
      // Invalid case from bad form serialization
      if (String(inputDriverId).includes('[object') || String(inputDriverId) === '[object Object]') {
        console.error('[UPDATE-ERROR] Invalid driverId format from form:', inputDriverId);
        req.flash('error', 'Invalid driver selection. Please try again.');
        return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
      }
 
      try {
        if (typeof inputDriverId === 'string' && inputDriverId.length === 24) {
          cleanDriverId = inputDriverId;
        } else if (typeof inputDriverId === 'object' && inputDriverId._id) {
          cleanDriverId = inputDriverId._id.toString();
        } else if (inputDriverId.toString && inputDriverId.toString().length === 24) {
          cleanDriverId = inputDriverId.toString();
        } else {
          throw new Error('Cannot extract valid driver ID');
        }
      } catch (parseErr) {
        console.error('[UPDATE-ERROR] Failed to parse driverId:', parseErr.message);
        req.flash('error', 'Invalid driver ID format. Please select a driver from the dropdown.');
        return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
      }
    }
 
    console.log('[UPDATE-DEBUG] Cleaned driverId:', cleanDriverId);
 
    // Fetch delivery
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      req.flash('error', 'Delivery not found');
      return res.redirect('/admin/deliveries');
    }
 
    const currentDriverIdStr = delivery.driverId ? delivery.driverId.toString() : null;
    console.log('[UPDATE-DEBUG] Current driverId (string):', currentDriverIdStr);
 
    // Parse waypoints
    let parsedWaypoints = [];
    if (waypoints) {
      try {
        parsedWaypoints = JSON.parse(waypoints);
      } catch (e) {
        console.warn('Invalid waypoints JSON:', e.message);
      }
    }
 
    // Update non-driver fields
    if (scheduledPickupTime) delivery.scheduledPickupTime = new Date(scheduledPickupTime);
    if (scheduledDeliveryTime) delivery.scheduledDeliveryTime = new Date(scheduledDeliveryTime);
    if (instructions) delivery.instructions = instructions;
    if (parsedWaypoints.length > 0) delivery.waypoints = parsedWaypoints;
    if (routeDistance) delivery.distance = parseFloat(routeDistance) || delivery.distance;
    if (routeDuration) delivery.estimatedDuration = parseInt(routeDuration) || delivery.estimatedDuration;
 
    // Handle driver change
    let driverChanged = false;
    let oldDriver = null;
    let newDriver = null;
    const newDriverIdStr = cleanDriverId;
 
    if (newDriverIdStr && newDriverIdStr !== currentDriverIdStr) {
      console.log('[UPDATE-DEBUG] Driver change detected');
 
      newDriver = await Driver.findById(newDriverIdStr);
      if (!newDriver) {
        req.flash('error', 'Selected driver not found');
        return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
      }
 
      if (!newDriver.isAvailable || newDriver.profileStatus !== 'approved') {
        req.flash('error', 'Selected driver is not available or not approved');
        return res.redirect(`/admin/deliveries/${deliveryId}/edit`);
      }
 
      // Free old driver
      if (currentDriverIdStr) {
        oldDriver = await Driver.findById(currentDriverIdStr);
        if (oldDriver) {
          oldDriver.isAvailable = true;
          await oldDriver.save();
          console.log(`[UPDATE] Freed old driver: ${oldDriver.name}`);
        }
      }
 
      // Assign new driver
      delivery.driverId = newDriver._id;
      delivery.vehicleNumber = newDriver.vehicleNumber;
      newDriver.isAvailable = false;
      await newDriver.save();
 
      driverChanged = true;
      console.log(`[UPDATE] Reassigned to new driver: ${newDriver.name}`);
    }
 
    // Save updated delivery
    await delivery.save();
    console.log('[UPDATE-DEBUG] Delivery saved successfully');
 
    // Status history
    await DeliveryStatusHistory.create({
      deliveryId: delivery._id,
      status: delivery.status,
      remarks: driverChanged
        ? `Delivery reassigned from ${oldDriver?.name || 'previous driver'} to ${newDriver?.name}`
        : 'Delivery details updated (route/schedule/etc.)',
      updatedBy: {
        userId: req.user._id,
        userRole: req.user.role,
        userName: req.user.name
      }
    });
 
    // ────────────────────────────────────────────────
    // NOTIFICATIONS
    // ────────────────────────────────────────────────
    console.log('[UPDATE-NOTIF] Starting notifications...');
 
    if (driverChanged) {
      console.log('[UPDATE-NOTIF] Driver changed - notifying both old and new');
 
      // OLD DRIVER (cancel/reassign notification)
      if (oldDriver) {
        console.log(`[UPDATE-NOTIF] Notifying OLD driver: ${oldDriver.name}`);
 
        // Push notification
        if (oldDriver.fcmToken) {
          try {
            await sendNotification(oldDriver.fcmToken, {
              title: "Delivery Reassigned",
              body: `Delivery ${delivery.trackingNumber} has been reassigned to another driver.`,
              deliveryId: delivery._id.toString(),
              trackingNumber: delivery.trackingNumber,
              reason: "Reassigned to another driver",
              type: "delivery_cancelled"
            });
            console.log(`[UPDATE-NOTIF] FCM sent to OLD driver`);
          } catch (e) {
            console.error("[UPDATE-FCM-OLD-ERROR]", e.message || e);
          }
        } else {
          console.warn("[UPDATE-NOTIF] No FCM token for OLD driver");
        }
 
        // In-app notification
        try {
          await Notification.create({
            recipientId: oldDriver._id,
            recipientType: 'Driver',
            type: 'delivery_cancelled',
            title: 'Delivery Reassigned',
            message: `Delivery ${delivery.trackingNumber} has been reassigned to another driver.`,
            referenceId: delivery._id,
            referenceModel: 'Delivery',
            priority: 'high',
            createdAt: new Date()
          });
          console.log(`[UPDATE-NOTIF] In-app sent to OLD driver`);
        } catch (e) {
          console.error("[UPDATE-INAPP-OLD-ERROR]", e.message || e);
        }
      }
 
      // NEW DRIVER (assigned notification)
      if (newDriver) {
        console.log(`[UPDATE-NOTIF] Notifying NEW driver: ${newDriver.name}`);
 
        // Push notification
        if (newDriver.fcmToken) {
          try {
            await sendNotification(newDriver.fcmToken, {
              title: "New Delivery Assigned",
              body: `Delivery ${delivery.trackingNumber} has been assigned to you. Please check details in the app.`,
              deliveryId: delivery._id.toString(),
              trackingNumber: delivery.trackingNumber,
              customerName: delivery.customerId?.name || "Customer",
              pickup: delivery.pickupLocation?.address || "",
              type: "delivery_assigned"
            });
            console.log(`[UPDATE-NOTIF] FCM sent to NEW driver`);
          } catch (e) {
            console.error("[UPDATE-FCM-NEW-ERROR]", e.message || e);
          }
        } else {
          console.warn("[UPDATE-NOTIF] No FCM token for NEW driver");
        }
 
        // In-app notification
        try {
          await Notification.create({
            recipientId: newDriver._id,
            recipientType: 'Driver',
            type: 'delivery_assigned',
            title: 'New Delivery Assigned',
            message: `Delivery ${delivery.trackingNumber} has been assigned to you. Please check details in the app.`,
            referenceId: delivery._id,
            referenceModel: 'Delivery',
            priority: 'high',
            createdAt: new Date()
          });
          console.log(`[UPDATE-NOTIF] In-app sent to NEW driver`);
        } catch (e) {
          console.error("[UPDATE-INAPP-NEW-ERROR]", e.message || e);
        }
      }
    } else {
      // No driver change → notify current driver about update
      console.log('[UPDATE-NOTIF] No driver change - notifying current driver');
 
      const currentDriver = await Driver.findById(delivery.driverId);
      if (currentDriver) {
        console.log(`[UPDATE-NOTIF] Current driver: ${currentDriver.name}`);
 
        // Push notification
        if (currentDriver.fcmToken) {
          try {
            await sendNotification(currentDriver.fcmToken, {
              title: "Delivery Updated",
              body: `Delivery ${delivery.trackingNumber} details have been updated. Please check the app.`,
              deliveryId: delivery._id.toString(),
              trackingNumber: delivery.trackingNumber,
              type: "delivery_updated"
            });
            console.log(`[UPDATE-NOTIF] FCM update sent to current driver`);
          } catch (e) {
            console.error("[UPDATE-FCM-CURRENT-ERROR]", e.message || e);
          }
        } else {
          console.warn("[UPDATE-NOTIF] No FCM token for current driver");
        }
 
        // In-app notification
        try {
          await Notification.create({
            recipientId: currentDriver._id,
            recipientType: 'Driver',
            type: 'delivery_updated',
            title: 'Delivery Updated',
            message: `Delivery ${delivery.trackingNumber} details have been updated. Please check the app.`,
            referenceId: delivery._id,
            referenceModel: 'Delivery',
            priority: 'medium',
            createdAt: new Date()
          });
          console.log(`[UPDATE-NOTIF] In-app update created for current driver`);
        } catch (e) {
          console.error("[UPDATE-INAPP-CURRENT-ERROR]", e.message || e);
        }
      } else {
        console.warn("[UPDATE-NOTIF] No current driver found");
      }
    }
 
    console.log('[UPDATE-DEBUG] Update completed successfully');
    req.flash('success', 'Delivery updated successfully!');
    res.redirect(`/admin/deliveries/${delivery._id}`);
 
  } catch (error) {
    console.error('[UPDATE-DELIVERY] Error:', error);
    console.error('[UPDATE-DELIVERY] Stack:', error.stack);
    req.flash('error', error.message || 'Failed to update delivery');
    res.redirect(`/admin/deliveries/${req.params.deliveryId}/edit`);
  }
};
 
// ============= GET COMPLETED JOURNEY ROUTE (for delivered deliveries) =============
exports.getCompletedJourneyRoute = async (req, res) => {
  try {
    const { deliveryId } = req.params;
 
    // Find journey for this delivery
    const Journey = require('../../models/Journey');
    const journey = await Journey.findOne({ deliveryId })
      .select('waypoints totalDistance totalDuration averageSpeed startLocation endLocation')
      .lean();
 
    if (!journey) {
      return res.status(404).json({
        success: false,
        message: 'No journey found for this delivery'
      });
    }
 
    // Build path from journey waypoints
    const path = [];
 
    // Add start location
    if (journey.startLocation?.coordinates) {
      path.push({
        lat: journey.startLocation.coordinates.latitude,
        lng: journey.startLocation.coordinates.longitude
      });
    }
 
    // Add all waypoints
    if (journey.waypoints && journey.waypoints.length > 0) {
      journey.waypoints.forEach(wp => {
        if (wp.location?.coordinates) {
          path.push({
            lat: wp.location.coordinates.latitude,
            lng: wp.location.coordinates.longitude
          });
        }
      });
    }
 
    // Add end location
    if (journey.endLocation?.coordinates) {
      path.push({
        lat: journey.endLocation.coordinates.latitude,
        lng: journey.endLocation.coordinates.longitude
      });
    }
 
    console.log(`[GET-JOURNEY-ROUTE] Delivery: ${deliveryId}, Path points: ${path.length}`);
 
    return res.json({
      success: true,
      data: {
        path,
        stats: {
          totalDistance: journey.totalDistance ? `${journey.totalDistance.toFixed(2)} km` : 'N/A',
          totalDuration: journey.totalDuration ? `${journey.totalDuration} mins` : 'N/A',
          averageSpeed: journey.averageSpeed ? `${journey.averageSpeed.toFixed(1)} km/h` : 'N/A'
        }
      }
    });
 
  } catch (error) {
    console.error('[GET-JOURNEY-ROUTE] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch journey route',
      error: error.message
    });
  }
};
 
exports.addDeliveryRemark = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { message, images } = req.body;
 
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return errorResponse(res, 'Delivery not found', 404);
    }
 
    const remark = {
      message,
      images: images || [],
      createdBy: req.user._id,
      createdAt: new Date()
    };
 
    if (!delivery.remarks) delivery.remarks = [];
    delivery.remarks.push(remark);
 
    await delivery.save();
 
    return successResponse(res, 'Remark added successfully', { remark });
 
  } catch (error) {
    console.error('[ADD-REMARK] Error:', error);
    return errorResponse(res, 'Failed to add remark', 500);
  }
};
 
// ============= GET ALL DRIVER LOCATIONS FOR DASHBOARD =============
exports.getAllDriverLocations = async (req, res) => {
  try {
    // Find all active drivers with their current locations
    const drivers = await Driver.find({
      isActive: true,
      profileStatus: 'approved'
    })
      .select('name phone vehicleNumber profileImage isAvailable currentLocation')
      .lean();
 
    // Filter drivers who have valid location data
    const driversWithLocation = drivers.filter(driver =>
      driver.currentLocation &&
      driver.currentLocation.latitude &&
      driver.currentLocation.longitude
    );
 
    // Format response
    const formattedDrivers = driversWithLocation.map(driver => ({
      _id: driver._id,
      name: driver.name,
      phone: driver.phone,
      vehicleNumber: driver.vehicleNumber,
      profileImage: driver.profileImage,
      isAvailable: driver.isAvailable,
      currentLocation: {
        latitude: driver.currentLocation.latitude,
        longitude: driver.currentLocation.longitude,
        timestamp: driver.currentLocation.timestamp || new Date(),
        speed: driver.currentLocation.speed || 0,
        heading: driver.currentLocation.heading || 0
      }
    }));
 
    console.log(`[GET-ALL-DRIVER-LOCATIONS] Returning ${formattedDrivers.length} drivers with location`);
 
    return res.json({
      success: true,
      data: formattedDrivers,
      count: formattedDrivers.length
    });
 
  } catch (error) {
    console.error('[GET-ALL-DRIVER-LOCATIONS] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch driver locations',
      error: error.message
    });
  }
};
 
// ============= GET SINGLE DRIVER LOCATION =============
exports.getSingleDriverLocation = async (req, res) => {
  try {
    const { driverId } = req.params;
 
    const driver = await Driver.findById(driverId)
      .select('name phone vehicleNumber isAvailable currentLocation')
      .lean();
 
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }
 
    if (!driver.currentLocation || !driver.currentLocation.latitude) {
      return res.status(404).json({
        success: false,
        message: 'Driver location not available'
      });
    }
 
    return res.json({
      success: true,
      data: {
        _id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicleNumber: driver.vehicleNumber,
        isAvailable: driver.isAvailable,
        currentLocation: driver.currentLocation
      }
    });
 
  } catch (error) {
    console.error('[GET-SINGLE-DRIVER-LOCATION] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch driver location',
      error: error.message
    });
  }
};
 
// ============= GET DRIVERS BY STATUS =============
exports.getDriversByStatus = async (req, res) => {
  try {
    const { status } = req.query; // 'available', 'busy', 'all'
 
    let query = {
      isActive: true,
      profileStatus: 'approved'
    };
 
    if (status === 'available') {
      query.isAvailable = true;
    } else if (status === 'busy') {
      query.isAvailable = false;
    }
 
    const drivers = await Driver.find(query)
      .select('name phone vehicleNumber profileImage isAvailable currentLocation')
      .lean();
 
    const driversWithLocation = drivers.filter(driver =>
      driver.currentLocation &&
      driver.currentLocation.latitude &&
      driver.currentLocation.longitude
    );
 
    console.log(`[GET-DRIVERS-BY-STATUS] Status: ${status || 'all'}, Found: ${driversWithLocation.length} drivers`);
 
    return res.json({
      success: true,
      data: driversWithLocation,
      count: driversWithLocation.length
    });
 
  } catch (error) {
    console.error('[GET-DRIVERS-BY-STATUS] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch drivers',
      error: error.message
    });
  }
};
 
// ============= UPDATE DELIVERY PRIORITY (FULL SOCKET UPDATE) =============
exports.updateDeliveryPriority = async (req, res) => {
  console.log('\n=== [PRIORITY UPDATE] ENDPOINT HIT ===');
  console.log('URL:', req.originalUrl);
  console.log('Params:', req.params);
  console.log('Body:', req.body);
 
  try {
    const { deliveryId } = req.params;
    const { priority } = req.body;
 
    if (!deliveryId) {
      console.log('❌ Missing deliveryId');
      return res.status(400).json({ success: false, message: 'Delivery ID is required' });
    }
 
    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      console.log('❌ Invalid priority:', priority);
      return res.status(400).json({ success: false, message: 'Invalid priority value' });
    }
 
    // Full delivery fetch with relations
    const delivery = await Delivery.findById(deliveryId)
      .populate('driverId', 'name fcmToken vehicleNumber')
      .populate('customerId', 'name companyName')
      .lean();
 
    if (!delivery) {
      console.log('❌ Delivery not found');
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }
 
    const oldPriority = delivery.priority;
 
    // Update in DB
    await Delivery.findByIdAndUpdate(deliveryId, { priority });
 
    console.log(`✅ Priority updated: ${oldPriority} → ${priority}`);
 
    // ================================================================
    // ✅ FIX: Priority update DB me save ho jaata tha, lekin driver ki
    // route chain (pickupLocation / previousDeliveryId / nextDeliveryId,
    // jo rebuildDriverRouteChain() banata hai) kabhi rebuild nahi hoti
    // thi. Isliye admin panel pe priority badge turant "HIGH" dikhta
    // tha, par physical address chain purani (creation-order/old
    // nearest-neighbor) waali hi reh jaati thi — priority ka route
    // sequence pe koi asar nahi padta tha. Ab priority change hote hi
    // us driver ki poori active queue ko turant rebuild karte hain,
    // taaki naya HIGH-priority stop turant chain me upar/pehle aaye.
    // ================================================================
    if (delivery.driverId?._id || delivery.driverId) {
      try {
        const driverIdForRebuild = delivery.driverId?._id || delivery.driverId;
        await rebuildDriverRouteChain(driverIdForRebuild);
        console.log(`[PRIORITY-UPDATE] Route chain rebuilt for driver ${driverIdForRebuild} after priority change`);
      } catch (chainErr) {
        console.error('[PRIORITY-UPDATE] Route chain rebuild failed:', chainErr.message);
      }
    }
 
    // Refresh full delivery data (rebuild ke baad — pickupLocation bhi fresh chahiye)
    const updatedDelivery = await Delivery.findById(deliveryId)
      .populate('driverId', 'name fcmToken vehicleNumber')
      .populate('customerId', 'name companyName')
      .lean();
 
    // ==================== SOCKET PAYLOAD ====================
    const io = req.app.get('io');
    const socketPayload = {
      type: "delivery:priority:updated",
      deliveryId: updatedDelivery._id.toString(),
      trackingNumber: updatedDelivery.trackingNumber,
      priority: updatedDelivery.priority,
      oldPriority: oldPriority,
      status: updatedDelivery.status,
      customerName: updatedDelivery.customerId?.companyName || updatedDelivery.customerId?.name || 'Customer',
      driverName: updatedDelivery.driverId?.name || null,
      vehicleNumber: updatedDelivery.driverId?.vehicleNumber || null,
      pickupAddress: updatedDelivery.pickupLocation?.address || '',
      deliveryAddress: updatedDelivery.deliveryLocation?.address || '',
      scheduledPickupTime: updatedDelivery.scheduledPickupTime,
      scheduledDeliveryTime: updatedDelivery.scheduledDeliveryTime,
      actualPickupTime: updatedDelivery.actualPickupTime,
      actualDeliveryTime: updatedDelivery.actualDeliveryTime,
      timestamp: new Date().toISOString(),
      message: `Priority changed to ${priority.toUpperCase()}`
    };
 
    if (io) {
      // Admin ko full update
      io.to("admin-room").emit("delivery:updated", socketPayload);
      console.log('📤 Socket emitted to admin-room: delivery:updated');
 
      // Driver ko bhi (agar assigned hai)
      if (updatedDelivery.driverId) {
        io.to(`driver-${updatedDelivery.driverId._id}`).emit("delivery:updated", socketPayload);
        console.log(`📤 Socket emitted to driver room`);
      }
    }
 
    // FCM (optional)
    if (updatedDelivery.driverId?.fcmToken) {
      try {
        await sendNotification(updatedDelivery.driverId.fcmToken, {
          title: `Priority Updated: ${priority.toUpperCase()}`,
          body: `Your delivery ${updatedDelivery.trackingNumber} priority has been changed.`,
          type: 'priority_changed',
          deliveryId: updatedDelivery._id.toString(),
          trackingNumber: updatedDelivery.trackingNumber
        });
        console.log(`[PRIORITY-NOTIF-SUCCESS] FCM sent to driver`);
      } catch (e) {
        console.error("[PRIORITY-FCM-ERROR]", e.message || e);
      }
    }
 
    return res.json({
      success: true,
      message: `Priority updated to ${priority.toUpperCase()}`,
      delivery: {
        _id: updatedDelivery._id,
        trackingNumber: updatedDelivery.trackingNumber,
        priority: updatedDelivery.priority,
        status: updatedDelivery.status,
        pickupAddress: updatedDelivery.pickupLocation?.address,
        deliveryAddress: updatedDelivery.deliveryLocation?.address,
        driverName: updatedDelivery.driverId?.name
      }
    });
 
  } catch (error) {
    console.error('=== PRIORITY UPDATE ERROR ===', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};