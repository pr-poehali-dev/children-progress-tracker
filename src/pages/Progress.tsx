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

const CHILD_BG   = ["#f0f9ff", "#f0fdf4"];
const CHECKED_BG = ["#38bdf8", "#4ade80"];
const SUBJ_BG    = ["#e0f2fe", "#dcfce7"];

const STORAGE_KEY = "progress_checked_v2";

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

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export default function ProgressView({ onBack }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<ProgressData | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [checked, setChecked] = useState<Set<string>>(() => loadChecked());

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellStyles: true });
      setData(parseProgress(wb.Sheets[wb.SheetNames[0]]));
      setFileName(file.name);
    } catch {
      setError("Не удалось прочитать файл. Убедитесь, что это файл .xlsx");
    }
    e.target.value = "";
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
  const HEADER_TOP = 57;

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
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            <Icon name="Upload" size={15} />
            Загрузить Excel
          </button>
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
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}>
            <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 110px)" }}>
              <table style={{
                borderCollapse: "collapse",
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
                      background: "#f8fafc", border: "1px solid #e2e8f0",
                      padding: "6px 8px", fontSize: 11, fontWeight: 600,
                      color: "#64748b", textAlign: "left",
                    }}>
                      Ученик
                    </th>
                    <th style={{
                      position: "sticky", top: HEADER_TOP, left: COL_NAME, zIndex: 30,
                      background: "#f8fafc", border: "1px solid #e2e8f0",
                      padding: "6px 8px", fontSize: 11, fontWeight: 600,
                      color: "#64748b", textAlign: "left",
                    }}>
                      Предмет
                    </th>
                    {data.dates.map((d, i) => (
                      <th key={i} style={{
                        position: "sticky", top: HEADER_TOP, zIndex: 20,
                        background: "#f8fafc", border: "1px solid #e2e8f0",
                        padding: "4px 2px", fontSize: 10, fontWeight: 600,
                        color: "#64748b", textAlign: "center",
                        writingMode: "vertical-rl",
                        height: 72, whiteSpace: "nowrap",
                      }}>
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {data.children.map((child, ci) => {
                    const childBg  = CHILD_BG[ci % 2];
                    const checkedBg = CHECKED_BG[ci % 2];
                    const subjBg   = SUBJ_BG[ci % 2];

                    return child.rows.map((row, ri) => {
                      const total = row.tasks.filter(t => t !== null).length;
                      const done  = row.tasks.filter((t, ti) => t !== null && checked.has(`${ci}_${ri}_${ti}`)).length;
                      const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

                      return (
                        <tr key={`${ci}_${ri}`}>
                          {ri === 0 && (
                            <td
                              rowSpan={child.rows.length}
                              style={{
                                position: "sticky", left: 0, zIndex: 11,
                                background: childBg,
                                border: "1px solid #e2e8f0",
                                padding: "6px 8px",
                                fontSize: 12, fontWeight: 700,
                                color: "#1e293b",
                                verticalAlign: "middle",
                                textAlign: "left",
                                whiteSpace: "normal",
                                lineHeight: 1.4,
                              }}
                            >
                              {child.name}
                            </td>
                          )}

                          <td style={{
                            position: "sticky", left: COL_NAME, zIndex: 11,
                            background: subjBg,
                            border: "1px solid #e2e8f0",
                            padding: "5px 8px",
                            fontSize: 11,
                            color: "#334155",
                            verticalAlign: "middle",
                            whiteSpace: "nowrap",
                          }}>
                            <div style={{ marginBottom: 4, fontWeight: 500 }}>{row.subject}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <div style={{
                                flex: 1, height: 5, background: "#e2e8f0",
                                borderRadius: 4, overflow: "hidden",
                              }}>
                                <div style={{
                                  height: "100%", width: `${pct}%`,
                                  background: checkedBg, borderRadius: 4,
                                  transition: "width 0.3s ease",
                                }} />
                              </div>
                              <span style={{ fontSize: 9, color: "#94a3b8", minWidth: 26, textAlign: "right" }}>
                                {done}/{total}
                              </span>
                            </div>
                          </td>

                          {row.tasks.map((task, ti) => {
                            const key = `${ci}_${ri}_${ti}`;
                            const isChecked = checked.has(key);
                            const isEmpty = task === null;
                            return (
                              <td
                                key={ti}
                                onClick={isEmpty ? undefined : () => toggleCell(key)}
                                title={isEmpty ? "" : isChecked ? "Снять отметку" : "Отметить выполненным"}
                                style={{
                                  border: "1px solid #e2e8f0",
                                  background: isEmpty ? "#f8fafc" : isChecked ? checkedBg : childBg,
                                  textAlign: "center",
                                  verticalAlign: "middle",
                                  fontSize: 10,
                                  fontWeight: isChecked ? 700 : 400,
                                  color: isChecked ? "#fff" : "#475569",
                                  cursor: isEmpty ? "default" : "pointer",
                                  userSelect: "none",
                                  transition: "background 0.15s",
                                  height: 34,
                                  padding: 0,
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
