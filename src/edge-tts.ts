import { Buffer } from 'buffer';
import type { PITCH, RATE, VOLUME } from './constants';
import { OUTPUT_FORMAT } from './constants';
import { WebSocket } from 'ws';
import fetch from 'node-fetch';
import { randomBytes } from 'crypto';
import { TextEncoder } from 'util';

// Generates a random hex string of the specified length
function generateRandomHex(length: number): string {
  const randomBuffer = randomBytes(length);
  return randomBuffer.toString('hex');
}

type EventType = "data" | "close" | "end" | "error";

class EventEmitter {
  private eventListeners: Record<EventType, ((...args: any[]) => void)[]>;

  constructor() {
    this.eventListeners = { data: [], close: [], end: [], error: [] };
  }

  on(event: EventType, callback: (...args: any[]) => void) {
    this.eventListeners[event].push(callback);
  }

  emit(event: EventType, data: any) {
    this.eventListeners[event].forEach((callback) => callback(data));
  }
}

export type Voice = {
  Name: string;
  ShortName: string;
  Gender: string;
  Locale: string;
  SuggestedCodec: string;
  FriendlyName: string;
  Status: string;
};

type Metadata = {
  Type: "WordBoundary" | "SentenceBoundary";
  Data: {
    Offset: number;
    Duration: number;
    text: {
      Text: string;
      Length: number;
      BoundaryType: "WordBoundary" | "SentenceBoundary";
    };
  };
}[];

export class ProsodyOptions {
  pitch: PITCH | string = "+0Hz";
  rate: RATE | string | number = 1.0;
  volume: VOLUME | string | number = 100.0;
}

export class EdgeTTSClient {
  static OUTPUT_FORMAT = OUTPUT_FORMAT;
  private static CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
  private static VOICES_URL = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=${EdgeTTSClient.CLIENT_TOKEN}`;
  private static SYNTH_URL = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${EdgeTTSClient.CLIENT_TOKEN}`;
  private static BINARY_DELIM = "Path:audio\r\n";
  private static VOICE_LANG_REGEX = /\w{2}-\w{2}/;

  private enableLogging: boolean;
  private ws: WebSocket | null = null;
  private voice: string | null = null;
  private voiceLocale: string | null = null;
  private outputFormat: OUTPUT_FORMAT | null = null;
  private requestQueue: Record<string, EventEmitter> = {};
  private connectionStartTime = 0;

  constructor(enableLogging = false) {
    this.enableLogging = enableLogging;
  }

  private log(...args: any[]) {
    if (this.enableLogging) console.log(...args);
  }

  private async sendMessage(message: string) {
    for (let attempt = 1; attempt <= 3 && (this.ws === null || this.ws.readyState !== WebSocket.OPEN); attempt++) {
      if (attempt === 1) this.connectionStartTime = Date.now();
      this.log(`Connecting... attempt ${attempt}`);
      await this.initWebSocket();
    }
    this.ws?.send(message);
  }

  private initWebSocket() {
    this.ws = new WebSocket(EdgeTTSClient.SYNTH_URL);
    this.ws.binaryType = "arraybuffer";
    let metadataBuffer: Metadata = [];

    return new Promise<void>((resolve, reject) => {
      this.ws!.onopen = () => {
        this.log("Connected in", (Date.now() - this.connectionStartTime) / 1000, "seconds");
        this.sendMessage(this.getConfigMessage()).then(resolve);
      };

      this.ws!.onmessage = (event) => this.handleMessage(event, metadataBuffer);
      this.ws!.onclose = () => this.handleClose();
      this.ws!.onerror = (error: any) => reject(`Connection Error: ${error.message}`);
    });
  }

  private handleMessage(event: any, metadataBuffer: Metadata) {
    const buffer = Buffer.from(event.data as ArrayBuffer);
    const message = buffer.toString();
    const requestIdMatch = /X-RequestId:(.*?)\r\n/.exec(message);
    const requestId = requestIdMatch ? requestIdMatch[1] : "";

    if (message.includes("Path:turn.start")) {
      metadataBuffer.length = 0;
    } else if (message.includes("Path:turn.end")) {
      this.requestQueue[requestId]?.emit("end", metadataBuffer);
    } else if (message.includes("Path:audio")) {
      this.cacheAudioData(buffer, requestId);
    } else if (message.includes("Path:audio.metadata")) {
      const startIndex = message.indexOf("{");
      metadataBuffer.push(JSON.parse(message.slice(startIndex)).Metadata[0]);
    } else {
      this.log("Unknown Message", message);
    }
  }

  private handleClose() {
    this.log("Disconnected after:", (Date.now() - this.connectionStartTime) / 1000, "seconds");
    for (const requestId in this.requestQueue) {
      this.requestQueue[requestId].emit("close", null);
    }
  }

  private cacheAudioData(buffer: Buffer, requestId: string) {
    // Convert the BINARY_DELIM string to a Uint8Array using TextEncoder
    const binaryDelimBytes = new TextEncoder().encode(EdgeTTSClient.BINARY_DELIM);

    // Use the helper function to find the delimiter index in the buffer
    const delimiterIndex = this.findDelimiterIndex(buffer, binaryDelimBytes);
    if (delimiterIndex === -1) {
      this.log('Delimiter not found in the buffer.');
      return;
    }

    const audioDataStart = delimiterIndex + binaryDelimBytes.length;
    const audioData = buffer.subarray(audioDataStart); // Use subarray for Buffer
    this.requestQueue[requestId]?.emit("data", audioData);
    this.log("Received audio chunk of size:", audioData?.length);
  }

  // Helper function to find the index of a byte sequence within another byte sequence
  private findDelimiterIndex(buffer: Buffer, delimiter: Uint8Array): number {
    for (let i = 0; i <= buffer.length - delimiter.length; i++) {
      let match = true;
      for (let j = 0; j < delimiter.length; j++) {
        if (buffer[i + j] !== delimiter[j]) {
          match = false;
          break;
        }
      }
      if (match) return i;
    }
    return -1;
  }

  private getConfigMessage(): string {
    return `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{
            "context": {
                "synthesis": {
                    "audio": {
                        "metadataoptions": {
                            "sentenceBoundaryEnabled": "true",
                            "wordBoundaryEnabled": "true"
                        },
                        "outputFormat": "${this.outputFormat}"
                    }
                }
            }
        }`;
  }

  async getVoices(): Promise<Voice[]> {
    try {
      const response = await fetch(EdgeTTSClient.VOICES_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json() as Voice[];
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async setMetadata(voiceName: string, outputFormat: OUTPUT_FORMAT, voiceLocale?: string) {
    this.voice = voiceName;
    this.outputFormat = outputFormat;
    this.voiceLocale = voiceLocale || this.inferLocaleFromVoiceName(voiceName);

    if (!this.voiceLocale) {
      throw new Error("Could not infer voiceLocale from voiceName!");
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connectionStartTime = Date.now();
      await this.initWebSocket();
    }
  }

  private inferLocaleFromVoiceName(voiceName: string): string | null {
    const match = EdgeTTSClient.VOICE_LANG_REGEX.exec(voiceName);
    return match ? match[0] : null;
  }

  close() {
    this.ws?.close();
  }

  toStream(text: string, options: ProsodyOptions = new ProsodyOptions()): EventEmitter {
    return this.sendSSMLRequest(this.buildSSML(text, options));
  }

  private buildSSML(text: string, options: ProsodyOptions): string {
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${this.voiceLocale}">
            <voice name="${this.voice}">
                <prosody pitch="${options.pitch}" rate="${options.rate}" volume="${options.volume}">
                    ${text}
                </prosody>
            </voice>
        </speak>`;
  }

  private sendSSMLRequest(ssml: string): EventEmitter {
    if (!this.ws) {
      throw new Error("WebSocket not initialized. Call setMetadata first.");
    }

    const requestId = generateRandomHex(16);
    const requestMessage = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml.trim()}`;

    const eventEmitter = new EventEmitter();
    this.requestQueue[requestId] = eventEmitter;
    this.sendMessage(requestMessage).then();

    return eventEmitter;
  }
}