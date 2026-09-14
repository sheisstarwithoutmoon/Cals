const { Type } = require("@google/genai");

const { VALID_MEAL_TYPES, GOAL_FIELD_LABELS } = require("./nutrition-helpers");

/**
 * Function-calling tools exposed to the chat model. Logging a meal or
 * changing a goal can ONLY happen by the model calling one of these — the
 * model is instructed (see assistant-conversation.prompt.md) never to claim
 * an action succeeded unless it actually invoked the matching tool, which is
 * what stops it from replying "done!" without anything being saved.
 */
const chatToolDeclarations = [
  {
    name: "add_to_meal",
    description:
      "Add one or more food items to an existing meal entry. Use this only when the user explicitly wants to add food to a previously logged meal, such as 'add a banana to that breakfast' or 'I also had milk with that meal'. Do not use this for a separate new eating occasion. Use a mealId from a previous tool result or from get_daily_summary. Never invent a mealId.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        mealId: {
          type: Type.STRING,
          description: "The ID of the existing meal entry to add food to.",
        },
        items: {
          type: Type.ARRAY,
          description: "The additional food items to add to the existing meal.",
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: "Food item name.",
              },
              quantity: {
                type: Type.NUMBER,
                description: "Amount of the food item.",
              },
              quantityUnit: {
                type: Type.STRING,
                description: "Unit such as piece, cup, glass, slice, or gram.",
              },
              calories: {
                type: Type.NUMBER,
                description: "Calories for this food item.",
              },
              protein: {
                type: Type.NUMBER,
                description: "Protein in grams.",
              },
              carbs: {
                type: Type.NUMBER,
                description: "Carbohydrates in grams.",
              },
              fat: {
                type: Type.NUMBER,
                description: "Fat in grams.",
              },
              fiber: {
                type: Type.NUMBER,
                description: "Fiber in grams.",
              },
              sugar: {
                type: Type.NUMBER,
                description: "Sugar in grams.",
              },
              sodium: {
                type: Type.NUMBER,
                description: "Sodium amount.",
              },
            },
            required: ["name", "calories"],
          },
        },
      },
      required: ["mealId", "items"],
    },
  },
  {
    name: "log_meal",
    description:
      "Log one or more meals in the user's diary. This is the ONLY way to actually save a meal — use it whenever the user wants food they described (in this message or earlier in the conversation) recorded. Foods eaten together at the same time are ONE meal, but each distinct food in it must be its own entry in that meal's `items` with its own quantity and nutrition (\"2 slices of bread with butter and jam, 1 banana, 1 coffee\" is one meal with three items). Never merge different foods into one item. Only use separate meals for genuinely separate eating occasions.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        meals: {
          type: Type.ARRAY,
          description: "One entry per distinct eating occasion to log.",
          items: {
            type: Type.OBJECT,
            properties: {
              mealType: {
                type: Type.STRING,
                enum: VALID_MEAL_TYPES,
              },
              items: {
                type: Type.ARRAY,
                description: "One entry per distinct food in this meal. The meal's totals are summed from these.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "Name of this single food, e.g. \"Bread with butter and jam\" or \"Banana\".",
                    },
                    quantity: { type: Type.NUMBER },
                    quantityUnit: {
                      type: Type.STRING,
                      description: "Unit for the quantity, e.g. slices, pieces, cups, g, serving.",
                    },
                    calories: { type: Type.NUMBER, description: "Calories for the quantity given." },
                    protein: { type: Type.NUMBER },
                    carbs: { type: Type.NUMBER },
                    fat: { type: Type.NUMBER },
                    fiber: { type: Type.NUMBER },
                    sugar: { type: Type.NUMBER },
                    sodium: { type: Type.NUMBER },
                  },
                  required: ["name", "quantity", "quantityUnit", "calories", "protein", "carbs", "fat"],
                },
              },
            },
            required: ["mealType", "items"],
          },
        },
      },
      required: ["meals"],
    },
  },
  {
    name: "update_goal",
    description: "Update one of the user's daily nutrition targets or their target weight.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        field: {
          type: Type.STRING,
          enum: Object.keys(GOAL_FIELD_LABELS),
        },
        value: { type: Type.NUMBER },
      },
      required: ["field", "value"],
    },
  },
  {
    name: "get_daily_summary",
    description:
      "Get the meals the user logged on one calendar day in their own timezone, with each meal's foods, time and nutrition plus the day's totals. Use it for any question about what the user ate on a specific day or at a specific meal (\"what did I have for lunch today\", \"what did I eat last Sunday\").",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: {
          type: Type.STRING,
          description: "The day to look up as YYYY-MM-DD, resolved from the user's wording against today's date.",
        },
        mealType: {
          type: Type.STRING,
          enum: VALID_MEAL_TYPES,
          description: "Only return this meal. Omit to return every meal that day.",
        },
      },
      required: ["date"],
    },
  },
  {
    name: "get_weekly_summary",
    description:
      "Get the user's meal totals and daily averages for a specific date range. Use this for weekly summaries such as this week, last week, or earlier weeks. Resolve relative phrases like 'last week' and 'last-to-last week' into exact dates using today's date from the system context.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        startDate: {
          type: Type.STRING,
          description: "Start of the requested period as YYYY-MM-DD.",
        },
        endDate: {
          type: Type.STRING,
          description: "End of the requested period as YYYY-MM-DD.",
        },
      },
      required: ["startDate", "endDate"],
    },
  },
];

module.exports = {
  chatToolDeclarations,
};
