export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { 
    name = 'חבר', 
    gender = 'boy',
    grade = '1-2',
    interests = '',
    topic,
    stage = 1,
    attemptNumber = 1
  } = req.body;
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  // Gender-specific language
  const genderWords = {
    boy: {
      you: 'אתה',
      your: 'שלך',
      verb_past: '',
      verb_future: '',
      adjective: ''
    },
    girl: {
      you: 'את',
      your: 'שלך',
      verb_past: 'ת',
      verb_future: 'י',
      adjective: 'ה'
    }
  };
  
  const g = genderWords[gender];
  
  // Stage-specific content
  const stageInstructions = {
    1: 'רעיון בסיסי - 15 מילים מקסימום',
    2: 'הדגמה ויזואלית עם אמוג\'ים',
    3: 'גילוי הסוד/טריק',
    4: 'תרגול קל מאוד עם רמז',
    5: 'תרגול רגיל'
  };
  
  const prompt = `
אתה מסביר ${topic} ל${name} (${gender === 'girl' ? 'ילדה' : 'ילד'}) בכיתה ${grade}.
${interests ? `${name} אוהב${gender === 'girl' ? 'ת' : ''}: ${interests}` : ''}

שלב ${stage}: ${stageInstructions[stage]}

חוקים:
1. פנה ל${name} בלשון ${gender === 'girl' ? 'נקבה' : 'זכר'}
2. השתמש בתחביבים אם יש
3. מקסימום 20 מילים + ויזואליזציה
4. שלבים 1-3: רק הסבר, בלי שאלות
5. שלבים 4-5: שאלה עם רמז

דוגמה לשלב ${stage}:
${stage === 1 ? `"${name}, כפל זה חיבור מהיר! 3×2 = 3+3"` : ''}
${stage === 2 ? `"תראה${g.verb_future}: 🍕🍕🍕 + 🍕🍕🍕 = 6 פיצות!"` : ''}
${stage === 3 ? `"הסוד: 3×2 = 2×3! נסה${g.verb_future} ${g.you} גם!"` : ''}
${stage === 4 ? `"עכשיו ${g.you}: 2×3 = ? (רמז: כמו 3+3)"` : ''}
${stage === 5 ? `"${name}, כמה זה 4×2?"` : ''}

החזר JSON:
{
  "content": "התוכן",
  "visual": "ויזואליזציה באמוג'ים",
  "isQuestion": ${stage >= 4},
  "hint": "רמז אם זו שאלה",
  "correctAnswer": "תשובה אם זו שאלה",
  "nextButtonText": "${stage < 3 ? `הבנתי! תראה לי עוד` : stage === 3 ? `מוכן${g.adjective} לתרגל!` : `בדוק תשובה`}"
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
        max_tokens: 400,
        temperature: 0.8,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    const data = await response.json();
    const text = data.content[0].text;
    const json = JSON.parse(text.replace(/```json\n?|```\n?/g, ''));
    return res.status(200).json(json);
    
  } catch (error) {
    // Gender-aware fallback
    const fallback = {
      content: `${name}, ${topic} זה ${gender === 'girl' ? 'קלה' : 'קל'}!`,
      visual: '🎯➡️✨',
      isQuestion: stage >= 4,
      hint: stage >= 4 ? 'חשוב/י טוב' : null,
      correctAnswer: stage >= 4 ? '4' : null,
      nextButtonText: stage < 4 ? 'המשך' : 'בדוק'
    };
    
    return res.status(200).json(fallback);
  }
}
