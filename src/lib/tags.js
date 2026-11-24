// Normalise the `tags` column of the `blogs` table into a string array.
//
// The column holds JSON text, and the routes used to read it with
// `JSON_EXTRACT(tags, '$')`. That makes MySQL hand back a JSON-typed field,
// which mysql2 v3 already parses for us - so the follow-up `JSON.parse(...)`
// received an Array, coerced it to "tag1,tag2" and threw a SyntaxError. The
// route caught it and answered 500, which is why every single blog post failed
// to load while the listing endpoint (which never touches tags) kept working.
//
// Select the column as plain `tags` and run it through here instead: this
// accepts whatever shape the driver returns and never throws.
export function parseTags(value) {
  if (value == null) return [];

  // mysql2 already parsed a JSON column for us.
  if (Array.isArray(value)) {
    return value.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim());
  }

  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim())
        : [];
    } catch {
      // Legacy rows that were saved as a plain comma-separated list.
      return raw.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }

  return [];
}

export default parseTags;
