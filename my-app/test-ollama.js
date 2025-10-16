// Simple Ollama test
async function testOllamaQuery() {
  try {
    console.log('Testing Ollama query...');
    
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.1:8b',
        prompt: 'What is the capital of France? Answer in one sentence.',
        stream: false
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Ollama response:', data.response);
    } else {
      console.error('❌ Ollama failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
}

testOllamaQuery();