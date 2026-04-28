import { useState, useRef } from "react";
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
const ATTENDANCE_KEY = "school_attendance_data";

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

// attendance[weekIndex] = { maxLessons: number, children: { [childId]: number | null } }
interface WeekAttendance {
  maxLessons: number | null;
  children: Record<string, number | null>;
}

function loadAttendance(): WeekAttendance[] {
  try {
    const raw = localStorage.getItem(ATTENDANCE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    void e;
  }
  return [];
}

function saveAttendance(data: WeekAttendance[]) {
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(data));
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
}: {
  entries: WeekEntry[];
  system: System;
  childId?: string;
  attendance?: WeekAttendance[];
}) {
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
      <div className="overflow-x-auto">
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
  const [children, setChildren] = useState<Child[]>(loadData);
  const [newWeek, setNewWeek] = useState("");
  const [saved, setSaved] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildLogin, setNewChildLogin] = useState("");

  // все недели берём из первого ребёнка (они синхронны)
  const weeks = children[0]?.entries.map((e) => e.week) ?? [];

  // ── Посещаемость ──
  const [attendance, setAttendance] = useState<WeekAttendance[]>(() =>
    buildAttendance(weeks, children, loadAttendance())
  );

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

  const handleSave = () => {
    saveData(children);
    saveAttendance(attendance);
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

        saveData(newChildren);
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

          saveAttendance(newAtt);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white soft-shadow sticky top-0 z-20">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Icon name="ArrowLeft" size={20} className="text-muted-foreground" />
            </button>
            <span className="text-lg">🏫</span>
            <p className="font-bold text-foreground">Администратор — баллы</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => setAddingChild(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <Icon name="UserPlus" size={15} />
              Ребёнок
            </button>
            <button
              onClick={() => fileRef1.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors"
            >
              <Icon name="Upload" size={15} />
              Табл. №1
            </button>
            <button
              onClick={handleExportTable1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors"
            >
              <Icon name="Download" size={15} />
              Табл. №1
            </button>
            <button
              onClick={() => fileRef2.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <Icon name="Upload" size={15} />
              Табл. №2
            </button>
            <button
              onClick={handleExportTable2}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <Icon name="Download" size={15} />
              Табл. №2
            </button>
            <input ref={fileRef1} type="file" accept=".xlsx" className="hidden" onChange={handleImportTable1} />
            <input ref={fileRef2} type="file" accept=".xlsx" className="hidden" onChange={handleImportTable2} />
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
function ParentView({ onBack }: { onBack: () => void }) {
  const [login, setLogin] = useState("");
  const [child, setChild] = useState<Child | null>(null);
  const [error, setError] = useState("");
  const [attendanceData] = useState<WeekAttendance[]>(loadAttendance);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [parentText, setParentText] = useState("");
  const [parentSaving, setParentSaving] = useState(false);

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

  const handleParentSend = async () => {
    if (!parentText.trim() || !child) return;
    setParentSaving(true);
    const savedText = parentText.trim();
    setParentText("");
    try {
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
      };
      setComments((prev) => [newComment, ...prev]);
    } finally {
      setParentSaving(false);
    }
  };

  const handleLogin = () => {
    const data = loadData();
    const found = data.find((c) => c.parentLogin.toLowerCase() === login.trim().toLowerCase());
    if (found) {
      setChild(found);
      setError("");
      loadParentComments(found.id);
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
          <BarChart entries={child.entries} system={child.system} childId={child.id} attendance={attendanceData} />
        </div>

        {/* Лента комментариев */}
        <div className="mt-4 bg-white rounded-2xl soft-shadow p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Icon name="MessageSquare" size={17} className="text-violet-500" />
            Комментарии
          </h3>

          {/* Форма родителя */}
          <div className="space-y-2 mb-5">
            <textarea
              value={parentText}
              onChange={(e) => setParentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleParentSend(); }}
              placeholder="Написать сообщение… (Ctrl+Enter — отправить)"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border text-sm outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-all resize-none"
            />
            <button
              onClick={handleParentSend}
              disabled={parentSaving || !parentText.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Icon name={parentSaving ? "Loader2" : "Send"} size={15} />
              {parentSaving ? "Отправляю…" : "Отправить"}
            </button>
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
                return (
                  <div
                    key={c.id}
                    className={`rounded-xl px-4 py-3 border ${isParent ? "bg-violet-50 border-violet-200 ml-6" : "bg-slate-50 border-border"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: isParent ? "#7c3aed" : "#64748b" }}>
                        {isParent ? "Родитель" : "Администратор"}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{c.text}</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {new Date(c.created_at).toLocaleString("ru-RU", { day: "numeric", month: "short" }).replace(".", "")}
                    </p>
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
const GET_COMMENTS_URL = "https://functions.poehali.dev/2115d774-b0b9-4412-bcae-78b0f8bcb563";
const SAVE_COMMENT_URL = "https://functions.poehali.dev/86719a99-e955-46c3-a4f0-3110732c4ed9";
const DELETE_COMMENT_URL = "https://functions.poehali.dev/90a6388b-783b-4bc4-9811-3eb26fddd21c";

interface Comment {
  id: number;
  child_id: string;
  text: string;
  created_at: string;
  author: "admin" | "parent";
}

function CommentsView({ onBack }: { onBack: () => void }) {
  const children = loadData();
  const [openId, setOpenId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadComments = async (childId: string) => {
    setLoading(true);
    setComments([]);
    try {
      const res = await fetch(`${GET_COMMENTS_URL}?child_id=${encodeURIComponent(childId)}`);
      const data = await res.json();
      setComments(data.comments ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (childId: string) => {
    if (openId === childId) {
      setOpenId(null);
      setComments([]);
      setText("");
    } else {
      setOpenId(childId);
      setText("");
      loadComments(childId);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleSave = async () => {
    if (!text.trim() || !openId) return;
    setSaving(true);
    const savedText = text.trim();
    setText("");
    try {
      const res = await fetch(SAVE_COMMENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_id: openId, text: savedText, author: "admin" }),
      });
      const data = await res.json();
      const newComment: Comment = {
        id: data.id,
        child_id: openId,
        text: savedText,
        created_at: data.created_at ?? new Date().toISOString(),
        author: "admin",
      };
      setComments((prev) => [newComment, ...prev]);
      textareaRef.current?.focus();
    } finally {
      setSaving(false);
    }
  };

  const handleEditStart = (c: Comment) => {
    setEditingId(c.id);
    setEditText(c.text);
  };

  const handleEditSave = async (id: number) => {
    if (!editText.trim()) return;
    setEditSaving(true);
    try {
      await fetch(SAVE_COMMENT_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, text: editText.trim() }),
      });
      setComments((prev) => prev.map((c) => c.id === id ? { ...c, text: editText.trim() } : c));
      setEditingId(null);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await fetch(DELETE_COMMENT_URL, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setComments((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { day: "numeric", month: "short" }).replace(".", "");
  };

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
        {children.map((child) => {
          const isOpen = openId === child.id;
          return (
            <div key={child.id} className="bg-white rounded-2xl soft-shadow overflow-hidden">
              {/* Имя ребёнка — кнопка */}
              <button
                onClick={() => handleToggle(child.id)}
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
                <Icon
                  name={isOpen ? "ChevronUp" : "ChevronDown"}
                  size={18}
                  className="text-muted-foreground flex-shrink-0"
                />
              </button>

              {/* Раскрытая лента */}
              {isOpen && (
                <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
                  {/* Поле ввода нового комментария */}
                  <div className="space-y-2">
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSave();
                      }}
                      placeholder="Написать комментарий… (Ctrl+Enter — отправить)"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-border text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 transition-all resize-none"
                    />
                    <button
                      onClick={handleSave}
                      disabled={saving || !text.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      <Icon name={saving ? "Loader2" : "Send"} size={15} />
                      {saving ? "Сохраняю…" : "Отправить"}
                    </button>
                  </div>

                  {/* Лента комментариев */}
                  {loading ? (
                    <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
                      <Icon name="Loader2" size={16} />
                      Загружаю…
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3 text-center">Комментариев пока нет</p>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((c) => (
                        <div
                          key={c.id}
                          className={`group relative rounded-xl px-4 py-3 border ${c.author === "parent" ? "bg-violet-50 border-violet-200 ml-4" : "bg-slate-50 border-border"}`}
                        >
                          {editingId === c.id ? (
                            <div className="space-y-2">
                              <textarea
                                autoFocus
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleEditSave(c.id);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg border border-emerald-300 text-sm outline-none focus:ring-1 focus:ring-emerald-200 transition-all resize-none bg-white"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditSave(c.id)}
                                  disabled={editSaving || !editText.trim()}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                  <Icon name={editSaving ? "Loader2" : "Check"} size={12} />
                                  {editSaving ? "Сохраняю…" : "Сохранить"}
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                  Отмена
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {c.author === "parent" && (
                                <span className="text-[10px] font-bold uppercase tracking-wide text-violet-500 block mb-1">Родитель</span>
                              )}
                              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{c.text}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-[11px] text-muted-foreground">{formatDate(c.created_at)}</span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button
                                    onClick={() => handleEditStart(c)}
                                    className="text-slate-400 hover:text-blue-500 p-1 rounded-lg hover:bg-blue-50 transition-colors"
                                  >
                                    <Icon name="Pencil" size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(c.id)}
                                    disabled={deleting === c.id}
                                    className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                  >
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Index() {
  const [view, setView] = useState<"home" | "admin" | "parent" | "progress" | "comments">("home");

  if (view === "admin") return <AdminView onBack={() => setView("home")} />;
  if (view === "parent") return <ParentView onBack={() => setView("home")} />;
  if (view === "progress") return <ProgressView onBack={() => setView("home")} />;
  if (view === "comments") return <CommentsView onBack={() => setView("home")} />;

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

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-3xl">
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
          {
            key: "progress" as const,
            emoji: "📊",
            title: "Прогресс",
            desc: "Таблица прогресса по обучению из Excel",
            color: "from-orange-100 to-orange-50",
            accent: "bg-orange-500 hover:bg-orange-600",
            delay: "0.35s",
          },
          {
            key: "comments" as const,
            emoji: "💬",
            title: "Комментарии",
            desc: "Заметки администратора по каждому ребёнку",
            color: "from-emerald-100 to-emerald-50",
            accent: "bg-emerald-500 hover:bg-emerald-600",
            delay: "0.45s",
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