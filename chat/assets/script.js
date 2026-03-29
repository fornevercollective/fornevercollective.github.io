// Configuration
const CODESTRAL_API_URL = "https://codestral.mistral.ai/v1/completions";
const CODESTRAL_API_KEY = "lWiTLDZV8bTauGxodq6Jk3H64G1gMmLH"; // Replace with your actual Codestral API key
const MODEL = "codestral-latest";

// State
let messages = [];
let isLoading = false;
let abortCtrl = null;
let currentLanguage = 'en';

// DOM Elements
let messagesEl, promptEl, sendBtn, welcomeEl, languageSelector, languageMenu, currentLanguageEl;

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Cache DOM elements
  messagesEl = document.getElementById('messages');
  promptEl = document.getElementById('prompt');
  sendBtn = document.getElementById('send-btn');
  welcomeEl = document.getElementById('welcome');
  languageSelector = document.getElementById('language-selector');
  languageMenu = document.getElementById('language-menu');
  currentLanguageEl = document.getElementById('current-language');

  // Load saved language preference
  const savedLanguage = localStorage.getItem('chatLanguage');
  if (savedLanguage) {
    setLanguage(savedLanguage);
  }

  // Set up event listeners
  promptEl.addEventListener('input', updateSendBtn);
  promptEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
});

// Language Functions
function toggleLanguageMenu() {
  languageMenu.classList.toggle('open');
}

function setLanguage(lang) {
  currentLanguage = lang;
  currentLanguageEl.textContent = {
    en: 'English',
    fr: 'Français',
    es: 'Español',
    de: 'Deutsch',
  }[lang];
  languageMenu.classList.remove('open'); // Auto-close menu
  localStorage.setItem('chatLanguage', lang);
  updateWelcomeMessage(lang);
}

function updateWelcomeMessage(lang) {
  const translations = {
    en: {
      welcome: "Ask me anything — I'll think it through with you.",
      suggestions: [
        "Explain quantum entanglement simply",
        "Write a haiku about the ocean at night",
        "What's the difference between RAM and storage?"
      ],
      promptPlaceholder: "Ask anything…",
    },
    fr: {
      welcome: "Demandez-moi n'importe quoi — je vais y réfléchir avec vous.",
      suggestions: [
        "Expliquez l'intrication quantique simplement",
        "Écrivez un haïku sur l'océan la nuit",
        "Quelle est la différence entre la RAM et le stockage ?"
      ],
      promptPlaceholder: "Demandez n'importe quoi…",
    },
    // Add translations for 'es' and 'de' as needed
  };

  document.querySelector('#welcome p').textContent = translations[lang].welcome;
  document.querySelector('#prompt').placeholder = translations[lang].promptPlaceholder;

  const suggestions = document.querySelectorAll('.suggestion');
  suggestions.forEach((el, i) => {
    el.textContent = translations[lang].suggestions[i];
  });
}

// Codestral API Integration
async function callCodestralAPI(prompt) {
  try {
    const response = await fetch(CODESTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CODESTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: `Translate and explain the following to ${currentLanguage}:\n\n${prompt}`,
        max_tokens: 512,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Codestral API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].text.trim();
  } catch (error) {
    console.error('Codestral API error:', error);
    return `Error: Could not translate/generate code. ${error.message}`;
  }
}

// Input Handling
function updateSendBtn() {
  promptEl.style.height = 'auto';
  promptEl.style.height = Math.min(promptEl.scrollHeight, 110) + 'px';
  sendBtn.classList.toggle('active', !!promptEl.value.trim());
}

function useSuggestion(el) {
  promptEl.value = el.textContent;
  promptEl.dispatchEvent(new Event('input'));
  handleSend();
}

function scrollToBottom() {
  messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Message Cards
function createCard(role, bodyText = '') {
  const isAI = role === 'ai';
  const card = document.createElement('div');
  card.className = `msg-card ${role}`;

  const header = document.createElement('div');
  header.className = 'msg-card-header';
  const roleDiv = document.createElement('div');
  roleDiv.className = 'card-role';
  const dot = document.createElement('div');
  dot.className = 'role-dot';
  dot.textContent = isAI ? 'm' : 'u';
  const label = document.createElement('span');
  label.className = 'role-label';
  label.textContent = isAI ? 'Codestral' : 'You';
  const ts = document.createElement('span');
  ts.className = 'card-timestamp';
  ts.textContent = nowTime();
  roleDiv.appendChild(dot);
  roleDiv.appendChild(label);
  header.appendChild(roleDiv);
  header.appendChild(ts);

  const body = document.createElement('div');
  body.className = 'msg-card-body';
  body.innerHTML = bodyText.replace(/\n/g, '<br>');

  card.appendChild(header);
  card.appendChild(body);

  if (isAI) {
    const footer = document.createElement('div');
    footer.className = 'msg-card-footer';
    footer.innerHTML = `
      <button class="footer-btn" onclick="copyCard(this)">
        <svg viewBox="0 0 16 16"><path d="M5 2h7a1 1 0 011 1v9h-1V3H5V2zm-2 2h7a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1zm0 1v9h7V5H3z"/></svg>copy
      </button>
    `;
    card.appendChild(footer);
  }

  messagesEl.appendChild(card);
  scrollToBottom();
  return { card, body };
}

function createTypingCard() {
  const { card, body } = createCard('ai');
  card.id = 'typing-card';
  body.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  return card;
}

function copyCard(btn) {
  const text = btn.closest('.msg-card').querySelector('.msg-card-body').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const prev = btn.innerHTML;
    btn.textContent = 'copied!';
    setTimeout(() => btn.innerHTML = prev, 1500);
  });
}

// API Streaming
async function streamResponse() {
  setLoading(true);
  const typingCard = createTypingCard();

  try {
    const userPrompt = messages[messages.length - 1].content;
    const aiResponse = await callCodestralAPI(userPrompt);

    typingCard.remove();
    const { card, body } = createCard('ai', aiResponse);
    messages.push({ role: 'assistant', content: aiResponse });
  } catch (err) {
    typingCard.remove();
    createCard('ai', `⚠ ${err.message}`).card.classList.add('error');
    messages.pop();
  } finally {
    setLoading(false);
    promptEl.disabled = false;
    promptEl.focus();
    scrollToBottom();
  }
}

function setLoading(on) {
  isLoading = on;
  promptEl.disabled = on;
  sendBtn.classList.toggle('loading', on);
  sendBtn.innerHTML = on
    ? `<svg width="13" height="13" viewBox="0 0 14 14" fill="white"><rect x="3" y="3" width="8" height="8" rx="1.5"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 16 16" fill="white"><path d="M2 8L14 2L10 8L14 14L2 8Z"/></svg>`;
  if (!on) sendBtn.classList.toggle('active', !!promptEl.value.trim());
}

// Send Message
async function handleSend() {
  if (isLoading) {
    abortCtrl?.abort();
    return;
  }

  const text = promptEl.value.trim();
  if (!text) return;

  welcomeEl && (welcomeEl.style.display = 'none');
  messages.push({ role: 'user', content: text });
  createCard('user', text);

  promptEl.value = '';
  promptEl.style.height = 'auto';
  sendBtn.classList.remove('active');

  await streamResponse();
}

// Expose functions to global scope
window.useSuggestion = useSuggestion;
window.copyCard = copyCard;
window.toggleMenu = toggleLanguageMenu;
window.setLanguage = setLanguage;
window.handleSend = handleSend;
