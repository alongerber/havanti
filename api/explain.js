// Rate limiting
const rateLimit = new Map();

// Hebrew text direction formatting
function formatHebrewText(text) {
  // Ensure numbers stay LTR within RTL text
  return text
    .replace(/(\d+)/g, '\u202D$1\u202C')  // LTR mark for numbers
    .replace(/([a-zA-Z]+)/g, '\u202D$1\u202C'); // LTR mark for English
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Get user IP
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const userKey = `${ip}_${new Date().toDateString()}`;
  const requests = rateLimit.get(userKey) || 0;
  
  // Check limit (30 per day)
  if (requests >= 30) {
    return res.status(200).json({
      content: "סיימת את המכסה היומית! חזור מחר 🌟",
      visual: "💤",
      method: "limit",
      isQuestion: false,
      limited: true
    });
  }
  
  // Increment counter
  rateLimit.set(userKey, requests + 1);
  
  // Clean old entries every hour
  if (Math.random() < 0.01) {
    const now = new Date().toDateString();
    for (const [key] of rateLimit) {
      if (!key.includes(now)) {
        rateLimit.delete(key);
      }
    }
  }
  
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
  
  // Age-specific language mapping
  const ageGroups = {
    '1-2': { age: 7, style: 'playful', maxWords: 8 },
    '3-4': { age: 9, style: 'discovery', maxWords: 12 },
    '5-6': { age: 11, style: 'logical', maxWords: 15 }
  };
  
  const ageData = ageGroups[grade];
  
  // 4 completely different explanation approaches
  const explanationMethods = [
    'story_based',      // סיפור עם בעיה ופתרון
    'visual_pattern',   // דפוס ויזואלי
    'logical_rule',     // חוק לוגי
    'game_challenge'    // משחק/אתגר
  ];
  
  const currentMethod = explanationMethods[(attemptNumber - 1) % 4];
  
  // Smart emoji mapping based on interests
  const emojiMap = {
    'כדורגל': { emoji: '⚽', context: 'גולים', action: 'בועט' },
    'כדורסל': { emoji: '🏀', context: 'סלים', action: 'קולע' },
    'מיינקראפט': { emoji: '⛏️', context: 'בלוקים', action: 'בונה' },
    'רובלוקס': { emoji: '🎮', context: 'מטבעות', action: 'אוסף' },
    'בישול': { emoji: '🍰', context: 'עוגות', action: 'אופה' },
    'ציור': { emoji: '🎨', context: 'צבעים', action: 'מערבב' },
    'ריקוד': { emoji: '💃', context: 'צעדים', action: 'רוקד' },
    'default': { emoji: '🌟', context: 'כוכבים', action: 'אוסף' }
  };
  
  // Find relevant emoji from interests
  let contextData = emojiMap.default;
  for (const [key, value] of Object.entries(emojiMap)) {
    if (interests.includes(key)) {
      contextData = value;
      break;
    }
  }
  
  // Method-specific prompts
  const methodPrompts = {
    story_based: `
      סיפור קצר (${ageData.maxWords} מילים):
      "${name} ${contextData.action} ${contextData.context}.
      בעיה מתמטית קטנה.
      פתרון עם ${topic}."
    `,
    visual_pattern: `
      דפוס ויזואלי עם ${contextData.emoji}:
      "תראה את התבנית:
      ${contextData.emoji}${contextData.emoji} + ${contextData.emoji} = ?
      זה ${topic}!"
    `,
    logical_rule: `
      חוק פשוט לזכור:
      "כשיש לך ${contextData.context},
      הכלל של ${topic} הוא...
      תמיד עובד!"
    `,
    game_challenge: `
      אתגר משחקי:
      "${name}, משחק מהיר!
      ${contextData.context} + ${topic} = 
      מי מהיר יותר?"
    `
  };
  
  const prompt = `
אתה מסביר ${topic} ל${name} (${gender === 'girl' ? 'ילדה' : 'ילד'}) בגיל ${ageData.age}.
תחביב: ${interests || 'כללי'}
שיטת הסבר: ${currentMethod}

כללי ברזל לגיל ${ageData.age}:
1. מקסימום ${ageData.maxWords} מילים במשפט
2. סגנון: ${ageData.style}
3. השתמש ב: ${contextData.emoji} ${contextData.context}
4. שיטה ${attemptNumber} מתוך 4: ${currentMethod}

${methodPrompts[currentMethod]}

דוגמה ספציפית ל-${currentMethod}:
${currentMethod === 'story_based' ? 
  `"${name} אסף 3 ${contextData.context}, מצא עוד 2. עכשיו יש 5!"` : ''}
${currentMethod === 'visual_pattern' ? 
  `"${contextData.emoji}${contextData.emoji}${contextData.emoji} + ${contextData.emoji}${contextData.emoji} = ${contextData.emoji}${contextData.emoji}${contextData.emoji}${contextData.emoji}${contextData.emoji}"` : ''}
${currentMethod === 'logical_rule' ? 
  `"הטריק: תמיד ספור את ה${contextData.context} על האצבעות!"` : ''}
${currentMethod === 'game_challenge' ? 
  `"10 שניות! כמה ${contextData.context} יש? 3+2=?"` : ''}

כללי פורמט קריטיים:
1. טקסט עברי - רגיל (יישור מימין לשמאל אוטומטי)
2. מספרים - השתמש ב: "3 + 2 = 5" (לא "5 = 2 + 3")
3. תרגילים - תמיד מספרים משמאל לימין: "12 ÷ 3 = 4"
4. אמוג'ים - אחרי הטקסט העברי: "3 כדורים ⚽⚽⚽"

דוגמאות נכונות:
✅ "יש לך 3 תפוחים ועוד 2 תפוחים"
✅ "3 + 2 = 5"
✅ "תראה: 🍎🍎🍎 + 🍎🍎"

דוגמאות לא נכונות:
❌ "יש לך תפוחים 3"
❌ "5 = 2 + 3"
❌ "🍎🍎 + 🍎🍎🍎 :תראה"

החזר JSON קצר:
{
  "content": "ההסבר",
  "visual": "${contextData.emoji} ויזואליזציה",
  "method": "${currentMethod}",
  "isQuestion": ${stage >= 4},
  "hint": "רמז אם צריך",
  "correctAnswer": "תשובה",
  "ageAppropriateTone": true
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
        max_tokens: 300,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    const data = await response.json();
    const text = data.content[0].text;
    const json = JSON.parse(text.replace(/```json\n?|```\n?/g, ''));
    
    // Format Hebrew text direction
    json.content = formatHebrewText(json.content);
    if (json.visual) json.visual = formatHebrewText(json.visual);
    if (json.hint) json.hint = formatHebrewText(json.hint);
    
    return res.status(200).json(json);
    
  } catch (error) {
    // Age-appropriate fallbacks
    const fallbacks = {
      '1-2': {
        story_based: `${name} אסף 3 ${contextData.context}. מצא עוד 2. יש 5!`,
        visual_pattern: `${contextData.emoji}${contextData.emoji}${contextData.emoji} + ${contextData.emoji}${contextData.emoji} = 5`,
        logical_rule: `תמיד ספור על האצבעות!`,
        game_challenge: `מהר! 3+2=?`
      },
      '3-4': {
        story_based: `${name} בנה 3 מגדלים של 4 ${contextData.context}. סה"כ 12!`,
        visual_pattern: `3 שורות × 4 = 12 ${contextData.emoji}`,
        logical_rule: `כפל = חיבור מהיר. 3×4 = 4+4+4`,
        game_challenge: `אתגר 20 שניות: 3×4=?`
      },
      '5-6': {
        story_based: `${name} חילק 12 ${contextData.context} ל-3 חברים. כל אחד קיבל 4`,
        visual_pattern: `12 ÷ 3 = 4 לכל קבוצה`,
        logical_rule: `חילוק = הפוך מכפל. 12÷3 כי 3×4=12`,
        game_challenge: `חידה: אם 3×?=12, מה ה-?`
      }
    };
    
    const fallbackResponse = {
      content: fallbacks[grade][currentMethod],
      visual: contextData.emoji.repeat(3),
      method: currentMethod,
      isQuestion: stage >= 4,
      hint: `חשוב על ${contextData.context}`,
      correctAnswer: '5',
      ageAppropriateTone: true
    };
    
    // Format Hebrew text direction for fallback
    fallbackResponse.content = formatHebrewText(fallbackResponse.content);
    if (fallbackResponse.visual) fallbackResponse.visual = formatHebrewText(fallbackResponse.visual);
    if (fallbackResponse.hint) fallbackResponse.hint = formatHebrewText(fallbackResponse.hint);
    
    return res.status(200).json(fallbackResponse);
  }
}
