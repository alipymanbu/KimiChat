#!/usr/bin/env node

require('dotenv').config();
const { program } = require('commander');
const { input, confirm } = require('@inquirer/prompts');
const KimiClient = require('./client.js');

const TOKEN = process.env.KIMI_TOKEN || process.env.ACCESS_TOKEN;

if (!TOKEN) {
    console.error("Error: KIMI_TOKEN or ACCESS_TOKEN environment variable is required.");
    console.error("Please create a .env file and add your token: KIMI_TOKEN=eyJ...");
    process.exit(1);
}

const client = new KimiClient(TOKEN);

program
  .name('kimi')
  .description('Kimi AI Command Line Interface')
  .version('1.0.0');

// Global options
program
  .option('-m, --model <type>', 'Model to use (SCENARIO_K2D5 or SCENARIO_K2D5_TURBO)', 'SCENARIO_K2D5')
  .option('-d, --deepThink', 'Enable Deep Thinking mode', false)
  .option('-s, --search', 'Enable Web Search capabilities', false);

program
  .command('ask')
  .description('Ask a single question and stream the response')
  .argument('<prompt>', 'The question to ask')
  .action(async (prompt, options) => {
    const parentOpts = program.opts();
    const config = { ...parentOpts, ...options };
    
    try {
        await client.startNewChat(config.model);
        
        const stream = client.sendMessage(prompt, config);
        
        let isThinking = false;
        for await (const chunk of stream) {
            if (chunk.type === 'think') {
                if (!isThinking) {
                    process.stdout.write('\x1b[90m'); // Dim/Gray start
                    isThinking = true;
                }
                process.stdout.write(chunk.content);
            } else if (chunk.type === 'text') {
                if (isThinking) {
                    process.stdout.write('\x1b[0m\n\n'); // Reset color and add space
                    isThinking = false;
                }
                process.stdout.write(chunk.content);
            }
        }
        if (isThinking) process.stdout.write('\x1b[0m'); // Ensure color resets
        console.log(); // Final newline
    } catch (error) {
        console.error("\nError:", error.message);
    }
  });

program
  .command('chat')
  .description('Start an interactive chat session')
  .action(async (options) => {
    const parentOpts = program.opts();
    const config = { ...parentOpts, ...options };
    
    try {
        console.log("Iniciando conexión con Kimi...");
        await client.startNewChat(config.model);
        console.log(`¡Conectado! (Chat ID: ${client.chatId})`);
        console.log(`Opciones activas: Search=${config.search}, DeepThink=${config.deepThink}\n`);
        console.log("Escribí 'exit' o 'quit' para salir.\n");

        while (true) {
            const answer = await input({ message: 'Tú: ' });
            
            if (answer.trim().toLowerCase() === 'exit' || answer.trim().toLowerCase() === 'quit') {
                break;
            }

            if (!answer.trim()) continue;

            process.stdout.write('Kimi: ');
            const stream = client.sendMessage(answer, config);
            
            let isThinking = false;
            for await (const chunk of stream) {
                if (chunk.type === 'think') {
                    if (!isThinking) {
                        process.stdout.write('\x1b[90m'); // Dim/Gray start
                        isThinking = true;
                    }
                    process.stdout.write(chunk.content);
                } else if (chunk.type === 'text') {
                    if (isThinking) {
                        process.stdout.write('\x1b[0m\n\n'); // Reset color and add space
                        isThinking = false;
                    }
                    process.stdout.write(chunk.content);
                }
            }
            if (isThinking) process.stdout.write('\x1b[0m'); // Ensure color resets
            console.log('\n');
        }
    } catch (error) {
        console.error("\nError:", error.message);
    }
  });

program.parse();
