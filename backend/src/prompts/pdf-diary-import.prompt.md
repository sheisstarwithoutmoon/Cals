# PDF Diary Import Extraction

Used by `importMealsFromPdf` to parse a tabular food-diary/nutrition-history
PDF export into individual meal entries, one row at a time.

---

Extract every food/meal row from the attached PDF. The table may use any
column names or order, but each row describes one food item eaten on one
date, usually with a meal label (Breakfast/Lunch/Dinner/Snack) and a
quantity. Text may be in English, another language, or a mix of both
(e.g. Hindi in Devanagari script) — read it regardless of language and
translate/transliterate food names to English for `foodName`.

Return ONLY a JSON array (no prose, no markdown fences), one object per row,
strictly matching this schema:
{
  "date": "YYYY-MM-DD, taken exactly from that row's date column",
  "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
  "foodName": "concise English name of the food",
  "quantity": number,
  "quantityUnit": "string, e.g. serving/grams/pieces/bowls",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "sodium": number
}

Every row MUST include its own "date" field taken from that row of the
table — never omit it and never substitute today's date. If a row's date
truly cannot be read, omit that row entirely rather than guessing.
