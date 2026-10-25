<?php
class ReportController {
    /* The quarterly PDF report was never finished. With APP_DEBUG=true the
       framework's error page helpfully prints the exception, the stack and
       the entire environment — keys and passwords included. */
    public static function export(){
        throw new RuntimeException('Call to undefined method HexaBilling\Reports\QuarterlyReport::toPdf()');
    }
}
