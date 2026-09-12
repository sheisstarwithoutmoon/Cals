const prisma = require("../config/prisma");

async function getGoalByUserId(userId) {
  return prisma.goal.findUnique({
    where: {
      userId,
    },
  });
}

async function createGoal(userId, data) {
  return prisma.goal.create({
    data: {
      userId,
      ...data,
    },
  });
}

async function updateGoal(userId, data) {
  return prisma.goal.update({
    where: {
      userId,
    },
    data,
  });
}

async function createOrUpdateGoal(userId, data) {
  const existingGoal = await getGoalByUserId(userId);

  if (existingGoal) {
    return updateGoal(userId, data);
  }

  return createGoal(userId, data);
}

module.exports = {
  getGoalByUserId,
  createGoal,
  updateGoal,
  createOrUpdateGoal,
};