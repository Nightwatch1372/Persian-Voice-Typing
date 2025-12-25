export interface Message {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export enum AudioState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  PLAYING = 'PLAYING',
}
