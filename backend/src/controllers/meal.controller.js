const {
  mealSchema,
  updateMealSchema,
  mealQuerySchema,
} = require("../schemas/meal.schema");

const {
  createMeal,
  getMealById,
  getMeals,
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

const { importMealsFromPdf } = require("../services/ai.service");

async function importPdf(req, res, next) {
  try {
    const { pdfBase64 } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({
        success: false,
        message: "pdfBase64 string is required",
      });
    }

    const result = await importMealsFromPdf({ userId: req.user.id, pdfBase64 });

    res.status(201).json({
      success: true,
      message: `Successfully imported ${result.importedCount} meal entries`,
      count: result.importedCount,
      skippedCount: result.skippedCount,
      sampleEntries: result.sampleEntries,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  list,
  getOne,
  update,
  remove,
  importPdf,
};