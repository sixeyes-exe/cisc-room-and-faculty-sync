import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputCls, PageHeader, Panel, StatusBadge } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { DAYS, fmtTime, scheduleConflicts, suggestSlots, type Suggestion } from "@/lib/rules";
import type { Room } from "@/lib/types";

export const Route = createFileRoute("/schedules")({
  head: () => ({
    meta: [
      { title: "Class Schedules · CISC SpaceSync" },
      { name: "description", content: "Official CISC class schedules by room, with conflict checks and a scheduling assistant for the Registrar." },
      { property: "og:title", content: "Class Schedules · CISC SpaceSync" },
      { property: "og:description", content: "Official CISC class schedules by room." },
    ],
  }),
  component: SchedulesPage,
});

const HOURS = Array.from({ length: 13 }, (_, i) => 7 + i);
const START = 7 * 60, PX = 0.8;

function SchedulesPage() {
  const s = useStore();
  const [room, setRoom] = useState("");
  const list = s.schedules.filter((c) => !room || c.roomId === room);
  const official = list.filter((c) => c.status === "official");
  const proposed = s.schedules.filter((c) => c.status === "proposed");
  const conflicts = scheduleConflicts(s.schedules, s.rooms);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Schedules"
        subtitle={s.role === "admin" ? "Manage official schedules. Assistant suggestions are only proposals until you approve them." : "Official schedules are view-only. Faculty names are shown for each class."}
        action={
          <select className={inputCls + " w-48"} value={room} onChange={(e) => setRoom(e.target.value)} aria-label="Filter by room">
            <option value="">All rooms</option>{s.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        }
      />
      <Panel>
        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-[56px_repeat(6,1fr)] gap-x-2">
            <div />
            {DAYS.map((d) => <div key={d} className="pb-2 text-center text-sm font-semibold">{d}</div>)}
            <div className="relative" style={{ height: 12 * 60 * PX }}>
              {HOURS.map((h) => <div key={h} className="absolute right-1 -translate-y-2 text-[10px] text-muted-foreground" style={{ top: (h * 60 - START) * PX }}>{fmtTime(h * 60).replace(":00", "")}</div>)}
            </div>
            {DAYS.map((d) => (
              <div key={d} className="relative rounded-xl bg-muted/60" style={{ height: 12 * 60 * PX }}>
                {official.filter((c) => c.day === d).map((c) => (
                  <div key={c.id} className="absolute inset-x-1 overflow-hidden rounded-lg bg-brand p-1.5 text-[11px] leading-tight text-primary-foreground shadow" style={{ top: (c.start - START) * PX, height: (c.end - c.start) * PX - 2 }}>
                    <div className="font-semibold">{c.course}</div>
                    <div className="opacity-90">{s.roomName(c.roomId)} · {c.section}</div>
                    <div className="opacity-80">{c.faculty}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {s.role === "admin" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Assistant rooms={s.rooms} />
          <div className="space-y-6">
            <Panel title={`Conflicts (${conflicts.length})`} icon={<AlertTriangle className="h-4 w-4" />}>
              <ul className="space-y-2 text-sm">
                {conflicts.map((c, i) => <li key={i} className="rounded-xl bg-destructive/10 p-3"><b className="capitalize">{c.kind}:</b> {c.message}</li>)}
                {!conflicts.length && <li className="text-muted-foreground">✓ No double-bookings, overlaps or capacity issues.</li>}
              </ul>
            </Panel>
            <Panel title="Proposed schedules awaiting approval">
              <ul className="space-y-2 text-sm">
                {proposed.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted p-3">
                    <div><b>{c.course}</b> · {c.section}<div className="text-xs text-muted-foreground">{s.roomName(c.roomId)} · {c.day} {fmtTime(c.start)}–{fmtTime(c.end)} · {c.faculty}</div></div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => s.updateSchedule(c.id, { status: "official" })}><Check className="h-4 w-4" /> Make official</Button>
                      <Button size="sm" variant="outline" onClick={() => s.removeSchedule(c.id)}><X className="h-4 w-4" /> Discard</Button>
                    </div>
                  </li>
                ))}
                {!proposed.length && <li className="text-muted-foreground">Nothing pending.</li>}
              </ul>
            </Panel>
          </div>
        </div>
      )}

      <Panel title="All official classes">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Day & time</th><th>Course</th><th>Section</th><th>Faculty</th><th>Room</th><th>Status</th></tr></thead>
            <tbody className="divide-y divide-border">
              {official.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.start - b.start).map((c) => (
                <tr key={c.id}><td className="py-2">{c.day} {fmtTime(c.start)}–{fmtTime(c.end)}</td><td>{c.course}</td><td>{c.section}</td><td>{c.faculty}</td><td>{s.roomName(c.roomId)}</td><td><StatusBadge status={c.status} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Assistant({ rooms }: { rooms: Room[] }) {
  const s = useStore();
  const [f, setF] = useState({ course: "", section: "", faculty: "", classSize: 30, duration: 90, roomType: "" as "" | Room["type"] });
  const [result, setResult] = useState<Suggestion[] | { missing: string[] } | null>(null);
  const faculty = Array.from(new Set(s.schedules.map((c) => c.faculty)));
  const run = () => setResult(suggestSlots({ ...f, roomType: f.roomType || undefined }, rooms, s.schedules));
  return (
    <Panel title="Scheduling assistant" icon={<Sparkles className="h-4 w-4" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Course / subject"><input className={inputCls} value={f.course} onChange={(e) => setF({ ...f, course: e.target.value })} placeholder="CS 341 AI" /></Field>
        <Field label="Section"><input className={inputCls} value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} placeholder="BSCS 3-A" /></Field>
        <Field label="Faculty">
          <select className={inputCls} value={f.faculty} onChange={(e) => setF({ ...f, faculty: e.target.value })}><option value="">Select…</option>{faculty.map((x) => <option key={x}>{x}</option>)}</select>
        </Field>
        <Field label="Room type">
          <select className={inputCls} value={f.roomType} onChange={(e) => setF({ ...f, roomType: e.target.value as Room["type"] })}><option value="">Any</option>{["Lecture", "Computer Lab", "Conference", "Studio"].map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Class size"><input type="number" min={1} className={inputCls} value={f.classSize} onChange={(e) => setF({ ...f, classSize: +e.target.value })} /></Field>
        <Field label="Duration (minutes)">
          <select className={inputCls} value={f.duration} onChange={(e) => setF({ ...f, duration: +e.target.value })}><option value={90}>90</option><option value={180}>180</option></select>
        </Field>
      </div>
      <Button className="mt-4 w-full" onClick={run}><Sparkles className="h-4 w-4" /> Suggest slots</Button>
      {result && "missing" in result && <p className="mt-3 rounded-xl bg-warning/20 p-3 text-sm">Missing information — please provide: {result.missing.join(", ")}. The assistant won't guess.</p>}
      {result && Array.isArray(result) && (
        <ul className="mt-4 space-y-3">
          {result.length === 0 && <li className="text-sm text-muted-foreground">No conflict-free slot found. Try a different room type or smaller class.</li>}
          {result.map((g, i) => (
            <li key={i} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <b>{s.roomName(g.schedule.roomId)} · {g.schedule.day} {fmtTime(g.schedule.start)}–{fmtTime(g.schedule.end)}</b>
                <Button size="sm" variant="secondary" onClick={() => { s.addSchedules([g.schedule]); setResult(result.filter((_, j) => j !== i)); }}>Add as proposal</Button>
              </div>
              <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">{g.explanation.map((x) => <li key={x}>{x}</li>)}</ul>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
