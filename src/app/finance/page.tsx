"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getUserExpenses, createExpense, deleteExpense } from "@/lib/firestore";
import { Expense, ExpenseCategory } from "@/types";
import { Wallet, Plus, X, Trash2, TrendingDown, DollarSign, Settings, ChevronDown, Download } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const EXCHANGE_RATE = 4100;

const CATEGORIES: { value: ExpenseCategory; emoji: string; label: string; color: string; bg: string }[] = [
  { value: "food",          emoji: "🍜", label: "Food",          color: "#3B82F6", bg: "bg-blue-50 text-blue-700"    },
  { value: "transport",     emoji: "🚌", label: "Transport",     color: "#8B5CF6", bg: "bg-purple-50 text-purple-700" },
  { value: "housing",       emoji: "🏠", label: "Housing",       color: "#10B981", bg: "bg-green-50 text-green-700"   },
  { value: "education",     emoji: "📚", label: "Education",     color: "#F59E0B", bg: "bg-amber-50 text-amber-700"   },
  { value: "entertainment", emoji: "🎮", label: "Entertainment", color: "#EF4444", bg: "bg-red-50 text-red-700"       },
  { value: "health",        emoji: "💊", label: "Health",        color: "#06B6D4", bg: "bg-cyan-50 text-cyan-700"     },
  { value: "other",         emoji: "📦", label: "Other",         color: "#6B7280", bg: "bg-gray-100 text-gray-700"    },
];

const getCat = (val: string) => CATEGORIES.find(c => c.value === val) || CATEGORIES[CATEGORIES.length - 1];

export default function FinancePage() {
  const { user, profile } = useAuth();
  const [expenses,    setExpenses]    = useState<Expense[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [showBudget,  setShowBudget]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [budget,      setBudget]      = useState(profile?.monthlyBudgetUSD || 0);
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [rate,        setRate]        = useState(EXCHANGE_RATE);
  const [form, setForm] = useState({
    amountUSD: "", category: "food" as ExpenseCategory,
    note: "", expenseDate: new Date().toISOString().split("T")[0],
  });

  const load = async () => {
    if (!user) return;
    try { setExpenses(await getUserExpenses(user.uid)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => { setBudget(profile?.monthlyBudgetUSD || 0); }, [profile]);

  const monthly    = expenses.filter(e => e.expenseDate.startsWith(monthFilter));
  const totalUSD   = monthly.reduce((s, e) => s + e.amountUSD, 0);
  const totalKHR   = Math.round(totalUSD * rate);
  const remaining  = budget - totalUSD;
  const budgetPct  = budget > 0 ? Math.min((totalUSD / budget) * 100, 100) : 0;

  const categoryData = CATEGORIES.map(cat => ({
    name: cat.label, value: monthly.filter(e => e.category === cat.value).reduce((s, e) => s + e.amountUSD, 0),
    color: cat.color,
  })).filter(d => d.value > 0);

  const dailyMap: Record<string, number> = {};
  monthly.forEach(e => { dailyMap[e.expenseDate] = (dailyMap[e.expenseDate] || 0) + e.amountUSD; });
  const dailyData = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ day: date.slice(8), amount: parseFloat(amount.toFixed(2)) }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const usd = parseFloat(form.amountUSD);
    if (!usd || usd <= 0) return toast.error("Please enter a valid amount");
    if (!form.expenseDate) return toast.error("Please select a date");
    setSaving(true);
    try {
      await createExpense({
        userId: user!.uid, amountUSD: usd, amountKHR: Math.round(usd * rate),
        exchangeRate: rate, category: form.category, note: form.note,
        expenseDate: form.expenseDate, createdAt: new Date().toISOString(),
      });
      toast.success("Expense added!");
      setShowModal(false);
      setForm({ amountUSD: "", category: "food", note: "", expenseDate: new Date().toISOString().split("T")[0] });
      load();
    } catch { toast.error("Failed to add expense"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    try { await deleteExpense(id); toast.success("Deleted!"); load(); }
    catch { toast.error("Failed to delete"); }
  };

  const exportCSV = () => {
    const header = ["Date", "Category", "Amount (USD)", "Amount (KHR)", "Note"];
    const rows = expenses.map(e => {
      const cat = getCat(e.category);
      return [e.expenseDate, cat.label, e.amountUSD.toFixed(2), e.amountKHR, e.note || ""];
    });
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "expenses.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleSaveBudget = async () => {
    try {
      const { updateUserProfile } = await import("@/lib/firestore");
      await updateUserProfile(user!.uid, { monthlyBudgetUSD: budget });
      toast.success("Budget saved!");
      setShowBudget(false);
    } catch { toast.error("Failed to save budget"); }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Track your expenses in USD & KHR</p>
        </div>
        <div className="flex gap-2">
          {expenses.length > 0 && (
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors">
              <Download size={15} /> Export CSV
            </button>
          )}
          <Button variant="secondary" onClick={() => setShowBudget(true)}>
            <Settings size={15} /> Budget
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Expense
          </Button>
        </div>
      </div>

      {/* Month + Rate pickers */}
      <div className="flex items-end gap-4 mb-6 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Month</label>
          <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Exchange Rate (1 USD = ? KHR)</label>
          <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 w-36 bg-white" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: DollarSign, label: "Spent (USD)",     value: `$${totalUSD.toFixed(2)}`,          bg: "bg-blue-50",   iconColor: "text-blue-600"   },
          { icon: Wallet,     label: "Spent (KHR)",     value: `៛${totalKHR.toLocaleString()}`,    bg: "bg-purple-50", iconColor: "text-purple-600" },
          { icon: Wallet,     label: "Remaining",       value: budget > 0 ? `$${remaining.toFixed(2)}` : "No budget", bg: remaining < 0 ? "bg-red-50" : "bg-green-50", iconColor: remaining < 0 ? "text-red-600" : "text-green-600" },
          { icon: TrendingDown, label: "Transactions",  value: monthly.length,                     bg: "bg-amber-50",  iconColor: "text-amber-600"  },
        ].map(({ icon: Icon, label, value, bg, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <p className={`text-2xl font-bold ${iconColor}`}>{loading ? "—" : value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Budget Progress */}
      {budget > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Monthly Budget: ${budget}</p>
            <p className={`text-sm font-bold ${budgetPct >= 90 ? "text-red-600" : budgetPct >= 70 ? "text-amber-600" : "text-green-600"}`}>
              {budgetPct.toFixed(0)}% used
            </p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className={`h-2.5 rounded-full transition-all duration-500 ${budgetPct >= 90 ? "bg-red-500" : budgetPct >= 70 ? "bg-amber-500" : "bg-green-500"}`}
              style={{ width: `${budgetPct}%` }} />
          </div>
          {budgetPct >= 90 && (
            <p className="text-xs text-red-500 mt-2 font-medium">⚠️ You have used {budgetPct.toFixed(0)}% of your budget!</p>
          )}
        </div>
      )}

      {/* Charts */}
      {monthly.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Daily Spending (USD)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => [`$${v}`, "Amount"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }} />
                <Bar dataKey="amount" fill="#3B82F6" radius={[6,6,0,0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">By Category</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [`$${v.toFixed(2)}`, "Amount"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #E5E7EB" }} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Expense List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            {new Date(monthFilter + "-01").toLocaleString("default", { month: "long", year: "numeric" })}
          </h2>
          <span className="text-sm text-gray-400">{monthly.length} transactions</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : monthly.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
              <Wallet className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm font-medium">No expenses this month</p>
            <Button className="mt-4" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Add First Expense
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {monthly.map(expense => {
              const cat = getCat(expense.category);
              return (
                <li key={expense.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 text-xl">
                    {cat.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.bg}`}>{cat.label}</span>
                      {expense.note && <span className="text-xs text-gray-400 truncate">{expense.note}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{expense.expenseDate}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900">${expense.amountUSD.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">៛{expense.amountKHR.toLocaleString()}</p>
                  </div>
                  <button onClick={() => handleDelete(expense.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Add Expense</h2>
                <p className="text-sm text-gray-400 mt-0.5">Track a new spending</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              {/* Amount */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Amount (USD) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input type="number" step="0.01" min="0" placeholder="0.00" value={form.amountUSD}
                    onChange={e => setForm(p => ({ ...p, amountUSD: e.target.value }))}
                    className="w-full pl-7 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
                {form.amountUSD && (
                  <p className="text-xs text-gray-400">≈ ៛{Math.round(parseFloat(form.amountUSD) * rate).toLocaleString()} KHR</p>
                )}
              </div>

              {/* Category grid */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Category *</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.value} type="button" onClick={() => setForm(p => ({ ...p, category: cat.value }))}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs transition-all ${
                        form.category === cat.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:bg-gray-50 text-gray-600"
                      }`}
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="leading-none text-center text-[10px]">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Date *" type="date" value={form.expenseDate}
                  onChange={e => setForm(p => ({ ...p, expenseDate: e.target.value }))} />
                <Input label="Note" placeholder="e.g. Lunch" value={form.note}
                  onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
              </div>

              <div className="flex gap-3 mt-1">
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" fullWidth loading={saving}>Add Expense</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Monthly Budget</h2>
                <p className="text-sm text-gray-400 mt-0.5">Set your spending limit</p>
              </div>
              <button onClick={() => setShowBudget(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Budget (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input type="number" min="0" step="1" value={budget} onChange={e => setBudget(Number(e.target.value))}
                    className="w-full pl-7 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
                {budget > 0 && (
                  <p className="text-xs text-gray-400">≈ ៛{Math.round(budget * rate).toLocaleString()} KHR/month</p>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowBudget(false)}>Cancel</Button>
                <Button fullWidth onClick={handleSaveBudget}>Save Budget</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
