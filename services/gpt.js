const axios = require('axios');

async function generateSummary(text) {
	const apiKey = process.env.GPT_API_KEY;

	const resp = await axios.post(
		'https://api.openai.com/v1/responses',
		{
			model: 'gpt-5-nano',
			input: `Você é um especialista em revisão científica para profissionais da saúde, com experiência multidisciplinar (medicina, nutrição, fisioterapia, psicologia, educação física e áreas afins). Sua função é ler o texto completo de um artigo científico e gerar um resumo objetivo, técnico e aplicável na prática clínica.\n\n
			Analise o artigo abaixo e produza um texto estruturado contendo:\n\n
			1. *Título resumido* – uma frase curta e clara representando o estudo.\n
			2. *Objetivo do estudo* – descreva em até 2 frases.\n
			3. *Metodologia* – informe tipo de estudo, população/amostra, duração, principais intervenções e variáveis analisadas.\n
			4. *Principais achados* – destaque os resultados mais relevantes, com dados numéricos ou estatísticos importantes (ex.: valores de p, IC95%, diferenças percentuais).\n
			5. *Implicações na prática clínica* – descreva de forma segmentada, mostrando como os resultados podem ser aplicados por:\n
			   - Medicina\n
			   - Nutrição\n
			   - Fisioterapia\n
			   - Psicologia\n
			   - Educação física\n
			   - Outras áreas da saúde\n
			6. *Nível de evidência e limitações* – classifique o nível de evidência (ex.: ensaio clínico randomizado, revisão sistemática, estudo observacional) e liste limitações importantes do estudo.\n
			7. *Conclusão final* – um parágrafo conciso com a mensagem-chave para o profissional de saúde.\n\n
			*Regras:*\n
			- Linguagem clara, técnica e com termos científicos corretos.\n
			- Não inventar dados. Usar apenas informações contidas no texto do artigo.\n
			- Sempre incluir implicações práticas adaptadas a cada área da saúde, mesmo que algumas sejam breves.\n
			- Manter o texto coeso, com tom profissional e objetivo.\n
			Regras adicionais de tradução:\\n
			- Traduzir integralmente todo o texto para português Brasil.\n
			- Se houver termos sem tradução exata ou consagrados em inglês, apresentar a tradução em português seguida do termo original entre parênteses.\n
			  Ex.: análise fenomenológica interpretativa (Interpretative Phenomenological Analysis - IPA)\n
			- Informe ao final se a sua análise foi feita apenas utilizando o abstract ou se foi utilizado o artigo na íntegra.\n\n
			Texto do artigo para análise:\n\n${text}`
		},
		{
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			}
		}
	);

	return resp.data.output[1].content[0].text;
}

module.exports = { generateSummary };