const MOOD_ACCENTS = {
  default: ['#d6aa62', '214,170,98'],
  calm: ['#89a891', '137,168,145'],
  peaceful: ['#89a891', '137,168,145'],
  quiet: ['#89a891', '137,168,145'],
  gentle: ['#89a891', '137,168,145'],
  reflective: ['#89a891', '137,168,145'],
  clear: ['#89a891', '137,168,145'],
  resolve: ['#d39a5f', '211,154,95'],
  courage: ['#d39a5f', '211,154,95'],
  brave: ['#d39a5f', '211,154,95'],
  bold: ['#d39a5f', '211,154,95'],
  fierce: ['#d39a5f', '211,154,95'],
  determined: ['#d39a5f', '211,154,95'],
  powerful: ['#d39a5f', '211,154,95'],
  ambitious: ['#d39a5f', '211,154,95'],
  hopeful: ['#d6aa62', '214,170,98'],
  uplifted: ['#d6aa62', '214,170,98'],
  encouraged: ['#d6aa62', '214,170,98'],
  reassuring: ['#d6aa62', '214,170,98'],
  grateful: ['#d6aa62', '214,170,98'],
  light: ['#d6aa62', '214,170,98'],
  warm: ['#d6aa62', '214,170,98'],
  steady: ['#aaa16f', '170,161,111'],
  grounded: ['#aaa16f', '170,161,111'],
  steadfast: ['#aaa16f', '170,161,111'],
  patient: ['#aaa16f', '170,161,111'],
  satisfied: ['#aaa16f', '170,161,111'],
  healing: ['#c58b75', '197,139,117'],
  comforted: ['#c58b75', '197,139,117'],
  connected: ['#c58b75', '197,139,117'],
  open: ['#c58b75', '197,139,117'],
  affirming: ['#c58b75', '197,139,117'],
  inspired: ['#7ea7a5', '126,167,165']
};

const linesEl = document.getElementById('haikuLines');
const metaEl = document.getElementById('haikuMeta');
const saveBtn = document.getElementById('saveBtn');
const copyBtn = document.getElementById('copyBtn');
const closeBtn = document.getElementById('closeBtn');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function applyMoodAccent(mood) {
  const key = String(mood || '').toLowerCase();
  const accent = MOOD_ACCENTS[key] || MOOD_ACCENTS.default;
  document.documentElement.style.setProperty('--mood', accent[0]);
  document.documentElement.style.setProperty('--mood-rgb', accent[1]);
}

function render(data) {
  if (!data || !data.haiku) return;

  const haiku = data.haiku;
  const lines = Array.isArray(data.lines) && data.lines.length ? data.lines : haiku.lines || [];
  applyMoodAccent(haiku.mood);
  document.body.classList.remove('leaving');
  saveBtn.textContent = 'Save';
  copyBtn.textContent = 'Copy';
  linesEl.innerHTML = lines.map((line) => `<span>${escapeHtml(line)}</span>`).join('');
  metaEl.textContent = data.meta || [haiku.mood, haiku.theme].filter(Boolean).join(' · ');
}

saveBtn.addEventListener('click', async () => {
  const result = await window.popupAPI.save();
  saveBtn.textContent = result && result.ok ? 'Saved' : 'Save';
});

copyBtn.addEventListener('click', async () => {
  const result = await window.popupAPI.copy();
  copyBtn.textContent = result && result.ok ? 'Copied' : 'Copy';
  window.setTimeout(() => {
    copyBtn.textContent = 'Copy';
  }, 1400);
});

closeBtn.addEventListener('click', () => {
  window.popupAPI.close();
});

window.popupAPI.onData(render);
window.popupAPI.onDismiss(() => {
  document.body.classList.add('leaving');
});

window.popupAPI.getData().then(render).catch(() => {});
