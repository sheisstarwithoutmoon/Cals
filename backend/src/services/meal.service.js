const prisma = require("../config/prisma");

async function createMeal(userId, data) {
  return prisma.mealEntry.create({
    data: {
      userId,
      ...data,
    },
  });
}

async function getMealById(userId, mealId) {
  return prisma.mealEntry.findFirst({
    where: {
      id: mealId,
      userId,
    },
  });
}

async function getMeals(userId, filters) {
  const {
    page,
    limit,
    mealType,
    startDate,
    endDate,
  } = filters;

  const where = {
    userId,
  };

  if (mealType) {
    where.mealType = mealType;
  }

  if (startDate || endDate) {
    where.consumedAt = {};

    if (startDate) {
      where.consumedAt.gte = startDate;
    }

    if (endDate) {
      where.consumedAt.lte = endDate;
    }
  }

  const skip = (page - 1) * limit;

  const [meals, total] = await Promise.all([
    prisma.mealEntry.findMany({
      where,
      orderBy: {
        consumedAt: "desc",
      },
      skip,
      take: limit,
    }),

    prisma.mealEntry.count({
      where,
    }),
  ]);

  return {
    meals,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
}

async function updateMeal(userId, mealId, data) {
  const existingMeal = await getMealById(userId, mealId);

  if (!existingMeal) {
    const error = new Error("Meal not found");
    error.statusCode = 404;
    throw error;
  }

  return prisma.mealEntry.update({
    where: {
      id: mealId,
    },
    data,
  });
}

async function deleteMeal(userId, mealId) {
  const existingMeal = await getMealById(userId, mealId);

  if (!existingMeal) {
    const error = new Error("Meal not found");
    error.statusCode = 404;
    throw error;
  }

  await prisma.mealEntry.delete({
    where: {
      id: mealId,
    },
  });
}

module.exports = {
  createMeal,
  getMealById,
  getMeals,
  updateMeal,
  deleteMeal,
};