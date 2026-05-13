require('dotenv').config();

async function getModels() {
  const apiKey = process.env.GROQ_API_KEY;
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  if (!res.ok) {
     console.log("Error status:", res.status);
  }
  const data = await res.json();
  console.log(JSON.stringify(data.data.map(m => m.id), null, 2));
}

getModels();
