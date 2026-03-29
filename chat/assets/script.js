{\rtf1\ansi\ansicpg1252\cocoartf2868
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 function setLanguage(lang) \{\
  currentLanguage = lang;\
  currentLanguageEl.textContent = \{\
    en: 'English',\
    fr: 'Fran\'e7ais',\
    es: 'Espa\'f1ol',\
    de: 'Deutsch',\
  \}[lang];\
  languageMenu.classList.remove('open'); // Close the menu after selection\
  localStorage.setItem('chatLanguage', lang);\
  updateWelcomeMessage(lang);\
\}\
\
function updateWelcomeMessage(lang) \{\
  const translations = \{\
    en: \{\
      welcome: "Ask me anything \'97 I'll think it through with you.",\
      suggestions: [\
        "Explain quantum entanglement simply",\
        "Write a haiku about the ocean at night",\
        "What's the difference between RAM and storage?"\
      ],\
      promptPlaceholder: "Ask anything\'85",\
      copyButton: "copy",\
    \},\
    fr: \{\
      welcome: "Demandez-moi n'importe quoi \'97 je vais y r\'e9fl\'e9chir avec vous.",\
      suggestions: [\
        "Expliquez l'intrication quantique simplement",\
        "\'c9crivez un ha\'efku sur l'oc\'e9an la nuit",\
        "Quelle est la diff\'e9rence entre la RAM et le stockage ?"\
      ],\
      promptPlaceholder: "Demandez n'importe quoi\'85",\
      copyButton: "copier",\
    \},\
    // Add translations for 'es' and 'de' similarly\
  \};\
\
  document.querySelector('#welcome p').textContent = translations[lang].welcome;\
  document.querySelector('#prompt').placeholder = translations[lang].promptPlaceholder;\
\
  // Update suggestions\
  const suggestions = document.querySelectorAll('.suggestion');\
  suggestions.forEach((el, i) => \{\
    el.textContent = translations[lang].suggestions[i];\
  \});\
\
  // Update copy button text in all AI message footers\
  document.querySelectorAll('.footer-btn').forEach(btn => \{\
    if (btn.textContent.includes('copy')) \{\
      btn.innerHTML = `<svg viewBox="0 0 16 16"><path d="M5 2h7a1 1 0 011 1v9h-1V3H5V2zm-2 2h7a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1zm0 1v9h7V5H3z"/></svg>$\{translations[lang].copyButton\}`;\
    \}\
  \});\
\}\
\
addEventListener('fetch', (event) => \{\
  event.respondWith(handleRequest(event));\
\});\
\
async function handleRequest(event) \{\
  const \{ request \} = event;\
  const url = new URL(request.url);\
  if (url.pathname === '/api/translate') \{\
    const \{ prompt, language \} = await request.json();\
    const response = await fetch('https://codestral.mistral.ai/v1/completions', \{\
      method: 'POST',\
      headers: \{\
        'Content-Type': 'application/json',\
        'Authorization': `Bearer $\{CODESTRAL_API_KEY\}`, // Set in Worker env vars\
      \},\
      body: JSON.stringify(\{\
        model: 'codestral-latest',\
        prompt: `Translate to $\{language\}:\\n\\n$\{prompt\}`,\
        max_tokens: 512,\
      \}),\
    \});\
    return response;\
  \}\
  return new Response('Not found', \{ status: 404 \});\
\}}