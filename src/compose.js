import { exec } from 'child_process';
import { promisify } from 'util';
import { access } from 'fs/promises';

const execAsync = promisify(exec);

export async function composeVideo(terminalVideo, audioFile, outputPath) {
  // Check if FFmpeg is installed
  try {
    await execAsync('which ffmpeg');
  } catch {
    throw new Error(
      'FFmpeg is not installed. Install it with: brew install ffmpeg (macOS) or apt install ffmpeg (Linux)'
    );
  }

  // Verify input files exist
  await access(terminalVideo);
  
  let command;
  
  if (audioFile) {
    await access(audioFile);
    
    // Combine video and audio
    // - Use audio duration as master
    // - Loop video if needed
    // - Fade out at the end
    command = `ffmpeg -y \
      -stream_loop -1 -i "${terminalVideo}" \
      -i "${audioFile}" \
      -c:v libx264 -preset fast -crf 23 \
      -c:a aac -b:a 192k \
      -shortest \
      -vf "fade=t=out:st=28:d=2" \
      -af "afade=t=out:st=28:d=2" \
      -movflags +faststart \
      "${outputPath}"`;
  } else {
    // Video only
    command = `ffmpeg -y \
      -i "${terminalVideo}" \
      -c:v libx264 -preset fast -crf 23 \
      -an \
      -movflags +faststart \
      "${outputPath}"`;
  }

  try {
    await execAsync(command, { timeout: 300000 });
  } catch (error) {
    throw new Error(`FFmpeg composition failed: ${error.message}`);
  }
}
