import { getActualPassword, protectPassword, verifyPostPassword } from "../../lib/post-password";

describe("post password protection", () => {
  const originalEnv = process.env.POST_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.POST_ENCRYPTION_KEY = "test-encryption-secret";
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.POST_ENCRYPTION_KEY;
    } else {
      process.env.POST_ENCRYPTION_KEY = originalEnv;
    }
  });

  it("stores an encrypted bundle and can recover the original password", async () => {
    const stored = await protectPassword("correct horse battery staple");
    const parsed = JSON.parse(stored);

    expect(parsed).toEqual({
      hash: expect.any(String),
      encrypted: expect.any(String),
      iv: expect.any(String),
      authTag: expect.any(String),
    });
    expect(stored).not.toContain("correct horse battery staple");
    expect(getActualPassword(stored)).toBe("correct horse battery staple");
  });

  it("verifies a protected password with Argon2", async () => {
    const stored = await protectPassword("vault-password");

    await expect(verifyPostPassword("vault-password", stored)).resolves.toBe(true);
    await expect(verifyPostPassword("wrong-password", stored)).resolves.toBe(false);
  });

  it("supports legacy plain-text passwords", async () => {
    expect(getActualPassword("legacy-password")).toBe("legacy-password");
    await expect(verifyPostPassword("legacy-password", "legacy-password")).resolves.toBe(true);
    await expect(verifyPostPassword("wrong-password", "legacy-password")).resolves.toBe(false);
  });

  it("handles missing stored values safely", async () => {
    expect(getActualPassword(null)).toBeNull();
    await expect(verifyPostPassword("anything", null)).resolves.toBe(false);
  });
});
