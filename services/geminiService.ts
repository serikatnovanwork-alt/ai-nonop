
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Emotion } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export function createChatSession(systemInstruction: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]): Chat {
  const model = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction,
    },
    history
  });
  return model;
}

export async function analyzeEmotion(text: string): Promise<Emotion> {
  try {
    const emotionPrompt = `Analyze the following text and classify its primary emotion into one of these categories: neutral, happy, curious, thoughtful, empathetic, sad. Respond with only the single category name in lowercase. Text: "${text}"`;
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: emotionPrompt,
    });
    const emotionText = response.text.trim().toLowerCase();
    
    const validEmotions: Emotion[] = ['neutral', 'happy', 'curious', 'thoughtful', 'empathetic', 'sad'];
    if (validEmotions.includes(emotionText as Emotion)) {
      return emotionText as Emotion;
    }
    return 'neutral';
  } catch (error) {
    console.error("Error analyzing emotion:", error);
    return 'neutral';
  }
}
