#!/usr/bin/env node
/**
 * GLM Bridge MCP Server (Z.AI GLM-5.3-Flash High Mode)
 * Implements JSON-RPC 2.0 Stdio Model Context Protocol (MCP)
 */

const https = require('https');
const readline = require('readline');

const API_KEY = process.env.GLM_API_KEY || '5fd11fd7665e4476b68979e1aa75c6d8.Wjb7ec4Z4sBjXUWf';
const BASE_URL = process.env.GLM_BASE_URL || 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const MODEL = process.env.GLM_MODEL || 'glm-5.3-flash';

// Tool Definitions
const TOOLS = [
  {
    name: 'ask_glm',
    description: 'Send a prompt, question, or complex reasoning task to GLM-5.3-Flash in High Mode (Deep Thinking enabled). Use for second opinions, complex logic, alternative implementations, and deep verification.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The question, instruction, or task for GLM-5.3-Flash (High Mode).'
        },
        context: {
          type: 'string',
          description: 'Optional code or context to provide to GLM.'
        },
        system_instruction: {
          type: 'string',
          description: 'Optional system prompt / persona for GLM.'
        },
        include_thinking: {
          type: 'boolean',
          description: 'Whether to include the internal thinking/reasoning trace in the response (default: false).'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'glm_code_review',
    description: 'Ask GLM-5.3-Flash (High Mode) to perform a thorough peer code review on code snippets with deep reasoning, detecting subtle bugs, edge cases, security flaws, and performance bottlenecks.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The source code to review.'
        },
        filename: {
          type: 'string',
          description: 'Optional filename or file extension.'
        },
        focus: {
          type: 'string',
          description: "Specific focus area (e.g., 'security', 'performance', 'edge cases', 'architecture', 'all')."
        }
      },
      required: ['code']
    }
  },
  {
    name: 'glm_brainstorm_solution',
    description: 'Deeply brainstorm architectural solutions, trade-off comparisons, or creative strategies with GLM-5.3-Flash (High Mode).',
    inputSchema: {
      type: 'object',
      properties: {
        problem: {
          type: 'string',
          description: 'The problem description or architecture challenge.'
        },
        constraints: {
          type: 'string',
          description: 'Any technical or performance constraints.'
        }
      },
      required: ['problem']
    }
  }
];

// Helper to call Z.AI GLM Coding API
async function callGLMApi(messages, systemInstruction) {
  return new Promise((resolve, reject) => {
    const formattedMessages = [];
    if (systemInstruction) {
      formattedMessages.push({ role: 'system', content: systemInstruction });
    }
    formattedMessages.push(...messages);

    const postData = JSON.stringify({
      model: MODEL,
      messages: formattedMessages,
      temperature: 0.6,
      max_tokens: 4096,
    });

    const req = https.request({
      hostname: 'api.z.ai',
      path: '/api/coding/paas/v4/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(`API Error [${res.statusCode}]: ${JSON.stringify(parsed)}`));
            return;
          }
          const choice = parsed.choices && parsed.choices[0];
          const content = choice?.message?.content || '';
          const reasoning = choice?.message?.reasoning_content || '';
          resolve({ content, reasoning });
        } catch (err) {
          reject(new Error(`JSON Parse Error: ${err.message}. Raw: ${data.slice(0, 300)}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

// Tool Handlers
async function handleAskGlm(args) {
  const { prompt, context, system_instruction, include_thinking } = args;
  let userContent = prompt;
  if (context) {
    userContent = `[CONTEXT/CODE]:\n${context}\n\n[USER INSTRUCTION]:\n${prompt}`;
  }

  const defaultSystem = system_instruction || "You are ZCode (GLM-5.3 Flash High Mode), an elite AI software architect, senior systems engineer, and peer programming partner. Provide concise, highly accurate, and elegant solutions.";
  const result = await callGLMApi([{ role: 'user', content: userContent }], defaultSystem);

  let output = result.content;
  if (include_thinking && result.reasoning) {
    output = `<glm_thinking>\n${result.reasoning}\n</glm_thinking>\n\n${result.content}`;
  }
  return output;
}

async function handleGlmCodeReview(args) {
  const { code, filename, focus } = args;
  const focusPrompt = focus ? `Focus especially on: ${focus}.` : "Perform a comprehensive review covering security, performance, edge cases, and code quality.";
  const prompt = `Please review the following code (${filename || 'source file'}):\n\n\`\`\`\n${code}\n\`\`\`\n\n${focusPrompt}\nProvide clear findings, severity levels, and concrete diff recommendations.`;

  const result = await callGLMApi(
    [{ role: 'user', content: prompt }],
    "You are ZCode (GLM-5.3 Flash High Mode) Code Reviewer. Analyze the code with extreme precision. Highlight hidden concurrency bugs, memory leaks, security vulnerabilities, or subtle logic flaws."
  );

  return result.content;
}

async function handleGlmBrainstorm(args) {
  const { problem, constraints } = args;
  const prompt = `Problem Statement:\n${problem}\n\nConstraints:\n${constraints || 'None specified.'}\n\nPlease brainstorm the top 2-3 architectural approaches, evaluate trade-offs (pros/cons), and recommend the optimal production-grade solution.`;

  const result = await callGLMApi(
    [{ role: 'user', content: prompt }],
    "You are ZCode (GLM-5.3 Flash High Mode) Architecture Strategist. Deliver structured, insightful, and practical technical architectures."
  );

  return result.content;
}

// JSON-RPC Dispatcher
async function handleMessage(msg) {
  const { id, method, params } = msg;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'glm-bridge',
          version: '1.0.0'
        }
      }
    };
  }

  if (method === 'notifications/initialized') {
    return null; // Notification, no response
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: TOOLS
      }
    };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    try {
      let resultText = '';
      if (name === 'ask_glm') {
        resultText = await handleAskGlm(args || {});
      } else if (name === 'glm_code_review') {
        resultText = await handleGlmCodeReview(args || {});
      } else if (name === 'glm_brainstorm_solution') {
        resultText = await handleGlmBrainstorm(args || {});
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: resultText
            }
          ],
          isError: false
        }
      };
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${err.message}`
            }
          ],
          isError: true
        }
      };
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`
    }
  };
}

// Stdio Stream Listener
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const msg = JSON.parse(trimmed);
    const response = await handleMessage(msg);
    if (response) {
      process.stdout.write(JSON.stringify(response) + '\n');
    }
  } catch (err) {
    process.stderr.write(`[GLM MCP] Error: ${err.message}\n`);
  }
});
