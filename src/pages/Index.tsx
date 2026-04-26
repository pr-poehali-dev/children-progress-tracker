import { useState } from "react";
import Icon from "@/components/ui/icon";

type Role = "admin" | "parent" | "director" | null;

const ROLES = [
  {
    id: "admin" as Role,
    label: "Администратор",
    emoji: "🏫",
    desc: "Управление расписанием, учениками и персоналом",
    color: "from-blue-100 to-blue-50",
    accent: "#4A90D9",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: "parent" as Role,
    label: "Родитель",
    emoji: "👨‍👩‍👧",
    desc: "Успеваемость, домашние задания и новости класса",
    color: "from-violet-100 to-violet-50",
    accent: "#8B72D8",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
  {
    id: "director" as Role,
    label: "Руководитель",
    emoji: "📊",
    desc: "Аналитика, отчёты и стратегическое управление",
    color: "from-emerald-100 to-emerald-50",
    accent: "#3BAA7F",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
];

// ============ ADMIN DASHBOARD ============
function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<"schedule" | "students" | "staff" | "messages">("schedule");

  const students = [
    { name: "Анна Петрова", class: "10А", grade: 4.8, status: "присутствует" },
    { name: "Дмитрий Козлов", class: "9Б", grade: 4.2, status: "отсутствует" },
    { name: "Мария Сидорова", class: "11В", grade: 4.9, status: "присутствует" },
    { name: "Иван Новиков", class: "8А", grade: 3.7, status: "присутствует" },
    { name: "Елена Васильева", class: "10Б", grade: 4.5, status: "присутствует" },
  ];

  const schedule = [
    { time: "08:00", subject: "Математика", class: "10А", teacher: "Смирнова И.П.", room: "214" },
    { time: "09:00", subject: "Русский язык", class: "9Б", teacher: "Козлова М.В.", room: "101" },
    { time: "10:00", subject: "Физика", class: "11В", teacher: "Орлов А.С.", room: "305" },
    { time: "11:00", subject: "История", class: "8А", teacher: "Белова Т.Н.", room: "202" },
    { time: "12:00", subject: "Биология", class: "10Б", teacher: "Попова Л.Р.", room: "118" },
  ];

  const staff = [
    { name: "Смирнова И.П.", subject: "Математика", exp: "15 лет", status: "активна" },
    { name: "Козлова М.В.", subject: "Русский язык", exp: "10 лет", status: "активна" },
    { name: "Орлов А.С.", subject: "Физика", exp: "8 лет", status: "отпуск" },
    { name: "Белова Т.Н.", subject: "История", exp: "20 лет", status: "активна" },
  ];

  const messages = [
    { from: "Козлов П.В.", text: "Прошу перенести контрольную работу на пятницу", time: "9:15", unread: true },
    { from: "Попова Л.Р.", text: "Отчёт по биологии готов, жду подтверждения", time: "10:32", unread: true },
    { from: "Смирнова И.П.", text: "Добавила новых учеников в журнал", time: "Вчера", unread: false },
    { from: "Орлов А.С.", text: "Нужно обновить кабинет физики", time: "Вчера", unread: false },
  ];

  const tabs = [
    { id: "schedule", label: "Расписание", icon: "Calendar" },
    { id: "students", label: "Ученики", icon: "Users" },
    { id: "staff", label: "Персонал", icon: "UserCheck" },
    { id: "messages", label: "Сообщения", icon: "MessageSquare" },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white soft-shadow sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Icon name="ArrowLeft" size={20} className="text-muted-foreground" />
            </button>
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-lg">🏫</div>
            <div>
              <p className="font-bold text-foreground leading-tight">Кабинет администратора</p>
              <p className="text-xs text-muted-foreground">МБОУ «Школа №47»</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button className="p-2 rounded-xl hover:bg-muted transition-colors">
                <Icon name="Bell" size={20} className="text-muted-foreground" />
              </button>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full"></span>
            </div>
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center text-white text-sm font-bold">АД</div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Учеников", value: "847", icon: "Users", bg: "bg-blue-50", color: "text-blue-600" },
            { label: "Учителей", value: "54", icon: "UserCheck", bg: "bg-violet-50", color: "text-violet-600" },
            { label: "Классов", value: "28", icon: "BookOpen", bg: "bg-emerald-50", color: "text-emerald-600" },
            { label: "Посещаемость", value: "94%", icon: "TrendingUp", bg: "bg-amber-50", color: "text-amber-600" },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 soft-shadow animate-fade-in hover-lift" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${stat.bg}`}>
                <Icon name={stat.icon as IconName} size={18} className={stat.color} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl soft-shadow overflow-hidden">
          <div className="flex border-b border-border overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon name={tab.icon} size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === "schedule" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Расписание на сегодня</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">Пн, 26 апреля</span>
                </div>
                {schedule.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/40 transition-colors">
                    <div className="w-14 text-center">
                      <span className="text-sm font-bold text-blue-600">{item.time}</span>
                    </div>
                    <div className="w-2 h-2 bg-blue-300 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{item.subject}</p>
                      <p className="text-xs text-muted-foreground">{item.teacher}</p>
                    </div>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-medium">{item.class}</span>
                    <span className="text-xs text-muted-foreground">каб. {item.room}</span>
                  </div>
                ))}
                <button className="w-full mt-3 py-3 rounded-xl border-2 border-dashed border-blue-200 text-blue-500 text-sm font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                  <Icon name="Plus" size={16} />
                  Добавить урок
                </button>
              </div>
            )}

            {activeTab === "students" && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 relative">
                    <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type="text" placeholder="Поиск ученика..." className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-muted/30 text-sm outline-none focus:border-blue-300 transition-colors" />
                  </div>
                  <button className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2">
                    <Icon name="UserPlus" size={15} />
                    Добавить
                  </button>
                </div>
                <div className="space-y-2">
                  {students.map((s, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/40 transition-colors">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-200 to-violet-200 rounded-xl flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
                        {s.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground">Класс {s.class}</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="text-sm font-bold text-foreground">{s.grade}</p>
                        <p className="text-xs text-muted-foreground">Оценка</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                        s.status === "присутствует" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                      }`}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "staff" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Педагогический состав</h3>
                  <button className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2">
                    <Icon name="Plus" size={15} />
                    Добавить
                  </button>
                </div>
                {staff.map((s, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/40 transition-colors">
                    <div className="w-9 h-9 bg-gradient-to-br from-violet-200 to-blue-200 rounded-xl flex items-center justify-center text-sm font-bold text-violet-700 flex-shrink-0">
                      {s.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.subject} · {s.exp}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                      s.status === "активна" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    }`}>{s.status}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "messages" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Входящие сообщения</h3>
                  <span className="text-xs bg-red-100 text-red-500 px-2 py-1 rounded-full font-medium">2 новых</span>
                </div>
                {messages.map((m, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${m.unread ? "bg-blue-50/60 hover:bg-blue-50" : "hover:bg-muted/40"}`}>
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-200 to-violet-200 rounded-xl flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
                      {m.from[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium truncate ${m.unread ? "text-foreground" : "text-muted-foreground"}`}>{m.from}</p>
                        {m.unread && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{m.text}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{m.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ PARENT DASHBOARD ============
function ParentDashboard({ onBack }: { onBack: () => void }) {
  const [activeChild, setActiveChild] = useState(0);
  const [activeTab, setActiveTab] = useState<"grades" | "homework" | "news" | "schedule">("grades");

  const children = [
    { name: "Алиса Морозова", class: "7А", avatar: "А" },
    { name: "Костя Морозов", class: "4В", avatar: "К" },
  ];

  const grades = [
    { subject: "Математика", grades: [5, 4, 5, 5, 4], avg: 4.6, teacher: "Смирнова И.П." },
    { subject: "Русский язык", grades: [4, 5, 4, 3, 4], avg: 4.0, teacher: "Козлова М.В." },
    { subject: "Физика", grades: [5, 5, 4, 5], avg: 4.8, teacher: "Орлов А.С." },
    { subject: "История", grades: [4, 4, 5], avg: 4.3, teacher: "Белова Т.Н." },
    { subject: "Биология", grades: [5, 4, 5, 5], avg: 4.8, teacher: "Попова Л.Р." },
  ];

  const homework = [
    { subject: "Математика", task: "Параграф 24, задачи 1-5", due: "Завтра", done: false, icon: "📐" },
    { subject: "Русский язык", task: "Сочинение «Весна»", due: "Среда", done: true, icon: "📝" },
    { subject: "Физика", task: "Лаб. работа №8", due: "Четверг", done: false, icon: "⚗️" },
    { subject: "История", task: "Прочитать главу 12", due: "Пятница", done: false, icon: "📚" },
  ];

  const news = [
    { title: "Школьный спектакль «Мечты»", date: "30 апреля", desc: "Приглашаем всех родителей на ежегодный театральный вечер в актовом зале.", tag: "Мероприятие" },
    { title: "Родительское собрание", date: "5 мая", desc: "Итоги третьей четверти. Обсуждение успеваемости и планов на конец года.", tag: "Важно" },
    { title: "День науки", date: "15 мая", desc: "Ученики представят свои проекты и исследования на школьной выставке.", tag: "Олимпиада" },
  ];

  const todaySchedule = [
    { time: "08:30", subject: "Математика", room: "214", done: true },
    { time: "09:25", subject: "Русский язык", room: "101", done: true },
    { time: "10:20", subject: "Физика", room: "305", done: false },
    { time: "11:15", subject: "История", room: "202", done: false },
    { time: "12:10", subject: "Биология", room: "118", done: false },
  ];

  const tabs = [
    { id: "grades", label: "Оценки", icon: "Star" },
    { id: "homework", label: "Домашнее задание", icon: "BookOpen" },
    { id: "schedule", label: "Расписание", icon: "Calendar" },
    { id: "news", label: "Новости", icon: "Newspaper" },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white soft-shadow sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Icon name="ArrowLeft" size={20} className="text-muted-foreground" />
            </button>
            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center text-lg">👨‍👩‍👧</div>
            <div>
              <p className="font-bold text-foreground leading-tight">Кабинет родителя</p>
              <p className="text-xs text-muted-foreground">Морозова Светлана</p>
            </div>
          </div>
          <div className="relative">
            <button className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Icon name="Bell" size={20} className="text-muted-foreground" />
            </button>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full"></span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
          {children.map((child, i) => (
            <button
              key={i}
              onClick={() => setActiveChild(i)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all flex-shrink-0 ${
                activeChild === i
                  ? "border-violet-400 bg-violet-50 soft-shadow"
                  : "border-border bg-white hover:border-violet-200"
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                activeChild === i ? "bg-violet-500 text-white" : "bg-violet-100 text-violet-600"
              }`}>{child.avatar}</div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">{child.name}</p>
                <p className="text-xs text-muted-foreground">{child.class}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Средний балл", value: "4.5", icon: "Star", bg: "bg-amber-50", color: "text-amber-500" },
            { label: "Посещаемость", value: "96%", icon: "CheckCircle", bg: "bg-emerald-50", color: "text-emerald-500" },
            { label: "ДЗ на сегодня", value: "3", icon: "BookOpen", bg: "bg-violet-50", color: "text-violet-500" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 soft-shadow text-center animate-fade-in" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className={`w-9 h-9 rounded-xl mx-auto flex items-center justify-center mb-2 ${s.bg}`}>
                <Icon name={s.icon as IconName} size={18} className={s.color} />
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl soft-shadow overflow-hidden">
          <div className="flex border-b border-border overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "text-violet-600 border-b-2 border-violet-500 bg-violet-50/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon name={tab.icon} size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === "grades" && (
              <div className="space-y-3">
                {grades.map((g, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border hover:border-violet-200 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-foreground">{g.subject}</p>
                      <span className={`text-sm font-bold px-2 py-1 rounded-lg ${
                        g.avg >= 4.5 ? "bg-emerald-50 text-emerald-600" : g.avg >= 4 ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                      }`}>{g.avg.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      {g.grades.map((grade, j) => (
                        <span key={j} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          grade === 5 ? "bg-emerald-100 text-emerald-600" :
                          grade === 4 ? "bg-blue-100 text-blue-600" :
                          grade === 3 ? "bg-amber-100 text-amber-600" :
                          "bg-red-100 text-red-500"
                        }`}>{grade}</span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{g.teacher}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "homework" && (
              <div className="space-y-3">
                {homework.map((h, i) => (
                  <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                    h.done ? "border-emerald-200 bg-emerald-50/40" : "border-border hover:border-violet-200"
                  }`}>
                    <span className="text-xl flex-shrink-0">{h.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${h.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{h.subject}</p>
                        {h.done && <Icon name="CheckCircle" size={14} className="text-emerald-500" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{h.task}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium flex-shrink-0 ${
                      h.due === "Завтра" ? "bg-amber-50 text-amber-600" : "bg-muted text-muted-foreground"
                    }`}>{h.due}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "schedule" && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">Сегодня, понедельник</p>
                {todaySchedule.map((item, i) => (
                  <div key={i} className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${item.done ? "opacity-50" : "hover:bg-muted/40"}`}>
                    <span className="text-sm font-bold text-violet-600 w-14">{item.time}</span>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.done ? "bg-emerald-400" : "bg-violet-300"}`}></div>
                    <p className={`flex-1 font-medium ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.subject}</p>
                    <span className="text-xs text-muted-foreground">каб. {item.room}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "news" && (
              <div className="space-y-4">
                {news.map((n, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border hover:border-violet-200 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-semibold text-foreground">{n.title}</p>
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium flex-shrink-0 ${
                        n.tag === "Важно" ? "bg-red-50 text-red-500" :
                        n.tag === "Мероприятие" ? "bg-violet-50 text-violet-600" :
                        "bg-blue-50 text-blue-600"
                      }`}>{n.tag}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{n.desc}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Icon name="Calendar" size={12} />
                      {n.date}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ DIRECTOR DASHBOARD ============
function DirectorDashboard({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<"analytics" | "reports" | "staff" | "plans">("analytics");

  const tabs = [
    { id: "analytics", label: "Аналитика", icon: "BarChart3" },
    { id: "reports", label: "Отчёты", icon: "FileText" },
    { id: "staff", label: "Кадры", icon: "Users" },
    { id: "plans", label: "Планы", icon: "Target" },
  ] as const;

  const kpis = [
    { label: "Успеваемость", value: "87%", change: "+2.3%", up: true, icon: "TrendingUp", bg: "bg-emerald-50", color: "text-emerald-500" },
    { label: "Посещаемость", value: "94%", change: "+1.1%", up: true, icon: "UserCheck", bg: "bg-blue-50", color: "text-blue-500" },
    { label: "Удовл. родителей", value: "4.6", change: "+0.2", up: true, icon: "Heart", bg: "bg-violet-50", color: "text-violet-500" },
    { label: "Учителей", value: "54", change: "-2", up: false, icon: "Users", bg: "bg-amber-50", color: "text-amber-500" },
  ];

  const reports = [
    { title: "Итоги 3-й четверти", date: "20 апреля 2026", type: "Успеваемость", size: "2.4 МБ" },
    { title: "Кадровый состав 2026", date: "15 апреля 2026", type: "Кадры", size: "1.1 МБ" },
    { title: "Финансовый отчёт Q1", date: "1 апреля 2026", type: "Финансы", size: "3.7 МБ" },
    { title: "Аналитика посещаемости", date: "28 марта 2026", type: "Посещаемость", size: "0.8 МБ" },
  ];

  const staffData = [
    { dept: "Точные науки", count: 12, load: 95 },
    { dept: "Гуманитарные", count: 15, load: 88 },
    { dept: "Естественные науки", count: 9, load: 91 },
    { dept: "Физкультура и ОБЖ", count: 6, load: 78 },
    { dept: "Искусство и музыка", count: 8, load: 82 },
  ];

  const plans = [
    { title: "Обновление кабинетов физики и химии", status: "В работе", progress: 65, due: "Июнь 2026" },
    { title: "Повышение квалификации педагогов", status: "Запланировано", progress: 20, due: "Август 2026" },
    { title: "Внедрение цифрового журнала", status: "Завершено", progress: 100, due: "Апрель 2026" },
    { title: "Ремонт спортивного зала", status: "В работе", progress: 40, due: "Сентябрь 2026" },
  ];

  const barData = [
    { month: "Янв", value: 84 },
    { month: "Фев", value: 86 },
    { month: "Мар", value: 85 },
    { month: "Апр", value: 87 },
  ];
  const maxBar = Math.max(...barData.map(d => d.value));

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white soft-shadow sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Icon name="ArrowLeft" size={20} className="text-muted-foreground" />
            </button>
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-lg">📊</div>
            <div>
              <p className="font-bold text-foreground leading-tight">Кабинет руководителя</p>
              <p className="text-xs text-muted-foreground">МБОУ «Школа №47»</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">Директор: Иванов В.А.</span>
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-sm font-bold">ИВ</div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {kpis.map((k, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 soft-shadow animate-fade-in hover-lift" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${k.bg}`}>
                <Icon name={k.icon as IconName} size={18} className={k.color} />
              </div>
              <p className="text-2xl font-bold text-foreground">{k.value}</p>
              <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
              <span className={`text-xs font-medium ${k.up ? "text-emerald-500" : "text-red-400"}`}>
                {k.change} к прошлому мес.
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl soft-shadow overflow-hidden">
          <div className="flex border-b border-border overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon name={tab.icon} size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Успеваемость по месяцам (%)</p>
                  <div className="flex items-end gap-3 h-32">
                    {barData.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-emerald-600">{d.value}%</span>
                        <div
                          className="w-full bg-gradient-to-t from-emerald-400 to-emerald-300 rounded-t-lg"
                          style={{ height: `${(d.value / maxBar) * 90}%` }}
                        />
                        <span className="text-xs text-muted-foreground">{d.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: "Отличники", value: "18%", icon: "🏆" },
                    { label: "Хорошисты", value: "45%", icon: "⭐" },
                    { label: "Троечники", value: "31%", icon: "📘" },
                    { label: "Неуспевающих", value: "6%", icon: "⚠️" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                      <span className="text-xl">{item.icon}</span>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{item.label}</span>
                          <span className="text-sm font-bold text-foreground">{item.value}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: item.value }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "reports" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Документы и отчёты</h3>
                  <button className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2">
                    <Icon name="Plus" size={15} />
                    Создать
                  </button>
                </div>
                {reports.map((r, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer group">
                    <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon name="FileText" size={18} className="text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.date} · {r.size}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground">{r.type}</span>
                    <Icon name="Download" size={16} className="text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                  </div>
                ))}
              </div>
            )}

            {activeTab === "staff" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">Нагрузка по отделам</p>
                {staffData.map((s, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border hover:border-emerald-200 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-foreground">{s.dept}</p>
                      <span className="text-sm text-muted-foreground">{s.count} чел.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full" style={{ width: `${s.load}%` }} />
                      </div>
                      <span className="text-xs font-medium text-emerald-600 w-8 text-right">{s.load}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "plans" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Стратегические планы</h3>
                  <button className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2">
                    <Icon name="Plus" size={15} />
                    Добавить
                  </button>
                </div>
                {plans.map((p, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border hover:border-emerald-200 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="font-medium text-foreground">{p.title}</p>
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium flex-shrink-0 ${
                        p.status === "Завершено" ? "bg-emerald-50 text-emerald-600" :
                        p.status === "В работе" ? "bg-blue-50 text-blue-600" :
                        "bg-muted text-muted-foreground"
                      }`}>{p.status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${
                          p.progress === 100 ? "bg-emerald-400" : "bg-blue-400"
                        }`} style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground w-8 text-right">{p.progress}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Icon name="Calendar" size={12} />
                      Срок: {p.due}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN PAGE ============
export default function Index() {
  const [role, setRole] = useState<Role>(null);

  if (role === "admin") return <AdminDashboard onBack={() => setRole(null)} />;
  if (role === "parent") return <ParentDashboard onBack={() => setRole(null)} />;
  if (role === "director") return <DirectorDashboard onBack={() => setRole(null)} />;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-100/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-emerald-100/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl soft-shadow-lg mb-6 text-4xl">
            🏫
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
            ШколаПро
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Современная система управления школой.<br />
            Выберите свой кабинет для входа.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-3xl">
          {ROLES.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`group relative bg-gradient-to-br ${r.color} border-2 border-white rounded-3xl p-7 text-left soft-shadow hover-lift transition-all`}
              style={{ animation: `fadeIn 0.5s ease-out ${0.1 + i * 0.12}s both` }}
            >
              <div className="text-4xl mb-4">{r.emoji}</div>
              <h3 className="text-xl font-bold text-foreground mb-2">{r.label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{r.desc}</p>
              <div
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white w-fit group-hover:gap-3 transition-all"
                style={{ backgroundColor: r.accent }}
              >
                Войти
                <Icon name="ArrowRight" size={15} />
              </div>
            </button>
          ))}
        </div>

        <p className="mt-12 text-xs text-muted-foreground" style={{ animation: "fadeIn 0.5s ease-out 0.5s both" }}>
          МБОУ «Школа №47» · 2026 год · Все права защищены
        </p>
      </div>
    </div>
  );
}