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

// ── 6. Geocoding & Location Resolution Helper ─────────────────────────────
const LOCATION_COORDINATES_MAP = [
  { keywords: ['dhanmondi'], lat: 23.7542, lng: 90.3769, polygon: [{ lat: 23.752, lng: 90.374 }, { lat: 23.756, lng: 90.374 }, { lat: 23.756, lng: 90.378 }, { lat: 23.752, lng: 90.378 }] },
  { keywords: ['gulshan 2', 'gulshan-2', 'gulshan 1', 'gulshan-1', 'gulshan'], lat: 23.7925, lng: 90.4078, polygon: [{ lat: 23.791, lng: 90.406 }, { lat: 23.794, lng: 90.406 }, { lat: 23.794, lng: 90.409 }, { lat: 23.791, lng: 90.409 }] },
  { keywords: ['banani'], lat: 23.7937, lng: 90.4066, polygon: [{ lat: 23.792, lng: 90.404 }, { lat: 23.795, lng: 90.404 }, { lat: 23.795, lng: 90.408 }, { lat: 23.792, lng: 90.408 }] },
  { keywords: ['uttara'], lat: 23.8724, lng: 90.3984, polygon: [{ lat: 23.870, lng: 90.396 }, { lat: 23.875, lng: 90.396 }, { lat: 23.875, lng: 90.400 }, { lat: 23.870, lng: 90.400 }] },
  { keywords: ['mirpur'], lat: 23.8069, lng: 90.3687, polygon: [{ lat: 23.804, lng: 90.366 }, { lat: 23.809, lng: 90.366 }, { lat: 23.809, lng: 90.371 }, { lat: 23.804, lng: 90.371 }] },
  { keywords: ['bashundhara'], lat: 23.8151, lng: 90.4255, polygon: [{ lat: 23.813, lng: 90.423 }, { lat: 23.818, lng: 90.423 }, { lat: 23.818, lng: 90.428 }, { lat: 23.813, lng: 90.428 }] },
  { keywords: ['farmgate'], lat: 23.7580, lng: 90.3898, polygon: [{ lat: 23.756, lng: 90.387 }, { lat: 23.760, lng: 90.387 }, { lat: 23.760, lng: 90.392 }, { lat: 23.756, lng: 90.392 }] },
  { keywords: ['mohakhali'], lat: 23.7778, lng: 90.3996, polygon: [{ lat: 23.775, lng: 90.397 }, { lat: 23.780, lng: 90.397 }, { lat: 23.780, lng: 90.402 }, { lat: 23.775, lng: 90.402 }] },
  { keywords: ['tejgaon'], lat: 23.7600, lng: 90.3950, polygon: [{ lat: 23.758, lng: 90.393 }, { lat: 23.762, lng: 90.393 }, { lat: 23.762, lng: 90.397 }, { lat: 23.758, lng: 90.397 }] },
  { keywords: ['baridhara'], lat: 23.8050, lng: 90.4180, polygon: [{ lat: 23.803, lng: 90.416 }, { lat: 23.807, lng: 90.416 }, { lat: 23.807, lng: 90.420 }, { lat: 23.803, lng: 90.420 }] },
  { keywords: ['nikunja'], lat: 23.8320, lng: 90.4170, polygon: [{ lat: 23.830, lng: 90.415 }, { lat: 23.834, lng: 90.415 }, { lat: 23.834, lng: 90.419 }, { lat: 23.830, lng: 90.419 }] },
  { keywords: ['khilgaon'], lat: 23.7500, lng: 90.4280, polygon: [{ lat: 23.748, lng: 90.426 }, { lat: 23.752, lng: 90.426 }, { lat: 23.752, lng: 90.430 }, { lat: 23.748, lng: 90.430 }] },
  { keywords: ['old dhaka', 'puran dhaka', 'lalbagh'], lat: 23.7150, lng: 90.3900, polygon: [{ lat: 23.713, lng: 90.388 }, { lat: 23.717, lng: 90.388 }, { lat: 23.717, lng: 90.392 }, { lat: 23.713, lng: 90.392 }] },
  { keywords: ['sylhet'], lat: 24.8949, lng: 91.8687, polygon: [{ lat: 24.892, lng: 91.866 }, { lat: 24.897, lng: 91.866 }, { lat: 24.897, lng: 91.871 }, { lat: 24.892, lng: 91.871 }] },
  { keywords: ['chittagong', 'chattogram'], lat: 22.3569, lng: 91.7832, polygon: [{ lat: 22.354, lng: 91.781 }, { lat: 22.359, lng: 91.781 }, { lat: 22.359, lng: 91.786 }, { lat: 22.354, lng: 91.786 }] },
];

function resolveLocationCoordinates(locationStr = '', titleStr = '', inputCoords = null, inputPoly = null) {
  const combinedText = `${locationStr} ${titleStr}`.toLowerCase();

  // 1. Match text against known location dictionary
  for (const item of LOCATION_COORDINATES_MAP) {
    if (item.keywords.some((kw) => combinedText.includes(kw))) {
      const finalPoly = (inputPoly && Array.isArray(inputPoly) && inputPoly.length >= 3) ? inputPoly : item.polygon;
      return {
        coordinates: { lat: item.lat, lng: item.lng },
        polygon: finalPoly,
      };
    }
  }

  // 2. Check if valid custom coordinates were supplied (not default 23.777176, 90.399452)
  if (
    inputCoords &&
    typeof inputCoords.lat === 'number' &&
    typeof inputCoords.lng === 'number' &&
    !(Math.abs(inputCoords.lat - 23.777176) < 0.0001 && Math.abs(inputCoords.lng - 90.399452) < 0.0001)
  ) {
    return {
      coordinates: inputCoords,
      polygon: inputPoly || [],
    };
  }

  // 3. Fallback: Generate unique deterministic offset based on title hash so locations differ
  let hash = 0;
  for (let i = 0; i < combinedText.length; i++) {
    hash = (hash << 5) - hash + combinedText.charCodeAt(i);
    hash |= 0;
  }
  const offsetLat = ((Math.abs(hash) % 100) / 1000) * 0.5 - 0.025;
  const offsetLng = (((Math.abs(hash) >> 2) % 100) / 1000) * 0.5 - 0.025;

  const baseLat = 23.777176 + offsetLat;
  const baseLng = 90.399452 + offsetLng;

  return {
    coordinates: {
      lat: Math.round(baseLat * 1e6) / 1e6,
      lng: Math.round(baseLng * 1e6) / 1e6,
    },
    polygon: inputPoly || [],
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
  resolveLocationCoordinates,
};
