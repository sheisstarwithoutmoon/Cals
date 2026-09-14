const prisma = require("../config/prisma");
const { assessBody, assertGoalPlanAllowed } = require("./body-assessment.service");
const {
  requireUser,
  hasCompletedProfile,
  buildProfileView,
} = require("./profile.service");

const PROFILE_SELECT = {
  name: true,
  age: true,
  gender: true,
  heightCm: true,
  currentWeight: true,
  activityLevel: true,
};

// Steps: 1 basic info, 2 health, 3 goal, 4 targets.
function getNextStep(user) {
  // Users who finished onboarding before the health step existed stay done;
  // they can add health conditions from the Goals page.
  if (user.onboardingCompleted) return null;
  if (!hasCompletedProfile(user)) return 1;
  if (!user.healthReviewedAt) return 2;
  if (!user.goalType) return 3;
  if (!user.onboardingCompleted) return 4;
  return null;
}

function requirePreviousSteps(user, step) {
  if (getNextStep(user) !== null && getNextStep(user) < step) {
    const error = new Error("Complete the previous onboarding steps first");
    error.statusCode = 400;
    throw error;
  }
}

async function getOnboardingStatus(userId) {
  const user = await requireUser(userId);
  const view = buildProfileView(user);

  return {
    profile: view.profile,
    healthConditions: view.healthConditions,
    healthReviewed: Boolean(user.healthReviewedAt),
    goalType: view.goalType,
    targetWeight: view.targetWeight,
    weeklyWeightChangeKg: view.weeklyWeightChangeKg,
    assessment: view.assessment,
    onboardingCompleted: user.onboardingCompleted,
    nextStep: getNextStep(user),
  };
}

async function saveProfile(userId, data) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      age: data.age,
      gender: data.gender,
      heightCm: data.heightCm,
      currentWeight: data.currentWeight,
      activityLevel: data.activityLevel,
    },
    select: PROFILE_SELECT,
  });
}

/** Saves the health conditions (possibly none) and returns the new assessment. */
async function saveHealthConditions(userId, healthConditions) {
  const user = await requireUser(userId);
  requirePreviousSteps(user, 2);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { healthConditions, healthReviewedAt: new Date() },
  });

  return {
    healthConditions: updated.healthConditions,
    assessment: assessBody(updated),
  };
}

/**
 * Saves the goal type and, for LOSE/GAIN, the target weight and weekly pace,
 * after checking them against the user's BMI and health-based limits.
 */
async function saveGoalType(userId, { goalType, targetWeight, weeklyWeightChangeKg }) {
  const user = await requireUser(userId);
  requirePreviousSteps(user, 3);

  const plan =
    goalType === "MAINTAIN"
      ? { goalType, targetWeight: null, weeklyWeightChangeKg: null }
      : { goalType, targetWeight, weeklyWeightChangeKg };

  assertGoalPlanAllowed(assessBody(user), plan, user.currentWeight);

  await prisma.user.update({
    where: { id: userId },
    data: plan,
  });

  return plan;
}

async function getSuggestedTargets(userId) {
  const user = await requireUser(userId);
  requirePreviousSteps(user, 4);

  const view = buildProfileView(user);

  return {
    targets: view.suggestedTargets,
    plan: view.plan,
    maintenanceCalories: view.maintenanceCalories,
    assessment: view.assessment,
    profile: {
      heightCm: user.heightCm,
      currentWeight: user.currentWeight,
      targetWeight: user.targetWeight,
      goalType: user.goalType,
      bmi: view.assessment?.bmi ?? null,
    },
  };
}

async function completeOnboarding(userId, targets) {
  const user = await requireUser(userId);
  requirePreviousSteps(user, 4);

  const [goal] = await prisma.$transaction([
    prisma.goal.upsert({
      where: { userId },
      create: { userId, ...targets, targetWeight: user.targetWeight },
      update: { ...targets, targetWeight: user.targetWeight },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    }),
  ]);

  return goal;
}

module.exports = {
  getOnboardingStatus,
  saveProfile,
  saveHealthConditions,
  saveGoalType,
  getSuggestedTargets,
  completeOnboarding,
};
