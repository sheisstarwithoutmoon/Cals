const { profileUpdateSchema } = require("../schemas/onboarding.schema");
const { getProfile, updateProfile } = require("../services/profile.service");

async function get(req, res, next) {
  try {
    const profile = await getProfile(req.user.id);

    res.json({
      success: true,
      ...profile,
    });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const patch = profileUpdateSchema.parse(req.body);
    const profile = await updateProfile(req.user.id, patch);

    res.json({
      success: true,
      ...profile,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  get,
  update,
};
