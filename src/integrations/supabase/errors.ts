export type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};

function asSupabaseLikeError(error: unknown): SupabaseLikeError | null {
  if (!error || typeof error !== "object") return null;
  const anyError = error as Record<string, unknown>;
  return {
    message: typeof anyError.message === "string" ? anyError.message : undefined,
    code: typeof anyError.code === "string" ? anyError.code : undefined,
    details: typeof anyError.details === "string" ? anyError.details : undefined,
    hint: typeof anyError.hint === "string" ? anyError.hint : undefined,
    status: typeof anyError.status === "number" ? anyError.status : undefined,
  };
}

export function isMissingSupabaseRelation(error: unknown, relation?: string) {
  const e = asSupabaseLikeError(error);
  if (!e) return false;

  // PostgREST commonly returns 404 + PGRST116 when a table/view isn't in the schema cache
  // (often because migrations were never applied to the project).
  if (e.code === "PGRST116") return true;
  if (e.status === 404) return true;

  const msg = (e.message ?? "").toLowerCase();
  if (msg.includes("schema cache") && msg.includes("could not find")) return true;

  if (relation) {
    const rel = relation.toLowerCase();
    if (msg.includes(rel) && msg.includes("could not find")) return true;
  }

  return false;
}

export function isMissingSupabaseRelationWithStatus(
  error: unknown,
  status: number | undefined,
  relation?: string
) {
  if (status === 404) return true;
  return isMissingSupabaseRelation(error, relation);
}

export function formatSupabaseError(
  error: unknown,
  status?: number,
  statusText?: string
): string {
  const e = asSupabaseLikeError(error);
  if (!e) {
    if (typeof status === "number") {
      return `HTTP ${status}${statusText ? ` ${statusText}` : ""}`;
    }
    return "Unknown error";
  }

  const parts = [e.message, e.details, e.hint].filter(Boolean);
  const msg = parts.join(" — ") || "Unknown error";
  if (typeof status === "number") {
    return `HTTP ${status}${statusText ? ` ${statusText}` : ""} — ${msg}`;
  }
  return msg;
}
