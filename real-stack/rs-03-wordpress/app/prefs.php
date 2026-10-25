<?php
/* Reader preferences — a small "remember my reading prefs" feature.
   The prefs are kept in a cookie called wp_prefs as a base64'd SERIALIZED
   PHP value, and the front controller unserializes whatever arrives.
   Nobody on the team asked what happens if the value is not an array… */
class HexaPress_Prefs {
    public $theme = 'fjord-light';
    public $posts_per_page = 10;
    public $woken_up = false;
    /* A gadget left over from a caching experiment: it fires automatically
       whenever an object of this class is unserialized. On a real site this
       is where a chain would start — here it flips a flag and writes a log
       line, so the lab can prove the gadget really ran. */
    function __wakeup(){
        $this->woken_up = true;
        hp_log('PREFS __wakeup gadget fired — theme=' . $this->theme . ', posts_per_page=' . $this->posts_per_page);
        $GLOBALS['hp_prefs_gadget'] = $this;
    }
}
