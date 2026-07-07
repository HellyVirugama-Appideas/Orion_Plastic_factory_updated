// ================================================================
// utils/routeOptimizer.js
// Route optimization: nearest-neighbor algorithm + Haversine distance
// ================================================================

function haversineDistance(lat1, lng1, lat2, lng2) {
  if (
    lat1 === undefined || lng1 === undefined ||
    lat2 === undefined || lng2 === undefined ||
    lat1 === null || lng1 === null || lat2 === null || lng2 === null
  ) {
    return Infinity;
  }

  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in KM

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Nearest-neighbor route optimization.
 * startPoint se shuru karke, har step pe sabse najdeeki delivery
 * choose karta hai, phir wahi uska agla starting point ban jata hai.
 */
function optimizeRoute(startPoint, deliveries) {
  if (!Array.isArray(deliveries) || deliveries.length === 0) return [];

  const remaining = [...deliveries];
  const ordered = [];
  let currentPoint = startPoint;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const loc = remaining[i].deliveryLocation?.coordinates;
      const dist = haversineDistance(
        currentPoint.latitude,
        currentPoint.longitude,
        loc?.latitude,
        loc?.longitude
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const next = remaining.splice(nearestIdx, 1)[0];

    ordered.push({
      ...(next.toObject ? next.toObject() : next),
      routeSequence: ordered.length + 1,
      distanceFromPrevious: Number(nearestDist.toFixed(2)),
      effectivePickupLocation: {
        address: currentPoint.address || (ordered.length === 0 ? 'Orion Plastic Factory' : ordered[ordered.length - 1]?.deliveryLocation?.address),
        coordinates: {
          latitude: currentPoint.latitude,
          longitude: currentPoint.longitude,
        }
      }
    });

    currentPoint = {
      latitude: next.deliveryLocation?.coordinates?.latitude,
      longitude: next.deliveryLocation?.coordinates?.longitude,
      address: next.deliveryLocation?.address,
    };
  }

  return ordered;
}

module.exports = { haversineDistance, optimizeRoute };