
import { GoogleGenAI, Modality } from "@google/genai";
import { MODEL_NAMES, THINKING_BUDGET, PROMPTS } from '../constants';
import { blobToBase64 } from '../utils/audioUtils';

const apiKey = process.env.API_KEY || '';

// Initialize AI only if key exists to prevent immediate crash, handle error in calls
const ai = new GoogleGenAI({ apiKey });

const checkApiKey = () => {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error("MISSING_API_KEY");
  }
};

/**
 * Retries an async operation with exponential backoff
 */
const withRetry = async <T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    if (retries <= 0) throw error;
    
    // Retry on 5xx server errors or network-related errors (xhr, fetch)
    const isRetryable = 
        error.status >= 500 || 
        (error.message && (
            error.message.includes('xhr') || 
            error.message.includes('fetch') || 
            error.message.includes('network') ||
            error.message.includes('Rpc failed')
        ));

    if (!isRetryable) throw error;

    console.warn(`API Error (${error.message}). Retrying in ${delay}ms... (Attempts left: ${retries})`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(operation, retries - 1, delay * 2);
  }
};

/**
 * Transcribes audio using Gemini Flash
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  checkApiKey();
  try {
    const base64Audio = await blobToBase64(audioBlob);
    
    // Sanitize MIME type (remove codecs, e.g., "audio/webm;codecs=opus" -> "audio/webm")
    const rawMimeType = audioBlob.type || 'audio/webm';
    const mimeType = rawMimeType.split(';')[0];

    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_NAMES.TRANSCRIBE,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Audio
              }
            },
            {
              text: "متن این صدا را به فارسی بنویس."
            }
          ]
        },
        config: {
          systemInstruction: PROMPTS.TRANSCRIBE_SYSTEM,
          temperature: 0.0,
        }
      });
      return response.text || "";
    });
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};

/**
 * Smart corrects text
 */
export const smartCorrectText = async (text: string): Promise<string> => {
  checkApiKey();
  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_NAMES.SMART_FIX,
        contents: {
          parts: [{ text: `Text to correct: ${text}` }]
        },
        config: {
          systemInstruction: PROMPTS.SMART_FIX_SYSTEM,
        }
      });
      return response.text || "";
    });
  } catch (error) {
    console.error("Smart correction error:", error);
    throw error;
  }
};

/**
 * Adds Diacritics (Erab) to text
 */
export const addTextDiacritics = async (text: string): Promise<string> => {
  checkApiKey();
  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_NAMES.DIACRITICS,
        contents: {
          parts: [{ text: `Input Text: ${text}` }]
        },
        config: {
          systemInstruction: PROMPTS.DIACRITICS_SYSTEM,
        }
      });
      return response.text || "";
    });
  } catch (error) {
    console.error("Diacritics error:", error);
    throw error;
  }
};

/**
 * Generates speech from text
 */
export const generateSpeech = async (text: string): Promise<string> => {
  checkApiKey();
  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_NAMES.TTS,
        contents: { parts: [{ text: text }] },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }
            }
          }
        }
      });
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64) throw new Error("No audio content generated");
      return base64;
    });
  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
};

/**
 * Translates text between Persian and English
 */
export const translateText = async (text: string): Promise<string> => {
  checkApiKey();
  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_NAMES.TRANSLATE,
        contents: { parts: [{ text: `Input text: ${text}` }] },
        config: {
          systemInstruction: PROMPTS.TRANSLATE_SYSTEM,
        }
      });
      return response.text?.trim() || text;
    });
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
};

export const createChatSession = () => {
  checkApiKey();
  return ai.chats.create({
    model: MODEL_NAMES.CHAT,
    config: {
      systemInstruction: PROMPTS.CHAT_SYSTEM,
    }
  });
};

export const searchWeb = async (query: string) => {
  checkApiKey();
  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_NAMES.SEARCH,
        contents: query,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      const text = response.text || "";
      // Extract grounding chunks
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const links = chunks
          .filter((c: any) => c.web)
          .map((c: any) => ({
              uri: c.web.uri,
              title: c.web.title
          }));
          
      return { text, links };
    });
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
};

export const getLiveClient = () => {
  checkApiKey();
  return ai.live;
};
