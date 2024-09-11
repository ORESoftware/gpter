#!/usr/bin/env node
'use strict';

import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as assert from 'assert';
import * as EE from 'events';
import * as strm from "stream";
import axios from 'axios';
import * as readlineSync from 'readline-sync';
import * as dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string;
const API_URL = 'https://api.openai.com/v1/chat/completions';

interface FileContentMap {
  [filePath: string]: string;
}

let projectFilesContent: FileContentMap = {};

// Function to recursively read all files in a directory, excluding node_modules
function readFilesRecursively(directory: string): FileContentMap {
  const files = fs.readdirSync(directory);
  let fileContents: FileContentMap = {};

  files.forEach((file) => {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory() && file !== 'node_modules') {
      Object.assign(fileContents, readFilesRecursively(filePath));
    } else if (fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath, 'utf-8');
      fileContents[filePath] = content;
    }
  });

  return fileContents;
}

// Function to read all files and store them in a variable
function rereadFiles(): void {
  console.log('Reading all project files...');
  projectFilesContent = readFilesRecursively(process.cwd());
  console.log('Finished reading files.');
}

// Function to interact with ChatGPT
async function askChatGPT(prompt: string): Promise<string | null> {
  try {
    const response = await axios.post(
      API_URL,
      {
        model: 'gpt-4', // Change to the model you're using
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error: any) {
    console.error('Error interacting with ChatGPT:', error.message);
    return null;
  }
}

// Main loop to interact with the user
async function main(): Promise<void> {
  rereadFiles(); // Initial read of all files

  while (true) {
    const input = readlineSync.question('Ask a question or type "reread" to read all files again: ');

    if (input.toLowerCase() === 'reread') {
      rereadFiles();
      continue;
    }

    const prompt = `You have the following files and their contents: \n\n${Object.entries(projectFilesContent)
      .map(([fileName, content]) => `File: ${fileName}\nContent:\n${content.substring(0, 500)}...\n`)
      .join('\n')} \n\nNow, answer the following question based on the project files: ${input}`;

    const answer = await askChatGPT(prompt);
    console.log('ChatGPT:', answer);
  }
}

main().catch((error) => console.error('An error occurred:', error));
