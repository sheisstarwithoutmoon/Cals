# Cals: Personal Calorie Tracker

A personalized nutrition and calorie tracking application that helps users manage their daily food intake, set health goals, and understand their nutritional progress through reports, visualizations, and AI-powered assistance.

## Demo Link : https://drive.google.com/file/d/1_tWCRQ-pZiHH3XnQCneZ6OMBqSzDGCpp/view?usp=sharing

## Features

- Set and manage daily calorie, protein, carb, fat, and weight goals
- Add, edit, and delete meals
- Log meals by Breakfast, Lunch, Dinner, and Snacks
- Add multiple food items to a single meal
- Track calories, macros, and micronutrients
- View meal and nutrition history
- Filter meals by date, date range, and meal type
- Paginate meal history
- Generate nutrition reports and visualizations
- View weekly calorie intake trends
- View daily and weekly macronutrient breakdowns
- View micronutrient summaries
- Compare actual intake with personalized nutrition goals
- AI-powered nutrition extraction from food images and nutrition labels
- Automatically pre-fill nutrition information using AI image analysis
- Conversational AI assistant for meal logging and nutrition queries
- Log meals, update goals, and check nutrition summaries using natural language
- Generate daily and weekly nutrition summaries through AI
- Bulk import food diaries and nutrition history from PDF
- User authentication with email/password and Google
- Multi-user support with private user-specific data
- Responsive design for mobile, tablet, and desktop
- Input validation and targeted API rate limiting

## Technologies Used

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express.js, REST APIs
- **Database:** PostgreSQL, Neon, Prisma ORM
- **Authentication:** JWT, HTTP-only cookies, Google OAuth
- **AI:** Gemini API, Multimodal AI, LLM Tool Calling
- **Image Storage:** Cloudinary
- **Charts and Visualizations:** Recharts
- **Validation:** Zod
- **Security:** Express Rate Limit

## AI Food Analysis

The application supports AI-powered nutrition extraction from food images and product nutrition labels:

- Upload a food image or nutrition label
- Analyze the image using Gemini's multimodal capabilities
- Extract food name, quantity, calories, macros, and micronutrients
- Automatically pre-fill the meal form
- Review and verify extracted information before saving

This allows users to quickly record meals without manually entering every nutritional value.

## Conversational AI Assistant

- Cals provides a conversational AI assistant that allows users to interact with their nutrition data using natural language.
- flow of the ai assistant:
<img width="886" height="775" alt="image" src="https://github.com/user-attachments/assets/127a4fce-7154-4390-8794-cb5d86bff6e8" />


## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/sheisstarwithoutmoon/Cals.git
   cd Cals
   ```

2. Install dependencies for both frontend and backend:

   ```bash
   cd frontend
   npm install

   cd ../backend
   npm install
   ```

3. Set up backend environment variables. Create a `.env` file in the `backend` directory and add:

   ```env
   PORT=5000
   DATABASE_URL=your_neon_postgresql_connection_string
   JWT_SECRET=your_jwt_secret

   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=your_google_redirect_uri

   GEMINI_API_KEY=your_gemini_api_key

   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   FRONTEND_URL=http://localhost:3000
   ```

   Replace the placeholder values with your actual credentials.

4. Set up frontend environment variables. Create a `.env.local` file in the `frontend` directory and add:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

   Replace the value with your backend API URL when deploying.

5. Generate the Prisma Client:

   ```bash
   cd backend
   npx prisma generate
   ```

6. Start the backend server:

   ```bash
   cd backend
   npm run dev
   ```

7. Start the frontend development server:

   ```bash
   cd frontend
   npm run dev
   ```

8. Open your browser and navigate to:

   ```text
   http://localhost:3000
   ```

## API Endpoints

### Authentication

* **POST `/api/auth/register`**: Register a new user.
* **POST `/api/auth/login`**: Log in an existing user.
* **POST `/api/auth/logout`**: Log out the current user.
* **GET `/api/auth/me`**: Get the current user's profile.
* **GET `/api/auth/google`**: Authenticate using Google OAuth.
* **GET `/api/auth/google/callback`**: Handle the Google OAuth callback.

### Meals

* **POST `/api/meals`**: Create a new meal.
* **GET `/api/meals`**: Get paginated meals with date and meal-type filters.
* **GET `/api/meals/:id`**: Get a specific meal.
* **PUT `/api/meals/:id`**: Update a meal.
* **DELETE `/api/meals/:id`**: Delete a meal.

### Goals & Profile

* **GET `/api/goals`**: Get the user's nutrition goals.
* **PUT `/api/goals`**: Update nutrition goals.
* **GET `/api/profile`**: Get the user's profile.
* **PUT `/api/profile`**: Update the user's profile.

### Nutrition Reports

* **GET `/api/reports`**: Generate nutrition report data for a selected time range.

### AI Assistant

* **POST `/api/chat`**: Send a message to the AI nutrition assistant.
* **GET `/api/chat/history`**: Get paginated chat history.

### AI Food Analysis

* **POST `/api/ai/analyze-image`**: Analyze a food image or nutrition label using AI.

### PDF Import

* **POST `/api/import/pdf/preview`**: Preview nutrition entries extracted from a PDF.
* **POST `/api/import/pdf`**: Import confirmed entries from a PDF.

## Usage

Once the application is running, you can:

* Register a new account or log in with an existing account.
* Complete personalized nutrition onboarding.
* Set daily calorie, macro, and weight goals.
* Add and manage meals and food items.
* View and filter your meal history.
* Track calories, macros, and micronutrients.
* View nutrition reports and progress charts.
* Upload food images or nutrition labels for AI-powered nutrition extraction.
* Use the conversational AI assistant to log meals and manage nutrition goals.
* Ask the AI assistant for daily and weekly nutrition summaries.
* Import food diaries and nutrition history from PDF files.

