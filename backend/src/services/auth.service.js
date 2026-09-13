const prisma = require("../config/prisma");
const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../utils/auth");

async function registerUser({ name, email, password }) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const error = new Error("An account with this email already exists");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      onboardingCompleted: true,
      createdAt: true,
    },
  });

  const token = generateToken(user.id);

  return { user, token };
}

async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await comparePassword(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
    },
    token,
  };
}

async function getUserById(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      onboardingCompleted: true,
      createdAt: true,
    },
  });
}

async function loginOrCreateGoogleUser({
  googleId,
  email,
  name,
}) {
  let user = await prisma.user.findUnique({
    where: { googleId },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
        },
      });
    }
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        name,
        email,
        googleId,
      },
    });
  }

  const token = generateToken(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
    },
    token,
  };
}

async function checkUserEmailExists(email) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  return Boolean(user);
}

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  loginOrCreateGoogleUser,
  checkUserEmailExists,
};