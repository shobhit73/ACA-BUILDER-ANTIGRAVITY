
import fs from 'fs';
import path from 'path';

function analyzeCSV() {
    const filePath = path.resolve(process.cwd(), 'Input Data/Payroll_Hours_Populated.csv');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');

    console.log(`Total Lines (including header): ${lines.length}`);

    const companyCounts: Record<string, number> = {};
    let validRows = 0;

    // Start from index 1 to skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(',');
        const companyCode = cols[0].trim();

        if (companyCode) {
            companyCounts[companyCode] = (companyCounts[companyCode] || 0) + 1;
            validRows++;
        }
    }

    console.log(`Total Valid Data Rows: ${validRows}`);
    console.log("Counts per Company:");
    console.table(companyCounts);
}

analyzeCSV();
