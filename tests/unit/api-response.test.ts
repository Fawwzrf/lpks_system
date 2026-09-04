import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  formatSuccessPayload,
  formatErrorPayload,
  buildSuccessResponse,
  buildErrorResponse,
} from "../../src/lib/response-format.ts";

describe("API Response Standard Helpers Unit Tests", () => {
  describe("formatSuccessPayload & buildSuccessResponse", () => {
    test("Payload sukses membungkus data dalam field data standar", () => {
      const payload = { id: "123", nama: "Budi Santoso" };
      const formatted = formatSuccessPayload(payload);

      assert.deepEqual(formatted.data, payload);
      assert.equal(formatted.meta, undefined);
    });

    test("Payload sukses dengan metadata menyertakan field meta", () => {
      const data = [{ id: 1 }, { id: 2 }];
      const meta = { total: 100, page: 1, limit: 10 };
      const formatted = formatSuccessPayload(data, meta);

      assert.deepEqual(formatted.data, data);
      assert.deepEqual(formatted.meta, meta);
    });

    test("buildSuccessResponse menghasilkan HTTP Response dengan status sesuai", async () => {
      const res = buildSuccessResponse({ status: "active" }, undefined, 201);
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.deepEqual(json.data, { status: "active" });
    });
  });

  describe("formatErrorPayload & buildErrorResponse", () => {
    test("Payload error membungkus code dan message dalam field error", () => {
      const formatted = formatErrorPayload("VALIDATION_ERROR", "Data tidak lengkap.");

      assert.equal(formatted.error.code, "VALIDATION_ERROR");
      assert.equal(formatted.error.message, "Data tidak lengkap.");
      assert.equal(formatted.error.details, undefined);
    });

    test("Payload error menyertakan details jika diberikan", () => {
      const details = { field: "nik", issue: "Harus 16 digit" };
      const formatted = formatErrorPayload("INVALID_NIK", "Format NIK salah.", details);

      assert.equal(formatted.error.code, "INVALID_NIK");
      assert.deepEqual(formatted.error.details, details);
    });

    test("buildErrorResponse menghasilkan HTTP Response dengan kode error standar", async () => {
      const res = buildErrorResponse("FORBIDDEN", "Akses ditolak.", 403);
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.error.code, "FORBIDDEN");
      assert.equal(json.error.message, "Akses ditolak.");
    });
  });
});
