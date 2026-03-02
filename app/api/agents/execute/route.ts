import { NextResponse } from 'next/server';
import { historyAgent, cultureAgent, memoryAgent } from '@/lib/agents.server';

export async function POST(req: Request) {
  try {
    const { toolName, args } = await req.json();

    let result = null;

    if (toolName === 'chronosSearch') {
      result = await (historyAgent.tools[0] as any).execute(args);
    } else if (toolName === 'melodyRetriever') {
      result = await (cultureAgent.tools[0] as any).execute(args);
    } else if (toolName === 'archiveMemory') {
      result = await (memoryAgent.tools[0] as any).execute(args);
    } else if (toolName === 'searchMemories') {
      result = await (memoryAgent.tools[1] as any).execute(args);
    } else if (toolName === 'forgetMemory') {
      result = await (memoryAgent.tools[2] as any).execute(args);
    } else {
      return NextResponse.json({ error: `Unknown tool: ${toolName}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Agent execution error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
