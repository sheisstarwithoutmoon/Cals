const prisma = require("../config/prisma");
const { assessBody, assertGoalPlanAllowed } = require("./body-assessment.service");
const {
  calculateSuggestedTargets,
  describeWeightPlan,
} = require("./nutrition-calculator.service");

async function requireUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user;
}

function hasCompletedProfile(user) {
  return (
    user.age != null &&
    Boolean(user.gender) &&
    user.heightCm != null &&
    user.currentWeight != null &&
    Boolean(user.activityLevel)
  );
}

/**
 * Everything about a user's body, health and weight goal in one shape, shared
 * by onboarding and the Goals page: the profile, the BMI assessment and
 * recommendation, the weight plan, and the daily targets suggested for it.
 */
function buildProfileView(user) {
  const assessment = assessBody(user);
  const canSuggest = hasCompletedProfile(user) && Boolean(user.goalType);

  let suggestedTargets = null;
  let maintenanceCalories = null;
  let plan = null;

  if (canSuggest) {
    const { maintenanceCalories: maintenance, ...targets } = calculateSuggestedTargets({
      ...user,
      proteinGramsPerKg: assessment?.proteinGramsPerKg,
    });
    suggestedTargets = targets;
    maintenanceCalories = maintenance;
    plan = describeWeightPlan(user, { ...targets, maintenanceCalories });
  }

  return {
    profile: {
      name: user.name,
      age: user.age,
      gender: user.gender,
      heightCm: user.heightCm,
      currentWeight: user.currentWeight,
      activityLevel: user.activityLevel,
    },
    healthConditions: user.healthConditions ?? [],
    healthReviewedAt: user.healthReviewedAt,
    dietPreference: user.dietPreference ?? null,
    allergies: user.allergies ?? [],
    goalType: user.goalType,
    targetWeight: user.targetWeight,
    weeklyWeightChangeKg: user.weeklyWeightChangeKg,
    assessment,
    plan,
    suggestedTargets,
    maintenanceCalories,
  };
}

async function getProfile(userId) {
  return buildProfileView(await requireUser(userId));
}

const GOAL_FIELDS = ["goalType", "targetWeight", "weeklyWeightChangeKg"];

/**
 * Applies a partial update to body stats, health conditions and/or the goal
 * plan, re-checking the goal against the updated assessment:
 * - If new health conditions rule out the current goal type, the goal is
 *   switched to MAINTAIN (and a pace above a new limit is lowered to it),
 *   reported back in `adjustments` so the user sees what changed and why.
 * - Otherwise an invalid goal (e.g. a target no longer below the new
 *   weight) is rejected with a field error.
 * The goal's target weight is kept in sync with the saved goal record.
 */
async function updateProfile(userId, patch) {
  const user = await requireUser(userId);
  const next = { ...user, ...patch };
  const adjustments = [];

  if (patch.healthConditions) {
    next.healthReviewedAt = new Date();
  }

  if (next.goalType === "MAINTAIN") {
    next.targetWeight = null;
    next.weeklyWeightChangeKg = null;
  }

  const assessment = assessBody(next);

  if (assessment && next.goalType) {
    const goalEdited = GOAL_FIELDS.some((field) => field in patch);

    if (!goalEdited && !assessment.allowedGoalTypes.includes(next.goalType)) {
      adjustments.push(
        "Your weight goal was changed to maintain weight because the health conditions you added make a weight-loss goal unsafe."
      );
      next.goalType = "MAINTAIN";
      next.targetWeight = null;
      next.weeklyWeightChangeKg = null;
    }

    if (
      !goalEdited &&
      next.goalType !== "MAINTAIN" &&
      next.weeklyWeightChangeKg > assessment.maxWeeklyChangeKg[next.goalType]
    ) {
      next.weeklyWeightChangeKg = assessment.maxWeeklyChangeKg[next.goalType];
      adjustments.push(
        `Your weekly pace was lowered to ${next.weeklyWeightChangeKg} kg to stay within a safe limit for your health conditions.`
      );
    }

    assertGoalPlanAllowed(assessment, next, next.currentWeight);
  }

  const data = {
    age: next.age,
    gender: next.gender,
    heightCm: next.heightCm,
    currentWeight: next.currentWeight,
    activityLevel: next.activityLevel,
    healthConditions: next.healthConditions ?? [],
    healthReviewedAt: next.healthReviewedAt,
    dietPreference: next.dietPreference ?? null,
    allergies: next.allergies ?? [],
    goalType: next.goalType,
    targetWeight: next.targetWeight,
    weeklyWeightChangeKg: next.weeklyWeightChangeKg,
  };

  const [updated] = await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data }),
    prisma.goal.updateMany({ where: { userId }, data: { targetWeight: next.targetWeight } }),
  ]);

  return { ...buildProfileView(updated), adjustments };
}

module.exports = {
  requireUser,
  hasCompletedProfile,
  buildProfileView,
  getProfile,
  updateProfile,
};
