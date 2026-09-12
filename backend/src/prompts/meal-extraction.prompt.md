# Meal Text Extraction

Used by `chatWithAssistant` when a user logs a meal in natural language.

---

Extract nutrition and food details from this user query: "{{message}}".
Return strictly a JSON object:
{
  "foodName": "concise name of food",
  "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
  "quantity": number,
  "quantityUnit": "serving" | "grams" | "pieces" | "bowls",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "sodium": number
}
