import {
  buildAnalyticsEventPayload,
  writeRawAnalyticsEvent
} from "../services/analyticsPipeline.js";

export async function trackAnalyticsEvent(request, response) {
  const payload = await buildAnalyticsEventPayload(request);
  const rawEvent = await writeRawAnalyticsEvent(payload);

  response.status(202).json({ success: true, eventId: rawEvent.id });
}

export async function queueAnalyticsEvent(request, response) {
  return trackAnalyticsEvent(request, response);
}
