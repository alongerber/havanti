export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { grade, topic, attemptNumber = 1 } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  const methods = [
    'דוגמה מהחיים',
    'ויזואלי עם ציורים',
    'סיפור קצר',
    'משחק',
    'השוואה למשהו מוכר'
  ];
  
  const prompt = `אתה מורה גאון שמסביר ${topic} לילד בכיתה ${grade}.
זוהי הפעם ה-${attemptNumber} שאתה מסביר - השתמש בשיטה: ${methods[attemptNumber - 1]}

הסבר ב-3-4 משפטים פשוטים בעברית.
השתמש באמוג'ים ודוגמאות.

החזר JSON:
{
  "title": "${topic}",
  "method": "${methods[attemptNumber - 1]}",
  "explanation": "ההסבר שלך",
  "visual": "אמוג'ים או ויזואליזציה",
  "example": "דוגמה מוחשית"
}`;
  
  try {
    if (!apiKey) throw new Error('No API key');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    const data = await response.json();
    const text = data.content[0].text;
    const json = JSON.parse(text.replace(/```json\n?|```\n?/g, ''));
    return res.status(200).json(json);
    
  } catch (error) {
    // Fallback explanations
    const fallbacks = {
      'חיבור עד 10': {
        title: 'חיבור עד 10',
        method: methods[attemptNumber - 1],
        explanation: 'חיבור זה כמו לאסוף דברים ביחד. יש לך 3 עוגיות 🍪🍪🍪 וחבר נותן לך עוד 2 🍪🍪, עכשיו יש לך 5!',
        visual: '🍪🍪🍪 + 🍪🍪 = 🍪🍪🍪🍪🍪',
        example: '3 + 2 = 5'
      }
    };
    
    return res.status(200).json(
      fallbacks[topic] || {
        title: topic,
        method: methods[attemptNumber - 1],
        explanation: `${topic} זה פשוט! בוא נחשוב על זה ביחד...`,
        visual: '🎯',
        example: 'נסה בעצמך!'
      }
    );
  }
}

