/* ═══════════════════════════════════════════
   RESUME AI — NETLIFY SERVERLESS FUNCTION
   Secure Gemini AI Backend
═══════════════════════════════════════════ */

exports.handler = async (event) => {

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { resumeText, jobDescription } = JSON.parse(event.body);

    if (!resumeText || resumeText.trim().length < 50) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Resume text is too short or empty.' })
      };
    }

    const prompt = `
You are a senior HR director, certified resume coach, and ATS optimization expert with 15 years of experience hiring at Fortune 500 companies.

Carefully analyze the following resume against the provided job description (if any).

RESUME:
"""
${resumeText.slice(0, 8000)}
"""

JOB DESCRIPTION:
"""
${jobDescription ? jobDescription.slice(0, 3000) : 'No job description provided. Perform a general analysis.'}
"""

INSTRUCTIONS:
- Be honest and realistic. Avoid fake positivity.
- Prioritize ATS optimization, measurable achievements, and strong action verbs.
- Detect weak language, passive voice, vague descriptions, and missing quantification.
- Give a job match score of 0 if no job description is provided.
- Return ONLY a valid JSON object, with NO markdown, NO code fences, NO preamble.

Return exactly this JSON structure:
{
  "overall_score": <integer 0-100>,
  "ats_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "match_score": <integer 0-100>,
  "verdict": "<2-3 sentence honest overall verdict>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "missing_skills": ["<skill 1>", "<skill 2>", "<skill 3>"],
  "action_items": ["<action 1>", "<action 2>", "<action 3>", "<action 4>", "<action 5>"],
  "rewrite_suggestions": ["<original → improved bullet 1>", "<original → improved bullet 2>", "<original → improved bullet 3>"],
  "keywords_found": ["<keyword 1>", "<keyword 2>", "<keyword 3>"],
  "keywords_missing": ["<keyword 1>", "<keyword 2>", "<keyword 3>"]
}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 2000,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} — ${errText}`);
    }

    const geminiData = await response.json();

    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error('No content returned from Gemini API.');

    // Strip any accidental markdown fences
    const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();

    // Validate JSON
    const parsed = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(parsed)
    };

  } catch (error) {
    console.error('ResumeAI Function Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message || 'Internal server error. Please try again.'
      })
    };
  }
};