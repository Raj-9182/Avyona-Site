import {
  getApiMediaOrigin,
  resolveMediaUrl,
  stripApiMediaOrigin,
  toStoredMediaPath
} from "../../../shared/mediaUrl.js";

const API_MEDIA_ORIGIN = getApiMediaOrigin(import.meta.env?.VITE_API_BASE_URL || "http://localhost:4000/api/v1");

export function getDashboardMediaPreviewUrl(value) {
  return resolveMediaUrl(value, API_MEDIA_ORIGIN);
}

export function getStoredMediaPath(value) {
  return toStoredMediaPath(value, API_MEDIA_ORIGIN);
}

export { API_MEDIA_ORIGIN, getApiMediaOrigin, resolveMediaUrl, stripApiMediaOrigin, toStoredMediaPath };
