const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/shobhit.sharma/Downloads/supabase-connection (1)/ACA_BUILDER_/ACA_Data_Package/Plan_Master.csv';

try {
    const text = fs.readFileSync(filePath, 'utf8');
    const rows = text.split('\n').map(row => row.split(','));
    const headers = rows[0].map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));

    console.log('Headers:', headers);

    const plans = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < headers.length) continue;

        const plan = {};
        headers.forEach((h, index) => {
            let val = row[index]?.trim().replace(/['"]+/g, '');

            if (h === 'plan code' || h === 'plancode') plan.plan_code = val;
            else if (h === 'plan name' || h === 'planname') plan.plan_name = val;
            else if (h === 'carrier' || h === 'carriername') plan.carrier_name = val;
            else if (h === 'type' || h === 'plantype') plan.plan_type = val;
            else if (h === 'mec') plan.mec = val;
            else if (h === 'mvc') plan.mvc = val;
            else if (h === 'me') plan.me = val;
            else if (h === 'option_emp') plan.option_emp = val;
            else if (h === 'option_emp_spouse') plan.option_emp_spouse = val;
            else if (h === 'option_emp_child') plan.option_emp_child = val;
            else if (h === 'option_emp_family') plan.option_emp_family = val;
        });

        if (plan.plan_code) {
            plans.push(plan);
        }
    }

    console.log('Parsed Plans:', JSON.stringify(plans, null, 2));

} catch (err) {
    console.error(err);
}
