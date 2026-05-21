"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { GraduationCap, CheckCircle } from "lucide-react";

const perks = [
  "Free to use — always",
  "Track courses, tasks & attendance",
  "Smart finance tracker with KHR support",
  "Never miss an upcoming event",
];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    email:       "",
    password:    "",
    confirm:     "",
    studentId:   "",
    phone:       "",
  });

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.displayName || !form.email || !form.password)
      return toast.error("Please fill in all required fields");
    if (form.password !== form.confirm)
      return toast.error("Passwords do not match");
    if (form.password.length < 6)
      return toast.error("Password must be at least 6 characters");

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.displayName });
      await createUserProfile({
        uid:         cred.user.uid,
        email:       form.email,
        displayName: form.displayName,
        role:        "student",
        studentId:   form.studentId,
        phone:       form.phone,
        createdAt:   new Date().toISOString(),
      });
      toast.success("Account created! Welcome to UniLife 🎓");
      router.push("/dashboard");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use")
        toast.error("Email already registered");
      else
        toast.error("Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[46%] bg-gradient-to-br from-[#0D2B4E] via-[#1a3f6e] to-[#1e5ba8] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-blue-500/10 rounded-full" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">UniLife</p>
            <p className="text-blue-300 text-xs mt-0.5">Student Portal</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Start your journey<br />the smart way.
          </h1>
          <p className="text-blue-200 text-base mb-10 leading-relaxed">
            Join thousands of students who use UniLife to stay organized, productive, and on top of their studies.
          </p>
          <ul className="flex flex-col gap-4">
            {perks.map(perk => (
              <li key={perk} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                <span className="text-blue-100 text-sm">{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-blue-400 text-xs relative z-10">
          Built for students, by students.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">UniLife</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h2>
          <p className="text-gray-500 text-sm mb-8">Join UniLife and take control of your student life</p>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            {/* Name + Student ID side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Input
                  label="Full Name *"
                  placeholder="Sok Dara"
                  value={form.displayName}
                  onChange={update("displayName")}
                />
              </div>
            </div>

            <Input
              label="Email *"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={update("email")}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Student ID"
                placeholder="e.g. 2024001"
                value={form.studentId}
                onChange={update("studentId")}
              />
              <Input
                label="Phone"
                placeholder="012 345 678"
                value={form.phone}
                onChange={update("phone")}
              />
            </div>

            <div className="h-px bg-gray-200 my-1" />

            <Input
              label="Password *"
              type="password"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={update("password")}
            />
            <Input
              label="Confirm Password *"
              type="password"
              placeholder="Repeat your password"
              value={form.confirm}
              onChange={update("confirm")}
            />

            <Button type="submit" fullWidth loading={loading} className="mt-1 py-3">
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-blue-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
