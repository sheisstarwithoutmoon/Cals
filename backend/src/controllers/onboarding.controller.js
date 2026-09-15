const {
  profileSchema,
  goalTypeInputSchema,
  healthInputSchema,
  targetsSchema,
} = require("../schemas/onboarding.schema");

const {
  getOnboardingStatus,
  saveProfile,
  saveGoalType,
  saveHealthConditions,
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

async function updateHealth(req, res, next) {
  try {
    const data = healthInputSchema.parse(req.body);
    const result = await saveHealthConditions(req.user.id, data);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

async function updateGoalType(req, res, next) {
  try {
    const data = goalTypeInputSchema.parse(req.body);
    const saved = await saveGoalType(req.user.id, data);

    res.json({
      success: true,
      ...saved,
    });
  } catch (error) {
    next(error);
  }
}

async function suggestedTargets(req, res, next) {
  try {
    const suggestion = await getSuggestedTargets(req.user.id);

    res.json({
      success: true,
      ...suggestion,
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
  updateHealth,
  suggestedTargets,
  complete,
};
