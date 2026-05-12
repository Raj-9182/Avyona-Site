import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { DEFAULT_APP_SETTINGS, getPublicSettings, mergeSettings } from "../../shared/appSettings.js";

function clampInteger(value, min, max, fieldName) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < min || number > max) {
    throw new ApiError(400, `${fieldName} must be between ${min} and ${max}`);
  }

  return number;
}

function normalizeBrowseCategoriesSettings(payload = {}) {
  return {
    enabled: payload.enabled !== false,
    title: String(payload.title || DEFAULT_APP_SETTINGS.homepage.browseCategoriesSettings.title).trim(),
    subtitle: String(payload.subtitle || "").trim(),
    cardsPerRow: clampInteger(payload.cardsPerRow, 1, 10, "cardsPerRow"),
    mobileCardsPerRow: clampInteger(payload.mobileCardsPerRow, 1, 3, "mobileCardsPerRow"),
    sortOrder: Number.isFinite(Number(payload.sortOrder)) ? Math.floor(Number(payload.sortOrder)) : DEFAULT_APP_SETTINGS.homepage.browseCategoriesSettings.sortOrder
  };
}

const homepageSectionSettingsKeyBySection = {
  "browse-categories": "browseCategoriesSettings",
  "our-products": "ourProductsSettings",
  "best-sellers": "bestSellerProductsSettings",
  "new-arrivals": "newArrivalProductsSettings"
};

function getHomepageSectionSettingsKey(sectionKey) {
  const settingsKey = homepageSectionSettingsKeyBySection[String(sectionKey || "").trim()];
  if (!settingsKey) {
    throw new ApiError(404, "Homepage section settings not found");
  }
  return settingsKey;
}

function normalizeHomepageSectionSettings(payload = {}, fallback = DEFAULT_APP_SETTINGS.homepage.ourProductsSettings) {
  return {
    enabled: payload.enabled !== false,
    title: String(payload.title || fallback.title || "").trim(),
    subtitle: String(payload.subtitle || "").trim(),
    cardsPerRow: clampInteger(payload.cardsPerRow, 1, 10, "cardsPerRow"),
    mobileCardsPerRow: clampInteger(payload.mobileCardsPerRow, 1, 3, "mobileCardsPerRow"),
    sortOrder: Number.isFinite(Number(payload.sortOrder)) ? Math.floor(Number(payload.sortOrder)) : fallback.sortOrder
  };
}

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

export async function getAdminBrowseCategoriesSettings(_request, response) {
  const storedSettings = await readStoredSettings();
  const settings = mergeSettings(DEFAULT_APP_SETTINGS, storedSettings || {});

  response.json({
    success: true,
    data: settings.homepage.browseCategoriesSettings
  });
}

export async function getAdminHomepageSectionSettings(request, response) {
  const settingsKey = getHomepageSectionSettingsKey(request.params.sectionKey);
  const storedSettings = await readStoredSettings();
  const settings = mergeSettings(DEFAULT_APP_SETTINGS, storedSettings || {});

  response.json({
    success: true,
    data: settings.homepage[settingsKey]
  });
}

export async function updateAdminHomepageSectionSettings(request, response) {
  const settingsKey = getHomepageSectionSettingsKey(request.params.sectionKey);
  const storedSettings = await readStoredSettings();
  const currentSettings = mergeSettings(DEFAULT_APP_SETTINGS, storedSettings || {});
  const sectionSettings = settingsKey === "browseCategoriesSettings"
    ? normalizeBrowseCategoriesSettings(request.body || {})
    : normalizeHomepageSectionSettings(request.body || {}, DEFAULT_APP_SETTINGS.homepage[settingsKey]);
  const settings = mergeSettings(currentSettings, {
    homepage: {
      ...(currentSettings.homepage || {}),
      [settingsKey]: sectionSettings,
      ...(settingsKey === "browseCategoriesSettings" ? { browseCategoryCardCount: sectionSettings.cardsPerRow } : {})
    }
  });

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
    message: "Homepage section settings saved successfully",
    data: sectionSettings
  });
}

export async function updateAdminBrowseCategoriesSettings(request, response) {
  const storedSettings = await readStoredSettings();
  const currentSettings = mergeSettings(DEFAULT_APP_SETTINGS, storedSettings || {});
  const browseCategoriesSettings = normalizeBrowseCategoriesSettings(request.body || {});
  const settings = mergeSettings(currentSettings, {
    homepage: {
      ...(currentSettings.homepage || {}),
      browseCategoriesSettings,
      browseCategoryCardCount: browseCategoriesSettings.cardsPerRow
    }
  });

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
    message: "Browse Categories settings saved successfully",
    data: browseCategoriesSettings
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

export async function getPublicBrowseCategoriesSettings(_request, response) {
  const storedSettings = await readStoredSettings();
  const settings = mergeSettings(DEFAULT_APP_SETTINGS, storedSettings || {});
  const publicSettings = getPublicSettings(settings);

  response.json({
    success: true,
    data: publicSettings.homepage.browseCategoriesSettings
  });
}

export async function getPublicHomepageSectionSettings(request, response) {
  const settingsKey = getHomepageSectionSettingsKey(request.params.sectionKey);
  const storedSettings = await readStoredSettings();
  const settings = mergeSettings(DEFAULT_APP_SETTINGS, storedSettings || {});
  const publicSettings = getPublicSettings(settings);

  response.json({
    success: true,
    data: publicSettings.homepage[settingsKey]
  });
}
