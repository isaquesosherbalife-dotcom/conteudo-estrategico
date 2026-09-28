export async function onRequestPost(context) {
  try {
    // 1. Obter a chave da API do Gemini a partir das variáveis de ambiente do Cloudflare
    const apiKey = context.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Chave da API da Gemini não configurada no servidor." }),
        { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // 2. Ler os dados do formulário enviados pelo Frontend
    const body = await context.request.json();
    const { segmento, publico, persona, produto, objetivo, tom, diferencial, tema } = body;

    // Validação básica dos campos obrigatórios
    if (!segmento || !publico || !produto || !objetivo) {
      return new Response(
        JSON.stringify({ error: "Por favor, preencha todos os campos obrigatórios." }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // 3. Montar o Prompt estruturado para a Gemini
    const promptSystem = `
Atue como um estrategista de marketing digital e criador de conteúdo especialista.
Sua tarefa é gerar EXATAMENTE 3 ideias de conteúdo altamente personalizadas e estratégicas com base nos dados do negócio fornecidos.

DADOS DO NEGÓCIO:
- Segmento: ${segmento}
- Público-alvo: ${publico}
- Persona: ${persona || "Não informada"}
- Produto/Serviço: ${produto}
- Objetivo do conteúdo: ${objetivo}
- Tom de voz: ${tom || "Profissional e acessível"}
- Diferencial: ${diferencial || "Não informado"}
- Tema/Oferta específica: ${tema || "Geral"}

REGRAS DE RESPOSTA (OBRIGATÓRIO):
Responda EXCLUSIVAMENTE em formato JSON estrito, sem formatação markdown extra fora do JSON, no seguinte esquema de dados:

{
  "ideas": [
    {
      "titulo": "Título/Gancho chamativo do post",
      "formato": "Ex: Carrossel / Reels / Post Estático",
      "objetivo": "Qual objetivo essa ideia cumpre",
      "angulo": "Explicação estratégica do motivo desta ideia funcionar com este público",
      "copy": "Sugestão completa da legenda / roteiro do post",
      "prompt_imagem": "Prompt detalhado em português para gerar a imagem visual correspondente"
    }
  ]
}
`;

    // 4. Chamada à API da Gemini com modelo atualizado
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: promptSystem }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error("Erro na resposta da Gemini API:", errorData);
      return new Response(
        JSON.stringify({ error: `Erro na API Gemini: ${geminiResponse.status}` }),
        { status: 502, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    const geminiData = await geminiResponse.json();

    // 5. Extrair, limpar e validar o JSON retornado
    const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error("Resposta vazia da API.");
    }

    // Remove eventuais blocos ```json ... ``` que o modelo possa devolver
    const cleanJson = textResponse.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsedIdeas = JSON.parse(cleanJson);

    // 6. Retornar a resposta com sucesso para o Frontend
    return new Response(JSON.stringify(parsedIdeas), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
