function subtypePath(end) {
    var start = 0;
    var arrowWidth = 1;
    var shaftRadius = arrowWidth / 4;
    var headRadius = arrowWidth * 2;
    var headLength = headRadius * 2;
    var shoulder = end - headLength;
    return {
        outline: [
            "M", start, ",", shaftRadius,
            "L", shoulder, ",", shaftRadius,
            "L", shoulder, ",", headRadius,
            "L", end, ",", 0,
            "L", shoulder, ",", -headRadius,
            "L", shoulder, ",", -shaftRadius,
            "L", start, ",", -shaftRadius,
            "Z"
        ].join(""),
        apex: {
            x: start + (shoulder - start) / 2,
            y: 0
        }
    };
};

function mandatoryPath(end) {
    var start = 0;
    var r = 4;
    return {
        outline: [
            "M", start, ",", 0,
            "L", end, ",", 0,
            "M", end, ",", 0,
            "m", -r, 0,
            "a", r, ",", r,"0 1, 0 ",(r*2), ",", 0,
            "a", r, ",",r,"0 1, 0 ",-(r*2), ",", 0,
            "Z"
        ].join(" ")
    }
}

/*function mandatoryPath_grad(end) {
    var start = 0;
    var lw = 1;
    var r = 5;
    return {
        outline: [
            "M", start, ",", 0,
            "m", -r, 0,
            "a", r, ",", r," 0 1, 0 ",(r*2), ",", 0,
            "a", r, ",",r," 0 1, 0 ",-(r*2), ",", 0,
            "M", start, ",", lw,
            "L", end, ",", lw,
            "L", end, ",", -lw,
            "L", start, ",", -lw,
            "Z"
        ].join(" ")
    }
}*/