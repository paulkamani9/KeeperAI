import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn utility", () => {
  it("should merge class names correctly", () => {
    const result = cn("base-class", "additional-class");
    expect(result).toBe("base-class additional-class");
  });

  it("should handle conditional classes", () => {
    const result = cn(
      "base-class",
      true && "conditional-class",
      false && "hidden-class"
    );
    expect(result).toBe("base-class conditional-class");
  });

  it("should handle undefined and null values", () => {
    const result = cn("base-class", undefined, null, "final-class");
    expect(result).toBe("base-class final-class");
  });

  it("should merge conflicting tailwind classes properly", () => {
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });
});
