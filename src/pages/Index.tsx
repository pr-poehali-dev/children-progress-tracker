import { useState } from "react";
import Icon from "@/components/ui/icon";

type IconName = string;

// ─── Types ───────────────────────────────────────────────────────────────────
interface WeekEntry {
  week: string;
  score: number | null;
}

type System = 1 | 2 | 3;

interface Child {
  id: string;
  name: string;
  parentLogin: string;
  system: System;
  entries: WeekEntry[];
}

function getBarColor(score: number, system: System, prevScore: number | null): string {
  if (system === 1) {
    if (score <= 109) return "#ef4444"; // red
    if (score <= 134) return "#eab308"; // yellow
    return "#22c55e"; // green
  }
  if (system === 2) {
    if (score <= 19) return "#ef4444";
    if (score <= 29) return "#eab308";
    return "#22c55e";
  }
  // system 3 — base sky blue, compare with prev
  if (prevScore === null) return "#38bdf8"; // sky
  if (score > prevScore) return "#22c55e"; // growth = green
  if (score < prevScore) return "#ef4444"; // drop = red
  return "#38bdf8"; // same = sky
}

// ─── Initial demo data ────────────────────────────────────────────────────────
const INITIAL_CHILDREN: Child[] = [
  {
    id: "1",
    name: "Король Улына",
    parentLogin: "korol",
    system: 1,
    entries: [
      { week: "08 сент", score: 203 },
      { week: "15 сент", score: 228 },
      { week: "22 сент", score: 203 },
      { week: "29 сент", score: 203 },
      { week: "06 окт", score: 215 },
      { week: "13 окт", score: 191 },
      { week: "20 окт", score: 218 },
      { week: "27 окт", score: 210 },
      { week: "03 ноя", score: 97 },
      { week: "10 ноя", score: null },
      { week: "17 ноя", score: 165 },
    ],
  },
  {
    id: "2",
    name: "Омарова Сара",
    parentLogin: "omarova",
    system: 1,
    entries: [
      { week: "08 сент", score: 190 },
      { week: "15 сент", score: 228 },
      { week: "22 сент", score: 215 },
      { week: "29 сент", score: 203 },
      { week: "06 окт", score: 238 },
      { week: "13 окт", score: 210 },
      { week: "20 окт", score: 216 },
      { week: "27 окт", score: 192 },
      { week: "03 ноя", score: 0 },
      { week: "10 ноя", score: null },
      { week: "17 ноя", score: 168 },
    ],
  },
  {
    id: "3",
    name: "Потапова Элина",
    parentLogin: "potapova",
    system: 1,
    entries: [
      { week: "08 сент", score: 150 },
      { week: "15 сент", score: 168 },
      { week: "22 сент", score: 94 },
      { week: "29 сент", score: 145 },
      { week: "06 окт", score: 161 },
      { week: "13 окт", score: 128 },
      { week: "20 окт", score: 63 },
      { week: "27 окт", score: 121 },
      { week: "03 ноя", score: 60 },
      { week: "10 ноя", score: null },
      { week: "17 ноя", score: 129 },
    ],
  },
  {
    id: "4",
    name: "Романов Матфей",
    parentLogin: "romanov",
    system: 1,
    entries: [
      { week: "08 сент", score: 84 },
      { week: "15 сент", score: 89 },
      { week: "22 сент", score: 33 },
      { week: "29 сент", score: 51 },
      { week: "06 окт", score: 72 },
      { week: "13 окт", score: 58 },
      { week: "20 окт", score: 19 },
      { week: "27 окт", score: 39 },
      { week: "03 ноя", score: 12 },
      { week: "10 ноя", score: null },
      { week: "17 ноя", score: 38 },
    ],
  },
];

const STORAGE_KEY = "school_children_data";

function loadData(): Child[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    void e;
  }
  return INITIAL_CHILDREN;
}

function saveData(data: Child[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
const CHART_H = 160; // px — фиксированная высота области столбцов

function BarChart({ entries, system }: { entries: WeekEntry[]; system: System }) {
  const valid = entries.filter((e) => e.score !== null && e.score >= 0);
  if (valid.length === 0) return <p className="text-muted-foreground text-sm py-4">Нет данных</p>;

  const max = Math.max(...valid.map((e) => e.score as number), 1);

  // legend labels
  const legendItems =
    system === 1
      ? [{ color: "#22c55e", label: "≥135" }, { color: "#eab308", label: "110–134" }, { color: "#ef4444", label: "0–109" }]
      : system === 2
      ? [{ color: "#22c55e", label: "≥30" }, { color: "#eab308", label: "20–29" }, { color: "#ef4444", label: "0–19" }]
      : [{ color: "#22c55e", label: "Рост" }, { color: "#38bdf8", label: "Без изм." }, { color: "#ef4444", label: "Снижение" }];

  return (
    <div>
      {/* Legend */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {legendItems.map((l, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color }} />
            <span className="text-xs text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${entries.length * 28}px` }}>
          <div className="flex items-end gap-0.5" style={{ height: `${CHART_H}px` }}>
            {entries.map((e, i) => {
              const isEmpty = e.score === null;
              const score = e.score ?? 0;
              const barH = isEmpty ? 4 : Math.max(Math.round((score / max) * CHART_H), 4);

              let prevScore: number | null = null;
              if (system === 3 && i > 0) {
                for (let j = i - 1; j >= 0; j--) {
                  if (entries[j].score !== null) { prevScore = entries[j].score; break; }
                }
              }

              const color = isEmpty ? "#e2e8f0" : getBarColor(score, system, prevScore);

              return (
                <div
                  key={i}
                  className="flex flex-col items-center"
                  style={{ width: "24px", flexShrink: 0, height: `${CHART_H}px`, justifyContent: "flex-end" }}
                >
                  <div
                    className="rounded-t-sm transition-all duration-500"
                    style={{ width: "18px", height: `${barH}px`, backgroundColor: color, minHeight: "4px" }}
                  />
                </div>
              );
            })}
          </div>
          {/* Week labels */}
          <div className="flex gap-0.5 mt-1">
            {entries.map((e, i) => (
              <div key={i} style={{ width: "24px", flexShrink: 0 }} className="text-center">
                <span className="text-[8px] text-muted-foreground leading-tight" style={{ display: "block", wordBreak: "break-word" }}>
                  {e.week}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin View ───────────────────────────────────────────────────────────────
function AdminView({ onBack }: { onBack: () => void }) {
  const [children, setChildren] = useState<Child[]>(loadData);
  const [selected, setSelected] = useState<string>(children[0]?.id ?? "");
  const [newChildName, setNewChildName] = useState("");
  const [newChildLogin, setNewChildLogin] = useState("");
  const [addingChild, setAddingChild] = useState(false);
  const [newWeek, setNewWeek] = useState("");
  const [saved, setSaved] = useState(false);

  const child = children.find((c) => c.id === selected);

  const updateScore = (weekIdx: number, val: string) => {
    const num = val === "" ? null : Number(val);
    setChildren((prev) =>
      prev.map((c) =>
        c.id !== selected
          ? c
          : {
              ...c,
              entries: c.entries.map((e, i) =>
                i === weekIdx ? { ...e, score: num } : e
              ),
            }
      )
    );
  };

  const addWeek = () => {
    if (!newWeek.trim()) return;
    setChildren((prev) =>
      prev.map((c) => ({
        ...c,
        entries: [...c.entries, { week: newWeek.trim(), score: null }],
      }))
    );
    setNewWeek("");
  };

  const updateSystem = (sys: System) => {
    setChildren((prev) =>
      prev.map((c) => (c.id !== selected ? c : { ...c, system: sys }))
    );
  };

  const addChild = () => {
    if (!newChildName.trim() || !newChildLogin.trim()) return;
    const newC: Child = {
      id: Date.now().toString(),
      name: newChildName.trim(),
      parentLogin: newChildLogin.trim().toLowerCase(),
      system: 1,
      entries: children[0]?.entries.map((e) => ({ week: e.week, score: null })) ?? [],
    };
    setChildren((prev) => [...prev, newC]);
    setSelected(newC.id);
    setNewChildName("");
    setNewChildLogin("");
    setAddingChild(false);
  };

  const handleSave = () => {
    saveData(children);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white soft-shadow sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Icon name="ArrowLeft" size={20} className="text-muted-foreground" />
            </button>
            <span className="text-lg">🏫</span>
            <p className="font-bold text-foreground">Администратор — баллы</p>
          </div>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              saved ? "bg-emerald-500 text-white" : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            <Icon name={saved ? "Check" : "Save"} size={15} />
            {saved ? "Сохранено!" : "Сохранить"}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-5">
        {/* Sidebar — child list */}
        <aside className="md:w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl soft-shadow p-3 space-y-1">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  selected === c.id
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-foreground hover:bg-muted/60"
                }`}
              >
                <p className="truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">@{c.parentLogin}</p>
              </button>
            ))}

            {addingChild ? (
              <div className="pt-2 space-y-2">
                <input
                  autoFocus
                  placeholder="Имя ребёнка"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm outline-none focus:border-blue-300"
                />
                <input
                  placeholder="Логин родителя"
                  value={newChildLogin}
                  onChange={(e) => setNewChildLogin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addChild()}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm outline-none focus:border-blue-300"
                />
                <div className="flex gap-2">
                  <button onClick={addChild} className="flex-1 py-2 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors">
                    Добавить
                  </button>
                  <button onClick={() => setAddingChild(false)} className="flex-1 py-2 bg-muted text-muted-foreground text-xs rounded-lg hover:bg-muted/80 transition-colors">
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingChild(true)}
                className="w-full py-2 mt-1 rounded-xl border-2 border-dashed border-blue-200 text-blue-400 text-xs font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
              >
                <Icon name="Plus" size={13} />
                Добавить ребёнка
              </button>
            )}
          </div>
        </aside>

        {/* Main — scores table */}
        <div className="flex-1 min-w-0">
          {child ? (
            <div className="bg-white rounded-2xl soft-shadow p-5">
              <h2 className="font-bold text-lg text-foreground mb-1">{child.name}</h2>
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <p className="text-xs text-muted-foreground">Логин родителя: <span className="font-mono font-semibold text-foreground">@{child.parentLogin}</span></p>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground mr-1">Система:</span>
                  {([1, 2, 3] as System[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateSystem(s)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                        child.system === s
                          ? "bg-blue-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {child.entries.map((e, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-20 flex-shrink-0">{e.week}</span>
                    <input
                      type="number"
                      min={0}
                      value={e.score ?? ""}
                      onChange={(ev) => updateScore(i, ev.target.value)}
                      placeholder="—"
                      className="w-24 px-3 py-2 rounded-xl border border-border text-sm font-semibold text-foreground outline-none focus:border-blue-400 transition-colors text-center"
                    />
                    {e.score !== null && (
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-48">
                        <div
                          className="h-full bg-blue-400 rounded-full transition-all"
                          style={{
                            width: `${Math.min((e.score / Math.max(...child.entries.filter(x => x.score !== null).map(x => x.score as number), 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add week */}
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                <input
                  placeholder="Название недели (напр. «25 ноя»)"
                  value={newWeek}
                  onChange={(e) => setNewWeek(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addWeek()}
                  className="flex-1 px-3 py-2 rounded-xl border border-border text-sm outline-none focus:border-blue-300 transition-colors"
                />
                <button
                  onClick={addWeek}
                  className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-1.5"
                >
                  <Icon name="Plus" size={15} />
                  Добавить неделю
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl soft-shadow p-10 text-center text-muted-foreground">
              Выберите ребёнка слева
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Parent View ──────────────────────────────────────────────────────────────
function ParentView({ onBack }: { onBack: () => void }) {
  const [login, setLogin] = useState("");
  const [child, setChild] = useState<Child | null>(null);
  const [error, setError] = useState("");

  const handleLogin = () => {
    const data = loadData();
    const found = data.find((c) => c.parentLogin.toLowerCase() === login.trim().toLowerCase());
    if (found) {
      setChild(found);
      setError("");
    } else {
      setError("Логин не найден. Уточните у администратора.");
    }
  };

  if (!child) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-white soft-shadow">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Icon name="ArrowLeft" size={20} className="text-muted-foreground" />
            </button>
            <span className="text-lg">👨‍👩‍👧</span>
            <p className="font-bold text-foreground">Кабинет родителя</p>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl soft-shadow-lg p-8 w-full max-w-sm animate-fade-in">
            <div className="text-4xl text-center mb-4">🔑</div>
            <h2 className="text-xl font-bold text-foreground text-center mb-1">Вход для родителей</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">Введите логин, который выдал администратор</p>
            <input
              autoFocus
              placeholder="Ваш логин"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-3 rounded-xl border border-border text-sm outline-none focus:border-violet-400 transition-colors mb-3 text-center font-mono"
            />
            {error && <p className="text-xs text-red-500 text-center mb-3">{error}</p>}
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-violet-500 text-white font-semibold rounded-xl hover:bg-violet-600 transition-colors"
            >
              Войти
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white soft-shadow sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => setChild(null)} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <Icon name="ArrowLeft" size={20} className="text-muted-foreground" />
          </button>
          <span className="text-lg">👨‍👩‍👧</span>
          <div>
            <p className="font-bold text-foreground leading-tight">{child.name}</p>
            <p className="text-xs text-muted-foreground">Успеваемость по неделям</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl soft-shadow p-6">
          <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
            <Icon name="BarChart3" size={18} className="text-violet-500" />
            Баллы по неделям
          </h3>
          <BarChart entries={child.entries} system={child.system} />
        </div>

        {/* Week detail list */}
        <div className="mt-4 bg-white rounded-2xl soft-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4">Подробно</h3>
          <div className="space-y-1.5">
            {child.entries.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{e.week}</span>
                <span className={`text-sm font-bold ${
                  e.score === null ? "text-muted-foreground" :
                  e.score === 0 ? "text-red-400" :
                  (e.score >= 150) ? "text-emerald-600" :
                  "text-foreground"
                }`}>
                  {e.score !== null ? `${e.score} б.` : "нет данных"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Index() {
  const [view, setView] = useState<"home" | "admin" | "parent">("home");

  if (view === "admin") return <AdminView onBack={() => setView("home")} />;
  if (view === "parent") return <ParentView onBack={() => setView("home")} />;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-100/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10 text-center mb-10" style={{ animation: "fadeIn 0.5s ease-out both" }}>
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl soft-shadow-lg mb-5 text-4xl">
          🏫
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-2">ШколаПро</h1>
        <p className="text-muted-foreground">Система учёта баллов</p>
      </div>

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {[
          {
            key: "admin" as const,
            emoji: "🏫",
            title: "Администратор",
            desc: "Вносить баллы по детям за каждую неделю",
            color: "from-blue-100 to-blue-50",
            accent: "bg-blue-500 hover:bg-blue-600",
            delay: "0.15s",
          },
          {
            key: "parent" as const,
            emoji: "👨‍👩‍👧",
            title: "Родитель",
            desc: "Смотреть динамику баллов своего ребёнка",
            color: "from-violet-100 to-violet-50",
            accent: "bg-violet-500 hover:bg-violet-600",
            delay: "0.25s",
          },
        ].map((r) => (
          <button
            key={r.key}
            onClick={() => setView(r.key)}
            className={`bg-gradient-to-br ${r.color} border-2 border-white rounded-3xl p-7 text-left soft-shadow hover-lift transition-all`}
            style={{ animation: `fadeIn 0.5s ease-out ${r.delay} both` }}
          >
            <div className="text-3xl mb-3">{r.emoji}</div>
            <h3 className="text-lg font-bold text-foreground mb-1">{r.title}</h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{r.desc}</p>
            <div className={`${r.accent} text-white text-sm font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2 transition-colors`}>
              Войти
              <Icon name="ArrowRight" size={15} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}