import { useState, useEffect, useRef } from "react";
import { Calendar, CalendarDays, Clock, Send, Edit3, Check, X, Eye, Settings, Zap, TrendingUp, Image, Hash, ChevronDown, ChevronUp, Filter, BarChart3, AlertCircle, ExternalLink, Save, GripVertical, Plus, Sparkles, Loader2, Package } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client ──
const SUPABASE_URL = "https://gqhkvwuicttwdfmxlowb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGt2d3VpY3R0d2RmbXhsb3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDY2OTYsImV4cCI6MjA4OTc4MjY5Nn0.JDqH9HuMoiYk5WKXT3ONUn9K4nLKFCGjdRB0oGDqg8k";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Supabase helpers ──
async function loadPostsFromSupabase() {
  try {
    const { data, error } = await supabase.from("posts").select("*").order("row_num", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data.map(row => ({
      row: row.row_num, image_url: row.image_url || "", caption: row.caption || "",
      hashtags: row.hashtags || "", quote: row.quote || "", status: row.status || "draft",
      posted_date: row.posted_date || "", scheduled_iso: row.scheduled_iso || null,
      canva_status: row.canva_status || "",
    }));
  } catch (e) {
    console.warn("Supabase load failed:", e.message);
    return null;
  }
}

async function saveAllPostsToSupabase(posts) {
  try {
    const rows = posts.map(p => ({
      row_num: p.row, image_url: p.image_url || "", caption: p.caption || "",
      hashtags: p.hashtags || "", quote: p.quote || "", status: p.status || "draft",
      posted_date: p.posted_date || "", scheduled_iso: p.scheduled_iso || null,
      canva_status: p.canva_status || "",
    }));
    const { error } = await supabase.from("posts").upsert(rows, { onConflict: "row_num" });
    if (error) throw error;
  } catch (e) {
    console.warn("Supabase save failed:", e.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// EVOLVIUM Social Media Dashboard
// Instagram Content Manager for @evoluciavedomia
// ═══════════════════════════════════════════════════════════════

// ── Optimal posting times for SK/CZ Instagram audience ──
const OPTIMAL_TIMES = [
  { day: "Pondelok", times: ["07:00", "12:00", "19:00"], score: 85 },
  { day: "Utorok", times: ["07:00", "12:00", "18:00"], score: 90 },
  { day: "Streda", times: ["07:00", "11:00", "19:00"], score: 88 },
  { day: "Štvrtok", times: ["07:00", "12:00", "20:00"], score: 87 },
  { day: "Piatok", times: ["08:00", "13:00", "19:00"], score: 82 },
  { day: "Sobota", times: ["09:00", "11:00", "18:00"], score: 78 },
  { day: "Nedeľa", times: ["09:00", "10:00", "19:00"], score: 80 },
];

const DAY_NAMES = ["Nedeľa", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota"];

function getNextOptimalTime(skipSlots = 0, takenTimes = []) {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  let skipped = 0;

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const dayIndex = (currentDay + dayOffset) % 7;
    const dayData = OPTIMAL_TIMES.find(d => d.day === DAY_NAMES[dayIndex]);
    if (!dayData) continue;

    for (const time of dayData.times) {
      const [h, m] = time.split(":").map(Number);
      if (dayOffset === 0 && (h < currentHour || (h === currentHour && m <= currentMinute))) continue;
      // Skip already-taken times
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + dayOffset);
      nextDate.setHours(h, m, 0, 0);
      const timeKey = nextDate.toISOString();
      if (takenTimes.includes(timeKey)) continue;
      if (skipped < skipSlots) { skipped++; continue; }
      return { date: nextDate, score: dayData.score, day: dayData.day, time };
    }
  }
  return { date: new Date(now.getTime() + 3600000), score: 75, day: DAY_NAMES[currentDay], time: "—" };
}

// ── Status badge component ──
function StatusBadge({ status }) {
  const config = {
    draft: { bg: "bg-gray-700", text: "text-gray-300", label: "Draft", dot: "bg-gray-400" },
    scheduled: { bg: "bg-amber-900/40", text: "text-amber-300", label: "Napl\u00E1novan\u00FD", dot: "bg-amber-400" },
    posted: { bg: "bg-emerald-900/40", text: "text-emerald-300", label: "Publikovan\u00FD", dot: "bg-emerald-400" },
    failed: { bg: "bg-red-900/40", text: "text-red-300", label: "Chyba", dot: "bg-red-400" },
  };
  const c = config[status] || config.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ── Settings panel ──
function SettingsPanel({ config, onSave, onClose }) {
  const [local, setLocal] = useState({ ...config });
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings size={20} /> Nastavenia
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
                    <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Make.com Webhook URL</label>
            <input
              type="text"
              value={local.webhookUrl}
              onChange={e => setLocal({ ...local, webhookUrl: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="https://hook.eu1.make.com/..."
            />
            <p className="text-xs text-gray-500 mt-1">
              V Make.com pridaj "Webhooks → Custom webhook" modul na začiatok scenára
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Canva Webhook URL (Make.com)</label>
            <input
              type="text"
              value={local.canvaWebhookUrl || ""}
              onChange={e => setLocal({ ...local, canvaWebhookUrl: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="https://hook.eu1.make.com/..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Druhý Make.com scenár: Webhook → Canva → Cloudinary → Custom webhook" modul na začiatok scenára
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { onSave(local); onClose(); }}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Save size={16} /> Uložiť
          </button>
          <button onClick={onClose} className="px-6 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2.5 rounded-lg transition-colors">
            Zrušiť
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 5-Day Scheduler component ──
function FiveDayScheduler({ post, scheduledTimes, onSchedule, onAutoPost }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const taken = scheduledTimes || [];
  const now = new Date();
  const days = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i);
    const dayIndex = d.getDay();
    const dayData = OPTIMAL_TIMES.find(x => x.day === DAY_NAMES[dayIndex]);
    const dateStr = d.toLocaleDateString("sk-SK", { day: "numeric", month: "short" });
    const dayName = i === 0 ? "Dnes" : i === 1 ? "Zajtra" : DAY_NAMES[dayIndex];
    const availableTimes = (dayData?.times || ["08:00", "12:00", "18:00"]).filter(t => {
      const [h, m] = t.split(":").map(Number);
      if (i === 0 && (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()))) return false;
      const checkDate = new Date(d); checkDate.setHours(h, m, 0, 0);
      if (taken.includes(checkDate.toISOString())) return false;
      return true;
    });
    days.push({ index: i, date: d, dateStr, dayName, dayData, availableTimes, score: dayData?.score || 75 });
  }
  const handleTimeClick = (day, time) => {
    const schedDate = new Date(day.date);
    const [h, m] = time.split(":").map(Number);
    schedDate.setHours(h, m, 0, 0);
    onSchedule({ date: schedDate, score: day.score, day: DAY_NAMES[day.date.getDay()], time });
  };
  return (
    <div className="space-y-2">
      <button onClick={onAutoPost} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-medium rounded-lg transition-all shadow-lg shadow-emerald-600/20">
        <Zap size={12} /> Auto-post v najlepsom case
      </button>
      <p className="text-xs text-gray-500">Alebo vyber den a cas:</p>
      <div className="flex gap-1.5">
        {days.map(day => (
          <button key={day.index} onClick={() => setSelectedDay(selectedDay === day.index ? null : day.index)}
            className={`flex-1 py-2 px-1 rounded-lg text-center transition-all border ${
              selectedDay === day.index
                ? "bg-blue-600/20 border-blue-500/50 shadow-lg shadow-blue-500/10"
                : "bg-gray-800/50 border-gray-700/30 hover:bg-gray-700/50 hover:border-gray-600"
            }`}>
            <div className={`text-[10px] font-medium ${selectedDay === day.index ? "text-blue-300" : "text-gray-500"}`}>{day.dayName}</div>
            <div className={`text-xs font-bold ${selectedDay === day.index ? "text-blue-200" : "text-gray-300"}`}>{day.dateStr}</div>
            {day.availableTimes.length > 0 && (
              <div className="flex justify-center mt-1"><span className={`w-1.5 h-1.5 rounded-full ${selectedDay === day.index ? "bg-blue-400" : "bg-emerald-500/60"}`} /></div>
            )}
          </button>
        ))}
      </div>
      {selectedDay !== null && (
        <div className="bg-gray-800/30 rounded-lg p-2 border border-gray-700/30">
          {days[selectedDay].availableTimes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {days[selectedDay].availableTimes.map(time => (
                <button key={time} onClick={() => handleTimeClick(days[selectedDay], time)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-900/30 hover:bg-amber-800/40 text-amber-300 text-xs rounded-lg transition-colors border border-amber-700/30">
                  <Clock size={10} /> {time}
                  <span className="text-amber-500/60 text-[9px] ml-0.5">({days[selectedDay].score}%)</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-1">Ziadne volne casy</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Post card component ──
function PostCard({ post, index, scheduledTimes, onEdit, onPostNow, onSchedule, onCancelSchedule, onAutoPost, onDragStart, onDragOver, onDragEnd, isDragging, isDragOver }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [editHashtags, setEditHashtags] = useState(post.hashtags);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const taken = scheduledTimes || [];

  const handleSave = () => {
    onEdit(index, { caption: editCaption, hashtags: editHashtags });
    setEditing(false);
  };

  const isPhoto = post.image_url?.includes(".jpg");
  const typeLabel = isPhoto ? "Foto knihy" : "Grafický post";
  const typeColor = isPhoto ? "text-purple-400" : "text-blue-400";

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart?.(index); }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; onDragOver?.(index); }}
      onDrop={(e) => { e.preventDefault(); onDragEnd?.(); }}
      onDragEnd={() => onDragEnd?.()}
      className={`bg-gray-800/80 rounded-xl border transition-all duration-200 ${
        isDragging ? "opacity-40 scale-95 border-blue-500/50" :
        isDragOver ? "border-blue-400 shadow-lg shadow-blue-500/10 translate-y-[-2px]" :
        expanded ? "border-blue-500/50 shadow-lg shadow-blue-500/5" : "border-gray-700/50 hover:border-gray-600"
      }`}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Drag handle */}
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 transition-colors"
          onClick={(e) => e.stopPropagation()}
          title="Presuň post"
        >
          <GripVertical size={18} />
        </div>

        {/* Thumbnail */}
        <div className="w-16 h-20 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0 relative">
          {post.image_url && !imgError ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                </div>
              )}
              <img
                src={post.image_url.replace("/upload/", "/upload/w_128,h_160,c_fill,q_60/")}
                alt=""
                className={`w-full h-full object-cover transition-opacity ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image size={20} className="text-gray-600" />
            </div>
          )}
        </div>

        {/* Post info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white">Post #{post.row || index + 1}</span>
            <span className={`text-xs ${typeColor}`}>{typeLabel}</span>
          </div>
          <p className="text-sm text-gray-400 truncate">{post.caption?.substring(0, 80) || "Bez textu"}...</p>
        </div>

        {/* Status + expand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge status={post.status || "draft"} />
          {expanded ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-700/50 p-4">
          <div className="flex gap-6">
            {/* Large preview */}
            <div className="w-48 flex-shrink-0">
              <div className="w-48 h-60 rounded-xl overflow-hidden bg-gray-900 shadow-lg">
                {post.image_url && !imgError ? (
                  <img
                    src={post.image_url.replace("/upload/", "/upload/w_384,h_480,c_fill,q_80/")}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image size={32} className="text-gray-600" />
                  </div>
                )}
              </div>
              <a
                href={post.image_url}
                target="_blank"
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-400 mt-2 transition-colors"
              >
                <ExternalLink size={12} /> Otvoriť originál
              </a>
            </div>

            {/* Caption + controls */}
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Caption</label>
                    <textarea
                      value={editCaption}
                      onChange={e => setEditCaption(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      rows={5}
                    />
                    <p className="text-xs text-gray-500 mt-1">{editCaption?.length || 0} / 2 200 znakov</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Hashtagy</label>
                    <textarea
                      value={editHashtags}
                      onChange={e => setEditHashtags(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors">
                      <Check size={14} /> Uložiť
                    </button>
                    <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors">
                      <X size={14} /> Zrušiť
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Caption</label>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{post.caption || "—"}</p>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Hashtagy</label>
                    <p className="text-sm text-blue-400">{post.hashtags || "—"}</p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {post.status !== "posted" && !editing && (
                <div className="space-y-3 mt-4 pt-4 border-t border-gray-700/50">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors"
                    >
                      <Edit3 size={14} /> Upraviť
                    </button>
                    <button
                      onClick={() => onPostNow(index)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-sm rounded-lg transition-colors shadow-lg shadow-pink-600/20"
                    >
                      <Send size={14} /> Postnúť teraz
                    </button>
                    {post.status === "scheduled" && (
                      <button
                        onClick={() => onCancelSchedule(index)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-300 text-sm rounded-lg transition-colors border border-red-700/30"
                      >
                        <X size={14} /> Zrušiť plánovanie
                      </button>
                    )}
                  </div>

                  {/* 5-day scheduler */}
                  {post.status !== "scheduled" && (
                    <FiveDayScheduler
                      post={post}
                      scheduledTimes={taken}
                      onSchedule={(slot) => onSchedule(index, slot)}
                      onAutoPost={() => onAutoPost(index)}
                    />
                  )}
                </div>
              )}

              {post.status === "posted" && post.posted_date && (
                <div className="flex items-center gap-2 mt-3 text-sm text-emerald-400">
                  <Check size={14} /> Publikovaný {post.posted_date}
                </div>
              )}

              {/* Quote text for Canva */}
              {post.quote && (
                <div className="mt-3 p-3 bg-purple-900/20 border border-purple-700/30 rounded-lg">
                  <p className="text-xs text-purple-400 mb-1 font-medium">Citát pre Canva:</p>
                  <p className="text-sm text-purple-200 italic">„{post.quote}"</p>
                </div>
              )}

              {/* Canva status */}
              {post.canva_status === "pending" && !post.image_url && (
                <div className="flex items-center gap-2 mt-2 text-xs text-amber-400">
                  <Package size={12} /> Čaká na schválenie a odoslanie do Canvy
                </div>
              )}
              {post.canva_status === "generating" && (
                <div className="flex items-center gap-2 mt-2 text-xs text-blue-400">
                  <Loader2 size={12} className="animate-spin" /> Canva generuje dizajn...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Optimal time widget ──
function OptimalTimeWidget() {
  const next = getNextOptimalTime();
  const today = new Date().getDay();
  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-xl border border-gray-700/50 p-5">
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-amber-400" /> Optimálne časy postovania
      </h3>
      <div className="space-y-2">
        {OPTIMAL_TIMES.map(day => (
          <div key={day.day} className={`flex items-center gap-3 py-1.5 px-2 rounded-lg text-sm ${
            DAY_NAMES[today] === day.day ? "bg-blue-600/10 border border-blue-500/20" : ""
          }`}>
            <span className={`w-16 text-xs font-medium ${DAY_NAMES[today] === day.day ? "text-blue-400" : "text-gray-500"}`}>
              {day.day.substring(0, 3)}
            </span>
            <div className="flex gap-1.5 flex-1">
              {day.times.map(t => (
                <span key={t} className="px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-300">{t}</span>
              ))}
            </div>
            <div className="w-16 bg-gray-700/50 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-green-500"
                style={{ width: `${day.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 bg-blue-600/10 border border-blue-500/20 rounded-lg">
        <p className="text-sm text-blue-300 flex items-center gap-2">
          <Zap size={14} />
          Najbližší najlepší čas: <strong>{next.day} o {next.time}</strong>
        </p>
      </div>
    </div>
  );
}

// ── Stats bar ──
function StatsBar({ posts }) {
  const total = posts.length;
  const drafted = posts.filter(p => !p.status || p.status === "draft").length;
  const scheduled = posts.filter(p => p.status === "scheduled").length;
  const posted = posts.filter(p => p.status === "posted").length;
  const failed = posts.filter(p => p.status === "failed").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Celkom", value: total, color: "text-white", bg: "bg-gray-800" },
        { label: "Drafts", value: drafted, color: "text-gray-400", bg: "bg-gray-800" },
        { label: "Naplánované", value: scheduled, color: "text-amber-400", bg: "bg-amber-900/20" },
        { label: "Publikované", value: posted, color: "text-emerald-400", bg: "bg-emerald-900/20" },
      ].map(stat => (
        <div key={stat.label} className={`${stat.bg} rounded-xl border border-gray-700/50 p-4`}>
          <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Real content calendar data (Batch 3 — 13 grafických postov + 4 fotky knihy) ──
const DEMO_POSTS = [
  {
    row: 2,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/1_i1tsmm.png",
    caption: `\u201ESkuto\u010Dn\u00E1 zmena neza\u010D\u00EDna v okol\u00ED \u2014 za\u010D\u00EDna v tebe.\u201C\n\nKa\u017Ed\u00FD de\u0148 m\u00E1\u0161 vo\u013Ebu: \u017Ei\u0165 pod\u013Ea star\u00FDch vzorcov, alebo sa posun\u00FA\u0165 o krok bli\u017E\u0161ie k sebe sam\u00E9mu.`,
    hashtags: "#evolvium #evoluciavedomia #sebareflexia #osobnyrast #vedomie",
    status: "posted",
    posted_date: "21.3.2026",
  },
  {
    row: 3,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/2_zmj3p1.png",
    caption: `Kedy naposledy si sa zastavil a sp\u00FDtal sa s\u00E1m seba: \u201EKto vlastne som bez v\u0161etk\u00FDch rol\u00ED, ktor\u00E9 hr\u00E1m?\u201C`,
    hashtags: "#evolvium #ktosom #sebauvedomenie #otazky #vnutornysvet",
    status: "scheduled",
  },
  {
    row: 4,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/3_i7yqrf.png",
    caption: `\u201EStrach nie je nepriate\u013E. Je to kompas, ktor\u00FD ukazuje smerom k tvojmu rastu.\u201C`,
    hashtags: "#evolvium #strach #rast #odvaha #cesta",
    status: "draft",
  },
  {
    row: 5,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/e_grayscale,c_fill,w_1080,h_1350,g_auto/IMG_4323-2_w9uulg.jpg",
    caption: `Evol\u00FAcia vedomia \u2013 Ja\nKniha, ktor\u00E1 ti pom\u00F4\u017Ee n\u00E1js\u0165 cestu sp\u00E4\u0165 k sebe.`,
    hashtags: "#evolvium #kniha #evoluciavedomia #slovensko",
    status: "draft",
  },
  {
    row: 6,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/4_ofggxw.png",
    caption: `\u201EMyse\u013E, ktor\u00E1 sa raz roz\u0161\u00EDrila novou my\u0161lienkou, sa u\u017E nikdy nevr\u00E1ti do p\u00F4vodn\u00E9ho tvaru.\u201C`,
    hashtags: "#evolvium #mysel #myslienky #transformacia #vedomie",
    status: "draft",
  },
  {
    row: 7,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/5_iqzuve.png",
    caption: `\u010Co keby v\u0161etko, \u010Domu ver\u00ED\u0161 o sebe, bolo len pr\u00EDbeh, ktor\u00FD si si povedal tak ve\u013Eakr\u00E1t, a\u017E si mu uveril?`,
    hashtags: "#evolvium #presvedcenia #sebapoznanie #zmena #pribeh",
    status: "draft",
  },
  {
    row: 8,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/6_npefjt.png",
    caption: `\u201ENemus\u00ED\u0161 ma\u0165 v\u0161etky odpovede. Sta\u010D\u00ED ma\u0165 odvahu kl\u00E1s\u0165 si tie spr\u00E1vne ot\u00E1zky.\u201C`,
    hashtags: "#evolvium #otazky #odvaha #mudrost #cesta",
    status: "draft",
  },
  {
    row: 9,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/e_grayscale,c_fill,w_1080,h_1350,g_auto/4T0A6363_mbcuwv.jpg",
    caption: `Pri jazere s knihou, ktor\u00E1 men\u00ED perspekt\u00EDvu.\nEvolvium \u2013 cesta dovn\u00FAtra.`,
    hashtags: "#evolvium #priroda #kniha #pokoj #slovensko",
    status: "draft",
  },
  {
    row: 10,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/7_hfwyzz.png",
    caption: `Kedy naposledy si urobil nie\u010Do, \u010Do \u0165a naozaj vydesilo \u2014 a pr\u00E1ve preto to bolo to najlep\u0161ie rozhodnutie?`,
    hashtags: "#evolvium #komfortnazona #rozhodnutia #rast #zivot",
    status: "draft",
  },
  {
    row: 11,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/8_pb3kwf.png",
    caption: `\u201ETvoje telo je chr\u00E1m. Tvoja myse\u013E je z\u00E1hrada. To, \u010Do do nej zaseje\u0161, ur\u010D\u00ED, \u010Do z nej vyrastie.\u201C`,
    hashtags: "#evolvium #telo #mysel #vedomyzivot #harmonia #sebalaska",
    status: "draft",
  },
  {
    row: 12,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/9_be5z95.png",
    caption: `Ako \u010Dasto rob\u00ED\u0161 veci len preto, \u017Ee sa to od teba o\u010Dak\u00E1va \u2014 a nie preto, \u017Ee to naozaj chce\u0161?`,
    hashtags: "#evolvium #autenticita #sloboda #rozhodnutia #vnutornycompas",
    status: "draft",
  },
  {
    row: 13,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/e_grayscale,c_fill,w_1080,h_1350,g_auto/4T0A6284_ujkmwh.jpg",
    caption: `Otvoren\u00E1 kniha, otvoren\u00E1 myse\u013E.\nHory v pozad\u00ED pripom\u00EDnaj\u00FA, \u017Ee ka\u017Ed\u00FD v\u00FDstup za\u010D\u00EDna prv\u00FDm krokom.`,
    hashtags: "#evolvium #kniha #hory #slovensko #priroda #cesta",
    status: "draft",
  },
  {
    row: 14,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/10_cq19lo.png",
    caption: `\u201ENajv\u00E4\u010D\u0161ia odvaha nie je by\u0165 siln\u00FD. Je to dovoli\u0165 si by\u0165 zranite\u013En\u00FD.\u201C`,
    hashtags: "#evolvium #odvaha #zranitelnost #sila #rast #vedomie",
    status: "draft",
  },
  {
    row: 15,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/11_k0mwrr.png",
    caption: `\u010Co keby ti \u017Eivot ned\u00E1val prek\u00E1\u017Eky, ale pozv\u00E1nky na to, aby si sa stal silnej\u0161\u00EDm?`,
    hashtags: "#evolvium #prekazky #vyzvy #silnejsi #perspektiva #zivot",
    status: "draft",
  },
  {
    row: 16,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/12_evlonm.png",
    caption: `\u201ETi\u0161ina nie je pr\u00E1zdnota. Je to priestor, kde sa rod\u00ED pochopenie.\u201C`,
    hashtags: "#evolvium #tisina #pokoj #meditacia #pochopenie #vnutornysvet",
    status: "draft",
  },
  {
    row: 17,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/e_grayscale,c_fill,w_1080,h_1350,g_auto/4T0A6346-2_f5zdx9.jpg",
    caption: `Evol\u00FAcia vedomia \u2013 Ja\nKniha od Luk\u00E1\u0161a Hor\u00E1ka o ceste sp\u00E4\u0165 k sebe.\n\nwww.evolvium.com`,
    hashtags: "#evolvium #kniha #evoluciavedomia #autor #slovensko",
    status: "draft",
  },
  {
    row: 18,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/13_kfr3a5.png",
    caption: `\u201EKa\u017Ed\u00FD koniec je za\u010Diatok nie\u010Doho nov\u00E9ho. Ka\u017Ed\u00E9 zavretie dver\u00ED je pozvan\u00EDm otvori\u0165 \u010Fal\u0161ie.\u201C`,
    hashtags: "#evolvium #novyzaciatok #zmena #nadej #cesta #vedomie",
    status: "draft",
  },
];


// ── Pre-written quotes for batch generation ──
const BATCH_QUOTES = [
  {
    quote: "Najväčšia revolúcia, akú môžeš zažiť, je revolúcia vlastného vedomia.",
    caption: "Revolúcia neznačí prevrat vonku — znamená premenu vnútra.\nKaždý krát, keď si uvedomíš niečo nové o sebe, meníš celý svoj svet.",
    hashtags: "#evolvium #revolucia #vedomie #premena #sebapoznanie"
  },
  {
    quote: "Každá kríza je pozvánka pozrieť sa na seba z perspektívy, ktorú si doteraz odmietal vidieť.",
    caption: "Krízy nie sú tresty. Sú to zrkadlá.\nKeď sa všetko rúca, máš šancu vidieť, čo si doteraz nechcel.",
    hashtags: "#evolvium #kriza #perspektiva #rast #zrkadlo"
  },
  {
    quote: "Čím viac sa snažíš kontrolovať život, tým viac ti uniká.",
    caption: "Kontrola je ilúzia bezpečia.\nSkutočná sloboda začína tam, kde končí tvoja potreba mať všetko pod palcom.",
    hashtags: "#evolvium #kontrola #sloboda #pustenie #dovera"
  },
  {
    quote: "Neexistuje nič, čo by modernému človeku prinieslo viac benefitov ako zvýšenie úrovne vedomia.",
    caption: "Investícia do vedomia nie je luxus — je to základ všetkého.\nLepšie vzťahy, lepšie rozhodnutia, hlbší pokoj.",
    hashtags: "#evolvium #vedomie #investicia #benefity #rozvoj"
  },
  {
    quote: "Nie sme stredom vesmíru. Nie je ním ani ľudská rasa. Nie je ním ani naša planéta.",
    caption: "Pokora nie je slabosť — je to prvý krok k pochopeniu.\nKeď prestanéš byť stredom, začneš vidieť celok.",
    hashtags: "#evolvium #pokora #vesmir #perspektiva #pochopenie"
  },
  {
    quote: "Len čo si uvedomíme ilúziu separácie, aktivuje sa v nás hlboké spojenie s inými bytosťami.",
    caption: "Oddelenosť je najväčšia ilúzia, v ktorej žijeme.\nV momente, keď ju prešahúš, cítiš spojenie, ktoré tu vždy bolo.",
    hashtags: "#evolvium #spojenie #iluzia #jednota #vedomie"
  },
  {
    quote: "V každom momente si človek môže vybrať, ako sa bude pozerať na svet.",
    caption: "Nemôžeš zmeniť to, čo sa deje.\nAle vždy si môžeš vybrať, akými očami sa na to pozrieš.",
    hashtags: "#evolvium #volba #perspektiva #sloboda #prítomnost"
  },
  {
    quote: "Čo keby sme nechali ostatných žiť svoj život a starali sa viac o ten vlastný?",
    caption: "Koľko energie míňaš súdením iných?\nTá istá energia by mohla ísť do tvojho vlastného rastu.",
    hashtags: "#evolvium #sudenie #sloboda #focus #vlastnycesta"
  },
  {
    quote: "Bezpodmienečne milovať neznamená, že si necháte robiť zle.",
    caption: "Láska bez podmienok neznamená život bez hraníc.\nMôžeš milovať a zároveň chrániť seba.",
    hashtags: "#evolvium #laska #hranice #sebalaska #zdravevztahy"
  },
  {
    quote: "Peklo a nebo sú len malý kúsok od seba.",
    caption: "Medzi utrpením a pokojom nie je priepasť.\nJe to jeden posun vedomia. Jedna voľba. Jeden nádych.",
    hashtags: "#evolvium #peklo #nebo #vedomie #volba #pokoj"
  },
  {
    quote: "Myslieť si, že viem, je najväčšia prekážka skutočného poznania.",
    caption: "Ego hovori: „Už viem.“\nVerdomie šepá: „Ešte sa učím.“\nSkutočná múdrosť začína priznaním nevedomosti.",
    hashtags: "#evolvium #mudrost #ego #poznanie #pokora"
  },
  {
    quote: "Každá myšlienka, ktorú opakuješ, sa stáva súčasťou tvojej identity.",
    caption: "Dávaj pozor na to, čo si hovoriš v hlave.\nTvoje myšlienky formujú, kým sa stávaš.",
    hashtags: "#evolvium #myslienky #identita #uvedomenie #zmena"
  },
  {
    quote: "Sloboda nie je robiť, čo chcem. Sloboda je nebyť otrokom toho, čo chcem.",
    caption: "Skutočná sloboda nie je v možnostiach.\nJe v nezávislosti od vlastných túžob.",
    hashtags: "#evolvium #sloboda #tuziby #nezavislost #vedomyzivot"
  },
  {
    quote: "Keď pochopíš, že nič nie je trvalé, prestanúš sa báť a začneš žiť.",
    caption: "Strach z pominutelnosti nás oberá o pritomnost.\nVšetko končí. A práve preto je to krásne.",
    hashtags: "#evolvium #pomijivost #pritomnost #zivot #strach"
  },
  {
    quote: "Tvoj najväčší učiteľ žije v tvojom vnútri. Stačí stišíť myseľ a počúvať.",
    caption: "Všetky odpovede, ktoré hľadáš vonku, čakajú vnútra.\nTišina nie je prázdnota — je to priestor pre múdrosť.",
    hashtags: "#evolvium #vnutro #tisina #mudrost #ucitel"
  },
  {
    quote: "Ten, kto pozná seba, nepotrebuje súhlas sveta.",
    caption: "Keď sa zakovíš v sebe, názory ostatných stratía váhu.\nSebavedomie nie je aroganica — je to vnútorný pokoj.",
    hashtags: "#evolvium #sebapoznanie #sebavedomie #pokoj #vnutro"
  },
  {
    quote: "Nemôžeš uzdravit to, čo si odmietaš priznať.",
    caption: "Prvý krok k uzdraveniu nie je liečba.\nJe to čestné priznanie: „Nieco nie je v poriadku.“",
    hashtags: "#evolvium #uzdravenie #cestnost #priznaníe #rast"
  },
  {
    quote: "Život ťa netrápi. Trápi ťa tvoja interpretácia života.",
    caption: "Udalosti sú neutrálne.\nTo, čo ťa bolí, je príbeh, ktorý si o nich povieš.",
    hashtags: "#evolvium #interpretacia #mysel #udalosti #perspektiva"
  },
  {
    quote: "Za každým strachom sa skrýva sloboda, po ktorej túžiš.",
    caption: "Strach je dvere, nie stena.\nKeď cez ne prejdeš, začína život, o ktorom snívaš.",
    hashtags: "#evolvium #strach #sloboda #odvaha #prekonanie"
  },
  {
    quote: "Nemusíš sa zmeniť. Stačí sa prestáť pretvarovať.",
    caption: "Autentičnosť nie je nieco, čo sa učíš.\nJe to to, čo zostáva, keď prestanú masky.",
    hashtags: "#evolvium #autenticnost #masky #pravdivost #bytie"
  },
];

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function EvolviumDashboard() {
  const [posts, setPosts] = useState(() => {
    try {
      const saved = localStorage.getItem("evolvium_posts");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEMO_POSTS;
  });
  const [dbLoaded, setDbLoaded] = useState(false);

  // Load from Supabase on mount
  useEffect(() => {
    loadPostsFromSupabase().then(dbPosts => {
      if (dbPosts && dbPosts.length > 0) {
        setPosts(dbPosts);
        console.log("Loaded", dbPosts.length, "posts from Supabase");
      } else {
        saveAllPostsToSupabase(posts);
        console.log("Seeded Supabase with", posts.length, "posts");
      }
      setDbLoaded(true);
    });
  }, []);

  // Persist to localStorage + Supabase
  useEffect(() => {
    try { localStorage.setItem("evolvium_posts", JSON.stringify(posts)); } catch (e) {}
    if (dbLoaded) saveAllPostsToSupabase(posts);
  }, [posts, dbLoaded]);
  const [filter, setFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const [notification, setNotification] = useState(null);
  const [config, setConfig] = useState(() => {
    try {
      var saved = localStorage.getItem("evolvium_config");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { webhookUrl: "https://hook.eu1.make.com/4rgf5em9xy9dq7sxlgeeyl9ot2e1f41v" };
  });

  useEffect(function() {
    try { localStorage.setItem("evolvium_config", JSON.stringify(config)); } catch (e) {}
  }, [config]);
  const postsRef = useRef(posts);
  postsRef.current = posts;
  const configRef = useRef(config);
  configRef.current = config;
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const cp = postsRef.current;
      const cfg = configRef.current;
      if (!cfg.webhookUrl) return;
      for (let i = 0; i < cp.length; i++) {
        const p = cp[i];
        if (p.status !== "scheduled" || !p.scheduled_iso || !p.image_url) continue;
        if (new Date(p.scheduled_iso) > now) continue;
        try {
          let u = p.image_url;
          if (u.includes(".png")) u = u.replace("/upload/", "/upload/f_jpg/");
          const res = await fetch(cfg.webhookUrl, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({action:"post_now",row:p.row,image_url:u,caption:p.caption,hashtags:p.hashtags}) });
          if (!res.ok) throw new Error("HTTP "+res.status);
          const np = [...postsRef.current];
          np[i] = {...np[i], status:"posted", scheduled_iso:null, posted_date:new Date().toLocaleDateString("sk-SK")};
          setPosts(np);
          showNotif("Auto-post: Post #"+p.row+" odoslany!");
          break;
        } catch(e) { showNotif("Auto-post chyba: "+e.message,"error"); }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);



  // ── Generate new batch of posts ──
  const generateBatch = () => {
    // Find which quotes are already used
    const usedQuotes = new Set(posts.map(p => (p.quote || "").substring(0, 30)));
    const available = BATCH_QUOTES.filter(q => !usedQuotes.has(q.quote.substring(0, 30)));

    // Pick 10 (or fewer if not enough available)
    const pick = available.length >= 10 ? available.slice(0, 10) : BATCH_QUOTES.slice(0, 10);
    const maxRow = Math.max(...posts.map(p => p.row || 0), 0);

    const newPosts = pick.map((q, i) => ({
      row: maxRow + i + 1,
      image_url: "",
      caption: q.caption,
      hashtags: q.hashtags,
      quote: q.quote,
      status: "draft",
      canva_status: "pending", // pending → approved → generating → done
    }));

    setPosts([...posts, ...newPosts]);
    showNotif("Vygenerovaných " + newPosts.length + " nových postov. Uprav texty a schváľ.");
  };

  // ── Send approved posts to Canva via Make.com ──
  const sendToCanva = async () => {
    const pending = posts.filter(p => p.canva_status === "pending" && !p.image_url);
    if (pending.length === 0) {
      showNotif("Nič na odoslanie — všetky posty už majú obrázky alebo nie sú schválené.", "error");
      return;
    }

    const canvaWebhook = config.canvaWebhookUrl || "";
    if (!canvaWebhook) {
      showNotif("Nastav Canva Webhook URL v nastaveniach", "error");
      setShowSettings(true);
      return;
    }

    // Mark as generating
    const newPosts = posts.map(p =>
      p.canva_status === "pending" && !p.image_url
        ? { ...p, canva_status: "generating" }
        : p
    );
    setPosts(newPosts);

    try {
      const payload = {
        action: "generate_canva_batch",
        template_id: "DAGmg38UZO0",
        cloud_name: "djh3zmzel",
        posts: pending.map(p => ({
          row: p.row,
          quote: p.quote || p.caption.split("\n")[0],
          public_id: "batch_post_" + p.row,
        })),
      };
      const res = await fetch(canvaWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      showNotif("Odoslané do Canvy! Make.com spracúva " + pending.length + " postov...");
    } catch (err) {
      // Revert on error
      setPosts(posts.map(p =>
        p.canva_status === "generating" ? { ...p, canva_status: "pending" } : p
      ));
      showNotif("Chyba pri odosielaní: " + err.message, "error");
    }
  };

  // ── Load images back from Cloudinary (after Make.com finishes) ──
  const loadCanvaImages = () => {
    const newPosts = posts.map(p => {
      if (p.canva_status === "generating" || (p.canva_status === "pending" && !p.image_url)) {
        const expectedUrl = "https://res.cloudinary.com/djh3zmzel/image/upload/batch_post_" + p.row + ".png";
        return { ...p, image_url: expectedUrl, canva_status: "done" };
      }
      return p;
    });
    setPosts(newPosts);
    showNotif("Obrázky načítané z Cloudinary");
  };

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ── Post via Make.com webhook (immediate) or schedule (save to DB only) ──
  const postViaWebhook = async (index, scheduleTime = null) => {
    const post = posts[index];

    // SCHEDULING: just save to Supabase — Make.com will pick it up
    if (scheduleTime) {
      const newPosts = [...posts];
      newPosts[index] = {
        ...post,
        status: "scheduled",
        scheduled_iso: scheduleTime.date.toISOString(),
        posted_date: `Plan: ${scheduleTime.day} ${scheduleTime.time}`,
      };
      setPosts(newPosts);
      showNotif(`Post #${post.row} naplanovany na ${scheduleTime.day} ${scheduleTime.time}`);
      return;
    }

    // IMMEDIATE POST: send to Make.com webhook now
    if (!config.webhookUrl) {
      showNotif("Nastav Make.com Webhook URL v nastaveniach", "error");
      setShowSettings(true);
      return;
    }
    if (!post.image_url) {
      showNotif(`Post #${post.row} nema obrazok`, "error");
      return;
    }
    try {
      let igImageUrl = post.image_url;
      if (igImageUrl && igImageUrl.includes(".png")) {
        igImageUrl = igImageUrl.replace("/upload/", "/upload/f_jpg/");
      }
      const payload = {
        action: "post_now",
        row: post.row,
        image_url: igImageUrl,
        caption: post.caption,
        hashtags: post.hashtags,
      };
      const res = await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newPosts = [...posts];
      newPosts[index] = {
        ...post,
        status: "posted",
        scheduled_iso: null,
        posted_date: new Date().toLocaleDateString("sk-SK"),
      };
      setPosts(newPosts);
      showNotif(`Post #${post.row} odoslany na Instagram!`);
    } catch (err) {
      showNotif(`Chyba pri odosielani: ${err.message}`, "error");
    }
  };

  // ── Edit caption locally ──
  const handleEdit = (index, changes) => {
    const newPosts = [...posts];
    newPosts[index] = { ...newPosts[index], ...changes };
    setPosts(newPosts);
    showNotif("Caption ulozeny");
  };

  // ── Cancel scheduled post → back to draft ──
  const cancelSchedule = (index) => {
    const newPosts = [...posts];
    newPosts[index] = { ...newPosts[index], status: "draft", posted_date: "" };
    setPosts(newPosts);
    showNotif(`Post #${newPosts[index].row} vrátený do draftu`);
  };

  // ── Drag and drop reordering ──
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newPosts = [...posts];
      const [moved] = newPosts.splice(dragIndex, 1);
      newPosts.splice(dragOverIndex, 0, moved);
      setPosts(newPosts);
      showNotif(`Post presunutý na pozíciu ${dragOverIndex + 1}`);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };


  // ── Auto-sort: posted first, then scheduled (by time), then drafts ──
  const sortedPosts = [...posts].sort((a, b) => {
    const order = { posted: 0, scheduled: 1, draft: 2, failed: 3 };
    const sa = order[a.status] ?? 2;
    const sb = order[b.status] ?? 2;
    if (sa !== sb) return sa - sb;
    // Within same status, sort by scheduled time or row
    if (a.scheduled_iso && b.scheduled_iso) return new Date(a.scheduled_iso) - new Date(b.scheduled_iso);
    return (a.row || 0) - (b.row || 0);
  });
  // ── Filter posts ──
  const filtered = sortedPosts.filter(p => {
    if (filter === "all") return true;
    if (filter === "draft") return !p.status || p.status === "draft";
    return p.status === filter;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-pulse ${
          notification.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
        }`}>
          {notification.type === "error" ? <AlertCircle size={16} /> : <Check size={16} />}
          {notification.msg}
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <SettingsPanel
          config={config}
          onSave={setConfig}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-600/20">
              E
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Evolvium</h1>
              <p className="text-xs text-gray-500">@evoluciavedomia · Instagram Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generateBatch}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-purple-600/20"
            >
              <Sparkles size={14} />
              Vygenerovať batch
            </button>
            {posts.some(p => p.canva_status === "pending" && !p.image_url) && (
              <button
                onClick={sendToCanva}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Package size={14} />
                Odoslať do Canvy
              </button>
            )}
            {posts.some(p => p.canva_status === "generating") && (
              <button
                onClick={loadCanvaImages}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Loader2 size={14} />
                Načítať obrázky
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors border border-gray-700"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — posts */}
          <div className="lg:col-span-2 space-y-4">
            {/* Stats */}
            <StatsBar posts={posts} />

            {/* Filter tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={14} className="text-gray-500" />
              {[
                { key: "all", label: "Všetky" },
                { key: "draft", label: "Drafts" },
                { key: "scheduled", label: "Naplánované" },
                { key: "posted", label: "Publikované" },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filter === f.key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Post list */}
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 size={32} className="mx-auto mb-3 opacity-50" />
                  <p>Žiadne posty v tejto kategórii</p>
                </div>
              ) : (
                filtered.map((post, i) => {
                  const realIndex = posts.indexOf(post);
                  // Collect scheduled times to prevent duplicates
                  const scheduledTimes = posts
                    .filter(p => p.status === "scheduled" && p.scheduled_iso)
                    .map(p => p.scheduled_iso);
                  return (
                    <PostCard
                      key={post.row}
                      post={post}
                      index={realIndex}
                      scheduledTimes={scheduledTimes}
                      onEdit={handleEdit}
                      onPostNow={(idx) => postViaWebhook(idx)}
                      onSchedule={(idx, time) => postViaWebhook(idx, time)}
                      onCancelSchedule={cancelSchedule}
                      onAutoPost={(idx) => { const best = getNextOptimalTime(0, scheduledTimes); postViaWebhook(idx, best); }}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      isDragging={dragIndex === realIndex}
                      isDragOver={dragOverIndex === realIndex}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Right column — sidebar */}
          <div className="space-y-4">
            <OptimalTimeWidget />

            {/* Database status */}
            <div className="bg-gray-800/80 rounded-xl border border-gray-700/50 p-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${dbLoaded ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                <span className="text-xs text-gray-400">
                  {dbLoaded ? "Supabase pripojeny — data su v databaze" : "Nacitavam z databazy..."}
                </span>
              </div>
            </div>

            {/* Quick info */}
            <div className="bg-gray-800/80 rounded-xl border border-gray-700/50 p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-400" /> Rýchly prehľad
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Content pattern</span>
                  <span className="text-gray-200">3 posty → foto → opakovať</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Formát</span>
                  <span className="text-gray-200">1080 × 1350px (4:5)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Batch</span>
                  <span className="text-gray-200">Batch 3 (13 + 4 fotky)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pipeline</span>
                  <span className="text-gray-200">Make.com → Instagram</span>
                </div>
              </div>
            </div>

            {/* Setup guide */}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12 py-6 text-center text-xs text-gray-600">
        Evolvium Dashboard · www.evolvium.com · Evolúcia vedomia – Ja
      </footer>
    </div>
  );
}
