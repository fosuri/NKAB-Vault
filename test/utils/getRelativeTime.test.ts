import { getRelativeTime } from "../../utils/getRelativeTime";

describe("getRelativeTime", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-15T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ["Just now", "2026-05-15T11:59:31.000Z"],
    ["1 minute ago", "2026-05-15T11:58:30.000Z"],
    ["5 minutes ago", "2026-05-15T11:55:00.000Z"],
    ["1 hour ago", "2026-05-15T10:30:00.000Z"],
    ["3 hours ago", "2026-05-15T09:00:00.000Z"],
    ["1 day ago", "2026-05-14T11:00:00.000Z"],
    ["6 days ago", "2026-05-09T12:00:00.000Z"],
    ["1 week ago", "2026-05-05T12:00:00.000Z"],
    ["3 weeks ago", "2026-04-18T12:00:00.000Z"],
    ["1 month ago", "2026-04-05T12:00:00.000Z"],
    ["11 months ago", "2025-06-19T12:00:00.000Z"],
    ["1 year ago", "2025-04-10T12:00:00.000Z"],
    ["2 years ago", "2024-04-05T12:00:00.000Z"],
  ])("returns %s", (expected, input) => {
    expect(getRelativeTime(new Date(input))).toBe(expected);
  });
});
