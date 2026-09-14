const express = require("express");

const { get, update } = require("../controllers/profile.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", get);
router.put("/", update);

module.exports = router;
