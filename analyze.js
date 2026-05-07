exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { resumeText } = JSON.parse(event.body);

    const prompt = `You are a senior HR director and resume coach with 15+ years experience. Analyze the resume below.
Return ONLY valid JSON — absolutely no markdown, no code fences, no extra text.

Resume:
"""
${resumeText || '[No text extracted — provide general feedback for a Computer Science student in their first or second year]'}
"""

Return exactly:
{
  "overall_score": <integer 0-100>,
  "ats_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "verdict": "<2-3 honest, specific, encouraging sentences summarizing this resume>",
  "strengths": ["<point 1>","<point 2>","<point 3>"],
  "improvements": ["<point 1>","<point 2>","<point 3>","<point 4>"],
  "missing_skills": ["<skill>","<skill>","<skill>","<skill>","<skill>","<skill>"],
  "action_items": ["<concrete step 1>","<concrete step 2>","<concrete step 3>","<concrete step 4>"]
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.error.message })
      };
    }

    const raw = data.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: raw
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};