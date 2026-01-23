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

export async function analyzeScreenshot(screenshotBase64, metadata = {}) {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a product analyst creating demo video scripts. 
Analyze the screenshot and describe what this website/app does.
Be concise and focus on the value proposition.
Return JSON with: { "description": "...", "features": ["...", "..."], "targetAudience": "..." }`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this website. Title: "${metadata.title || 'Unknown'}". H1: "${metadata.h1 || 'Unknown'}". Meta: "${metadata.description || 'None'}"`
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${screenshotBase64}`
            }
          }
        ]
      }
    ],
    max_tokens: 500
  });

  try {
    const content = response.choices[0].message.content;
    // Try to parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { description: content, features: [], targetAudience: 'developers' };
  } catch {
    return { 
      description: response.choices[0].message.content,
      features: [],
      targetAudience: 'developers'
    };
  }
}

export async function generateBrowserScript(analysis, url, duration = 30) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a developer advocate creating short, engaging video scripts.
Your scripts are conversational, enthusiastic but authentic, and focus on practical value.
Keep it under ${duration} seconds when read aloud (roughly ${duration * 2.5} words).
Don't use emojis or special characters - this will be read by text-to-speech.
Don't say "as you can see" or reference visual elements directly.`
      },
      {
        role: 'user',
        content: `Write a ${duration}-second demo video script for this website:

URL: ${url}
Description: ${analysis.description}
Key Features: ${analysis.features?.join(', ') || 'N/A'}
Target Audience: ${analysis.targetAudience || 'developers'}

The script should:
1. Hook the viewer in the first 5 seconds with the problem it solves
2. Explain the main value proposition
3. Mention 1-2 key features
4. End with a call to action (visit the site, try it out)

Just return the script text, no stage directions or timestamps.`
      }
    ],
    temperature: 0.7,
    max_tokens: 400
  });

  return response.choices[0].message.content;
}
