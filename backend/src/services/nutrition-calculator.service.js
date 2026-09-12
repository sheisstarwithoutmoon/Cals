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

/**
 * Estimates daily calorie and macro targets from onboarding inputs.
 *
 * Onboarding intentionally doesn't collect sex, so BMR uses the midpoint of
 * the Mifflin-St Jeor male/female offsets (+5 and -161) rather than the
 * sex-specific formula, trading some accuracy for one fewer required field.
 */
function calculateSuggestedTargets({
  age,
  heightCm,
  currentWeight,
  activityLevel,
  goalType,
}) {
  const bmr = 10 * currentWeight + 6.25 * heightCm - 5 * age - 78;
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
