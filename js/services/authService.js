import supabaseClient from "./supabaseClient.js";

export async function login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });
    return { data, error };
}
    
export async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    return { error };
}

export async function getSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
}

export async function requestPasswordReset(email) {
    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: new URL('resetPassword.html', window.location.href).href,
    });
    return { data, error };
}

export async function updatePassword(newPassword) {
    const { data, error } = await supabaseClient.auth.updateUser({
        password: newPassword,
    });
    return { data, error };
}