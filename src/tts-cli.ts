import { Command } from 'commander';
import { EdgeTTSClient, ProsodyOptions } from './edge-tts';
import { OUTPUT_FORMAT } from './constants';
import { filterMarkdown } from './utils';
import { mkdir, readFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { basename, extname, join } from 'path';

const program = new Command();

program
  .name('tts-generator')
  .description('Generate text-to-speech audio from a UTF-8 encoded text file.')
  .argument('<file>', 'Path to the UTF-8 encoded text file')
  .option('-v, --voice <voice>', 'Specify the voice to use (e.g., en-US-JennyNeural)', 'en-US-JennyNeural') // Provide a default voice
  .option('-d, --outputFolder <folder>', 'Specify the output folder for the audio file', './output') // Provide a default output folder
  .option('-o, --fileName <fileName>', 'Specify the name of the output file', 'noname')
  .option('-s, --speed <speed>', 'Specify the speech rate (ex. 0.5 = 0.5x playback speed (50% speed)). Default = 1.2', parseFloat, 1.2)
  .option('--disableFilter', 'Disable basic text filtering (removes newlines and extra spaces)', false)
  .action(async (file, options) => {
    try {
      const fileContent = await readFile(file, 'utf-8');
      let textToSpeak = fileContent;

      if (!options.disableFilter) {
        textToSpeak = filterMarkdown(textToSpeak)
      }

      const client = new EdgeTTSClient();

      await client.setMetadata(options.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3); // Default output format

      const prosodyOptions = new ProsodyOptions();
      prosodyOptions.rate = options.speed;

      const stream = client.toStream(textToSpeak, prosodyOptions);

      const outputFileName = (options.fileName2 == 'noname') ? `${basename(file, extname(file))}-${options.voice}.mp3` : `${options.fileName}.mp3`;
      const outputPath = join(options.outputFolder, outputFileName);

      // Create output folder if it doesn't exist
      try {
        await mkdir(options.outputFolder, { recursive: true });
      } catch (error: any) {
        if (error.code !== 'EEXIST') {
          console.error(`Error creating output folder: ${error.message}`);
          return;
        }
      }

      const outputFileStream = createWriteStream(outputPath);

      stream.on('data', (chunk: Buffer) => {
        outputFileStream.write(chunk);
      });

      stream.on('end', () => {
        outputFileStream.end();
        console.log(`Successfully generated audio: ${outputPath}`);
        client.close();
      });

      stream.on('error', (error: any) => {
        console.error('Error during audio generation:', error);
        outputFileStream.end();
        client.close();
      });

      outputFileStream.on('error', (error: any) => {
        console.error('Error writing to output file:', error);
        client.close();
      });

    } catch (error: any) {
      console.error('Error:', error.message);
    }
  });

program.parse(process.argv);