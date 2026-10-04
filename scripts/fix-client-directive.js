const fs = require('fs');
let c = fs.readFileSync('components/admin/courses-manager.tsx', 'utf8');
if (c.startsWith('import Link')) {
    c = c.replace('import Link from "next/link";\n"use client";', '"use client";\nimport Link from "next/link";');
    fs.writeFileSync('components/admin/courses-manager.tsx', c);
}
