export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const body = req.body;
    const { name = 'קצין', topic = '', stage = 1, interests = 'משחקים', gender = 'boy', grade = '1-2' } = body;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    // Strict isQuestion logic: Stages 1-3 = explanations, Stages 4-5 = questions
    const isQuestion = stage >= 4;
    
    // Keyword matching for topics
    const topicRules = {
        'שברים': {
            mustInclude: ['חלק', 'שלם', 'לחלק'],
            forbidden: ['כפל', 'חילוק'],
            validEmojis: ['🍕', '🍰', '🍫'],
            maxNumber: 15
        },
        'כפל': {
            mustInclude: ['פעמים', 'להכפיל', 'קבוצות'],
            forbidden: ['חצי', 'רבע', 'שברים'],
            validEmojis: ['⭐', '🎯', '📦'],
            maxNumber: 144
        },
        'חיבור': {
            mustInclude: ['ועוד', 'ביחד', 'סך הכל'],
            forbidden: ['כפל', 'חילוק'],
            validEmojis: ['🍎', '🍭', '🎈'],
            maxNumber: 100
        },
        'חיסור': {
            mustInclude: ['פחות', 'נשאר', 'הורדנו'],
            forbidden: ['כפל', 'חילוק'],
            validEmojis: ['🍪', '🎈', '🚗'],
            maxNumber: 100
        }
    };
    
    // Find matching rule by keyword
    const baseRule = Object.keys(topicRules).find(keyword => topic.includes(keyword));
    const rules = baseRule ? topicRules[baseRule] : { 
        mustInclude: [], 
        forbidden: [], 
        validEmojis: ['📚'], 
        maxNumber: 100 
    };
    
    const prompt = `
    You are "Captain Click" 🚀, a space math adventurer teaching a kid named ${name} (${gender === 'girl' ? 'girl' : 'boy'}) in grade ${grade}.
    
    Current Topic: ${topic}.
    Stage: ${stage}/5.
    Kid's Interests: ${interests} (MUST integrate these into the explanation!).
    
    Tone: Energetic, fun, encouraging, dramatic, use emojis. Speak in Hebrew (עברית).
    
    TASK:
    ${!isQuestion ? 
        `Explain the concept simply. Use a metaphor or story related to the interests (${interests}). Do NOT ask a question to solve yet. This is an explanation stage.` : 
        `Ask a specific practice question based on what was learned. The question must be solvable and have a clear answer.`}
    
    IMPORTANT RULES:
    1. Use LaTeX for ALL math expressions (e.g., $$1 + 2 = 3$$ or $\\frac{1}{2}$).
    2. If Stage is 4 or 5, you MUST provide a specific "correctAnswer" (simple number or short word, NO complex expressions).
    3. Output STRICTLY valid JSON only, no markdown code blocks.
    4. Must include words: ${rules.mustInclude.join(', ')}
    5. Must NOT include words: ${rules.forbidden.join(', ')}
    6. Use emojis from: ${rules.validEmojis.join(' ')}
    7. Numbers must not exceed ${rules.maxNumber}
    
    Output Schema (STRICT JSON, no markdown):
    {
        "content": "The explanation or question text in Hebrew with LaTeX math",
        "isQuestion": ${isQuestion},
        "correctAnswer": "${isQuestion ? 'SIMPLE_NUMBER_OR_WORD' : ''}",
        "hint": "${isQuestion ? 'A helpful hint in Hebrew' : ''}",
        "nextButtonText": "${!isQuestion ? 'הבנתי, המשך!' : 'בדוק תשובה'}"
    }
    `;
    
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
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 400,
                temperature: 0.7,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        
        const data = await response.json();
        let text = data.content?.[0]?.text || '{}';
        
        // Clean markdown code blocks
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Parse JSON
        let json;
        try {
            json = JSON.parse(text);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            // Fallback if parsing fails
            json = {
                content: isQuestion ? 
                    `קפטן קליק שואל: כמה זה $$2 + 2$$?` : 
                    `קפטן קליק מסביר: ${topic} זה קל! בוא נבין יחד.`,
                isQuestion: isQuestion,
                correctAnswer: isQuestion ? '4' : '',
                hint: isQuestion ? 'חשבו על האצבעות' : '',
                nextButtonText: !isQuestion ? 'הבנתי, המשך!' : 'בדוק תשובה'
            };
        }
        
        // Ensure strict format compliance
        const result = {
            content: json.content || (isQuestion ? `שאלה על ${topic}` : `הסבר על ${topic}`),
            isQuestion: isQuestion,
            correctAnswer: isQuestion ? (json.correctAnswer || '4') : '',
            hint: isQuestion ? (json.hint || 'נסה לחשוב') : '',
            nextButtonText: json.nextButtonText || (!isQuestion ? 'הבנתי, המשך!' : 'בדוק תשובה')
        };
        
        return res.status(200).json(result);
        
    } catch (error) {
        console.error('API Error:', error);
        
        // Fallback JSON if AI fails
        return res.status(200).json({
            content: isQuestion ? 
                `קפטן קליק שואל: כמה זה $$2 + 2$$?` : 
                `קפטן קליק נתקל במטאור! בוא ננסה שוב. ${topic} זה קל!`,
            isQuestion: isQuestion,
            correctAnswer: isQuestion ? '4' : '',
            hint: isQuestion ? 'חשבו על האצבעות' : '',
            nextButtonText: !isQuestion ? 'נסה שוב' : 'בדוק תשובה'
        });
    }
}
