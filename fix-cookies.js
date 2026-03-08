const fs = require('fs');

const files = [
  'app/tests/ui/instructor_ai_features.spec.ts',
  'app/tests/ui/instructor_past_lessons.spec.ts',
  'app/tests/ui/instructor_reconnect_autosave.spec.ts'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/value: JSON\.stringify\(\[JSON\.stringify\(\{/g, 'value: JSON.stringify({');
  content = content.replace(/\}\)\]\),/g, '}),');
  fs.writeFileSync(file, content);
});
