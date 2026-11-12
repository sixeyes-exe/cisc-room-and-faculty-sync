import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CapacityBar, PageHeader, Panel, StatusBadge } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { blockReason, bumpedByFaculty, fmtTime, remainingCapacity, reminderTimes } from "@/lib/rules";
import type { Reservation } from "@/lib/types";

export const Route = createFileRoute("/reservations")({
  head: () => ({
    meta: [
      { title: "Reservations · CISC SpaceSync" },
      { name: "description", content: "Track room requests, or review and approve them with capacity and faculty-priority checks." },
      { property: "og:title", content: "Reservations · CISC SpaceSync" },
      { property: "og:description", content: "Track and approve CISC room requests." },
    ],
  }),
  component: ReservationsPage,
});

function ReservationsPage() {
  const s = useStore();
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [confirm, setConfirm] = useState<{ title: string; body: string; run: () => void } | null>(null);
  const isAdmin = s.role === "admin";
  const list = (isAdmin ? s.reservations.filter((r) => tab === "all" || r.status === "pending") : s.reservations.filter((r) => r.requester === s.me)).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);

  const approve = (r: Reservation) => {
    const bumped = r.role === "faculty" ? bumpedByFaculty(r, s.reservations) : [];
    if (bumped.length) setConfirm({ title: "Approve faculty reservation?", body: `This will cancel ${bumped.length} approved student reservation(s): ${bumped.map((b) => `${b.requester} (${fmtTime(b.start)}–${fmtTime(b.end)})`).join(", ")}. They'll be notified with alternative rooms.`, run: () => s.decideReservation(r.id, true) });
    else s.decideReservation(r.id, true);
  };

  return (
    <div>
      <PageHeader
        title={isAdmin ? "Room Requests" : "My Reservations"}
        subtitle={isAdmin ? "Approve only when capacity allows. Faculty bookings take priority over student bookings." : "Requests need admin approval. Submit early so there's time to review."}
        action={!isAdmin && <Button asChild><Link to="/rooms">New request</Link></Button>}
      />
      {isAdmin && (
        <div className="mb-4 inline-flex rounded-full border border-border bg-card p-1 text-sm">
          {(["pending", "all"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t}</button>)}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((r) => {
          const room = s.rooms.find((x) => x.id === r.roomId)!;
          const left = remainingCapacity(room, r.date, r.start, r.end, s.reservations, r.id);
          const block = blockReason(r.roomId, r.date, r.start, r.end, s.schedules, s.events);
          const fits = r.role === "faculty" || r.people <= left;
          const [m1, m2] = reminderTimes(r.end);
          return (
            <Panel key={r.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{room.name} · {r.purpose}</h3>
                  <p className="text-xs text-muted-foreground">{r.date} · {fmtTime(r.start)}–{fmtTime(r.end)} · {r.people} people</p>
                  <p className="mt-1 text-xs"><span className={r.role === "faculty" ? "font-semibold text-primary" : ""}>{r.requester}</span> · {r.role}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              {r.note && <p className="mt-3 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{r.note}</p>}
              {r.status === "approved" && <p className="mt-3 rounded-lg bg-accent p-2 text-xs text-accent-foreground">Reminders at {fmtTime(m1)} and {fmtTime(m2)}. CLAYGO — Clean As You Go. Overstays are reported to the Registrar.</p>}
              {isAdmin && r.status === "pending" && (
                <div className="mt-4 space-y-3">
                  {r.role === "student" && (
                    <div className="text-xs">
                      <div className="mb-1 flex justify-between"><span>Capacity check</span><span className={fits ? "text-success" : "text-destructive"}>{fits ? "✓" : "✕"} {left} of {room.capacity} seats free</span></div>
                      <CapacityBar used={room.capacity - left + r.people} total={room.capacity} />
                    </div>
                  )}
                  {block && <p className="text-xs text-destructive">⚠ Conflicts with {block}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" disabled={!fits || !!block} onClick={() => approve(r)}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => s.decideReservation(r.id, false)}>Reject</Button>
                  </div>
                </div>
              )}
              {!isAdmin && (r.status === "pending" || r.status === "approved") && (
                <Button size="sm" variant="outline" className="mt-4" onClick={() => setConfirm({ title: "Cancel this reservation?", body: `${room.name} on ${r.date}, ${fmtTime(r.start)}–${fmtTime(r.end)}. This can't be undone.`, run: () => s.cancelReservation(r.id) })}>Cancel request</Button>
              )}
            </Panel>
          );
        })}
        {!list.length && <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
      </div>
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{confirm?.title}</AlertDialogTitle><AlertDialogDescription>{confirm?.body}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Go back</AlertDialogCancel><AlertDialogAction onClick={() => { confirm?.run(); setConfirm(null); }}>Confirm</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
