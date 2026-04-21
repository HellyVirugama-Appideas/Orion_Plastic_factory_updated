// Calculate distance between two coordinates using Haversine formula
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
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