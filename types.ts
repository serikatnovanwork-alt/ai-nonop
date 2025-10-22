
export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system',
}

export type Emotion = 'neutral' | 'happy' | 'curious' | 'thoughtful' | 'empathetic' | 'sad';

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  emotion?: Emotion;
}
