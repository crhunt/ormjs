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

    return ["M", 0, ",", 0,
            "m", -d, 0,
            "a", d, ",", d,"0 1, 0 ",(d*2), ",", 0,
            "a", d, ",",d,"0 1, 0 ",-(d*2), ",", 0,
            "Z"].join(" ")
}

function exclusive_or_path(r) {
    return noZ( exclusion_path(r) ) + inclusive_or_path(r)
}

function noZ(str) {
    return str.substring(0, str.length-2)
}