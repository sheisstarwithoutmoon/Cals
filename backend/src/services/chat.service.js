const prisma = require("../config/prisma");

// How many past turns to feed back into the model as conversation context.
// Kept modest since every stored turn is replayed on every subsequent
// request (Gemini has no server-side session memory of its own).
const HISTORY_LIMIT = 20;

async function getRecentHistory(userId, limit = HISTORY_LIMIT) {
  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return messages.reverse();
}

async function getChatHistory(userId, filters = {}) {
  const { page = 1, limit = 20 } = filters;
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const skip = (safePage - 1) * safeLimit;

  const [messages, total] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit,
    }),
    prisma.chatMessage.count({
      where: { userId },
    }),
  ]);

  const totalPages = Math.ceil(total / safeLimit) || 1;

  return {
    messages: messages.reverse(),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
  };
}

async function appendMessage(userId, { role, content, action, metadata }) {
  return prisma.chatMessage.create({
    data: {
      userId,
      role,
      content,
      action: action || null,
      // Round-trip through JSON so Date instances inside meal/goal objects
      // become plain ISO strings the Json column can store.
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    },
  });
}

module.exports = {
  getRecentHistory,
  getChatHistory,
  appendMessage,
  HISTORY_LIMIT,
};
