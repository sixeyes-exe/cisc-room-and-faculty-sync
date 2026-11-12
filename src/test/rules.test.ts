import { describe, expect, it } from "vitest";
import { bumpedByFaculty, canApproveStudent, reminderTimes } from "@/lib/rules";
import type { Reservation, Room } from "@/lib/types";

const room = { id: "x", capacity: 10 } as Room;
const r = (id: string, start: number, end: number, people: number, extra: Partial<Reservation> = {}): Reservation => ({ id, roomId: "x", date: "2026-11-12", start, end, people, requester: id, role: "student", purpose: "", status: "approved", ...extra });

describe("reservation rules", () => {
  it("blocks a student request that would exceed capacity across partial overlaps", () => {
    const list = [r("a", 600, 720, 6), r("new", 660, 780, 5, { status: "pending" })];
    expect(canApproveStudent(list[1]!, room, list)).toBe(false);
  });
  it("allows overlapping student requests within capacity", () => {
    const list = [r("a", 600, 720, 6), r("new", 660, 780, 4, { status: "pending" })];
    expect(canApproveStudent(list[1]!, room, list)).toBe(true);
  });
  it("faculty reservation cancels overlapping approved student reservations", () => {
    const f = r("f", 630, 690, 30, { role: "faculty", status: "pending" });
    expect(bumpedByFaculty(f, [r("a", 600, 720, 6), r("b", 720, 800, 3), f]).map((x) => x.id)).toEqual(["a"]);
  });
  it("reminders 10 and 5 minutes before a 12:00 end", () => {
    expect(reminderTimes(720)).toEqual([710, 715]);
  });
});
