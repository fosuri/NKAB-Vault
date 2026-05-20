import { cn } from "../../lib/utils";

describe("cn", () => {
  // Checks that UI class names are safely combined even if some conditions are false.
  it("joins conditional class names", () => {
    expect(cn("base", false && "hidden", ["p-2", { block: true }])).toBe("base p-2 block");
  });

  // Ensures that if two styling rules conflict, the last applied rule wins (e.g. padding).
  it("resolves conflicting Tailwind classes with the later value winning", () => {
    expect(cn("px-2 py-1", "px-4", "text-sm text-lg")).toBe("py-1 px-4 text-lg");
  });
});
