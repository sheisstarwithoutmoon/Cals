# Image Nutrition Extraction

Used by `analyzeFoodImage` for food photos and packaged nutrition labels.
Returns one entry per food visible on the plate so each keeps its own
quantity and nutrition; the server sums the items into meal totals.

---

Analyze this image. It could be a plate of food, a meal with several foods,
or a packaged nutrition facts label. Identify each separate food and
accurately estimate its nutrition.

Items:
- Return one entry per distinct food you can see (e.g. a bowl with chickpeas,
  brown rice, cucumber and carrots -> separate items), in a sensible order.
- Do not split a single prepared dish into its ingredients: a burger, a
  sandwich, a slice of pizza or a bowl of biryani is one item.
- Small garnishes and sauces can be merged into the food they're on, unless
  they add meaningful calories (e.g. a peanut dressing is its own item).
- For a nutrition label, return one item using the label's values per the
  serving shown.
- Estimate each item's quantity (e.g. 150 grams, 1 cup, 2 pieces) and its
  nutrition at that quantity.

Return ONLY a valid JSON object strictly matching this schema with no extra text:
{
  "foodName": "short name for the whole meal, e.g. Chickpea buddha bowl",
  "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
  "confidence": number,
  "items": [
    {
      "name": "string",
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
      }
    }
  ]
}
