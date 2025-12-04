import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();

    try {
        // 1. Fetch Plans
        const { data: plans, error: planError } = await supabase
            .from('plan_master')
            .select('*')
            .order('plan_code');

        if (planError) throw planError;

        // 2. Fetch Distinct Options per Plan from Eligibility
        const { data: options, error: optError } = await supabase
            .from('employee_plan_eligibility')
            .select('plan_code, option_code')
            .not('option_code', 'is', null);

        if (optError) throw optError;

        // Aggregate options by plan
        const planOptions: Record<string, string[]> = {};
        options?.forEach((opt) => {
            if (!planOptions[opt.plan_code]) {
                planOptions[opt.plan_code] = [];
            }
            if (!planOptions[opt.plan_code].includes(opt.option_code)) {
                planOptions[opt.plan_code].push(opt.option_code);
            }
        });

        return NextResponse.json({ plans, planOptions });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const body = await request.json();
        const { action, plan } = body;

        if (action === 'create') {
            const { error } = await supabase
                .from('plan_master')
                .insert(plan);
            if (error) throw error;
        } else if (action === 'update') {
            const { plan_code, ...updates } = plan;
            const { error } = await supabase
                .from('plan_master')
                .update(updates)
                .eq('plan_code', plan_code);
            if (error) throw error;
        } else if (action === 'delete') {
            const { plan_code } = body;
            const { error } = await supabase
                .from('plan_master')
                .delete()
                .eq('plan_code', plan_code);
            if (error) throw error;
        } else {
            // Legacy support for just updates (backward compatibility)
            const { plan_code, updates } = body;
            if (plan_code && updates) {
                const { error } = await supabase
                    .from('plan_master')
                    .update(updates)
                    .eq('plan_code', plan_code);
                if (error) throw error;
            } else {
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
