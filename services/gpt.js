const axios = require('axios');

async function generateSummary(textAbstract) {
	const apiKey = process.env.GPT_API_KEY;

	const resp = await axios.post(
		'https://api.openai.com/v1/responses',
		{
			model: 'gpt-4.1',
			input: `Você é um especialista em revisão científica para profissionais da saúde, com experiência multidisciplinar (medicina, nutrição, fisioterapia, psicologia, educação física e odontologia).\n
				Sua função é ler o texto de um artigo científico informado ao final desse prompt (Texto do artigo para análise), classificar se ele é relevante para a prática clínica de profissionais da saúde (PASSO 1) seguindo os critérios (Critérios PASSO 1) abaixo e caso seja relevante (relevância: sim), siga para o (PASSO 2). Caso o artigo não seja relevante (relevância: não), finalize apenas retornando a reposta JSON do PASSO 1:\n\n
				Critérios PASSO 1:\n
				- Relevante: artigos que tenham implicações para diagnóstico, tratamento, prevenção, manejo clínico, impacto psicossocial, melhoria no cuidado de pacientes ou estudos em animais que futuramente após testes em humanos possa se traduzir em aplicação clínica.\n
				- Não relevante: Artigos que não sejam da área da saúde ou que sejam laboratoriais muito específicos ao ponto de não existir conexão com a saúde humana e tradução para a prática clínica.\n\n
				Formato de resposta (JSON):\n
				{\n
				  "relevancia": "Sim" ou "Não"\n
				}\n\n
				PASSO 2:\n
				Gerar um resumo objetivo, técnico e aplicável na prática clínica.\n\n
				A resposta deve ser *exclusivamente em formato JSON válido*, obedecendo à seguinte estrutura e instruções detalhadas:\n\n
				{\n
				  "titulo_original_traduzido": "Traduza integralmente o título original do artigo para o português.",\n
				  "objetivo_do_estudo": "Descreva o objetivo em até 2 frases.",\n
				  "metodologia": "Informe tipo de estudo, população/amostra, duração, principais intervenções e variáveis analisadas.",\n
				  "principais_achados": "Destaque os resultados mais relevantes. Sempre que possível, inclua dados numéricos ou estatísticos importantes (ex.: valores de p, IC95%, diferenças percentuais).",\n
				  "implicacoes_na_pratica_clinica": {\n
					"medicina": "Explique como os achados podem ser aplicados na prática médica.",\n
					"nutricao": "Explique como os achados podem ser aplicados na nutrição clínica.",\n
					"fisioterapia": "Explique como os achados podem ser aplicados na fisioterapia.",\n
					"psicologia": "Explique como os achados podem ser aplicados na psicologia clínica.",\n
					"educacao_fisica": "Explique como os achados podem ser aplicados na educação física.",\n
					"odontologia": "Explique como os achados podem ser aplicados na odontologia."\n
				  },\n
				  "nivel_de_evidencia_e_limitacoes": {\n
					"classificacao": "Classifique o nível de evidência (ex.: ensaio clínico randomizado, revisão sistemática, estudo observacional).",\n
					"limitacoes": "Liste as principais limitações do estudo.",\n
					"nota_nivel_de_evidencia": "Dê uma nota de 0 a 10 para o nível de evidência do estudo."\n
				  },\n
				  "conclusao_final": "Um parágrafo conciso com a mensagem-chave para o profissional de saúde.",\n
				  "palavras_chave": [\n
					"Liste entre 10 e 20 palavras-chave relevantes que representem o conteúdo central do artigo. Se o artigo fornecer palavras-chave dos autores, utilize-as (traduzidas) e sem caracteres especiais, complemente até fechar 20. Use 10 palavras simple e 10 compostas."\n
				  ]\n
				}\n
				*Regras adicionais:*\n
				- Linguagem clara, técnica e com termos científicos corretos.\n
				- Não inventar dados. Usar apenas informações contidas no artigo fornecido.\n
				- Sempre incluir implicações práticas adaptadas a cada área da saúde, mesmo que algumas sejam breves.\n
				- Traduzir integralmente todo o texto para português Brasil.\n
				- Sempre que utilizar abreviações, coloque a palavra original e a abreviação entre parênteses.\n
				- Se houver termos sem tradução exata ou consagrados em inglês, apresentar a tradução em português seguida do termo original entre parênteses.\n
				  Exemplo: análise fenomenológica interpretativa (Interpretative Phenomenological Analysis - IPA).\n\n
				Texto do artigo para análise:\n\n${textAbstract}`
		},
		{
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			}
		}
	);

	let content;

	if (
		resp.data.output &&
		resp.data.output[0] &&
		resp.data.output[0].content &&
		resp.data.output[0].content[0] &&
		resp.data.output[0].content[0].text
	) {
		content = resp.data.output[0].content[0].text;
	} else {
		content = JSON.stringify(resp.data, null, 2);
	}

	try {
		return JSON.parse(content);
	} catch {
		return { error: "Não foi possível parsear", raw: content };
	}
}

module.exports = { generateSummary };