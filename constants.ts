
export const MODEL_NAMES = {
  TRANSCRIBE: 'gemini-3-flash-preview', // Faster and more stable for audio
  SMART_FIX: 'gemini-3-flash-preview',
  DIACRITICS: 'gemini-3-flash-preview', // New model for diacritics
  LIVE: 'gemini-2.5-flash-native-audio-preview-09-2025',
  CHAT: 'gemini-3-flash-preview',
  SEARCH: 'gemini-3-flash-preview',
  TTS: 'gemini-2.5-flash-preview-tts', // Corrected TTS model
  TRANSLATE: 'gemini-3-flash-preview',
};

export const PROMPTS = {
  TRANSCRIBE_SYSTEM: "You are a professional Persian (Farsi) transcriber. \nRules:\n1. Transcribe the audio EXACTLY as spoken.\n2. Do NOT change informal (محاوره) words to formal (e.g., write 'میخوام' if heard, not 'می‌خواهم').\n3. Ignore filler words like 'umm', 'ahh', 'eee' unless they are part of the sentence structure.\n4. Output ONLY the Persian text. No English, no explanations.",
  SMART_FIX_SYSTEM: "You are an expert Persian editor. Your goal is to make the text readable and grammatically correct while keeping the original tone.\nRules:\n1. Fix spelling errors.\n2. Add proper punctuation (.,،:?!).\n3. If the text is Informal, KEEP it Informal.\n4. If the text is Formal, keep it Formal.\n5. Output ONLY the corrected text.",
  DIACRITICS_SYSTEM: "You are an expert linguist in Iranian Persian (Farsi). \nTask: Add full diacritics (Harekat/Erab: Fatha, Kasra, Damma, Sukun, Tashdid) to the provided text based on standard Iranian pronunciation (Tehrani accent).\nRules:\n1. Do NOT change any words, letters, or sentence structure.\n2. ONLY add the diacritical marks to the existing letters.\n3. Ensure high accuracy for homographs based on context.\n4. Output ONLY the text with diacritics.",
  CHAT_SYSTEM: "You are a helpful and intelligent AI assistant fluent in Persian (Farsi). Answer user questions accurately and politely.",
  TRANSLATE_SYSTEM: "You are a bidirectional translator. \nRules:\n1. If the input text is primarily in Persian, translate it to English.\n2. If the input text is primarily in English, translate it to Persian.\n3. Output ONLY the translation. Do not add explanations.",
};

export const THINKING_BUDGET = 2048;