import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractSequenceNumber, getNextNomorInduk } from "../../src/lib/nomor-induk.ts";

describe("Nomor Induk & Auto-sequence Generator Unit Tests", () => {
  describe("extractSequenceNumber()", () => {
    it("mengekstrak urutan angka dari format standar '03.1148'", () => {
      assert.equal(extractSequenceNumber("03.1148"), 1148);
    });

    it("mengekstrak urutan angka dari format dengan spasi '03. 1149'", () => {
      assert.equal(extractSequenceNumber("03. 1149"), 1149);
    });

    it("mengekstrak urutan angka dari format warisan dengan nama '01.1110—Askuri'", () => {
      assert.equal(extractSequenceNumber("01.1110—Askuri"), 1110);
    });

    it("mengekstrak urutan angka dari format satu digit kode '3.1150'", () => {
      assert.equal(extractSequenceNumber("3.1150"), 1150);
    });

    it("mengekstrak angka nol di depan '01.0042' menjadi integer 42", () => {
      assert.equal(extractSequenceNumber("01.0042"), 42);
    });

    it("mengekstrak angka murni '1152' menjadi 1152", () => {
      assert.equal(extractSequenceNumber("1152"), 1152);
    });

    it("mengembalikan 0 untuk null, undefined, string kosong, atau teks tanpa angka", () => {
      assert.equal(extractSequenceNumber(null), 0);
      assert.equal(extractSequenceNumber(undefined), 0);
      assert.equal(extractSequenceNumber(""), 0);
      assert.equal(extractSequenceNumber("     "), 0);
      assert.equal(extractSequenceNumber("tidak-ada-angka"), 0);
    });
  });

  describe("getNextNomorInduk() dengan Mock Database", () => {
    it("menghasilkan 1150 setelah 1148 dan 1149 (mencegah duplikasi 1148/1149)", async () => {
      const mockProgramId = "prog-03-uuid";
      const mockProgram = { id: mockProgramId, kode_program: "03", nama: "FCAW 3G" };

      // Simulasi siswa yang ada di database, termasuk siswa dengan nomor 1148 dan 1149
      const mockSiswaList = [
        { nomor_induk: "03.0999", urutan_nomor: 999, nik: "3201010000000001", program_id: mockProgramId },
        { nomor_induk: "03.1148", urutan_nomor: 1148, nik: "ANON-031148-0001", program_id: mockProgramId },
        { nomor_induk: "03.1149", urutan_nomor: 1149, nik: "3201010000000002", program_id: mockProgramId },
      ];

      const mockDb = {
        from: (table: string) => {
          if (table === "master_program") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: mockProgram, error: null }),
                }),
              }),
            };
          }
          if (table === "siswa") {
            return {
              select: () => ({
                or: () => ({
                  order: () => ({
                    limit: async () => ({
                      data: [
                        { urutan_nomor: 1149, nomor_induk: "03.1149" },
                        { urutan_nomor: 1148, nomor_induk: "03.1148" },
                      ],
                      error: null,
                    }),
                  }),
                  range: async () => ({
                    data: mockSiswaList,
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        },
        rpc: async () => ({ data: null, error: null }),
      };

      const result = await getNextNomorInduk(mockProgramId, mockDb);

      assert.equal(result.kode_program, "03");
      assert.equal(result.max_sequence, 1149);
      assert.equal(result.next_no_urut, "1150");
      assert.equal(result.next_nomor_induk, "03.1150");
    });

    it("tidak terbalik oleh string comparison (03.999 tidak mengalahkan 03.1148)", async () => {
      const mockProgramId = "prog-03-uuid";
      const mockProgram = { id: mockProgramId, kode_program: "03", nama: "FCAW 3G" };

      // Dalam string comparison: '03.999' > '03.1148' karena karakter '9' > '1'
      // Logika getNextNomorInduk harus membandingkan secara numerik (1148 > 999)
      const mockSiswaList = [
        { nomor_induk: "03.999", urutan_nomor: 999 },
        { nomor_induk: "03.1148", urutan_nomor: 1148 },
      ];

      const mockDb = {
        from: (table: string) => {
          if (table === "master_program") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: mockProgram, error: null }),
                }),
              }),
            };
          }
          if (table === "siswa") {
            return {
              select: () => ({
                or: () => ({
                  order: () => ({
                    limit: async () => ({ data: [], error: null }),
                  }),
                  range: async () => ({ data: mockSiswaList, error: null }),
                }),
              }),
            };
          }
          return {};
        },
        rpc: async () => ({ data: null, error: null }),
      };

      const result = await getNextNomorInduk(mockProgramId, mockDb);

      assert.equal(result.max_sequence, 1148);
      assert.equal(result.next_no_urut, "1149");
      assert.equal(result.next_nomor_induk, "03.1149");
    });

    it("tidak mengabaikan siswa anonim / arsip excel NIK ANON-%", async () => {
      const mockProgramId = "prog-01-uuid";
      const mockProgram = { id: mockProgramId, kode_program: "01", nama: "SMAW 6G" };

      // Siswa tertinggi adalah siswa impor dengan NIK ANON-
      const mockSiswaList = [
        { nomor_induk: "01.1147", urutan_nomor: 1147, nik: "3201011111111111" },
        { nomor_induk: "01.1148", urutan_nomor: null, nik: "ANON-011148-0001" }, // urutan_nomor null tapi nomor_induk ada
      ];

      const mockDb = {
        from: (table: string) => {
          if (table === "master_program") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: mockProgram, error: null }),
                }),
              }),
            };
          }
          if (table === "siswa") {
            return {
              select: () => ({
                or: () => ({
                  order: () => ({
                    limit: async () => ({ data: [{ urutan_nomor: 1147, nomor_induk: "01.1147" }], error: null }),
                  }),
                  range: async () => ({ data: mockSiswaList, error: null }),
                }),
              }),
            };
          }
          return {};
        },
        rpc: async () => ({ data: null, error: null }),
      };

      const result = await getNextNomorInduk(mockProgramId, mockDb);

      assert.equal(result.max_sequence, 1148);
      assert.equal(result.next_no_urut, "1149");
      assert.equal(result.next_nomor_induk, "01.1149");
    });
  });
});
