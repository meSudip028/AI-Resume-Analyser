/* ═══════════════════════════════════════════
   RESUME AI — SCRIPT.JS
═══════════════════════════════════════════ */

'use strict';

// ── State ──
let ftxt = '';
let currentData = null;

// ── Custom Cursor ──
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursorDot');

document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
  cursorDot.style.left = e.clientX + 'px';
  cursorDot.style.top = e.clientY + 'px';
});

document.addEventListener('mousedown', () => cursor.style.transform = 'translate(-50%,-50%) scale(0.8)');
document.addEventListener('mouseup', () => cursor.style.transform = 'translate(-50%,-50%) scale(1)');

// ── Hamburger ──
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));

// ── File Input ──
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const filePrev = document.getElementById('filePrev');
const fpName = document.getElementById('fpName');
const fpSize = document.getElementById('fpSize');
const fpRemove = document.getElementById('fpRemove');

fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

// Drag & Drop
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});

// Click on drop zone (but not the label)
dropZone.addEventListener('click', e => {
  if (e.target.closest('label') || e.target === fileInput) return;
  fileInput.click();
});

fpRemove.addEventListener('click', () => {
  ftxt = '';
  filePrev.style.display = 'none';
  dropZone.style.display = 'block';
  fileInput.value = '';
});

// ── Handle File ──
async function handleFile(f) {
  if (!f) return;
  if (!/\.(pdf|txt|docx)$/i.test(f.name)) {
    showToast('Please upload a PDF, DOCX, or TXT file.', 'error');
    return;
  }
  if (f.size > 10 * 1024 * 1024) {
    showToast('File too large. Max 10MB.', 'error');
    return;
  }

  fpName.textContent = f.name;
  fpSize.textContent = formatBytes(f.size);
  filePrev.style.display = 'flex';
  dropZone.style.display = 'none';

  try {
    ftxt = await read(f);
    showToast('Resume loaded successfully!', 'success');
  } catch (err) {
    showToast('Failed to read file. Try again.', 'error');
    console.error(err);
  }
}

// ── Read File ──
async function read(file) {
  if (file.name.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text;
  }
  if (file.name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }
  return await file.text();
}

// ── Analyze ──
async function analyze() {
  if (!ftxt) {
    showToast('Please upload a resume first.', 'error');
    return;
  }

  const button = document.getElementById('gobtn');
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

  document.getElementById('ucard').style.display = 'none';
  document.getElementById('rw').style.display = 'none';

  const lw = document.getElementById('lw');
  lw.classList.add('on');

  animateLoaderSteps();

  try {
    const jobDescription = document.getElementById('jobDescription').value;

    const response = await fetch('/.netlify/functions/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText: ftxt, jobDescription })
    });

    if (!response.ok) throw new Error('Analysis failed. Please try again.');

    const data = await response.json();
    currentData = data;

    lw.classList.remove('on');
    render(data);
    document.getElementById('rw').style.display = 'block';
    document.getElementById('rw').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    lw.classList.remove('on');
    document.getElementById('ucard').style.display = 'block';
    showToast(err.message, 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Analyze My Resume';
  }
}

// ── Animate Loader Steps ──
function animateLoaderSteps() {
  const steps = ['ls1', 'ls2', 'ls3'];
  let i = 0;
  steps.forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('active', 'done');
  });
  document.getElementById('ls1').classList.add('active');

  const interval = setInterval(() => {
    document.getElementById(steps[i]).classList.remove('active');
    document.getElementById(steps[i]).classList.add('done');
    i++;
    if (i < steps.length) {
      document.getElementById(steps[i]).classList.add('active');
    } else {
      clearInterval(interval);
    }
  }, 2200);
}

// ── Render Results ──
function render(d) {
  renderScores(d);
  renderVerdict(d);
  renderCards(d);
}

function renderScores(d) {
  const scoreRow = document.getElementById('scoreRow');
  const scores = [
    { label: 'Overall Score', value: d.overall_score, color: '#7c5cfc' },
    { label: 'ATS Score', value: d.ats_score, color: '#22d3a5' },
    { label: 'Impact Score', value: d.impact_score, color: '#38bdf8' },
    { label: 'Job Match', value: d.match_score, color: '#facc15' },
  ];

  scoreRow.innerHTML = scores.map(s => `
    <div class="score-card">
      <div class="score-num" style="color:${s.color}">${s.value}<small style="font-size:1.2rem">%</small></div>
      <div class="score-label">${s.label}</div>
      <div class="score-bar">
        <div class="score-fill" style="width:0%;background:${s.color}" data-w="${s.value}"></div>
      </div>
    </div>
  `).join('');

  // Animate bars
  requestAnimationFrame(() => {
    document.querySelectorAll('.score-fill').forEach(bar => {
      setTimeout(() => { bar.style.width = bar.dataset.w + '%'; }, 100);
    });
  });
}

function renderVerdict(d) {
  const vc = document.getElementById('verdictCard');
  const score = d.overall_score;
  let emoji = '🔴', label = 'Needs Work';
  if (score >= 80) { emoji = '🟢'; label = 'Excellent'; }
  else if (score >= 65) { emoji = '🟡'; label = 'Good'; }
  else if (score >= 50) { emoji = '🟠'; label = 'Fair'; }

  vc.innerHTML = `
    <div class="vd-icon">${emoji}</div>
    <div class="vd-text">
      <h3>Overall Verdict — ${label}</h3>
      <p>${d.verdict || 'Analysis complete. Review the sections below for detailed feedback.'}</p>
    </div>
  `;
}

function renderCards(d) {
  const cg = document.getElementById('cardsGrid');

  const listCard = (title, icoClass, listClass, icon, items, iconColor) => `
    <div class="rc">
      <div class="rc-head">
        <div class="rc-ico ${icoClass}"><i class="${icon}"></i></div>
        <h3>${title}</h3>
      </div>
      <ul class="rl ${listClass}">
        ${(items || []).map(s => `
          <li><i class="fas fa-${iconColor}"></i><span>${s}</span></li>
        `).join('') || '<li><i class="fas fa-minus"></i><span>None found.</span></li>'}
      </ul>
    </div>
  `;

  cg.innerHTML = `

    ${listCard('Strengths', 'ig', 'rg', 'fas fa-check-circle', d.strengths, 'check-circle')}

    ${listCard('Areas to Improve', 'ir', 'rr', 'fas fa-exclamation-circle', d.improvements, 'exclamation-circle')}

    ${listCard('Missing Skills', 'iy', 'ry', 'fas fa-plus-circle', d.missing_skills, 'plus-circle')}

    <div class="rc">
      <div class="rc-head">
        <div class="rc-ico ib"><i class="fas fa-bullseye"></i></div>
        <h3>Job Match Score</h3>
      </div>
      <div class="match-score">${d.match_score}%</div>
      <p style="color:var(--muted);font-size:.85rem;margin-top:.5rem">
        ${d.match_score >= 75 ? 'Strong match for this role.' : d.match_score >= 50 ? 'Moderate match — add more keywords.' : 'Low match — significant keyword gaps detected.'}
      </p>
    </div>

    ${listCard('AI Rewrite Suggestions', 'iy', 'ry', 'fas fa-pen-nib', d.rewrite_suggestions, 'wand-magic-sparkles')}

    <div class="rc">
      <div class="rc-head">
        <div class="rc-ico ig"><i class="fas fa-key"></i></div>
        <h3>Keywords Found</h3>
      </div>
      <div class="tags">
        ${(d.keywords_found || []).map(k => `<span class="stag">${k}</span>`).join('') || '<span style="color:var(--muted);font-size:.88rem">No keywords found.</span>'}
      </div>
    </div>

    <div class="rc">
      <div class="rc-head">
        <div class="rc-ico ir"><i class="fas fa-ban"></i></div>
        <h3>Missing ATS Keywords</h3>
      </div>
      <div class="tags">
        ${(d.keywords_missing || []).map(k => `<span class="stag missing">${k}</span>`).join('') || '<span style="color:var(--muted);font-size:.88rem">No missing keywords.</span>'}
      </div>
    </div>

    <div class="rc" style="grid-column: 1/-1">
      <div class="rc-head">
        <div class="rc-ico iv"><i class="fas fa-tasks"></i></div>
        <h3>Action Items</h3>
      </div>
      <ul class="action-items-list">
        ${(d.action_items || []).map((item, i) => `
          <li><i class="fas fa-circle-check"></i><span><strong>${i+1}.</strong> ${item}</span></li>
        `).join('') || '<li><i class="fas fa-minus"></i><span>No action items.</span></li>'}
      </ul>
    </div>

  `;
}

// ── Reset ──
function resetApp() {
  ftxt = '';
  currentData = null;
  fileInput.value = '';
  filePrev.style.display = 'none';
  dropZone.style.display = 'block';
  document.getElementById('jobDescription').value = '';
  document.getElementById('rw').style.display = 'none';
  document.getElementById('ucard').style.display = 'block';
  document.getElementById('ucard').scrollIntoView({ behavior: 'smooth' });
}

// ── Download Report ──
function downloadReport() {
  if (!currentData) return;
  const d = currentData;

  const report = `
RESUMEAI — FULL ANALYSIS REPORT
Generated: ${new Date().toLocaleString()}
${'='.repeat(50)}

SCORES
──────
Overall Score : ${d.overall_score}%
ATS Score     : ${d.ats_score}%
Impact Score  : ${d.impact_score}%
Job Match     : ${d.match_score}%

OVERALL VERDICT
───────────────
${d.verdict}

STRENGTHS
─────────
${(d.strengths || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

AREAS TO IMPROVE
────────────────
${(d.improvements || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

MISSING SKILLS
──────────────
${(d.missing_skills || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

ACTION ITEMS
────────────
${(d.action_items || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

AI REWRITE SUGGESTIONS
──────────────────────
${(d.rewrite_suggestions || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

KEYWORDS FOUND
──────────────
${(d.keywords_found || []).join(', ')}

MISSING ATS KEYWORDS
────────────────────
${(d.keywords_missing || []).join(', ')}

${'='.repeat(50)}
ResumeAI — ai-resume-analyzer.netlify.app
`.trim();

  const blob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ResumeAI-Report.txt';
  a.click();
  URL.revokeObjectURL(url);
}

// ── FAQ Toggle ──
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = answer.classList.contains('open');
  document.querySelectorAll('.faq-a.open').forEach(a => {
    a.classList.remove('open');
    a.previousElementSibling.classList.remove('open');
  });
  if (!isOpen) {
    answer.classList.add('open');
    btn.classList.add('open');
  }
}

// ── Toast Notification ──
function showToast(msg, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${msg}</span>
  `;

  Object.assign(toast.style, {
    position: 'fixed', bottom: '2rem', right: '2rem',
    background: type === 'success' ? 'rgba(34,211,165,0.12)' : type === 'error' ? 'rgba(244,63,94,0.12)' : 'rgba(124,92,252,0.12)',
    border: `1px solid ${type === 'success' ? 'rgba(34,211,165,0.3)' : type === 'error' ? 'rgba(244,63,94,0.3)' : 'rgba(124,92,252,0.3)'}`,
    color: type === 'success' ? '#22d3a5' : type === 'error' ? '#f43f5e' : '#7c5cfc',
    padding: '0.8rem 1.4rem', borderRadius: '12px',
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    fontSize: '0.88rem', fontWeight: '600',
    zIndex: '9999', backdropFilter: 'blur(12px)',
    animation: 'fadeUp 0.3s ease',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
  });

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Utility ──
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}