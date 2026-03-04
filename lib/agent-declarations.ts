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

// 4. Atlas Agent (Google Search Grounding)
export const atlasAgentDeclaration: FunctionDeclaration = {
  name: 'atlasSearch',
  description: 'Effectue une recherche Google officielle pour obtenir des informations en temps réel, des articles de presse ou des faits d\'actualité avec un rendu visuel riche.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'La recherche précise à effectuer sur Google' }
    },
    required: ['query'],
  },
};

// 5. Media Agent (Studio)
export const mediaControlDeclaration: FunctionDeclaration = {
  name: 'controlMedia',
  description: 'Recherche et prépare la lecture d\'un contenu média (vidéo YouTube ou musique) en s\'appuyant sur les recherches Google.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      mediaType: { type: Type.STRING, enum: ['video', 'music'], description: 'Le type de média à rechercher' },
      query: { type: Type.STRING, description: 'Le titre ou le sujet du média' },
    },
    required: ['mediaType', 'query'],
  },
};

// 6. Communication Agent (Email)
export const sendEmailDeclaration: FunctionDeclaration = {
  name: 'sendEmail',
  description: 'Envoie un e-mail au nom de l\'utilisateur. Utile pour résumer une discussion, partager un souvenir ou demander de l\'aide à un proche.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      to: { type: Type.STRING, description: 'L\'adresse e-mail du destinataire' },
      subject: { type: Type.STRING, description: 'L\'objet de l\'e-mail' },
      body: { type: Type.STRING, description: 'Le contenu du message' },
    },
    required: ['to', 'subject', 'body'],
  },
};

// 7. Communication Agent (Inbox)
export const listEmailsDeclaration: FunctionDeclaration = {
  name: 'listEmails',
  description: 'Liste les messages reçus dans la boîte de réception de l\'utilisateur pour prendre de ses nouvelles ou rester connecté.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: { type: Type.NUMBER, description: 'Nombre maximum de messages à récupérer' },
    },
  },
};

