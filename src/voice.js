import OpenAI from 'openai';
import { createWriteStream } from 'fs';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

let openai = null;

function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required. Set it with: export OPENAI_API_KEY=sk-...');
    }
    openai = new OpenAI();
  }
  return openai;
}

export async function generateVoiceover(script, voice = 'alloy') {
  // Create temp directory for audio
  const tempDir = await mkdtemp(join(tmpdir(), 'repovideo-voice-'));
  const outputFile = join(tempDir, 'voiceover.mp3');

  const response = await getOpenAI().audio.speech.create({
    model: 'tts-1',
    voice: voice,
    input: script,
    response_format: 'mp3'
  });

  // Stream to file
  const buffer = Buffer.from(await response.arrayBuffer());
  const writeStream = createWriteStream(outputFile);
  
  await new Promise((resolve, reject) => {
    writeStream.write(buffer, (error) => {
      if (error) reject(error);
      else resolve();
    });
    writeStream.end();
  });

  return outputFile;
}
