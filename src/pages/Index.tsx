import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import * as XLSX from "xlsx";
import ProgressView from "@/pages/Progress";

type IconName = string;

// ─── Types ───────────────────────────────────────────────────────────────────
interface WeekEntry {
  week: string;
  score: number | null;
  best?: boolean;
}

type System = 1 | 2 | 3;

interface Child {
  id: string;
  name: string;
  parentLogin: string;
  system: System;
  entries: WeekEntry[];
}

// attendance[weekIndex] = { maxLessons: number, children: { [childId]: number | null } }
interface WeekAttendance {
  maxLessons: number | null;
  children: Record<string, number | null>;
}

function getBarColor(score: number, system: System, prevScore: number | null): string {
  if (system === 1) {
    if (score <= 109) return "#bb393b";
    if (score <= 134) return "#f6d60d";
    return "#2db400";
  }
  if (system === 2) {
    if (score <= 19) return "#bb393b";
    if (score <= 29) return "#f6d60d";
    return "#2db400";
  }
  if (prevScore === null) return "#f6d60d";
  if (score > prevScore) return "#2db400";
  if (score < prevScore) return "#bb393b";
  return "#f6d60d";
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}
function adjustColor(hex: string, factor: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}

// ─── API ──────────────────────────────────────────────────────────────────────
const SCHOOL_DATA_URL = "https://functions.poehali.dev/4dcdd9ba-ced0-44ef-bf2a-2102fd80ff12";

async function apiGetChildren(): Promise<Child[]> {
  const res = await fetch(`${SCHOOL_DATA_URL}?type=children`);
  const data = await res.json();
  return data.children ?? [];
}

async function apiGetAttendance(): Promise<WeekAttendance[]> {
  const res = await fetch(`${SCHOOL_DATA_URL}?type=attendance`);
  const data = await res.json();
  return data.attendance ?? [];
}

async function apiSaveAll(children: Child[], attendance: WeekAttendance[]): Promise<void> {
  await fetch(`${SCHOOL_DATA_URL}?type=all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ children, attendance }),
  });
}

const STORAGE_KEY = "school_children_data";
const ATTENDANCE_KEY = "school_attendance_data";

function loadLocalChildren(): Child[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { void e; }
  return [];
}

function loadLocalAttendance(): WeekAttendance[] {
  try {
    const raw = localStorage.getItem(ATTENDANCE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { void e; }
  return [];
}



function buildAttendance(weeks: string[], children: Child[], stored: WeekAttendance[]): WeekAttendance[] {
  return weeks.map((_, wi) => {
    const existing = stored[wi] ?? { maxLessons: null, children: {} };
    const childMap: Record<string, number | null> = {};
    children.forEach((c) => {
      childMap[c.id] = existing.children?.[c.id] ?? null;
    });
    return { maxLessons: existing.maxLessons ?? null, children: childMap };
  });
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
const CHART_H = 160; // px — фиксированная высота области столбцов

function BarChart({
  entries,
  system,
  childId,
  attendance,
  scrollToEnd = false,
}: {
  entries: WeekEntry[];
  system: System;
  childId?: string;
  attendance?: WeekAttendance[];
  scrollToEnd?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToEnd && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [scrollToEnd, entries]);

  const valid = entries.filter((e) => e.score !== null && e.score >= 0);
  if (valid.length === 0) return <p className="text-muted-foreground text-sm py-4">Нет данных</p>;

  const max = Math.max(...valid.map((e) => e.score as number), 1);

  const legendItems =
    system === 1
      ? [{ color: "#2db400", label: "≥135" }, { color: "#f6d60d", label: "110–134" }, { color: "#bb393b", label: "0–109" }]
      : system === 2
      ? [{ color: "#2db400", label: "≥30" }, { color: "#f6d60d", label: "20–29" }, { color: "#bb393b", label: "0–19" }]
      : [{ color: "#2db400", label: "Рост" }, { color: "#f6d60d", label: "Без изм." }, { color: "#bb393b", label: "Снижение" }];

  const COL_W = 36;

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
      <div ref={scrollRef} className="overflow-x-auto">
        <div style={{ minWidth: `${entries.length * COL_W}px` }}>

          {/* Best badge + Scores above bars */}
          <div className="flex gap-0.5 mb-0.5">
            {entries.map((e, i) => (
              <div key={i} style={{ width: `${COL_W}px`, flexShrink: 0 }} className="flex flex-col items-center gap-0.5">
                {e.best ? (
                  <span
                    className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md text-[8px] font-bold leading-tight whitespace-nowrap"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #d97706 100%)",
                      color: "#fff",
                      boxShadow: "0 1px 4px rgba(245,158,11,0.5)",
                    }}
                  >
                    ★ Лучший
                  </span>
                ) : (
                  <span className="text-[9px] font-semibold text-foreground leading-tight">
                    {e.score !== null ? e.score : ""}
                  </span>
                )}
                {e.best && (
                  <span className="text-[9px] font-bold text-amber-600 leading-tight">
                    {e.score !== null ? e.score : ""}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Bars */}
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

              const baseColor = isEmpty ? "#cbd5e1" : getBarColor(score, system, prevScore);
              const frontColor = baseColor;
              const sideColor = adjustColor(baseColor, 0.62);
              const topColor = adjustColor(baseColor, 1.18);

              const BAR_W = 20;
              const D = 8; // глубина 3D

              // SVG-параллелепипед: передняя + правая боковая + верхняя грань
              const totalW = BAR_W + D;
              const totalH = barH + D;

              // Точки граней
              // Передняя: (0, D) → (BAR_W, D) → (BAR_W, totalH) → (0, totalH)
              // Правая: (BAR_W, D) → (totalW, 0) → (totalW, barH) → (BAR_W, totalH)
              // Верхняя: (0, D) → (D, 0) → (totalW, 0) → (BAR_W, D)

              return (
                <div
                  key={i}
                  className="flex flex-col items-center"
                  style={{ width: `${COL_W}px`, flexShrink: 0, height: `${CHART_H}px`, justifyContent: "flex-end" }}
                >
                  <svg
                    width={totalW}
                    height={totalH}
                    style={{
                      display: "block",
                      filter: e.best ? "drop-shadow(0 0 6px rgba(245,158,11,0.8))" : "drop-shadow(0 3px 6px rgba(0,0,0,0.22))",
                      overflow: "visible",
                    }}
                  >
                    {/* Передняя грань */}
                    <polygon
                      points={`0,${D} ${BAR_W},${D} ${BAR_W},${totalH} 0,${totalH}`}
                      fill={frontColor}
                    />
                    {/* Правая боковая грань */}
                    <polygon
                      points={`${BAR_W},${D} ${totalW},0 ${totalW},${barH} ${BAR_W},${totalH}`}
                      fill={sideColor}
                    />
                    {/* Верхняя грань */}
                    <polygon
                      points={`0,${D} ${D},0 ${totalW},0 ${BAR_W},${D}`}
                      fill={topColor}
                    />
                  </svg>
                </div>
              );
            })}
          </div>

          {/* Attendance % below bars */}
          <div className="flex gap-0.5 mt-0.5">
            {entries.map((_, i) => {
              let pctLabel = "";
              if (childId && attendance && attendance[i]) {
                const w = attendance[i];
                const childVal = w.children?.[childId] ?? null;
                const maxL = w.maxLessons ?? null;
                if (childVal !== null && maxL !== null && maxL > 0) {
                  pctLabel = `${Math.round((childVal / maxL) * 100)}%`;
                }
              }
              const isLow = pctLabel !== "" && parseInt(pctLabel) < 80;
              const isMid = pctLabel !== "" && parseInt(pctLabel) >= 80 && parseInt(pctLabel) < 100;
              return (
                <div key={i} style={{ width: `${COL_W}px`, flexShrink: 0 }} className="text-center">
                  <span
                    className={`text-[9px] font-semibold leading-tight ${
                      isLow ? "text-red-500" : isMid ? "text-yellow-600" : pctLabel ? "text-emerald-600" : "text-muted-foreground"
                    }`}
                  >
                    {pctLabel || ""}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Week labels */}
          <div className="flex gap-0.5 mt-0.5">
            {entries.map((e, i) => (
              <div key={i} style={{ width: `${COL_W}px`, flexShrink: 0 }} className="text-center">
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
  const [children, setChildren] = useState<Child[]>([]);
  const [newWeek, setNewWeek] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingChild, setAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildLogin, setNewChildLogin] = useState("");

  // все недели берём из первого ребёнка (они синхронны)
  const weeks = children[0]?.entries.map((e) => e.week) ?? [];

  // ── Посещаемость ──
  const [attendance, setAttendance] = useState<WeekAttendance[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let ch = await apiGetChildren();
        let att = await apiGetAttendance();
        if (ch.length === 0) {
          const local = loadLocalChildren();
          if (local.length > 0) {
            ch = local;
            const localAtt = loadLocalAttendance();
            att = localAtt.length > 0 ? localAtt : buildAttendance(ch[0]?.entries.map(e => e.week) ?? [], ch, []);
            await apiSaveAll(ch, att);
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(ATTENDANCE_KEY);
          }
        }
        setChildren(ch);
        const w = ch[0]?.entries.map(e => e.week) ?? [];
        setAttendance(buildAttendance(w, ch, att));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const syncAttendanceSize = (newWeeks: string[], newChildren: Child[], prevAtt: WeekAttendance[]) =>
    buildAttendance(newWeeks, newChildren, prevAtt);

  const updateMaxLessons = (wi: number, val: string) => {
    const num = val === "" ? null : Number(val);
    setAttendance((prev) => prev.map((w, i) => (i === wi ? { ...w, maxLessons: num } : w)));
  };

  const updateAttendance = (wi: number, childId: string, val: string) => {
    const num = val === "" ? null : Number(val);
    setAttendance((prev) =>
      prev.map((w, i) =>
        i === wi ? { ...w, children: { ...w.children, [childId]: num } } : w
      )
    );
  };

  const updateScore = (childId: string, weekIdx: number, val: string) => {
    const num = val === "" ? null : Number(val);
    setChildren((prev) =>
      prev.map((c) =>
        c.id !== childId
          ? c
          : { ...c, entries: c.entries.map((e, i) => (i === weekIdx ? { ...e, score: num } : e)) }
      )
    );
  };

  const toggleBest = (childId: string, weekIdx: number) => {
    setChildren((prev) =>
      prev.map((c) =>
        c.id !== childId
          ? c
          : { ...c, entries: c.entries.map((e, i) => (i === weekIdx ? { ...e, best: !e.best } : e)) }
      )
    );
  };

  const updateSystem = (childId: string, sys: System) => {
    setChildren((prev) =>
      prev.map((c) => (c.id !== childId ? c : { ...c, system: sys }))
    );
  };

  const addWeek = () => {
    if (!newWeek.trim()) return;
    const newChildren = children.map((c) => ({ ...c, entries: [...c.entries, { week: newWeek.trim(), score: null }] }));
    const newWeeks = [...weeks, newWeek.trim()];
    setChildren(newChildren);
    setAttendance((prev) => syncAttendanceSize(newWeeks, newChildren, prev));
    setNewWeek("");
  };

  const addChild = () => {
    if (!newChildName.trim() || !newChildLogin.trim()) return;
    const newC: Child = {
      id: Date.now().toString(),
      name: newChildName.trim(),
      parentLogin: newChildLogin.trim().toLowerCase(),
      system: 1,
      entries: weeks.map((w) => ({ week: w, score: null })),
    };
    const newChildren = [...children, newC];
    setChildren(newChildren);
    setAttendance((prev) => syncAttendanceSize(weeks, newChildren, prev));
    setNewChildName("");
    setNewChildLogin("");
    setAddingChild(false);
  };

  const handleSave = async () => {
    await apiSaveAll(children, attendance);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const [importError, setImportError] = useState<string | null>(null);
  const [importOk, setImportOk] = useState<string | null>(null);
  const fileRef1 = useRef<HTMLInputElement>(null);
  const fileRef2 = useRef<HTMLInputElement>(null);

  const excelDateToStr = (val: unknown): string => {
    if (typeof val === "number" && val > 40000 && val < 60000) {
      const d = XLSX.SSF.parse_date_code(val);
      const months = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
      return `${d.d} ${months[d.m - 1]}`;
    }
    return String(val);
  };

  const parseSheet = (file: File): Promise<string[][]> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const wb = XLSX.read(ev.target?.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          const result: string[][] = rows.map((row) =>
            (row as unknown[]).map((cell) => excelDateToStr(cell))
          );
          resolve(result);
        } catch {
          reject(new Error("Не удалось прочитать файл"));
        }
      };
      reader.onerror = () => reject(new Error("Ошибка чтения файла"));
      reader.readAsArrayBuffer(file);
    });

  const handleExportTable1 = () => {
    const weeks = children[0]?.entries.map((e) => e.week) ?? [];
    const header = ["Ученик", "Логин", ...weeks];
    const dataRows = children.map((c) => [
      c.name,
      c.parentLogin,
      ...weeks.map((w) => {
        const en = c.entries.find((e) => e.week === w);
        return en?.score ?? "";
      }),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Баллы");
    XLSX.writeFile(wb, "таблица1_баллы.xlsx");
  };

  const handleExportTable2 = () => {
    const weeks = children[0]?.entries.map((e) => e.week) ?? [];
    const header = ["Ученик", ...weeks];
    const normaRow = ["Норма", ...weeks.map((_, wi) => attendance[wi]?.maxLessons ?? "")];
    const dataRows = children.map((c) => [
      c.name,
      ...weeks.map((_, wi) => attendance[wi]?.children?.[c.id] ?? ""),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, normaRow, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Посещаемость");
    XLSX.writeFile(wb, "таблица2_посещаемость.xlsx");
  };

  const handleImportTable1 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportError(null);
    try {
      const rows = await parseSheet(file);
      if (rows.length < 2) throw new Error("Таблица пустая");

      // Шапка: A=имя, B=логин, C..=недели
      const headerRow = rows[0];
      const weekCols: { name: string; idx: number }[] = [];
      for (let ci = 2; ci < headerRow.length; ci++) {
        const h = String(headerRow[ci]).trim();
        if (h) weekCols.push({ name: h, idx: ci });
      }
      if (weekCols.length === 0) throw new Error("Не найдены колонки с неделями (начиная с колонки C)");

      setChildren((prevChildren) => {
        const allWeeks = weekCols.map((w) => w.name);

        // Строим новый список детей из файла
        const newChildren: Child[] = [];
        for (let ri = 1; ri < rows.length; ri++) {
          const rowName = String(rows[ri][0]).trim();
          const rowLogin = String(rows[ri][1]).trim().toLowerCase();
          if (!rowName) continue;

          // Сохраняем id если ребёнок уже был в системе
          const existing = prevChildren.find(
            (c) => c.name.toLowerCase() === rowName.toLowerCase()
          );
          const id = existing?.id ?? `import_${Date.now()}_${ri}`;
          const login = rowLogin || existing?.parentLogin || rowName.toLowerCase().replace(/\s+/g, ".");

          const entries = allWeeks.map((w, wi) => {
            const rawVal = rows[ri][weekCols[wi].idx];
            const val = rawVal === "" || rawVal === undefined ? null : Number(rawVal);
            return { week: w, score: val !== null && !isNaN(val) ? val : null };
          });

          newChildren.push({
            id,
            name: rowName,
            parentLogin: login,
            system: existing?.system ?? 1,
            entries,
          });
        }

        apiSaveAll(newChildren, []);
        return newChildren;
      });

      setImportOk("Таблица №1 импортирована");
      setTimeout(() => setImportOk(null), 3000);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Ошибка импорта");
    }
  };

  const handleImportTable2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportError(null);
    try {
      const rows = await parseSheet(file);
      if (rows.length < 2) throw new Error("Таблица пустая");

      // Шапка: A=ученик/норма, B..=недели
      const headerRow = rows[0];
      const weekCols: { name: string; idx: number }[] = [];
      for (let ci = 1; ci < headerRow.length; ci++) {
        const h = String(headerRow[ci]).trim();
        if (h) weekCols.push({ name: h, idx: ci });
      }
      if (weekCols.length === 0) throw new Error("Не найдены колонки с неделями");

      setChildren((prevChildren) => {
        setAttendance((prevAtt) => {
          const allWeeks = prevChildren[0]?.entries.map((e) => e.week) ?? [];

          // Инициализируем чистый массив посещаемости по неделям из файла
          const newAtt: typeof prevAtt = allWeeks.map((_, i) => ({
            maxLessons: prevAtt[i]?.maxLessons ?? null,
            children: {},
          }));

          for (const { name: weekName, idx: colIdx } of weekCols) {
            const wi = allWeeks.indexOf(weekName);
            if (wi === -1) continue;

            for (let ri = 1; ri < rows.length; ri++) {
              const rowName = String(rows[ri][0]).trim();
              if (!rowName) continue;
              const rawVal = rows[ri][colIdx];
              const val = rawVal === "" || rawVal === undefined ? null : Number(rawVal);
              if (val !== null && isNaN(val)) continue;

              if (rowName.toLowerCase().includes("норм")) {
                newAtt[wi] = { ...newAtt[wi], maxLessons: val };
              } else {
                const child = prevChildren.find(
                  (c) => c.name.toLowerCase() === rowName.toLowerCase()
                );
                if (!child) continue;
                newAtt[wi] = { ...newAtt[wi], children: { ...newAtt[wi].children, [child.id]: val } };
              }
            }
          }

          apiSaveAll(prevChildren, newAtt);
          return newAtt;
        });

        return prevChildren;
      });

      setImportOk("Таблица №2 импортирована");
      setTimeout(() => setImportOk(null), 3000);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Ошибка импорта");
    }
  };

  const NAME_W = 180; // px — ширина липкой колонки с именем
  const CELL_W = 72;  // px — ширина ячейки с баллом

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Icon name="Loader2" size={32} />
        <p className="text-sm">Загружаю данные…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white soft-shadow sticky top-0 z-20">
        <div className="px-3 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors flex-shrink-0">
              <Icon name="ArrowLeft" size={20} className="text-muted-foreground" />
            </button>
            <span className="text-lg flex-shrink-0">🏫</span>
            <p className="font-bold text-foreground text-sm truncate">Администратор</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAddingChild(true)}
              title="Добавить ребёнка"
              className="p-2 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <Icon name="UserPlus" size={17} />
            </button>
            <button
              onClick={() => fileRef1.current?.click()}
              title="Импорт баллов (Табл.1)"
              className="p-2 rounded-xl text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors"
            >
              <Icon name="Upload" size={17} />
            </button>
            <button
              onClick={handleExportTable1}
              title="Экспорт баллов (Табл.1)"
              className="p-2 rounded-xl text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors"
            >
              <Icon name="Download" size={17} />
            </button>
            <button
              onClick={() => fileRef2.current?.click()}
              title="Импорт посещаемости (Табл.2)"
              className="p-2 rounded-xl text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <Icon name="Upload" size={17} />
            </button>
            <button
              onClick={handleExportTable2}
              title="Экспорт посещаемости (Табл.2)"
              className="p-2 rounded-xl text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <Icon name="Download" size={17} />
            </button>
            <input ref={fileRef1} type="file" accept=".xlsx" className="hidden" onChange={handleImportTable1} />
            <input ref={fileRef2} type="file" accept=".xlsx" className="hidden" onChange={handleImportTable2} />
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                saved ? "bg-emerald-500 text-white" : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              <Icon name={saved ? "Check" : "Save"} size={15} />
              <span className="hidden sm:inline">{saved ? "Сохранено!" : "Сохранить"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Уведомления импорта */}
      {importOk && (
        <div className="mx-4 mt-3 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-2 animate-fade-in">
          <Icon name="CheckCircle" size={15} />
          {importOk}
        </div>
      )}
      {importError && (
        <div className="mx-4 mt-3 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium flex items-center gap-2 animate-fade-in">
          <Icon name="AlertCircle" size={15} />
          {importError}
          <button onClick={() => setImportError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Модалка добавления ребёнка */}
      {addingChild && (
        <div className="fixed inset-0 bg-black/30 z-30 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl soft-shadow-lg p-6 w-full max-w-sm space-y-3">
            <h3 className="font-bold text-foreground mb-1">Новый ребёнок</h3>
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
            <div className="flex gap-2 pt-1">
              <button onClick={addChild} className="flex-1 py-2 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors">
                Добавить
              </button>
              <button onClick={() => setAddingChild(false)} className="flex-1 py-2 bg-muted text-muted-foreground text-sm rounded-xl hover:bg-muted/80 transition-colors">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="bg-white rounded-2xl soft-shadow overflow-hidden">
          {/* Таблица с горизонтальным скроллом */}
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${NAME_W + weeks.length * CELL_W + 120}px` }}>

              {/* Шапка */}
              <div className="flex border-b border-border bg-muted/40" style={{ position: "sticky", top: 0, zIndex: 10 }}>
                {/* Липкая ячейка — имя */}
                <div
                  className="flex-shrink-0 px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide border-r border-border bg-muted/40"
                  style={{ width: NAME_W, position: "sticky", left: 0, zIndex: 11, backgroundColor: "#f8fafc" }}
                >
                  Ученик
                </div>
                {/* Колонки с неделями */}
                {weeks.map((w, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 text-center px-1 py-3 text-xs font-semibold text-muted-foreground border-r border-border last:border-r-0"
                    style={{ width: CELL_W }}
                  >
                    {w}
                  </div>
                ))}
                {/* Колонка система */}
                <div className="flex-shrink-0 px-3 py-3 text-xs font-semibold text-muted-foreground text-center" style={{ width: 100 }}>
                  Система
                </div>
              </div>

              {/* Строки детей */}
              {children.map((c, ri) => (
                <div
                  key={c.id}
                  className={`flex items-center border-b border-border last:border-b-0 ${ri % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}
                >
                  {/* Липкое имя */}
                  <div
                    className="flex-shrink-0 px-4 py-2 border-r border-border"
                    style={{
                      width: NAME_W,
                      position: "sticky",
                      left: 0,
                      zIndex: 5,
                      backgroundColor: ri % 2 === 0 ? "#ffffff" : "#f8fafc",
                    }}
                  >
                    <p className="text-sm font-semibold text-foreground leading-tight truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">@{c.parentLogin}</p>
                  </div>

                  {/* Ячейки с баллами */}
                  {c.entries.map((e, wi) => (
                    <div
                      key={wi}
                      className={`flex-shrink-0 flex flex-col items-center justify-center border-r border-border last:border-r-0 py-1 px-0.5 relative transition-colors ${e.best ? "bg-amber-50" : ""}`}
                      style={{ width: CELL_W }}
                    >
                      <input
                        type="number"
                        min={0}
                        value={e.score ?? ""}
                        onChange={(ev) => updateScore(c.id, wi, ev.target.value)}
                        placeholder="—"
                        className={`w-full text-center text-sm font-semibold bg-transparent outline-none rounded-lg px-1 py-0.5 transition-all ${e.best ? "text-amber-700 hover:bg-amber-100 focus:bg-amber-100 focus:ring-1 focus:ring-amber-400" : "text-foreground hover:bg-blue-50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300"}`}
                        style={{ maxWidth: "60px" }}
                      />
                      <button
                        onClick={() => toggleBest(c.id, wi)}
                        title={e.best ? "Снять отметку лучшего" : "Отметить как лучший балл"}
                        className={`text-[10px] leading-none transition-all ${e.best ? "text-amber-500 scale-110" : "text-muted-foreground/30 hover:text-amber-400"}`}
                      >
                        ★
                      </button>
                    </div>
                  ))}

                  {/* Система */}
                  <div className="flex-shrink-0 flex items-center justify-center gap-0.5 px-2" style={{ width: 100 }}>
                    {([1, 2, 3] as System[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateSystem(c.id, s)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                          c.system === s
                            ? "bg-blue-500 text-white"
                            : "bg-muted text-muted-foreground hover:bg-blue-100 hover:text-blue-600"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

            </div>
          </div>

          {/* Добавить неделю */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-muted/20">
            <input
              placeholder="Название новой недели (напр. «25 ноя»)"
              value={newWeek}
              onChange={(e) => setNewWeek(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addWeek()}
              className="flex-1 max-w-xs px-3 py-2 rounded-xl border border-border text-sm outline-none focus:border-blue-300 bg-white transition-colors"
            />
            <button
              onClick={addWeek}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors"
            >
              <Icon name="Plus" size={15} />
              Добавить неделю
            </button>
          </div>
        </div>

        {/* ── Таблица №2 — Посещаемость ── */}
        <div className="mt-6 bg-white rounded-2xl soft-shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-emerald-50/60 flex items-center gap-2">
            <span className="text-base">📋</span>
            <p className="font-bold text-foreground text-sm">Таблица №2 — Посещаемость</p>
            <span className="text-xs text-muted-foreground ml-1">кол-во занятий в неделю</span>
          </div>

          <div className="overflow-x-auto">
            <div style={{ minWidth: `${NAME_W + weeks.length * CELL_W}px` }}>

              {/* Шапка */}
              <div className="flex border-b border-border bg-muted/40">
                <div
                  className="flex-shrink-0 px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide border-r border-border"
                  style={{ width: NAME_W, position: "sticky", left: 0, zIndex: 11, backgroundColor: "#f8fafc" }}
                >
                  Ученик
                </div>
                {weeks.map((w, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 text-center px-1 py-3 text-xs font-semibold text-muted-foreground border-r border-border last:border-r-0"
                    style={{ width: CELL_W }}
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* Строка максимума */}
              <div className="flex items-center border-b-2 border-emerald-200 bg-emerald-50">
                <div
                  className="flex-shrink-0 px-4 py-2 border-r border-emerald-200 font-semibold text-xs text-emerald-700"
                  style={{ width: NAME_W, position: "sticky", left: 0, zIndex: 5, backgroundColor: "#f0fdf4" }}
                >
                  норма посещаемости<br />
                  <span className="font-normal text-emerald-600">100%</span>
                </div>
                {weeks.map((_, wi) => (
                  <div
                    key={wi}
                    className="flex-shrink-0 flex items-center justify-center border-r border-emerald-100 last:border-r-0 py-1.5 px-1"
                    style={{ width: CELL_W }}
                  >
                    <input
                      type="number"
                      min={0}
                      value={attendance[wi]?.maxLessons ?? ""}
                      onChange={(ev) => updateMaxLessons(wi, ev.target.value)}
                      placeholder="—"
                      className="w-full text-center text-sm font-bold text-emerald-700 bg-transparent outline-none rounded-lg px-1 py-1 hover:bg-emerald-100 focus:bg-emerald-100 focus:ring-1 focus:ring-emerald-400 transition-all"
                      style={{ maxWidth: "60px" }}
                    />
                  </div>
                ))}
              </div>

              {/* Строки детей */}
              {children.map((c, ri) => (
                <div
                  key={c.id}
                  className={`flex items-center border-b border-border last:border-b-0 ${ri % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}
                >
                  <div
                    className="flex-shrink-0 px-4 py-2 border-r border-border"
                    style={{
                      width: NAME_W,
                      position: "sticky",
                      left: 0,
                      zIndex: 5,
                      backgroundColor: ri % 2 === 0 ? "#ffffff" : "#f8fafc",
                    }}
                  >
                    <p className="text-sm font-semibold text-foreground leading-tight truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">@{c.parentLogin}</p>
                  </div>

                  {weeks.map((_, wi) => {
                    const val = attendance[wi]?.children?.[c.id] ?? null;
                    const maxL = attendance[wi]?.maxLessons ?? null;
                    const pct = (val !== null && maxL !== null && maxL > 0) ? val / maxL : null;
                    const cellBg =
                      pct === null ? ""
                      : pct >= 1 ? "bg-emerald-50 text-emerald-700"
                      : pct >= 0.8 ? "bg-yellow-50 text-yellow-700"
                      : "bg-red-50 text-red-600";
                    return (
                      <div
                        key={wi}
                        className={`flex-shrink-0 flex items-center justify-center border-r border-border last:border-r-0 py-1.5 px-1 ${cellBg}`}
                        style={{ width: CELL_W }}
                      >
                        <input
                          type="number"
                          min={0}
                          value={val ?? ""}
                          onChange={(ev) => updateAttendance(wi, c.id, ev.target.value)}
                          placeholder="—"
                          className={`w-full text-center text-sm font-semibold bg-transparent outline-none rounded-lg px-1 py-1 hover:bg-black/5 focus:bg-black/5 focus:ring-1 focus:ring-blue-300 transition-all ${pct !== null ? "" : "text-foreground"}`}
                          style={{ maxWidth: "60px" }}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Parent View ──────────────────────────────────────────────────────────────
function ParentView({ onBack, initialLogin = "" }: { onBack: () => void; initialLogin?: string }) {
  const [child, setChild] = useState<Child | null>(null);
  const [loginLoading, setLoginLoading] = useState(!!initialLogin);
  const [attendanceData, setAttendanceData] = useState<WeekAttendance[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const loadParentComments = async (childId: string) => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`${GET_COMMENTS_URL}?child_id=${encodeURIComponent(childId)}`);
      const data = await res.json();
      setComments(data.comments ?? []);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleParentSend = async (savedText: string) => {
    if (!savedText || !child) return;
    const res = await fetch(SAVE_COMMENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ child_id: child.id, text: savedText, author: "parent" }),
    });
    const data = await res.json();
    const newComment: Comment = {
      id: data.id,
      child_id: child.id,
      text: savedText,
      created_at: data.created_at ?? new Date().toISOString(),
      author: "parent",
      image_urls: [],
    };
    setComments((prev) => [newComment, ...prev]);
  };

  useEffect(() => {
    if (!initialLogin) return;
    (async () => {
      try {
        const [allChildren, att] = await Promise.all([apiGetChildren(), apiGetAttendance()]);
        const found = allChildren.find((c) => c.parentLogin.toLowerCase() === initialLogin.toLowerCase());
        if (found) {
          setChild(found);
          setAttendanceData(att);
          loadParentComments(found.id);
        }
      } finally {
        setLoginLoading(false);
      }
    })();
  }, [initialLogin]);

  if (loginLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Icon name="Loader2" size={32} />
        <p className="text-sm">Загружаю…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white soft-shadow sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
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
          <BarChart entries={child.entries} system={child.system} childId={child.id} attendance={attendanceData} scrollToEnd />
        </div>

        {/* Лента комментариев */}
        <div className="mt-4 bg-white rounded-2xl soft-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Icon name="MessageSquare" size={17} className="text-violet-500" />
            Комментарии
          </h3>

          {/* Форма родителя */}
          <div className="mb-5">
            <CommentForm
              placeholder="Написать сообщение… (Ctrl+Enter — отправить)"
              onSend={async (text) => handleParentSend(text)}
              accentClass="bg-violet-500 hover:bg-violet-600"
              focusClass="focus:border-violet-400 focus:ring-violet-200"
            />
          </div>

          {/* Лента */}
          {commentsLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
              <Icon name="Loader2" size={16} />
              Загружаю…
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Комментариев пока нет</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => {
                const isParent = c.author === "parent";
                const isSchool = c.child_id === "__school__";
                return (
                  <div
                    key={c.id}
                    className={`rounded-xl px-4 py-3 border ${isParent ? "bg-violet-50 border-violet-200 ml-6" : isSchool ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-border"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: isParent ? "#7c3aed" : isSchool ? "#b45309" : "#64748b" }}>
                        {isParent ? "Вы" : isSchool ? "🏫 Для всей школы" : "Администратор"}
                      </span>
                    </div>
                    {c.text && <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{c.text}</p>}
                    <CommentImages urls={c.image_urls} />
                    <p className="text-[11px] text-muted-foreground mt-1.5">{fmtDate(c.created_at)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comments View ────────────────────────────────────────────────────────────
const COMMENT_API_URL = "https://functions.poehali.dev/2581983b-c407-4d90-955e-73413b44e65a";
const GET_COMMENTS_URL = COMMENT_API_URL;
const SAVE_COMMENT_URL = COMMENT_API_URL;
const DELETE_COMMENT_URL = COMMENT_API_URL;
const UPLOAD_IMAGE_URL = `${COMMENT_API_URL}?action=upload`;

interface Comment {
  id: number;
  child_id: string;
  text: string;
  created_at: string;
  author: "admin" | "parent";
  image_urls: string[];
}

async function uploadImages(files: File[]): Promise<string[]> {
  const images = await Promise.all(
    files.map(
      (f) =>
        new Promise<{ name: string; data: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const b64 = (reader.result as string).split(",")[1];
            resolve({ name: f.name, data: b64 });
          };
          reader.readAsDataURL(f);
        })
    )
  );
  const res = await fetch(UPLOAD_IMAGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images }),
  });
  const data = await res.json();
  return data.urls ?? [];
}

function CommentImages({ urls }: { urls: string[] }) {
  if (!urls || urls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {urls.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noreferrer">
          <img
            src={url}
            alt=""
            className="h-20 w-20 object-cover rounded-lg border border-border hover:opacity-90 transition-opacity"
          />
        </a>
      ))}
    </div>
  );
}

function CommentForm({
  placeholder,
  onSend,
  accentClass = "bg-emerald-500 hover:bg-emerald-600",
  focusClass = "focus:border-emerald-400 focus:ring-emerald-200",
  withImages = false,
}: {
  placeholder: string;
  onSend: (text: string, imageUrls: string[]) => Promise<void>;
  accentClass?: string;
  focusClass?: string;
  withImages?: boolean;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (chosen: FileList | null) => {
    if (!chosen) return;
    const arr = Array.from(chosen).slice(0, 10);
    setFiles((prev) => [...prev, ...arr].slice(0, 10));
    arr.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => setPreviews((prev) => [...prev, e.target?.result as string].slice(0, 10));
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSend = async () => {
    if (!text.trim() && files.length === 0) return;
    setSaving(true);
    try {
      let imageUrls: string[] = [];
      if (files.length > 0) imageUrls = await uploadImages(files);
      await onSend(text.trim(), imageUrls);
      setText("");
      setFiles([]);
      setPreviews([]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend(); }}
        placeholder={placeholder}
        rows={3}
        className={`w-full px-4 py-3 rounded-xl border border-border text-sm outline-none focus:ring-1 transition-all resize-none ${focusClass}`}
      />
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative">
              <img src={src} alt="" className="h-16 w-16 object-cover rounded-lg border border-border" />
              <button
                onClick={() => removeFile(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
              >×</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSend}
          disabled={saving || (!text.trim() && files.length === 0)}
          className={`flex items-center gap-2 px-4 py-2 ${accentClass} disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors`}
        >
          <Icon name={saving ? "Loader2" : "Send"} size={15} />
          {saving ? "Отправляю…" : "Отправить"}
        </button>
        {withImages && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors border border-border"
            >
              <Icon name="ImagePlus" size={15} />
              Фото
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </>
        )}
      </div>
    </div>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "short" }).replace(".", "");

function AdminCommentThread({
  childId,
  bgColor = "bg-slate-50",
}: {
  childId: string;
  bgColor?: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${GET_COMMENTS_URL}?child_id=${encodeURIComponent(childId)}`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .finally(() => setLoading(false));
  }, [childId]);

  const handleSend = async (text: string, imageUrls: string[]) => {
    const res = await fetch(SAVE_COMMENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ child_id: childId, text, author: "admin", image_urls: imageUrls }),
    });
    const data = await res.json();
    setComments((prev) => [
      { id: data.id, child_id: childId, text, created_at: data.created_at ?? new Date().toISOString(), author: "admin", image_urls: imageUrls },
      ...prev,
    ]);
  };

  const handleEditSave = async (id: number) => {
    if (!editText.trim()) return;
    setEditSaving(true);
    try {
      await fetch(SAVE_COMMENT_URL, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, text: editText.trim() }) });
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, text: editText.trim() } : c)));
      setEditingId(null);
    } finally { setEditSaving(false); }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await fetch(DELETE_COMMENT_URL, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setComments((prev) => prev.filter((c) => c.id !== id));
    } finally { setDeleting(null); }
  };

  return (
    <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
      <CommentForm
        placeholder="Написать комментарий… (Ctrl+Enter — отправить)"
        onSend={handleSend}
        withImages
      />
      {loading ? (
        <div className="flex items-center justify-center py-4 text-muted-foreground text-sm gap-2">
          <Icon name="Loader2" size={16} /> Загружаю…
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2 text-center">Комментариев пока нет</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className={`group relative rounded-xl px-4 py-3 border ${c.author === "parent" ? "bg-violet-50 border-violet-200 ml-4" : `${bgColor} border-border`}`}
            >
              {editingId === c.id ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleEditSave(c.id); if (e.key === "Escape") setEditingId(null); }}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-300 text-sm outline-none focus:ring-1 focus:ring-emerald-200 resize-none bg-white"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleEditSave(c.id)} disabled={editSaving || !editText.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                      <Icon name={editSaving ? "Loader2" : "Check"} size={12} />
                      {editSaving ? "Сохраняю…" : "Сохранить"}
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-200 transition-colors">Отмена</button>
                  </div>
                </div>
              ) : (
                <>
                  {c.author === "parent" && <span className="text-[10px] font-bold uppercase tracking-wide text-violet-500 block mb-1">Родитель</span>}
                  {c.text && <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{c.text}</p>}
                  <CommentImages urls={c.image_urls} />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-muted-foreground">{fmtDate(c.created_at)}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {c.author !== "parent" && (
                        <button onClick={() => { setEditingId(c.id); setEditText(c.text); }} className="text-slate-400 hover:text-blue-500 p-1 rounded-lg hover:bg-blue-50 transition-colors">
                          <Icon name="Pencil" size={13} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id} className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors">
                        <Icon name={deleting === c.id ? "Loader2" : "Trash2"} size={13} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentsView({ onBack }: { onBack: () => void }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [schoolOpen, setSchoolOpen] = useState(false);

  useEffect(() => {
    apiGetChildren().then(setChildren).finally(() => setLoadingChildren(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white soft-shadow sticky top-0 z-20">
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <Icon name="ArrowLeft" size={20} className="text-muted-foreground" />
          </button>
          <span className="text-lg">💬</span>
          <p className="font-bold text-foreground">Комментарии</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-2">
        {loadingChildren && (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
            <Icon name="Loader2" size={18} /> Загружаю…
          </div>
        )}
        {/* Общие комментарии по школе */}
        <div className="bg-amber-50 rounded-2xl soft-shadow overflow-hidden border border-amber-200">
          <button
            onClick={() => setSchoolOpen((p) => !p)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-100/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-200 flex items-center justify-center flex-shrink-0">
                <span className="text-base">🏫</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground text-sm leading-tight">Общие комментарии по школе</p>
                <p className="text-[11px] text-muted-foreground">Видны всем родителям</p>
              </div>
            </div>
            <Icon name={schoolOpen ? "ChevronUp" : "ChevronDown"} size={18} className="text-muted-foreground flex-shrink-0" />
          </button>
          {schoolOpen && <AdminCommentThread childId="__school__" bgColor="bg-amber-50" />}
        </div>

        {/* Список детей */}
        {children.map((child) => {
          const isOpen = openId === child.id;
          return (
            <div key={child.id} className="bg-white rounded-2xl soft-shadow overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : child.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-base">👤</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground text-sm leading-tight">{child.name}</p>
                    <p className="text-[11px] text-muted-foreground">@{child.parentLogin}</p>
                  </div>
                </div>
                <Icon name={isOpen ? "ChevronUp" : "ChevronDown"} size={18} className="text-muted-foreground flex-shrink-0" />
              </button>
              {isOpen && <AdminCommentThread childId={child.id} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState<"scores" | "progress" | "comments" | null>(null);

  if (section === "scores") return <AdminView onBack={() => setSection(null)} />;
  if (section === "progress") return <ProgressView onBack={() => setSection(null)} />;
  if (section === "comments") return <CommentsView onBack={() => setSection(null)} />;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center px-4 py-8 sm:py-12">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-100/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="absolute top-4 right-4">
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-white/80 hover:text-foreground transition-colors"
        >
          <Icon name="LogOut" size={15} />
          Выйти
        </button>
      </div>

      <div className="relative z-10 text-center mb-8" style={{ animation: "fadeIn 0.5s ease-out both" }}>
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-3xl soft-shadow-lg mb-4 text-3xl sm:text-4xl">🏫</div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-1">ШколаПро</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Панель администратора</p>
      </div>

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-2xl">
        {[
          { key: "scores" as const,   emoji: "📋", title: "Баллы",        desc: "Вносить и редактировать баллы детей",     color: "from-blue-100 to-blue-50",    accent: "bg-blue-500 hover:bg-blue-600" },
          { key: "progress" as const, emoji: "📊", title: "Прогресс",     desc: "Таблица прогресса по обучению из Excel",  color: "from-orange-100 to-orange-50", accent: "bg-orange-500 hover:bg-orange-600" },
          { key: "comments" as const, emoji: "💬", title: "Комментарии",  desc: "Заметки и сообщения по каждому ребёнку", color: "from-emerald-100 to-emerald-50",accent: "bg-emerald-500 hover:bg-emerald-600" },
        ].map((r, i) => (
          <button
            key={r.key}
            onClick={() => setSection(r.key)}
            className={`bg-gradient-to-br ${r.color} border-2 border-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-left soft-shadow hover-lift transition-all`}
            style={{ animation: `fadeIn 0.5s ease-out ${i * 0.1 + 0.1}s both` }}
          >
            <div className="text-3xl mb-3">{r.emoji}</div>
            <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">{r.title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 leading-relaxed">{r.desc}</p>
            <div className={`${r.accent} text-white text-xs sm:text-sm font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl inline-flex items-center gap-1.5 transition-colors`}>
              Открыть <Icon name="ArrowRight" size={13} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
const ADMIN_LOGIN = "prekrasno";

function LoginScreen({ onAdmin, onParent }: { onAdmin: () => void; onParent: (login: string) => void }) {
  const [login, setLogin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const val = login.trim().toLowerCase();
    if (!val) return;
    if (val === ADMIN_LOGIN) { onAdmin(); return; }
    setLoading(true);
    setError("");
    try {
      const children = await apiGetChildren();
      const found = children.find((c) => c.parentLogin.toLowerCase() === val);
      if (found) { onParent(val); }
      else { setError("Логин не найден. Уточните у администратора."); }
    } catch { setError("Ошибка соединения. Попробуйте ещё раз."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center px-4">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-100/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm" style={{ animation: "fadeIn 0.5s ease-out both" }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5">
            <img src="https://cdn.poehali.dev/files/51dffb6d-5e9b-431b-a5b1-295ea69e3520.png" alt="Able Kids" className="w-24 h-24 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Able Kids</h1>
          <p className="text-muted-foreground text-sm">Введите свой логин для входа</p>
        </div>

        <div className="bg-white rounded-3xl soft-shadow-lg p-8 space-y-4">
          <input
            autoFocus
            placeholder="Ваш логин"
            value={login}
            onChange={(e) => { setLogin(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="w-full px-4 py-3 rounded-xl border border-border text-sm outline-none focus:border-violet-400 transition-colors text-center font-mono"
          />
          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading || !login.trim()}
            className="w-full py-3 bg-violet-500 text-white font-semibold rounded-xl hover:bg-violet-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Icon name="Loader2" size={16} />}
            {loading ? "Проверяю…" : "Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Index() {
  const [view, setView] = useState<"login" | "admin" | "parent">("login");
  const [parentLogin, setParentLogin] = useState("");

  if (view === "admin") return <AdminDashboard onLogout={() => setView("login")} />;
  if (view === "parent") return (
    <ParentView
      initialLogin={parentLogin}
      onBack={() => setView("login")}
    />
  );

  return (
    <LoginScreen
      onAdmin={() => setView("admin")}
      onParent={(login) => { setParentLogin(login); setView("parent"); }}
    />
  );
}