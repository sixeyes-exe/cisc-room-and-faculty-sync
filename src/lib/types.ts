export type Role = "student" | "faculty" | "admin";
export type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export interface Room {
  id: string;
  name: string;
  building: string;
  floor: number;
  type: "Lecture" | "Computer Lab" | "Conference" | "Studio";
  capacity: number;
  equipment: string[];
  accessible: boolean;
  rules: string[];
}

export interface ClassSchedule {
  id: string;
  roomId: string;
  day: Day;
  start: number; // minutes from midnight
  end: number;
  course: string;
  section: string;
  faculty: string;
  classSize: number;
  status: "official" | "proposed";
}

export type ReservationStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Reservation {
  id: string;
  roomId: string;
  date: string; // YYYY-MM-DD
  start: number;
  end: number;
  requester: string;
  role: "student" | "faculty";
  people: number;
  purpose: string;
  status: ReservationStatus;
  note?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  start: number;
  end: number;
  kind: "holiday" | "closure" | "event";
  scope: "all" | "rooms";
  roomIds: string[];
  status: "proposed" | "published";
  proposedBy: string;
}

export interface Report {
  id: string;
  kind: "facility" | "lost" | "found";
  title: string;
  details: string;
  roomId: string;
  reporter: string; // "Anonymous" allowed
  status: string;
  date: string;
}

export interface Notification {
  id: string;
  to: string; // user name or "all"
  title: string;
  body: string;
  time: string;
  read: boolean;
}
