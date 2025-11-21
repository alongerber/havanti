export default async function handler(req, res) {
    // 1. Verify Method
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            content: "🚨 Error: Method must be POST", 
            isQuestion: false, 
            visual: "❌" 
        });
    }

    try {
        // 2. Debug API Key (Don't log the full key, just presence)
        const apiKey = process.env.ANTHROPIC_API_KEY;
        
        if (!apiKey) {
            throw new Error("MISSING API KEY: The variable 'ANTHROPIC_API_KEY' is not set in Vercel.");
        }
        if (!apiKey.startsWith("sk-")) {
            throw new Error("INVALID API KEY FORMAT: Key must start with 'sk-'. Check for extra spaces or quotes.");
        }

        const body = await req.body;
        const { name, topic, stage, interests } = body;

        // 3. Make the Request
        console.log("Sending request to Anthropic...");
        
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
                messages: [{ 
                    role: 'user', 
                    content: `Explain ${topic} simply to ${name} (Interest: ${interests}). Return JSON: { "content": "text", "isQuestion": false, "visual": "emoji" }` 
                }]
            })
        });

        // 4. Handle API Errors
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ANTHROPIC ERROR (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        
        // 5. Parse Response
        let text = data.content[0].text;
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            text = text.substring(jsonStart, jsonEnd + 1);
        }

        let parsedData;
        try {
            parsedData = JSON.parse(text);
        } catch (e) {
            throw new Error(`INVALID JSON RECEIVED: ${text.substring(0, 100)}...`);
        }

        // Success
        res.status(200).json(parsedData);

    } catch (error) {
        console.error('DEBUG ERROR:', error);
        
        // RETURN THE REAL ERROR TO THE UI
        res.status(200).json({
            content: `🛑 **שגיאה טכנית (צילום מסך למפתח):**\n\n${error.message}`,
            visual: "🐛",
            isQuestion: false,
            correctAnswer: "",
            hint: "בדוק את ההגדרות ב-Vercel",
            nextButtonText: "נסה שוב"
        });
    }
}
