function linePath(end) {
    var start = 0;
    return [
            "M", start, ",", 0,
            "L", end, ",", 0,
            "Z" ].join(" ")
}

function arrowPath(headRadius,end) {
    
    var headLength = headRadius * 2;
    var shoulder = end - headLength;
    return [
            "M", 0, ",", 0,
            "L", shoulder, ",", 0,
            "L", shoulder, ",", headRadius,
            "L", end, ",", 0,
            "L", shoulder,",", -headRadius,
            "L", shoulder, ",", 0,
            "M", end, ",", 0,
            "Z" ].join("")
}

function constraintArrowPath(end) {
    var headRadius = parse_number( get_css_variable('--stroke-width-wide') );
    return arrowPath(headRadius,end)
};


function subtypePath(end) {
    var headRadius = 2*parse_number( get_css_variable('--stroke-width') );
    return arrowPath(headRadius,end)
};

function subtypePathDashed(end) {
    var headRadius = parse_number( get_css_variable('--stroke-width-wide') );
    return arrowPath(headRadius,end)
};

function mandatoryPath(end) {
    var start = 0;
    var r = 4;
    return [
            "M", start, ",", 0,
            "L", end, ",", 0,
            "M", end, ",", 0,
            "m", -r, 0,
            "a", r, ",", r,"0 1, 0 ",(r*2), ",", 0,
            "a", r, ",",r,"0 1, 0 ",-(r*2), ",", 0,
            "Z" ].join(" ")
}