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

export async function forgetMemory(profileId: string, topic: string) {
  // Generate embedding for the topic to find the closest memory to delete
  const embeddingResponse = await ai.models.embedContent({
    model: 'text-embedding-004',
    contents: topic,
  });

  const queryEmbedding = embeddingResponse.embeddings?.[0]?.values;

  if (!queryEmbedding) {
    throw new Error('Failed to generate query embedding');
  }

  // Find the closest memory
  const { data: matches, error: matchError } = await supabase.rpc('match_memories', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 1,
    p_profile_id: profileId,
  });

  if (matchError || !matches || matches.length === 0) {
    console.error('Error finding memory to forget:', matchError);
    return { status: 'not_found', message: 'Aucun souvenir correspondant trouvé.' };
  }

  const memoryId = matches[0].id;

  // Delete the memory
  const { error: deleteError } = await supabase
    .from('memories')
    .delete()
    .eq('id', memoryId);

  if (deleteError) {
    console.error('Error deleting memory:', deleteError);
    throw deleteError;
  }

  return { status: 'success', message: 'Souvenir oublié avec succès.' };
}
