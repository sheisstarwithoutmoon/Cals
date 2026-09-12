# Frontend Design Guidelines

## 1. Overall Feel
I want the website to feel modern, clean, premium and health-focused. The goal is a polished consumer health app, not a generic admin dashboard.

## 2. Visual Style
Use a soft, minimal design with plenty of breathing room, rounded cards, subtle borders/shadows, clean typography and a restrained health/wellness color palette. Keep the UI visually interesting but not overloaded with colors or gradients.

## 3. Layout
Use a clean responsive application layout with a sidebar/navigation on desktop and a mobile-friendly navigation on smaller screens. Keep the main content well spaced and avoid unnecessarily wide layouts.

## 4. Dashboard
The dashboard should be the main focus and immediately show how the user is doing today. Show calorie intake vs goal, remaining calories, protein/carbs/fat progress, today's meals and useful quick actions such as adding a meal or analyzing food.

## 5. Meals
Make meal logging very easy and visually clean. Support Breakfast, Lunch, Dinner and Snacks. Meal history should support date/date-range filtering, meal-type filtering and pagination. Use clear meal cards/list items rather than making everything look like a database table.

## 6. Goals
The Goals page should feel personal and simple. Allow the user to view and edit daily calories, protein, carbs, fat and target weight. Show progress toward goals visually wherever useful.

## 7. Reports
Reports should be visual and easy to understand. Use Recharts for calorie trends, macro breakdowns, micronutrients and goal-vs-actual comparisons. Do not create fake statistics when the backend data is not available yet.

## 8. UX and Responsiveness
The application should work well on mobile, tablet and desktop. Include proper loading, empty and error states. Forms should have clear labels and validation. Use subtle animations/hover states where they improve the experience, but don't overdo animation.

## 9. Code & API Structure
Keep components reusable and avoid huge page files. Keep API calls in a dedicated frontend API/client layer and use TypeScript types for API data. The frontend must communicate with the Express backend only through APIs. Use the existing HTTP-only authentication cookie and never store the JWT in localStorage or expose it to frontend JavaScript. Do not modify backend code unless explicitly asked.