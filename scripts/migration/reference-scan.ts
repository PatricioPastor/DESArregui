import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = process.cwd();

const FILE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".sql", ".prisma", ".md", ".yaml", ".yml"]);
const IGNORED_DIRECTORIES = new Set([".git", ".next", "node_modules", "src/generated"]);

interface ScanRule {
    id: string;
    title: string;
    pattern: RegExp;
    allowPrefixes: string[];
}

interface MatchRecord {
    file: string;
    line: number;
    text: string;
}

const SCAN_RULES: ScanRule[] = [
    {
        id: "purchase-references",
        title: "purchase linkage references",
        pattern: /\b(prisma\.purchase|purchase_id|phones\.purchase)\b/g,
        allowPrefixes: [
            "openspec/",
            "docs/",
            "plan.md",
            "prisma/migrations/",
            "tests/migration/purchase-decommission/",
            "scripts/migration/reference-scan.ts",
        ],
    },
    {
        id: "n1-table-identifiers",
        title: "_n1 table identifiers",
        pattern: /\b(prisma\.(device_n1|assignment_n1|shipment_n1)|phones\.(device_n1|assignments_n1|shipments_n1)|\b(device_n1|assignments_n1|shipments_n1)\b)\b/g,
        allowPrefixes: [
            "openspec/",
            "prisma/schema.prisma",
            "prisma/migrations/",
            "src/app/api/stock-n1/",
            "src/app/api/assignments-n1/",
            "src/app/api/assignments/manual/route.ts",
            "src/app/api/assignments/route.ts",
            "src/app/api/assignments/[id]/",
            "src/app/api/models/",
            "src/app/api/reports/kpis/route.ts",
            "src/app/api/stock/route.ts",
            "src/app/api/stock/[imei]/route.ts",
            "src/app/(dashboard)/stock/",
            "src/lib/stock-detail.ts",
            "tests/integration/migration/",
            "tests/migration/purchase-decommission/",
            "scripts/migration/reference-scan.ts",
            "scripts/migration/compatibility-retirement-audit.ts",
        ],
    },
];

const shouldIgnoreDirectory = (relativeDir: string): boolean => {
    const normalized = relativeDir.replaceAll("\\", "/");

    if (!normalized) {
        return false;
    }

    return Array.from(IGNORED_DIRECTORIES).some((ignored) => normalized === ignored || normalized.startsWith(`${ignored}/`));
};

const isAllowedPath = (file: string, rule: ScanRule): boolean => {
    return rule.allowPrefixes.some((prefix) => file === prefix || file.startsWith(prefix));
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

const gatherMatches = async (files: string[], rule: ScanRule): Promise<MatchRecord[]> => {
    const matches: MatchRecord[] = [];

    for (const file of files) {
        const absolutePath = path.join(REPO_ROOT, file);
        const content = await readFile(absolutePath, "utf8");
        const lines = content.split(/\r?\n/);

        lines.forEach((line, index) => {
            rule.pattern.lastIndex = 0;
            if (!rule.pattern.test(line)) {
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
    const failures: Array<{ rule: ScanRule; matches: MatchRecord[] }> = [];

    console.log("Migration reference scan");
    console.log(`Scanned files: ${allFiles.length}`);

    for (const rule of SCAN_RULES) {
        const ruleMatches = await gatherMatches(allFiles, rule);
        const unresolved = ruleMatches.filter((match) => !isAllowedPath(match.file, rule));

        console.log(`- ${rule.id}: ${ruleMatches.length} matches (${unresolved.length} unresolved)`);

        if (unresolved.length > 0) {
            failures.push({ rule, matches: unresolved });
        }
    }

    if (failures.length === 0) {
        console.log("Reference scan passed with no unresolved critical dependencies.");
        return;
    }

    console.error("Reference scan failed. Unresolved critical dependencies were found:");

    failures.forEach(({ rule, matches }) => {
        console.error(`\n[${rule.id}] ${rule.title}`);
        matches.slice(0, 25).forEach((match) => {
            console.error(`  ${match.file}:${match.line} ${match.text}`);
        });

        if (matches.length > 25) {
            console.error(`  ... ${matches.length - 25} more matches`);
        }
    });

    process.exitCode = 1;
};

run().catch((error) => {
    console.error("Reference scan crashed:", error);
    process.exitCode = 1;
});
