import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import Icon from "@/components/ui/icon";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubjectRow {
  subject: string;
  tasks: (string | null)[];
}

interface Child {
  name: string;
  rows: SubjectRow[];
}

interface ProgressData {
  dates: string[];
  children: Child[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number" && v > 40000 && v < 55000) {
    const date = XLSX.SSF.parse_date_code(v);
    if (date) {
      const months = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
      return `${date.d} ${months[date.m - 1]}`;
    }
  }
  return String(v);
}

function parseProgress(ws: XLSX.WorkSheet): ProgressData {
  const ref = ws["!ref"];
  if (!ref) return { dates: [], children: [] };
  const range = XLSX.utils.decode_range(ref);

  const merges: XLSX.Range[] = ws["!merges"] ?? [];
  const col0Owner = new Map<number, number>();
  for (const m of merges) {
    if (m.s.c === 0) {
      for (let r = m.s.r; r <= m.e.r; r++) col0Owner.set(r, m.s.r);
    }
  }

  // Строка 0 — даты (с col2)
  const dates: string[] = [];
  for (let c = 2; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c })] as XLSX.CellObject | undefined;
    dates.push(cell ? formatDate(cell.v) : "");
  }

  const children: Child[] = [];
  let lastOwnerRow = -1;
  let currentChild: Child | null = null;

  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const ownerRow = col0Owner.get(r) ?? r;
    const nameCell = ws[XLSX.utils.encode_cell({ r: ownerRow, c: 0 })] as XLSX.CellObject | undefined;
    const name = nameCell?.v !== undefined ? String(nameCell.v).trim() : "";

    const subCell = ws[XLSX.utils.encode_cell({ r, c: 1 })] as XLSX.CellObject | undefined;
    const subject = subCell?.v !== undefined ? String(subCell.v).trim() : "";
    if (!subject) continue;

    if (ownerRow !== lastOwnerRow) {
      currentChild = { name, rows: [] };
      children.push(currentChild);
      lastOwnerRow = ownerRow;
    }

    const tasks: (string | null)[] = [];
    for (let c = 2; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
      const val = cell?.v !== undefined && cell.v !== null && String(cell.v).trim() !== ""
        ? String(cell.v).trim() : null;
      tasks.push(val);
    }

    currentChild!.rows.push({ subject, tasks });
  }

  return { dates, children };
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const CHILD_BG   = ["#e3effe", "#fefff9"];
const CHECKED_BG = ["#6297DC", "#94BC77"];
const SUBJ_BG    = ["#ccdaf9", "#eaf2e3"];

const STORAGE_KEY        = "progress_checked_v2";
const STORAGE_DATA_KEY   = "progress_data_v2";
const STORAGE_FNAME_KEY  = "progress_filename_v2";

function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}
function saveChecked(s: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
}
function loadData(): { data: ProgressData | null; fileName: string } {
  try {
    const raw = localStorage.getItem(STORAGE_DATA_KEY);
    const fn  = localStorage.getItem(STORAGE_FNAME_KEY) ?? "";
    if (raw) return { data: JSON.parse(raw) as ProgressData, fileName: fn };
  } catch { /* ignore */ }
  return { data: null, fileName: "" };
}
function persistData(data: ProgressData, fileName: string) {
  localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(data));
  localStorage.setItem(STORAGE_FNAME_KEY, fileName);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export default function ProgressView({ onBack }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<ProgressData | null>(() => loadData().data);
  const [fileName, setFileName] = useState<string>(() => loadData().fileName);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState<Set<string>>(() => loadChecked());
  const [saved, setSaved] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellStyles: true });
      const parsed = parseProgress(wb.Sheets[wb.SheetNames[0]]);
      setData(parsed);
      setFileName(file.name);
      setSaved(false);
    } catch {
      setError("Не удалось прочитать файл. Убедитесь, что это файл .xlsx");
    }
    e.target.value = "";
  };

  const handleSave = () => {
    if (!data) return;
    persistData(data, fileName);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleCell = (key: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      saveChecked(next);
      return next;
    });
  };

  const COL_NAME = 130;
  const COL_SUBJ = 150;
  const COL_CELL = 44;
  const HEADER_TOP = 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white sticky top-0 z-30" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}>
        <div className="px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Icon name="ArrowLeft" size={20} className="text-muted-foreground" />
            </button>
            <span className="text-lg">📊</span>
            <p className="font-bold text-foreground">Прогресс по обучению</p>
            {fileName && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg truncate max-w-[180px]">
                {fileName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors"
            >
              <Icon name="Upload" size={15} />
              Загрузить Excel
            </button>
            {data && (
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  saved ? "bg-emerald-500 text-white" : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                <Icon name={saved ? "Check" : "Save"} size={15} />
                {saved ? "Сохранено!" : "Сохранить"}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
        </div>
      </header>

      <div className="flex-1 p-4">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
        )}

        {!data && (
          <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-3xl">📊</div>
            <div>
              <p className="font-semibold text-foreground mb-1">Загрузите таблицу Excel с прогрессом</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Строка 1 — даты. Далее: колонка A — имя ребёнка, B — предмет, C и далее — номера заданий по датам.
              </p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors"
            >
              <Icon name="Upload" size={16} />
              Загрузить файл .xlsx
            </button>
          </div>
        )}

        {data && (
          <div className="rounded-[2rem] overflow-hidden" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 110px)" }}>
              <table style={{
                borderCollapse: "separate",
                borderSpacing: 0,
                tableLayout: "fixed",
                minWidth: COL_NAME + COL_SUBJ + data.dates.length * COL_CELL,
              }}>
                <colgroup>
                  <col style={{ width: COL_NAME }} />
                  <col style={{ width: COL_SUBJ }} />
                  {data.dates.map((_, i) => <col key={i} style={{ width: COL_CELL }} />)}
                </colgroup>

                <thead>
                  <tr>
                    <th style={{
                      position: "sticky", top: HEADER_TOP, left: 0, zIndex: 30,
                      background: "linear-gradient(180deg,#f1f5f9 0%,#e8eef5 100%)",
                      borderBottom: "2px solid #a0b4ce", borderRight: "1px solid #b8cce0",
                      padding: "10px 12px", fontSize: 11, fontWeight: 700,
                      color: "#475569", textAlign: "left", letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}>
                      Ученик
                    </th>
                    <th style={{
                      position: "sticky", top: HEADER_TOP, left: COL_NAME, zIndex: 30,
                      background: "linear-gradient(180deg,#f1f5f9 0%,#e8eef5 100%)",
                      borderBottom: "2px solid #a0b4ce", borderRight: "2px solid #a0b4ce",
                      padding: "10px 12px", fontSize: 11, fontWeight: 700,
                      color: "#475569", textAlign: "left", letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}>
                      Предмет
                    </th>
                    {data.dates.map((d, i) => (
                      <th key={i} style={{
                        position: "sticky", top: HEADER_TOP, zIndex: 20,
                        background: "linear-gradient(180deg,#f1f5f9 0%,#e8eef5 100%)",
                        borderBottom: "2px solid #a0b4ce",
                        borderRight: "1px solid #b8cce0",
                        padding: "6px 2px", fontSize: 10, fontWeight: 600,
                        color: "#64748b", textAlign: "center",
                        writingMode: "vertical-rl",
                        height: 80, whiteSpace: "nowrap",
                      }}>
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {data.children.map((child, ci) => {
                    const childBg   = CHILD_BG[ci % 2];
                    const checkedBg = CHECKED_BG[ci % 2];
                    const subjBg    = SUBJ_BG[ci % 2];
                    const isLast    = ci === data.children.length - 1;

                    return child.rows.map((row, ri) => {
                      const total = row.tasks.filter(t => t !== null).length;
                      const done  = row.tasks.filter((t, ti) => t !== null && checked.has(`${ci}_${ri}_${ti}`)).length;
                      const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
                      const isLastRow = ri === child.rows.length - 1;
                      const groupBorder = isLastRow && !isLast ? "5px solid #6b7fa3" : "1px solid #c5d3e8";

                      // Для каждой ячейки определяем: большая или маленькая
                      // Большая = уникальное значение в строке ИЛИ последнее вхождение повторяющегося
                      const lastIndexOf = new Map<string, number>();
                      const countOf = new Map<string, number>();
                      row.tasks.forEach((t) => {
                        if (t === null) return;
                        countOf.set(t, (countOf.get(t) ?? 0) + 1);
                      });
                      row.tasks.forEach((t, idx) => {
                        if (t !== null) lastIndexOf.set(t, idx);
                      });
                      const isBig = (task: string | null, ti: number): boolean => {
                        if (task === null) return false;
                        const count = countOf.get(task) ?? 1;
                        if (count === 1) return true; // уникальное
                        return lastIndexOf.get(task) === ti; // последнее из повторяющихся
                      };

                      return (
                        <tr key={`${ci}_${ri}`}>
                          {ri === 0 && (
                            <td
                              rowSpan={child.rows.length}
                              style={{
                                position: "sticky", left: 0, zIndex: 11,
                                background: childBg,
                                borderBottom: isLast ? "none" : "2px solid #a0b4ce",
                                borderRight: "1px solid #b8cce0",
                                padding: "10px 12px",
                                fontSize: 13, fontWeight: 800,
                                color: "#0f172a",
                                verticalAlign: "middle",
                                textAlign: "left",
                                whiteSpace: "normal",
                                lineHeight: 1.4,
                                boxShadow: "2px 0 6px rgba(0,0,0,0.04)",
                              }}
                            >
                              {child.name}
                            </td>
                          )}

                          <td style={{
                            position: "sticky", left: COL_NAME, zIndex: 11,
                            background: subjBg,
                            borderBottom: groupBorder,
                            borderRight: "2px solid #a0b4ce",
                            padding: "7px 12px",
                            fontSize: 11,
                            color: "#334155",
                            verticalAlign: "middle",
                            whiteSpace: "nowrap",
                            boxShadow: "2px 0 6px rgba(0,0,0,0.04)",
                          }}>
                            <div style={{ marginBottom: 5, fontWeight: 600, fontSize: 12 }}>{row.subject}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{
                                flex: 1, height: 6, background: "#dde5ef",
                                borderRadius: 99, overflow: "hidden",
                                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                              }}>
                                <div style={{
                                  height: "100%", width: `${pct}%`,
                                  background: `linear-gradient(90deg, ${checkedBg}, ${checkedBg}cc)`,
                                  borderRadius: 99,
                                  transition: "width 0.4s cubic-bezier(.4,0,.2,1)",
                                  boxShadow: pct > 0 ? "0 1px 4px rgba(56,189,248,0.4)" : "none",
                                }} />
                              </div>
                              <span style={{
                                fontSize: 10, fontWeight: 700,
                                color: pct === 100 ? "#16a34a" : "#94a3b8",
                                minWidth: 30, textAlign: "right",
                              }}>
                                {done}/{total}
                              </span>
                            </div>
                          </td>

                          {row.tasks.map((task, ti) => {
                            const key = `${ci}_${ri}_${ti}`;
                            const isChecked = checked.has(key);
                            const isEmpty = task === null;
                            const big = isBig(task, ti);
                            return (
                              <td
                                key={ti}
                                onClick={isEmpty ? undefined : () => toggleCell(key)}
                                title={isEmpty ? "" : isChecked ? "Снять отметку" : "Отметить выполненным"}
                                style={{
                                  borderBottom: groupBorder,
                                  borderRight: "1px solid #c5d3e8",
                                  background: isChecked ? checkedBg : childBg,
                                  textAlign: "center",
                                  verticalAlign: "middle",
                                  fontSize: big ? 14 : 9,
                                  fontWeight: big ? 800 : 400,
                                  color: isChecked ? "#fff" : isEmpty ? "#c4cdd8" : big ? "#1e293b" : "#94a3b8",
                                  cursor: isEmpty ? "default" : "pointer",
                                  userSelect: "none",
                                  transition: "background 0.18s",
                                  height: 38,
                                  padding: 0,
                                  boxShadow: isChecked ? `inset 0 4px 10px rgba(0,0,0,0.22), inset 0 1px 3px rgba(0,0,0,0.18)` : "none",
                                }}
                              >
                                {task ?? ""}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}