function LogConstructor()
{
    var _add = function(msg)
    {
        //console.log(msg);
        alert(msg);
    };

    var _debug = function(msg)
    {
        //console.log(msg);
        //alert(msg);
    };

    var _error = function(msg)
    {
        //console.log(msg);
        alert(msg);
    };

    this.add = _add;
    this.debug = _debug;
    this.error = _error;
}

var Log = new LogConstructor();