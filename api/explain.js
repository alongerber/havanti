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
  
  // VALIDATION LAYER 1: Topic-specific requirements
  const topicRules = {
    'שברים פשוטים': {
      mustInclude: ['חצי', 'רבע', 'שליש', 'חלק', 'שלם'],
      forbidden: ['כפל', 'חילוק', 'לוח הכפל', 'מגדלים'],
      validEmojis: ['🍕', '🍰', '🍫', '🥧', '🍪'],
      maxNumber: 12
    },
    'לוח הכפל': {
      mustInclude: ['כפל', 'פעמים', 'כפול'],
      forbidden: ['חצי', 'רבע', 'שברים', 'חלקים'],
      validEmojis: ['⭐', '🎯', '📦', '🎈'],
      maxNumber: 144
    },
    'חיבור': {
      mustInclude: ['ועוד', 'ביחד', 'סך הכל', 'יחד'],
      forbidden: ['כפל', 'חילוק', 'שברים'],
      validEmojis: ['🍎', '🍭', '🎈', '⚽'],
      maxNumber: 100
    },
    'חיסור': {
      mustInclude: ['פחות', 'נשאר', 'הורדנו', 'נשארו'],
      forbidden: ['כפל', 'חילוק', 'שברים'],
      validEmojis: ['🍪', '🎈', '🚗', '✏️'],
      maxNumber: 100
    }
  };
  
  // Get rules for current topic
  const rules = topicRules[topic] || {
    mustInclude: [],
    forbidden: [],
    validEmojis: ['📚'],
    maxNumber: 100
  };
  
  // VALIDATION LAYER 2: Safe fallback for each topic
  const safeFallbacks = {
    'שברים פשוטים': {
      1: 'פיצה שלמה 🍕 = 1. חצי פיצה = 1/2',
      2: 'עוגה 🍰 חתוכה ל-4 חלקים. חלק אחד = 1/4',
      3: '1/2 + 1/2 = שלם אחד! 🍕+🍕=🍕🍕'
    },
    'לוח הכפל': {
      1: '3 × 4 = 3 קבוצות של 4 ⭐⭐⭐⭐',
      2: '3 × 4 = 4 + 4 + 4 = 12',
      3: '3 שורות × 4 עמודות = 12 ריבועים 📦'
    },
    'חיבור עד 10': {
      1: '3 🍎 ועוד 2 🍎 = 5 תפוחים',
      2: '3 + 2 = 5 (ספור על האצבעות!)',
      3: 'יש לך 3, קיבלת עוד 2, סך הכל 5'
    }
  };
  
  // Build the prompt with strict rules
  const prompt = `
אתה מסביר ${topic} ל${name} (${gender === 'girl' ? 'ילדה' : 'ילד'}) בכיתה ${grade}.

חוקי ברזל - חובה לעמוד בכולם:
1. הנושא הוא ${topic} - אסור להזכיר נושאים אחרים!
2. חובה להשתמש במילים: ${rules.mustInclude.join(', ')}
3. אסור להשתמש במילים: ${rules.forbidden.join(', ')}
4. אמוג'ים מותרים בלבד: ${rules.validEmojis.join(' ')}
5. מספרים מקסימום עד ${rules.maxNumber}

אם התבקשת להסביר ${topic} - תסביר רק ${topic}!
אם יש ספק - השתמש בדוגמת הפיצה לשברים או כוכבים לכפל.

שלב ${stage} מתוך 5:
${stage === 1 ? 'הסבר בסיסי של הרעיון' : ''}
${stage === 2 ? 'הדגמה ויזואלית' : ''}
${stage === 3 ? 'הטריק או הסוד' : ''}
${stage === 4 ? 'תרגול קל מאוד' : ''}
${stage === 5 ? 'תרגול רגיל' : ''}

החזר JSON בלבד:
{
  "content": "ההסבר - חייב להיות על ${topic} בלבד",
  "visual": "אמוג'ים מהרשימה המותרת",
  "topicMatch": true,
  "isQuestion": ${stage >= 4},
  "hint": "רמז אם זו שאלה",
  "correctAnswer": "תשובה"
}`;

  
  try {
    if (!apiKey) throw new Error('No API key');
    
    // Call Claude Sonnet 4.5
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022', // SONNET 4.5!
        max_tokens: 300,
        temperature: 0.6, // Lower temperature for more consistency
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    const data = await response.json();
    const text = data.content[0].text;
    let json = JSON.parse(text.replace(/```json\n?|```\n?/g, ''));
    
    // VALIDATION LAYER 3: Check the response
    const validateContent = (content) => {
      // Check if topic is mentioned
      const topicWords = topic.split(' ');
      const hasTopicWord = topicWords.some(word => content.includes(word));
      
      // Check for forbidden words
      const hasForbidden = rules.forbidden.some(word => content.includes(word));
      
      // Check numbers are reasonable
      const numbers = content.match(/\d+/g);
      const hasLargeNumber = numbers && numbers.some(n => parseInt(n) > rules.maxNumber);
      
      return hasTopicWord && !hasForbidden && !hasLargeNumber;
    };
    
    // VALIDATION LAYER 4: Use fallback if validation fails
    if (!validateContent(json.content)) {
      console.log('Content validation failed, using fallback');
      
      const fallbackKey = Object.keys(safeFallbacks[topic] || {})[stage - 1] || 1;
      const fallbackContent = safeFallbacks[topic]?.[fallbackKey] || 
                              `${name}, בוא נלמד ${topic} צעד אחר צעד`;
      
      json = {
        content: fallbackContent,
        visual: rules.validEmojis[0].repeat(3),
        topicMatch: true,
        isQuestion: stage >= 4,
        hint: stage >= 4 ? 'חשוב לאט' : null,
        correctAnswer: stage >= 4 ? '4' : null
      };
    }
    
    // Format Hebrew text direction
    json.content = formatHebrewText(json.content);
    if (json.visual) json.visual = formatHebrewText(json.visual);
    if (json.hint) json.hint = formatHebrewText(json.hint);
    
    return res.status(200).json(json);
    
  } catch (error) {
    console.error('API Error:', error);
    
    // Return safe fallback on any error
    const fallbackContent = safeFallbacks[topic]?.[1] || 
                           `${name}, ${topic} זה קל! בוא נתחיל`;
    
    const errorResponse = {
      content: fallbackContent,
      visual: '📚',
      topicMatch: true,
      isQuestion: stage >= 4,
      hint: 'חשוב טוב',
      correctAnswer: '4'
    };
    
    // Format Hebrew text direction for error fallback
    errorResponse.content = formatHebrewText(errorResponse.content);
    if (errorResponse.visual) errorResponse.visual = formatHebrewText(errorResponse.visual);
    if (errorResponse.hint) errorResponse.hint = formatHebrewText(errorResponse.hint);
    
    return res.status(200).json(errorResponse);
  }
}
