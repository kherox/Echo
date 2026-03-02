import { supabase } from './supabase';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function archiveMemory(profileId: string, content: string, theme?: string[], emotionScore?: number) {
  // Generate embedding using text-embedding-004
  const embeddingResponse = await ai.models.embedContent({
    model: 'text-embedding-004',
    contents: content,
  });

  const embedding = embeddingResponse.embeddings?.[0]?.values;

  if (!embedding) {
    throw new Error('Failed to generate embedding');
  }

  const { data, error } = await supabase
    .from('memories')
    .insert([
      {
        profile_id: profileId,
        content,
        embedding,
        theme,
        emotion_score: emotionScore,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error saving memory:', error);
    throw error;
  }

  return data;
}

export async function searchMemories(profileId: string, query: string, limit = 3) {
  // Generate embedding for the query
  const embeddingResponse = await ai.models.embedContent({
    model: 'text-embedding-004',
    contents: query,
  });

  const queryEmbedding = embeddingResponse.embeddings?.[0]?.values;

  if (!queryEmbedding) {
    throw new Error('Failed to generate query embedding');
  }

  // Perform vector search in Supabase using a stored procedure (rpc)
  // Assumes a match_memories function exists in Supabase
  const { data, error } = await supabase.rpc('match_memories', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: limit,
    p_profile_id: profileId,
  });

  if (error) {
    console.error('Error searching memories:', error);
    // Fallback: return empty array
    return [];
  }

  return data;
}
