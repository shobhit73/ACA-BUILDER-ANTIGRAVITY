const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uzbngrhmwhgpkatjislj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6Ym5ncmhtd2hncGthdGppc2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MzA0OTYsImV4cCI6MjA3NzQwNjQ5Nn0.GF9MvkWArol_40vB49UobVYJG0OTbUWi9mRpX8W0XE8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createSuperAdmin() {
    const email = 'naveen@mailinator.com';
    const password = 'naveen-123';

    console.log(`Creating super admin user: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                role: 'super_admin',
                first_name: 'Naveen',
                last_name: 'Admin'
            }
        }
    });

    if (error) {
        console.error('Error creating user:', error);
    } else {
        console.log('Successfully created super admin user:', data.user ? data.user.email : 'User created (check email for confirmation if required)');
        if (data.session) {
            console.log('User signed in successfully.');
        } else {
            console.log('User created but session not established (email confirmation might be required).');
        }
    }
}

createSuperAdmin();
