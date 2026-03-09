import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AIPromptPreferences } from '@/types/ai';

export async function GET() {
    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('instructor_ai_preferences')
            .select('difficulty, style, length, focus_areas')
            .eq('user_id', user.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // No rows found
                // Return defaults if none exist
                const defaults: AIPromptPreferences = {
                    difficulty: 'intermediate',
                    style: 'socratic',
                    length: 'standard',
                    focusAreas: '',
                };
                return NextResponse.json(defaults);
            }
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        const prefs: AIPromptPreferences = {
            difficulty: data.difficulty as AIPromptPreferences['difficulty'],
            style: data.style as AIPromptPreferences['style'],
            length: data.length as AIPromptPreferences['length'],
            focusAreas: data.focus_areas || '',
        };

        return NextResponse.json(prefs);
    } catch (err) {
        console.error('GET ai-preferences error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json() as AIPromptPreferences;

        // Optional validation logic could go here

        const { error } = await supabase
            .from('instructor_ai_preferences')
            .upsert({
                user_id: user.id,
                difficulty: body.difficulty,
                style: body.style,
                length: body.length,
                focus_areas: body.focusAreas || null,
                updated_at: new Date().toISOString(),
            });

        if (error) {
            console.error('Upsert preferences error:', error);
            return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('PUT ai-preferences error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
