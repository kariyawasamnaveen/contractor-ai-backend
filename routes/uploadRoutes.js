const express = require('express');
const uploadController = require('../controllers/uploadController');
const { upload } = require('../services/uploadService');
const router = express.Router();

router.post('/photo', upload.single('photo'), uploadController.uploadPhoto);

module.exports = router;