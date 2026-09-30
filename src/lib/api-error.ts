type ApiError = {
  message?: string;
  response?: { data?: unknown };
};

function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null;
}

export function extractErrorMessage(error: unknown, fallback = "An error occurred."): string {
  if (isApiError(error) && error.response?.data) {
    const data = error.response.data as { message?: string; errors?: Record<string, string[]>; title?: string } | string;
    if (typeof data === "string") return data;
    if (data.message) return data.message;
    if (data.errors && typeof data.errors === "object") {
      const messages = Object.values(data.errors).flat();
      if (messages.length > 0) return messages.join(" ");
    }
    if (data.title) return data.title;
  }
  return isApiError(error) && error.message ? error.message : fallback;
}
