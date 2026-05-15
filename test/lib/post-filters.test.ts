import {
  CONTENT_FILTER_VALUES,
  TIME_FILTER_VALUES,
  parsePostContentFilter,
  parsePostTimeFilter,
} from "../../lib/post-filters";

describe("post filters", () => {
  it("exposes supported time and content filters", () => {
    expect(TIME_FILTER_VALUES).toEqual(["all", "24h", "7d", "30d", "365d"]);
    expect(CONTENT_FILTER_VALUES).toEqual(["all", "image", "gif", "video"]);
  });

  it.each(["all", "24h", "7d", "30d", "365d"] as const)(
    "accepts valid time filter %s",
    (filter) => {
      expect(parsePostTimeFilter(filter)).toBe(filter);
    }
  );

  it.each([undefined, null, "", "1h", "weekly", "video"])(
    "falls back to all for invalid time filter %s",
    (filter) => {
      expect(parsePostTimeFilter(filter)).toBe("all");
    }
  );

  it.each(["all", "image", "gif", "video"] as const)(
    "accepts valid content filter %s",
    (filter) => {
      expect(parsePostContentFilter(filter)).toBe(filter);
    }
  );

  it.each([undefined, null, "", "audio", "24h", "images"])(
    "falls back to all for invalid content filter %s",
    (filter) => {
      expect(parsePostContentFilter(filter)).toBe("all");
    }
  );
});
