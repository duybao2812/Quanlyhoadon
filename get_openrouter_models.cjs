require('dotenv').config();

async function getModels() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  if (!res.ok) {
     console.log("Error status:", res.status);
  }
  const data = await res.json();
  const geminiModels = data.data.filter(m => m.id.includes('gemini')).map(m => m.id);
  console.log(JSON.stringify(geminiModels, null, 2));
}

getModels();
