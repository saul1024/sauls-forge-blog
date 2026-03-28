'use strict'

const moment = require('moment-timezone')

// Filter: intercept pages with type 'flows' AFTER markdown render, to inject raw HTML+JS
hexo.extend.filter.register('after_post_render', function (data) {
  if (data.type !== 'flows') return data

  const shuoshuoData = hexo.locals.get('data').shuoshuo || []
  const timezone = hexo.config.timezone || 'Asia/Shanghai'

  // Sort by date descending
  const sorted = [...shuoshuoData].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  )

  // Process each item: format date + render markdown
  const processed = sorted.map(item => {
    const utcDate = moment.utc(item.date).format('YYYY-MM-DD HH:mm:ss')
    const localDate = moment.tz(utcDate, timezone).format('YYYY-MM-DD')
    const content = hexo.render.renderSync({ text: item.content, engine: 'markdown' })
    return { ...item, date: localDate, content }
  })

  // Collect all dates for the calendar (YYYY-MM-DD)
  const flowDates = processed.map(item => item.date)

  // Pagination: 20 items per page
  const perPage = 20

  // Build flow items HTML with truncation
  const itemsHtml = processed.map(item => {
    const tags = item.tags
      ? item.tags.map(t => `<span class="flow-tag">#${t}</span>`).join(' ')
      : ''

    return `<div class="flow-item"><div class="flow-header"><span class="flow-dot"></span><span class="flow-date">${item.date}</span></div><div class="flow-body"><div class="flow-content">${item.content}</div>${tags ? `<div class="flow-tags">${tags}</div>` : ''}</div></div>`
  }).join('')

  // Build tag cloud from all flow tags
  const tagCount = {}
  shuoshuoData.forEach(item => {
    if (item.tags) {
      item.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1
      })
    }
  })
  const tagCloudHtml = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) =>
      `<span class="flow-cloud-tag">${tag} ${count}</span>`
    ).join('')

  // Serialize dates for calendar JS
  const flowDatesJson = JSON.stringify(flowDates)

  data.content = `<div class="flows-page">
<div class="flows-sidebar">
<div class="flows-sidebar-section">
<div id="flows-calendar" class="flows-calendar"></div>
</div>
<div class="flows-sidebar-section flows-sidebar-browse">
<span class="browse-link">▸ 浏览</span>
</div>
<div class="flows-sidebar-section">
<h4>标签</h4>
<div class="flow-cloud-tags">${tagCloudHtml}</div>
</div>
</div>
<div class="flows-main">
<p class="flows-count">共 ${processed.length} 条随笔。</p>
<div class="flows-list" id="flows-list">${itemsHtml}</div>
<div class="flows-pagination" id="flows-pagination"></div>
</div>
</div>
<script>
(function() {
var perPage = ${perPage};
var items = document.querySelectorAll('.flow-item');
var total = items.length;
var totalPages = Math.ceil(total / perPage);
var currentPage = 1;
function showPage(page) {
currentPage = page;
items.forEach(function(item, i) {
item.style.display = (i >= (page-1)*perPage && i < page*perPage) ? '' : 'none';
});
renderPagination();
}
function renderPagination() {
if (totalPages <= 1) return;
var el = document.getElementById('flows-pagination');
var html = '';
html += '<button class="fp-btn" ' + (currentPage===1?'disabled':'') + ' onclick="window.__flowsGoPage(' + (currentPage-1) + ')">&laquo;</button>';
for (var i = 1; i <= totalPages; i++) {
html += '<button class="fp-btn' + (i===currentPage?' fp-active':'') + '" onclick="window.__flowsGoPage(' + i + ')">' + i + '</button>';
}
html += '<button class="fp-btn" ' + (currentPage===totalPages?'disabled':'') + ' onclick="window.__flowsGoPage(' + (currentPage+1) + ')">&raquo;</button>';
el.innerHTML = html;
}
window.__flowsGoPage = function(p) { showPage(p); window.scrollTo({top:0,behavior:'smooth'}); };
showPage(1);

/* ===== Truncation ===== */
document.querySelectorAll('.flow-content').forEach(function(el) {
var text = el.textContent || '';
if (text.length > 200) {
el.classList.add('flow-truncated');
}
});

/* ===== Calendar ===== */
var flowDates = ${flowDatesJson};
var calEl = document.getElementById('flows-calendar');
var now = new Date();
var calYear = now.getFullYear();
var calMonth = now.getMonth();
function renderCalendar(year, month) {
calYear = year; calMonth = month;
var firstDay = new Date(year, month, 1).getDay();
var daysInMonth = new Date(year, month + 1, 0).getDate();
var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var today = new Date();
var html = '<div class="cal-header"><span class="cal-nav cal-prev" onclick="window.__calPrev()">&lt;</span><span class="cal-title">' + monthNames[month] + ' ' + year + '</span><span class="cal-nav cal-next" onclick="window.__calNext()">&gt;</span></div>';
html += '<div class="cal-grid"><span class="cal-dow">Su</span><span class="cal-dow">Mo</span><span class="cal-dow">Tu</span><span class="cal-dow">We</span><span class="cal-dow">Th</span><span class="cal-dow">Fr</span><span class="cal-dow">Sa</span>';
for (var i = 0; i < firstDay; i++) html += '<span class="cal-day cal-empty"></span>';
for (var d = 1; d <= daysInMonth; d++) {
var dateStr = year + '-' + String(month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
var hasFlow = flowDates.indexOf(dateStr) !== -1;
var isToday = (d === today.getDate() && month === today.getMonth() && year === today.getFullYear());
var cls = 'cal-day';
if (hasFlow) cls += ' cal-has-flow';
if (isToday) cls += ' cal-today';
html += '<span class="' + cls + '">' + d + '</span>';
}
html += '</div>';
calEl.innerHTML = html;
}
window.__calPrev = function() { var m = calMonth - 1; var y = calYear; if (m < 0) { m = 11; y--; } renderCalendar(y, m); };
window.__calNext = function() { var m = calMonth + 1; var y = calYear; if (m > 11) { m = 0; y++; } renderCalendar(y, m); };
renderCalendar(calYear, calMonth);
})();
</script>`

  return data
})
