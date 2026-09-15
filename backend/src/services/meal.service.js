const crypto = require("crypto");

const prisma = require("../config/prisma");
const { Prisma } = require("../generated/prisma/client");

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

const NUTRIENT_KEYS = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "sugar",
  "sodium",
];

const MAX_FOOD_NAME_LENGTH = 200;

/** Every meal read returns its items in the order the user entered them. */
const MEAL_INCLUDE = {
  items: {
    orderBy: {
      position: "asc",
    },
  },
};

function roundTo(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Turns validated meal input that carries `items` into Prisma data: the
 * meal's nutrition totals and micronutrients become the sums of its items
 * (so they can never drift from the items), and `foodName` falls back to the
 * joined item names. Input without `items` is passed through unchanged.
 */
function buildMealData(data) {
  const { items, ...mealData } = data;

  if (!Array.isArray(items)) {
    return { mealData, items: undefined };
  }

  if (items.length === 0) {
    return { mealData, items: [] };
  }

  const totals = Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, 0]));
  const micronutrients = {};

  for (const item of items) {
    for (const key of NUTRIENT_KEYS) {
      totals[key] += item[key] ?? 0;
    }

    for (const [name, value] of Object.entries(item.micronutrients ?? {})) {
      micronutrients[name] = (micronutrients[name] ?? 0) + value;
    }
  }

  const joinedNames = items.map((item) => item.name).join(", ");

  return {
    mealData: {
      ...mealData,
      foodName: (mealData.foodName || joinedNames).slice(0, MAX_FOOD_NAME_LENGTH),
      // A multi-item meal's amount lives on its items, not the meal.
      quantity: items.length === 1 ? items[0].quantity ?? null : null,
      quantityUnit: items.length === 1 ? items[0].quantityUnit ?? null : null,
      calories: Math.round(totals.calories),
      protein: roundTo(totals.protein),
      carbs: roundTo(totals.carbs),
      fat: roundTo(totals.fat),
      fiber: roundTo(totals.fiber),
      sugar: roundTo(totals.sugar),
      sodium: roundTo(totals.sodium),
      // Json columns need Prisma.DbNull to store NULL; plain null is rejected.
      micronutrients: Object.keys(micronutrients).length
        ? Object.fromEntries(
          Object.entries(micronutrients).map(([name, value]) => [name, roundTo(value)])
        )
        : Prisma.DbNull,
    },
    items: items.map((item, position) => ({
      position,
      name: item.name,
      quantity: item.quantity ?? null,
      quantityUnit: item.quantityUnit || null,
      calories: item.calories,
      protein: item.protein ?? null,
      carbs: item.carbs ?? null,
      fat: item.fat ?? null,
      fiber: item.fiber ?? null,
      sugar: item.sugar ?? null,
      sodium: item.sodium ?? null,
      micronutrients:
        item.micronutrients && Object.keys(item.micronutrients).length
          ? item.micronutrients
          : Prisma.DbNull,
    })),
  };
}

async function createMeal(userId, data) {
  const { mealData, items } = buildMealData(data);

  return prisma.mealEntry.create({
    data: {
      userId,
      ...mealData,
      ...(items?.length ? { items: { create: items } } : {}),
    },
    include: MEAL_INCLUDE,
  });
}

/**
 * Creates many meals (each with its items) for one user. Meal ids are
 * generated here so items can reference their meal, which lets the whole
 * batch be written as two bulk inserts inside one transaction — all meals,
 * then all items — instead of several round trips per meal to a remote DB.
 */
async function createMealsBulk(userId, meals) {
  const mealRows = [];
  const itemRows = [];

  for (const meal of meals) {
    const id = crypto.randomUUID();
    const { mealData, items } = buildMealData(meal);

    mealRows.push({ id, userId, ...mealData });
    itemRows.push(...(items ?? []).map((item) => ({ ...item, mealEntryId: id })));
  }

  await prisma.$transaction(async (tx) => {
    await tx.mealEntry.createMany({ data: mealRows });
    if (itemRows.length) {
      await tx.mealItem.createMany({ data: itemRows });
    }
  });

  return {
    mealIds: mealRows.map((meal) => meal.id),
    mealCount: mealRows.length,
    itemCount: itemRows.length,
  };
}

async function getMealById(userId, mealId) {
  return prisma.mealEntry.findFirst({
    where: {
      id: mealId,
      userId,
    },
    include: MEAL_INCLUDE,
  });
}

/**
 * Builds the Prisma `where` clause shared by the list and summary endpoints.
 * `includeMealType: false` lets the summary count every meal type within the
 * same date range, for the meal type tabs.
 */
function buildMealWhere(userId, filters, { includeMealType = true } = {}) {
  const { mealType, startDate, endDate } = filters;

  const where = {
    userId,
  };

  if (includeMealType && mealType) {
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

  return where;
}

async function getMeals(userId, filters) {
  const { page = 1, limit = 10 } = filters;
  const safePage = Math.max(1, page);

  const where = buildMealWhere(userId, filters);

  const skip = (safePage - 1) * limit;

  const [meals, total] = await Promise.all([
    prisma.mealEntry.findMany({
      where,
      orderBy: {
        consumedAt: "desc",
      },
      skip,
      take: limit,
      include: MEAL_INCLUDE,
    }),

    prisma.mealEntry.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    meals,
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
  };
}

function emptyTotals() {
  return Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, 0]));
}

function roundTotals(totals) {
  return Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [key, roundTo(value)])
  );
}

/** `YYYY-MM-DD` for the user's local calendar day, from a client tz offset. */
function toLocalDateKey(date, tzOffsetMinutes) {
  return new Date(date.getTime() - tzOffsetMinutes * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * UTC instants bounding the user's local calendar day `YYYY-MM-DD`, from a
 * client tz offset (e.g. IST is -330, so its day starts at 18:30 UTC the day
 * before). `end` is inclusive, matching `buildMealWhere`'s `lte`.
 */
function localDayRange(dateKey, tzOffsetMinutes) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) + tzOffsetMinutes * 60 * 1000);

  return { start, end: new Date(start.getTime() + DAY_MS - 1) };
}

/**
 * Every meal on one of the user's local calendar days, oldest first,
 * optionally narrowed to one meal type. Not paginated: a single day's
 * entries are small, and a partial day would misreport what was eaten.
 */
async function getMealsForDay(userId, { date, mealType, tzOffset = 0 }) {
  const { start, end } = localDayRange(date, tzOffset);
  return prisma.mealEntry.findMany({
    where: buildMealWhere(userId, { mealType, startDate: start, endDate: end }),
    orderBy: {
      consumedAt: "asc",
    },
    include: MEAL_INCLUDE,
  });
}

/**
 * Groups entries into the user's local calendar days and sums nutrition per
 * day and for the whole set. Averages are per *logged* day, so days with
 * nothing logged don't drag them down. Shared by the summary and report.
 * `days` is newest first.
 */
function aggregateByDay(entries, tzOffset) {
  const totals = emptyTotals();
  const dayMap = new Map();

  for (const entry of entries) {
    const dateKey = toLocalDateKey(entry.consumedAt, tzOffset);

    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, { date: dateKey, mealCount: 0, ...emptyTotals() });
    }

    const day = dayMap.get(dateKey);
    day.mealCount += 1;

    for (const key of NUTRIENT_KEYS) {
      const value = entry[key] ?? 0;
      totals[key] += value;
      day[key] += value;
    }
  }

  const loggedDays = dayMap.size;

  const averages = Object.fromEntries(
    NUTRIENT_KEYS.map((key) => [
      key,
      loggedDays > 0 ? roundTo(totals[key] / loggedDays) : 0,
    ])
  );

  const days = Array.from(dayMap.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(({ date, mealCount, ...dayTotals }) => ({
      date,
      mealCount,
      ...roundTotals(dayTotals),
    }));

  return { totals: roundTotals(totals), loggedDays, averages, days };
}

/**
 * Aggregates the entries matching `filters` into range totals, per-day
 * totals and per-logged-day averages, plus meal counts per meal type
 * (ignoring the meal type filter) for the same date range.
 */
async function getMealSummary(userId, filters) {
  const { tzOffset = 0 } = filters;

  const [entries, typeGroups] = await Promise.all([
    prisma.mealEntry.findMany({
      where: buildMealWhere(userId, filters),
      select: {
        consumedAt: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        fiber: true,
        sugar: true,
        sodium: true,
      },
    }),

    prisma.mealEntry.groupBy({
      by: ["mealType"],
      where: buildMealWhere(userId, filters, { includeMealType: false }),
      _count: {
        _all: true,
      },
    }),
  ]);

  const mealTypeCounts = Object.fromEntries(
    MEAL_TYPES.map((type) => [type, 0])
  );

  for (const group of typeGroups) {
    mealTypeCounts[group.mealType] = group._count._all;
  }

  const { totals, loggedDays, averages, days } = aggregateByDay(entries, tzOffset);

  return {
    mealCount: entries.length,
    loggedDays,
    mealTypeCounts: {
      ALL: MEAL_TYPES.reduce((sum, type) => sum + mealTypeCounts[type], 0),
      ...mealTypeCounts,
    },
    totals,
    averages,
    days,
  };
}

const TOP_FOODS_LIMIT = 8;
const MAX_REPORT_DAYS = 366;

/** Every `YYYY-MM-DD` from `startKey` to `endKey` inclusive (capped). */
function listDateKeys(startKey, endKey) {
  const keys = [];
  const cursor = new Date(`${startKey}T00:00:00Z`);
  const end = new Date(`${endKey}T00:00:00Z`);

  while (cursor <= end && keys.length < MAX_REPORT_DAYS) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
}

/**
 * Everything the reports need for a date range, computed from all matching
 * meals (not a capped page of them):
 * - `days`: one row per calendar day in the range, oldest first, with zeros
 *   for days nothing was logged, so trends show real gaps.
 * - `averages` / `micronutrientAverages`: per logged day.
 * - `mealTypes`: calories and meal counts per meal type.
 * - `topFoods`: the foods contributing the most calories, counted per item
 *   (meals logged before items existed count as one food by their name).
 * Goal comparisons are left to the client, which already has the goal.
 */
async function getMealReport(userId, filters) {
  const { tzOffset = 0, startDate, endDate } = filters;

  const entries = await prisma.mealEntry.findMany({
    where: buildMealWhere(userId, filters),
    select: {
      consumedAt: true,
      mealType: true,
      foodName: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      fiber: true,
      sugar: true,
      sodium: true,
      micronutrients: true,
      items: { select: { name: true, calories: true } },
    },
  });

  const { totals, loggedDays, averages, days: loggedDayRows } = aggregateByDay(entries, tzOffset);

  let days = [...loggedDayRows].reverse();

  if (startDate && endDate) {
    const byDate = new Map(loggedDayRows.map((day) => [day.date, day]));
    days = listDateKeys(
      toLocalDateKey(startDate, tzOffset),
      toLocalDateKey(endDate, tzOffset)
    ).map((date) => byDate.get(date) ?? { date, mealCount: 0, ...emptyTotals() });
  }

  const micronutrientTotals = {};
  const mealTypeTotals = Object.fromEntries(
    MEAL_TYPES.map((type) => [type, { mealType: type, calories: 0, mealCount: 0 }])
  );
  const foods = new Map();
  let itemCount = 0;

  function addFood(name, calories) {
    const key = name.trim().toLowerCase();
    if (!key) return;
    const food = foods.get(key) ?? { name: name.trim(), calories: 0, count: 0 };
    food.calories += calories ?? 0;
    food.count += 1;
    foods.set(key, food);
  }

  for (const entry of entries) {
    const mealType = mealTypeTotals[entry.mealType];
    mealType.calories += entry.calories ?? 0;
    mealType.mealCount += 1;

    for (const [name, value] of Object.entries(entry.micronutrients ?? {})) {
      if (typeof value === "number") {
        micronutrientTotals[name] = (micronutrientTotals[name] ?? 0) + value;
      }
    }

    if (entry.items.length) {
      itemCount += entry.items.length;
      for (const item of entry.items) addFood(item.name, item.calories);
    } else {
      itemCount += 1;
      addFood(entry.foodName, entry.calories);
    }
  }

  return {
    mealCount: entries.length,
    itemCount,
    loggedDays,
    totals,
    averages,
    micronutrientAverages: Object.fromEntries(
      Object.entries(micronutrientTotals).map(([name, value]) => [
        name,
        loggedDays > 0 ? roundTo(value / loggedDays) : 0,
      ])
    ),
    days,
    mealTypes: Object.values(mealTypeTotals).map((row) => ({
      ...row,
      calories: Math.round(row.calories),
    })),
    topFoods: Array.from(foods.values())
      .sort((a, b) => b.calories - a.calories)
      .slice(0, TOP_FOODS_LIMIT)
      .map((food) => ({ ...food, calories: Math.round(food.calories) })),
  };
}

async function updateMeal(userId, mealId, data) {
  const existingMeal = await getMealById(userId, mealId);

  if (!existingMeal) {
    const error = new Error("Meal not found");
    error.statusCode = 404;
    throw error;
  }

  const { mealData, items } = buildMealData(data);

  return prisma.mealEntry.update({
    where: {
      id: mealId,
    },
    data: {
      ...mealData,
      // Replacing the whole list keeps item order/removals simple; it runs
      // in the same statement as the meal update, so it's atomic.
      ...(items !== undefined
        ? { items: { deleteMany: {}, create: items } }
        : {}),
    },
    include: MEAL_INCLUDE,
  });
}

// to add meal to existing meal
async function addItemsToMeal(userId, mealId, newItems) {
  const existingMeal = await getMealById(userId, mealId);

  if (!existingMeal) {
    const error = new Error("Meal not found");
    error.statusCode = 404;
    throw error;
  }

  const existingItems = existingMeal.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    quantityUnit: item.quantityUnit,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    fiber: item.fiber,
    sugar: item.sugar,
    sodium: item.sodium,
    micronutrients: item.micronutrients,
  }));

  const allItems = [...existingItems, ...newItems];

  // Recalculate the meal totals from all existing + new items.
  const { mealData, items } = buildMealData({
    items: allItems,
  });

  // buildMealData starts positions at 0, so only take the newly
  // added items and shift their positions after the existing items.
  const newItemRows = items
    .slice(existingItems.length)
    .map((item, index) => ({
      ...item,
      position: existingItems.length + index,
      mealEntryId: mealId,
    }));

  await prisma.$transaction(async (tx) => {
    await tx.mealEntry.update({
      where: {
        id: mealId,
      },
      data: mealData,
    });

    if (newItemRows.length) {
      await tx.mealItem.createMany({
        data: newItemRows,
      });
    }
  });

  return getMealById(userId, mealId);
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
  buildMealData,
  MEAL_INCLUDE,
  createMeal,
  createMealsBulk,
  getMealById,
  getMeals,
  getMealsForDay,
  getMealSummary,
  toLocalDateKey,
  localDayRange,
  getMealReport,
  updateMeal,
  addItemsToMeal,
  deleteMeal,
};