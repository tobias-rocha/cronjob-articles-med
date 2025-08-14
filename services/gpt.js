const axios = require('axios');

async function generateSummary(text) {
	const apiKey = process.env.OPENAI_API_KEY;

	const resp = await axios.post(
		'https://api.openai.com/v1/responses',
		{
			model: 'gpt-5-nano',
			input: `Resuma o seguinte texto em no m�ximo 3 frases:\n\n${text}`
		},
		{
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			}
		}
	);

	return resp.data.output[0].content[0].text;
}
