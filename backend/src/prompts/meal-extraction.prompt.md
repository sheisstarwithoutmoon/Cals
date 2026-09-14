# Meal Text Extraction

Used by `extractNutritionFromText` (the "Estimate nutrition with AI" action in
the meal form) and by the offline chat fallback when a user logs a meal in
natural language. Returns one entry per food item so each item keeps its own
name, quantity and nutrition; the server sums the items into meal totals.

---

Extract the food items and their nutrition from this meal description: "{{message}}".

The description may name a single food, or several items eaten together as
one meal, usually separated by commas, "and", "with", "&", "/" or "+". Return
ONE entry per distinct food item, in the order they appear. Examples:
- "2 eggs, toast and coffee" -> "Eggs", "Toast", "Coffee"
- "Paneer sabzi with rice" -> "Paneer sabzi", "Rice"
- "Rajma chawal" -> "Rajma", "Rice" (a pairing of two separate foods)
Do not merge different foods into one item, and do not split a single dish
into its ingredients: "Chicken biryani", "Peanut butter toast" and
"Masala dosa" are each one item.

For each item:
- Use the quantity and unit the user gave (e.g. "2 roti" -> quantity 2, unit
  "pieces"; "200g paneer" -> quantity 200, unit "grams"). If none is given,
  assume a typical single serving: quantity 1, unit "serving".
- Estimate nutrition for that item AT THAT QUANTITY (not per unit).
- Give the name as a short, clean food name without the quantity
  (e.g. "Roti", not "2 roti").

Pick the most likely mealType for the meal as a whole.

Return ONLY a JSON object, no prose and no markdown fences, strictly matching:
{
  "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
  "items": [
    {
      "name": "string",
      "quantity": number,
      "quantityUnit": "string, e.g. serving/grams/pieces/bowls/cups",
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
  ]
}
