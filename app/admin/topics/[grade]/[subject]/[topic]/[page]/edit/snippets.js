/**
 * Copy-paste example blocks for the raw-HTML lesson editor. Every snippet
 * uses only classes from Lessons/lesson-shared.css and (where JS is needed)
 * the real shared helpers from Lessons/lesson-shared.js -- LessonCheck /
 * LessonProgress -- so anything built here behaves exactly like the
 * hand-built lessons already on the site, not a simplified imitation.
 */
const SNIPPETS = [
  {
    id: "howto",
    label: "How-to callout",
    description: "A short green box at the top of a tab explaining what students should do.",
    html: `<div class="howto-box">
  <strong class="howto-label">How this page works</strong>
  Explain what students should do on this tab in one or two sentences.
</div>`,
  },
  {
    id: "notebook",
    label: "Notebook box",
    description: "Yellow \"copy this into your notebook\" box for vocabulary or key facts.",
    html: `<div class="notebook-box">
  <div class="notebook-header">COPY INTO MATH NOTEBOOK</div>
  <p style="margin:0 0 10px 0;"><strong>Topic:</strong> Name of the concept</p>
  <ul>
    <li><strong>Term:</strong> Definition goes here.</li>
    <li><strong>Term:</strong> Definition goes here.</li>
  </ul>
</div>`,
  },
  {
    id: "explainer",
    label: "Explainer box",
    description: "Blue box for a short concept explanation, usually right after the notebook box.",
    html: `<div class="explainer-box">
  Use this box to explain a concept in a sentence or two, with any <strong>bold</strong> terms
  called out.
</div>`,
  },
  {
    id: "steps",
    label: "Step-by-step (reveal one at a time)",
    description: "Numbered steps that reveal one at a time when the student clicks the button.",
    html: `<div class="step-box" id="steps-example">
  <div class="step-item visible">
    <strong>Step 1.</strong> First instruction goes here.
  </div>
  <div class="step-item">
    <strong>Step 2.</strong> Second instruction goes here.
  </div>
  <div class="step-item">
    <strong>Step 3.</strong> Third instruction goes here.
  </div>
  <button type="button" class="btn-nav" onclick="revealNextStep('steps-example')">Show next step</button>
</div>

<script>
function revealNextStep(containerId) {
  const container = document.getElementById(containerId);
  const hidden = container.querySelector('.step-item:not(.visible)');
  if (hidden) hidden.classList.add('visible');
}
</script>`,
  },
  {
    id: "tabs",
    label: "Tabs",
    description: "A row of tab buttons that switch between panels. Give each panel a unique id.",
    html: `<nav class="nav-tabs">
  <button class="tab-btn active" onclick="switchTab('tab-one')">1. First Tab</button>
  <button class="tab-btn" onclick="switchTab('tab-two')">2. Second Tab</button>
</nav>

<div id="tab-one" class="panel active">
  <p>Content for the first tab goes here.</p>
</div>
<div id="tab-two" class="panel">
  <p>Content for the second tab goes here.</p>
</div>

<script>
function switchTab(tabId) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  event.currentTarget.classList.add('active');
}
</script>`,
  },
  {
    id: "graded-question",
    label: "Auto-graded question",
    description: "A question with a Check button: right the first time = praise, wrong twice = shows the answer. Uses the site's real answer-checking code (LessonCheck), so it behaves exactly like every other graded question on the site.",
    html: `<div class="guided-practice" style="background: rgba(74, 222, 128, 0.08); border: 2px dashed var(--success); padding: 16px; border-radius: 12px; margin-top: 10px;">
  <strong>1.</strong> What is 3.4 + 1.25?
  <div style="margin-top:10px;">
    <input type="text" id="q1-input" class="form-control-lg" style="max-width:200px; display:inline-block;" placeholder="Answer">
    <button class="btn-lg" style="padding:8px 18px; font-size:1rem;" onclick="checkQ1()">Check</button>
  </div>
  <div id="q1-feedback" class="feedback-msg" style="margin-top:10px;"></div>
</div>

<script>
LessonProgress.preRegister('q1', 'What is 3.4 + 1.25?', 'Practice');

function checkQ1() {
  const val = document.getElementById('q1-input').value;
  const fb = document.getElementById('q1-feedback');
  if (!val.trim()) {
    LessonCheck.incomplete(fb, 'Enter your answer before submitting.');
    return;
  }
  // numericMatch(studentAnswer, correctAnswer, tolerance)
  const correct = LessonCheck.numericMatch(val, 4.65, 0.01);
  LessonCheck.check('q1', correct, fb, {
    correct: 'Correct! 3.4 + 1.25 = 4.65.',
    reveal: 'The correct answer is 4.65. Line up the decimal points, then add.'
  }, { label: 'What is 3.4 + 1.25?', answer: val, section: 'Practice' });
}
</script>`,
  },
  {
    id: "reflection-question",
    label: "Open-ended / reflection question",
    description: "A written-answer question with no single right answer. Records the answer for the printed progress report without grading it on screen.",
    html: `<div class="form-group">
  <label for="reflect1">Explain in your own words why we line up decimal points before adding.</label>
  <textarea id="reflect1" class="form-control-lg" rows="3"></textarea>
  <button class="btn-lg" style="margin-top:8px;" onclick="submitReflection()">Submit</button>
  <div id="reflect1-feedback" class="feedback-msg" style="margin-top:10px;"></div>
</div>

<script>
function submitReflection() {
  const val = document.getElementById('reflect1').value;
  const fb = document.getElementById('reflect1-feedback');
  LessonCheck.submit(fb, {
    key: 'reflect1',
    label: 'Why line up decimal points before adding?',
    answer: val,
    section: 'Practice'
  });
}
</script>`,
  },
  {
    id: "data-table",
    label: "Reference table",
    description: "A simple two-column (or more) reference table, e.g. vocabulary or clue words.",
    html: `<table class="data-table">
  <thead><tr><th>Term</th><th>Meaning</th></tr></thead>
  <tbody>
    <tr><td><strong>Sum</strong></td><td>The result of addition.</td></tr>
    <tr><td><strong>Difference</strong></td><td>The result of subtraction.</td></tr>
  </tbody>
</table>`,
  },
  {
    id: "buttons-badges",
    label: "Buttons & badges",
    description: "The standard button styles and the small badge label used in headers.",
    html: `<button class="btn-lg">Large action button</button>
<button class="btn-nav">Nav button</button>
<button class="btn-secondary">Secondary button</button>
<span class="badge" style="margin-left:8px;">Badge label</span>`,
  },
];

export default SNIPPETS;
