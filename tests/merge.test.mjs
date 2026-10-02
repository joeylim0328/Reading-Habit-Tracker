// tests/merge.test.mjs: unit tests for mergeStates(). Run with: node --test
import { test } from "node:test";
import assert from "node:assert/strict";

// storage.js reads localStorage when it loads, so give Node a fake one first
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const { mergeStates } = await import("../js/storage.js");

const book = (id, updatedAt, extra = {}) => ({
  id, title: `Book ${id}`, author: "", totalPages: 100,
  createdAt: updatedAt, updatedAt, deleted: false, ...extra,
});
const entry = (id, updatedAt, extra = {}) => ({
  id, bookId: "a", date: "2026-10-01", pages: 10,
  createdAt: updatedAt, updatedAt, deleted: false, ...extra,
});
const state = (books, entries = []) => ({ schemaVersion: 1, books, entries });
const ids = (records) => records.map((r) => r.id).sort();

const TEN = "2026-10-02T10:00:00.000Z";
const ELEVEN = "2026-10-02T11:00:00.000Z";

test("keeps records that exist on only one side", () => {
  const merged = mergeStates(state([book("a", TEN)]), state([book("b", TEN)]));
  assert.deepEqual(ids(merged.books), ["a", "b"]);
});

test("newer edit wins when the other side is newer", () => {
  const phone = state([book("a", TEN, { title: "Old title" })]);
  const drive = state([book("a", ELEVEN, { title: "New title" })]);
  assert.equal(mergeStates(phone, drive).books[0].title, "New title");
});

test("newer edit wins when this side is newer", () => {
  const phone = state([book("a", ELEVEN, { title: "New title" })]);
  const drive = state([book("a", TEN, { title: "Old title" })]);
  assert.equal(mergeStates(phone, drive).books[0].title, "New title");
});

test("a newer delete wins over an older edit", () => {
  const phone = state([book("a", ELEVEN, { deleted: true })]);
  const drive = state([book("a", TEN)]);
  assert.equal(mergeStates(phone, drive).books[0].deleted, true);
});

test("the order of the two sides doesn't matter", () => {
  const phone = state([book("a", ELEVEN, { title: "New" }), book("b", TEN)]);
  const drive = state([book("a", TEN, { title: "Old" }), book("c", TEN)]);
  const one = mergeStates(phone, drive);
  const two = mergeStates(drive, phone);
  assert.deepEqual(ids(one.books), ids(two.books));
  assert.equal(one.books.find((b) => b.id === "a").title, "New");
  assert.equal(two.books.find((b) => b.id === "a").title, "New");
});

test("entries are merged the same way", () => {
  const phone = state([], [entry("e1", TEN), entry("e2", ELEVEN, { pages: 50 })]);
  const drive = state([], [entry("e2", TEN, { pages: 5 }), entry("e3", TEN)]);
  const merged = mergeStates(phone, drive);
  assert.deepEqual(ids(merged.entries), ["e1", "e2", "e3"]);
  assert.equal(merged.entries.find((e) => e.id === "e2").pages, 50);
});
