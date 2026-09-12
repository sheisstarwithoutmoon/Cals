const {
  profileSchema,
  goalTypeInputSchema,
  targetsSchema,
} = require("../schemas/onboarding.schema");

const {
  getOnboardingStatus,
  saveProfile,
  saveGoalType,
  getSuggestedTargets,
  completeOnboarding,
} = require("../services/onboarding.service");

async function getStatus(req, res, next) {
  try {
    const status = await getOnboardingStatus(req.user.id);

    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const data = profileSchema.parse(req.body);
    const profile = await saveProfile(req.user.id, data);

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
}

async function updateGoalType(req, res, next) {
  try {
    const { goalType } = goalTypeInputSchema.parse(req.body);
    await saveGoalType(req.user.id, goalType);

    res.json({
      success: true,
      goalType,
    });
  } catch (error) {
    next(error);
  }
}

async function suggestedTargets(req, res, next) {
  try {
    const targets = await getSuggestedTargets(req.user.id);

    res.json({
      success: true,
      targets,
    });
  } catch (error) {
    next(error);
  }
}

async function complete(req, res, next) {
  try {
    const targets = targetsSchema.parse(req.body);
    const goal = await completeOnboarding(req.user.id, targets);

    res.json({
      success: true,
      goal,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStatus,
  updateProfile,
  updateGoalType,
  suggestedTargets,
  complete,
};
