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