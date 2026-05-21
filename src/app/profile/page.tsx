"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { updateUserProfile } from "@/lib/firestore";
import { User, Mail, Phone, IdCard, Save, Shield, Pencil, X, Wallet, GraduationCap, Users } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function InfoRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value || "—"}</p>
        {note && <p className="text-xs text-gray-400 mt-0.5">{note}</p>}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [saving,    setSaving]    = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [classInfo, setClassInfo] = useState<{ name: string; major: string; joinCode?: string } | null>(null);
  const [joinCode,  setJoinCode]  = useState("");
  const [joining,   setJoining]   = useState(false);
  const [form, setForm] = useState({
    displayName:      "",
    phone:            "",
    studentId:        "",
    monthlyBudgetUSD: 0,
  });

  useEffect(() => {
    if (!profile) return;
    const fetchClass = async () => {
      try {
        const idToken = await (user as any).getIdToken();
        const res = await fetch("/api/classes", { headers: { Authorization: `Bearer ${idToken}` } });
        if (res.ok) {
          const data = await res.json();
          if (data && (data.name || data.id)) setClassInfo(data);
        }
      } catch { /* ignore */ }
    };
    if (profile.classId) fetchClass();
  }, [profile, user]);

  useEffect(() => {
    if (profile) {
      setForm({
        displayName:      profile.displayName      || "",
        phone:            profile.phone            || "",
        studentId:        profile.studentId        || "",
        monthlyBudgetUSD: profile.monthlyBudgetUSD || 0,
      });
    }
  }, [profile]);

  const handleSave = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!form.displayName) return toast.error("Name is required");
    setSaving(true);
    try {
      await updateUserProfile(user!.uid, {
        displayName:      form.displayName,
        phone:            form.phone,
        studentId:        form.studentId,
        monthlyBudgetUSD: form.monthlyBudgetUSD,
      });
      toast.success("Profile updated!");
      setEditing(false);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!profile?.email) return;
    try {
      await sendPasswordResetEmail(auth, profile.email);
      toast.success("Password reset email sent!");
    } catch {
      toast.error("Failed to send reset email");
    }
  };

  const handleJoinClass = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return toast.error("Enter a join code");
    setJoining(true);
    try {
      const idToken = await (user as any).getIdToken();
      const res = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Invalid join code");
        return;
      }
      toast.success("Joined class successfully!");
      window.location.reload();
    } catch {
      toast.error("Failed to join class");
    } finally {
      setJoining(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setForm({
      displayName:      profile?.displayName      || "",
      phone:            profile?.phone            || "",
      studentId:        profile?.studentId        || "",
      monthlyBudgetUSD: profile?.monthlyBudgetUSD || 0,
    });
  };

  const initials = profile?.displayName
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const isAdmin = profile?.role === "admin";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">

        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage your personal information and account settings.</p>
        </div>

        {/* Hero card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-5 overflow-hidden">
          {/* Banner */}
          <div className="h-24 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

          <div className="px-6 pb-5">
            {/* Avatar row */}
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-4 ring-white shadow-md shrink-0">
                <span className="text-white text-2xl font-bold">{initials}</span>
              </div>
              <Button
                variant={editing ? "secondary" : "primary"}
                onClick={editing ? handleCancel : () => setEditing(true)}
                className="mb-1"
              >
                {editing ? (
                  <><X size={15} /> Cancel</>
                ) : (
                  <><Pencil size={15} /> Edit Profile</>
                )}
              </Button>
            </div>

            {/* Name & meta */}
            <h2 className="text-xl font-bold text-gray-900">
              {profile?.displayName || "Student"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{profile?.email}</p>

            <div className="flex items-center gap-2 mt-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                isAdmin ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
              }`}>
                {isAdmin ? "👑 Admin" : "🎓 Student"}
              </span>
              {profile?.studentId && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
                  ID: {profile.studentId}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-5">
          <div className="px-6 pt-5 pb-1 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Personal Information</h3>
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="px-6 pt-4 pb-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 mt-6">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <Input
                  label="Full Name *"
                  placeholder="Your full name"
                  value={form.displayName}
                  onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))}
                />
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 mt-6">
                  <Mail className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    value={profile?.email || ""}
                    disabled
                    className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400">Email cannot be changed</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center shrink-0 mt-6">
                  <Phone className="w-4 h-4 text-green-600" />
                </div>
                <Input
                  label="Phone Number"
                  placeholder="e.g. 012 345 678"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 mt-6">
                  <IdCard className="w-4 h-4 text-amber-600" />
                </div>
                <Input
                  label="Student ID"
                  placeholder="e.g. 2024001"
                  value={form.studentId}
                  onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))}
                />
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 mt-6">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-sm font-medium text-gray-700">Monthly Budget (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                    <input
                      type="number" min="0" step="1"
                      placeholder="0"
                      value={form.monthlyBudgetUSD}
                      onChange={e => setForm(p => ({ ...p, monthlyBudgetUSD: Number(e.target.value) }))}
                      className="w-full pl-7 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <p className="text-xs text-gray-400">Used in Finance tracker to track spending limit</p>
                </div>
              </div>

              <div className="flex gap-3 mt-1 ml-12">
                <Button type="button" variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  <Save size={15} /> Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="px-6 pb-3">
              <InfoRow
                icon={<User className="w-4 h-4" />}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                label="Full Name"
                value={profile?.displayName || ""}
              />
              <InfoRow
                icon={<Mail className="w-4 h-4" />}
                iconBg="bg-gray-50"
                iconColor="text-gray-400"
                label="Email"
                value={profile?.email || ""}
                note="Cannot be changed"
              />
              <InfoRow
                icon={<Phone className="w-4 h-4" />}
                iconBg="bg-green-50"
                iconColor="text-green-600"
                label="Phone Number"
                value={profile?.phone || ""}
              />
              <InfoRow
                icon={<IdCard className="w-4 h-4" />}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
                label="Student ID"
                value={profile?.studentId || ""}
              />
              <InfoRow
                icon={<Wallet className="w-4 h-4" />}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                label="Monthly Budget"
                value={profile?.monthlyBudgetUSD ? `$${profile.monthlyBudgetUSD}` : ""}
                note="Used in Finance tracker"
              />
            </div>
          )}
        </div>

        {/* Class Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-5 px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Class</h3>
          </div>

          {profile?.classId && classInfo ? (
            <div className="space-y-0 divide-y divide-gray-50">
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-500">Class Name</span>
                <span className="text-sm font-medium text-gray-800">{classInfo.name}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-500">Major</span>
                <span className="text-sm font-medium text-gray-800">{classInfo.major}</span>
              </div>
              {isAdmin && classInfo.joinCode && (
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-500">Join Code</span>
                  <span className="text-sm font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg tracking-widest">
                    {classInfo.joinCode}
                  </span>
                </div>
              )}
            </div>
          ) : profile?.classId ? (
            <p className="text-sm text-gray-400">Loading class info…</p>
          ) : isAdmin ? (
            <p className="text-sm text-gray-500">
              Set up your class in the{" "}
              <a href="/admin" className="text-blue-600 underline">Admin Panel</a>.
            </p>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-3">You haven't joined a class yet. Enter the join code given by your class representative.</p>
              <form onSubmit={handleJoinClass} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. ABC123"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono uppercase tracking-widest outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <Button type="submit" loading={joining}>
                  <Users size={15} /> Join
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Account Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-5 px-6 py-5">
          <h3 className="font-semibold text-gray-900 mb-4">Account Details</h3>
          <div className="space-y-0 divide-y divide-gray-50">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-500">Role</span>
              <span className={`text-sm font-semibold ${isAdmin ? "text-purple-600" : "text-blue-600"}`}>
                {isAdmin ? "Administrator" : "Student"}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-500">Member since</span>
              <span className="text-sm font-medium text-gray-700">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric",
                    })
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-500">User ID</span>
              <span className="text-xs font-mono text-gray-400 truncate max-w-[180px] bg-gray-50 px-2 py-1 rounded-md">
                {user?.uid}
              </span>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center">
              <Shield className="w-4 h-4 text-gray-500" />
            </div>
            <h3 className="font-semibold text-gray-900">Security</h3>
          </div>
          <div className="flex items-center justify-between py-2 px-4 rounded-xl bg-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-700">Password</p>
              <p className="text-xs text-gray-400 mt-0.5">Last changed: unknown</p>
            </div>
            <Button variant="secondary" onClick={handlePasswordReset}>Change Password</Button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
