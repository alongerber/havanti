export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { name, topic, stage, interests, gender } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) return res.status(500).json({ content: "System Error: Missing API Key", isQuestion: false });

    const role = gender === 'girl' ? 'Exploreress' : 'Explorer';
    const isQuestion = stage >= 4;

    // --- GOLDEN KNOWLEDGE BASE (The user's definitions) ---
    const conceptBank = `
    1. חיבור: לצרף דברים יחד! כמו שסבא נותן עוד תפוח.
    2. חיסור: להוריד ולהישאר עם פחות. כמו בלונים שעפים.
    3. חיסור בטור: כמו בניין קומות. מחסרים קומה-קומה (אחדות, עשרות).
    4. כפל: חיבור מהיר! במקום 2+2+2 עושים 3 פעמים 2.
    5. חילוק: לחלק חברים שווה בשווה! כמו סוכריות לחברים.
    6. מונה (שבר): המספר למעלה. כמה יש לי ביד.
    7. מכנה (שבר): המספר למטה. כמה חלקים יש בעוגה כולה.
    8. שוויון (=): מאזניים מאוזנים. צד ימין שווה בדיוק לצד שמאל.
    9. גדול/קטן (< >): התנין הרעב! הפה תמיד פתוח למספר הגדול יותר.
    10. זוגי: אפשר לחלק ל-2 זוגות בדיוק.
    11. אי-זוגי: תמיד נשאר אחד בודד ועצוב בלי זוג.
    12. אחוזים: חלק מתוך 100 חתיכות של עוגה.
    13. עיגול: לרוץ למספר העגול הקרוב ביותר (10, 20, 100).
    `;

    // --- STAGE INSTRUCTIONS (The Gradual Flow) ---
    let instruction = "";
    if (stage === 1) {
        instruction = `STAGE 1: THE HOOK. 
        - Goal: Connect "${interests}" to "${topic}".
        - Content: Tell a 2-sentence story about a problem the character has.
        - Restriction: DO NOT explain the math yet. Just set the scene.
        - Style: Energetic, dramatic.`;
    } else if (stage === 2) {
        instruction = `STAGE 2: THE CONCEPT.
        - Goal: Explain WHAT ${topic} is using the "Golden Knowledge Base".
        - Content: Use the exact metaphor from the provided list (e.g. if Division, talk about candies/friends).
        - Style: Simple, clear, "Did you know?".`;
    } else if (stage === 3) {
        instruction = `STAGE 3: THE VISUAL MODEL.
        - Goal: Show it visually.
        - Action: Generate a simple SVG that represents the concept (e.g. split pizza, groups of items).
        - Text: A short caption pointing to the visual.`;
    } else if (stage === 4) {
        instruction = `STAGE 4: WARM UP.
        - Goal: A very easy question to build confidence.
        - Context: Use the story from Stage 1.
        - Input: Require a simple number answer.`;
    } else {
        instruction = `STAGE 5: BOSS BATTLE.
        - Goal: A slightly harder question.
        - Context: "To finish the mission, solve this!"`;
    }

    const systemPrompt = `
    ROLE: Captain Click (Indiana Jones style Math Explorer).
    CONTEXT: User ${name} (${role}). Interests: ${interests}. Topic: ${topic}. Stage: ${stage}/5.
    
    REFERENCE MATERIAL (USE THIS):
    ${conceptBank}

    CURRENT MISSION: ${instruction}

    CRITICAL RULES:

    1. **Brevity:** Max 40 words per response. Break into bullet points with emojis.

    2. **Tone:** "TikTok style" - fast, fun, punchy. No "Teacher voice".

    3. **Visuals (SVG):** For the 'visual' field, create a SIMPLE, FLAT SVG (viewBox 0 0 200 200).
       - Use colors: #F59E0B (Gold), #0F766E (Teal).
       - NO TEXT inside SVG. Use shapes only.
       - Example for Fractions: A circle with a slice removed.
       - Example for Addition: Two groups of circles.

    4. **Math:** Use LaTeX: $$1+1=2$$.

    JSON OUTPUT ONLY:

    {
        "content": "Hebrew text...",
        "visual": "<svg>...</svg>",
        "isQuestion": ${isQuestion},
        "correctAnswer": "${isQuestion ? 'Answer' : ''}",
        "hint": "Short hint",
        "nextButtonText": "Button text"
    }
    `;

    try {
        console.log(`Calling Claude Sonnet 4.5 for ${topic} Stage ${stage}...`);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5', // The new standard
                max_tokens: 600,
                temperature: 0.7,
                system: systemPrompt,
                messages: [{ role: 'user', content: "Go!" }]
            })
        });

        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();
        let text = data.content[0].text.replace(/```json|```/g, '').trim();
        return res.status(200).json(JSON.parse(text));

    } catch (e) {
        console.error("API Fail:", e);
        return res.status(200).json({
            content: "הקשר נותק! 📡 בוא ננסה שוב.",
            visual: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><text y="50" x="50" font-size="50" text-anchor="middle">🔄</text></svg>`,
            isQuestion: false,
            correctAnswer: "",
            hint: "",
            nextButtonText: "נסה שוב"
        });
    }
}
