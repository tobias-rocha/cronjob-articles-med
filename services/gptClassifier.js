const axios = require('axios');

async function gptClassifier(text) {
	const apiKey = process.env.GPT_API_KEY;

	const resp = await axios.post(
		'https://api.openai.com/v1/responses',
		{
			model: 'gpt-5-nano',
			input: `Você é um avaliador científico especializado em medicina, nutrição, fisioterapia, odontologia, psicologia e outras áreas da saúde.\n
			Sua função é ler o RESUMO (abstract) de um artigo científico e determinar se ele é relevante e aplicável à prática clínica de profissionais de saúde.\n\n
			Critérios de avaliação:\n
			- Relevante: artigos que tragam implicações para diagnóstico, tratamento, manejo clínico, prevenção, impacto psicossocial, condutas profissionais ou melhorias no cuidado de pacientes.\n
			- Não relevante: artigos excessivamente específicos de laboratório, estudos técnicos sem aplicação clínica direta, experimentos em animais sem tradução clara para prática clínica, ou análises muito restritas que não agregam ao cuidado em saúde.\n\n
			Formato de resposta (JSON):\n
			{\n
			  "relevancia": "Sim" ou "Não",\n
			  "areas_aplicaveis": ["Medicina", "Nutrição", "Fisioterapia", "Educação física", "Psicologia", "Outras"]\n
			}\n\n
			Regras:\n
			- Sempre responder no formato JSON acima, sem texto fora do JSON.\n
			- Se a relevância for "Não", manter "areas_aplicaveis" como lista vazia [].\n
			- Basear a decisão apenas no abstract fornecido.:\n\n
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
		return parsed;
	}

	return null;
}

module.exports = { gptClassifier };