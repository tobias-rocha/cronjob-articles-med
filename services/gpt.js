const axios = require('axios');

async function generateSummary(textAbstract) {
	const apiKey = process.env.GPT_API_KEY;

	const resp = await axios.post(
		'https://api.openai.com/v1/responses',
		{
			model: 'gpt-5-nano',
			input: `Você é um especialista em revisão científica para profissionais da saúde, com experiência multidisciplinar (medicina, nutrição, fisioterapia, psicologia, educação física e odontologia).  
				Sua função é ler o texto de um artigo científico informado ao final desse prompt (Texto do artigo para análise), classificar se ele é relevante para a prática clínica de profissionais da saúde (PASSO 1) seguindo os critérios (Critérios PASSO 1) abaixo e caso seja relevante (relevância: sim), siga para o (PASSO 2), NUNCA envie junto o campo relevância: sim. Caso o artigo não seja relevante (relevância: não), finalize apenas retornando a reposta JSON do PASSO 1:
				
				Critérios PASSO 1:
				- Relevante: artigos com implicações para diagnóstico, tratamento, prevenção, manejo clínico, impacto psicossocial, cuidado de pacientes ou estudos em animais com potencial de aplicação futura em humanos.
				- Não relevante: estudos fora da saúde ou laboratoriais muito específicos sem conexão prática com saúde humana.
				
				Formato de resposta (JSON):
				{
				  "relevancia": "Sim" ou "Não"
				}
				
				PASSO 2:
				Gerar um resumo objetivo, técnico e aplicável na prática clínica.  
				
				A resposta deve ser **exclusivamente em formato JSON válido**, obedecendo à seguinte estrutura e instruções detalhadas:  
				
				{
				  "titulo_original_traduzido": "Traduza integralmente o título original do artigo para o português Brasil.",
				  "objetivo_do_estudo": "Descreva o objetivo em até 2 frases.",
				  "metodologia": "Informe tipo de estudo, população/amostra, duração, principais intervenções e variáveis analisadas.",
				  "principais_achados": "Destaque os resultados mais relevantes. Sempre que possível, inclua dados numéricos ou estatísticos importantes (ex.: valores de p, IC95%, diferenças percentuais).",
				  "implicacoes_na_pratica_clinica": {
					"medicina": "Explique como os achados podem ser aplicados na prática médica.",
					"nutricao": "...",
					"fisioterapia": "...",
					"psicologia": "...",
					"educacao_fisica": "...",
					"odontologia": "..."
					"enfermagem": "..."
					"farmacia": "..."
				  },
				  "nivel_de_evidencia_e_limitacoes": {
					"classificacao": "Classifique o nível de evidência (ex.: revisão sistemática/metanálise, ensaio clínico randomizado, estudo de coorte, caso-controle, transversal, série de casos, opinião de especialistas).",
					"limitacoes": "Liste as principais limitações do estudo.",
					"nota_nivel_de_evidencia": "Atribua nota baseada no tipo de estudo (meta=10, RCT=9, coorte=7, caso-controle=6, transversal=4, opinião=2) e ajuste -1 para cada limitação importante (ex.: N pequeno, viés, ausência de controle, estatística fraca)."
				  },
				  "conclusao_final": "Um parágrafo conciso com a mensagem-chave para o profissional de saúde.",
				  "palavras_chave": [
					"Liste 10 palavras-chave relevantes que representem o conteúdo central do artigo. Se o artigo fornecer palavras-chave dos autores, utilize-as e complemente até fechar 10. Utilize 5 palavras simples e 5 compostas"
				  ],
				}
				
				**Regras adicionais:**
				- Use linguagem técnica, científica e fiel ao artigo (sem inventar dados).
				- Sempre incluir implicações práticas adaptadas a cada área da saúde, mesmo que algumas sejam breves.
				- Traduzir integralmente todo o texto para português Brasil.
				- Sempre que utilizar abreviações, coloque a palavra original e a abreviação entre parênteses.
				- Se houver termos sem tradução exata ou consagrados em inglês, apresentar a tradução em português seguida do termo original entre parênteses.  
				  Exemplo: análise fenomenológica interpretativa (Interpretative Phenomenological Analysis - IPA).
				
				Texto do artigo para análise:\n\n${textAbstract}`
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