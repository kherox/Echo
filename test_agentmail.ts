import { MCPToolset } from '@google/adk';

async function test() {
    const mcpToolset = new MCPToolset({
        type: 'StdioConnectionParams',
        serverParams: {
            command: 'npx',
            args: ['-y', 'agentmail-mcp'],
            env: { AGENTMAIL_API_KEY: 'test' }
        }
    });

    const tools = await mcpToolset.getTools();
    const tool = tools.find(t => t.name === 'send_message');
    if (tool) {
        const dec = (tool as any)._getDeclaration?.();
        console.log(JSON.stringify(dec?.parameters, null, 2));
    }
    await mcpToolset.close();
}

test().catch(console.error);
