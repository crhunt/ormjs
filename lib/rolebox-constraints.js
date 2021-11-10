function unique_box(pos) {
    // pos is the central position of the box
    var margin = rb_param.width/8;
    var start = pos.x-rb_param.width/2 + margin;
    var span = rb_param.width - 2*margin;
    var end = start + span;
    var y = pos.y-rb_param.height/2 - margin;
    return [
            "M", start, ",", y,
            "L", end, ",", y,
            "Z"
        ].join("")
};

function many_box(pos) {
    // pos is the central position of the box
    var margin = rb_param.width/8;
    var start = pos.x-rb_param.width/2;
    var span = rb_param.width;
    var end = start + span;
    var y = pos.y-rb_param.height/2 - margin;
    return [
            "M", start, ",", y,
            "L", end, ",", y,
            "Z"
        ].join("")
};

function skip_box(pos) {
    var margin = rb_param.width/8;
    var w = parse_number( get_css_variable('--stroke-width') )
    var start = pos.x-rb_param.width/2+margin/2;
    var span = rb_param.width;
    var end = start + span;
    var y = pos.y-rb_param.height/2 - margin;
    var mypath = ["M", start, ",", y,
                  "L", start+w, ",", y];
    start += margin;
    while (start < end) {
        mypath.push.apply( mypath, 
            ["M", start, ",", y,
             "L", start+w, ",", y]
        );
        start += margin;
    }
    mypath.push("Z");
    return mypath.join("")


}