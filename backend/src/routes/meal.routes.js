const express = require("express");

const {
  create,
  list,
  getOne,
  update,
  remove,
} = require("../controllers/meal.controller");

const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/", create);
router.get("/", list);
router.get("/:id", getOne);
router.put("/:id", update);
router.delete("/:id", remove);

module.exports = router;