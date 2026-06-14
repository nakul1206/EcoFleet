// routes/trucks.js
const express = require('express');
const router = express.Router();
const { getAllTrucks, getTruckById, createTruck, getTruckStats } = require('../controllers/truckController');

router.get('/',        getAllTrucks);
router.get('/stats',   getTruckStats);
router.get('/:id',     getTruckById);
router.post('/',       createTruck);

module.exports = router;
