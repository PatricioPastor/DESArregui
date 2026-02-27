import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = process.cwd();

const FILE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".sql", ".prisma", ".md", ".yaml", ".yml"]);
const IGNORED_DIRECTORIES = new Set([".git", ".next", "node_modules", "src/generated"]);

const COMPATIBILITY_PATTERN =
    /\b(phones\.(device_n1|assignments_n1|shipments_n1|device_legacy|assignment_legacy)|get_enhanced_kpis_(legacy|canonical|source))\b/g;

const ALLOWED_PREFIXES = [
    "openspec/",
    "docs/",
    "plan.md",
    "security-report.md",
    "prisma/migrations/",
    "tests/integration/migration/",
    "tests/migration/",
    "scripts/migration/",
];

interface MatchRecord {
    file: string;
    line: number;
    text: string;
}

const shouldIgnoreDirectory = (relativeDir: string): boolean => {
    const normalized = relativeDir.replaceAll("\\", "/");

    if (!normalized) {
        return false;
    }

    return Array.from(IGNORED_DIRECTORIES).some((ignored) => normalized === ignored || normalized.startsWith(`${ignored}/`));
};

const isAllowedPath = (file: string): boolean => {
    return ALLOWED_PREFIXES.some((prefix) => file === prefix || file.startsWith(prefix));
};

const collectFiles = async (directory: string, root = directory): Promise<string[]> => {
    const entries = await readdir(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const absolutePath = path.join(directory, entry.name);
        const relativePath = path.relative(root, absolutePath);

        if (entry.isDirectory()) {
            if (shouldIgnoreDirectory(relativePath)) {
                continue;
            }

            const nestedFiles = await collectFiles(absolutePath, root);
            files.push(...nestedFiles);
            continue;
        }

        if (!entry.isFile()) {
            continue;
        }

        const extension = path.extname(entry.name).toLowerCase();
        if (!FILE_EXTENSIONS.has(extension)) {
            continue;
        }

        files.push(relativePath.replaceAll("\\", "/"));
    }

    return files;
};

const gatherMatches = async (files: string[]): Promise<MatchRecord[]> => {
    const matches: MatchRecord[] = [];

    for (const file of files) {
        const absolutePath = path.join(REPO_ROOT, file);
        const content = await readFile(absolutePath, "utf8");
        const lines = content.split(/\r?\n/);

        lines.forEach((line, index) => {
            COMPATIBILITY_PATTERN.lastIndex = 0;

            if (!COMPATIBILITY_PATTERN.test(line)) {
                return;
            }

            matches.push({
                file,
                line: index + 1,
                text: line.trim(),
            });
        });
    }

    return matches;
};

const run = async () => {
    const allFiles = await collectFiles(REPO_ROOT);
    const matches = await gatherMatches(allFiles);
    const unresolved = matches.filter((match) => !isAllowedPath(match.file));

    console.log("Compatibility retirement audit");
    console.log(`Scanned files: ${allFiles.length}`);
    console.log(`- compatibility-references: ${matches.length} matches (${unresolved.length} unresolved)`);

    if (unresolved.length === 0) {
        console.log("Audit passed: no unresolved critical compatibility consumers were found.");
        return;
    }

    console.error("Audit failed. Unresolved compatibility consumers were found:");

    unresolved.slice(0, 50).forEach((match) => {
        console.error(`  ${match.file}:${match.line} ${match.text}`);
    });

    if (unresolved.length > 50) {
        console.error(`  ... ${unresolved.length - 50} more matches`);
    }

    process.exitCode = 1;
};

run().catch((error) => {
    console.error("Compatibility retirement audit crashed:", error);
    process.exitCode = 1;
});
