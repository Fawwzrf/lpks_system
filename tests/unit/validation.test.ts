import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isValidNIK, isValidScore, generateStudentUsername, generateStudentPassword } from "../../src/lib/gate-checks.ts";

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

  describe("Auto-Generation Username & Password Akun Siswa", () => {
    test("Username menggunakan nama depan huruf kecil dan format @urutan no induk", () => {
      const username = generateStudentUsername("Budi Santoso", "0005");
      assert.equal(username, "budi@0005");
    });

    test("Username dapat mengekstrak urutan dari format lengkap kode.urutan", () => {
      const username = generateStudentUsername("Ahmad Fauzi", "01.0012");
      assert.equal(username, "ahmad@0012");
    });

    test("Username membersihkan karakter khusus dan spasi", () => {
      const username = generateStudentUsername("M. Rasyid Al-Farizi", "0019");
      assert.equal(username, "m@0019");
    });

    test("Jika nama depan kosong atau aneh, gunakan fallback 'siswa'", () => {
      const username = generateStudentUsername("---", "0077");
      assert.equal(username, "siswa@0077");
    });

    test("Password default disamakan dengan username siswa", () => {
      const username = generateStudentUsername("Budi Santoso", "0005");
      const password = generateStudentPassword(username);
      assert.equal(password, "budi@0005");
    });
  });
});
