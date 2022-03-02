var ormjs;

ormjs.ConstraintPath = class {

    static exclusion(r) {
        
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

    static inclusive_or(r) {
        
        var d = r/3;

        return ormjs.ConstraintPath.dot(0,0,d) + "Z"
    }

    static exclusive_or(r) {
        return ormjs.ConstraintPath.noZ( ormjs.ConstraintPath.exclusion(r) ) + 
               ormjs.ConstraintPath.inclusive_or(r)
    }

    static equality(r) {
        var str = ormjs.size.connector.stroke;
        var margin = 8;
        var dy = 2;
        return ormjs.ConstraintPath.hline(margin,dy+str/2,r) + 
               ormjs.ConstraintPath.hline(margin,-dy,r) + "Z"
    }

    static identifier(r) {
        return ormjs.ConstraintPath.hline(0,0,r) + "Z"
    }

    static preferred_identifier(r) {
        var dy = 2;
        return ormjs.ConstraintPath.hline(0,dy,r) + 
               ormjs.ConstraintPath.hline(0,-dy,r) + "Z"
    }

    /* Basic shapes and helpers */

    static noZ(str) {
        return str.substring(0, str.length-2)
    }

    static dot(x,y,r) {
        return ["M", x, ",", y,
                "m", -r, 0,
                "a", r, ",", r,"0 1, 0 ",(r*2), ",", 0,
                "a", r, ",",r,"0 1, 0 ",-(r*2), ",", 0
                ].join(" ")
    }

    static hline(dx,dy,r) {
        var x1 = - r*Math.cos(Math.abs(dy)/r) + dx;
        var x2 = r*Math.cos(Math.abs(dy)/r) - dx;
        var y = dy;
        return ["M", x1, ",", y,
                "L", x2, ",", y
            ].join("")
    }

}