import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputCls, PageHeader, Panel, StatusBadge } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { FACILITY_FLOW, FOUND_FLOW, LOST_FLOW } from "@/lib/seed";
import type { Report } from "@/lib/types";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports · CISC SpaceSync" },
      { name: "description", content: "Report damaged facilities and lost or found items in CISC rooms." },
      { property: "og:title", content: "Reports · CISC SpaceSync" },
      { property: "og:description", content: "Facility and lost-and-found reports for CISC rooms." },
    ],
  }),
  component: ReportsPage,
});

const flow = (k: Report["kind"]) => (k === "facility" ? FACILITY_FLOW : k === "lost" ? LOST_FLOW : FOUND_FLOW);

function ReportsPage() {
  const s = useStore();
  const isAdmin = s.role === "admin";
  const [f, setF] = useState({ kind: "facility" as Report["kind"], title: "", details: "", roomId: "r101" });
  const [anon, setAnon] = useState(false);
  const list = isAdmin ? s.reports : s.reports.filter((r) => r.reporter === s.me);
  return (
    <div>
      <PageHeader title="Facility & Lost-and-Found" subtitle="Handled by the Registrar. A claim isn't proof of ownership until verified in person." />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {!isAdmin && (
          <Panel title="New report" className="h-fit">
            <div className="grid gap-3">
              <Field label="Type">
                <select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Report["kind"] })}><option value="facility">Damaged facility / equipment</option><option value="lost">I lost something</option><option value="found">I found something</option></select>
              </Field>
              <Field label="Room"><select className={inputCls} value={f.roomId} onChange={(e) => setF({ ...f, roomId: e.target.value })}>{s.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
              <Field label="Short title"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
              <Field label="Details"><textarea className={inputCls + " h-20 py-2"} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> Submit anonymously</label>
              <Button disabled={!f.title.trim()} onClick={() => { s.addReport({ ...f, reporter: s.me }, anon); setF({ ...f, title: "", details: "" }); }}>Submit report</Button>
            </div>
          </Panel>
        )}
        <div className={`grid gap-4 md:grid-cols-2 ${isAdmin ? "lg:col-span-2" : ""}`}>
          {list.map((r) => {
            const steps = flow(r.kind);
            const idx = steps.indexOf(r.status);
            return (
              <Panel key={r.id}>
                <div className="flex justify-between gap-2"><div><h3 className="font-semibold">{r.title}</h3><p className="text-xs capitalize text-muted-foreground">{r.kind} · {s.roomName(r.roomId)} · {r.date} · {r.reporter}</p></div><StatusBadge status={r.status} /></div>
                <p className="mt-2 text-sm">{r.details}</p>
                <ol className="mt-3 flex gap-1">{steps.map((st, i) => <li key={st} className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-green-brand" : "bg-muted"}`} title={st} />)}</ol>
                {isAdmin && <select className={inputCls + " mt-3"} value={r.status} onChange={(e) => s.setReportStatus(r.id, e.target.value)} aria-label="Update status">{steps.map((st) => <option key={st}>{st}</option>)}</select>}
                {!isAdmin && r.kind === "found" && r.status === "Unclaimed" && r.reporter !== s.me && <Button size="sm" variant="outline" className="mt-3" onClick={() => s.setReportStatus(r.id, "Claim Submitted")}>This is mine — claim</Button>}
              </Panel>
            );
          })}
          {!list.length && <p className="text-sm text-muted-foreground">No reports yet.</p>}
        </div>
      </div>
    </div>
  );
}
