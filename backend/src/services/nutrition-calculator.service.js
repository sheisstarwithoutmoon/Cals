const ACTIVITY_MULTIPLIERS = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

// Used when a LOSE/GAIN user has no weekly pace saved (onboarded before the
// target-weight step existed).
const GOAL_CALORIE_ADJUSTMENT = {
  LOSE: -500,
  MAINTAIN: 0,
  GAIN: 300,
};

// Commonly used approximation of the energy in 1 kg of body weight.
const KCAL_PER_KG_BODY_WEIGHT = 7700;

const MIN_DAILY_CALORIES = 1200;
const PROTEIN_GRAMS_PER_KG = 1.8;
const FAT_SHARE_OF_CALORIES = 0.25;

// Mifflin-St Jeor constant term: male uses +5, female uses -161. OTHER (or a
// missing value, for users onboarded before gender was collected) falls back
// to the midpoint of the two, trading some accuracy for not requiring it.
const BMR_GENDER_OFFSET = {
  MALE: 5,
  FEMALE: -161,
  OTHER: -78,
};

/**
 * Daily calorie change (kcal/day) for a goal: a weekly pace of weight change
 * converted with ~7700 kcal per kg, negative for LOSE and positive for GAIN.
 */
function dailyCalorieAdjustment(goalType, weeklyWeightChangeKg) {
  if (goalType === "MAINTAIN") return 0;
  if (!weeklyWeightChangeKg) return GOAL_CALORIE_ADJUSTMENT[goalType];

  const perDay = Math.round((weeklyWeightChangeKg * KCAL_PER_KG_BODY_WEIGHT) / 7);
  return goalType === "LOSE" ? -perDay : perDay;
}

/**
 * Estimates daily calorie and macro targets from onboarding inputs.
 */
function calculateSuggestedTargets({
  age,
  gender,
  heightCm,
  currentWeight,
  activityLevel,
  goalType,
  weeklyWeightChangeKg,
  proteinGramsPerKg = PROTEIN_GRAMS_PER_KG,
}) {
  const genderOffset = BMR_GENDER_OFFSET[gender] ?? BMR_GENDER_OFFSET.OTHER;
  const bmr = 10 * currentWeight + 6.25 * heightCm - 5 * age + genderOffset;
  const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel];

  const dailyCalories = Math.round(
    Math.max(
      MIN_DAILY_CALORIES,
      tdee + dailyCalorieAdjustment(goalType, weeklyWeightChangeKg)
    )
  );

  const dailyProtein = Math.round(currentWeight * proteinGramsPerKg);
  const proteinCalories = dailyProtein * 4;

  const fatCalories = dailyCalories * FAT_SHARE_OF_CALORIES;
  const dailyFat = Math.round(fatCalories / 9);

  const remainingCalories = Math.max(
    0,
    dailyCalories - proteinCalories - fatCalories
  );
  const dailyCarbs = Math.round(remainingCalories / 4);

  return {
    dailyCalories,
    dailyProtein,
    dailyCarbs,
    dailyFat,
    maintenanceCalories: Math.round(tdee),
  };
}

/**
 * Describes the weight plan behind the targets: how far the target is, the
 * daily calorie change actually applied, and roughly how many weeks that
 * takes. When the 1200 kcal floor limits a deficit, the real pace is slower
 * than the one chosen, so the timeline uses the applied change and
 * `limitedByMinimumCalories` is set. Null for MAINTAIN.
 */
function describeWeightPlan(
  { goalType, currentWeight, targetWeight, weeklyWeightChangeKg },
  { dailyCalories, maintenanceCalories }
) {
  if (goalType === "MAINTAIN" || targetWeight == null || !weeklyWeightChangeKg) {
    return null;
  }

  const weightChangeKg = Math.round(Math.abs(targetWeight - currentWeight) * 10) / 10;
  const appliedAdjustment = dailyCalories - maintenanceCalories;
  const appliedWeeklyChangeKg =
    Math.round(((Math.abs(appliedAdjustment) * 7) / KCAL_PER_KG_BODY_WEIGHT) * 100) / 100;

  return {
    goalType,
    currentWeight,
    targetWeight,
    weeklyWeightChangeKg,
    weightChangeKg,
    dailyCalorieAdjustment: appliedAdjustment,
    appliedWeeklyChangeKg,
    weeksToGoal: appliedWeeklyChangeKg > 0 ? Math.ceil(weightChangeKg / appliedWeeklyChangeKg) : null,
    limitedByMinimumCalories:
      Math.abs(appliedAdjustment) < Math.abs(dailyCalorieAdjustment(goalType, weeklyWeightChangeKg)),
  };
}

module.exports = {
  calculateSuggestedTargets,
  describeWeightPlan,
  dailyCalorieAdjustment,
  ACTIVITY_MULTIPLIERS,
  GOAL_CALORIE_ADJUSTMENT,
};
