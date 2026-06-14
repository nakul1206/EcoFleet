const express = require('express');
const router = express.Router();
const { matchShipment, negotiateShipment, getPredictions } = require('../controllers/aiController');

router.post('/match',     matchShipment);
router.post('/negotiate', negotiateShipment);
router.post('/predict',   getPredictions);

module.exports = router;
