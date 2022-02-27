function exclusion_path(r) {
    
    var d = r/Math.sqrt(2);
    
    return ["M", 0, ",", 0,
            "L", d, ",", d,
            "M", 0, ",", 0,
            "L", d, ",", -d,
            "M", 0, ",", 0,
            "L", -d, ",", d,
            "M", 0, ",", 0,
            "L", -d, ",", -d,
            "Z"].join("")
};

function inclusive_or_path(r) {
    
    var d = r/3;

    return dot(0,0,d) + "Z"
}

function exclusive_or_path(r) {
    return noZ( exclusion_path(r) ) + inclusive_or_path(r)
}

function equality_path(r) {
    var str = GraphUtils.get_css_number('--stroke-width');
    var margin = 8;
    var dy = 2;
    return hline(margin,dy+str/2,r) + hline(margin,-dy,r) + "Z"
}

function identifier_path(r) {
    return hline(0,0,r) + "Z"
}

function preferred_identifier_path(r) {
    var dy = 2;
    return hline(0,dy,r) + hline(0,-dy,r) + "Z"
}

/* Basic shapes and helpers */

function noZ(str) {
    return str.substring(0, str.length-2)
}

function dot(x,y,r) {
    return ["M", x, ",", y,
            "m", -r, 0,
            "a", r, ",", r,"0 1, 0 ",(r*2), ",", 0,
            "a", r, ",",r,"0 1, 0 ",-(r*2), ",", 0
            ].join(" ")
}

function hline(dx,dy,r) {
    var x1 = - r*Math.cos(Math.abs(dy)/r) + dx;
    var x2 = r*Math.cos(Math.abs(dy)/r) - dx;
    var y = dy;
    return ["M", x1, ",", y,
            "L", x2, ",", y
           ].join("")
}