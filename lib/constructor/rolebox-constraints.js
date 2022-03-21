var ormjs;

ormjs.IUC = class {

    static unique(pos) {
        // pos is the central position of the box
        var margin = ormjs.size.rolebox.width/8;
        var start = pos.x-ormjs.size.rolebox.width/2 + margin;
        var span = ormjs.size.rolebox.width - 2*margin;
        var end = start + span;
        var y = pos.y-ormjs.size.rolebox.height/2 - margin;
        return [
                "M", start, ",", y,
                "L", end, ",", y,
                "Z"
            ].join("")
    };

    static many(pos) {
        // pos is the central position of the box
        var margin = ormjs.size.rolebox.width/8;
        var start = pos.x-ormjs.size.rolebox.width/2;
        var span = ormjs.size.rolebox.width;
        var end = start + span;
        var y = pos.y-ormjs.size.rolebox.height/2 - margin;
        return [
                "M", start, ",", y,
                "L", end, ",", y,
                "Z"
            ].join("")
    };

    static skip(pos) {
        var margin = ormjs.size.rolebox.width/8;
        var w = GraphUtils.get_css_number('--stroke-width');
        var start = pos.x-ormjs.size.rolebox.width/2+margin/2;
        var span = ormjs.size.rolebox.width;
        var end = start + span;
        var y = pos.y-ormjs.size.rolebox.height/2 - margin;
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

}