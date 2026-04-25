import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { DEFAULT_APP_SETTINGS, getPublicSettings, mergeSettings } from "../../shared/appSettings.js";

async function readStoredSettings() {
  const rows = await query(
    `SELECT settings_json AS settingsJson
     FROM app_settings
     WHERE id = 1
     LIMIT 1`
  );

  if (!rows[0]?.settingsJson) {
    return null;
  }

  try {
    const parsed = typeof rows[0].settingsJson === "string"
      ? JSON.parse(rows[0].settingsJson)
      : rows[0].settingsJson;

    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export async function getAdminSettings(_request, response) {
  const storedSettings = await readStoredSettings();
  const settings = mergeSettings(DEFAULT_APP_SETTINGS, storedSettings || {});

  response.json({
    success: true,
    data: settings
  });
}

export async function updateAdminSettings(request, response) {
  const incomingSettings = request.body?.settings;

  if (!incomingSettings || typeof incomingSettings !== "object" || Array.isArray(incomingSettings)) {
    throw new ApiError(400, "A valid settings object is required");
  }

  const settings = mergeSettings(DEFAULT_APP_SETTINGS, incomingSettings);

  await query(
    `INSERT INTO app_settings (id, settings_json, updated_by)
     VALUES (1, ?, ?)
     ON DUPLICATE KEY UPDATE
       settings_json = VALUES(settings_json),
       updated_by = VALUES(updated_by)`,
    [JSON.stringify(settings), request.admin?.id || null]
  );

  response.json({
    success: true,
    message: "Settings saved successfully",
    data: settings
  });
}

export async function getPublicAppSettings(_request, response) {
  const storedSettings = await readStoredSettings();
  const settings = mergeSettings(DEFAULT_APP_SETTINGS, storedSettings || {});

  response.json({
    success: true,
    data: getPublicSettings(settings)
  });
}
