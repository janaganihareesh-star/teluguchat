const fs = require('fs');
const path = require('path');

const clientSrcPath = path.join(__dirname, 'client', 'src');

function getApiImportPath(filePath) {
  const relativePath = path.relative(path.dirname(filePath), path.join(clientSrcPath, 'services', 'api'));
  return relativePath.replace(/\\/g, '/');
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      if (fullPath === path.join(clientSrcPath, 'services', 'api.js')) continue;

      let content = fs.readFileSync(fullPath, 'utf8');
      
      const regex = /axios(Instance)?\.(get|post|put|delete|patch)\((['"`])http:\/\/localhost:3500\/api\//g;
      
      if (regex.test(content)) {
        console.log(`Processing ${fullPath}...`);
        
        // Add import at the top
        const importPath = getApiImportPath(fullPath);
        const importStatement = `import api from '${importPath.startsWith('.') ? importPath : './' + importPath}';\n`;
        
        // Make sure we don't add the import twice if we run the script multiple times
        if (!content.includes(importStatement.trim())) {
           // Insert after other imports if possible, or just at the top
           // A simple approach is just prepend it
           let lines = content.split('\n');
           let importIndex = 0;
           for (let i = 0; i < lines.length; i++) {
               if (lines[i].trim().startsWith('import ')) {
                   importIndex = i + 1;
               } else if (lines[i].trim() !== '') {
                   break;
               }
           }
           if (importIndex === 0) {
               content = importStatement + content;
           } else {
               lines.splice(importIndex, 0, importStatement.trim());
               content = lines.join('\n');
           }
        }
        
        // Replace all usages
        content = content.replace(regex, 'api.$2($3/api/');
        
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

processDirectory(clientSrcPath);
console.log("Done.");
