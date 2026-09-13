const ACTIVITY_MULTIPLIERS = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

const GOAL_CALORIE_ADJUSTMENT = {
  LOSE: -500,
  MAINTAIN: 0,
  GAIN: 300,
};

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
 * Estimates daily calorie and macro targets from onboarding inputs.
 */
function calculateSuggestedTargets({
  age,
  gender,
  heightCm,
  currentWeight,
  activityLevel,
  goalType,
}) {
  const genderOffset = BMR_GENDER_OFFSET[gender] ?? BMR_GENDER_OFFSET.OTHER;
  const bmr = 10 * currentWeight + 6.25 * heightCm - 5 * age + genderOffset;
  const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel];

  const dailyCalories = Math.round(
    Math.max(MIN_DAILY_CALORIES, tdee + GOAL_CALORIE_ADJUSTMENT[goalType])
  );

  const dailyProtein = Math.round(currentWeight * PROTEIN_GRAMS_PER_KG);
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
  };
}

module.exports = {
  calculateSuggestedTargets,
  ACTIVITY_MULTIPLIERS,
  GOAL_CALORIE_ADJUSTMENT,
};
