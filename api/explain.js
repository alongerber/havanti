export default async function handler(req, res) {
    // 1. Basic Validation
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { name, topic, stage, interests, gender } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        console.error("Missing API Key");
        return res.status(500).json({ 
            content: "שגיאת מערכת: מפתח API חסר בהגדרות השרת.", 
            isQuestion: false,
            visual: "⚠️"
        });
    }

    // 2. Context Setup
    const role = gender === 'girl' ? 'Exploreress' : 'Explorer';
    const isQuestion = stage >= 4;

    // Topic Guardrails
    const topicRules = {
        'שברים': { context: 'Dividing a whole into parts (Pizza, Chocolate)', forbid: ['מונה', 'מכנה'] },
        'כפל': { context: 'Repeated addition, groups of items', forbid: ['מכפלה', 'גורמים'] },
        'general': { context: 'Logic and problem solving', forbid: [] }
    };
    
    const getRule = (t) => {
        if (t.includes('שבר')) return topicRules['שברים'];
        if (t.includes('כפל')) return topicRules['כפל'];
        return topicRules['general'];
    };
    const rules = getRule(topic);

    // Stage Instruction (The Pedagogical Brain)
    let instruction = "";
    if (stage === 1) {
        instruction = `STEP 1: THE HOOK (Story). Create a short, thrilling adventure story involving "${interests}". The character faces a specific problem that requires ${topic} to solve. Do NOT explain the math yet. End with a cliffhanger.`;

    } else if (stage === 2) {
        instruction = `STEP 2: VISUALIZE. Explain the concept using a visual mental model based on "${interests}". Use emojis to "draw" the solution pattern. Keep it very simple.`;

    } else if (stage === 3) {
        instruction = `STEP 3: THE SECRET TRICK. Reveal the mathematical rule as a "Cheat Code" or "Map Key". Use simple terms like "Top Number" instead of jargon like "${rules.forbid.join(', ')}".`;

    } else {
        instruction = `STEP 4/5: THE CHALLENGE. Present a fun, gamified question related to the story. The answer must be a simple number or word.`;

    }

    // 3. The High-Quality System Prompt
    const systemPrompt = `
    You are "Captain Click" (קפטן קליק), a world-famous explorer and math mentor.
    User: ${name} (${role}). Topic: ${topic}. Interest: ${interests}.
    
    YOUR MISSION: ${instruction}

    CRITICAL QUALITY GUIDELINES:

    1. **Language:** Hebrew (Native Level). Must be rich, grammatically perfect, and flowing. NO spelling errors (like "בטיח"). NO robotic phrasing.

    2. **Tone:** Enthusiastic, warm, adventurous (Pixar movie style).

    3. **Math:** Wrap ALL numbers and equations in LaTeX format: $$1+1=2$$.

    4. **Context:** Strictly adhere to the context: ${rules.context}.

    5. **Format:** Return ONLY valid JSON.

    JSON OUTPUT STRUCTURE:

    {
        "content": "The Hebrew text...",
        "visual": "Creative emoji art (e.g. 🍕+🍕=😋)",
        "isQuestion": ${isQuestion},
        "correctAnswer": "${isQuestion ? 'Answer' : ''}",
        "hint": "${isQuestion ? 'Hint' : ''}",
        "nextButtonText": "Text for the button"
    }
    `;

    try {
        console.log("Calling Claude 3.5 Sonnet (Stable)...");
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20240620', // Locked on the best stable model
                max_tokens: 850,
                temperature: 0.7,
                messages: [{ role: 'user', content: systemPrompt }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Anthropic API Error:", errText);
            throw new Error(`API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        
        // Robust JSON Parsing
        let text = data.content[0].text.trim();
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            text = text.substring(jsonStart, jsonEnd + 1);
        }
        
        return res.status(200).json(JSON.parse(text));

    } catch (e) {
        console.error("Critical Failure:", e);
        // Specific error message for the user
        return res.status(200).json({
            content: `קפטן, יש הפרעה בתקשורת (${e.message}). בוא ננסה שוב!`,
            visual: "📡",
            isQuestion: false,
            correctAnswer: "",
            hint: "",
            nextButtonText: "נסה שוב"
        });
    }
}
