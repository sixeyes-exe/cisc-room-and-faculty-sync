import type { CalendarEvent, ClassSchedule, Day, Reservation, Room } from "./types";

export const DAYS: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export function dayOf(date: string): Day | null {
  const d = new Date(date + "T00:00:00").getDay();
  return d === 0 ? null : DAYS[d - 1];
}

export function fmtTime(m: number) {
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${mm} ${ap}`;
}

export function parseTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Returns why a room can't be used in the window (class or published event), or null. */
export function blockReason(
  roomId: string,
  date: string,
  start: number,
  end: number,
  schedules: ClassSchedule[],
  events: CalendarEvent[],
): string | null {
  for (const e of events) {
    if (e.status !== "published" || e.date !== date) continue;
    if (!overlaps(start, end, e.start, e.end)) continue;
    if (e.scope === "all" || e.roomIds.includes(roomId)) return `${e.title} (${e.kind})`;
  }
  const day = dayOf(date);
  for (const s of schedules) {
    if (s.status !== "official" || s.roomId !== roomId || s.day !== day) continue;
    if (overlaps(start, end, s.start, s.end)) return `Class: ${s.course} ${s.section}`;
  }
  return null;
}

/** Peak number of people from approved student reservations at any moment in the window. */
export function peakOccupancy(
  roomId: string,
  date: string,
  start: number,
  end: number,
  reservations: Reservation[],
  excludeId?: string,
) {
  const rel = reservations.filter(
    (r) =>
      r.id !== excludeId &&
      r.roomId === roomId &&
      r.date === date &&
      r.status === "approved" &&
      r.role === "student" &&
      overlaps(start, end, r.start, r.end),
  );
  const points = [start, ...rel.map((r) => Math.max(r.start, start))];
  let peak = 0;
  for (const p of points) {
    const sum = rel.filter((r) => r.start <= p && p < r.end).reduce((a, r) => a + r.people, 0);
    peak = Math.max(peak, sum);
  }
  return peak;
}

export function facultyHolds(roomId: string, date: string, start: number, end: number, reservations: Reservation[], excludeId?: string) {
  return reservations.some(
    (r) => r.id !== excludeId && r.roomId === roomId && r.date === date && r.status === "approved" && r.role === "faculty" && overlaps(start, end, r.start, r.end),
  );
}

export function remainingCapacity(room: Room, date: string, start: number, end: number, reservations: Reservation[], excludeId?: string) {
  if (facultyHolds(room.id, date, start, end, reservations, excludeId)) return 0;
  return Math.max(0, room.capacity - peakOccupancy(room.id, date, start, end, reservations, excludeId));
}

/** Can this student reservation be approved without exceeding capacity? */
export function canApproveStudent(r: Reservation, room: Room, reservations: Reservation[]) {
  return r.people <= remainingCapacity(room, r.date, r.start, r.end, reservations, r.id);
}

/** Student reservations that a confirmed faculty reservation would cancel. */
export function bumpedByFaculty(r: Reservation, reservations: Reservation[]) {
  return reservations.filter(
    (x) =>
      x.id !== r.id &&
      x.role === "student" &&
      x.status === "approved" &&
      x.roomId === r.roomId &&
      x.date === r.date &&
      overlaps(r.start, r.end, x.start, x.end),
  );
}

/** Approved reservations hit by a published event. */
export function hitByEvent(e: CalendarEvent, reservations: Reservation[]) {
  return reservations.filter(
    (r) =>
      (r.status === "approved" || r.status === "pending") &&
      r.date === e.date &&
      overlaps(e.start, e.end, r.start, r.end) &&
      (e.scope === "all" || e.roomIds.includes(r.roomId)),
  );
}

/** Reminder times: 10 and 5 minutes before the end. */
export function reminderTimes(end: number) {
  return [end - 10, end - 5];
}

export interface RoomCriteria {
  date: string;
  start: number;
  end: number;
  people: number;
  type?: string;
  equipment?: string[];
  building?: string;
  accessible?: boolean;
}

export interface RankedRoom {
  room: Room;
  remaining: number;
  available: boolean;
  reason: string | null;
  score: number;
}

export function rankRooms(
  rooms: Room[],
  c: RoomCriteria,
  schedules: ClassSchedule[],
  events: CalendarEvent[],
  reservations: Reservation[],
): RankedRoom[] {
  return rooms
    .filter((r) => (!c.type || r.type === c.type) && (!c.building || r.building === c.building) && (!c.accessible || r.accessible))
    .filter((r) => (c.equipment ?? []).every((e) => r.equipment.includes(e)))
    .map((room) => {
      const reason = blockReason(room.id, c.date, c.start, c.end, schedules, events);
      const remaining = reason ? 0 : remainingCapacity(room, c.date, c.start, c.end, reservations);
      const available = !reason && remaining >= c.people;
      // prefer rooms that fit snugly (less wasted space) and have more room to spare beyond need
      const fit = available ? 100 - Math.min(80, ((room.capacity - c.people) / room.capacity) * 80) : 0;
      return { room, remaining, available, reason, score: Math.round(fit) };
    })
    .sort((a, b) => Number(b.available) - Number(a.available) || b.score - a.score);
}

export interface Conflict {
  kind: "room" | "faculty" | "section" | "capacity";
  message: string;
  ids: string[];
}

export function scheduleConflicts(schedules: ClassSchedule[], rooms: Room[]): Conflict[] {
  const out: Conflict[] = [];
  for (let i = 0; i < schedules.length; i++) {
    const a = schedules[i];
    const room = rooms.find((r) => r.id === a.roomId);
    if (room && a.classSize > room.capacity)
      out.push({ kind: "capacity", message: `${a.course} ${a.section} has ${a.classSize} students but ${room.name} seats ${room.capacity}`, ids: [a.id] });
    for (let j = i + 1; j < schedules.length; j++) {
      const b = schedules[j];
      if (a.day !== b.day || !overlaps(a.start, a.end, b.start, b.end)) continue;
      const when = `${a.day} ${fmtTime(Math.max(a.start, b.start))}`;
      if (a.roomId === b.roomId) out.push({ kind: "room", message: `${room?.name ?? a.roomId} double-booked ${when}: ${a.course} & ${b.course}`, ids: [a.id, b.id] });
      if (a.faculty === b.faculty) out.push({ kind: "faculty", message: `${a.faculty} teaches two classes ${when}`, ids: [a.id, b.id] });
      if (a.section === b.section) out.push({ kind: "section", message: `Section ${a.section} has overlapping classes ${when}`, ids: [a.id, b.id] });
    }
  }
  return out;
}

export interface SlotRequest {
  course: string;
  section: string;
  faculty: string;
  classSize: number;
  duration: number;
  roomType?: Room["type"];
  equipment?: string[];
}

export interface Suggestion {
  schedule: Omit<ClassSchedule, "id">;
  explanation: string[];
}

/** Rule-based scheduling assistant: finds the first slot with no room/faculty/section clash. */
export function suggestSlots(req: SlotRequest, rooms: Room[], schedules: ClassSchedule[], limit = 3): Suggestion[] | { missing: string[] } {
  const missing: string[] = [];
  if (!req.course.trim()) missing.push("course/subject");
  if (!req.section.trim()) missing.push("section");
  if (!req.faculty.trim()) missing.push("faculty member");
  if (!req.classSize) missing.push("class size");
  if (missing.length) return { missing };
  const candidates = rooms
    .filter((r) => r.capacity >= req.classSize && (!req.roomType || r.type === req.roomType) && (req.equipment ?? []).every((e) => r.equipment.includes(e)))
    .sort((a, b) => a.capacity - b.capacity);
  const out: Suggestion[] = [];
  for (const day of DAYS) {
    for (let start = 7 * 60 + 30; start + req.duration <= 19 * 60 + 30; start += 90) {
      const end = start + req.duration;
      const busy = schedules.filter((s) => s.day === day && overlaps(start, end, s.start, s.end));
      if (busy.some((s) => s.faculty === req.faculty || s.section === req.section)) continue;
      const room = candidates.find((r) => !busy.some((s) => s.roomId === r.id));
      if (!room) continue;
      out.push({
        schedule: { roomId: room.id, day, start, end, course: req.course, section: req.section, faculty: req.faculty, classSize: req.classSize, status: "proposed" },
        explanation: [
          `${room.name} seats ${room.capacity} for ${req.classSize} students (smallest room that fits).`,
          `${room.name} has no class on ${day} ${fmtTime(start)}–${fmtTime(end)}.`,
          `${req.faculty} and section ${req.section} are free at this time.`,
          ...(req.roomType ? [`Matches required room type: ${req.roomType}.`] : []),
        ],
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}
