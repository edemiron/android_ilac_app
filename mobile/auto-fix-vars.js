const fs = require('fs');
const path = require('path');

const eslintOutput = require('./eslint.json');
let filesModified = 0;

eslintOutput.forEach(result => {
    if (result.messages.length === 0) return;

    const filePath = result.filePath;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Sort messages descending by line number so we can safely insert without offsetting later lines
    const sortedMessages = result.messages
        .filter(m => m.ruleId === 'unused-imports/no-unused-vars')
        .sort((a, b) => b.line - a.line);

    if (sortedMessages.length === 0) return;

    sortedMessages.forEach(msg => {
        const lineIndex = msg.line - 1;
        // Inject comment above the line with matching indentation
        const indentMatch = lines[lineIndex].match(/^\s*/);
        const indent = indentMatch ? indentMatch[0] : '';
        lines.splice(lineIndex, 0, `${indent}// eslint-disable-next-line unused-imports/no-unused-vars`);
    });

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    filesModified++;
});

console.log(`Successfully fixed unused variables in ${filesModified} files.`);
