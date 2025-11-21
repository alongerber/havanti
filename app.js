let userData = { name: '', gender: 'boy', grade: '', interests: '', topic: '', stage: 1, persona: 'קפטן קליק 🚀' };

const topics = { '1-2': ['חיבור עד 10', 'חיסור', 'מספרים'], '3-4': ['לוח הכפל', 'חילוק', 'שברים'], '5-6': ['שברים', 'אחוזים', 'חזקות'] };



function initMathRendering(el) {

    if (window.renderMathInElement) window.renderMathInElement(el, { delimiters: [{left:"$$", right:"$$", display:true}, {left:"$", right:"$", display:false}] });

}



function setGender(g) { userData.gender = g; document.querySelectorAll('button[id$="Btn"]').forEach(b => b.style.background='#333'); document.getElementById(g+'Btn').style.background='#8b5cf6'; }

function startApp() { userData.name = document.getElementById('childName').value; userData.interests = document.getElementById('interests').value; document.getElementById('welcomeStep').classList.add('hidden'); document.getElementById('gradeStep').classList.remove('hidden'); }

function setGrade(g) { userData.grade = g; const div = document.getElementById('topicButtons'); div.innerHTML=''; topics[g].forEach(t => div.innerHTML += `<button class="topic-btn" onclick="setTopic('${t}')">${t}</button>`); document.getElementById('gradeStep').classList.add('hidden'); document.getElementById('topicStep').classList.remove('hidden'); }

function setTopic(t) { userData.topic = t; userData.stage = 1; document.getElementById('topicStep').classList.add('hidden'); fetchExplanation(); }



async function fetchExplanation() {

    document.getElementById('learningStep').classList.remove('hidden');

    document.getElementById('learningContent').innerHTML = ''; 

    document.getElementById('loadingStep').classList.remove('hidden');

    

    try {

        const res = await fetch('/api/explain', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(userData) });

        const data = await res.json();

        document.getElementById('loadingStep').classList.add('hidden');

        renderContent(data);

    } catch(e) {

        document.getElementById('loadingStep').classList.add('hidden');

        renderContent({ isQuestion: false, content: 'תקלה בתקשורת, נסה שוב.', nextButtonText: 'נסה שוב' });

    }

}



function renderContent(data) {

    const box = document.getElementById('learningContent');

    let html = `<h3>שלב ${userData.stage}</h3><p style="font-size:1.2rem;">${data.content}</p>`;

    

    if (data.isQuestion) {

        html += `<div style="margin-top:20px; border-top:1px solid #444; padding-top:15px;">

            <input type="text" id="ansInput" placeholder="התשובה שלך...">

            <div style="display:flex; gap:10px;">

                <button onclick="checkAns('${data.correctAnswer}')" class="check-btn">✅ בדיקה</button>

                <button onclick="showHint('${data.hint}')" class="hint-btn">💡 רמז</button>

            </div>

            <div id="feedbackArea"></div>

            <button onclick="nextStage()" style="background:transparent; border:1px solid #666; margin-top:10px;">▶️ דלג</button>

        </div>`;

    } else {

        html += `<button onclick="nextStage()" class="next-btn">${data.nextButtonText || 'המשך'}</button>`;

    }

    box.innerHTML = html;

    initMathRendering(box);

}



function checkAns(correct) {

    const val = document.getElementById('ansInput').value.trim();

    const fb = document.getElementById('feedbackArea');

    if (val == correct) { fb.innerHTML = '<span style="color:#10b981; font-size:1.2rem;">🎉 מעולה! כל הכבוד!</span>'; setTimeout(nextStage, 2000); }

    else { fb.innerHTML = '<span style="color:#ef4444;">❌ לא בדיוק, נסה שוב</span>'; }

}



function showHint(h) { document.getElementById('feedbackArea').innerText = '💡 רמז: ' + (h || 'נסה לחשוב שוב'); }



function nextStage() {

    if (userData.stage < 5) { userData.stage++; fetchExplanation(); }

    else { document.getElementById('learningContent').innerHTML = '<h1>🏆 המשימה הושלמה!</h1><button onclick="location.reload()" class="start-btn">התחל מחדש</button>'; }

}
