export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { name, topic, stage, interests, gender } = req.body;
        const apiKey = process.env.ANTHROPIC_API_KEY;

        // --- 1. Content Guardrails (Validation) ---
        const topicRules = {
            'שברים': {
                keywords: ['שברים', 'חלק', 'שלם'],
                mustInclude: ['חלק', 'שלם', 'למחוק', 'לחלק'],
                forbidden: ['מונה', 'מכנה', 'כפל', 'עשרוני'],
                validEmojis: ['🍕', '🍫', '🍰', '🥧'],
            },
            'כפל': {
                keywords: ['כפל', 'פעמים', 'לוח הכפל'],
                mustInclude: ['קבוצות', 'פעמים', 'לחבר שוב ושוב'],
                forbidden: ['מכפלה', 'חילוק', 'גורם'],
                validEmojis: ['📦', '🍎', '⭐', '🎁'],
            },
            'general': { mustInclude: [], forbidden: [], validEmojis: ['✨', '🚀', '💡'] }
        };

        function getTopicRule(t) {
            for (const key in topicRules) {
                if (t && (t.includes(key) || topicRules[key].keywords?.some(k => t.includes(k)))) {
                    return topicRules[key];
                }
            }
            return topicRules['general'];
        }

        const role = gender === 'girl' ? 'Exploreress' : 'Explorer';
        const rules = getTopicRule(topic);
        const isQuestion = stage >= 4;

        // --- 2. Super Prompt Construction (Pedagogy) ---
        let stageInstruction = "";
        let exampleOutput = "";

        switch (stage) {
            case 1: // The Story
                stageInstruction = `GOAL: Connect "${topic}" to the user's interest: "${interests}". Create a short adventure story. Do NOT explain the math yet. Focus on the PROBLEM. MUST USE words: ${rules.mustInclude.join(', ')}. FORBIDDEN words: ${rules.forbidden.join(', ')}.`;
                exampleOutput = `Example: "קפטן! יש לנו פיצה אחת ענקית ו-4 חברים רעבים. איך נחלק אותה?"`;
                break;

            case 2: // Visual Model
                stageInstruction = `GOAL: Create a visual mental model. Describe a pattern using emojis ONLY from this list: ${rules.validEmojis.join(' ')}.`;
                exampleOutput = `Example: "תאר לעצמך 3 קופסאות: 📦🍎 + 📦🍎 + 📦🍎"`;
                break;

            case 3: // Secret Rule
                stageInstruction = `GOAL: Reveal the "Secret Trick". Teach the rule simply using "Top/Bottom" instead of jargon. Frame it as a cheat code.`;
                exampleOutput = `Example: "הסוד הוא פשוט: המספר למטה אומר כמה חתכנו!"`;
                break;

            case 4: // Practice
            case 5: // Challenge
                stageInstruction = `GOAL: Ask a specific gamified question related to "${interests}". The question MUST require a specific short answer.`;
                exampleOutput = `Example: "כדי לפתוח את השער, כמה זה $$2 \\times 5$$?"`;
                break;
        }

        const systemPrompt = `
        ROLE: You are "Captain Click", an Indiana Jones-style math explorer.
        USER: ${name} (${role}). INTERESTS: ${interests}. TOPIC: ${topic}.
        
        INSTRUCTION: ${stageInstruction}
        EXAMPLE: ${exampleOutput}

        STRICT RULES:
        1. Language: Hebrew (Natural, energetic, for kids).
        2. Math Format: ALWAYS use LaTeX for numbers (e.g., $$1+1=2$$).
        3. Output: VALID JSON ONLY. No extra text.

        JSON STRUCTURE:
        {
            "content": "Main text here...",
            "visual": "Emoji pattern or short visual text",
            "isQuestion": ${isQuestion},
            "correctAnswer": "${isQuestion ? 'Answer Here' : ''}",
            "hint": "${isQuestion ? 'Hint Here' : ''}",
            "nextButtonText": "${stage < 4 ? 'המשך בהרפתקה' : ''}"
        }
        `;

        if (!apiKey) throw new Error('Missing API Key');

        // --- 3. API Call (CORRECTED MODEL NAME) ---
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20240620', // FIXED: Stable version
                max_tokens: 450,
                messages: [{ role: 'user', content: systemPrompt }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error('Anthropic API Error:', data.error);
            throw new Error(data.error.message);
        }

        // --- 4. Response Parsing ---
        let text = data.content[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(text);

        res.status(200).json(parsedData);

    } catch (error) {
        console.error('API Logic Error:', error);
        
        // Fallback to prevent crashing
        const topic = req.body.topic || '';
        let fallbackMsg = "המצפן איבד את הצפון! בוא ננסה שוב.";
        
        if (topic.includes('שבר')) fallbackMsg = "פיצה שנחתכת לחלקים שווים. זה הרעיון בשברים!";
        
        res.status(200).json({
            content: `שגיאה: ${error.message || 'Unknown error'} (נסה לרענן)`,
            visual: "🧭❓",
            isQuestion: false,
            correctAnswer: "",
            hint: "",
            nextButtonText: "נסה שוב"
        });
    }
}
