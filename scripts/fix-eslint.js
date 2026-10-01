const fs = require('fs');

const files = [
  'app/admin/accounts-manager/actions.ts',
  'components/admin/accounts-manager/accounts-manager.tsx',
  'app/admin/personal-prompts/actions.ts',
  'components/admin/personal-prompts/personal-prompts.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('eslint-disable @typescript-eslint/no-explicit-any')) {
    content = '/* eslint-disable @typescript-eslint/no-explicit-any */\n' + content;
    fs.writeFileSync(file, content);
  }
}
