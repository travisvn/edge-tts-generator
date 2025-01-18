import * as fs from 'fs/promises';
import * as path from 'path';
import { EdgeTTSClient, ProsodyOptions, Voice } from './edge-tts';
import { OUTPUT_FORMAT } from './constants';

const DEFAULT_OPTIONS: TextToSpeechOptions = {
  voice: 'en-GB-RyanNeural',
  speed: 1.2,
  enableLogging: false,
}

export type TextToSpeechOptions = {
  voice?: string;
  speed?: number;
  enableLogging?: boolean;
}

export type TextToSpeechProps = {
  text: string;
  outputPath: string;
  fileName: string;
  options?: TextToSpeechOptions;
}

export async function textToSpeechMp3({
  text,
  outputPath,
  fileName,
  options = DEFAULT_OPTIONS,
}: TextToSpeechProps): Promise<void> {

  const client = new EdgeTTSClient(options.enableLogging);

  try {
    // Ensure fileName ends with .mp3
    const finalFileName = fileName.toLowerCase().endsWith('.mp3')
      ? fileName
      : `${fileName}.mp3`;

    // Combine directory path and filename
    const fullOutputPath = path.join(outputPath, finalFileName);

    // Create output directory if it doesn't exist
    await fs.mkdir(outputPath, { recursive: true });

    // Not necessary
    const voices = await client.getVoices();
    const voiceSelection: Voice | undefined = voices.find(v => v.ShortName === options.voice);

    if (!voiceSelection) {
      throw new Error(`Voice with short name "${voiceSelection}" not found.`);
    }

    await client.setMetadata(voiceSelection.ShortName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const prosodyOptions = new ProsodyOptions();
    prosodyOptions.rate = options.speed ?? DEFAULT_OPTIONS.speed;

    const stream = client.toStream(text, prosodyOptions);

    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    return new Promise<void>((resolve, reject) => {
      stream.on('end', async () => {
        const audioBuffer = Buffer.concat(chunks);

        try {
          await fs.writeFile(fullOutputPath, audioBuffer);
          console.log(`Audio saved to ${fullOutputPath}`);
          resolve();
        } catch (err) {
          console.error('Error writing audio to file:', err);
          reject(err);
        } finally {
          client.close();
        }
      });

      stream.on('error', (error: any) => {
        console.error('Stream error:', error);
        client.close();
        reject(error);
      });
    });

  } catch (error) {
    console.error('Error during text-to-speech:', error);
    client.close();
    throw error;
  }
}

export type TextToSpeechInput = {
  text: string;
  title: string;
}

export async function batchTextToSpeechMp3(
  inputs: TextToSpeechInput[],
  outputPath: string,
  options: TextToSpeechOptions = DEFAULT_OPTIONS
): Promise<void> {
  // Create output directory if it doesn't exist
  await fs.mkdir(outputPath, { recursive: true });

  // Process all inputs sequentially to avoid overwhelming the TTS service
  for (const input of inputs) {
    try {
      await textToSpeechMp3({
        text: input.text,
        outputPath,
        fileName: input.title,
        ...options
      });
    } catch (error) {
      console.error(`Failed to process "${input.title}":`, error);
      // Continue with next item even if one fails
    }
  }
}

// Example usage:
// async function runBatchExample() {
//   const inputs: TextToSpeechInput[] = [
//     {
//       text: "This is the first audio file",
//       title: "first-audio"
//     },
//     {
//       text: "This is the second audio file",
//       title: "second-audio"
//     }
//   ];
//
//   const outputDir = './output';
//
//   try {
//     await batchTextToSpeechMp3(
//       inputs,
//       outputDir,
//       { 
//         voice: 'en-GB-RyanNeural',
//         speed: 1.2,
//         enableLogging: true 
//       }
//     );
//     console.log('Batch text-to-speech conversion completed!');
//   } catch (error) {
//     console.error('Batch conversion failed:', error);
//   }
// }