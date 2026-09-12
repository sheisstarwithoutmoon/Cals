const { PDFParse } = require("pdf-parse");
const prisma = require("../config/prisma");

/**
 * Parses raw text extracted from PDF into structured meal entries.
 */
function parseMealTextLines(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsedMeals = [];
  const mealTypeKeywords = {
    breakfast: "BREAKFAST",
    lunch: "LUNCH",
    dinner: "DINNER",
    snack: "SNACK",
    snacks: "SNACK",
  };

  let currentMealType = "LUNCH";
  let currentDate = new Date();

  for (const line of lines) {
    // Check if line contains a date like 2026-09-12 or 12/09/2026
    const dateMatch = line.match(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})\b/);
    if (dateMatch) {
      const parsed = new Date(dateMatch[1]);
      if (!isNaN(parsed.getTime())) {
        currentDate = parsed;
      }
    }

    // Check if line sets a meal section
    const lowerLine = line.toLowerCase();
    for (const [kw, type] of Object.entries(mealTypeKeywords)) {
      if (lowerLine === kw || lowerLine.startsWith(`${kw}:`)) {
        currentMealType = type;
      }
    }

    // Attempt to match tabular / delimited format:
    // Format examples:
    // "Oatmeal with Blueberries | 1 bowl | 280 kcal | 10g P | 45g C | 5g F"
    // "Grilled Chicken Salad 350 35 15 12"
    // "Eggs and toast, 320 kcal, 18g protein, 24g carbs, 14g fat"
    
    // Look for calories in line (e.g. 350 kcal or 350 cal or standalone number > 20)
    const calorieMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:kcal|calories|cals|cal)\b/i) || line.match(/\b([1-9]\d{1,3})\s*(?:cal|kcal)?\b/);
    
    if (calorieMatch) {
      const calories = parseFloat(calorieMatch[1]);
      if (calories > 10 && calories < 4000) {
        // Extract protein, carbs, fat
        const proteinMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:g)?\s*(?:p|protein)\b/i) || line.match(/\bp(?:rotein)?\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
        const carbsMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:g)?\s*(?:c|carbs|carbohydrates)\b/i) || line.match(/\bc(?:arbs)?\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
        const fatMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:g)?\s*(?:f|fat|fats)\b/i) || line.match(/\bf(?:at)?\s*[:=]?\s*(\d+(?:\.\d+)?)/i);

        // Extract food name by cleaning digits/calories
        let foodName = line
          .replace(/\b(breakfast|lunch|dinner|snack|snacks)\b/gi, "")
          .replace(/(\d+(?:\.\d+)?)\s*(?:kcal|calories|cals|cal|g|protein|carbs|fat|p|c|f)\b/gi, "")
          .replace(/[|,:;\-–—]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (!foodName || foodName.length < 2) {
          foodName = "Imported Food Item";
        }

        parsedMeals.push({
          mealType: currentMealType,
          foodName,
          quantity: 1,
          quantityUnit: "serving",
          calories: Math.round(calories),
          protein: proteinMatch ? parseFloat(proteinMatch[1]) : Math.round(calories * 0.05),
          carbs: carbsMatch ? parseFloat(carbsMatch[1]) : Math.round(calories * 0.12),
          fat: fatMatch ? parseFloat(fatMatch[1]) : Math.round(calories * 0.03),
          consumedAt: new Date(currentDate),
          source: "PDF_IMPORT",
        });
      }
    }
  }

  // If table format had header lines without standard kcal suffix, attempt simple fallback row split
  if (parsedMeals.length === 0) {
    for (const line of lines) {
      const tokens = line.split(/[,\t|]/).map((t) => t.trim()).filter(Boolean);
      if (tokens.length >= 2) {
        const cal = parseFloat(tokens[1]);
        if (!isNaN(cal) && cal > 10 && cal < 5000) {
          parsedMeals.push({
            mealType: currentMealType,
            foodName: tokens[0] || "Logged Food",
            quantity: 1,
            quantityUnit: "serving",
            calories: Math.round(cal),
            protein: tokens[2] ? parseFloat(tokens[2]) || 15 : 15,
            carbs: tokens[3] ? parseFloat(tokens[3]) || 30 : 30,
            fat: tokens[4] ? parseFloat(tokens[4]) || 10 : 10,
            consumedAt: new Date(currentDate),
            source: "PDF_IMPORT",
          });
        }
      }
    }
  }

  return parsedMeals;
}

/**
 * Parses PDF buffer and imports meals into PostgreSQL for the user.
 */
async function importMealsFromPdf(userId, pdfBuffer) {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    throw new Error("Valid PDF buffer is required");
  }

  const parser = new PDFParse({ data: pdfBuffer });
  let rawText = "";

  try {
    const data = await parser.getText();
    rawText = data.text || "";
  } finally {
    await parser.destroy();
  }
  
  if (!rawText.trim()) {
    throw new Error("Could not extract readable text from PDF");
  }

  const extractedMeals = parseMealTextLines(rawText);

  if (extractedMeals.length === 0) {
    throw new Error("No tabular nutrition entries could be detected in this PDF. Please ensure rows contain food items and calorie values.");
  }

  // Bulk create in database
  const created = await prisma.mealEntry.createMany({
    data: extractedMeals.map((meal) => ({
      userId,
      ...meal,
    })),
  });

  return {
    count: created.count,
    sampleEntries: extractedMeals.slice(0, 5),
  };
}

module.exports = {
  importMealsFromPdf,
  parseMealTextLines,
};
