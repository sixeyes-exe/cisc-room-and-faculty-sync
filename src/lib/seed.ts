import type { CalendarEvent, ClassSchedule, Notification, Report, Reservation, Room } from "./types";

export const TODAY = "2026-11-12";

export const USERS = {
  student: { name: "Juan Dela Cruz", detail: "BSCS 3-A · student" },
  faculty: { name: "Prof. Maria Santos", detail: "Computer Science · faculty" },
  admin: { name: "Registrar Office", detail: "Administrator" },
} as const;

const RULES = ["CLAYGO — Clean As You Go", "Turn off lights and aircon before leaving", "No food near computers", "Leave on time; overstays are reported to the Registrar"];

export const ROOMS: Room[] = [
  { id: "r101", name: "CISC 101", building: "Main Bldg", floor: 1, type: "Lecture", capacity: 40, equipment: ["Projector", "Aircon", "Whiteboard"], accessible: true, rules: RULES },
  { id: "r102", name: "CISC 102", building: "Main Bldg", floor: 1, type: "Lecture", capacity: 35, equipment: ["TV Display", "Aircon", "Whiteboard"], accessible: true, rules: RULES },
  { id: "r201", name: "Lab 201", building: "Main Bldg", floor: 2, type: "Computer Lab", capacity: 30, equipment: ["Computers", "Projector", "Aircon"], accessible: false, rules: RULES },
  { id: "r202", name: "Lab 202", building: "Main Bldg", floor: 2, type: "Computer Lab", capacity: 30, equipment: ["Computers", "TV Display", "Aircon"], accessible: false, rules: RULES },
  { id: "r301", name: "CISC 301", building: "Annex", floor: 3, type: "Lecture", capacity: 50, equipment: ["Projector", "Sound System", "Aircon"], accessible: true, rules: RULES },
  { id: "r302", name: "Conference Rm", building: "Annex", floor: 3, type: "Conference", capacity: 15, equipment: ["TV Display", "Aircon", "Video Conferencing"], accessible: true, rules: RULES },
  { id: "r303", name: "Media Studio", building: "Annex", floor: 3, type: "Studio", capacity: 12, equipment: ["Cameras", "Lighting", "Computers"], accessible: false, rules: RULES },
];

const h = (x: number) => Math.round(x * 60);
let n = 0;
const cs = (roomId: string, day: ClassSchedule["day"], s: number, e: number, course: string, section: string, faculty: string, classSize: number): ClassSchedule => ({ id: `c${++n}`, roomId, day, start: h(s), end: h(e), course, section, faculty, classSize, status: "official" });

export const SCHEDULES: ClassSchedule[] = [
  cs("r101", "Mon", 7.5, 9, "CS 311 Algorithms", "BSCS 3-A", "Prof. Maria Santos", 38),
  cs("r101", "Thu", 7.5, 9, "CS 311 Algorithms", "BSCS 3-A", "Prof. Maria Santos", 38),
  cs("r201", "Thu", 9, 12, "IT 221 Web Dev Lab", "BSIT 2-B", "Engr. Paolo Reyes", 28),
  cs("r102", "Thu", 13, 14.5, "CS 321 Software Eng", "BSCS 3-A", "Dr. Ana Lim", 33),
  cs("r301", "Thu", 15, 16.5, "GE Ethics", "BSIS 1-A", "Prof. Ramon Cruz", 45),
  cs("r202", "Fri", 10.5, 13.5, "CS 331 Networks Lab", "BSCS 3-A", "Prof. Maria Santos", 29),
  cs("r101", "Fri", 13, 14.5, "IS 210 Databases", "BSIS 2-A", "Dr. Ana Lim", 36),
  cs("r201", "Tue", 9, 12, "IT 221 Web Dev Lab", "BSIT 2-A", "Engr. Paolo Reyes", 30),
  cs("r102", "Wed", 10.5, 12, "CS 321 Software Eng", "BSCS 3-B", "Dr. Ana Lim", 34),
  cs("r301", "Mon", 13, 14.5, "CS 101 Intro Computing", "BSCS 1-A", "Prof. Maria Santos", 48),
];

export const RESERVATIONS: Reservation[] = [
  { id: "v1", roomId: "r302", date: TODAY, start: h(10), end: h(12), requester: "Juan Dela Cruz", role: "student", people: 6, purpose: "Thesis group meeting", status: "approved" },
  { id: "v2", roomId: "r302", date: TODAY, start: h(11), end: h(13), requester: "CISC Student Council", role: "student", people: 8, purpose: "Council planning", status: "approved" },
  { id: "v3", roomId: "r101", date: TODAY, start: h(9.5), end: h(11.5), requester: "Juan Dela Cruz", role: "student", people: 10, purpose: "Study group – Algorithms", status: "pending" },
  { id: "v4", roomId: "r301", date: TODAY, start: h(10), end: h(12), requester: "ACM Student Chapter", role: "student", people: 25, purpose: "Coding workshop", status: "approved" },
  { id: "v5", roomId: "r301", date: TODAY, start: h(10.5), end: h(11.5), requester: "Prof. Maria Santos", role: "faculty", people: 40, purpose: "Make-up class CS 311", status: "pending" },
  { id: "v6", roomId: "r202", date: "2026-11-13", start: h(14), end: h(16), requester: "Juan Dela Cruz", role: "student", people: 4, purpose: "Capstone dev session", status: "pending" },
  { id: "v7", roomId: "r102", date: "2026-11-16", start: h(15), end: h(17), requester: "Prof. Maria Santos", role: "faculty", people: 30, purpose: "Consultation hours", status: "approved" },
];

export const EVENTS: CalendarEvent[] = [
  { id: "e1", title: "CISC Week Opening", description: "All year levels gather for the CISC Week kickoff. All rooms closed.", date: "2026-11-18", start: h(8), end: h(12), kind: "event", scope: "all", roomIds: [], status: "published", proposedBy: "Registrar Office" },
  { id: "e2", title: "Bonifacio Day", description: "Regular holiday. No classes; all CISC rooms closed.", date: "2026-11-30", start: 0, end: h(24), kind: "holiday", scope: "all", roomIds: [], status: "published", proposedBy: "Registrar Office" },
  { id: "e3", title: "Hackathon Briefing", description: "Briefing for hackathon participants in Lab 201 and Lab 202.", date: "2026-11-13", start: h(16), end: h(18), kind: "event", scope: "rooms", roomIds: ["r201", "r202"], status: "published", proposedBy: "ACM Student Chapter" },
  { id: "e4", title: "Alumni Tech Talk", description: "Proposed talk by CISC alumni on careers in AI.", date: "2026-11-20", start: h(13), end: h(15), kind: "event", scope: "rooms", roomIds: ["r301"], status: "proposed", proposedBy: "Juan Dela Cruz" },
];

export const REPORTS: Report[] = [
  { id: "p1", kind: "facility", title: "Broken chair, back row", details: "Chair leg wobbling near the window.", roomId: "r101", reporter: "Juan Dela Cruz", status: "Under Review", date: "2026-11-10" },
  { id: "p2", kind: "facility", title: "HDMI cable missing", details: "Projector HDMI cable not on the podium.", roomId: "r201", reporter: "Prof. Maria Santos", status: "In Progress", date: "2026-11-11" },
  { id: "p3", kind: "found", title: "Blue water bottle", details: "Found under desk 12.", roomId: "r202", reporter: "Anonymous", status: "Unclaimed", date: "2026-11-11" },
  { id: "p4", kind: "lost", title: "Black USB drive (32GB)", details: "Has thesis files, label 'JDC'.", roomId: "r302", reporter: "Juan Dela Cruz", status: "Reported", date: "2026-11-12" },
];

export const NOTIFICATIONS: Notification[] = [
  { id: "n1", to: "Juan Dela Cruz", title: "Reservation approved", body: "Conference Rm today 10:00 AM–12:00 PM. Reminders at 11:50 AM and 11:55 AM. Remember CLAYGO.", time: "Today 8:12 AM", read: false },
  { id: "n2", to: "all", title: "CISC Week Opening on Nov 18", body: "All CISC rooms closed 8:00 AM–12:00 PM.", time: "Yesterday", read: false },
];

export const FACILITY_FLOW = ["Submitted", "Under Review", "In Progress", "Resolved"];
export const LOST_FLOW = ["Reported", "Claim Submitted", "Returned / Closed"];
export const FOUND_FLOW = ["Unclaimed", "Claim Submitted", "Returned / Closed"];
