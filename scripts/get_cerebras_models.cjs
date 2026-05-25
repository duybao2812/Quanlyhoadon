require('dotenv').config();

async function getModels() {
  const apiKey = process.env.CEREBRAS_API_KEY;
  const res = await fetch('https://api.cerebras.ai/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  if (!res.ok) {
     console.log("Error status:", res.status);
  }
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

getModels();
