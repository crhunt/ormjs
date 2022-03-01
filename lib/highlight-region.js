
var ormjs;

ormjs.HighlightRegion = class {


    static svg_mousedown(event) {
        
        event.stopPropagation();

        if (event.button == 2) { return }

        var svg = ormjs.Graph.any_object( event.target.id.toString() );

        ormjs.HighlightRegion.unselect_all(svg.id);

        d3.select("#hrect").remove();

        var m = d3.pointer(event);

        hrect = svg.d3object.append("rect")
                .datum( {x1: m[0], y1: m[1], x2: m[0], y2: m[1]})
                .attr("class","highlight_rect")
                .attr("width", "1px")
                .attr("height", "1px")
                .attr("x", m[0])
                .attr("y", m[1])
                .attr("id","hrect");

        svg.d3object
        .on("mousemove", function (event) { ormjs.HighlightRegion.mousemove(event, hrect) })
        .on("mouseup", function (event, d) { ormjs.HighlightRegion.mouseup(event, hrect, svg) } );
        
    }

    static mousemove(event, hrect) {

        var m = d3.pointer(event);

        var d = hrect.datum();

        d.x2 = m[0];
        d.y2 = m[1];

        hrect
            .attr("width", () => { return Math.abs(d.x2 - d.x1) } )
            .attr("height", () => { return Math.abs(d.y2 - d.y1) } );
        
        if (d.x2 < d.x1) {
            hrect.attr("x", d.x2)
        }
        if (d.y2 < d.y1) {
            hrect.attr("y", d.y2)
        }
    }

    static mouseup(event, hrect, svg) {

        event.stopPropagation();

        ormjs.HighlightRegion.objects_in_range(hrect,svg.model);
        
        svg.d3object.on("mousemove", null).on("mouseup", null);

        hrect.remove();
    }

    static objects_in_range(hrect, modelID) {

        var objects = ormjs.models[modelID].objects;
        var obj_options = ["entity", "rolebox_group", "value", "constraint"];

        var rng = hrect.datum();
        rng.xmin = Math.min(rng.x1,rng.x2);
        rng.xmax = Math.max(rng.x1,rng.x2);
        rng.ymin = Math.min(rng.y1,rng.y2);
        rng.ymax = Math.max(rng.y1,rng.y2);

        obj_options.map( (obj) => {
            for ( var anyID in objects[obj] ) {
                var d = d3.select("#"+anyID).datum();
                if(d.x > rng.xmin && d.x < rng.xmax && 
                d.y > rng.ymin && d.y < rng.ymax) {
                    ormjs.Graph.class_as(anyID,"selected");
                }
            }
        });

        /*for ( var anyID in orm.entities ) {
            var d = d3.select("#"+anyID).datum();
            if(d.x > rng.xmin && d.x < rng.xmax && d.y > rng.ymin && d.y < rng.ymax) {
                ormjs.Graph.class_as(anyID,"selected");
            }
        }
        for ( var anyID in orm.rbgroups ) {
            var d = d3.select("#"+anyID).datum();
            if(d.x > rng.xmin && d.x < rng.xmax && d.y > rng.ymin && d.y < rng.ymax) {
                ormjs.Graph.class_as(anyID,"selected");
            }
        }
        for ( var anyID in orm.values ) {
            var d = d3.select("#"+anyID).datum();
            if(d.x > rng.xmin && d.x < rng.xmax && d.y > rng.ymin && d.y < rng.ymax) {
                ormjs.Graph.class_as(anyID,"selected");
            }
        }
        for ( var anyID in orm.constraints ) {
            var d = d3.select("#"+anyID).datum();
            if(d.x > rng.xmin && d.x < rng.xmax && d.y > rng.ymin && d.y < rng.ymax) {
                ormjs.Graph.class_as(anyID,"selected");
            }
        }*/

    }

    static unselect_all(viewID) {
        var svg = ormjs.Graph.any_object(viewID);
        var objects = svg.objects_in_view();
        var objlist = d3.selectAll('.selected').nodes().map( (node) => {return node.id} );
        var overlap = objects.filter(value => objlist.includes(value));
        overlap.map( (id) => { ormjs.Graph.unclass_as(id, "selected"); });
    }

    static select_all(viewID) {

        var svg = ormjs.Graph.any_object(viewID);
        var objects = svg.objects_in_view();
        objects.map( (id) => { ormjs.Graph.unclass_as(id, "selected"); });

        /*for ( var anyID in orm.entities ) {
            ormjs.Graph.class_as(anyID,"selected");
        }
        for ( var anyID in orm.rbgroups ) {
            ormjs.Graph.class_as(anyID,"selected");
        }
        for ( var anyID in orm.values ) {
            ormjs.Graph.class_as(anyID,"selected");
        }
        for ( var anyID in orm.constraints ) {
            ormjs.Graph.class_as(anyID,"selected");
        }*/
    }

    static drag_selected(event) {

        var de = {dx : event.dx, dy : event.dy };
        
        var objlist = d3.selectAll('.selected').nodes();
        for (var n in objlist) {
            var d = d3.select("#"+objlist[n].id).datum();
            d.dx += de.dx;
            d.dy += de.dy;
            d.x = d.x0 + d.dx;
            d.y = d.y0 + d.dy;
            //move_object(objlist[n].id);
            ormjs.Graph.any_object(objlist[n].id).move();
        }
    }

}