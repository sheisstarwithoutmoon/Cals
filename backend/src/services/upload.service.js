const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

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

module.exports = { uploadAttachment, isCloudinaryConfigured };
