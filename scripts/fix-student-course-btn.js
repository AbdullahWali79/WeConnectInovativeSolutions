const fs = require('fs');
let c = fs.readFileSync('app/student/courses/page.tsx', 'utf8');

const target = '<div className="border-t border-outline-variant px-4 py-4">';
const replace = `<div className="border-t border-outline-variant px-4 py-4">\n\n                  <Link href={\`/student/courses/\${course.id}\`} className="mb-6 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-md transition"><Icon name="play_circle" className="text-[24px]" /> Watch Full Course</Link>`;

c = c.replace(target, replace);
fs.writeFileSync('app/student/courses/page.tsx', c);
