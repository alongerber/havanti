let currentGrade = '';

let currentTopic = '';

let explanationCount = 0;

let currentStage = 1;

let understood = false;



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

        'כפל - מספר חד ספרתי',

        'כפל - מספר דו ספרתי',

        'חילוק',

        'חילוק עם שארית',

        'שברים פשוטים',

        'חיבור עד 1000',

        'חיסור עד 1000',

        'היקף ושטח'

    ],

    '5-6': [

        'שברים - חיבור',

        'שברים - חיסור',

        'שברים - כפל',

        'שברים - חילוק',

        'אחוזים',

        'מספרים עשרוניים',

        'ממוצע',

        'חזקות',

        'סדר פעולות חשבון',

        'משוואות פשוטות',

        'נפח',

        'יחס ופרופורציה'

    ]

};



function selectGrade(grade) {

    currentGrade = grade;

    const topicsContainer = document.getElementById('topicButtons');

    topicsContainer.innerHTML = '';

    

    topics[grade].forEach(topic => {

        const btn = document.createElement('button');

        btn.className = 'topic-btn';

        btn.textContent = topic;

        btn.onclick = () => selectTopic(topic);

        topicsContainer.appendChild(btn);

    });

    

    document.getElementById('gradeStep').classList.add('hidden');

    document.getElementById('topicStep').classList.remove('hidden');

}



function selectTopic(topic) {

    currentTopic = topic;

    explanationCount = 0;

    currentStage = 1;

    document.getElementById('topicStep').classList.add('hidden');

    getExplanation();

}



async function getExplanation() {

    document.getElementById('loadingStep').classList.remove('hidden');

    document.getElementById('resultStep').classList.add('hidden');

    

    try {

        const response = await fetch('/api/explain', {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({

                grade: currentGrade,

                topic: currentTopic,

                attemptNumber: explanationCount + 1,

                stage: currentStage

            })

        });

        

        const data = await response.json();

        displayProgressiveExplanation(data);

        explanationCount++;

        

    } catch (error) {

        console.error('Error:', error);

    }

    

    document.getElementById('loadingStep').classList.add('hidden');

}



function displayProgressiveExplanation(data) {

    const explanationDiv = document.getElementById('explanation');

    

    // Stage indicator

    const stageIndicator = `

        <div style="display: flex; gap: 8px; margin-bottom: 20px;">

            ${[1,2,3,4,5].map(s => `

                <div style="

                    width: 20%;

                    height: 6px;

                    background: ${s <= currentStage ? 'linear-gradient(90deg, #8b5cf6, #ec4899)' : 'rgba(255,255,255,0.1)'};

                    border-radius: 3px;

                    transition: all 0.3s;

                "></div>

            `).join('')}

        </div>

    `;

    

    // Content based on stage

    if (data.isQuestion) {

        // Practice stage - show input

        explanationDiv.innerHTML = `

            ${stageIndicator}

            <h3>🎯 עכשיו תורך!</h3>

            <p style="font-size: 1.3rem; margin: 20px 0;">${data.content}</p>

            <div class="visual-example">${data.visual}</div>

            ${data.hint ? `<p style="color: #a78bfa;">💡 רמז: ${data.hint}</p>` : ''}

            <input type="text" id="answerInput" placeholder="התשובה שלך..." 

                   style="width: 100%; padding: 16px; background: rgba(139, 92, 246, 0.1); 

                          border: 2px solid rgba(139, 92, 246, 0.3); border-radius: 12px; 

                          color: white; font-size: 1.2rem; text-align: center; margin: 20px 0;">

            <button onclick="checkAnswer('${data.correctAnswer}')" 

                    style="width: 100%; padding: 16px; background: linear-gradient(135deg, #10b981, #059669);

                           border: none; border-radius: 12px; color: white; font-size: 1.1rem; 

                           font-weight: 600; cursor: pointer;">

                ✅ בדוק תשובה

            </button>

        `;

    } else {

        // Explanation stage - just show content

        explanationDiv.innerHTML = `

            ${stageIndicator}

            <h3>${currentStage === 1 ? '💡 הרעיון' : currentStage === 2 ? '👀 תראה' : '🔮 הסוד'}</h3>

            <p style="font-size: 1.3rem; margin: 20px 0;">${data.content}</p>

            <div class="visual-example">${data.visual}</div>

            <button onclick="nextStage()" 

                    style="width: 100%; padding: 16px; background: linear-gradient(135deg, #8b5cf6, #7c3aed);

                           border: none; border-radius: 12px; color: white; font-size: 1.1rem; 

                           font-weight: 600; cursor: pointer; margin-top: 20px;">

                ${data.nextButtonText || 'הבנתי! הלאה ➡️'}

            </button>

        `;

    }

    

    document.getElementById('resultStep').classList.remove('hidden');

    

    // Hide "explain differently" button for first 3 stages

    const retryBtn = document.querySelector('.retry-btn');

    if (retryBtn) {

        retryBtn.style.display = currentStage <= 3 ? 'none' : 'block';

    }

}



function explainDifferently() {

    if (explanationCount >= 5) {

        explanationCount = 0; // Reset after 5 attempts

    }

    getExplanation();

}



function nextStage() {

    if (currentStage < 5) {

        currentStage++;

        getExplanation();

    } else {

        // Completed all stages

        showSuccess();

    }

}



function checkAnswer(correctAnswer) {

    const userAnswer = document.getElementById('answerInput').value.trim();

    

    if (userAnswer === correctAnswer || userAnswer === correctAnswer.toString()) {

        // Correct!

        showSuccessMessage();

        setTimeout(() => {

            if (currentStage < 5) {

                currentStage++;

                getExplanation();

            } else {

                showSuccess();

            }

        }, 2000);

    } else {

        // Wrong - shake and retry

        document.getElementById('answerInput').style.animation = 'shake 0.5s';

        setTimeout(() => {

            document.getElementById('answerInput').style.animation = '';

        }, 500);

    }

}



function showSuccessMessage() {

    const div = document.createElement('div');

    div.innerHTML = '🎉 מעולה! צדקת!';

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

        animation: successPop 0.5s ease;

    `;

    document.body.appendChild(div);

    setTimeout(() => div.remove(), 2000);

}



function showSuccess() {

    document.getElementById('explanation').innerHTML = `

        <div style="text-align: center; padding: 40px;">

            <div style="font-size: 5rem;">🏆</div>

            <h2 style="margin: 20px 0;">הבנת ${currentTopic}!</h2>

            <p style="color: #a78bfa; font-size: 1.2rem;">סיימת 5 שלבים בהצלחה</p>

            <button onclick="startOver()" 

                    style="width: 100%; padding: 16px; background: linear-gradient(135deg, #8b5cf6, #7c3aed);

                           border: none; border-radius: 12px; color: white; font-size: 1.1rem; 

                           font-weight: 600; cursor: pointer; margin-top: 30px;">

                📚 ללמוד נושא נוסף

            </button>

        </div>

    `;

}



function startOver() {

    currentStage = 1;  // Reset stage

    explanationCount = 0;

    currentGrade = '';

    currentTopic = '';

    

    document.getElementById('resultStep').classList.add('hidden');

    document.getElementById('topicStep').classList.add('hidden');

    document.getElementById('gradeStep').classList.remove('hidden');

}

