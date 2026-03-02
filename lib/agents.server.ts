import { LlmAgent, FunctionTool } from '@google/adk';
import { chronosSearch, melodyRetriever } from './tools';
import { archiveMemory, searchMemories, forgetMemory } from './memory';
import { 
  historyAgentDeclaration, 
  cultureAgentDeclaration, 
  archiveMemoryDeclaration, 
  searchMemoriesDeclaration, 
  forgetMemoryDeclaration 
} from './agent-declarations';

// 1. History Agent (Chronos)
export const historyAgent = new LlmAgent({
  name: 'HistoryAgent',
  model: 'gemini-1.5-flash',
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
  model: 'gemini-1.5-flash',
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
  model: 'gemini-1.5-flash',
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
