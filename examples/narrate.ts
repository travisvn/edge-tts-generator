import { textToSpeechMp3, batchTextToSpeechMp3 } from 'edge-tts-generator';

// run with `tsx examples/narrate.ts` or `npx tsx examples/narrate.ts`

async function main() {
  // Example 1: Single narration
  console.log('Generating single narration...');

  await textToSpeechMp3({
    text: "Welcome to Edge TTS! This is a simple example of text-to-speech conversion.",
    outputPath: "./narrationOutput",
    fileName: "welcome",
    options: {
      voice: "en-US-JennyNeural"
    }
  });

  // Example 2: Batch narration
  console.log('Generating batch narrations...');

  const narrations = [
    {
      text: "This is the first paragraph we'll convert to speech.",
      title: "paragraph1",
    },
    {
      text: "Here's a second paragraph with a British accent.",
      title: "paragraph2",
      options: {
        voice: "en-GB-SoniaNeural"
      }
    },
    {
      text: "And finally, a third paragraph with a different voice.",
      title: "paragraph3",
      options: {
        voice: "en-US-GuyNeural",
        speed: 1.1,
      }
    }
  ];

  await batchTextToSpeechMp3(
    narrations,
    "./narrationOutput",
    {
      voice: "en-US-JennyNeural",
      speed: 1.0,
    }
  );

  console.log('All narrations completed!');
}

// Run the example
main().catch(error => {
  console.error('Error running examples:', error);
  process.exit(1);
}); 