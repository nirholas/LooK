import OpenAI from 'openai';

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

export async function generateScript(analysis, duration = 30) {
  const prompt = buildPrompt(analysis, duration);
  
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a developer advocate creating short, punchy video scripts for GitHub repositories. 
Your scripts are conversational, excited but not over-the-top, and focus on the practical value.
Keep it under ${duration} seconds when read aloud (roughly ${duration * 2.5} words).
Don't use emojis or special characters - this will be read by text-to-speech.`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  });

  return response.choices[0].message.content;
}

function buildPrompt(analysis, duration) {
  let prompt = `Write a ${duration}-second video script for this project:\n\n`;
  
  prompt += `Name: ${analysis.name}\n`;
  prompt += `Description: ${analysis.description}\n`;
  
  if (analysis.techStack.length > 0) {
    prompt += `Tech: ${analysis.techStack.join(', ')}\n`;
  }
  
  if (analysis.features.length > 0) {
    prompt += `Features:\n${analysis.features.map(f => `- ${f}`).join('\n')}\n`;
  }
  
  prompt += `\nCommands being demoed:\n${analysis.commands.map(c => `- ${c}`).join('\n')}\n`;
  
  prompt += `\nThe script should:
1. Hook the viewer in the first 5 seconds
2. Explain what problem this solves
3. Show how easy it is to use
4. End with a call to action (star the repo, try it out)

Just return the script text, no stage directions or timestamps.`;

  return prompt;
}
