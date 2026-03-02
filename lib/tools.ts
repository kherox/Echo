import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

// ChronosSearch: Recherche un fait historique lié au récit
export async function chronosSearch(query: string, yearHint?: number) {
  try {
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

// MelodyRetriever: Propose un extrait musical d'époque
export async function melodyRetriever(era: string, keywords: string) {
  try {
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
