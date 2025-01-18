
import * as fs from 'fs/promises';
import * as path from 'path';
import { EdgeTTSClient, ProsodyOptions, Voice } from './edge-tts';
import { OUTPUT_FORMAT } from './constants';

export type TextToSpeechProps = {
  text: string;
  outputPath: string;
  voice?: string;
  speed?: number;
  enableLogging?: boolean;
}

export async function textToSpeechMp3({
  text,
  outputPath,
  voice = 'en-GB-RyanNeural',
  speed = 1.2,
  enableLogging = false,
}: TextToSpeechProps): Promise<void> {

  const client = new EdgeTTSClient(enableLogging);

  try {
    // Not necessary
    const voices = await client.getVoices();
    const voiceSelection: Voice | undefined = voices.find(v => v.ShortName === voice);

    if (!voiceSelection) {
      throw new Error(`Voice with short name "${voiceSelection}" not found.`);
    }

    await client.setMetadata(voiceSelection.ShortName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const prosodyOptions = new ProsodyOptions();
    prosodyOptions.rate = speed;

    const stream = client.toStream(text, prosodyOptions);

    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    return new Promise<void>((resolve, reject) => {
      stream.on('end', async () => {
        const audioBuffer = Buffer.concat(chunks);
        const absoluteOutputPath = path.resolve(outputPath); // Ensure absolute path

        try {
          await fs.writeFile(absoluteOutputPath, audioBuffer);
          console.log(`Audio saved to ${absoluteOutputPath}`);
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

// Example usage:
// async function runExample() {
//   const textToSpeak = "This is an example of converting text to speech and saving it as an MP3 file.";
//   const outputFile = 'output.mp3';

//   try {
//     await textToSpeechMp3(textToSpeak, outputFile, 'en-GB-RyanNeural', { rate: 'fast' }, true);
//     console.log('Text-to-speech conversion successful!');
//   } catch (error) {
//     console.error('Text-to-speech conversion failed:', error);
//   }
// }

// runExample();