var svg;

function svg_mousedown(event) {
    
    event.stopPropagation();

    if (event.button == 2) { return }

    unselect_all();

    d3.select("#hrect").remove();

    var m = d3.pointer(event);

    hrect = svg.append("rect")
               .datum( {x1: m[0], y1: m[1], x2: m[0], y2: m[1]})
               .attr("class","highlight_rect")
               .attr("width", "1px")
               .attr("height", "1px")
               .attr("x", m[0])
               .attr("y", m[1])
               .attr("id","hrect");

    svg
       .on("mousemove", function (event) { hr_mousemove(event, hrect) })
       .on("mouseup", function (event) { hr_mouseup(event, hrect) } );
    
}

function hr_mousemove(event, hrect) {

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

function hr_mouseup(event, hrect) {

    event.stopPropagation();

    objects_in_range(hrect);
    
    svg.on("mousemove", null).on("mouseup", null);

    hrect.remove();
}

function objects_in_range(hrect) {

    var rng = hrect.datum();
    rng.xmin = Math.min(rng.x1,rng.x2);
    rng.xmax = Math.max(rng.x1,rng.x2);
    rng.ymin = Math.min(rng.y1,rng.y2);
    rng.ymax = Math.max(rng.y1,rng.y2);

    for ( var anyID in orm.entities ) {
        var d = d3.select("#"+anyID).datum();
        if(d.x > rng.xmin && d.x < rng.xmax && d.y > rng.ymin && d.y < rng.ymax) {
            class_as(anyID,"selected");
        }
    }
    for ( var anyID in orm.rbgroups ) {
        var d = d3.select("#"+anyID).datum();
        if(d.x > rng.xmin && d.x < rng.xmax && d.y > rng.ymin && d.y < rng.ymax) {
            class_as(anyID,"selected");
        }
    }
    for ( var anyID in orm.values ) {
        var d = d3.select("#"+anyID).datum();
        if(d.x > rng.xmin && d.x < rng.xmax && d.y > rng.ymin && d.y < rng.ymax) {
            class_as(anyID,"selected");
        }
    }
    for ( var anyID in orm.constraints ) {
        var d = d3.select("#"+anyID).datum();
        if(d.x > rng.xmin && d.x < rng.xmax && d.y > rng.ymin && d.y < rng.ymax) {
            class_as(anyID,"selected");
        }
    }

}

function unselect_all() {
    var objlist = d3.selectAll('.selected').nodes();
    for (var n in objlist) {
        unclass_as(objlist[n].id, "selected")
    }
}

function select_all() {
    for ( var anyID in orm.entities ) {
        class_as(anyID,"selected");
    }
    for ( var anyID in orm.rbgroups ) {
        class_as(anyID,"selected");
    }
    for ( var anyID in orm.values ) {
        class_as(anyID,"selected");
    }
    for ( var anyID in orm.constraints ) {
        class_as(anyID,"selected");
    }
}

function drag_selected(event) {

    var de = {dx : event.dx, dy : event.dy };
    
    var objlist = d3.selectAll('.selected').nodes();
    for (var n in objlist) {
        var d = d3.select("#"+objlist[n].id).datum();
        d.dx += de.dx;
        d.dy += de.dy;
        d.x = d.x0 + d.dx;
        d.y = d.y0 + d.dy;
        //move_object(objlist[n].id);
        Graph.any_object(objlist[n].id).move();
    }
}