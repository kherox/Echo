import { LlmAgent, FunctionTool, Gemini, GOOGLE_SEARCH } from '@google/adk';
import { chronosSearch, melodyRetriever, controlMedia } from './tools';
import { archiveMemory, searchMemories, forgetMemory } from './memory';
import {
  historyAgentDeclaration,
  cultureAgentDeclaration,
  archiveMemoryDeclaration,
  searchMemoriesDeclaration,
  forgetMemoryDeclaration,
  atlasAgentDeclaration,
  mediaControlDeclaration
} from './agent-declarations';

const getApiKey = () => {
  const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') return '';
  return key;
};

const apiKey = getApiKey();

if (!apiKey) {
  console.warn('WARNING: No valid Gemini API key found for agents.server.ts');
}

const model = new Gemini({
  model: 'gemini-2.0-flash',
  apiKey,
});

// 1. History Agent (Chronos)
export const historyAgent = new LlmAgent({
  name: 'HistoryAgent',
  model: model,
  instruction: 'Spécialiste de la recherche historique et des faits d\'époque.',
  tools: [
    new FunctionTool({
      name: historyAgentDeclaration.name,
      description: historyAgentDeclaration.description || '',
      parameters: historyAgentDeclaration.parameters,
      execute: async (args: any) => await chronosSearch(args.query, args.yearHint),
    }),
  ],
});

// 2. Culture Agent (Melody)
export const cultureAgent = new LlmAgent({
  name: 'CultureAgent',
  model: model,
  instruction: 'Expert en musique et culture populaire des décennies passées.',
  tools: [
    new FunctionTool({
      name: cultureAgentDeclaration.name,
      description: cultureAgentDeclaration.description || '',
      parameters: cultureAgentDeclaration.parameters,
      execute: async (args: any) => await melodyRetriever(args.era, args.keywords),
    }),
  ],
});

// 3. Memory Agent
export const memoryAgent = new LlmAgent({
  name: 'MemoryAgent',
  model: model,
  instruction: 'Gère la mémoire biographique de l\'utilisateur (stockage, recherche, oubli).',
  tools: [
    new FunctionTool({
      name: archiveMemoryDeclaration.name,
      description: archiveMemoryDeclaration.description || '',
      parameters: archiveMemoryDeclaration.parameters,
      execute: async (args: any) => {
        const profileId = '00000000-0000-0000-0000-000000000000';
        return await archiveMemory(profileId, args.content, args.theme, args.emotionScore);
      },
    }),
    new FunctionTool({
      name: searchMemoriesDeclaration.name,
      description: searchMemoriesDeclaration.description || '',
      parameters: searchMemoriesDeclaration.parameters,
      execute: async (args: any) => {
        const profileId = '00000000-0000-0000-0000-000000000000';
        return await searchMemories(profileId, args.query);
      },
    }),
    new FunctionTool({
      name: forgetMemoryDeclaration.name,
      description: forgetMemoryDeclaration.description || '',
      parameters: forgetMemoryDeclaration.parameters,
      execute: async (args: any) => {
        const profileId = '00000000-0000-0000-0000-000000000000';
        return await forgetMemory(profileId, args.topic);
      },
    }),
  ],
});

// 4. Media Agent (Studio)
export const mediaAgent = new LlmAgent({
  name: 'MediaAgent',
  model: model,
  instruction: 'Expert en contenu multimédia, vidéos et musique.',
  tools: [
    new FunctionTool({
      name: mediaControlDeclaration.name,
      description: mediaControlDeclaration.description || '',
      parameters: mediaControlDeclaration.parameters,
      execute: async (args: any) => await controlMedia(args.mediaType, args.query),
    }),
  ],
});

// 5. Atlas Agent (Search Specialist)
export const atlasAgent = new LlmAgent({
  name: 'AtlasAgent',
  model: model,
  description: atlasAgentDeclaration.description,
  instruction: 'Tu es un spécialiste de la recherche web. Utilise l\'outil de recherche Google pour fournir des réponses précises et à jour.',
  tools: [GOOGLE_SEARCH],
});
