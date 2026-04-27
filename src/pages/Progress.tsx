import Icon from "@/components/ui/icon";

interface Props {
  onBack: () => void;
}

export default function ProgressView({ onBack }: Props) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white sticky top-0 z-30" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}>
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <Icon name="ArrowLeft" size={20} className="text-muted-foreground" />
          </button>
          <span className="text-lg">📊</span>
          <p className="font-bold text-foreground">Прогресс по обучению</p>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Страница в разработке</p>
      </div>
    </div>
  );
}
