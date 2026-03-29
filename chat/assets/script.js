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
const messagesEl = document.getElementById('messages');
const promptEl = document.getElementById('prompt');
const sendBtn = document.getElementById('send-btn');
const welcomeEl = document.getElementById('welcome');
const languageSelector = document.getElementById('language-selector');
const languageMenu = document.getElementById('language-menu');
const currentLanguageEl = document.getElementById('current-language');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
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
/**
 * Toggles the language dropdown menu visibility.
 */
function toggleLanguageMenu() {
  languageMenu.classList.toggle('open');
}

/**
 * Sets the current language and updates UI elements.
 * @param {string} lang - The language code (e.g., 'en', 'fr').
 */
function setLanguage(lang) {
  currentLanguage = lang;
  currentLanguageEl.textContent = {
    en: 'English',
    fr: 'Français',
    es: 'Español',
    de: 'Deutsch',
  }[lang];
  languageMenu.classList.remove('open'); // Auto-close menu after selection
  localStorage.setItem('chatLanguage', lang);
  updateWelcomeMessage(lang);
}

/**
 * Updates the welcome message and UI elements based on the selected language.
 * @param {string} lang - The language code.
 */
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
      copyButton: "copy",
    },
    fr: {
      welcome: "Demandez-moi n'importe quoi — je vais y réfléchir avec vous.",
      suggestions: [
        "Expliquez l'intrication quantique simplement",
        "Écrivez un haïku sur l'océan la nuit",
        "Quelle est la différence entre la RAM et le stockage ?"
      ],
      promptPlaceholder: "Demandez n'importe quoi…",
      copyButton: "copier",
    },
    // Add translations for 'es' and 'de' as needed
  };

  // Update welcome message
  document.querySelector('#welcome p').textContent = translations[lang].welcome;
  document.querySelector('#prompt').placeholder = translations[lang].promptPlaceholder;

  // Update suggestion buttons
  const suggestions = document.querySelectorAll('.suggestion');
  suggestions.forEach((el, i) => {
    el.textContent = translations[lang].suggestions[i];
  });

  // Update copy button text in all AI message footers
  document.querySelectorAll('.footer-btn').forEach(btn => {
    if (btn.textContent.includes('copy')) {
      btn.innerHTML = `<svg viewBox="0 0 16 16"><path d="M5 2h7a1 1 0 011 1v9h-1V3H5V2zm-2 2h7a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1zm0 1v9h7V5H3z"/></svg>${translations[lang].copyButton}`;
    }
  });
}

// Codestral API Integration
/**
 * Calls the Codestral API for translation or code generation.
 * @param {string} prompt - The user's input.
 * @returns {Promise<string>} The API response or error message.
 */
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
/**
 * Updates the send button state based on input.
 */
function updateSendBtn() {
  promptEl.style.height = 'auto';
  promptEl.style.height = Math.min(promptEl.scrollHeight, 110) + 'px';
  sendBtn.classList.toggle('active', !!promptEl.value.trim());
}

/**
 * Uses a suggestion from the welcome screen.
 * @param {HTMLElement} el - The suggestion element.
 */
function useSuggestion(el) {
  promptEl.value = el.textContent;
  promptEl.dispatchEvent(new Event('input'));
  handleSend();
}

/**
 * Scrolls the messages container to the bottom.
 */
function scrollToBottom() {
  messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
}

/**
 * Returns the current time as a formatted string.
 * @returns {string} Formatted time (e.g., "10:30 AM").
 */
function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Message Cards
/**
 * Creates a message card in the chat.
 * @param {string} role - The role ('user' or 'ai').
 * @param {string} bodyText - The message content.
 * @param {Object} [attachment] - Optional file attachment.
 * @returns {Object} The created card and body elements.
 */
function createCard(role, bodyText = '', attachment = null) {
  const isAI = role === 'ai';
  const card = document.createElement('div');
  card.className = `msg-card ${role}`;

  // Create message header
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

  // Create message body with translation hover effect
  const body = document.createElement('div');
  body.className = 'msg-card-body';
  const sentences = bodyText.split(/(?<=[.!?])\s+/);
  body.innerHTML = sentences.map(sentence => {
    const translation = translateSentence(sentence, currentLanguage);
    return `<span>${sentence} <span data-translation>${translation}</span></span>`;
  }).join(' ');

  card.appendChild(header);
  card.appendChild(body);

  // Add footer for AI messages
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

/**
 * Mock translation function (replace with real API call).
 * @param {string} sentence - The sentence to translate.
 * @param {string} targetLang - The target language.
 * @returns {string} The translated sentence.
 */
function translateSentence(sentence, targetLang) {
  const mockTranslations = {
    en: {
      "Explain quantum entanglement simply": "Explain quantum entanglement in simple terms.",
      "Write a haiku about the ocean at night": "Write a haiku about the night ocean.",
      "What's the difference between RAM and storage?": "What is the difference between RAM and storage?",
    },
    fr: {
      "Explain quantum entanglement simply": "Expliquez l'intrication quantique simplement.",
      "Write a haiku about the ocean at night": "Écrivez un haïku sur l'océan la nuit.",
      "What's the difference between RAM and storage?": "Quelle est la différence entre la RAM et le stockage ?",
    },
    // Add translations for 'es' and 'de' as needed
  };
  return mockTranslations[targetLang]?.[sentence] || sentence;
}

/**
 * Creates a typing indicator card.
 * @returns {Object} The typing card and body elements.
 */
function createTypingCard() {
  const { card, body } = createCard('ai');
  card.id = 'typing-card';
  body.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  return card;
}

/**
 * Copies message content to clipboard.
 * @param {HTMLElement} btn - The copy button.
 */
function copyCard(btn) {
  const text = btn.closest('.msg-card').querySelector('.msg-card-body').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const prev = btn.innerHTML;
    btn.textContent = 'copied!';
    setTimeout(() => btn.innerHTML = prev, 1500);
  });
}

// API Streaming
/**
 * Streams the response from the Codestral API.
 */
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

/**
 * Sets the loading state.
 * @param {boolean} on - Whether loading is active.
 */
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
/**
 * Handles sending a message.
 */
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
