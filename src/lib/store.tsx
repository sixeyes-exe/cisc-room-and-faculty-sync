import { createContext, useContext, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { bumpedByFaculty, canApproveStudent, fmtTime, hitByEvent, rankRooms, reminderTimes } from "./rules";
import { EVENTS, NOTIFICATIONS, REPORTS, RESERVATIONS, ROOMS, SCHEDULES, USERS } from "./seed";
import type { CalendarEvent, ClassSchedule, Notification, Report, Reservation, Role, Room } from "./types";

interface Store {
  role: Role;
  setRole: (r: Role) => void;
  me: string;
  rooms: Room[];
  schedules: ClassSchedule[];
  reservations: Reservation[];
  events: CalendarEvent[];
  reports: Report[];
  notifications: Notification[];
  roomName: (id: string) => string;
  requestReservation: (r: Omit<Reservation, "id" | "status" | "requester" | "role">) => void;
  cancelReservation: (id: string) => void;
  decideReservation: (id: string, approve: boolean) => void;
  addSchedules: (s: Omit<ClassSchedule, "id">[]) => void;
  updateSchedule: (id: string, patch: Partial<ClassSchedule>) => void;
  removeSchedule: (id: string) => void;
  proposeEvent: (e: Omit<CalendarEvent, "id" | "status" | "proposedBy">) => void;
  publishEvent: (id: string) => void;
  removeEvent: (id: string) => void;
  addReport: (r: Omit<Report, "id" | "status" | "date">, anonymous: boolean) => void;
  setReportStatus: (id: string, status: string) => void;
  markAllRead: () => void;
}

const Ctx = createContext<Store | null>(null);
const uid = () => Math.random().toString(36).slice(2, 9);
const now = () => "Just now";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("student");
  const [schedules, setSchedules] = useState(SCHEDULES);
  const [reservations, setReservations] = useState(RESERVATIONS);
  const [events, setEvents] = useState(EVENTS);
  const [reports, setReports] = useState(REPORTS);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const me = USERS[role].name;
  const roomName = (id: string) => ROOMS.find((r) => r.id === id)?.name ?? id;

  const notify = (list: Omit<Notification, "id" | "time" | "read">[]) =>
    setNotifications((n) => [...list.map((x) => ({ ...x, id: uid(), time: now(), read: false })), ...n]);

  const store: Store = {
    role, setRole, me, rooms: ROOMS, schedules, reservations, events, reports, notifications, roomName,
    requestReservation(r) {
      const res: Reservation = { ...r, id: uid(), status: "pending", requester: me, role: role === "faculty" ? "faculty" : "student" };
      setReservations((x) => [res, ...x]);
      toast.success("Request submitted", { description: `${roomName(r.roomId)} is pending admin approval.` });
    },
    cancelReservation(id) {
      setReservations((x) => x.map((r) => (r.id === id ? { ...r, status: "cancelled", note: "Cancelled by requester" } : r)));
      toast("Reservation cancelled");
    },
    decideReservation(id, approve) {
      const r = reservations.find((x) => x.id === id)!;
      const room = ROOMS.find((x) => x.id === r.roomId)!;
      if (!approve) {
        setReservations((x) => x.map((y) => (y.id === id ? { ...y, status: "rejected" } : y)));
        notify([{ to: r.requester, title: "Request not approved", body: `${room.name} on ${r.date} ${fmtTime(r.start)} was declined.` }]);
        toast("Request rejected");
        return;
      }
      if (r.role === "student" && !canApproveStudent(r, room, reservations)) {
        toast.error("Over capacity", { description: `Approving would exceed ${room.name}'s capacity of ${room.capacity}.` });
        return;
      }
      const bumped = r.role === "faculty" ? bumpedByFaculty(r, reservations) : [];
      setReservations((x) =>
        x.map((y) =>
          y.id === id ? { ...y, status: "approved" } : bumped.some((b) => b.id === y.id) ? { ...y, status: "cancelled", note: `Replaced by faculty reservation (${r.requester})` } : y,
        ),
      );
      const [r1, r2] = reminderTimes(r.end);
      const msgs: Omit<Notification, "id" | "time" | "read">[] = [
        { to: r.requester, title: "Reservation approved", body: `${room.name} on ${r.date}, ${fmtTime(r.start)}–${fmtTime(r.end)}. Reminders at ${fmtTime(r1)} and ${fmtTime(r2)}. Remember CLAYGO and leave on time.` },
      ];
      for (const b of bumped) {
        const alt = rankRooms(ROOMS.filter((x) => x.id !== b.roomId), { date: b.date, start: b.start, end: b.end, people: b.people }, schedules, events, reservations).filter((x) => x.available).slice(0, 2).map((x) => x.room.name);
        msgs.push({ to: b.requester, title: "Reservation cancelled — faculty priority", body: `Your ${room.name} booking (${fmtTime(b.start)}–${fmtTime(b.end)}) was cancelled for a higher-priority faculty reservation.${alt.length ? ` Try: ${alt.join(", ")}.` : ""}` });
      }
      notify(msgs);
      toast.success("Reservation approved", { description: bumped.length ? `${bumped.length} student reservation(s) cancelled and notified.` : undefined });
    },
    addSchedules(list) {
      setSchedules((x) => [...x, ...list.map((s) => ({ ...s, id: uid() }))]);
    },
    updateSchedule(id, patch) {
      setSchedules((x) => x.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    },
    removeSchedule(id) {
      setSchedules((x) => x.filter((s) => s.id !== id));
    },
    proposeEvent(e) {
      const isAdmin = role === "admin";
      setEvents((x) => [...x, { ...e, id: uid(), status: "proposed", proposedBy: me }]);
      toast.success(isAdmin ? "Event drafted" : "Proposal sent", { description: "An administrator must publish it before it appears." });
    },
    publishEvent(id) {
      const e = events.find((x) => x.id === id)!;
      const hit = hitByEvent(e, reservations);
      setEvents((x) => x.map((y) => (y.id === id ? { ...y, status: "published" } : y)));
      setReservations((x) => x.map((r) => (hit.some((h) => h.id === r.id) ? { ...r, status: "cancelled", note: `Cancelled by event: ${e.title}` } : r)));
      notify([
        { to: "all", title: `New announcement: ${e.title}`, body: `${e.date} ${fmtTime(e.start)}–${fmtTime(e.end)} · ${e.scope === "all" ? "All CISC rooms unavailable" : `Rooms: ${e.roomIds.map(roomName).join(", ")}`}` },
        ...hit.map((r) => ({ to: r.requester, title: "Reservation cancelled — event", body: `${roomName(r.roomId)} on ${r.date} conflicts with "${e.title}".` })),
      ]);
      toast.success("Published", { description: hit.length ? `${hit.length} conflicting reservation(s) cancelled.` : "No reservation conflicts." });
    },
    removeEvent(id) {
      setEvents((x) => x.filter((e) => e.id !== id));
    },
    addReport(r, anonymous) {
      const status = r.kind === "facility" ? "Submitted" : r.kind === "lost" ? "Reported" : "Unclaimed";
      setReports((x) => [{ ...r, reporter: anonymous ? "Anonymous" : me, id: uid(), status, date: "2026-11-12" }, ...x]);
      toast.success("Report submitted", { description: "The Registrar will review it." });
    },
    setReportStatus(id, status) {
      setReports((x) => x.map((r) => (r.id === id ? { ...r, status } : r)));
    },
    markAllRead() {
      setNotifications((n) => n.map((x) => (x.to === me || x.to === "all" ? { ...x, read: true } : x)));
    },
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}
