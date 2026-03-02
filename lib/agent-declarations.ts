import { Type, FunctionDeclaration } from "@google/genai";

// 1. History Agent (Chronos)
export const historyAgentDeclaration: FunctionDeclaration = {
  name: 'chronosSearch',
  description: 'Recherche un fait historique lié au récit de l\'utilisateur. Ne déclencher que si l\'utilisateur mentionne une date ou un lieu.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'Le sujet de la recherche historique' },
      yearHint: { type: Type.NUMBER, description: 'L\'année mentionnée par l\'utilisateur, si applicable' },
    },
    required: ['query'],
  },
};

// 2. Culture Agent (Melody)
export const cultureAgentDeclaration: FunctionDeclaration = {
  name: 'melodyRetriever',
  description: 'Propose une chanson d\'époque quand l\'utilisateur évoque une période ou un événement.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      era: { type: Type.STRING, description: 'La décennie (ex: "1960s", "1970s")' },
      keywords: { type: Type.STRING, description: 'Le thème ou l\'événement évoqué' },
    },
    required: ['era', 'keywords'],
  },
};

// 3. Memory Agent
export const archiveMemoryDeclaration: FunctionDeclaration = {
  name: 'archiveMemory',
  description: 'Extrait et stocke un fait biographique nouveau mentionné par l\'utilisateur.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: 'Le résumé du souvenir (max 2000 caractères)' },
      theme: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Tags thématiques (ex: famille, jeunesse, métier)' },
      emotionScore: { type: Type.NUMBER, description: 'Intensité émotionnelle estimée de 1 à 5' },
    },
    required: ['content'],
  },
};

export const searchMemoriesDeclaration: FunctionDeclaration = {
  name: 'searchMemories',
  description: 'Recherche des souvenirs sémantiquement proches du sujet en cours.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'Le sujet en cours de discussion' },
    },
    required: ['query'],
  },
};

export const forgetMemoryDeclaration: FunctionDeclaration = {
  name: 'forgetMemory',
  description: 'Supprime un souvenir de la mémoire de l\'utilisateur suite à sa demande explicite d\'oubli.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      topic: { type: Type.STRING, description: 'Le sujet du souvenir à oublier' },
    },
    required: ['topic'],
  },
};
