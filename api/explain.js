// Personal Information

// This file is the Vercel/Next.js API route handler for /api/explain

// It takes user data, builds a highly customized prompt for Claude 3.5 Sonnet,

// and enforces strict pedagogical rules to ensure AAA-level content.



// Rate limiting map (optional, left from original code)

const rateLimit = new Map();



// Hebrew text direction formatting

function formatHebrewText(text) {

  // Ensure numbers stay LTR within RTL text

  return text

    .replace(/(\d+)/g, '\u202D$1\u202C')  // LTR mark for numbers

    .replace(/([a-zA-Z]+)/g, '\u202D$1\u202C'); // LTR mark for English

}



// --- Topic Rule Set (תיקון קריטי: 1.1 - Keyword Matching) ---

// שימוש במערך לבדיקת הכלה של מילות מפתח במקום התאמה מדויקת.

const topicRuleSet = [

    { 

        keyword: 'שברים', // Matches: 'שברים פשוטים', 'שברים - חיבור', 'שברים - חיסור'

        mustInclude: ['חלק', 'שלם', 'לחלק', 'כמה נשאר'],

        forbidden: ['כפל', 'חילוק', 'נעלם'],

        validEmojis: ['🍕', '🍰', '🍫', '🥧', '🍪'],

        maxNumber: 15 

    },

    { 

        keyword: 'כפל', // Matches: 'לוח הכפל', 'כפל חד-ספרתי', 'כפל דו-ספרתי'

        mustInclude: ['פעמים', 'להכפיל', 'קבוצות', 'שורות', 'עמודות'],

        forbidden: ['חצי', 'רבע', 'שברים', 'נשאר'],

        validEmojis: ['⭐', '🎯', '📦', '🎈'],

        maxNumber: 144

    },

    {

        keyword: 'חיבור', // Matches: 'חיבור עד 10', 'חיבור עד 100'

        mustInclude: ['ועוד', 'ביחד', 'סך הכל', 'יחד', 'להוסיף'],

        forbidden: ['כפל', 'חילוק', 'שארית', 'לצמצם'],

        validEmojis: ['🍎', '🍭', '🎈', '⚽'],

        maxNumber: 100

    },

    {

        keyword: 'חיסור', // Matches: 'חיסור עד 10', 'חיסור עד 100'

        mustInclude: ['פחות', 'נשאר', 'הורדנו', 'הפחתנו'],

        forbidden: ['כפל', 'חילוק', 'שברים', 'להכפיל'],

        validEmojis: ['🍪', '🎈', '🚗', '✏️'],

        maxNumber: 100

    }

];



// --- Fallback Content (יותר מותאם אישית) ---

const safeFallbacks = {

    'שברים': {

        1: 'קפטן קליק שולח פיצה 🍕! חצי פיצה ($$1/2$$) + חצי פיצה ($$1/2$$) = שלם אחד!',

        4: 'משימת אימון: איזה שבר גדול יותר, רבע או חצי? ($$1/4$$ או $$1/2$$)? תשובה: חצי'

    },

    'כפל': {

        1: 'קפטן קליק מצא קופסאות. $3$ קופסאות $\\times$ $4$ כוכבים בכל קופסה = $12$ כוכבים! $$3 \\times 4 = 12$$',

        4: 'משימת אימון: כמה זה $4 \\times 5$? תשובה: 20'

    }

};



// --- Prompt Templates (4.2-4.9 - Deep Prompting) ---



// 4.1 - אישיות AAA

const PROMPT_PERSONA = (name, gender, interests) => `

אתה קפטן קליק 🚀, מומחה הרפתקאות המתמטיקה. אתה מגיע מהחלל כדי לעזור לקצינים צעירים כמו ${name} לפצח את הקודים הסודיים של המתמטיקה.

האישיות שלך חייבת להיות מלאה אנרגיה, דרמטית, סופר-מעודדת, וחברית.

תחומי העניין של הקצין/ה הם: **${interests}**.

**חובה עליונה (4.2):** כל הדוגמאות והסיפורים שלך חייבים להיות מותאמים אישית ולשלב את תחומי העניין האלה כבסיס הסיפור.

`;



// 4.7, 4.8 - חוקי טון

const PROMPT_TONE_RULES = `

**חוקי טון וסגנון (4.7, 4.8):**

* השתמש בשפה חושית ומיידית: חובה להשתמש בלפחות 3 מילים חזקות (כגון 'בום', 'זינוק', 'כוח', 'טס', 'מסתובב') בכל תשובה.

* הדרכה קוגניטיבית: הוסף משפט מעודד בכל שלב שמנרמל את חוויית הקושי (לדוגמה: "זה נראה קצת מסובך, אבל יש לנו את הקוד הסודי!").

* השפה חייבת להיות מנוקדת חלקית ומתאימה לכיתה 1-6.

`;



// 4.4, 4.5, 4.6, 4.9 - חוקי תוכן

const PROMPT_CONTENT_RULES = (topic, rules, attemptNumber, name, gender) => {

    let method = '';

    let methodDisplay = '';

    

    switch (attemptNumber) {

        case 1: // Story Based (סיפור הרפתקאות)

            methodDisplay = 'story_based';

            method = `📖 סיפור הרפתקאות: צור סיפור קצר ומותח המשלב את ${topic} ואת תחומי העניין של ${name}. הדמויות חייבות לבצע פעולות מתמטיות. **חובה** ליישם את עקרון **ה"למה" לפני ה"איך" (4.5)**: הסבר את הצורך בקיום הכלל לפני הצגת הנוסחה.`;

            break;

        case 2: // Visual Pattern (דפוס קוסמי)

            methodDisplay = 'visual_pattern';

            method = `👁️ דפוס קוסמי: הסבר את הרעיון על ידי פירוק ויזואלי והצגת דפוסים חוזרים. ה-visual (אמוג'י) חייב לשקף את הדפוס. **חובה** ליישם את עקרון **הפירוק הקוגניטיבי (4.4):** הסבר רק 'ביס' קטן אחד בכל פעם, והימנע מהסבר מלא.`;

            break;

        case 3: // Logical Rule (קוד סודי)

            methodDisplay = 'logical_rule';

            method = `🧠 קוד סודי: שלב זה חושף את הכלל הפורמלי (הטריק הסודי). **חובה** ליישם את עקרון **מבחן ההיפוך (4.6):** השווה לרגע לפעולה ההפוכה (חיבור מול חיסור, כפל מול חילוק) כדי לחזק את גבולות הקונספט.`;

            break;

        case 4: // Game Challenge (משימת אימון)

            methodDisplay = 'game_challenge';

            method = `🎮 משימת אימון: הגדר את החוקים למשחק דמיוני קצר (כמו משימת חלל) שבו מנצחים רק באמצעות פתרון התרגיל. **חובה** ליישם את עקרון **גשר אנלוגי סותר (4.5)**: השתמש באנלוגיה דינמית ופעילה (כגון מכונת שכפול, פורטל, קרן לייזר) להסבר.`;

            break;

    }



    return {

        method: methodDisplay,

        prompt: `

        ${method}

        **חוקי ברזל לנושא ${topic} (חובה לעמוד בכולם):**

        1. **פשטות קיצונית (4.3):** אסור להשתמש במושגים אקדמיים כגון **'מונה'**, **'מכנה'**, **'מכפלה'**, **'סדר פעולות חשבון'**. השתמש במילים פשוטות בלבד (למשל: 'המספר למעלה', 'המספר הכולל').

        2. **LaTeX (1.2):** כל מספר, שבר או משוואה חייבים להיות עטופים בסימון **LaTeX** (כגון: $$1+1=2$$ או $\\frac{1}{2}$).

        3. חובה להשתמש במילים: ${rules.mustInclude.join(', ')}

        4. אסור להשתמש במילים: ${rules.forbidden.join(', ')}

        5. אמוג'ים מותרים בלבד: ${rules.validEmojis.join(' ')}

        6. מספרים מקסימום עד ${rules.maxNumber}.

        `

    };

};



// --- Handler Function ---

export default async function handler(req, res) {

    res.setHeader('Access-Control-Allow-Origin', '*');

    

    if (req.method !== 'POST') {

        return res.status(405).json({ error: 'Method not allowed' });

    }

    

    const { 

        name = 'קצין',

        gender = 'boy',

        grade = '1-2',

        interests = 'משחקי מחשב וכלבים', // נתון לדוגמה אם חסר

        topic,

        stage = 1,

        attemptNumber = 1

    } = req.body;

    

    const apiKey = process.env.ANTHROPIC_API_KEY;

    

    // Get rules for current topic (יישום 1.1)

    const baseRule = topicRuleSet.find(rule => topic && topic.includes(rule.keyword));

    const rules = baseRule || { 

        mustInclude: [], 

        forbidden: [], 

        validEmojis: ['📚'], 

        maxNumber: 100 

    };

    

    // Determine question type for verification stages (3.1-3.7)

    const isQuestionStage = stage >= 4;

    let verificationType = null;

    

    if (stage === 4) {

        // Stage 4: Verification (True/False or Word Problem Recognition)

        const choices = ['fix_error', 'identify_operation', 'explain_concept'];

        verificationType = choices[Math.floor(Math.random() * choices.length)];

    } else if (stage === 5) {

        // Stage 5: Final Check (Full numerical answer)

        verificationType = 'full_solution';

    }

    

    // Build the final prompt

    const { method, prompt: methodPrompt } = PROMPT_CONTENT_RULES(topic, rules, attemptNumber, name, gender);

    

    const finalPrompt = `

    ${PROMPT_PERSONA(name, gender, interests)}

    ${PROMPT_TONE_RULES}

    

    המשימה שלך היא להסביר את **${topic}** ל${gender === 'girl' ? 'קפטנית' : 'קפטן'} ${name} בכיתה ${grade}.

    

    ${methodPrompt}



    **דרישות לשלב הנוכחי (Stage ${stage}):**

    ${stage === 1 ? 'חובה להתמקד בפירוק קוגניטיבי (Decomposition) והצדקה רציונלית ("למה" לפני "איך").' : ''}

    ${stage === 2 ? 'חובה להדגים באמצעות ה-visuals והדפוסים החוזרים.' : ''}

    ${stage === 3 ? 'חובה לחשוף את ה"טריק הסודי" ולבצע מבחן היפוך מובנה.' : ''}



    ${isQuestionStage ? `

        **משימת אימות הבנה:** עכשיו נבדוק אם הקצין/ה ${name} מוכן/ה.

        **סוג הבדיקה (3.1-3.7):** ${verificationType}



        **חובה:** אם סוג הבדיקה הוא 'full_solution' או 'fix_error', עליך לספק תרגיל מתמטי שדורש פתרון מספרי. אם סוג הבדיקה היא 'explain_concept' או 'identify_operation', עליך לספק בעיה מילולית.

        

        **שים לב:** אם הבדיקה היא 'explain_concept' (כיתות צעירות), התשובה הנכונה (\`correctAnswer\`) צריכה להיות טקסט קצר (משפט אחד).

        

        **התוצאה (JSON) חייבת לכלול שאלה ספציפית ו-\`correctAnswer\` רלוונטי.**

    ` : ''}



    החזר JSON בלבד. **אל תוסיף קוד עטיפה (כגון \`\`\`json).**



    {

        "content": "ההסבר או השאלה המנוסחת בקפידה. חובה שפה חושית ולשלב את תחומי העניין.",

        "method": "${method}",

        "visual": "אמוג'ים מותרים מהרשימה או ייצוג ויזואלי של דפוס. יש להשתמש ב-LaTeX אם צריך.",

        "topicMatch": true,

        "isQuestion": ${isQuestionStage},

        "hint": "רמז קצר ומעודד (4.8 - הדרכה קוגניטיבית).",

        "correctAnswer": "התשובה המדויקת, או משפט קצר אם הבדיקה היא explain_concept."

    }

    `;



    

    try {

        if (!apiKey) throw new Error('No API key');

        

        // Call Claude 3.5 Sonnet

        const response = await fetch('https://api.anthropic.com/v1/messages', {

            method: 'POST',

            headers: {

                'Content-Type': 'application/json',

                'x-api-key': apiKey,

                'anthropic-version': '2023-06-01'

            },

            body: JSON.stringify({

                model: 'claude-3-5-sonnet-20241022', // SONNET 4.5

                max_tokens: 350, // הגדלה קלה של טוקנים עקב הפרומפט המפורט

                temperature: 0.7, // טמפרטורה מתונה ליצירתיות ושמירה על חוקים

                messages: [{ role: 'user', content: finalPrompt }]

            })

        });

        

        const data = await response.json();

        // הטיפול בתשובה מה-API

        const text = data.content?.[0]?.text || '{}';

        

        // ניקוי והמרה ל-JSON

        let json;

        try {

            // הסרת עטיפת קוד אם קיימת, והסרת רווחים

            const cleanedText = text.replace(/```json\n?|```\n?/g, '').trim();

            json = JSON.parse(cleanedText);

        } catch (parseError) {

            console.error('JSON Parse Error:', parseError);

            throw new Error('Failed to parse Claude response to JSON.');

        }



        // --- VALIDATION LAYER 3 & 4 (אכיפת חוקי AAA) ---

        // 3.1, 4.2 - בדיקה אם המודל יישם את ההוראות המחייבות

        

        const contentToValidate = json.content + (json.visual || '') + (json.hint || '');

        

        const validateContent = (content) => {

            // 1. בדיקת מילות איסור (4.3)

            const hasForbidden = rules.forbidden.some(word => content.includes(word));

            

            // 2. בדיקת שימוש ב-interests (4.2 - חובה עליונה)

            const interestWords = interests.split(/\s+/).filter(Boolean);

            const hasInterest = interestWords.some(word => content.includes(word));

            

            // 3. בדיקת שימוש ב-LaTeX (1.2) - חובה להכיל לפחות אחד מסימוני השברים או הדולר ל-LaTeX

            const usesLaTeX = content.includes('\\frac') || content.includes('$');

            

            // התוכן תקין אם: אין מילים אסורות, יש מילות עניין (מצביע על התאמה אישית), ויש שימוש ב-LaTeX (מצביע על מתמטיקה פורמלית).

            return !hasForbidden && hasInterest && usesLaTeX;

        };

        

        // VALIDATION LAYER 4: שימוש ב-Fallback אם ה-AI נכשל באכיפת החוקים

        if (!validateContent(contentToValidate)) {

            console.log('Content validation failed, using fallback.');

            

            const fallbackKey = isQuestionStage ? 4 : 1;

            const defaultFallback = isQuestionStage ? safeFallbacks[baseRule?.keyword || 'כפל']?.[4] : safeFallbacks[baseRule?.keyword || 'כפל']?.[1];



            json = {

                content: defaultFallback || `קפטן קליק לא מפענח! בוא נלמד ${topic} מחדש!`,

                visual: rules.validEmojis[0].repeat(3),

                topicMatch: true,

                isQuestion: isQuestionStage,

                hint: 'הקוד לא פוענח. נסה להקשיב שוב להסבר.',

                correctAnswer: isQuestionStage ? '5' : null // תשובה קבועה ב-Fallback לשלב תרגול

            };

        }

        

        // Format Hebrew text direction (שלב סופי)

        if (json.content) json.content = formatHebrewText(json.content);

        if (json.visual) json.visual = formatHebrewText(json.visual);

        if (json.hint) json.hint = formatHebrewText(json.hint);

        

        return res.status(200).json(json);

        

    } catch (error) {

        console.error('API Error:', error);

        

        // Return generic error fallback

        const fallbackContent = safeFallbacks[baseRule?.keyword || 'כפל']?.[1] || 

                              `קפטן ${name}, נתקלנו בתקלה קוסמית! בוא ננסה שוב.`;

        

        const errorResponse = {

            content: formatHebrewText(fallbackContent),

            visual: '🚨',

            topicMatch: false,

            isQuestion: isQuestionStage,

            hint: formatHebrewText('בדוק חיבור לאינטרנט'),

            correctAnswer: isQuestionStage ? '0' : null 

        };

        

        return res.status(200).json(errorResponse);

    }

}
