import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkDuplicatePayment } from "../../src/lib/idempotency.ts";
import { logAuditEvent } from "../../src/lib/audit.ts";

describe("Idempotency Guard Unit Tests", () => {
  test("checkDuplicatePayment mendeteksi transaksi duplikat dalam jeda threshold", async () => {
    const mockTxId = "tx-12345";
    const mockSupabase: any = {
      from: (table: string) => {
        assert.equal(table, "transaksi_keuangan");
        const builder: any = {
          select: () => builder,
          eq: (field: string, val: any) => {
            if (field === "siswa_id") assert.equal(val, "siswa-1");
            if (field === "nominal") assert.equal(val, 500000);
            if (field === "tgl_bayar") assert.equal(val, "2026-10-07");
            return builder;
          },
          gte: () => builder,
          order: () => builder,
          limit: () => builder,
          maybeSingle: async () => ({
            data: { id: mockTxId, created_at: new Date().toISOString() },
            error: null,
          }),
        };
        return builder;
      },
    };

    const res = await checkDuplicatePayment(mockSupabase, {
      siswaId: "siswa-1",
      nominal: 500000,
      tglBayar: "2026-10-07",
      thresholdSeconds: 5,
    });

    assert.equal(res.isDuplicate, true);
    assert.equal(res.existingId, mockTxId);
  });

  test("checkDuplicatePayment mengizinkan transaksi jika tidak ada duplikat", async () => {
    const mockSupabase: any = {
      from: () => {
        const builder: any = {
          select: () => builder,
          eq: () => builder,
          gte: () => builder,
          order: () => builder,
          limit: () => builder,
          maybeSingle: async () => ({
            data: null,
            error: null,
          }),
        };
        return builder;
      },
    };

    const res = await checkDuplicatePayment(mockSupabase, {
      siswaId: "siswa-2",
      nominal: 1000000,
      tglBayar: "2026-10-07",
    });

    assert.equal(res.isDuplicate, false);
    assert.equal(res.existingId, undefined);
  });
});

describe("Audit Trail Logger Unit Tests", () => {
  test("logAuditEvent menyimpan data log ke tabel audit_log dengan benar", async () => {
    let insertedRow: any = null;
    const mockSupabase: any = {
      from: (table: string) => {
        assert.equal(table, "audit_log");
        return {
          insert: async (row: any) => {
            insertedRow = row;
            return { error: null };
          },
        };
      },
    };

    await logAuditEvent(mockSupabase, {
      actorId: "admin-uuid",
      actorRole: "superadmin",
      action: "KEUANGAN_INSERT",
      targetTable: "transaksi_keuangan",
      targetId: "tx-999",
      details: { nominal: 750000 },
      ipAddress: "127.0.0.1",
    });

    assert.ok(insertedRow);
    assert.equal(insertedRow.actor_id, "admin-uuid");
    assert.equal(insertedRow.actor_role, "superadmin");
    assert.equal(insertedRow.action, "KEUANGAN_INSERT");
    assert.equal(insertedRow.target_table, "transaksi_keuangan");
    assert.equal(insertedRow.target_id, "tx-999");
    assert.deepEqual(insertedRow.details, { nominal: 750000 });
    assert.equal(insertedRow.ip_address, "127.0.0.1");
  });

  test("logAuditEvent fail-safe dan tidak melempar exception bila insert gagal", async () => {
    const mockSupabase: any = {
      from: () => ({
        insert: async () => {
          throw new Error("Database connection lost");
        },
      }),
    };

    // Tidak boleh throw error
    await assert.doesNotReject(async () => {
      await logAuditEvent(mockSupabase, {
        actorRole: "system",
        action: "TEST_ACTION",
      });
    });
  });
});
