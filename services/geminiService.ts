
import { GoogleGenAI, Modality } from "@google/genai";
import { MODEL_NAMES, THINKING_BUDGET, PROMPTS } from '../constants';
import { blobToBase64 } from '../utils/audioUtils';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Transcribes audio using Gemini Flash
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const base64Audio = await blobToBase64(audioBlob);
    
    const response = await ai.models.generateContent({
      model: MODEL_NAMES.TRANSCRIBE,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || 'audio/webm',
              data: base64Audio
            }
          },
          {
            text: "متن صحبت‌های این فایل صوتی را دقیقاً همانطور که هست (حتی اگر محاوره است) بنویس."
          }
        ]
      },
      config: {
        systemInstruction: PROMPTS.TRANSCRIBE_SYSTEM,
        temperature: 0.0, // Critical: Enforce deterministic output for accuracy
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};

/**
 * Smart corrects text using Gemini Pro (Thinking removed for stability on simple text tasks)
 */
export const smartCorrectText = async (text: string): Promise<string> => {
  try {
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
  } catch (error) {
    console.error("Smart correction error:", error);
    throw error;
  }
};

/**
 * Generates speech from text
 */
export const generateSpeech = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAMES.TTS,
      contents: { parts: [{ text: text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' } // Using Fenrir for lower pitch/masculine tone
          }
        }
      }
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64) throw new Error("No audio content generated");
    return base64;
  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
};

/**
 * Translates text between Persian and English
 */
export const translateText = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAMES.TRANSLATE,
      contents: { parts: [{ text: `Input text: ${text}` }] },
      config: {
        systemInstruction: PROMPTS.TRANSLATE_SYSTEM,
      }
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
};

export const createChatSession = () => {
  return ai.chats.create({
    model: MODEL_NAMES.CHAT,
    config: {
      systemInstruction: PROMPTS.CHAT_SYSTEM,
    }
  });
};

export const searchWeb = async (query: string) => {
  try {
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
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
};

export const getLiveClient = () => {
  return ai.live;
};
