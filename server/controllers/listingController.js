const Listing = require('../models/Listing');
const {
  haversineDistance,
  pointInPolygon,
  polygonOverlap,
  encodeGeohash,
  getGridKey,
  getNeighborGridKeys,
  calculateWeightedScore,
} = require('../utils/spatialUtils');

// Fetch listings (standard role-filtered)
exports.getListings = async (req, res) => {
  try {
    const isLandlord = req.user.role === 'landlord';
    let filter = { status: 'approved' };

    if (isLandlord) {
      if (!req.user.isVerifiedLandlord) {
        return res.status(403).json({
          message: 'Your landlord account is pending admin verification. Please wait for admin approval.',
          status: 'pending_verification',
        });
      }
      filter = { landlordId: req.user.id };
    }

    const listings = await Listing.find(filter).sort({ createdAt: -1 });
    return res.json(listings);
  } catch (err) {
    console.error('❌ Get Listings Error:', err);
    return res.status(500).json({ message: 'Server error fetching listings' });
  }
};

// Create new property listing with rich fields, images, coordinates, and custom polygon area boundary
exports.createListing = async (req, res) => {
  try {
    if (req.user.role !== 'landlord') {
      return res.status(403).json({ message: 'Access denied. Only landlords can add property listings.' });
    }

    if (!req.user.isVerifiedLandlord) {
      return res.status(403).json({ message: 'Your landlord account must be verified by admin before posting properties.' });
    }

    const {
      title,
      location,
      description,
      price,
      size,
      propertyType,
      furnishedStatus,
      amenities,
      photos,
      nearbyFacilities,
      coordinates,
      polygon,
    } = req.body;

    const lat = coordinates?.lat != null ? Number(coordinates.lat) : 23.777176;
    const lng = coordinates?.lng != null ? Number(coordinates.lng) : 90.399452;

    // Spatial Indexing (Geohash & Grid key)
    const geohash = encodeGeohash(lat, lng, 5);
    const gridKey = getGridKey(lat, lng);

    const newListing = await Listing.create({
      title,
      location,
      description,
      price: Number(price),
      size: size ? Number(size) : 1000,
      propertyType: propertyType || 'Apartment',
      furnishedStatus: furnishedStatus || 'Furnished',
      amenities: amenities || [],
      photos: photos || [],
      nearbyFacilities: Array.isArray(nearbyFacilities) ? nearbyFacilities : [],
      coordinates: { lat, lng },
      polygon: Array.isArray(polygon) ? polygon : [],
      geohash,
      gridKey,
      status: 'pending',
      landlordId: req.user.id,
      bookedDates: [],
    });

    return res.status(201).json({
      success: true,
      message: 'Property listing submitted for admin review!',
      listing: newListing,
    });
  } catch (err) {
    console.error('❌ Create Listing Error:', err);
    return res.status(500).json({ message: 'Server error creating property listing' });
  }
};

// Advanced Search & Geospatial Radius Search + Point-in-Polygon & Polygon Overlap
exports.searchListings = async (req, res) => {
  try {
    const {
      query,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      propertyType,
      furnishedStatus,
      userLat,
      userLng,
      radiusKm = 15,
      pointLat,
      pointLng,
      searchPolygon, // Array of [{lat, lng}]
      sortBy = 'weighted', // 'weighted' | 'distance' | 'price_asc' | 'price_desc'
    } = req.query;

    // Base MongoDB filter for approved listings
    let dbFilter = { status: 'approved' };

    // Text query search
    if (query) {
      dbFilter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ];
    }

    // Price range
    if (minPrice || maxPrice) {
      dbFilter.price = {};
      if (minPrice) dbFilter.price.$gte = Number(minPrice);
      if (maxPrice) dbFilter.price.$lte = Number(maxPrice);
    }

    // Area sqft range
    if (minArea || maxArea) {
      dbFilter.size = {};
      if (minArea) dbFilter.size.$gte = Number(minArea);
      if (maxArea) dbFilter.size.$lte = Number(maxArea);
    }

    // Property type & furnished status
    if (propertyType && propertyType !== 'All') {
      dbFilter.propertyType = propertyType;
    }
    if (furnishedStatus && furnishedStatus !== 'All') {
      dbFilter.furnishedStatus = furnishedStatus;
    }

    // Spatial Indexing Optimization: If radius search active, filter by neighboring grid buckets first
    const parsedLat = userLat != null ? parseFloat(userLat) : null;
    const parsedLng = userLng != null ? parseFloat(userLng) : null;
    const parsedRadius = parseFloat(radiusKm) || 15;

    if (parsedLat != null && parsedLng != null && !isNaN(parsedLat) && !isNaN(parsedLng)) {
      const neighborGridKeys = getNeighborGridKeys(parsedLat, parsedLng, parsedRadius);
      if (neighborGridKeys && neighborGridKeys.length > 0) {
        dbFilter.$or = dbFilter.$or || [];
        dbFilter.gridKey = { $in: neighborGridKeys };
      }
    }

    // Fetch matching candidate listings from DB
    let listings = await Listing.find(dbFilter).lean();

    // Secondary Spatial & Geometry Filtering & Scoring in memory
    let parsedSearchPoly = null;
    if (searchPolygon) {
      try {
        parsedSearchPoly = typeof searchPolygon === 'string' ? JSON.parse(searchPolygon) : searchPolygon;
      } catch (e) {}
    }

    const processedListings = listings
      .map((listing) => {
        const listingLat = listing.coordinates?.lat || 23.777176;
        const listingLng = listing.coordinates?.lng || 90.399452;

        // 1. Haversine distance
        let distKm = null;
        if (parsedLat != null && parsedLng != null) {
          distKm = haversineDistance(parsedLat, parsedLng, listingLat, listingLng);
        }

        // 2. Point-in-polygon check (is pointLat/pointLng inside property neighborhood boundary?)
        let isInsidePolygon = true;
        if (pointLat != null && pointLng != null && listing.polygon && listing.polygon.length >= 3) {
          isInsidePolygon = pointInPolygon(
            { lat: parseFloat(pointLat), lng: parseFloat(pointLng) },
            listing.polygon
          );
        }

        // 3. Polygon overlap check (does property polygon overlap searchPolygon?)
        let isPolygonOverlapping = true;
        if (parsedSearchPoly && Array.isArray(parsedSearchPoly) && parsedSearchPoly.length >= 3) {
          isPolygonOverlapping = polygonOverlap(listing.polygon || [], parsedSearchPoly);
        }

        // 4. Weighted Match Score
        const { score, distanceKm } = calculateWeightedScore(listing, {
          userLat: parsedLat,
          userLng: parsedLng,
          radiusKm: parsedRadius,
          minPrice: minPrice ? Number(minPrice) : null,
          maxPrice: maxPrice ? Number(maxPrice) : null,
          minArea: minArea ? Number(minArea) : null,
          maxArea: maxArea ? Number(maxArea) : null,
          propertyType,
          furnishedStatus,
        });

        return {
          ...listing,
          distanceKm: distKm !== null ? distKm : distanceKm,
          matchScore: score,
          isInsidePolygon,
          isPolygonOverlapping,
        };
      })
      .filter((listing) => {
        // Radius filter
        if (parsedLat != null && parsedLng != null && listing.distanceKm > parsedRadius) {
          return false;
        }
        // Point-in-polygon requirement filter
        if (pointLat != null && pointLng != null && !listing.isInsidePolygon) {
          return false;
        }
        // Polygon overlap filter
        if (parsedSearchPoly && !listing.isPolygonOverlapping) {
          return false;
        }
        return true;
      });

    // Sorting Engine
    if (sortBy === 'distance' && parsedLat != null) {
      processedListings.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    } else if (sortBy === 'price_asc') {
      processedListings.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      processedListings.sort((a, b) => b.price - a.price);
    } else {
      // Default: Rank by Weighted Composite Match Score
      processedListings.sort((a, b) => b.matchScore - a.matchScore);
    }

    return res.json({
      success: true,
      count: processedListings.length,
      listings: processedListings,
    });
  } catch (err) {
    console.error('❌ Search Listings Error:', err);
    return res.status(500).json({ message: 'Server error executing advanced spatial search' });
  }
};

// Update listing availability calendar
exports.updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { bookedDates } = req.body;

    if (!Array.isArray(bookedDates)) {
      return res.status(400).json({ message: 'bookedDates must be an array of date strings' });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (req.user.role === 'landlord' && listing.landlordId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to modify availability for this property' });
    }

    listing.bookedDates = bookedDates;
    await listing.save();

    return res.json({
      success: true,
      message: 'Availability calendar updated successfully',
      bookedDates: listing.bookedDates,
    });
  } catch (err) {
    console.error('❌ Update Availability Error:', err);
    return res.status(500).json({ message: 'Server error updating availability' });
  }
};
