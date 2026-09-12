# Image Nutrition Extraction

Used by `analyzeFoodImage` for food photos and packaged nutrition labels.

---

Analyze this image (which could be a plate of food, a meal, or a packaged nutrition facts label).
Extract or accurately estimate the nutritional information.
Return ONLY a valid JSON object strictly matching this schema with no extra text:
{
  "foodName": "string",
  "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
  "quantity": number,
  "quantityUnit": "string",
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
  },
  "confidence": number
}
