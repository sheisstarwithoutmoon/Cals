require("dotenv").config();
const prisma = require("./src/config/prisma");

async function clearDatabase() {

    try {

        await prisma.chatMessage.deleteMany();

        await prisma.mealEntry.deleteMany();

        await prisma.goal.deleteMany();

        await prisma.user.deleteMany();



        console.log("Database cleared successfully.");

    } catch (error) {

        console.error("Failed to clear database:", error);

        process.exitCode = 1;

    } finally {

        await prisma.$disconnect();

    }

}

clearDatabase();
