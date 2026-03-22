import { useState, useEffect, useCallback, useRef } from "react";
import { Calendar, Clock, Send, Edit3, Check, X, Eye, Settings, RefreshCw, Zap, TrendingUp, Image, Hash, ChevronDown, ChevronUp, Filter, BarChart3, AlertCircle, ExternalLink, Save } from "lucide-react";

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

function getNextOptimalTime() {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const dayIndex = (currentDay + dayOffset) % 7;
    const dayData = OPTIMAL_TIMES.find(d => d.day === DAY_NAMES[dayIndex]);
    if (!dayData) continue;

    for (const time of dayData.times) {
      const [h, m] = time.split(":").map(Number);
      if (dayOffset === 0 && (h < currentHour || (h === currentHour && m <= currentMinute))) continue;
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + dayOffset);
      nextDate.setHours(h, m, 0, 0);
      return { date: nextDate, score: dayData.score, day: dayData.day, time };
    }
  }
  return { date: new Date(now.getTime() + 3600000), score: 75, day: DAY_NAMES[currentDay], time: "—" };
}

// ── Status badge component ──
function StatusBadge({ status }) {
  const config = {
    draft: { bg: "bg-gray-700", text: "text-gray-300", label: "Koncept", dot: "bg-gray-400" },
    scheduled: { bg: "bg-amber-900/40", text: "text-amber-300", label: "Naplánovaný", dot: "bg-amber-400" },
    posted: { bg: "bg-emerald-900/40", text: "text-emerald-300", label: "Publikovaný", dot: "bg-emerald-400" },
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
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Google Sheets ID</label>
            <input
              type="text"
              value={local.sheetId}
              onChange={e => setLocal({ ...local, sheetId: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="1SIGMdzLpj3T2ei7htx_GN8BvW7PvUMAPDKZdnSzITeQ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Google API Key</label>
            <input
              type="password"
              value={local.apiKey}
              onChange={e => setLocal({ ...local, apiKey: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="AIza..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Vytvor na <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-blue-400 hover:underline">Google Cloud Console</a> → Credentials → API Key
            </p>
          </div>
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
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Sheet Name</label>
            <input
              type="text"
              value={local.sheetName}
              onChange={e => setLocal({ ...local, sheetName: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Sheet1"
            />
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

// ── Post card component ──
function PostCard({ post, index, onEdit, onPostNow, onSchedule }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [editHashtags, setEditHashtags] = useState(post.hashtags);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const nextTime = getNextOptimalTime();

  const handleSave = () => {
    onEdit(index, { caption: editCaption, hashtags: editHashtags });
    setEditing(false);
  };

  const isPhoto = post.image_url?.includes(".jpg");
  const typeLabel = isPhoto ? "Foto knihy" : "Grafický post";
  const typeColor = isPhoto ? "text-purple-400" : "text-blue-400";

  return (
    <div className={`bg-gray-800/80 rounded-xl border transition-all duration-200 ${
      expanded ? "border-blue-500/50 shadow-lg shadow-blue-500/5" : "border-gray-700/50 hover:border-gray-600"
    }`}>
      {/* Card header */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
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
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700/50">
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors"
                  >
                    <Edit3 size={14} /> Upraviť
                  </button>
                  <button
                    onClick={() => onSchedule(index, nextTime)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-600/80 hover:bg-amber-500 text-white text-sm rounded-lg transition-colors"
                  >
                    <Clock size={14} /> Naplánovať ({nextTime.day} {nextTime.time})
                  </button>
                  <button
                    onClick={() => onPostNow(index)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-sm rounded-lg transition-colors shadow-lg shadow-pink-600/20"
                  >
                    <Send size={14} /> Postnúť teraz
                  </button>
                </div>
              )}

              {post.status === "posted" && post.posted_date && (
                <div className="flex items-center gap-2 mt-3 text-sm text-emerald-400">
                  <Check size={14} /> Publikovaný {post.posted_date}
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
        { label: "Koncepty", value: drafted, color: "text-gray-400", bg: "bg-gray-800" },
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

// ── Demo data matching your Google Sheet ──
const DEMO_POSTS = [
  {
    row: 2,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/1_i1tsmm.png",
    caption: `\u201ESkuto\u010Dn\u00E1 zmena neza\u010D\u00EDna v okol\u00ED \u2014 za\u010D\u00EDna v tebe.\u201C\n\nKa\u017Ed\u00FD de\u0148 m\u00E1\u0161 vo\u013Ebu: \u017Ei\u0165 pod\u013Ea star\u00FDch vzorcov, alebo sa posun\u00FA\u0165 o krok bli\u017E\u0161ie k sebe sam\u00E9mu.`,
    hashtags: "#evolvium #evoluciavedomia #sebareflexia #osobnyrast #vedomie",
    status: "draft",
  },
  {
    row: 3,
    image_url: "https://res.cloudinary.com/djh3zmzel/image/upload/2_zmj3p1.png",
    caption: `Kedy naposledy si sa zastavil a sp\u00FDtal sa s\u00E1m seba: \u201EKto vlastne som bez v\u0161etk\u00FDch rol\u00ED, ktor\u00E9 hr\u00E1m?\u201C`,
    hashtags: "#evolvium #ktosom #sebauvedomenie #otazky #vnutornysvet",
    status: "draft",
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
];

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function EvolviumDashboard() {
  const [posts, setPosts] = useState(DEMO_POSTS);
  const [filter, setFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [config, setConfig] = useState({
    sheetId: "1SIGMdzLpj3T2ei7htx_GN8BvW7PvUMAPDKZdnSzITeQ",
    apiKey: "",
    webhookUrl: "",
    sheetName: "Sheet1",
  });

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ── Fetch from Google Sheets ──
  const fetchFromSheets = useCallback(async () => {
    if (!config.apiKey) {
      showNotif("Nastav Google API Key v nastaveniach", "error");
      setShowSettings(true);
      return;
    }
    setLoading(true);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${config.sheetName}?key=${config.apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const rows = data.values || [];
      if (rows.length < 2) throw new Error("Sheet je prázdny");
      const headers = rows[0];
      const parsed = rows.slice(1).map((row, i) => ({
        row: i + 2,
        image_url: row[headers.indexOf("image_url")] || "",
        caption: row[headers.indexOf("caption")] || "",
        hashtags: row[headers.indexOf("hashtags")] || "",
        status: row[headers.indexOf("status")] || "draft",
        posted_date: row[headers.indexOf("posted_date")] || "",
      }));
      setPosts(parsed);
      showNotif(`Načítaných ${parsed.length} postov z Google Sheets`);
    } catch (err) {
      showNotif(`Chyba: ${err.message}`, "error");
    }
    setLoading(false);
  }, [config]);

  // ── Post via Make.com webhook ──
  const postViaWebhook = async (index, scheduleTime = null) => {
    const post = posts[index];
    if (!config.webhookUrl) {
      showNotif("Nastav Make.com Webhook URL v nastaveniach", "error");
      setShowSettings(true);
      return;
    }
    try {
      const payload = {
        action: scheduleTime ? "schedule" : "post_now",
        row: post.row,
        image_url: post.image_url,
        caption: post.caption,
        hashtags: post.hashtags,
        schedule_time: scheduleTime ? scheduleTime.date.toISOString() : null,
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
        status: scheduleTime ? "scheduled" : "posted",
        posted_date: scheduleTime ? `Plán: ${scheduleTime.day} ${scheduleTime.time}` : new Date().toLocaleDateString("sk-SK"),
      };
      setPosts(newPosts);
      showNotif(scheduleTime ? `Post #${post.row} naplánovaný na ${scheduleTime.day} ${scheduleTime.time}` : `Post #${post.row} odoslaný na Instagram!`);
    } catch (err) {
      showNotif(`Chyba pri odosielaní: ${err.message}`, "error");
    }
  };

  // ── Edit caption locally ──
  const handleEdit = (index, changes) => {
    const newPosts = [...posts];
    newPosts[index] = { ...newPosts[index], ...changes };
    setPosts(newPosts);
    showNotif("Caption uložený lokálne");
  };

  // ── Filter posts ──
  const filtered = posts.filter(p => {
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
              onClick={fetchFromSheets}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors border border-gray-700"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Načítavam..." : "Obnoviť"}
            </button>
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
                { key: "draft", label: "Koncepty" },
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
                  return (
                    <PostCard
                      key={post.row}
                      post={post}
                      index={realIndex}
                      onEdit={handleEdit}
                      onPostNow={(idx) => postViaWebhook(idx)}
                      onSchedule={(idx, time) => postViaWebhook(idx, time)}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Right column — sidebar */}
          <div className="space-y-4">
            <OptimalTimeWidget />

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
                  <span className="text-gray-200">Batch 3 (17 postov)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pipeline</span>
                  <span className="text-gray-200">Make.com → Instagram</span>
                </div>
              </div>
            </div>

            {/* Setup guide */}
            {!config.apiKey && (
              <div className="bg-amber-900/20 rounded-xl border border-amber-700/30 p-5">
                <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2 mb-2">
                  <AlertCircle size={16} /> Prvé nastavenie
                </h3>
                <ol className="text-sm text-amber-200/80 space-y-2 list-decimal list-inside">
                  <li>Klikni na ⚙ Nastavenia vpravo hore</li>
                  <li>Zadaj Google API Key (na čítanie sheetu)</li>
                  <li>Zadaj Make.com Webhook URL (na postovanie)</li>
                  <li>Klikni "Obnoviť" na načítanie postov</li>
                </ol>
              </div>
            )}
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
