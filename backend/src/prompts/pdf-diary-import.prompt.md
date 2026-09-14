# PDF Diary Import Extraction

Used by `parseMealsFromPdf` to read a tabular food-diary/nutrition-history PDF
export one row at a time. Rows are split into the separate foods they name.
Diaries may or may not include nutrition columns: when they do, the row's
values are copied and the server rescales the items to add up to them; when
they don't, every item's nutrition is estimated. The server then groups rows
that share a date and meal type into a single meal.

---

Extract every food/meal row from the attached PDF. The table may use any
column names or order, but each row describes what was eaten on one date,
usually with a meal label (Breakfast/Lunch/Dinner/Snack) and a quantity.
Text may be in English, another language, or a mix of both (e.g. Hindi in
Devanagari script) — read it regardless of language and translate or
transliterate food names to English.

Return ONLY a JSON array (no prose, no markdown fences), one object per row,
strictly matching this schema:
[
  {
    "date": "YYYY-MM-DD, taken exactly from that row's date column",
    "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
    "foodName": "concise English name of the row",
    "imageUrl": "URL string or null",
    "quantity": number,
    "quantityUnit": "string, e.g. serving/grams/pieces/bowls",
    "nutritionFromPdf": boolean,
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number,
    "sugar": number,
    "sodium": number,
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
        "sodium": number
      }
    ]
  }
]

Image URL — if the row or the food name is hyperlinked to an image, or a
nearby cell contains an image URL (http/https link ending in .jpg, .jpeg,
.png, .webp, or any URL that clearly points to a food photo), include it as
"imageUrl". If there is no image link, set "imageUrl" to null.

Nutrition values — every row and every item MUST include calories, protein,
carbs, fat, fiber, sugar and sodium as numbers:
- If the table has nutrition columns (calories, protein, ...), set
  "nutritionFromPdf": true and copy the row-level values exactly from the PDF.
  Never re-estimate values the PDF gives.
- If the table has no nutrition columns (only foods and quantities), set
  "nutritionFromPdf": false and estimate realistic values yourself.
- Item values are always estimates for that item's quantity. When the PDF
  gives row values, make the items add up to them as closely as you can.

Items — split each row into the separate foods it names:
- If the row names more than one food joined by "with", "and", "aur", "&",
  "+", a comma or a slash, or is a common pairing of separate foods, return
  one entry per food in "items", in order. Examples:
  - "Paneer sabzi with rice" -> "Paneer sabzi", "Rice"
  - "Dal aur roti" -> "Dal", "Roti"
  - "Rajma chawal" -> "Rajma", "Rice"
  - "Anda curry chawal ke saath" -> "Egg curry", "Rice"
  - "Idli with sambar" -> "Idli", "Sambar"
- Do NOT split a single dish into its ingredients: "Chicken biryani",
  "Peanut butter toast", "Masala dosa", "Veg fried rice", "Smoothie bowl",
  "Poha" and "Apple" stay one item.
- Use the quantity column to give each item its own amount when it lists one
  per food (e.g. "3 roti + 1 bowl sabzi" -> Roti 3 pieces, Aloo sabzi 1 bowl;
  "2 eggs + 2 slices" -> Scrambled eggs 2 eggs, Toast 2 slices). Otherwise
  estimate a realistic share of the row's quantity for each item.
- For a single-food row, return "items" with exactly one entry for that food.

Every row MUST include its own "date" field taken from that row of the
table — never omit it and never substitute today's date. If a row's date
truly cannot be read, omit that row entirely rather than guessing. Keep one
object per table row: do not merge rows with each other.
