<?php
class Invoice extends Model {
    protected $table = 'invoices';
    protected $fillable = ['description','amount','status','due'];
    protected $columns = ['id','workspace_id','client_id','number','description','amount','status','due','created'];
}
