"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { getUserProfile } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { GraduationCap, BookOpen, Calendar, TrendingUp, Star } from "lucide-react";

const features = [
  { icon: BookOpen,   text: "Track your courses & schedule"       },
  { icon: TrendingUp, text: "Monitor attendance & performance"    },
  { icon: Calendar,   text: "Stay on top of events & deadlines"   },
  { icon: Star,       text: "Log study sessions & build streaks"  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [gLoading, setGLoading] = useState(false);

  const handleLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill in all fields");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch {
      toast.error("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await getUserProfile(result.user.uid);
      if (!profile) {
        const { createUserProfile } = await import("@/lib/firestore");
        await createUserProfile({
          uid:         result.user.uid,
          email:       result.user.email!,
          displayName: result.user.displayName || "Student",
          role:        "student",
          createdAt:   new Date().toISOString(),
        });
      }
      toast.success("Welcome!");
      router.push("/dashboard");
    } catch {
      toast.error("Google sign-in failed");
    } finally {
      setGLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f8f9fc]">

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(150deg, #0c2340 0%, #0f3060 40%, #1d4ed8 100%)" }}>

        {/* Background blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />
        <div className="absolute -bottom-24 -left-12 w-72 h-72 rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, #818cf8, transparent)" }} />
        <div className="absolute top-1/2 right-0 w-48 h-96 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent)" }} />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-[17px] leading-none">UniLife</p>
            <p className="text-blue-300/70 text-xs mt-0.5">Student Portal</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <h1 className="text-[38px] font-bold text-white leading-[1.15] mb-5 tracking-tight">
            Your student life,<br />all in one place.
          </h1>
          <p className="text-blue-200/70 text-[15px] mb-10 leading-relaxed max-w-sm">
            Manage courses, track attendance, handle finances, and never miss a deadline — from one beautiful dashboard.
          </p>
          <ul className="flex flex-col gap-3.5">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(99,102,241,0.2)" }}>
                  <Icon className="w-4 h-4 text-indigo-300" />
                </div>
                <span className="text-blue-100/80 text-[13px]">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-blue-400/50 text-xs relative z-10">Built for students, by students.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg">UniLife</span>
          </div>

          <h2 className="text-[26px] font-bold text-slate-900 mb-1 tracking-tight">Welcome back</h2>
          <p className="text-slate-500 text-[14px] mb-8">Sign in to your student account</p>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={gLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium text-slate-700 bg-white border border-[#e2e8f0] hover:border-[#c7d2fe] hover:bg-slate-50 transition-all duration-150 mb-5 disabled:opacity-50"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            {gLoading ? (
              <span className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#e8ecf4]" />
            <span className="text-[11px] text-slate-400 font-medium">or with email</span>
            <div className="flex-1 h-px bg-[#e8ecf4]" />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <Button type="submit" fullWidth loading={loading} className="mt-2 py-3 text-[14px]">
              Sign In
            </Button>
          </form>

          <p className="text-center text-[13px] text-slate-500 mt-7">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-blue-600 font-semibold hover:text-blue-700">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
