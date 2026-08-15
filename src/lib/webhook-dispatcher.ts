import { db } from "./db";
import { signPayload } from "./webhook-signer";

export interface WebhookDispatchOptions {
  userId: string;
  transactionId?: string;
  endpoint: string;
  secret: string;
  event: string;
  data: Record<string, unknown>;
}

export async function dispatchWebhook(options: WebhookDispatchOptions) {
  const { userId, transactionId, endpoint, secret, event, data } = options;

  if (!endpoint || !endpoint.startsWith("http")) {
    return {
      success: false,
      error: "Invalid or missing webhook endpoint",
    };
  }

  const payload = {
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  const payloadString = JSON.stringify(payload);
  const signature = signPayload(payloadString, secret);

  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let isSuccess = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BirrRelay-Webhook-Dispatcher/1.0",
        "X-BirrRelay-Signature": signature,
        "X-BirrRelay-Event": event,
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    responseStatus = res.status;
    const text = await res.text();
    responseBody = text.slice(0, 1000); // Truncate body for safety
    isSuccess = res.ok;
  } catch (err: unknown) {
    const error = err as Error;
    responseBody = error.message || "Network request failed / timeout";
    responseStatus = 500;
    isSuccess = false;
  }

  // Save log in database
  const log = await db.webhookLog.create({
    data: {
      userId,
      transactionId,
      endpoint,
      requestPayload: payloadString,
      responseStatus,
      responseBody,
      isSuccess,
      attempts: 1,
    },
  });

  return {
    success: isSuccess,
    status: responseStatus,
    logId: log.id,
  };
}
