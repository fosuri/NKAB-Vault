import {
  CONTENT_FILTER_VALUES,
  TIME_FILTER_VALUES,
  parsePostContentFilter,
  parsePostTimeFilter,
} from "../../lib/post-filters";

describe("post filters", () => {
  // Checks that the predefined lists of available filters remain correct.
  it("exposes supported time and content filters", () => {
    expect(TIME_FILTER_VALUES).toEqual(["all", "24h", "7d", "30d", "365d"]);
    expect(CONTENT_FILTER_VALUES).toEqual(["all", "image", "gif", "video"]);
  });

  // Confirms that valid time ranges (like "24h" or "7d") are accepted as-is.
  it.each(["all", "24h", "7d", "30d", "365d"] as const)(
    "accepts valid time filter %s",
    (filter) => {
      expect(parsePostTimeFilter(filter)).toBe(filter);
    }
  );

  // Protects against invalid time inputs by defaulting to "all time".
  it.each([undefined, null, "", "1h", "weekly", "video"])(
    "falls back to all for invalid time filter %s",
    (filter) => {
      expect(parsePostTimeFilter(filter)).toBe("all");
    }
  );

  // Confirms that valid content filters (like "image" or "video") are accepted as-is.
  it.each(["all", "image", "gif", "video"] as const)(
    "accepts valid content filter %s",
    (filter) => {
      expect(parsePostContentFilter(filter)).toBe(filter);
    }
  );

  // Protects against invalid content inputs by defaulting to "all content".
  it.each([undefined, null, "", "audio", "24h", "images"])(
    "falls back to all for invalid content filter %s",
    (filter) => {
      expect(parsePostContentFilter(filter)).toBe("all");
    }
  );
});
