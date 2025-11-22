export default async function handler(req, res) {
    // 1. Security & Method Check
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ content: "שגיאת שרת: מפתח חסר.", isQuestion: false });

    const { name, topic, stage, interests, gender } = req.body;
    const role = gender === 'girl' ? 'Exploreress' : 'Explorer';
    const isQuestion = stage >= 4;

    // 2. Smart Context Injection
    const colors = { gold: '#F59E0B', teal: '#0F766E', dark: '#064E3B', light: '#ECFDF5' };
    
    // הגדרת המשימה הפדגוגית המדויקת
    let mission = "";
    if (stage === 1) {
        mission = `THE HOOK: Ignore math mechanics. Create a dramatic mini-story involving "${interests}". The user is the hero. They face an obstacle that ONLY "${topic}" can solve. End with: "We need to learn [Topic] to pass!"`;
    } else if (stage === 2) {
        mission = `THE VISUAL MODEL: Do not use words to explain. Use the SVG to SHOW the concept. If topic is fractions, show a split object. If multiplication, show groups. The text should just caption the visual.`;
    } else if (stage === 3) {
        mission = `THE SECRET: Reveal the algorithm as a "Cheat Code". Use terms like "The Top Number" (Look up) and "The Bottom Number" (Look down). Contrast it with the "hard way" to show why this trick is better.`;
    } else {
        mission = `THE BOSS BATTLE: A gamified question. "To open the ancient door, solve this..." The answer must be a number.`;
    }

    // 3. THE 100/100 SYSTEM PROMPT
    const systemInstruction = `
    ### ROLE
    You are **Captain Click**, a legendary explorer (Indiana Jones style). 
    You speak energetic, native-level Hebrew (slang permitted but polite).
    NEVER sound like a textbook. You are a guide in the jungle.

    ### CONTEXT
    User: ${name} (${role}).
    Interest: ${interests} (This is your METAPHOR source).
    Topic: ${topic}. Stage: ${stage}/5.
    
    ### MISSION
    ${mission}

    ### VISUAL RULES (SVG ENGINE)
    You must generate an SVG string for the 'visual' field.
    - **Style:** Flat design, thick strokes (stroke-width="3"), rounded caps.
    - **Colors:** Use ONLY: ${colors.gold}, ${colors.teal}, ${colors.dark}, #FFFFFF.
    - **ViewBox:** "0 0 200 200".
    - **Content:** Dynamic! If interest is 'Pizza', draw a circle with slices. If 'Soccer', draw a ball or field.
    - **Constraint:** NO TEXT inside the SVG (it breaks in Hebrew). Use icons/shapes only.

    ### PEDAGOGICAL RULES
    1. **Decomposition:** Break complex ideas into 3 simple sentences max.
    2. **No Jargon:** BANNED: מונה, מכנה, מכפלה. ALLOWED: למעלה, למטה, סך הכל.
    3. **Math:** All numbers in LaTeX: $$1+2$$.

    ### OUTPUT FORMAT (JSON ONLY)
    {
        "content": "Hebrew text...",
        "visual": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>...</svg>",
        "isQuestion": ${isQuestion},
        "correctAnswer": "${isQuestion ? '42' : ''}",
        "hint": "A specific hint related to the metaphor",
        "nextButtonText": "Short action text (e.g. 'פתח את השער')"
    }
    `;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5', // Locked on the best model
                max_tokens: 1000,
                temperature: 0.7,
                system: systemInstruction, // System Prompt in correct place
                messages: [{ role: 'user', content: "Execute mission." }]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Anthropic Error: ${err}`);
        }

        const data = await response.json();
        let text = data.content[0].text.replace(/```json|```/g, '').trim();
        
        return res.status(200).json(JSON.parse(text));

    } catch (e) {
        console.error("API Fail:", e);
        // Fallback עם SVG פשוט למקרה חירום
        const fallbackSVG = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="80" fill="#0F766E" opacity="0.2"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="50">🧭</text></svg>`;
        
        return res.status(200).json({
            content: `המצפן נתקע בגלל סופה מגנטית (${e.message}). בוא ננסה לכוון אותו מחדש!`,
            visual: fallbackSVG,
            isQuestion: false,
            correctAnswer: "",
            hint: "",
            nextButtonText: "נסה שוב"
        });
    }
}