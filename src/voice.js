import OpenAI from 'openai';
import { createWriteStream } from 'fs';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const openai = new OpenAI();

export async function generateVoiceover(script, voice = 'alloy') {
  // Create temp directory for audio
  const tempDir = await mkdtemp(join(tmpdir(), 'repovideo-voice-'));
  const outputFile = join(tempDir, 'voiceover.mp3');

  const response = await openai.audio.speech.create({
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
