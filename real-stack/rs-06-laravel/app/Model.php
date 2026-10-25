<?php
/* Base model with Laravel-style mass assignment. fill() honours $fillable
   when it is set; otherwise it honours $guarded. A model with
   protected $guarded = [] accepts EVERY attribute from the request —
   Laravel's most famous foot-gun, faithfully reproduced. */
abstract class Model {
    protected $table = '';
    protected $fillable = [];
    protected $guarded = ['id'];
    protected $columns = [];
    public $attrs = [];
    public function __construct($row = []){ $this->attrs = $row; }
    public function __get($k){ return $this->attrs[$k] ?? null; }
    public function __set($k, $v){ $this->attrs[$k] = $v; }
    protected function isFillable($key){
        if ($this->fillable) return in_array($key, $this->fillable, true);
        return !in_array($key, $this->guarded, true);
    }
    public function fill(array $input){
        foreach ($input as $k => $v) {
            if ($this->isFillable($k)) $this->attrs[$k] = $v;
        }
        return $this;
    }
    public function save(){
        $sets = []; $vals = [];
        foreach ($this->columns as $col) {
            if ($col === 'id') continue;
            if (array_key_exists($col, $this->attrs)) { $sets[] = "$col = ?"; $vals[] = $this->attrs[$col]; }
        }
        if (!$sets) return;
        $vals[] = $this->attrs['id'];
        db()->prepare("UPDATE {$this->table} SET " . implode(', ', $sets) . " WHERE id = ?")->execute($vals);
    }
    public static function find($id){
        $proto = new static();
        $st = db()->prepare("SELECT * FROM {$proto->table} WHERE id = ?");
        $st->execute([$id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        return $row ? new static($row) : null;
    }
}
