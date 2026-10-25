<?php
class ProfileController {
    public static function edit(){
        echo view('profile', ['title' => 'Profile', 'me' => current_user()]);
    }
    public static function update(){
        $me = current_user();
        $user = User::find($me['id']);
        $wasAdmin = (int)$user->is_admin; $wasPlan = $user->plan;
        /* $request->all() straight into a model whose $guarded is [].
           The form shows name/email/company — the model accepts everything:
           plan, is_admin, workspace_id, role, api_token… */
        $input = $_POST; unset($input['_token']);
        $user->fill($input);
        $user->save();
        hb_log('PROFILE updated ' . $me['email']);
        if (((int)$user->is_admin === 1 && $wasAdmin === 0) || ($user->plan === 'enterprise' && $wasPlan !== 'enterprise')) {
            rs_pass('mass-assignment');
            hb_log('MASS-ASSIGNMENT privilege change on ' . $me['email']);
        }
        redirect_to('/profile');
    }
}
