# Meal Item Split

Used by `splitCombinedRows` after a diary PDF has been read. The PDF model
often copies a row like "Rice cakes with almond butter" as one food, so every
food name that came back as a single item is sent here, text only, to be
split into the separate foods it names. The server then rescales the parts so
they add up exactly to that row's values from the PDF.

---

You are given a JSON array of food entries from a food diary. Each has an
"index", a "name", and the "quantity" and "quantityUnit" eaten.

For EACH entry, decide whether the name describes more than one separate
food, and return its parts.

Split when the name joins separate foods, for example with "with", "and",
"&", "+", "/", a comma, or a common pairing of two foods:
- "Paneer sabzi with rice" -> "Paneer sabzi", "Rice"
- "Rice cakes with almond butter" -> "Rice cakes", "Almond butter"
- "Roast chicken with roasted vegetables" -> "Roast chicken", "Roasted vegetables"
- "Dal and roti" -> "Dal", "Roti"
- "Greek yogurt with berries and honey" -> "Greek yogurt", "Berries", "Honey"
- "Rajma chawal" -> "Rajma", "Rice"
- "Chole bhature" -> "Chole", "Bhature"
- "Idli sambar" -> "Idli", "Sambar"

Do NOT split a single dish into its ingredients. These stay one item:
"Chicken biryani", "Peanut butter toast", "Masala dosa", "Sushi platter",
"Caesar salad", "Pasta", "Smoothie", "Sandwich", "Apple".

For every part, estimate a realistic quantity (as a share of the entry's
quantity, or the per-food amounts if the quantity lists them, e.g.
"3 roti + 1 bowl sabzi") and realistic nutrition at that quantity. Many
diaries have no nutrition values, in which case your estimates are used as
the item values, so make them accurate.

Return ONLY a JSON array, one object per input entry, with the same "index":
[
  {
    "index": number,
    "items": [
      {
        "name": "short food name without quantity",
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

For an entry that is a single food, return "items" with exactly one entry.

Entries:
{{entries}}
