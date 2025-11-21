export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { name, topic, stage, interests, gender } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ 
            content: "שגיאת שרת: מפתח API חסר.", 
            isQuestion: false 
        });
    }

    const role = gender === 'girl' ? 'Exploreress' : 'Explorer';
    const isQuestion = stage >= 4;

    // Topic Logic
    const topicRules = {
        'שברים': { must: ['חלק', 'שלם'], forbid: ['מונה', 'מכנה'], emojis: ['🍕', '🍫'] },
        'כפל': { must: ['פעמים', 'קבוצות'], forbid: ['מכפלה'], emojis: ['📦', '⭐'] },
        'general': { must: [], forbid: [], emojis: ['✨', '🚀'] }
    };
    const getRule = (t) => Object.values(topicRules).find(r => t.includes(Object.keys(topicRules).find(k => t.includes(k)))) || topicRules['general'];
    const rules = getRule(topic);

    // Instruction Construction
    let instruction = "";
    if (stage === 1) instruction = `STEP 1: STORY. Create a short adventure connecting "${interests}" to the PROBLEM of "${topic}". Do NOT explain math yet.`;
    else if (stage === 2) instruction = `STEP 2: VISUALS. Describe a mental image using these emojis: ${rules.emojis.join(' ')}.`;
    else if (stage === 3) instruction = `STEP 3: SECRET TRICK. Reveal the rule simply. Use "Top/Bottom" instead of jargon.`;
    else instruction = `STEP 4/5: CHALLENGE. Ask a specific question related to "${interests}". Require a short answer.`;

    const systemPrompt = `
    ROLE: Captain Click (Math Explorer). 
    CONTEXT: User ${name} (${role}). Interests: ${interests}. Topic: ${topic}. Stage: ${stage}/5.
    GOAL: ${instruction}
    
    QUALITY RULES:

    1. Model: Use Claude Sonnet 4.5 capabilities for high-quality Hebrew.

    2. Tone: Energetic, fun, Indiana Jones style.

    3. Math: Use LaTeX $$1+1=2$$.

    4. Output: Valid JSON only.

    JSON SCHEMA:

    {
        "content": "Hebrew text...",
        "visual": "Emoji art",
        "isQuestion": ${isQuestion},
        "correctAnswer": "${isQuestion ? 'Answer' : ''}",
        "hint": "${isQuestion ? 'Hint' : ''}",
        "nextButtonText": "Text"
    }
    `;

    try {
        console.log("Calling Claude Sonnet 4.5...");
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5', // UPDATED: The new standard
                max_tokens: 1000,
                messages: [{ role: 'user', content: systemPrompt }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Anthropic API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        let text = data.content[0].text.replace(/```json|```/g, '').trim();
        
        return res.status(200).json(JSON.parse(text));

    } catch (e) {
        console.error("API Fail:", e);
        return res.status(200).json({
            content: `הקשר נותק (${e.message}). נסה שוב.`,
            visual: "📡",
            isQuestion: false,
            correctAnswer: "",
            hint: "",
            nextButtonText: "נסה שוב"
        });
    }
}
