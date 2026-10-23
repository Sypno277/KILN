const fs = require('fs');
const path = require('path');

const b64 = fs.readFileSync(path.join(__dirname, '../scratch/official_minimal.pptx')).toString('base64');
const content = `// Official ECMA-376 PowerPoint Presentation Template
// Validated with native Microsoft PowerPoint
export const PPTX_TEMPLATE_B64 = "${b64}";
`;

fs.writeFileSync(path.join(__dirname, '../public/assets/pptx-template.js'), content);
console.log('Successfully wrote public/assets/pptx-template.js, length:', content.length);
