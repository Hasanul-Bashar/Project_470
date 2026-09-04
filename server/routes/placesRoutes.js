const express = require('express');
const router = express.Router();
const placesController = require('../controllers/placesController');

router.get('/nearby', placesController.getNearbyPlaces);

module.exports = router;
