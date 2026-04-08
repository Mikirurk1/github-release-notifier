const form = document.getElementById('subscribe-form');
const resultNode = document.getElementById('result');
const submitBtn = document.getElementById('submit-btn');

const emailInput = document.getElementById('email');
const repoInput = document.getElementById('repo');
const apiKeyInput = document.getElementById('apiKey');

const MAX_EMAIL_LENGTH = 320;
const MAX_REPO_LENGTH = 200;

/** Mirrors `subscriptionService` validation on the server. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

const showResult = (isSuccess, message) => {
  resultNode.hidden = false;
  resultNode.className = `result ${isSuccess ? 'ok' : 'error'}`;
  resultNode.textContent = message;
};

const hideResult = () => {
  resultNode.hidden = true;
  resultNode.textContent = '';
  resultNode.className = 'result';
};

const clearFieldError = (input) => {
  const field = input.closest('.field');
  if (!field) {
    return;
  }
  field.classList.remove('field--invalid');
  input.removeAttribute('aria-invalid');
  const describedBy = input.getAttribute('aria-describedby');
  if (describedBy) {
    const err = document.getElementById(describedBy);
    if (err) {
      err.textContent = '';
    }
    input.removeAttribute('aria-describedby');
  }
};

const setFieldError = (input, message) => {
  const field = input.closest('.field');
  const err = field?.querySelector('.field__error');
  if (!field || !err?.id) {
    return;
  }
  field.classList.add('field--invalid');
  err.textContent = message;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', err.id);
};

const validateEmail = (raw) => {
  const email = raw.toLowerCase().trim();
  if (!email) {
    return { ok: false, message: 'Enter your email address.' };
  }
  if (email.length > MAX_EMAIL_LENGTH) {
    return { ok: false, message: 'Email is too long.' };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: 'Enter a valid email address.' };
  }
  return { ok: true, value: email };
};

const validateRepo = (raw) => {
  const repo = raw.trim();
  if (!repo) {
    return { ok: false, message: 'Enter a repository as owner/repo.' };
  }
  if (repo.length > MAX_REPO_LENGTH) {
    return { ok: false, message: 'Repository name is too long.' };
  }
  if (!REPO_RE.test(repo)) {
    return {
      ok: false,
      message: 'Use the format owner/repo (letters, numbers, . _ - only).',
    };
  }
  return { ok: true, value: repo };
};

const clearAllFieldErrors = () => {
  clearFieldError(emailInput);
  clearFieldError(repoInput);
};

const runClientValidation = () => {
  clearAllFieldErrors();
  const emailResult = validateEmail(emailInput.value);
  const repoResult = validateRepo(repoInput.value);

  if (!emailResult.ok) {
    setFieldError(emailInput, emailResult.message);
  }
  if (!repoResult.ok) {
    setFieldError(repoInput, repoResult.message);
  }

  if (!emailResult.ok || !repoResult.ok) {
    const firstBad = !emailResult.ok ? emailInput : repoInput;
    firstBad.focus();
    return null;
  }

  return {
    email: emailResult.value,
    repo: repoResult.value,
    apiKey: apiKeyInput.value.trim(),
  };
};

for (const input of [emailInput, repoInput]) {
  input.addEventListener('input', () => {
    clearFieldError(input);
    hideResult();
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const validated = runClientValidation();
  if (!validated) {
    return;
  }

  const { email, repo, apiKey } = validated;

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  submitBtn.disabled = true;
  const prevLabel = submitBtn.textContent;
  submitBtn.textContent = 'Sending…';
  hideResult();

  try {
    const response = await fetch('/api/subscriptions', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, repo }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload.message || 'Request failed';
      showResult(false, `Something went wrong (${response.status}). ${message}`);
      return;
    }

    if (payload.alreadySubscribed) {
      showResult(
        true,
        `You are already subscribed. We will email ${payload.email} when ${payload.repo} publishes a new release.`,
      );
      return;
    }

    showResult(
      true,
      `You are subscribed. We will email ${payload.email} for new releases on ${payload.repo}.`,
    );
    form.reset();
    clearAllFieldErrors();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showResult(false, `Network error: ${message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = prevLabel;
  }
});
