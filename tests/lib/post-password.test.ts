import {
  consumeOneTimePostAccessToken,
  createOneTimePostAccessToken,
  getActualPassword,
  protectPassword,
  verifyPostPassword,
} from "../../lib/post-password";

describe("post password protection", () => {
  const originalEnv = process.env.BETTER_AUTH_SECRET;

  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = "test-encryption-secret";
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.BETTER_AUTH_SECRET;
    } else {
      process.env.BETTER_AUTH_SECRET = originalEnv;
    }
  });

  // Verifies that passwords are securely hashed before storage, and cannot be easily read.
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

  // Checks that an entered password correctly unlocks the vault if it matches the hash.
  it("verifies a protected password with Argon2", async () => {
    const stored = await protectPassword("vault-password");

    await expect(verifyPostPassword("vault-password", stored)).resolves.toBe(true);
    await expect(verifyPostPassword("wrong-password", stored)).resolves.toBe(false);
  });

  // Ensures compatibility with older posts that had their passwords saved in plain-text.
  it("supports legacy plain-text passwords", async () => {
    expect(getActualPassword("legacy-password")).toBe("legacy-password");
    await expect(verifyPostPassword("legacy-password", "legacy-password")).resolves.toBe(true);
    await expect(verifyPostPassword("wrong-password", "legacy-password")).resolves.toBe(false);
  });

  // Handles cases where a locked post somehow has no password stored.
  it("handles missing stored values safely", async () => {
    expect(getActualPassword(null)).toBeNull();
    await expect(verifyPostPassword("anything", null)).resolves.toBe(false);
  });

  it("creates post access tokens that can only be consumed once", () => {
    const storedPassword = "hashed-password-bundle";
    const token = createOneTimePostAccessToken("post-1", storedPassword);

    expect(consumeOneTimePostAccessToken("post-1", storedPassword, token)).toBe(true);
    expect(consumeOneTimePostAccessToken("post-1", storedPassword, token)).toBe(false);
  });
});
