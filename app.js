let currentGrade = '';

let currentTopic = '';

let explanationCount = 0;



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

                attemptNumber: explanationCount + 1

            })

        });

        

        const data = await response.json();

        displayExplanation(data);

        explanationCount++;

        

    } catch (error) {

        // Fallback explanation

        const fallback = {

            title: currentTopic,

            method: 'דוגמה פשוטה',

            explanation: `בוא נלמד ${currentTopic} בצורה פשוטה וברורה...`,

            visual: '📚 ➡️ 🧠 ➡️ ✨',

            example: 'דוגמה: 2 + 2 = 4'

        };

        displayExplanation(fallback);

    }

    

    document.getElementById('loadingStep').classList.add('hidden');

}



function displayExplanation(data) {

    const explanationDiv = document.getElementById('explanation');

    explanationDiv.innerHTML = `

        <h3>🎯 ${data.title || currentTopic}</h3>

        <p><strong>שיטה ${explanationCount + 1}: ${data.method || 'הסבר מיוחד'}</strong></p>

        <p>${data.explanation || 'בוא נחשוב על זה ככה...'}</p>

        ${data.visual ? `<div class="visual-example">${data.visual}</div>` : ''}

        ${data.example ? `<p><strong>דוגמה:</strong> ${data.example}</p>` : ''}

    `;

    

    document.getElementById('resultStep').classList.remove('hidden');

}



function explainDifferently() {

    if (explanationCount >= 5) {

        explanationCount = 0; // Reset after 5 attempts

    }

    getExplanation();

}



function startOver() {

    document.getElementById('resultStep').classList.add('hidden');

    document.getElementById('topicStep').classList.add('hidden');

    document.getElementById('gradeStep').classList.remove('hidden');

    currentGrade = '';

    currentTopic = '';

    explanationCount = 0;

}

