import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function run() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const email = 'instructor-ui-tests@test.calme';
    const password = 'TestingPassword123!';

    let { data: { user }, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (error && error.message.includes('already exists')) {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        user = users.find(u => u.email === email) || null;
    }

    if (!user) {
        console.error('Failed to get user');
        return;
    }

    const supabaseClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: sessionData, error: signError } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (signError) {
        console.error("Sign in error", signError);
        return;
    }

    console.log("TEST USER UUID:", sessionData.session.user.id);
    console.log("SESSION RAW:", JSON.stringify(sessionData.session));
}
run();
