# Edge TTS Generator 🗣️

![GitHub stars](https://img.shields.io/github/stars/travisvn/edge-tts-generator?style=social)
![GitHub forks](https://img.shields.io/github/forks/travisvn/edge-tts-generator?style=social)
![GitHub repo size](https://img.shields.io/github/repo-size/travisvn/edge-tts-generator)
![GitHub top language](https://img.shields.io/github/languages/top/travisvn/edge-tts-generator)
![GitHub last commit](https://img.shields.io/github/last-commit/travisvn/edge-tts-generator?color=red)
[![Discord](https://img.shields.io/badge/Discord-Voice_AI_%26_TTS_Tools-blue?logo=discord&logoColor=white)](https://discord.gg/GkFbBCBqJ6)
[![npm version](https://badge.fury.io/js/edge-tts-generator.svg)](https://www.npmjs.com/package/edge-tts-generator)  


Edge TTS Generator is a Node.js library and CLI tool for generating text-to-speech (TTS) audio using Microsoft's Edge Read Aloud API. It's designed to help developers easily create audio files from text, with options for customization like voice selection, playback speed, and audio format.

## Features ✨

- **Free Text-to-Speech**: Generate audio using the Edge Read Aloud API for free.
- **Customizable Options**: Adjust voice, speed, pitch, volume, etc.
- **Markdown Support**: Automatically filters and cleans Markdown text for narration.
- **Batch Processing**: Convert multiple text files into audio in a single operation.
- **Use Your Way**: Supports both library and CLI usage.

## Installation 🛠️

```bash
npm install edge-tts-generator
```

## Usage 🚀

### As a Library 📚

#### Example: Generate a Single MP3 File

```typescript
import { textToSpeechMp3 } from 'edge-tts-generator';

async function main() {
  await textToSpeechMp3({
    text: 'Hello, world! This is a test of the Edge TTS Generator.',
    outputPath: './output',
    fileName: 'hello-world',
    options: {
      voice: 'en-US-JennyNeural',
      speed: 1.0,
    },
  });
}

main().catch(console.error);
```

#### Example: Batch Processing

```typescript
import { batchTextToSpeechMp3 } from 'edge-tts-generator';

const inputs = [
  { text: 'This is the first text.', title: 'file1' },
  { text: 'This is the second text.', title: 'file2' },
];

async function main() {
  await batchTextToSpeechMp3(inputs, './output', {
    voice: 'en-GB-RyanNeural',
    speed: 1.1,
  });
}

main().catch(console.error);
```

### As a CLI Tool 🔧

```bash
npx edge-tts-generator <file> [options]
```

#### CLI Options

| Option                | Description                                                                | Default                    |
| --------------------- | -------------------------------------------------------------------------- | -------------------------- |
| `-v, --voice <voice>` | Specify the voice to use (e.g., `en-US-JennyNeural`).                      | `en-US-JennyNeural`        |
| `-d, --outputFolder`  | Specify the output folder for the audio file.                              | `./output`                 |
| `-o, --fileName`      | Specify the name of the output file.                                       | `<input_file>-<voice>.mp3` |
| `-s, --speed <speed>` | Specify the speech rate (e.g., `0.5` for 50% speed, `2.0` for 200% speed). | `1.1`                      |
| `--disableFilter`     | Disable Markdown and text filtering.                                       | `false`                    |

#### Example

```bash
npx edge-tts-generator examples/narrate.txt -v en-GB-RyanNeural -d ./audio -s 1.1
```

## Supported Voices 🎙️

[Play voice samples and see all available Edge TTS voices](https://tts.travisvn.com/)

<details>
  <summary>Fetch the list of supported voices</summary>

```typescript
import { EdgeTTSClient } from 'edge-tts-generator';

async function fetchVoices() {
  const client = new EdgeTTSClient();
  const voices = await client.getVoices();
  console.log(voices);
}

fetchVoices().catch(console.error);
```
</details>

## Contributing 🤝

Contributions are welcome! Fork the repository and submit a pull request. For major changes, open an issue first to discuss your ideas.

## License 📜

This project is licensed under the [GPL-3.0 License](https://www.gnu.org/licenses/gpl-3.0).

## Links 🔗

- [NPM Package](https://www.npmjs.com/package/edge-tts-generator)
- [GitHub Repository](https://github.com/travisvn/edge-tts-generator)
- [Author Website](https://travis.engineer)
