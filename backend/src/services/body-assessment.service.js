/**
 * BMI, a recommended weight goal, and health-based safety limits. Used by
 * onboarding and the Goals page alike, so a user sees the same
 * recommendation and the same limits wherever they set their goal.
 *
 * These are general, conservative defaults, not medical advice; conditions
 * that change what's safe add a note telling the user to check with a doctor.
 */

const HEALTH_CONDITIONS = {
  DIABETES: "Diabetes or prediabetes",
  HIGH_BLOOD_PRESSURE: "High blood pressure",
  HEART_DISEASE: "Heart condition",
  KIDNEY_DISEASE: "Kidney disease",
  THYROID: "Thyroid condition",
  PCOS: "PCOS",
  PREGNANT_OR_BREASTFEEDING: "Pregnant or breastfeeding",
  EATING_DISORDER: "History of an eating disorder",
};

const HEALTH_CONDITION_KEYS = Object.keys(HEALTH_CONDITIONS);

// WHO adult BMI bands.
const HEALTHY_BMI_MIN = 18.5;
const HEALTHY_BMI_MAX = 24.9;

// Default weekly pace limits (kg/week), matching the onboarding pace options.
const DEFAULT_MAX_WEEKLY_CHANGE = { LOSE: 1, GAIN: 0.5 };
// Slower cap when a condition makes rapid weight change riskier.
const CAUTIOUS_MAX_WEEKLY_LOSS = 0.5;

// Standard protein target, and a lower one for kidney disease, where high
// protein intake can add strain.
const PROTEIN_GRAMS_PER_KG = 1.8;
const KIDNEY_PROTEIN_GRAMS_PER_KG = 0.8;

function roundTo(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function bmiCategory(bmi) {
  if (bmi < HEALTHY_BMI_MIN) return "UNDERWEIGHT";
  if (bmi <= HEALTHY_BMI_MAX) return "HEALTHY";
  if (bmi < 30) return "OVERWEIGHT";
  return "OBESE";
}

/**
 * Assesses a user's body stats and health conditions:
 * - `bmi`, `bmiCategory` and the healthy weight range for their height;
 * - `recommendedGoalType`, and for LOSE/GAIN the `recommendedTargetWeight`
 *   (the nearest edge of the healthy range) and how far away it is;
 * - `allowedGoalTypes` and `maxWeeklyChangeKg` after health limits;
 * - `proteinGramsPerKg` for target calculation;
 * - `notes`: plain-language cautions to show next to the recommendation.
 * Returns null when height or weight is missing.
 */
function assessBody({ heightCm, currentWeight, healthConditions = [] }) {
  if (!heightCm || !currentWeight) return null;

  const conditions = new Set(healthConditions);
  const heightM = heightCm / 100;
  const bmi = roundTo(currentWeight / (heightM * heightM));
  const category = bmiCategory(bmi);
  const healthyWeightRange = {
    min: Math.ceil(HEALTHY_BMI_MIN * heightM * heightM),
    max: Math.floor(HEALTHY_BMI_MAX * heightM * heightM),
  };

  const notes = [];
  const allowedGoalTypes = new Set(["LOSE", "MAINTAIN", "GAIN"]);
  const maxWeeklyChangeKg = { ...DEFAULT_MAX_WEEKLY_CHANGE };

  let recommendedGoalType =
    category === "UNDERWEIGHT" ? "GAIN" : category === "HEALTHY" ? "MAINTAIN" : "LOSE";

  if (conditions.has("PREGNANT_OR_BREASTFEEDING")) {
    allowedGoalTypes.delete("LOSE");
    notes.push({
      tone: "caution",
      message:
        "Losing weight isn't advised while pregnant or breastfeeding. Follow your doctor's or midwife's guidance on how much to eat.",
    });
  }

  if (conditions.has("EATING_DISORDER")) {
    allowedGoalTypes.delete("LOSE");
    notes.push({
      tone: "caution",
      message:
        "With a history of an eating disorder, calorie cutting can be harmful. We won't set a weight-loss goal. Please plan any changes with your care team.",
    });
  }

  if (currentWeight <= healthyWeightRange.min) {
    allowedGoalTypes.delete("LOSE");
    notes.push({
      tone: "info",
      message: `You're at or below the lowest healthy weight for your height (${healthyWeightRange.min} kg), so a weight-loss goal isn't available.`,
    });
  }

  if (!allowedGoalTypes.has(recommendedGoalType)) {
    recommendedGoalType = "MAINTAIN";
  }

  if (conditions.has("HEART_DISEASE") || conditions.has("KIDNEY_DISEASE") || conditions.has("DIABETES")) {
    maxWeeklyChangeKg.LOSE = CAUTIOUS_MAX_WEEKLY_LOSS;
  }

  if (conditions.has("DIABETES")) {
    notes.push({
      tone: "caution",
      message:
        "If you take medication for diabetes, eating less can lower your blood sugar. Check with your doctor before cutting calories. Weight loss is limited to 0.5 kg a week.",
    });
  }

  if (conditions.has("HEART_DISEASE")) {
    notes.push({
      tone: "caution",
      message:
        "With a heart condition, change your diet gradually and with your doctor's advice. Weight loss is limited to 0.5 kg a week.",
    });
  }

  if (conditions.has("KIDNEY_DISEASE")) {
    notes.push({
      tone: "caution",
      message: `With kidney disease, high protein can add strain, so your protein target uses ${KIDNEY_PROTEIN_GRAMS_PER_KG} g per kg instead of ${PROTEIN_GRAMS_PER_KG} g. Confirm the right amount with your doctor.`,
    });
  }

  if (conditions.has("HIGH_BLOOD_PRESSURE")) {
    notes.push({
      tone: "info",
      message:
        "With high blood pressure, keep an eye on sodium. It's shown in your Nutrient coverage report.",
    });
  }

  if (conditions.has("THYROID") || conditions.has("PCOS")) {
    notes.push({
      tone: "info",
      message:
        "Thyroid conditions and PCOS can make weight change slower than these estimates. A steady pace is easier to keep up.",
    });
  }

  const recommendedTargetWeight =
    recommendedGoalType === "LOSE"
      ? healthyWeightRange.max
      : recommendedGoalType === "GAIN"
        ? healthyWeightRange.min
        : null;

  return {
    bmi,
    bmiCategory: category,
    healthyWeightRange,
    recommendedGoalType,
    recommendedTargetWeight,
    recommendedWeightChangeKg:
      recommendedTargetWeight != null ? roundTo(Math.abs(currentWeight - recommendedTargetWeight)) : 0,
    allowedGoalTypes: ["LOSE", "MAINTAIN", "GAIN"].filter((type) => allowedGoalTypes.has(type)),
    maxWeeklyChangeKg,
    proteinGramsPerKg: conditions.has("KIDNEY_DISEASE") ? KIDNEY_PROTEIN_GRAMS_PER_KG : PROTEIN_GRAMS_PER_KG,
    notes,
  };
}

function fieldError(path, message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.errors = [{ path: [path], message }];
  return error;
}

/**
 * Throws a 400 with a field error if a goal plan isn't allowed for this user:
 * a goal type blocked by their health conditions, a target in the wrong
 * direction from their current weight, or a pace above their limit.
 */
function assertGoalPlanAllowed(assessment, { goalType, targetWeight, weeklyWeightChangeKg }, currentWeight) {
  if (!assessment) return;

  if (!assessment.allowedGoalTypes.includes(goalType)) {
    throw fieldError("goalType", "This goal isn't available with the health conditions you've shared.");
  }

  if (goalType === "MAINTAIN") return;

  if (goalType === "LOSE" && targetWeight >= currentWeight) {
    throw fieldError("targetWeight", `Your target should be below your current weight (${currentWeight} kg)`);
  }

  if (goalType === "LOSE" && targetWeight < assessment.healthyWeightRange.min) {
    throw fieldError(
      "targetWeight",
      `A target below ${assessment.healthyWeightRange.min} kg would put your BMI in the underweight range`
    );
  }

  if (goalType === "GAIN" && targetWeight <= currentWeight) {
    throw fieldError("targetWeight", `Your target should be above your current weight (${currentWeight} kg)`);
  }

  const maxPace = assessment.maxWeeklyChangeKg[goalType];
  if (weeklyWeightChangeKg > maxPace) {
    throw fieldError("weeklyWeightChangeKg", `Choose a pace of ${maxPace} kg per week or slower`);
  }
}

module.exports = {
  HEALTH_CONDITIONS,
  HEALTH_CONDITION_KEYS,
  assessBody,
  assertGoalPlanAllowed,
};
