import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import Icon from "@/components/ui/icon";

interface ProgressCell {
  value: string | number | null;
  fontSize?: number;
  bold?: boolean;
  bg?: string;
  color?: string;
  align?: "left" | "center" | "right";
  colSpan?: number;
  rowSpan?: number;
}

interface ProgressRow {
  cells: ProgressCell[];
  childIndex?: number;
}

interface ProgressSheet {
  rows: ProgressRow[];
  colWidths: number[];
}

function hexFromArgb(argb: string | undefined): string | undefined {
  if (!argb) return undefined;
  const s = argb.replace("#", "");
  if (s.length === 8) return "#" + s.slice(2);
  if (s.length === 6) return "#" + s;
  return undefined;
}

function formatCellValue(cell: XLSX.CellObject): string | number | null {
  if (cell.v === undefined || cell.v === null) return null;
  if (cell.t === "n" && typeof cell.v === "number" && cell.v > 40000 && cell.v < 55000) {
    const date = XLSX.SSF.parse_date_code(cell.v as number);
    if (date) {
      const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
      return `${date.d} ${months[date.m - 1]}`;
    }
  }
  return cell.v as string | number;
}

function parseSheet(ws: XLSX.WorkSheet): ProgressSheet {
  const ref = ws["!ref"];
  if (!ref) return { rows: [], colWidths: [] };

  const range = XLSX.utils.decode_range(ref);

  const merges: XLSX.Range[] = ws["!merges"] ?? [];
  const mergeMap = new Map<string, { rowSpan: number; colSpan: number }>();
  const skipSet = new Set<string>();
  for (const m of merges) {
    const key = `${m.s.r}_${m.s.c}`;
    mergeMap.set(key, { rowSpan: m.e.r - m.s.r + 1, colSpan: m.e.c - m.s.c + 1 });
    for (let r2 = m.s.r; r2 <= m.e.r; r2++) {
      for (let c2 = m.s.c; c2 <= m.e.c; c2++) {
        if (r2 !== m.s.r || c2 !== m.s.c) skipSet.add(`${r2}_${c2}`);
      }
    }
  }

  const colWidths: number[] = [];
  const rawCols = (ws["!cols"] as Array<{ wch?: number; wpx?: number }> | undefined) ?? [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const col = rawCols[c];
    if (col?.wpx) colWidths.push(col.wpx);
    else if (col?.wch) colWidths.push(Math.round(col.wch * 7));
    else colWidths.push(50);
  }

  // Строим карту row → childIndex
  // Каждая строка данных (не заголовок) с непустой ячейкой col0 = новый ребёнок
  // Строки внутри rowspan col0 получают тот же индекс что и начальная строка
  const rowChildIndex = new Map<number, number>();
  let childCounter = -1;
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const key0 = `${r}_0`;
    if (!skipSet.has(key0)) {
      // Эта строка — начало нового блока в col0
      childCounter++;
      // Смотрим на rowspan этой ячейки и заполняем все строки блока
      const merge0 = mergeMap.get(key0);
      const span = merge0?.rowSpan ?? 1;
      for (let rr = r; rr < r + span; rr++) {
        rowChildIndex.set(rr, childCounter);
      }
    }
    // Если key0 в skipSet — уже заполнено выше через span
  }

  const rows: ProgressRow[] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const cells: ProgressCell[] = [];

    for (let c = range.s.c; c <= range.e.c; c++) {
      const key = `${r}_${c}`;
      if (skipSet.has(key)) continue;

      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr] as (XLSX.CellObject & {
        s?: {
          font?: { sz?: number; bold?: boolean; color?: { rgb?: string } };
          fill?: { fgColor?: { rgb?: string }; bgColor?: { rgb?: string } };
          alignment?: { horizontal?: string };
        };
      }) | undefined;

      const merge = mergeMap.get(key);

      if (!cell) {
        cells.push({ value: null, colSpan: merge?.colSpan, rowSpan: merge?.rowSpan });
        continue;
      }

      const style = cell.s ?? {};
      const font = style.font ?? {};
      const fill = style.fill ?? {};
      const alignment = style.alignment ?? {};

      const fgRgb = fill.fgColor?.rgb;
      const bgRgb = fill.bgColor?.rgb;
      const bgHex = hexFromArgb(fgRgb) ?? hexFromArgb(bgRgb);
      const colorHex = hexFromArgb(font.color?.rgb);

      let align: "left" | "center" | "right" = "center";
      if (alignment.horizontal === "left") align = "left";
      else if (alignment.horizontal === "right") align = "right";

      const formatted = formatCellValue(cell);

      cells.push({
        value: formatted,
        fontSize: font.sz ?? undefined,
        bold: font.bold ?? false,
        bg: bgHex,
        color: colorHex,
        align,
        colSpan: merge?.colSpan,
        rowSpan: merge?.rowSpan,
      });
    }

    const childIndex = r === range.s.r ? -1 : (rowChildIndex.get(r) ?? 0);
    rows.push({ cells, childIndex });
  }

  return { rows, colWidths };
}

// Цвета фона для чётных/нечётных групп детей — базовый и отмеченный
const CHILD_BASE = ["#ffffff", "#f0f7ff"];
const CHILD_CHECKED = ["#38bdf8", "#93c5fd"]; // голубой / светло-синий

const STORAGE_KEY_CHECKED = "progress_checked_cells";

function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHECKED);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function saveChecked(s: Set<string>) {
  localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify([...s]));
}

interface Props {
  onBack: () => void;
}

export default function ProgressView({ onBack }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<ProgressSheet | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [checked, setChecked] = useState<Set<string>>(() => loadChecked());

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellStyles: true });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const parsed = parseSheet(ws);
      setSheet(parsed);
      setFileName(file.name);
    } catch {
      setError("Не удалось прочитать файл. Убедитесь, что это файл .xlsx");
    }
    e.target.value = "";
  };

  const toggleCell = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveChecked(next);
      return next;
    });
  };

  const HEADER_HEIGHT = 57;

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
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">
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
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
          </div>
        </div>
      </header>

      <div className="flex-1 p-4">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        {!sheet && (
          <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-3xl">
              📊
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Загрузите таблицу Excel с прогрессом</p>
              <p className="text-sm text-muted-foreground">
                Содержимое ячеек, цвета и размеры шрифтов будут отображены как в оригинале
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

        {sheet && (
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}>
            <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 100px)" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                  minWidth: sheet.colWidths.reduce((a, b) => a + b, 0),
                }}
              >
                <colgroup>
                  {sheet.colWidths.map((w, i) => (
                    <col key={i} style={{ width: w }} />
                  ))}
                </colgroup>
                <tbody>
                  {sheet.rows.map((row, ri) => {
                    const isHeaderRow = ri === 0;
                    const childIdx = row.childIndex !== undefined && row.childIndex >= 0 ? row.childIndex : 0;
                    const isDataRow = !isHeaderRow;

                    return (
                      <tr key={ri}>
                        {row.cells.map((cell, ci) => {
                          const isCol0 = ci === 0;
                          const isCol1 = ci === 1;
                          const isSticky = isHeaderRow || isCol0 || isCol1;

                          // Sticky positioning
                          const stickyStyle: React.CSSProperties = {};
                          if (isHeaderRow) {
                            stickyStyle.position = "sticky";
                            stickyStyle.top = HEADER_HEIGHT;
                            stickyStyle.zIndex = 10;
                          }
                          if (isCol0) {
                            stickyStyle.position = "sticky";
                            stickyStyle.left = 0;
                            stickyStyle.zIndex = isHeaderRow ? 20 : 11;
                          }
                          if (isCol1) {
                            stickyStyle.position = "sticky";
                            stickyStyle.left = sheet.colWidths[0] ?? 0;
                            stickyStyle.zIndex = isHeaderRow ? 20 : 11;
                          }

                          // Кликабельны только дата-ячейки (не первые 2 колонки, не заголовок)
                          const isClickable = isDataRow && !isCol0 && !isCol1;
                          const cellKey = `${ri}_${ci}`;
                          const isChecked = checked.has(cellKey);

                          // Отмеченное состояние всегда перекрывает Excel-цвет
                          let bg: string;
                          if (isChecked) {
                            bg = CHILD_CHECKED[childIdx % 2];
                          } else if (cell.bg) {
                            bg = cell.bg;
                          } else if (isDataRow) {
                            bg = CHILD_BASE[childIdx % 2];
                          } else {
                            bg = isSticky ? "#ffffff" : "transparent";
                          }

                          return (
                            <td
                              key={ci}
                              colSpan={cell.colSpan}
                              rowSpan={cell.rowSpan}
                              onClick={isClickable ? () => toggleCell(cellKey) : undefined}
                              style={{
                                border: "1px solid #d1d5db",
                                padding: "2px 4px",
                                fontSize: cell.fontSize ? `${cell.fontSize}pt` : "9pt",
                                fontWeight: cell.bold ? "bold" : "normal",
                                backgroundColor: bg,
                                color: cell.color ?? "#111827",
                                textAlign: cell.align ?? "center",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                verticalAlign: "middle",
                                cursor: isClickable ? "pointer" : "default",
                                userSelect: "none",
                                transition: "background-color 0.15s",
                                ...stickyStyle,
                              }}
                            >
                              {cell.value !== null && cell.value !== undefined ? String(cell.value) : ""}
                            </td>
                          );
                        })}
                      </tr>
                    );
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