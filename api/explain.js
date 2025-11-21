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

    // 2. Pedagogical Setup (Captain Click)
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

    // Stage Instruction
    let instruction = "";
    if (stage === 1) instruction = `Story Mode: Explain the PROBLEM "${topic}" solves using "${interests}". Do NOT explain the math yet.`;
    else if (stage === 2) instruction = `Visual Mode: Describe a mental image using these emojis: ${rules.emojis.join(' ')}.`;
    else if (stage === 3) instruction = `Secret Trick: Reveal the rule simply. Use "Top/Bottom" instead of jargon.`;
    else instruction = `Challenge Mode: Ask a specific question related to "${interests}". Require a short numerical answer.`;

    const systemPrompt = `
    ROLE: Captain Click (Indiana Jones style Math Explorer).
    CONTEXT: User ${name} (${role}). Interests: ${interests}. Topic: ${topic}. Stage: ${stage}/5.
    GOAL: ${instruction}
    CONSTRAINTS: Hebrew language. Fun, energetic tone. LaTeX for numbers ($$1+1$$).
    OUTPUT: Valid JSON only.
    JSON SCHEMA: { "content": "string", "visual": "string", "isQuestion": ${isQuestion}, "correctAnswer": "string", "hint": "string", "nextButtonText": "string" }
    `;

    // 3. The "Bulletproof" Model Chain
    // It will try these in order. Since you have credits, the first one should work.
    const models = [
        'claude-3-5-sonnet-20241022', // Newest & Best
        'claude-3-5-sonnet-20240620', // Stable
        'claude-3-sonnet-20240229',   // Legacy
        'claude-3-haiku-20240307'     // Fast Backup
    ];

    for (const model of models) {
        try {
            console.log(`Attempting model: ${model}...`);
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 600,
                    messages: [{ role: 'user', content: systemPrompt }]
                })
            });

            if (!response.ok) {
                console.warn(`Model ${model} failed: ${response.status}`);
                continue; // Try next model immediately
            }

            const data = await response.json();
            const text = data.content[0].text.replace(/```json|```/g, '').trim();
            
            return res.status(200).json(JSON.parse(text));

        } catch (e) {
            console.error(`Error with ${model}:`, e);
        }
    }

    // 4. Ultimate Fallback (Only if EVERYTHING fails)
    return res.status(200).json({
        content: "המצפן שלי לא מוצא קליטה כרגע. בוא ננסה שוב!",
        visual: "🧭❓",
        isQuestion: false,
        correctAnswer: "",
        hint: "",
        nextButtonText: "נסה שוב"
    });
}
