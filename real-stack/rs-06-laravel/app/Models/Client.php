<?php
/* app/Models/Client.php — this one was done properly: an explicit
   $fillable list. Mass assignment stops at the list. */
class Client extends Model {
    protected $table = 'clients';
    protected $fillable = ['name','company','email','notes'];
    protected $columns = ['id','workspace_id','name','company','email','notes','created'];
}
