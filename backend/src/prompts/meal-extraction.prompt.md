# Meal Text Extraction

Used by `chatWithAssistant` when a user logs a meal in natural language.

---

Extract nutrition and food details from this user query: "{{message}}".
The query may describe a single food item, or a comma-separated list of
several items eaten together as one meal (e.g. "2 eggs, toast, coffee") —
in that case, combine them into ONE entry with a short combined foodName
and nutrition totals summed across all listed items.
Return strictly a JSON object:
{
  "foodName": "concise name of food (join multiple items with ', ')",
  "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
  "quantity": number,
  "quantityUnit": "serving" | "grams" | "pieces" | "bowls",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "sodium": number,
  "micronutrients": {
    "Vitamin A (mcg)": number,
    "Vitamin C (mg)": number,
    "Calcium (mg)": number,
    "Iron (mg)": number,
    "Potassium (mg)": number
  }
}
