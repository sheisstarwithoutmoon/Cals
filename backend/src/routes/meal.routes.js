const express = require("express");

const {
  create,
  list,
  summary,
  report,
  uploadPhoto,
  getOne,
  update,
  remove,
  previewPdfImport,
  createBulk,
} = require("../controllers/meal.controller");

const { requireAuth } = require("../middleware/auth.middleware");
const { pdfImportLimiter, bulkMealLimiter } = require("../middleware/rate-limit.middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/import-pdf/preview", pdfImportLimiter, previewPdfImport);
router.post("/bulk", bulkMealLimiter, createBulk);
router.post("/photo", uploadPhoto);
router.post("/", create);
router.get("/", list);
// Must be registered before "/:id" so these aren't treated as meal ids.
router.get("/summary", summary);
router.get("/report", report);
router.get("/:id", getOne);
router.put("/:id", update);
router.delete("/:id", remove);

module.exports = router;