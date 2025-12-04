const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/shobhit.sharma/Downloads/supabase-connection (1)/ACA_BUILDER_/ACA_Test_Files/Employee_Census_Updated.csv';

try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split(/\r?\n/);

    if (lines.length === 0) {
        console.log('File is empty');
        process.exit(0);
    }

    // Process header
    const header = lines[0];
    const newHeader = header + ',Email';

    const newLines = [newHeader];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue; // Skip empty lines

        const columns = line.split(',');
        // First Name is index 3, Last Name is index 5
        const firstName = columns[3].trim();
        const lastName = columns[5].trim();

        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@mailinator.com`;

        newLines.push(line + ',' + email);
    }

    const newContent = newLines.join('\n');
    const newFilePath = path.join(path.dirname(filePath), 'Employee_Census_With_Emails.csv');
    fs.writeFileSync(newFilePath, newContent, 'utf8');
    console.log('Successfully created new CSV with emails:', newFilePath);

} catch (err) {
    console.error('Error processing CSV:', err);
}
