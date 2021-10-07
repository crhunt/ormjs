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