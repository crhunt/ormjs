var svg;
var selected_objects = [];

function svg_mousedown(event) {

    /* First actions to perform on a mousedown event on an
        overlay of an entity.
        
        The big trick here is that the entity is transformed to move the origin, 
        to the middle of the entity, but the pointer of the event doesn't know this 
        apparently. So we need to construct the actual location of the entity and 
        the click event. */
    
    event.stopPropagation();

    if (event.button == 2) { return }

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
        var d = orm.entities[anyID].datum();
        if(d.x > rng.xmin && d.x < rng.xmax && d.y > rng.ymin && d.y < rng.ymax) {
            class_as(anyID,"selected");
        }
    }
    for ( var anyID in orm.rbgroups ) {
        var d = orm.rbgroups[anyID].datum();
        if(d.x > rng.xmin && d.x < rng.xmax && d.y > rng.ymin && d.y < rng.ymax) {
            class_as(anyID,"selected");
        }
    }
    for ( var anyID in orm.values ) {
        var d = orm.values[anyID].datum();
        if(d.x > rng.xmin && d.x < rng.xmax && d.y > rng.ymin && d.y < rng.ymax) {
            class_as(anyID,"selected");
        }
    }

    console.log(d3.selectAll('.selected'));

}

function unselect_all() {
    var objlist = d3.selectAll('.selected').nodes();
    for (var n in objlist) {
        unclass_as(objlist[n].id, "selected")
    }
}

function drag_selected(event) {

    var de = {dx : event.dx, dy : event.dy };
    
    var objlist = d3.selectAll('.selected').nodes();
    for (var n in objlist) {
        var obj = d3.select("#"+objlist[n].id);
        d = obj.datum();
        d.dx += de.dx;
        d.dy += de.dy;
        d.x = d.x0 + d.dx;
        d.y = d.y0 + d.dy;
        move_object(obj);
    }
}

function move_object(obj) {
    // Hmmm wouldn't need this if we had class wrappers around objects...

    if(obj.datum().kind == "entity" || obj.datum().kind == "value") {
        move_entity(obj);
    }
    if(obj.datum().kind == "rolebox_group") {
        move_rolebox_group(obj);
    }
}