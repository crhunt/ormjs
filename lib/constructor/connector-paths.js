var ormjs;

ormjs.ConnPath = class {

    static linePath(end) {
        var start = 0;
        return [
                "M", start, ",", 0,
                "L", end, ",", 0,
                "Z" ].join(" ")
    }

    static linePathArrow(end) {
        var start = 0;
        var offset = 6*ormjs.size.connector.stroke;
        end -= offset;
        return [
                "M", start, ",", 0,
                "L", end, ",", 0,
                "Z" ].join(" ")
    }

    static arrowPath(headRadius,end) {
        
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

    static constraintArrowPath(end) {
        var headRadius = ormjs.size.connector.wide_stroke;
        return ormjs.ConnPath.arrowPath(headRadius,end)
    };


    static subtypePath(end) {
        var headRadius = 2*ormjs.size.connector.stroke;
        var offset = 1.5*ormjs.size.connector.stroke;
        end -= offset;
        return ormjs.ConnPath.arrowPath(headRadius,end)
    };

    static subtypePathDashed(end) {
        var headRadius = ormjs.size.connector.wide_stroke;
        return ormjs.ConnPath.arrowPath(headRadius,end)
    };

    static mandatoryPath(end) {
        var start = 0;
        var r = 5;
        return [
                "M", start, ",", 0,
                "L", end, ",", 0,
                "M", end, ",", 0,
                "m", -r, 0,
                "a", r, ",", r,"0 1, 0 ",(r*2), ",", 0,
                "a", r, ",",r,"0 1, 0 ",-(r*2), ",", 0,
                "Z" ].join(" ")
    }

}