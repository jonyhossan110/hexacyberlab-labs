<?php
/* app/Models/User.php — in the real app this class shipped with
   protected $guarded = [] "temporarily, during the import sprint".
   It never got reverted. Every column is mass-assignable. */
class User extends Model {
    protected $table = 'users';
    protected $guarded = [];   // <-- the flaw: nothing is protected
    protected $columns = ['id','workspace_id','name','email','password','role','company','plan','is_admin','api_token'];
}
