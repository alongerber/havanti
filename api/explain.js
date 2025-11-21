export const config = {

    runtime: 'edge',

};
// --- 1. חוקי תוכן וולידציה (Guardrails) ---

const topicRules = {

    'שברים': {

        keywords: ['שברים', 'חלק', 'שלם'],

        mustInclude: ['חלק', 'שלם', 'למחוק', 'לחלק'],

        forbidden: ['מונה', 'מכנה', 'כפל', 'עשרוני'], // מילים "מפחידות" אסורות בשלבים ראשונים

        validEmojis: ['🍕', '🍫', '🍰', '🥧'],

        fallback: "דמיין פיצה עגולה וטעימה שמחלקים לחברים."

    },

    'כפל': {

        keywords: ['כפל', 'פעמים', 'לוח הכפל'],

        mustInclude: ['קבוצות', 'פעמים', 'לחבר שוב ושוב'],

        forbidden: ['מכפלה', 'חילוק', 'גורם'],

        validEmojis: ['📦', '🍎', '⭐', '🎁'],

        fallback: "כפל זה כמו קסם שמשכפל חפצים!"

    },

    'חיבור': {

        keywords: ['חיבור', 'ועוד'],

        mustInclude: ['ביחד', 'סך הכל', 'להוסיף'],

        forbidden: ['כפל', 'חיסור', 'פחות'],

        validEmojis: ['🎈', '⚽', '🍬'],

        fallback: "נחבר הכל יחד לערימה אחת גדולה."

    },

    // ברירת מחדל לנושאים כלליים

    'general': {

        mustInclude: [],

        forbidden: [],

        validEmojis: ['✨', '🚀', '💡'],

        fallback: "בוא נגלה את הסוד של המספרים."

    }

};

function getTopicRule(topic) {

    for (const key in topicRules) {

        if (topic.includes(key) || topicRules[key].keywords?.some(k => topic.includes(k))) {

            return topicRules[key];

        }

    }

    return topicRules['general'];

}

export default async function handler(req) {

    if (req.method !== 'POST') {

        return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405 });

    }

    try {

        const body = await req.json();

        const { name, topic, stage, interests, gender } = body;

        const apiKey = process.env.ANTHROPIC_API_KEY;

        const role = gender === 'girl' ? 'Exploreress' : 'Explorer';

        const rules = getTopicRule(topic);

        const isQuestion = stage >= 4;

        // --- 2. בניית פרומפט ממוקד לשלב הנוכחי בלבד ---

        let stageInstruction = "";

        let exampleOutput = "";

        switch (stage) {

            case 1: // The Story (Why)

                stageInstruction = `GOAL: Connect "${topic}" to the user's interest: "${interests}".

                Create a short adventure story (2-3 sentences). Do NOT explain the math yet. Focus on the PROBLEM that needs solving.

                MUST USE words: ${rules.mustInclude.join(', ')}.

                FORBIDDEN words: ${rules.forbidden.join(', ')}.`;

                

                exampleOutput = `Example for "Fractions" + "Pizza": "קפטן! יש לנו פיצה אחת ענקית ו-4 חברים רעבים. איך נחלק אותה שווה בשווה בלי שמישהו יישאר רעב? זו תעלומה!"`;

                break;

            case 2: // Visual Mental Model

                stageInstruction = `GOAL: Create a visual mental model for "${topic}".

                Describe a pattern using emojis or simple objects.

                Visual Field: Use ONLY these emojis: ${rules.validEmojis.join(' ')}.`;

                

                exampleOutput = `Example for "Multiplication": Content: "תאר לעצמך 3 קופסאות, ובכל אחת 2 תפוחים." Visual: "📦🍎🍎 + 📦🍎🍎 + 📦🍎🍎"`;

                break;

            case 3: // The Secret Rule

                stageInstruction = `GOAL: Reveal the "Secret Trick" (The Algorithm).

                Teach the rule simply. Use "Top/Bottom" instead of technical jargon.

                Frame it as a cheat code for the adventure.`;

                

                exampleOutput = `Example: "הסוד הוא פשוט: המספר למטה אומר לכמה חתיכות חתכנו, והמספר למעלה אומר כמה אכלנו!"`;

                break;

            case 4: // Practice

            case 5: // Boss Battle

                stageInstruction = `GOAL: Ask a specific gamified question.

                Context: "${interests}".

                The question MUST require a specific short answer (number or word).`;

                

                exampleOutput = `Example: "כדי לפתוח את השער למבצר, עליך לפתור: כמה זה $$2 \\times 5$$?"`;

                break;

        }

        const systemPrompt = `

        ROLE: You are "Captain Click", an Indiana Jones-style math explorer.

        USER: ${name} (${role}). INTERESTS: ${interests}. TOPIC: ${topic}.

        

        ${stageInstruction}

        

        ${exampleOutput}

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

        const response = await fetch('https://api.anthropic.com/v1/messages', {

            method: 'POST',

            headers: {

                'Content-Type': 'application/json',

                'x-api-key': apiKey,

                'anthropic-version': '2023-06-01'

            },

            body: JSON.stringify({

                model: 'claude-3-5-sonnet-20241022',

                max_tokens: 450,

                messages: [{ role: 'user', content: systemPrompt }]

            })

        });

        const data = await response.json();

        let text = data.content[0].text.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedData = JSON.parse(text);

        // --- 3. Validation Layer (הגנה מפני הזיות) ---

        // אם זה שלב הסבר (1-3), ודא שיש קשר לנושא

        if (!isQuestion) {

            // בדיקה בסיסית: האם יש מילים אסורות?

            const hasForbidden = rules.forbidden.some(word => parsedData.content.includes(word));

            

            if (hasForbidden) {

                console.warn("Validation Failed: AI used forbidden jargon.");

                // אפשר כאן להחליף ל-Fallback או לתקן, כרגע נשאיר ורק נתריע ללוג

                // במערכת מחמירה יותר - נחזיר כאן תשובה מוכנה מראש

            }

        }

        return new Response(JSON.stringify(parsedData), {

            status: 200, 

            headers: { 'Content-Type': 'application/json' }

        });

    } catch (error) {

        console.error('API Logic Error:', error);

        

        // Fallback חירום

        return new Response(JSON.stringify({

            content: "המפה נקרעה בטעות! אבל אל דאגה, קפטן קליק תמיד מוצא דרך. בוא ננסה שוב.",

            visual: "🗺️❌",

            isQuestion: false,

            correctAnswer: "",

            hint: "",

            nextButtonText: "נסה שוב"

        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    }

}
