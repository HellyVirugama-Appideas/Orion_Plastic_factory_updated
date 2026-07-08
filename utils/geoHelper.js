const axios = require('axios');


// Calculate distance between two coordinates using Haversine formula
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance; // Returns distance in kilometers
};

// Convert degrees to radians
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Optimize route using Nearest Neighbor algorithm
exports.optimizeRoute = (startLat, startLng, locations) => {
  if (!locations || locations.length === 0) {
    return [];
  }

  const optimized = [];
  const remaining = [...locations];
  let currentLat = startLat;
  let currentLng = startLng;

  // Sort by priority first (urgent deliveries first)
  remaining.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    // Find nearest location
    remaining.forEach((location, index) => {
      const distance = exports.calculateDistance(
        currentLat,
        currentLng,
        location.latitude,
        location.longitude
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    // Add nearest location to optimized route
    const nearest = remaining.splice(nearestIndex, 1)[0];
    optimized.push(nearest);
    
    // Update current position
    currentLat = nearest.latitude;
    currentLng = nearest.longitude;
  }

  return optimized;
};

// Calculate estimated time based on distance and average speed
exports.calculateEstimatedTime = (distanceKm, averageSpeedKmh = 40) => {
  const hours = distanceKm / averageSpeedKmh;
  const minutes = Math.round(hours * 60);
  return minutes;
};

// Get bounding box for a set of coordinates
exports.getBoundingBox = (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLng = coordinates[0].longitude;
  let maxLng = coordinates[0].longitude;

  coordinates.forEach(coord => {
    if (coord.latitude < minLat) minLat = coord.latitude;
    if (coord.latitude > maxLat) maxLat = coord.latitude;
    if (coord.longitude < minLng) minLng = coord.longitude;
    if (coord.longitude > maxLng) maxLng = coord.longitude;
  });

  return {
    southwest: { latitude: minLat, longitude: minLng },
    northeast: { latitude: maxLat, longitude: maxLng }
  };
};

// Check if a point is within radius of another point
exports.isWithinRadius = (lat1, lng1, lat2, lng2, radiusKm) => {
  const distance = exports.calculateDistance(lat1, lng1, lat2, lng2);
  return distance <= radiusKm;
};

// Get center point of multiple coordinates
exports.getCenterPoint = (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  let x = 0, y = 0, z = 0;

  coordinates.forEach(coord => {
    const lat = toRadians(coord.latitude);
    const lng = toRadians(coord.longitude);

    x += Math.cos(lat) * Math.cos(lng);
    y += Math.cos(lat) * Math.sin(lng);
    z += Math.sin(lat);
  });

  const total = coordinates.length;
  x = x / total;
  y = y / total;
  z = z / total;

  const centralLng = Math.atan2(y, x);
  const centralSquareRoot = Math.sqrt(x * x + y * y);
  const centralLat = Math.atan2(z, centralSquareRoot);

  return {
    latitude: centralLat * (180 / Math.PI),
    longitude: centralLng * (180 / Math.PI)
  };
};

// ================================================================
// GOOGLE MAPS DISTANCE MATRIX — real road distance/duration
// (Google Maps API key already used in the project — GOOGLE_MAPS_API_KEY)
// Returns an array (same order as `destinations`) of { distanceKm, durationMin }
// or `null` if the API/key is unavailable/fails, so callers can fall back
// to the straight-line Haversine calculation.
// ================================================================
exports.getGoogleDistanceMatrix = async (origin, destinations) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || !origin?.latitude || !origin?.longitude || !destinations || destinations.length === 0) {
      return null;
    }

    const originsParam = `${origin.latitude},${origin.longitude}`;
    const destinationsParam = destinations
      .map(d => `${d.latitude},${d.longitude}`)
      .join('|');

    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: originsParam,
        destinations: destinationsParam,
        key: apiKey,
        mode: 'driving',
        departure_time: 'now',
        traffic_model: 'best_guess'
      },
      timeout: 6000
    });

    if (response.data.status !== 'OK') return null;

    const elements = response.data.rows?.[0]?.elements || [];
    if (elements.length !== destinations.length) return null;

    return elements.map(el => {
      if (el.status !== 'OK') return { distanceKm: null, durationMin: null };
      return {
        distanceKm: el.distance?.value ? el.distance.value / 1000 : null,
        durationMin: el.duration_in_traffic?.value
          ? Math.round(el.duration_in_traffic.value / 60)
          : (el.duration?.value ? Math.round(el.duration.value / 60) : null)
      };
    });
  } catch (err) {
    console.error('[GOOGLE-DISTANCE-MATRIX] Failed:', err.message);
    return null;
  }
};

// ================================================================
// SORT BY PROXIMITY — nearest-first, chahe delivery kaise bhi assign
// hui ho (ek-ek karke ya bulk route se). Google Distance Matrix se
// asli road distance/time use karta hai; agar API/key fail ho jaaye
// ya driver ki location na ho, seedha Haversine (straight-line) pe
// fallback kar leta hai — result kabhi empty nahi aata.
//
// `items`      : koi bhi array (deliveries, orders, etc.)
// `getCoords`  : function(item) => {latitude, longitude} | null
//
// Returns: [{ item, distanceKm, durationMin, source: 'google'|'haversine' }, ...]
//          sorted nearest-first.
// ================================================================
exports.sortByProximity = async (origin, items, getCoords) => {
  if (!items || items.length === 0) return [];

  if (!origin?.latitude || !origin?.longitude) {
    // Driver ki live location hi nahi hai — kuch bhi resort nahi kar sakte,
    // original order hi wapas bhejo (distance unknown).
    return items.map(item => ({ item, distanceKm: Infinity, durationMin: null, source: 'none' }));
  }

  const destinations = items.map(item => getCoords(item));
  const allCoordsValid = destinations.every(d => d?.latitude && d?.longitude);

  let googleResults = null;
  if (allCoordsValid) {
    googleResults = await exports.getGoogleDistanceMatrix(origin, destinations);
  }

  let ranked;
  if (googleResults) {
    ranked = items.map((item, idx) => ({
      item,
      distanceKm: googleResults[idx]?.distanceKm ?? Infinity,
      durationMin: googleResults[idx]?.durationMin ?? null,
      source: 'google'
    }));
  } else {
    // Fallback: Haversine straight-line distance
    ranked = items.map((item, idx) => {
      const coords = destinations[idx];
      const distanceKm = coords
        ? exports.calculateDistance(origin.latitude, origin.longitude, coords.latitude, coords.longitude)
        : Infinity;
      return { item, distanceKm, durationMin: null, source: 'haversine' };
    });
  }

  ranked.sort((a, b) => a.distanceKm - b.distanceKm);
  return ranked;
};


exports.geocodeAddress = async (addressText) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('[GEOCODE] GOOGLE_MAPS_API_KEY not set in env — skipping geocode');
      return null;
    }
    if (!addressText || typeof addressText !== 'string' || addressText.trim().length < 3) {
      console.warn('[GEOCODE] Address text missing/too short — skipping geocode');
      return null;
    }
 
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressText)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
 
    if (data.status !== 'OK' || !data.results?.length) {
      console.warn(`[GEOCODE] Failed for "${addressText}" — status: ${data.status}`);
      return null;
    }
 
    const loc = data.results[0].geometry.location;
    return { latitude: loc.lat, longitude: loc.lng };
 
  } catch (err) {
    console.error('[GEOCODE] Error:', err.message);
    return null;
  }
};
 