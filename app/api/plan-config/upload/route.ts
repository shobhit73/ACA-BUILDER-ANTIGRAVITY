import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const text = await file.text();
        const rows = text.split('\n').map(row => row.split(','));
        const headers = rows[0].map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));

        // Simple CSV parser (assumes standard CSV)
        const plans = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < headers.length) continue;

            const plan: any = {};
            headers.forEach((h, index) => {
                let val = row[index]?.trim().replace(/['"]+/g, '');
                // Map common CSV headers to DB columns
                if (h === 'company code' || h === 'companycode') plan.company_code = val;
                else if (h === 'plan code' || h === 'plancode') plan.plan_code = val;
                else if (h === 'plan name' || h === 'planname') plan.plan_name = val;
                else if (h === 'carrier' || h === 'carriername') plan.carrier_name = val;
                else if (h === 'type' || h === 'plantype') plan.plan_type = val;
                else if (h === 'mec') plan.mec = val;
                else if (h === 'mvc') plan.mvc = val;
                else if (h === 'me') plan.me = val;
                // Also support option codes if present
                else if (h === 'option_emp') plan.option_emp = val;
                else if (h === 'option_emp_spouse') plan.option_emp_spouse = val;
                else if (h === 'option_emp_child') plan.option_emp_child = val;
                else if (h === 'option_emp_family') plan.option_emp_family = val;
            });

            if (plan.plan_code) {
                plans.push(plan);
            }
        }

        if (plans.length === 0) {
            return NextResponse.json({ error: 'No valid plans found in CSV' }, { status: 400 });
        }

        const { error } = await supabase
            .from('plan_master')
            .upsert(plans, { onConflict: 'company_code, plan_code' });

        if (error) throw error;

        return NextResponse.json({ success: true, count: plans.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
