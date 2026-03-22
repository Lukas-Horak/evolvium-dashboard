#!/usr/bin/env node
var fs = require('fs');
var file = './src/App.jsx';
var c = fs.readFileSync(file, 'utf8');
var origLen = c.length;
var fixes = [];

// FIX 1: getNextOptimalTime — add skipSlots + takenTimes
c = c.replace(
  /function getNextOptimalTime\(\) \{[\s\S]*?return \{ date: new Date\(now\.getTime\(\) \+ 3600000\)[^}]*\};\n\}/,
  'function getNextOptimalTime(skipSlots = 0, takenTimes = []) {\n'
  + '  const now = new Date();\n'
  + '  const currentDay = now.getDay();\n'
  + '  const currentHour = now.getHours();\n'
  + '  const currentMinute = now.getMinutes();\n'
  + '  let skipped = 0;\n'
  + '\n'
  + '  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {\n'
  + '    const dayIndex = (currentDay + dayOffset) % 7;\n'
  + '    const dayData = OPTIMAL_TIMES.find(d => d.day === DAY_NAMES[dayIndex]);\n'
  + '    if (!dayData) continue;\n'
  + '\n'
  + '    for (const time of dayData.times) {\n'
  + '      const [h, m] = time.split(":").map(Number);\n'
  + '      if (dayOffset === 0 && (h < currentHour || (h === currentHour && m <= currentMinute))) continue;\n'
  + '      const nextDate = new Date(now);\n'
  + '      nextDate.setDate(now.getDate() + dayOffset);\n'
  + '      nextDate.setHours(h, m, 0, 0);\n'
  + '      const timeKey = nextDate.toISOString();\n'
  + '      if (takenTimes.includes(timeKey)) continue;\n'
  + '      if (skipped < skipSlots) { skipped++; continue; }\n'
  + '      return { date: nextDate, score: dayData.score, day: dayData.day, time };\n'
  + '    }\n'
  + '  }\n'
  + '  return { date: new Date(now.getTime() + 3600000), score: 75, day: DAY_NAMES[currentDay], time: "\u2014" };\n'
  + '}'
);
fixes.push('getNextOptimalTime: ' + c.includes('skipSlots'));

// FIX 2: PostCard props — add scheduledTimes + onAutoPost
c = c.replace(
  'function PostCard({ post, index
cd ~/Desktop/evolvium-dashboard
cat > fix-all.cjs << 'ENDSCRIPT'
#!/usr/bin/env node
var fs = require('fs');
var file = './src/App.jsx';
var c = fs.readFileSync(file, 'utf8');
var origLen = c.length;
var fixes = [];

// FIX 1: getNextOptimalTime — add skipSlots + takenTimes
c = c.replace(
  /function getNextOptimalTime\(\) \{[\s\S]*?return \{ date: new Date\(now\.getTime\(\) \+ 3600000\)[^}]*\};\n\}/,
  'function getNextOptimalTime(skipSlots = 0, takenTimes = []) {\n'
  + '  const now = new Date();\n'
  + '  const currentDay = now.getDay();\n'
  + '  const currentHour = now.getHours();\n'
  + '  const currentMinute = now.getMinutes();\n'
  + '  let skipped = 0;\n'
  + '\n'
  + '  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {\n'
  + '    const dayIndex = (currentDay + dayOffset) % 7;\n'
  + '    const dayData = OPTIMAL_TIMES.find(d => d.day === DAY_NAMES[dayIndex]);\n'
  + '    if (!dayData) continue;\n'
  + '\n'
  + '    for (const time of dayData.times) {\n'
  + '      const [h, m] = time.split(":").map(Number);\n'
  + '      if (dayOffset === 0 && (h < currentHour || (h === currentHour && m <= currentMinute))) continue;\n'
  + '      const nextDate = new Date(now);\n'
  + '      nextDate.setDate(now.getDate() + dayOffset);\n'
  + '      nextDate.setHours(h, m, 0, 0);\n'
  + '      const timeKey = nextDate.toISOString();\n'
  + '      if (takenTimes.includes(timeKey)) continue;\n'
  + '      if (skipped < skipSlots) { skipped++; continue; }\n'
  + '      return { date: nextDate, score: dayData.score, day: dayData.day, time };\n'
  + '    }\n'
  + '  }\n'
  + '  return { date: new Date(now.getTime() + 3600000), score: 75, day: DAY_NAMES[currentDay], time: "\u2014" };\n'
  + '}'
);
fixes.push('getNextOptimalTime: ' + c.includes('skipSlots'));

// FIX 2: PostCard props — add scheduledTimes + onAutoPost
c = c.replace(
  'function PostCard({ post, index, onEdit, onPostNow, onSchedule, onCancelSchedule, onDragStart, onDragOver, onDragEnd, isDragging, isDragOver }) {',
  'function PostCard({ post, index, scheduledTimes, onEdit, onPostNow, onSchedule, onCancelSchedule, onAutoPost, onDragStart, onDragOver, onDragEnd, isDragging, isDragOver }) {'
);
fixes.push('PostCard props: ' + c.includes('onAutoPost'));

// FIX 3: Time slots use takenTimes
c = c.replace(
  '  const timeSlot1 = getNextOptimalTime(0);\n  const timeSlot2 = getNextOptimalTime(1);\n  const timeSlot3 = getNextOptimalTime(2);',
  '  const taken = scheduledTimes || [];\n  const timeSlot1 = getNextOptimalTime(0, taken);\n  const timeSlot2 = getNextOptimalTime(1, taken);\n  const timeSlot3 = getNextOptimalTime(2, taken);'
);
fixes.push('timeSlot takenTimes: ' + c.includes('taken'));

// FIX 4: Auto-post button
c = c.replace(
  '                      <p className="text-xs text-gray-500 mb-1.5">Napl\u00E1nova\u0165 na:</p>',
  '                      <div className="flex items-center gap-2 mb-2">\n'
  + '                        <button\n'
  + '                          onClick={() => onAutoPost(index)}\n'
  + '                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-medium rounded-lg transition-all shadow-lg shadow-emerald-600/20"\n'
  + '                        >\n'
  + '                          <Zap size={12} /> Auto-post v najlep\u0161om \u010Dase\n'
  + '                        </button>\n'
  + '                      </div>\n'
  + '                      <p className="text-xs text-gray-500 mb-1.5">Alebo napl\u00E1nova\u0165 na:</p>'
);
fixes.push('Auto-post button: ' + c.includes('onAutoPost(index)'));

// FIX 5: scheduled_iso field in postViaWebhook
c = c.replace(
  '        status: scheduleTime ? "scheduled" : "posted",\n'
  + '        posted_date: scheduleTime ? `Pl\u00E1n: ${scheduleTime.day} ${scheduleTime.time}` : new Date().toLocaleDateString("sk-SK"),',
  '        status: scheduleTime ? "scheduled" : "posted",\n'
  + '        scheduled_iso: scheduleTime ? scheduleTime.date.toISOString() : null,\n'
  + '        posted_date: scheduleTime ? `Pl\u00E1n: ${scheduleTime.day} ${scheduleTime.time}` : new Date().toLocaleDateString("sk-SK"),'
);
fixes.push('scheduled_iso: ' + c.includes('scheduled_iso'));

// FIX 6: Pass scheduledTimes + onAutoPost to PostCard
c = c.replace(
  '                  const realIndex = posts.indexOf(post);\n'
  + '                  return (\n'
  + '                    <PostCard\n'
  + '                      key={post.row}\n'
  + '                      post={post}\n'
  + '                      index={realIndex}\n'
  + '                      onEdit={handleEdit}\n'
  + '                      onPostNow={(idx) => postViaWebhook(idx)}\n'
  + '                      onSchedule={(idx, time) => postViaWebhook(idx, time)}\n'
  + '                      onCancelSchedule={cancelSchedule}',
  '                  const realIndex = posts.indexOf(post);\n'
  + '                  const scheduledTimes = posts.filter(p => p.status === "scheduled" && p.scheduled_iso).map(p => p.scheduled_iso);\n'
  + '                  return (\n'
  + '                    <PostCard\n'
  + '                      key={post.row}\n'
  + '                      post={post}\n'
  + '                      index={realIndex}\n'
  + '                      scheduledTimes={scheduledTimes}\n'
  + '                      onEdit={handleEdit}\n'
  + '                      onPostNow={(idx) => postViaWebhook(idx)}\n'
  + '                      onSchedule={(idx, time) => postViaWebhook(idx, time)}\n'
  + '                      onCancelSchedule={cancelSchedule}\n'
  + '                      onAutoPost={(idx) => { const best = getNextOptimalTime(0, scheduledTimes); postViaWebhook(idx, best); }}'
);
fixes.push('PostCard usage: ' + c.includes('onAutoPost'));

// FIX 7: Auto-scheduler useEffect
var schedulerCode = '\n'
  + '  // Auto-scheduler: check every 60s for due posts\n'
  + '  useEffect(() => {\n'
  + '    const timer = setInterval(() => {\n'
  + '      const now = new Date();\n'
  + '      let changed = false;\n'
  + '      const updated = posts.map(p => {\n'
  + '        if (p.status === "scheduled" && p.scheduled_iso) {\n'
  + '          const scheduled = new Date(p.scheduled_iso);\n'
  + '          if (scheduled <= now) {\n'
  + '            const igUrl = p.image_url && p.image_url.includes(".png") ? p.image_url.replace("/upload/", "/upload/f_jpg/") : p.image_url;\n'
  + '            fetch(config.webhookUrl, {\n'
  + '              method: "POST",\n'
  + '              headers: { "Content-Type": "application/json" },\n'
  + '              body: JSON.stringify({ action: "post_now", row: p.row, image_url: igUrl, caption: p.caption, hashtags: p.hashtags }),\n'
  + '            }).catch(() => {});\n'
  + '            changed = true;\n'
  + '            return { ...p, status: "posted", posted_date: now.toLocaleDateString("sk-SK"), scheduled_iso: null };\n'
  + '          }\n'
  + '        }\n'
  + '        return p;\n'
  + '      });\n'
  + '      if (changed) setPosts(updated);\n'
  + '    }, 60000);\n'
  + '    return () => clearInterval(timer);\n'
  + '  }, [posts, config.webhookUrl]);\n';

c = c.replace(
  '  // ── Generate new batch of posts ──',
  schedulerCode + '\n  // ── Generate new batch of posts ──'
);
fixes.push('Auto-scheduler: ' + c.includes('setInterval'));

// FIX 8: Auto-sort
var sortCode = '\n'
  + '  // Auto-sort: posted first, then scheduled, then drafts\n'
  + '  const sortedPosts = [...posts].sort((a, b) => {\n'
  + '    const order = { posted: 0, scheduled: 1, draft: 2, failed: 3 };\n'
  + '    const sa = order[a.status] ?? 2;\n'
  + '    const sb = order[b.status] ?? 2;\n'
  + '    if (sa !== sb) return sa - sb;\n'
  + '    if (a.scheduled_iso && b.scheduled_iso) return new Date(a.scheduled_iso) - new Date(b.scheduled_iso);\n'
  + '    return (a.row || 0) - (b.row || 0);\n'
  + '  });\n';

c = c.replace('  // ── Filter posts ──', sortCode + '  // ── Filter posts ──');
c = c.replace('const filtered = posts.filter(p => {', 'const filtered = sortedPosts.filter(p => {');
fixes.push('Auto-sort: ' + c.includes('sortedPosts'));

// WRITE
fs.writeFileSync(file, c, 'utf8');
console.log('Original:', origLen, '-> New:', c.length);
fixes.forEach(function(f) { console.log('  ' + f); });
console.log('skipSlots:', c.includes('skipSlots'));
console.log('setInterval:', c.includes('setInterval'));
console.log('sortedPosts:', c.includes('sortedPosts'));
