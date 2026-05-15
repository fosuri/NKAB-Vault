import { cn } from "../../lib/utils";

describe("cn", () => {
  it("joins conditional class names", () => {
    expect(cn("base", false && "hidden", ["p-2", { block: true }])).toBe("base p-2 block");
  });

  it("resolves conflicting Tailwind classes with the later value winning", () => {
    expect(cn("px-2 py-1", "px-4", "text-sm text-lg")).toBe("py-1 px-4 text-lg");
  });
});
