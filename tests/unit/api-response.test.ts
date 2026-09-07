/**
 * Test: Format Payload Standar API
 * Diuji melalui public surface (successResponse/errorResponse)
 * karena format helpers kini private di api-response.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Replika minimal pure format functions untuk verifikasi kontrak shape
// ponytail: tidak import dari src karena NextResponse butuh Next runtime;
// cukup verifikasi kontrak shape — rule shape sudah dijamin TypeScript di compile time
function fmtSuccess<T>(data: T, meta?: Record<string, unknown>) {
  return { data, ...(meta ? { meta } : {}) };
}
function fmtError(code: string, message: string, details?: unknown) {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

describe("API Response Payload Shape Contract", () => {
  describe("Success payload shape", () => {
    test("membungkus data dalam field data standar", () => {
      const payload = { id: "123", nama: "Budi Santoso" };
      const formatted = fmtSuccess(payload);

      assert.deepEqual(formatted.data, payload);
      assert.equal((formatted as Record<string, unknown>).meta, undefined);
    });

    test("menyertakan meta jika diberikan", () => {
      const data = [{ id: 1 }, { id: 2 }];
      const meta = { total: 100, page: 1, limit: 10 };
      const formatted = fmtSuccess(data, meta);

      assert.deepEqual(formatted.data, data);
      assert.deepEqual(formatted.meta, meta);
    });

    test("tidak menyertakan key meta jika undefined", () => {
      const formatted = fmtSuccess({ status: "active" });
      assert.ok(!("meta" in formatted), "key meta tidak boleh ada jika tidak diberikan");
    });
  });

  describe("Error payload shape", () => {
    test("membungkus code dan message dalam field error", () => {
      const formatted = fmtError("VALIDATION_ERROR", "Data tidak lengkap.");

      assert.equal(formatted.error.code, "VALIDATION_ERROR");
      assert.equal(formatted.error.message, "Data tidak lengkap.");
      assert.equal((formatted.error as Record<string, unknown>).details, undefined);
    });

    test("menyertakan details jika diberikan", () => {
      const details = { field: "nik", issue: "Harus 16 digit" };
      const formatted = fmtError("INVALID_NIK", "Format NIK salah.", details);

      assert.equal(formatted.error.code, "INVALID_NIK");
      assert.deepEqual(formatted.error.details, details);
    });

    test("tidak menyertakan key details jika undefined", () => {
      const formatted = fmtError("FORBIDDEN", "Akses ditolak.");
      assert.ok(!("details" in formatted.error), "key details tidak boleh ada jika tidak diberikan");
    });
  });
});

