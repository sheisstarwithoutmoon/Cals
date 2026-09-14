const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

const MEAL_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MAX_MEAL_PHOTO_BYTES = 8 * 1024 * 1024;

/**
 * Uploads a base64 data URL (image or PDF) to Cloudinary and returns its
 * secure URL, or null if Cloudinary isn't configured or the upload fails —
 * callers treat attachments as best-effort so a missing/broken upload never
 * blocks meal logging.
 */
async function uploadAttachment(dataUrl, folder) {
  if (!isCloudinaryConfigured || !dataUrl) return null;

  try {
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder,
      resource_type: "auto",
    });

    return result.secure_url;
  } catch (err) {
    console.warn("Cloudinary upload failed:", err.message);
    return null;
  }
}

function requestError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Uploads a photo the user attached while logging a meal to Cloudinary and
 * returns its Cloudinary URL. Unlike `uploadAttachment`, the user explicitly
 * chose this photo, so a failed upload is reported instead of ignored.
 */
async function uploadMealPhoto(dataUrl) {
  const match = /^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i.exec(dataUrl ?? "");

  if (!match) {
    throw requestError("The photo must be a base64 image data URL.", 400);
  }

  if (!MEAL_PHOTO_TYPES.includes(match[1].toLowerCase())) {
    throw requestError("Only JPEG, PNG or WebP photos are supported.", 400);
  }

  if (Buffer.byteLength(match[2], "base64") > MAX_MEAL_PHOTO_BYTES) {
    throw requestError("The photo is too large. Please use one under 8 MB.", 400);
  }

  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured, so meal photos can't be uploaded");
  }

  const url = await uploadAttachment(dataUrl, "cals/meal-photos");

  if (!url) {
    throw new Error("Cloudinary meal photo upload failed");
  }

  return url;
}

module.exports = {
  uploadAttachment,
  uploadMealPhoto,
  isCloudinaryConfigured,
};
