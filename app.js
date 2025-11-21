// Personal Information

let userData = {

    name: '',

    gender: '',

    grade: '',

    interests: '',

    currentTopic: '',

    currentStage: 1,

    explanationCount: 0,

    topicsLearned: 0,

    // הוספת הדמות החדשה

    persona: {

        name: 'קפטן קליק 🚀',

        title: 'מומחה הרפתקאות המתמטיקה'

    }

};



// Explanation method tracking

let explanationHistory = {

    methods: [],

    successful: [],

    currentMethod: 0

};



// Topics by grade

const topics = {

    '1-2': [

        'חיבור עד 10',

        'חיבור עד 20',

        'חיסור עד 10',

        'חיסור עד 20',

        'חיבור עד 100',

        'חיסור עד 100',

        'עשרות ואחדות',

        'מספרים עד 100'

    ],

    '3-4': [

        'לוח הכפל',

        'כפל חד-ספרתי',

        'כפל דו-ספרתי',

        'חילוק',

        'חילוק עם שארית',

        'שברים פשוטים',

        'חיבור עד 1000',

        'חיסור עד 1000'

    ],

    '5-6': [

        'שברים - חיבור',

        'שברים - חיסור',

        'שברים - כפל',

        'אחוזים',

        'מספרים עשרוניים',

        'ממוצע',

        'חזקות',

        'סדר פעולות',

        'משוואות פשוטות'

    ]

};



// --- KaTeX & Rendering Functions ---



// פונקציה לעיבוד KaTeX (LaTeX to Math)

function renderMathInElement(element) {

    // Check if KaTeX auto-render extension is loaded

    if (typeof window.renderMathInElement !== 'undefined') {

        try {

            window.renderMathInElement(element, {

                delimiters: [

                    {left: "$$", right: "$$", display: true}, // Block math

                    {left: "$", right: "$", display: false}   // Inline math

                ],

                throwOnError: false

            });

        } catch (e) {

            console.log('KaTeX not available, skipping math rendering');

        }

    }

}



// פונקציה לעיבוד טקסט מעורב (הסרה של פונקציית formatMixedContent הישנה)

function formatContentWithMath(text) {

    // KaTeX מטפל בזה אוטומטית, אין צורך בשימוש במחלקת math-expression

    return text;

}



// --- UI & Flow Control ---



// Gender selection

function selectGender(gender) {

    userData.gender = gender;

    document.getElementById('boyBtn').classList.toggle('selected', gender === 'boy');

    document.getElementById('girlBtn').classList.toggle('selected', gender === 'girl');

    checkIfReady();

}



// Check if ready to start

function checkIfReady() {

    const name = document.getElementById('childName').value.trim();

    // דרישה: חובה למלא שם, מין ותחומי עניין (3 מילים לפחות)

    const interestsCount = document.getElementById('interests').value.trim().split(/\s+/).filter(Boolean).length;

    const ready = name && userData.gender && interestsCount >= 3;

    document.getElementById('startBtn').disabled = !ready;

}



// Input listeners

document.getElementById('childName')?.addEventListener('input', checkIfReady);

document.getElementById('interests')?.addEventListener('input', checkIfReady);





// Start journey

function startJourney() {

    userData.name = document.getElementById('childName').value.trim();

    userData.interests = document.getElementById('interests').value;

    

    // Save to localStorage

    localStorage.setItem('userData', JSON.stringify(userData));

    

    // Show personalized greeting

    showPersonalGreeting();

    

    // Transition to grade selection

    document.getElementById('welcomeStep').classList.add('hidden');

    document.getElementById('gradeStep').classList.remove('hidden');

}



// Personal greeting

function showPersonalGreeting() {

    const hour = new Date().getHours();

    let greeting;

    

    if (hour < 12) greeting = 'בוקר טוב';

    else if (hour < 17) greeting = 'צהריים טובים';

    else greeting = 'ערב טוב';

    

    const genderText = userData.gender === 'girl' ? 'מוכנה' : 'מוכן';

    

    document.getElementById('personalGreeting').innerHTML = `

        ${greeting} קפטן ${userData.name}! 🌟<br>

        ${genderText} למשימה הבאה?

    `;

}



// Grade selection

function selectGrade(grade) {

    userData.grade = grade;

    

    // Create topic buttons

    const container = document.getElementById('topicButtons');

    container.innerHTML = '';

    

    topics[grade].forEach(topic => {

        const btn = document.createElement('button');

        btn.className = 'topic-btn';

        btn.textContent = topic;

        btn.onclick = () => selectTopic(topic);

        container.appendChild(btn);

    });

    

    document.getElementById('gradeStep').classList.add('hidden');

    document.getElementById('topicStep').classList.remove('hidden');

}



// Topic selection

function selectTopic(topic) {

    userData.currentTopic = topic;

    userData.currentStage = 1;

    userData.explanationCount = 0;

    

    document.getElementById('topicStep').classList.add('hidden');

    startLearning();

}



// Start learning process

async function startLearning() {

    document.getElementById('learningStep').classList.remove('hidden');

    document.getElementById('loadingStep').classList.remove('hidden');

    

    // אינדיקטור אישי (סעיף 2.4)

    const loadingMessage = document.querySelector('#loadingStep p');

    if (loadingMessage) {

        loadingMessage.textContent = 

            `${userData.persona.name} מפענח בשבילך את קוד הסודי של ${userData.currentTopic}...`;

    }

    

    // Update progress bar

    updateProgressBar();

    

    // Track which method we're using

    explanationHistory.currentMethod = (userData.explanationCount % 4) + 1;

    

    try {

        const response = await fetch('/api/explain', {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({

                name: userData.name,

                gender: userData.gender,

                grade: userData.grade,

                interests: userData.interests,

                topic: userData.currentTopic,

                stage: userData.currentStage,

                attemptNumber: explanationHistory.currentMethod

            })

        });

        

        const data = await response.json();

        

        // Show method indicator

        if (data.method) {

            const methodNames = {

                'story_based': '📖 סיפור הרפתקאות',

                'visual_pattern': '👁️ דפוס קוסמי',

                'logical_rule': '🧠 קוד סודי',

                'game_challenge': '🎮 משימת אימון'

            };

            

            data.methodDisplay = methodNames[data.method] || '';

        }

        

        displayContent(data);

        

    } catch (error) {

        // Fallback content on error

        displayFallbackContent();

    }

    

    document.getElementById('loadingStep').classList.add('hidden');

}



// Update progress bar

function updateProgressBar() {

    for (let i = 1; i <= 5; i++) {

        const step = document.getElementById(`step${i}`);

        step.classList.toggle('active', i <= userData.currentStage);

    }

}



// Display content - לוגיקה מעודכנת להצגת שאלה/הסבר

function displayContent(data) {

    const contentBox = document.getElementById('learningContent');

    

    // Add method badge

    const methodBadge = data.methodDisplay ? 

        `<div style="display: inline-block; background: rgba(139, 92, 246, 0.2); 

                     padding: 4px 12px; border-radius: 20px; font-size: 0.9rem; 

                     margin-bottom: 12px; font-weight: 700;">${data.methodDisplay}</div>` : '';

    

    let htmlContent = ``;



    if (data.isQuestion) {

        // Question stage (Stage 4 & 5)

        htmlContent = `

            ${methodBadge}

            <h3>🎯 קפטן ${userData.name}, עכשיו תורך!</h3>

            <p style="font-size: 1.3rem; margin: 20px 0;">${data.content}</p>

            ${data.visual ? `<div class="visual-example">${data.visual}</div>` : ''}

            ${data.hint ? `<p style="color: #a78bfa;">💡 רמז: ${data.hint}</p>` : ''}

            

            <div class="question-container">

                <p style="font-size: 1.1rem; margin-bottom: 15px;">אנא הקלד/י את הפתרון שלך:</p>

                <input type="text" id="answerInput" class="answer-input" 

                       placeholder="${userData.gender === 'girl' ? 'הקוד הסודי שלך...' : 'הקוד הסודי שלך...'}">

                <button onclick="checkAnswer('${data.correctAnswer}')" class="check-btn">

                    ✅ ${userData.gender === 'girl' ? 'בדיקת קוד' : 'בדיקת קוד'}

                </button>

            </div>

        `;

    } else {

        // Explanation stage (Stage 1, 2, 3) - אין שאלות, רק הסברים

        htmlContent = `

            ${methodBadge}

            <h3>${getStageTitle()}</h3>

            <p style="font-size: 1.3rem; margin: 20px 0;">${data.content}</p>

            ${data.visual ? `<div class="visual-example">${data.visual}</div>` : ''}

            <button onclick="nextStage()" class="next-btn">

                ${data.nextButtonText || getNextButtonText()}

            </button>

        `;

    }

    

    contentBox.innerHTML = htmlContent;

    

    // KaTeX rendering - חובה לאחר הוספת ה-HTML ל-DOM

    renderMathInElement(contentBox);

    

    userData.explanationCount++;

}



// Get stage title

function getStageTitle() {

    const titles = {

        1: `💡 ${userData.name}, מפענח/ת את הרעיון המרכזי`,

        2: `👀 ${userData.gender === 'girl' ? 'צופה' : 'צופה'} בדפוס הקוסמי`,

        3: `🔮 מגלה/ת את הקוד הסודי של קפטן קליק`,

        4: `🎯 ${userData.gender === 'girl' ? 'מוכנה' : 'מוכן'} למשימת אימון?`,

        5: `🚀 אתגר ניצחון אחרון!`

    };

    return titles[userData.currentStage] || '';

}



// Get next button text

function getNextButtonText() {

    const texts = {

        1: `${userData.gender === 'girl' ? 'פוענח' : 'פוענח'}! ${userData.gender === 'girl' ? 'תראי' : 'תראה'} לי את הדפוס`,

        2: 'וואו! זה קסם',

        3: 'עכשיו זה ברור! ממשיכ/ה לאימון',

        4: `${userData.gender === 'girl' ? 'מוכנה' : 'מוכן'}!`,

        5: 'לסיכום המשימה'

    };

    return texts[userData.currentStage] || 'המשך';

}



// Check answer

function checkAnswer(correct) {

    const answerInput = document.getElementById('answerInput');

    const answer = answerInput.value.trim();

    

    if (answer === correct || answer === correct.toString()) {

        showSuccess();

        // מיקרו-אינטראקציה (סעיף 2.5) - הוספת דופק ירוק

        answerInput.style.transition = 'background-color 0.5s';

        answerInput.style.backgroundColor = '#10b98150';

        

        setTimeout(nextStage, 2000);

    } else {

        answerInput.style.animation = 'shake 0.5s';

        // מיקרו-אינטראקציה (סעיף 2.5) - שגיאה

        answerInput.style.transition = 'border-color 0.5s';

        answerInput.style.borderColor = '#ef4444';

        

        setTimeout(() => {

            answerInput.style.animation = '';

            answerInput.style.borderColor = 'rgba(139, 92, 246, 0.3)';

            answerInput.style.backgroundColor = 'rgba(139, 92, 246, 0.1)';

        }, 500);

    }

}



// Show success message

function showSuccess() {

    const messages = [

        `קפטן ${userData.name}, ${userData.gender === 'girl' ? 'את גאונה קוסמית' : 'אתה גאון קוסמי'}!`,

        `מעולה ${userData.name}! המשימה הושלמה!`,

        `${userData.gender === 'girl' ? 'צדקת' : 'צדקת'} בול! הקוד פוענח!`,

        `וואו ${userData.name}! ${userData.persona.name} גאה בך!`

    ];

    

    const div = document.createElement('div');

    div.innerHTML = `🎉 ${messages[Math.floor(Math.random() * messages.length)]}`;

    div.style.cssText = `

        position: fixed;

        top: 50%;

        left: 50%;

        transform: translate(-50%, -50%);

        background: linear-gradient(135deg, #10b981, #059669);

        color: white;

        padding: 20px 40px;

        border-radius: 16px;

        font-size: 1.5rem;

        font-weight: 700;

        z-index: 1000;

        animation: pop 0.5s ease;

        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5);

    `;

    document.body.appendChild(div);

    setTimeout(() => div.remove(), 2000);

}



// Next stage

function nextStage() {

    if (userData.currentStage < 5) {

        userData.currentStage++;

        startLearning();

    } else {

        completeTopic();

    }

}



// Complete topic

function completeTopic() {

    userData.topicsLearned++;

    localStorage.setItem('topicsLearned', userData.topicsLearned);

    

    const content = document.getElementById('learningContent');

    content.innerHTML = `

        <div style="text-align: center; padding: 40px;">

            <div style="font-size: 5rem;">🏆</div>

            <h2>קפטן ${userData.name}, ${userData.gender === 'girl' ? 'סיימת' : 'סיימת'} את המשימה: ${userData.currentTopic}!</h2>

            <p style="color: #a78bfa; font-size: 1.2rem; margin: 20px 0;">

                ${userData.gender === 'girl' ? 'את מדהימה' : 'אתה מדהים'}! 

                ${userData.gender === 'girl' ? 'פענחת' : 'פענחת'} כבר ${userData.topicsLearned} קודים סודיים!

            </p>

            <button onclick="startNewTopic()" class="next-btn">

                📚 ${userData.gender === 'girl' ? 'בואי' : 'בוא'} לפענח עוד משימה

            </button>

            ${userData.topicsLearned > 2 ? `

                <p style="margin-top: 20px; color: rgba(255,255,255,0.6);">

                    💜 ${userData.gender === 'girl' ? 'עזרת' : 'עזרת'} לי להיות מומחה טוב יותר!

                </p>

            ` : ''}

        </div>

    `;

    

    // Check for milestone

    if (userData.topicsLearned === 5) {

        showMilestone();

    }

}



// Show milestone - (אותה לוגיקה)

function showMilestone() {

    setTimeout(() => {

        const div = document.createElement('div');

        div.innerHTML = `

            <div style="

                position: fixed;

                inset: 0;

                background: rgba(139, 92, 246, 0.95);

                display: flex;

                align-items: center;

                justify-content: center;

                z-index: 9999;

            ">

                <div style="text-align: center; color: white; padding: 40px;">

                    <h2 style="font-size: 2rem; margin-bottom: 20px;">

                        🎉 קפטן ${userData.name}, רגע מיוחד!

                    </h2>

                    <p style="font-size: 1.3rem; margin-bottom: 30px;">

                        ${userData.gender === 'girl' ? 'פענחת' : 'פענחת'} 5 קודים סודיים!<br>

                        ${userData.gender === 'girl' ? 'את עוזרת' : 'אתה עוזר'} לקצינים אחרים להבין מתמטיקה

                    </p>

                    <button onclick="this.parentElement.parentElement.remove()" 

                            style="padding: 16px 32px; background: white; color: #8b5cf6; 

                                   border: none; border-radius: 12px; font-size: 1.1rem; 

                                   font-weight: 600; cursor: pointer;">

                        💜 תודה!

                    </button>

                </div>

            </div>

        `;

        document.body.appendChild(div);

    }, 1000);

}



// Start new topic

function startNewTopic() {

    userData.currentStage = 1;

    userData.explanationCount = 0;

    document.getElementById('learningStep').classList.add('hidden');

    document.getElementById('topicStep').classList.remove('hidden');

}



// Fallback content - לוגיקה מעודכנת להצגת השאלה

function displayFallbackContent() {

    const content = document.getElementById('learningContent');

    const stage = userData.currentStage;

    

    const fallbacks = {

        1: `${userData.name}, ${userData.currentTopic} זה קל! הקוד הסודי הוא...`,

        2: `${userData.gender === 'girl' ? 'תראי' : 'תראה'}, ככה זה עובד...`,

        3: 'הטריק הסודי הוא...',

        4: `משימת אימון: $2+2=?$`, // שימוש ב-LaTeX

        5: `אתגר ניצחון: $3+3=?$` // שימוש ב-LaTeX

    };

    

    const isQuestion = stage >= 4;

    

    let htmlContent = `

        <h3>${getStageTitle()}</h3>

        <p>${fallbacks[stage]}</p>

    `;



    if (isQuestion) {

        htmlContent += `

            <div class="question-container">

                <p style="font-size: 1.1rem; margin-bottom: 15px;">אנא הקלד/י את הפתרון שלך:</p>

                <input type="text" id="answerInput" class="answer-input" placeholder="התשובה כאן">

                <button onclick="checkAnswer('${stage === 4 ? '4' : '6'}')" class="check-btn">

                    ✅ ${userData.gender === 'girl' ? 'בדיקת קוד' : 'בדיקת קוד'}

                </button>

            </div>

        `;

    } else {

         htmlContent += `

            <button onclick="nextStage()" class="next-btn">

                ${getNextButtonText()}

            </button>

        `;

    }

    

    content.innerHTML = htmlContent;

    renderMathInElement(content); // עיבוד KaTeX

}





// Initialize on load

window.addEventListener('DOMContentLoaded', () => {

    // Load topics learned count

    const topicsLearned = localStorage.getItem('topicsLearned');

    if (topicsLearned) {

        userData.topicsLearned = parseInt(topicsLearned) || 0;

    }

    

    // Check if returning user

    const saved = localStorage.getItem('userData');

    if (saved) {

        const savedData = JSON.parse(saved);

        userData = { ...userData, ...savedData };

        

        if (userData.name) {

            // Returning user - show welcome back

            document.getElementById('childName').value = userData.name;

            if (userData.gender) {

                selectGender(userData.gender);

            }

            if (userData.interests) {

                document.getElementById('interests').value = userData.interests;

            }

        }

    }



    // הפעלת KaTeX עבור תוכן סטטי

    document.body.onload = function() {

        renderMathInElement(document.body);

    };

});
