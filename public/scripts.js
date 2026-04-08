const form = document.getElementById('subscribe-form');
const resultNode = document.getElementById('result');

const showResult = (isSuccess, message) => {
  resultNode.hidden = false;
  resultNode.className = isSuccess ? 'ok' : 'error';
  resultNode.textContent = message;
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const repo = document.getElementById('repo').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  try {
    const response = await fetch('/api/subscriptions', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, repo }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload.message || 'Request failed';
      showResult(false, `Error ${response.status}: ${message}`);
      return;
    }

    showResult(true, `Subscription saved for ${payload.email} -> ${payload.repo}`);
    form.reset();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showResult(false, `Network error: ${message}`);
  }
});
