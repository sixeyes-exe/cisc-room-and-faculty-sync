import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Accessibility, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CapacityBar, Field, inputCls, PageHeader, Panel, StatusBadge } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { DAYS, fmtTime, parseTime, rankRooms, type RankedRoom } from "@/lib/rules";
import { TODAY } from "@/lib/seed";
import type { Room } from "@/lib/types";

export const Route = createFileRoute("/rooms")({
  head: () => ({
    meta: [
      { title: "Find a Room · CISC SpaceSync" },
      { name: "description", content: "Filter and get ranked room recommendations by time, capacity, equipment and accessibility." },
      { property: "og:title", content: "Find a Room · CISC SpaceSync" },
      { property: "og:description", content: "Filter and get ranked room recommendations for CISC rooms." },
    ],
  }),
  component: RoomsPage,
});

const EQUIP = ["Projector", "TV Display", "Computers", "Aircon", "Whiteboard", "Sound System", "Video Conferencing"];

function RoomsPage() {
  const s = useStore();
  const [date, setDate] = useState(TODAY);
  const [start, setStart] = useState("13:00");
  const [end, setEnd] = useState("15:00");
  const [people, setPeople] = useState(5);
  const [type, setType] = useState("");
  const [building, setBuilding] = useState("");
  const [accessible, setAccessible] = useState(false);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [open, setOpen] = useState<RankedRoom | null>(null);
  const sm = parseTime(start), em = parseTime(end);
  const invalid = em <= sm;
  const ranked = invalid ? [] : rankRooms(s.rooms, { date, start: sm, end: em, people, type, building, accessible, equipment }, s.schedules, s.events, s.reservations);

  return (
    <div>
      <PageHeader title="Find a Room" subtitle="Rooms are ranked by availability and best fit. Recommendations don't reserve a room — you still need approval." />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Panel title="Your needs" className="h-fit">
          <div className="grid gap-4">
            <Field label="Date"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From"><input type="time" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
              <Field label="To"><input type="time" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
            </div>
            {invalid && <p className="text-xs text-destructive">End time must be after start time.</p>}
            <Field label="Number of people"><input type="number" min={1} className={inputCls} value={people} onChange={(e) => setPeople(Math.max(1, +e.target.value))} /></Field>
            <Field label="Room type">
              <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Any</option>{["Lecture", "Computer Lab", "Conference", "Studio"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Building">
              <select className={inputCls} value={building} onChange={(e) => setBuilding(e.target.value)}>
                <option value="">Any</option><option>Main Bldg</option><option>Annex</option>
              </select>
            </Field>
            <fieldset className="grid gap-2 text-sm">
              <legend className="mb-1 font-medium">Equipment</legend>
              <div className="flex flex-wrap gap-2">
                {EQUIP.map((e) => {
                  const on = equipment.includes(e);
                  return <button key={e} type="button" aria-pressed={on} onClick={() => setEquipment(on ? equipment.filter((x) => x !== e) : [...equipment, e])} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{on ? "✓ " : ""}{e}</button>;
                })}
              </div>
            </fieldset>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={accessible} onChange={(e) => setAccessible(e.target.checked)} className="h-4 w-4 accent-primary" /> Wheelchair accessible only</label>
          </div>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ranked.map((r, i) => (
            <button key={r.room.id} onClick={() => setOpen(r)} className="group rounded-2xl border border-border bg-card p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary/40">
              <div className="flex items-start justify-between">
                <div>
                  {r.available && i === 0 && <div className="mb-1 text-xs font-semibold text-secondary">★ Best match</div>}
                  <h3 className="text-lg font-semibold">{r.room.name}</h3>
                  <p className="text-xs text-muted-foreground">{r.room.building} · Floor {r.room.floor} · {r.room.type}</p>
                </div>
                {r.room.accessible && <Accessibility className="h-4 w-4 text-primary" aria-label="Accessible" />}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-4 w-4" />{r.remaining} of {r.room.capacity} left</span>
                <StatusBadge status={r.available ? "approved" : "cancelled"} />
              </div>
              <div className="mt-2"><CapacityBar used={r.room.capacity - r.remaining} total={r.room.capacity} /></div>
              <p className="mt-3 text-xs text-muted-foreground">{r.available ? "Available for your group" : r.reason ?? `Only ${r.remaining} seats left`}</p>
              <div className="mt-3 flex flex-wrap gap-1">{r.room.equipment.map((e) => <span key={e} className="rounded-md bg-muted px-2 py-0.5 text-[11px]">{e}</span>)}</div>
            </button>
          ))}
          {!invalid && ranked.length === 0 && <p className="text-sm text-muted-foreground">No rooms match these filters. Try removing some equipment.</p>}
        </div>
      </div>
      {open && <RoomDialog r={open} date={date} start={sm} end={em} people={people} onClose={() => setOpen(null)} />}
    </div>
  );
}

function RoomDialog({ r, date, start, end, people, onClose }: { r: RankedRoom; date: string; start: number; end: number; people: number; onClose: () => void }) {
  const s = useStore();
  const room: Room = r.room;
  const [purpose, setPurpose] = useState("");
  const [step, setStep] = useState<"view" | "review">("view");
  const classes = s.schedules.filter((c) => c.roomId === room.id && c.status === "official").sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.start - b.start);
  const resv = s.reservations.filter((x) => x.roomId === room.id && x.date === date && x.status === "approved");
  const canRequest = s.role !== "admin" && (r.available || (s.role === "faculty" && !r.reason));
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">{room.name}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{room.building}, Floor {room.floor} · {room.type} · Seats {room.capacity} · {room.accessible ? "Accessible" : "Stairs only"}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-semibold">Weekly class schedule</h4>
            <ul className="space-y-1 text-xs">
              {classes.map((c) => <li key={c.id} className="rounded-lg bg-muted p-2"><b>{c.day} {fmtTime(c.start)}–{fmtTime(c.end)}</b><br />{c.course} · {c.section}<br /><span className="text-muted-foreground">{c.faculty}</span></li>)}
              {!classes.length && <li className="text-muted-foreground">No official classes.</li>}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold">Approved reservations on {date}</h4>
            <ul className="space-y-1 text-xs">
              {resv.map((x) => <li key={x.id} className="rounded-lg bg-muted p-2">{fmtTime(x.start)}–{fmtTime(x.end)} · {x.people} people {x.role === "faculty" && "· faculty"}</li>)}
              {!resv.length && <li className="text-muted-foreground">None yet.</li>}
            </ul>
            <h4 className="mb-2 mt-4 text-sm font-semibold">Room rules</h4>
            <ul className="list-disc space-y-0.5 pl-4 text-xs">{room.rules.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </div>
        {canRequest && (
          <div className="rounded-xl border border-border bg-muted/50 p-4">
            {step === "view" ? (
              <div className="grid gap-3">
                <Field label="Purpose"><input className={inputCls} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Thesis group meeting" /></Field>
                <Button disabled={!purpose.trim()} onClick={() => setStep("review")}>Review request</Button>
              </div>
            ) : (
              <div className="grid gap-3 text-sm">
                <p><b>{room.name}</b> · {date} · {fmtTime(start)}–{fmtTime(end)} · {people} people<br />Purpose: {purpose}</p>
                {s.role === "faculty" && <p className="text-xs text-muted-foreground">Faculty priority: once approved, overlapping student reservations will be cancelled and notified.</p>}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("view")}>Back</Button>
                  <Button onClick={() => { s.requestReservation({ roomId: room.id, date, start, end, people, purpose }); onClose(); }}>Submit request</Button>
                </div>
              </div>
            )}
          </div>
        )}
        {!canRequest && s.role !== "admin" && <p className="text-sm text-destructive">This room can't take your group at that time. Pick another time or room.</p>}
      </DialogContent>
    </Dialog>
  );
}
