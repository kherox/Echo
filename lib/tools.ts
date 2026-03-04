import { GoogleGenAI } from '@google/genai';
import { LlmAgent, Gemini, GOOGLE_SEARCH, Runner, InMemorySessionService } from '@google/adk';

function getApiKey() {
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.GOOGLE_API_KEY || '';
}

function getAi() {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('Gemini API key is missing or invalid.');
  }
  return new GoogleGenAI({ apiKey });
}

// AtlasSearch: Recherche réelle via ADK Google Search native
export async function atlasSearch(query: string) {
  try {
    const apiKey = getApiKey();
    const model = new Gemini({ model: 'gemini-2.0-flash', apiKey });
    const agent = new LlmAgent({
      name: 'AtlasSearchAgent',
      model,
      instruction: 'Tu es un expert en recherche web. Effectue une recherche Google pour répondre à la demande et fournis des résultats structurés.',
      tools: [GOOGLE_SEARCH]
    });

    const sessionService = new InMemorySessionService();
    const runner = new Runner({ agent, appName: 'Echo', sessionService });
    const session = await sessionService.createSession({ appName: 'Echo', userId: 'user', sessionId: 'search-' + Date.now() });

    const resultEvents = runner.runAsync({
      userId: 'user',
      sessionId: session.id,
      newMessage: { role: 'user', parts: [{ text: query }] }
    });

    let answer = '';
    let renderedContent = null;

    for await (const event of resultEvents) {
      if ((event as any).content?.parts?.[0]?.text) {
        answer += (event as any).content.parts[0].text;
      }
      // @ts-ignore
      if (event.renderedContent) {
        // @ts-ignore
        renderedContent = event.renderedContent;
      }
    }

    return {
      answer,
      renderedContent
    };
  } catch (error) {
    console.error('AtlasSearch error:', error);
    return { error: 'Échec de la recherche native Google.' };
  }
}

// ChronosSearch: Recherche un fait historique lié au récit
export async function chronosSearch(query: string, yearHint?: number) {
  try {
    const ai = getAi();
    const prompt = `Trouve un fait historique intéressant et pertinent lié à "${query}"${yearHint ? ` autour de l'année ${yearHint}` : ''}. Réponds uniquement avec le fait historique en une phrase courte.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return { fact: response.text?.trim() };
  } catch (error) {
    console.error('ChronosSearch error:', error);
    return null; // Fallback silencieux
  }
}

// WebSearch est déprécié au profit d'atlasSearch
export const webSearch = atlasSearch;

// MediaControl: Recherche de vidéos/musique via recherche Google native
export async function controlMedia(mediaType: string, query: string) {
  try {
    const apiKey = getApiKey();
    const model = new Gemini({ model: 'gemini-2.0-flash', apiKey });

    // On demande spécifiquement une recherche YouTube via grounding
    const prompt = `Trouve une vidéo YouTube officielle pour : "${query}". Renvoie uniquement un objet JSON avec "title" et "videoId" (l'ID de 11 caractères).`;

    const responseStream = await model.generateContentAsync({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      // @ts-ignore
      tools: [{ google_search: {} }],
    });

    let text = '';
    for await (const chunk of responseStream) {
      if (chunk.content?.parts?.[0]?.text) {
        text += chunk.content.parts[0].text;
      }
    }
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return {
        status: 'success',
        type: mediaType,
        title: data.title,
        videoId: data.videoId,
        thumbnail: `https://img.youtube.com/vi/${data.videoId}/hqdefault.jpg`,
        link: `https://www.youtube.com/watch?v=${data.videoId}`
      };
    }

    return { status: 'not_found', message: 'Aucun média trouvé via Google Search.' };
  } catch (error) {
    console.error('ControlMedia error:', error);
    return { error: 'Échec de la recherche média native.' };
  }
}

// MelodyRetriever: Propose un extrait musical d'époque
export async function melodyRetriever(era: string, keywords: string) {

  try {
    const ai = getAi();
    const prompt = `Suggère une chanson populaire et emblématique des années ${era} liée au thème "${keywords}". Réponds au format JSON avec les clés "title", "artist", "era".`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    if (!response.text) return null;

    const data = JSON.parse(response.text);
    return {
      title: data.title,
      artist: data.artist,
      era: data.era,
      preview_url: null // Pas de vraie URL dans le MVP sans API Spotify
    };
  } catch (error) {
    console.error('MelodyRetriever error:', error);
    return null; // Fallback silencieux
  }
}

// Communication: Envoi d'e-mail (Intégration ADK AgentMail)
export async function sendEmail(to: string, subject: string, body: string) {
  const apiKey = process.env.AGENTMAIL_API_KEY;

  if (!apiKey || apiKey === 'YOUR_AGENTMAIL_API_KEY') {
    console.log(`[EMAIL MOCK] To: ${to}, Subject: ${subject}, Body: ${body}`);
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      status: 'success',
      message: `E-mail simulé envoyé avec succès à ${to} (Configurez AGENTMAIL_API_KEY pour l'envoi réel)`,
      details: { to, subject, sentAt: new Date().toISOString() }
    };
  }

  const { MCPToolset } = await import('@google/adk');

  const toolset = new MCPToolset({
    type: 'StdioConnectionParams',
    serverParams: {
      command: 'npx',
      args: ['-y', 'agentmail-mcp'],
      env: { AGENTMAIL_API_KEY: apiKey }
    }
  });

  try {
    const tools = await toolset.getTools();

    // 1. Trouver ou créer une boîte de réception
    const listInboxes = tools.find(t => t.name === 'list_inboxes');
    const inboxesResponse: any = await listInboxes?.runAsync({ args: {}, toolContext: {} as any });
    // La réponse de list_inboxes dépend de l'implémentation de l'MCP, on suppose un tableau
    const inboxes = Array.isArray(inboxesResponse) ? inboxesResponse : (inboxesResponse?.inboxes || []);

    let inboxId = inboxes[0]?.id;

    if (!inboxId) {
      const createInbox = tools.find(t => t.name === 'create_inbox');
      const newInbox: any = await createInbox?.runAsync({ args: { name: 'Echo Main' }, toolContext: {} as any });
      inboxId = newInbox?.id;
    }

    if (!inboxId) throw new Error('Impossible de trouver ou créer une boîte de réception AgentMail.');

    // 2. Envoyer le message
    const sendMessageTool = tools.find(t => t.name === 'send_message');
    const result = await sendMessageTool?.runAsync({
      args: { inboxId, to, subject, body },
      toolContext: {} as any
    });

    return {
      status: 'success',
      message: `E-mail envoyé avec succès via AgentMail à ${to}`,
      details: result
    };
  } catch (error: any) {
    console.error('AgentMail error:', error);
    return { status: 'error', message: `Échec AgentMail: ${error.message}` };
  } finally {
    try {
      await toolset.close();
    } catch (e) {
      // Ignorer l'erreur de fermeture
    }
  }
}

// Récupération des e-mails (Intégration ADK AgentMail)
export async function listEmails(limit: number = 5) {
  const apiKey = process.env.AGENTMAIL_API_KEY;

  if (!apiKey || apiKey === 'YOUR_AGENTMAIL_API_KEY') {
    return [
      { from: 'Julie', subject: 'Coucou !', date: '2024-03-03', snippet: 'Comment vas-tu grand-père ?' },
      { from: 'Banque', subject: 'Relevé Mensuel', date: '2024-03-01', snippet: 'Votre relevé est disponible...' }
    ];
  }

  const { MCPToolset } = await import('@google/adk');
  const toolset = new MCPToolset({
    type: 'StdioConnectionParams',
    serverParams: {
      command: 'npx',
      args: ['-y', 'agentmail-mcp'],
      env: { AGENTMAIL_API_KEY: apiKey }
    }
  });

  try {
    const tools = await toolset.getTools();
    const listInboxes = tools.find(t => t.name === 'list_inboxes');
    const inboxesResponse: any = await listInboxes?.runAsync({ args: {}, toolContext: {} as any });
    const inboxes = Array.isArray(inboxesResponse) ? inboxesResponse : (inboxesResponse?.inboxes || []);
    const inboxId = inboxes[0]?.id;

    if (!inboxId) return [];

    const listThreads = tools.find(t => t.name === 'list_threads');
    return await listThreads?.runAsync({ args: { inboxId, limit }, toolContext: {} as any });
  } catch (error: any) {
    console.error('ListEmails error:', error);
    return [];
  } finally {
    try {
      await toolset.close();
    } catch (e) { }
  }
}
