import { describe, it, expect } from "vitest";
import { isAuthorizedDomain } from "./authDomain";

describe("isAuthorizedDomain", () => {
  it("accepts an exact domain match", () => {
    expect(isAuthorizedDomain("jack@ossastudio.com", "ossastudio.com")).toBe(true);
  });

  it("is case-insensitive on both the email and the allowed domain", () => {
    expect(isAuthorizedDomain("Jack@OssaStudio.com", "ossastudio.com")).toBe(true);
    expect(isAuthorizedDomain("jack@ossastudio.com", "OssaStudio.com")).toBe(true);
  });

  it("rejects a different domain", () => {
    expect(isAuthorizedDomain("jack@gmail.com", "ossastudio.com")).toBe(false);
  });

  it("rejects a subdomain of the allowed domain (exact match only)", () => {
    expect(isAuthorizedDomain("jack@mail.ossastudio.com", "ossastudio.com")).toBe(false);
  });

  it("rejects null, undefined, or empty email", () => {
    expect(isAuthorizedDomain(null, "ossastudio.com")).toBe(false);
    expect(isAuthorizedDomain(undefined, "ossastudio.com")).toBe(false);
    expect(isAuthorizedDomain("", "ossastudio.com")).toBe(false);
  });

  it("rejects a malformed email with no @", () => {
    expect(isAuthorizedDomain("not-an-email", "ossastudio.com")).toBe(false);
  });
});
