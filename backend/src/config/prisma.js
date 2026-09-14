const { PrismaClient } = require("../generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  // Prisma's defaults (2s to acquire a connection, 5s to run) are too tight
  // for a remote serverless Postgres: re-opening an idle connection, or
  // waking a suspended Neon compute, alone can take longer than 2s.
  transactionOptions: {
    maxWait: 15000,
    timeout: 30000,
  },
});

module.exports = prisma;