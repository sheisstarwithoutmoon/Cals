const {
  mealSchema,
  updateMealSchema,
  mealQuerySchema,
  mealSummaryQuerySchema,
  mealPhotoSchema,
  bulkMealsSchema,
  pdfImportSchema,
} = require("../schemas/meal.schema");

const { uploadMealPhoto } = require("../services/upload.service");

const {
  createMeal,
  createMealsBulk,
  getMealById,
  getMeals,
  getMealSummary,
  getMealReport,
  updateMeal,
  deleteMeal,
} = require("../services/meal.service");

async function create(req, res, next) {
  try {
    const data = mealSchema.parse(req.body);

    const meal = await createMeal(
      req.user.id,
      data
    );

    res.status(201).json({
      success: true,
      meal,
    });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const filters = mealQuerySchema.parse(req.query);

    const result = await getMeals(
      req.user.id,
      filters
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

async function summary(req, res, next) {
  try {
    const filters = mealSummaryQuerySchema.parse(req.query);

    const result = await getMealSummary(
      req.user.id,
      filters
    );

    res.json({
      success: true,
      summary: result,
    });
  } catch (error) {
    next(error);
  }
}

/** All report datasets for a date range (same filters as the summary). */
async function report(req, res, next) {
  try {
    const filters = mealSummaryQuerySchema.parse(req.query);

    const result = await getMealReport(req.user.id, filters);

    res.json({
      success: true,
      report: result,
    });
  } catch (error) {
    next(error);
  }
}

async function uploadPhoto(req, res, next) {
  try {
    const { imageBase64 } = mealPhotoSchema.parse(req.body);

    const attachmentUrl = await uploadMealPhoto(imageBase64);

    res.status(201).json({
      success: true,
      attachmentUrl,
      attachmentType: "IMAGE",
    });
  } catch (error) {
    next(error);
  }
}

async function getOne(req, res, next) {
  try {
    const meal = await getMealById(
      req.user.id,
      req.params.id
    );

    if (!meal) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    res.json({
      success: true,
      meal,
    });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const data = updateMealSchema.parse(req.body);

    const meal = await updateMeal(
      req.user.id,
      req.params.id,
      data
    );

    res.json({
      success: true,
      meal,
    });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await deleteMeal(
      req.user.id,
      req.params.id
    );

    res.json({
      success: true,
      message: "Meal deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

const { parseMealsFromPdf } = require("../services/ai.service");

/** Parses a diary PDF into meal drafts for review; nothing is saved. */
async function previewPdfImport(req, res, next) {
  try {
    const { pdfBase64 } = pdfImportSchema.parse(req.body);

    const result = await parseMealsFromPdf({ pdfBase64 });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/** Saves the meals the user picked (and possibly edited) in one batch. */
async function createBulk(req, res, next) {
  try {
    const { meals } = bulkMealsSchema.parse(req.body);

    const result = await createMealsBulk(req.user.id, meals);

    res.status(201).json({
      success: true,
      count: result.mealCount,
      itemCount: result.itemCount,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
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
};