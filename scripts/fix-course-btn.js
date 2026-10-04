const fs = require('fs');
let c = fs.readFileSync('components/admin/courses-manager.tsx', 'utf8');

if (!c.includes('import Link from "next/link";')) {
    c = 'import Link from "next/link";\n' + c;
}

const findStr = '{canEdit ? <button onClick={() => editCourse(course)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container hover:bg-primary/10 p-1 text-primary transition"><Icon name="edit" className="text-[14px]" /></button> : null}';
const replaceStr = '{canEdit ? <Link href={`/admin/courses/${course.id}/content`} title="Manage Content" className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container hover:bg-emerald-500/10 p-1 text-emerald-500 transition"><Icon name="video_library" className="text-[14px]" /></Link> : null}\n                                  {canEdit ? <button onClick={() => editCourse(course)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container hover:bg-primary/10 p-1 text-primary transition"><Icon name="edit" className="text-[14px]" /></button> : null}';

c = c.replace(findStr, replaceStr);

fs.writeFileSync('components/admin/courses-manager.tsx', c);
