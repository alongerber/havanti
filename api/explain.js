export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { grade, topic, attemptNumber = 1, stage = 'explain' } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  // Progressive Learning Stages
  const learningFlow = {
    1: 'micro_concept',    // רעיון של 10 מילים
    2: 'visual_show',      // הדגמה ויזואלית
    3: 'pattern_reveal',   // גילוי החוק
    4: 'practice_easy',    // תרגול קל מאוד
    5: 'practice_medium'   // תרגול רגיל
  };
  
  // 10 Breakthrough Formats
  const formats = [
    'emoji_story',         // סיפור באמוג'ים
    'three_second_rule',   // הסבר ב-3 שניות
    'find_pattern',        // גלה את החוק
    'fix_mistake',         // תקן את הטעות
    'visual_blocks',       // בלוקים ויזואליים
    'secret_trick',        // הטריק הסודי
    'you_teach',          // אתה המורה
    'yes_no_rapid',       // כן/לא מהיר
    'build_yourself',     // בנה בעצמך
    'real_world'          // מהעולם האמיתי
  ];
  
  const currentFormat = formats[attemptNumber % 10];
  const currentStage = learningFlow[Math.min(attemptNumber, 5)];
  
  const prompt = `
אתה מורה גאון שמסביר ${topic} לילד בכיתה ${grade}.

שלב נוכחי: ${currentStage}
פורמט: ${currentFormat}

חוקי ברזל:
1. אם שלב 1-3: רק הסבר, בלי שאלות!
2. מקסימום 20 מילים + ויזואליזציה
3. שפת ילדים ("תכל'ס", "סבבה", "קל")
4. חייב אמוג'ים שמסביר הכל
5. שלב 4-5: שאלה קלה עם רמז מובנה

דוגמאות לפי שלב:

שלב 1 (micro_concept):
"כפל = חיבור מהיר
3×4 = 🍕🍕🍕 ארבע פעמים"

שלב 2 (visual_show):
"3×4 בתמונה:
⭐⭐⭐
⭐⭐⭐  
⭐⭐⭐
⭐⭐⭐
סופרים: 12!"

שלב 3 (pattern_reveal):
"הסוד: 3×4 = 4×3
🎾🎾🎾 × 4
או
🎾🎾🎾🎾 × 3
אותה תוצאה!"

שלב 4 (practice_easy):
"עכשיו אתה:
2×3 = כמה זוגות נעליים? 👟
רמז: 👟👟👟"

שלב 5 (practice_medium):
"אתגר קטן:
5×2 = ?
(חשוב: כמה ידיים לך ולחבר?)"

החזר JSON:
{
  "stage": "${currentStage}",
  "format": "${currentFormat}",
  "content": "ההסבר/שאלה",
  "visual": "ויזואליזציה באמוג'ים",
  "isQuestion": false/true,
  "hint": "רמז אם זו שאלה",
  "correctAnswer": "התשובה אם זו שאלה",
  "nextButtonText": "הבנתי! הלאה" או "בדוק תשובה"
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
    // Smart fallbacks per stage
    const fallbacks = {
      1: {
        stage: "micro_concept",
        format: "emoji_story",
        content: "חיבור = לשים ביחד 👐",
        visual: "🍎 + 🍎 = 🍎🍎",
        isQuestion: false,
        nextButtonText: "הבנתי! תראה לי עוד"
      },
      2: {
        stage: "visual_show",
        format: "visual_blocks",
        content: "ככה זה נראה:",
        visual: "📦 + 📦 = 📦📦",
        isQuestion: false,
        nextButtonText: "מגניב! המשך"
      },
      3: {
        stage: "pattern_reveal",
        format: "secret_trick",
        content: "הטריק: ספור קבוצות!",
        visual: "👥👥👥 = 3 קבוצות",
        isQuestion: false,
        nextButtonText: "וואו! עכשיו הבנתי"
      },
      4: {
        stage: "practice_easy",
        format: "yes_no_rapid",
        content: "1+1 = 2?",
        visual: "🍕 + 🍕 = ?",
        isQuestion: true,
        hint: "כמה פיצות יש?",
        correctAnswer: "2",
        nextButtonText: "בדוק תשובה"
      }
    };
    
    return res.status(200).json(
      fallbacks[Math.min(attemptNumber, 4)] || fallbacks[1]
    );
  }
}
