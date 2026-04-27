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
}

interface ProgressRow {
  cells: ProgressCell[];
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

function parseSheet(ws: XLSX.WorkSheet): ProgressSheet {
  const ref = ws["!ref"];
  if (!ref) return { rows: [], colWidths: [] };

  const range = XLSX.utils.decode_range(ref);
  const rows: ProgressRow[] = [];

  const colWidths: number[] = [];
  const rawCols = (ws["!cols"] as Array<{ wch?: number; wpx?: number }> | undefined) ?? [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const col = rawCols[c];
    if (col?.wpx) colWidths.push(col.wpx);
    else if (col?.wch) colWidths.push(Math.round(col.wch * 7));
    else colWidths.push(50);
  }

  for (let r = range.s.r; r <= range.e.r; r++) {
    const cells: ProgressCell[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr] as XLSX.CellObject & {
        s?: {
          font?: { sz?: number; bold?: boolean; color?: { rgb?: string } };
          fill?: { fgColor?: { rgb?: string }; bgColor?: { rgb?: string } };
          alignment?: { horizontal?: string };
        };
      };

      if (!cell) {
        cells.push({ value: null });
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

      cells.push({
        value: cell.v !== undefined ? cell.v : null,
        fontSize: font.sz ?? undefined,
        bold: font.bold ?? false,
        bg: bgHex,
        color: colorHex,
        align,
      });
    }
    rows.push({ cells });
  }

  return { rows, colWidths };
}

interface Props {
  onBack: () => void;
}

export default function ProgressView({ onBack }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<ProgressSheet | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white sticky top-0 z-20" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}>
        <div className="px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
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
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleImport}
            />
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
              <p className="text-sm text-muted-foreground">Содержимое ячеек, цвета и размеры шрифтов будут отображены как в оригинале</p>
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
            <div className="overflow-auto">
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
                  {sheet.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.cells.map((cell, ci) => (
                        <td
                          key={ci}
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "2px 4px",
                            fontSize: cell.fontSize ? `${cell.fontSize}pt` : "9pt",
                            fontWeight: cell.bold ? "bold" : "normal",
                            backgroundColor: cell.bg ?? "transparent",
                            color: cell.color ?? "#111827",
                            textAlign: cell.align ?? "center",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            verticalAlign: "middle",
                          }}
                        >
                          {cell.value !== null && cell.value !== undefined ? String(cell.value) : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
