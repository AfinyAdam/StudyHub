"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getEvents, createEvent, deleteEvent, getUserRSVPs, rsvpToEvent, cancelRSVP, getEventRSVPs } from "@/lib/firestore";
import { Event, EventRSVP } from "@/types";
import { Calendar, Plus, X, Trash2, MapPin, Clock, Users, Check } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const MONTH_GRADIENTS = [
  "from-blue-500 to-indigo-600",   "from-purple-500 to-pink-600",
  "from-emerald-500 to-teal-600",  "from-amber-500 to-orange-500",
  "from-red-500 to-rose-600",      "from-pink-500 to-fuchsia-600",
  "from-indigo-500 to-violet-600", "from-teal-500 to-cyan-600",
  "from-orange-500 to-amber-600",  "from-cyan-500 to-blue-600",
  "from-rose-500 to-pink-600",     "from-green-500 to-emerald-600",
];

export default function EventsPage() {
  const { user, profile } = useAuth();
  const [events,       setEvents]       = useState<Event[]>([]);
  const [rsvpCounts,   setRsvpCounts]   = useState<Record<string, number>>({});
  const [myRsvps,      setMyRsvps]      = useState<EventRSVP[]>([]);
  const [rsvpLoading,  setRsvpLoading]  = useState<Record<string, boolean>>({});
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [filter,       setFilter]       = useState<"upcoming" | "past" | "all">("upcoming");
  const [form, setForm] = useState({ title: "", description: "", eventDate: "", location: "" });

  const load = async () => {
    try {
      const data = await getEvents();
      setEvents(data);

      // Load RSVP counts for all events in parallel
      const counts = await Promise.all(
        data.map(e => getEventRSVPs(e.id).then(r => [e.id, r.length] as [string, number]))
      );
      setRsvpCounts(Object.fromEntries(counts));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadMyRsvps = async () => {
    if (!user) return;
    try { setMyRsvps(await getUserRSVPs(user.uid)); }
    catch (err) { console.error(err); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadMyRsvps(); }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.eventDate) return toast.error("Title and date are required");
    setSaving(true);
    try {
      await createEvent({ ...form, createdBy: user!.uid, createdAt: new Date().toISOString() });
      toast.success("Event created!");
      setShowModal(false);
      setForm({ title: "", description: "", eventDate: "", location: "" });
      load();
    } catch { toast.error("Failed to create event"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteEvent(id);
      toast.success("Event deleted!");
      load();
    } catch { toast.error("Failed to delete"); }
  };

  const handleRSVP = async (eventId: string) => {
    if (!user) return;
    setRsvpLoading(p => ({ ...p, [eventId]: true }));
    try {
      const existing = myRsvps.find(r => r.eventId === eventId);
      if (existing) {
        await cancelRSVP(existing.id);
        setMyRsvps(p => p.filter(r => r.id !== existing.id));
        setRsvpCounts(p => ({ ...p, [eventId]: Math.max(0, (p[eventId] || 1) - 1) }));
        toast.success("RSVP cancelled");
      } else {
        const id = await rsvpToEvent(user.uid, eventId);
        setMyRsvps(p => [...p, { id, userId: user.uid, eventId, rsvpedAt: new Date().toISOString() }]);
        setRsvpCounts(p => ({ ...p, [eventId]: (p[eventId] || 0) + 1 }));
        toast.success("You're going!");
      }
    } catch { toast.error("Failed to update RSVP"); }
    finally { setRsvpLoading(p => ({ ...p, [eventId]: false })); }
  };

  const now = new Date();
  const filtered = events.filter(e => {
    const d = new Date(e.eventDate);
    if (filter === "upcoming") return d >= now;
    if (filter === "past")     return d < now;
    return true;
  });

  const upcoming = events.filter(e => new Date(e.eventDate) >= now).length;
  const past     = events.filter(e => new Date(e.eventDate) <  now).length;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 text-sm mt-1">{upcoming} upcoming · {past} past</p>
        </div>
        {profile?.role === "admin" && (
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Event
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(["upcoming", "all", "past"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === f ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Events */}
      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-400 font-medium">No {filter} events</p>
          {profile?.role === "admin" && (
            <Button className="mt-5" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Add Event
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(event => {
            const date     = new Date(event.eventDate);
            const isPast   = date < now;
            const gradient = MONTH_GRADIENTS[date.getMonth()];
            const isRsvped = myRsvps.some(r => r.eventId === event.id);
            const count    = rsvpCounts[event.id] ?? 0;

            return (
              <div key={event.id} className={`bg-white rounded-2xl border border-gray-100 flex gap-5 items-start p-5 hover:shadow-sm transition-all ${isPast ? "opacity-60" : ""}`}>
                {/* Date Badge */}
                <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-3 flex flex-col items-center justify-center min-w-[64px] shrink-0 shadow-sm`}>
                  <span className="text-white/80 text-[10px] font-bold uppercase tracking-wide">
                    {date.toLocaleString("default", { month: "short" })}
                  </span>
                  <span className="text-white text-2xl font-bold leading-none mt-0.5">{date.getDate()}</span>
                  <span className="text-white/70 text-[10px] mt-0.5">{date.getFullYear()}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 leading-snug">{event.title}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPast ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}`}>
                        {isPast ? "Past" : "Upcoming"}
                      </span>
                      {profile?.role === "admin" && (
                        <button onClick={() => handleDelete(event.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {event.description && (
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">{event.description}</p>
                  )}

                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock size={12} />
                      {date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1.5 text-xs text-blue-500 font-medium">
                        <MapPin size={12} /> {event.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Users size={12} /> {count} going
                    </span>
                  </div>

                  {/* RSVP button — only for upcoming events */}
                  {!isPast && (
                    <div className="mt-3">
                      <button
                        onClick={() => handleRSVP(event.id)}
                        disabled={rsvpLoading[event.id]}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                          isRsvped
                            ? "bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600"
                            : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                        } disabled:opacity-50`}
                      >
                        {isRsvped ? <><Check size={13} /> Going</> : <><Plus size={13} /> RSVP</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Add New Event</h2>
                <p className="text-sm text-gray-400 mt-0.5">Schedule an event for students</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <Input label="Event Title *" placeholder="e.g. Mid-term Examination" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              <Input label="Description" placeholder="Details about the event…" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Date *" type="date" value={form.eventDate}
                  onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))} />
                <Input label="Location" placeholder="e.g. Room 101" value={form.location}
                  onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div className="flex gap-3 mt-1">
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" fullWidth loading={saving}>Create Event</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
