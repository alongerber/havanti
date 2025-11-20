// Personal Information

let userData = {

    name: '',

    gender: '',

    grade: '',

    interests: '',

    currentTopic: '',

    currentStage: 1,

    explanationCount: 0,

    topicsLearned: 0

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

    const ready = name && userData.gender;

    document.getElementById('startBtn').disabled = !ready;

}



// Name input listener

document.getElementById('childName')?.addEventListener('input', checkIfReady);



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

        ${greeting} ${userData.name}! 🌟<br>

        ${genderText} להרפתקת למידה?

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

                'story_based': '📖 סיפור',

                'visual_pattern': '👁️ תמונה',

                'logical_rule': '🧠 חוק',

                'game_challenge': '🎮 משחק'

            };

            

            data.methodDisplay = methodNames[data.method] || '';

        }

        

        displayContent(data);

        

    } catch (error) {

        // Fallback content

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



// Format mixed Hebrew/number content

function formatMixedContent(text) {

    // Wrap math expressions in spans

    return text.replace(

        /(\d+\s*[+\-×÷]\s*\d+\s*=\s*\d*)/g,

        '<span class="math-expression">$1</span>'

    );

}



// Display content

function displayContent(data) {

    const content = document.getElementById('learningContent');

    

    // Format the content

    if (data.content) {

        data.content = formatMixedContent(data.content);

    }

    if (data.hint) {

        data.hint = formatMixedContent(data.hint);

    }

    

    // Add method badge

    const methodBadge = data.methodDisplay ? 

        `<div style="display: inline-block; background: rgba(139, 92, 246, 0.2); 

                     padding: 4px 12px; border-radius: 20px; font-size: 0.9rem; 

                     margin-bottom: 12px;">${data.methodDisplay}</div>` : '';

    

    if (data.isQuestion) {

        // Question stage

        content.innerHTML = `

            ${methodBadge}

            <h3>🎯 ${userData.name}, עכשיו ${userData.gender === 'girl' ? 'תורך' : 'תורך'}!</h3>

            <p style="font-size: 1.3rem; margin: 20px 0;">${data.content}</p>

            ${data.visual ? `<div class="visual-example">${data.visual}</div>` : ''}

            ${data.hint ? `<p style="color: #a78bfa;">💡 רמז: ${data.hint}</p>` : ''}

            <input type="text" id="answerInput" class="answer-input" 

                   placeholder="${userData.gender === 'girl' ? 'התשובה שלך...' : 'התשובה שלך...'}">

            <button onclick="checkAnswer('${data.correctAnswer}')" class="check-btn">

                ✅ ${userData.gender === 'girl' ? 'בדקי' : 'בדוק'} תשובה

            </button>

        `;

    } else {

        // Explanation stage

        content.innerHTML = `

            ${methodBadge}

            <h3>${getStageTitle()}</h3>

            <p style="font-size: 1.3rem; margin: 20px 0;">${data.content}</p>

            ${data.visual ? `<div class="visual-example">${data.visual}</div>` : ''}

            <button onclick="nextStage()" class="next-btn">

                ${data.nextButtonText || getNextButtonText()}

            </button>

        `;

    }

    

    userData.explanationCount++;

}



// Get stage title

function getStageTitle() {

    const titles = {

        1: `💡 ${userData.name}, בוא ${userData.gender === 'girl' ? 'נבין' : 'נבין'} את הרעיון`,

        2: `👀 ${userData.gender === 'girl' ? 'תראי' : 'תראה'} איך זה עובד`,

        3: `🔮 הסוד שלא ${userData.gender === 'girl' ? 'ידעת' : 'ידעת'}`,

        4: `🎯 ${userData.gender === 'girl' ? 'מוכנה' : 'מוכן'} לנסות?`,

        5: `🚀 אתגר אחרון!`

    };

    return titles[userData.currentStage] || '';

}



// Get next button text

function getNextButtonText() {

    const texts = {

        1: `${userData.gender === 'girl' ? 'הבנתי' : 'הבנתי'}! ${userData.gender === 'girl' ? 'תראי' : 'תראה'} לי עוד`,

        2: 'וואו! זה קל',

        3: 'עכשיו זה ברור!',

        4: `${userData.gender === 'girl' ? 'מוכנה' : 'מוכן'}!`,

        5: 'לסיכום'

    };

    return texts[userData.currentStage] || 'המשך';

}



// Check answer

function checkAnswer(correct) {

    const answer = document.getElementById('answerInput').value.trim();

    

    if (answer === correct || answer === correct.toString()) {

        showSuccess();

        setTimeout(nextStage, 2000);

    } else {

        document.getElementById('answerInput').style.animation = 'shake 0.5s';

        setTimeout(() => {

            document.getElementById('answerInput').style.animation = '';

        }, 500);

    }

}



// Show success message

function showSuccess() {

    const messages = [

        `${userData.name}, ${userData.gender === 'girl' ? 'את גאונה' : 'אתה גאון'}!`,

        `מעולה ${userData.name}!`,

        `${userData.gender === 'girl' ? 'צדקת' : 'צדקת'} בול!`,

        `וואו ${userData.name}!`

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

            <h2>${userData.name}, ${userData.gender === 'girl' ? 'סיימת' : 'סיימת'} ${userData.currentTopic}!</h2>

            <p style="color: #a78bfa; font-size: 1.2rem; margin: 20px 0;">

                ${userData.gender === 'girl' ? 'את מדהימה' : 'אתה מדהים'}! 

                ${userData.gender === 'girl' ? 'למדת' : 'למדת'} כבר ${userData.topicsLearned} נושאים!

            </p>

            <button onclick="startNewTopic()" class="next-btn">

                📚 ${userData.gender === 'girl' ? 'בואי' : 'בוא'} נלמד עוד משהו

            </button>

            ${userData.topicsLearned > 2 ? `

                <p style="margin-top: 20px; color: rgba(255,255,255,0.6);">

                    💜 ${userData.gender === 'girl' ? 'עזרת' : 'עזרת'} לי להיות מסביר טוב יותר

                </p>

            ` : ''}

        </div>

    `;

    

    // Check for milestone

    if (userData.topicsLearned === 5) {

        showMilestone();

    }

}



// Show milestone

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

                        🎉 ${userData.name}, רגע מיוחד!

                    </h2>

                    <p style="font-size: 1.3rem; margin-bottom: 30px;">

                        ${userData.gender === 'girl' ? 'למדת' : 'למדת'} 5 נושאים!<br>

                        ${userData.gender === 'girl' ? 'את עוזרת' : 'אתה עוזר'} לילדים אחרים להבין מתמטיקה

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



// Fallback content

function displayFallbackContent() {

    const content = document.getElementById('learningContent');

    const stage = userData.currentStage;

    

    const fallbacks = {

        1: `${userData.name}, ${userData.currentTopic} זה קל!`,

        2: `${userData.gender === 'girl' ? 'תראי' : 'תראה'}, ככה זה עובד...`,

        3: 'הטריק הסודי הוא...',

        4: `עכשיו ${userData.gender === 'girl' ? 'תנסי' : 'תנסה'}: 2+2=?`,

        5: 'אתגר אחרון: 3+3=?'

    };

    

    content.innerHTML = `

        <h3>${getStageTitle()}</h3>

        <p>${fallbacks[stage]}</p>

        <button onclick="nextStage()" class="next-btn">

            ${getNextButtonText()}

        </button>

    `;

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

});
