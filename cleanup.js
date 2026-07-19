const fs = require('fs');
const path = require('path');

const filesToDelete = [
  'src/app/(dashboard)/purchases/new/page.tsx',
  'src/components/inventory/ReceiveGoodsForm.tsx',
  'src/app/api/purchases/route.ts'
];

filesToDelete.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`Deleted ${file}`);
  }
});

// delete directory
const newDir = path.join(__dirname, 'src/app/(dashboard)/purchases/new');
if (fs.existsSync(newDir)) {
  fs.rmdirSync(newDir);
  console.log('Deleted directory purchases/new');
}
