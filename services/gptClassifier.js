const axios = require('axios');

async function gptClassifier(text) {
	const apiKey = process.env.GPT_API_KEY;

	const resp = await axios.post(
		'https://api.openai.com/v1/responses',
		{
			model: 'gpt-5-nano',
			input: `Você é um avaliador científico especializado em saúde.\n
				Sua função é ler o RESUMO (abstract) de um artigo e classificar se ele é relevante para a prática clínica de profissionais da saúde (medicina, nutrição, fisioterapia, odontologia, psicologia e educação física).\n\n
				Critérios:\n
				- Relevante: artigos que tenham implicações para diagnóstico, tratamento, prevenção, manejo clínico, impacto psicossocial ou melhoria no cuidado de pacientes.\n
				- Não relevante: artigos muito técnicos, laboratoriais, experimentais sem aplicação clínica clara, ou estudos em animais sem tradução direta para prática clínica.\n\n
				Formato de resposta (JSON):\n
				{\n
				  "relevancia": "Sim" ou "Não"\n
				}\n\n
				RESUMO DO ARTIGO:\n\n${text}`
		},
		{
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			}
		}
	);

	const rawOutput = resp.data.output[1].content[0].text;

	let parsed;
	try {
		parsed = JSON.parse(rawOutput);
	} catch (err) {
		console.error("Erro ao parsear JSON:", rawOutput);
		return null;
	}

	if (parsed.relevancia === "Sim") {
		return true;
	}

	return null;
}

module.exports = { gptClassifier };