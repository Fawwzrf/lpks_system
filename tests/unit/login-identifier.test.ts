import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveLoginCandidateEmails } from "../../src/lib/gate-checks.ts";

describe("Login Identifier & Candidate Email Resolver Unit Tests", () => {
  test("Memetakan username standar budi@0001 ke budi0001@lpks.id dan budi.0001@lpks.id", () => {
    const candidates = resolveLoginCandidateEmails("budi@0001");
    assert.ok(candidates.includes("budi0001@lpks.id"));
    assert.ok(candidates.includes("budi.0001@lpks.id"));
  });

  test("Memetakan username dengan nomor induk bertitik budi@01.0005", () => {
    const candidates = resolveLoginCandidateEmails("budi@01.0005");
    // Harus mencakup urutan belakang (0005) dan nomor lengkap (010005)
    assert.ok(candidates.includes("budi0005@lpks.id"));
    assert.ok(candidates.includes("budi.0005@lpks.id"));
    assert.ok(candidates.includes("budi010005@lpks.id"));
  });

  test("Memetakan nomor induk langsung 01.0005", () => {
    const candidates = resolveLoginCandidateEmails("01.0005");
    assert.ok(candidates.includes("010005@lpks.id"));
    assert.ok(candidates.includes("siswa0005@lpks.id"));
  });

  test("Memetakan email resmi/admin langsung dan mempertahankan formatnya", () => {
    const candidates = resolveLoginCandidateEmails("admin@sumbuhidup.com");
    assert.equal(candidates[0], "admin@sumbuhidup.com");
  });

  test("Memetakan email siswa pribadi budi.santoso@gmail.com", () => {
    const candidates = resolveLoginCandidateEmails("budi.santoso@gmail.com");
    assert.ok(candidates.includes("budi.santoso@gmail.com"));
  });

  test("Menghapus sufiks @lpks.id jika user mengetikkan domain lengkap", () => {
    const candidates = resolveLoginCandidateEmails("budi0001@lpks.id");
    assert.ok(candidates.includes("budi0001@lpks.id"));
  });

  test("Menangani input kosong atau invalid dengan aman tanpa error", () => {
    // @ts-expect-error testing invalid type
    assert.deepEqual(resolveLoginCandidateEmails(null), []);
    // @ts-expect-error testing invalid type
    assert.deepEqual(resolveLoginCandidateEmails(undefined), []);
    assert.deepEqual(resolveLoginCandidateEmails(""), []);
  });
});
