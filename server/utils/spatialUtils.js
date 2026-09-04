/**
 * Geospatial Utilities & Spatial Indexing Engine
 * Includes: Haversine distance, Point-in-Polygon (Ray casting), Polygon Overlap,
 * Spatial Grid / Geohash indexing, and Weighted Match Scoring.
 */

// ── 1. Haversine Distance Formula ──────────────────────────────────────
/**
 * Calculate Great Circle distance between two points in kilometers.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;

  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // Distance in km rounded to 2 decimals
}

// ── 2. Point-in-Polygon Logic (Ray-Casting Algorithm) ──────────────────
/**
 * Determines whether a point (lat, lng) lies inside a polygon boundary.
 * Polygon structure: [{ lat, lng }, { lat, lng }, ...]
 */
function pointInPolygon(point, polygon) {
  if (!polygon || !Array.isArray(polygon) || polygon.length < 3) return false;

  const x = point.lng;
  const y = point.lat;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

// ── 3. Polygon-Overlap Logic ────────────────────────────────────────────
/**
 * Helper to check line segment intersection (p1-p2 vs p3-p4).
 */
function lineIntersect(p1, p2, p3, p4) {
  const ccw = (A, B, C) => (C.lat - A.lat) * (B.lng - A.lng) > (B.lat - A.lat) * (C.lng - A.lng);
  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

/**
 * Determines whether two polygon boundaries overlap.
 * Uses edge intersection test and vertex containment test.
 */
function polygonOverlap(polyA, polyB) {
  if (!polyA || !polyB || polyA.length < 3 || polyB.length < 3) return false;

  // Check vertex containment in either direction
  for (const pt of polyA) {
    if (pointInPolygon(pt, polyB)) return true;
  }
  for (const pt of polyB) {
    if (pointInPolygon(pt, polyA)) return true;
  }

  // Check edge intersections
  for (let i = 0; i < polyA.length; i++) {
    const a1 = polyA[i];
    const a2 = polyA[(i + 1) % polyA.length];

    for (let j = 0; j < polyB.length; j++) {
      const b1 = polyB[j];
      const b2 = polyB[(j + 1) % polyB.length];

      if (lineIntersect(a1, a2, b1, b2)) return true;
    }
  }

  return false;
}

// ── 4. Spatial Indexing (Geohash & Spatial Grid Key) ───────────────────
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Standard Geohash encoder (precision default 5 = ~4.9km x 4.9km grid cell)
 */
function encodeGeohash(lat, lng, precision = 5) {
  if (lat == null || lng == null) return '';
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';

  let latMin = -90, latMax = 90;
  let lngMin = -180, lngMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const lngMid = (lngMin + lngMax) / 2;
      if (lng >= lngMid) {
        idx = (idx << 1) + 1;
        lngMin = lngMid;
      } else {
        idx = (idx << 1) + 0;
        lngMax = lngMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        idx = (idx << 1) + 1;
        latMin = latMid;
      } else {
        idx = (idx << 1) + 0;
        latMax = latMid;
      }
    }

    evenBit = !evenBit;

    if (++bit === 5) {
      geohash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
}

/**
 * Spatial Grid Key (e.g. step = 0.05 deg ~= 5km grid)
 */
function getGridKey(lat, lng, step = 0.05) {
  if (lat == null || lng == null) return '';
  const latBucket = Math.floor(lat / step) * step;
  const lngBucket = Math.floor(lng / step) * step;
  return `grid_${latBucket.toFixed(3)}_${lngBucket.toFixed(3)}`;
}

/**
 * Get neighboring grid keys around a center coordinate to allow fast spatial index filtering
 */
function getNeighborGridKeys(lat, lng, radiusKm = 5, step = 0.05) {
  if (lat == null || lng == null) return [];
  // 1 degree approx 111 km
  const deltaDeg = Math.ceil((radiusKm / 111) / step) * step;
  const keys = new Set();

  for (let dLat = -deltaDeg; dLat <= deltaDeg; dLat += step) {
    for (let dLng = -deltaDeg; dLng <= deltaDeg; dLng += step) {
      keys.add(getGridKey(lat + dLat, lng + dLng, step));
    }
  }

  return Array.from(keys);
}

// ── 5. Weighted Scoring Function & Ranking Engine ────────────────────────
/**
 * Ranks search results using a composite scoring algorithm across:
 * - Distance fit (40% weight)
 * - Price fit (30% weight)
 * - Area/Size fit (15% weight)
 * - Filter & Amenities match (15% weight)
 * Returns a score between 0 and 100.
 */
function calculateWeightedScore(listing, criteria = {}) {
  const {
    userLat,
    userLng,
    radiusKm = 10,
    targetPrice,
    minPrice,
    maxPrice,
    propertyType,
    furnishedStatus,
    minArea,
    maxArea,
  } = criteria;

  let totalScore = 0;

  // A. Distance Score (0 - 40 points)
  let distanceKm = null;
  if (userLat != null && userLng != null && listing.coordinates) {
    distanceKm = haversineDistance(
      userLat,
      userLng,
      listing.coordinates.lat,
      listing.coordinates.lng
    );
    if (distanceKm <= radiusKm) {
      // 40 points for 0km, decreasing to 0 points at max radius
      const distRatio = Math.max(0, 1 - distanceKm / radiusKm);
      totalScore += distRatio * 40;
    }
  } else {
    // Neutral fallback if no location specified
    totalScore += 20;
  }

  // B. Price Fit Score (0 - 30 points)
  if (listing.price) {
    if (minPrice && maxPrice) {
      if (listing.price >= minPrice && listing.price <= maxPrice) {
        totalScore += 30;
      } else {
        const diff = Math.min(
          Math.abs(listing.price - minPrice),
          Math.abs(listing.price - maxPrice)
        );
        const penalty = Math.min(25, (diff / maxPrice) * 30);
        totalScore += Math.max(0, 30 - penalty);
      }
    } else if (targetPrice) {
      const diffRatio = Math.abs(listing.price - targetPrice) / targetPrice;
      const priceScore = Math.max(0, 30 * (1 - diffRatio));
      totalScore += priceScore;
    } else {
      totalScore += 20;
    }
  }

  // C. Area/Size Score (0 - 15 points)
  const size = listing.size || 1000;
  if (minArea || maxArea) {
    if ((!minArea || size >= minArea) && (!maxArea || size <= maxArea)) {
      totalScore += 15;
    } else {
      totalScore += 5;
    }
  } else {
    totalScore += 10;
  }

  // D. Filter & Attribute Match Score (0 - 15 points)
  let attributeMatch = 15;
  if (propertyType && propertyType !== 'All') {
    if (listing.propertyType === propertyType) attributeMatch += 5;
    else attributeMatch -= 5;
  }
  if (furnishedStatus && furnishedStatus !== 'All') {
    if (listing.furnishedStatus === furnishedStatus) attributeMatch += 5;
    else attributeMatch -= 5;
  }
  totalScore += Math.max(0, Math.min(15, attributeMatch));

  return {
    score: Math.min(100, Math.round(totalScore)),
    distanceKm,
  };
}

module.exports = {
  haversineDistance,
  pointInPolygon,
  polygonOverlap,
  encodeGeohash,
  getGridKey,
  getNeighborGridKeys,
  calculateWeightedScore,
};
