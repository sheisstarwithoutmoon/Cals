const { goalSchema } = require("../schemas/goal.schema");

const {
  getGoalByUserId,
  createOrUpdateGoal,
} = require("../services/goal.service");

async function getGoal(req, res, next) {
  try {
    const goal = await getGoalByUserId(req.user.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: "Goals not found",
      });
    }

    res.json({
      success: true,
      goal,
    });
  } catch (error) {
    next(error);
  }
}

async function saveGoal(req, res, next) {
  try {
    const data = goalSchema.parse(req.body);

    const goal = await createOrUpdateGoal(
      req.user.id,
      data
    );

    res.json({
      success: true,
      goal,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getGoal,
  saveGoal,
};