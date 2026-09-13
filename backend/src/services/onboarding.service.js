const prisma = require("../config/prisma");
const { calculateSuggestedTargets } = require("./nutrition-calculator.service");

const PROFILE_SELECT = {
  name: true,
  age: true,
  gender: true,
  heightCm: true,
  currentWeight: true,
  activityLevel: true,
};

function hasCompletedProfile(user) {
  return (
    user.age != null &&
    Boolean(user.gender) &&
    user.heightCm != null &&
    user.currentWeight != null &&
    Boolean(user.activityLevel)
  );
}

function getNextStep(user) {
  if (!hasCompletedProfile(user)) return 1;
  if (!user.goalType) return 2;
  if (!user.onboardingCompleted) return 3;
  return null;
}

async function requireUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user;
}

async function getOnboardingStatus(userId) {
  const user = await requireUser(userId);

  return {
    profile: {
      name: user.name,
      age: user.age,
      gender: user.gender,
      heightCm: user.heightCm,
      currentWeight: user.currentWeight,
      activityLevel: user.activityLevel,
    },
    goalType: user.goalType,
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

async function saveGoalType(userId, goalType) {
  await prisma.user.update({
    where: { id: userId },
    data: { goalType },
  });

  return goalType;
}

async function getSuggestedTargets(userId) {
  const user = await requireUser(userId);

  if (!hasCompletedProfile(user) || !user.goalType) {
    const error = new Error(
      "Complete the previous onboarding steps before generating targets"
    );
    error.statusCode = 400;
    throw error;
  }

  return calculateSuggestedTargets(user);
}

async function completeOnboarding(userId, targets) {
  const user = await requireUser(userId);

  if (!hasCompletedProfile(user) || !user.goalType) {
    const error = new Error(
      "Complete the previous onboarding steps before finishing onboarding"
    );
    error.statusCode = 400;
    throw error;
  }

  const [goal] = await prisma.$transaction([
    prisma.goal.upsert({
      where: { userId },
      create: { userId, ...targets },
      update: targets,
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
  saveGoalType,
  getSuggestedTargets,
  completeOnboarding,
};
