import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isValidNIK, isValidScore, generateStudentUsername } from "../../src/lib/gate-checks.ts";

describe("Validasi Input & Pembuatan Kredensial Unit Tests", () => {
  describe("Validasi NIK 16 Digit", () => {
    test("NIK 16 digit numerik valid diterima", () => {
      assert.equal(isValidNIK("3273012304950001"), true);
      assert.equal(isValidNIK("1234567890123456"), true);
    });

    test("NIK kurang dari 16 digit ditolak", () => {
      assert.equal(isValidNIK("327301230495000"), false); // 15 digit
      assert.equal(isValidNIK("123"), false);
    });

    test("NIK lebih dari 16 digit ditolak", () => {
      assert.equal(isValidNIK("32730123049500019"), false); // 17 digit
    });

    test("NIK mengandung huruf atau simbol ditolak", () => {
      assert.equal(isValidNIK("327301230495000A"), false);
      assert.equal(isValidNIK("3273-0123-0495-0"), false);
    });

    test("NIK kosong atau tipe tidak valid ditolak", () => {
      assert.equal(isValidNIK(""), false);
      assert.equal(isValidNIK("   "), false);
      // @ts-expect-error testing invalid type
      assert.equal(isValidNIK(null), false);
      // @ts-expect-error testing invalid type
      assert.equal(isValidNIK(undefined), false);
    });
  });

  describe("Validasi Rentang Nilai (0 - 100 Integer)", () => {
    test("Nilai batas minimum 0 dan maksimum 100 valid", () => {
      assert.equal(isValidScore(0), true);
      assert.equal(isValidScore(100), true);
      assert.equal(isValidScore(80), true);
    });

    test("Nilai di bawah 0 atau di atas 100 ditolak", () => {
      assert.equal(isValidScore(-1), false);
      assert.equal(isValidScore(-10), false);
      assert.equal(isValidScore(101), false);
      assert.equal(isValidScore(999), false);
    });

    test("Nilai non-angka atau NaN ditolak", () => {
      assert.equal(isValidScore(NaN), false);
      assert.equal(isValidScore("80"), false);
      assert.equal(isValidScore(null), false);
      assert.equal(isValidScore(undefined), false);
    });

    test("Nilai pecahan desimal ditolak jika sistem mewajibkan integer", () => {
      assert.equal(isValidScore(85.5), false);
    });
  });

  describe("Auto-Generation Username Akun Siswa", () => {
    test("Username menggunakan nama depan huruf kecil dan format @2digit", () => {
      const username = generateStudentUsername("Budi Santoso", 42);
      assert.equal(username, "budi@42");
    });

    test("Username membersihkan karakter khusus dan spasi", () => {
      const username = generateStudentUsername("M. Rasyid Al-Farizi", 19);
      assert.equal(username, "m@19");
    });

    test("Username acak tetap menghasilkan 2 digit angka di belakang @", () => {
      const username = generateStudentUsername("Siti Aminah");
      assert.ok(/^siti@\d{2}$/.test(username), `Username dihasilkan: ${username}`);
    });

    test("Jika nama depan kosong atau aneh, gunakan fallback 'siswa'", () => {
      const username = generateStudentUsername("---", 77);
      assert.equal(username, "siswa@77");
    });
  });
});
