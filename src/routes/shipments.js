const express = require('express');
const router = express.Router();
const { getAllShipments, getShipmentById, createShipment, getPendingShipments } = require('../controllers/shipmentController');

router.get('/',          getAllShipments);
router.get('/pending',   getPendingShipments);
router.get('/:id',       getShipmentById);
router.post('/',         createShipment);

module.exports = router;
