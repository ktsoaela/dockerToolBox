#!/usr/bin/env node

import { program } from "commander";

// Your main CLI functionality
program
  .version("1.0.0")
  .description("My Node CLI")
  .option("-n, --name <type>", "Add your name")
  .action((options) => {
    console.log(`Hey, ${options.name}!`);
  });

// To run commands from the web interface
export const runCommand = (command) => {
  const args = command.split(' ');
  const options = args.reduce((acc, arg) => {
    if (arg.startsWith('--')) {
      acc.push(arg);
    }
    return acc;
  }, []);
  
  if (options.includes('--name')) {
    const nameIndex = options.indexOf('--name') + 1;
    if (args[nameIndex]) {
      console.log(`Hey, ${args[nameIndex]}!`);
      return `Hey, ${args[nameIndex]}!`; // Return the greeting
    }
  }
  return 'Unknown command';
};

program.parse(process.argv);
